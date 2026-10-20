import { createHash, randomUUID } from 'node:crypto';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { resolveCampaignAudience } from '@/lib/crm/audience';
import { SaasAllowanceService } from '@/lib/saas/allowance';
import { WhatsAppBroadcastService } from '@/lib/whatsapp/broadcasts';
import { campaignDb, CampaignStore, type Campaign, type AudienceSnapshot } from './store';
import { campaignProviderRead, campaignRecipients, verifyProviderRecipients, cancelProviderCampaign } from './provider';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(message: string): never { throw new TenantAccessError(400, message); }
function stable(value: unknown): unknown { return Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])) : value; }
export function audienceHash(value: AudienceSnapshot) {
  return createHash('sha256').update(JSON.stringify(stable({ phones: [...value.phones].sort(), contactIds: [...value.contactIds].sort(), evidence: value.evidence.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) }))).digest('hex');
}
async function account(organizationId: string, accountId: string) {
  const [owned] = await requireTenantAccounts(organizationId, [accountId]);
  if (owned.platform !== 'whatsapp' || !owned.isActive || owned.needsReconnection) invalid('Choose an active connected WhatsApp account.');
}
function template(value: unknown): Campaign['template'] {
  if (!value || typeof value !== 'object') invalid('Select an approved WhatsApp template.');
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || !/^[a-z][a-z0-9_]{0,511}$/.test(input.name) || typeof input.language !== 'string' || !/^[a-z]{2,3}(?:_[A-Za-z]{2,4})?$/.test(input.language)) invalid('Use the exact approved template name and language.');
  if (input.variableMapping !== undefined) invalid('Use reviewed static text parameters. Local CRM data is not a provider contact field.');
  if (input.components !== undefined && (!Array.isArray(input.components) || input.components.length > 1)) invalid('Campaigns currently support text body parameters.');
  const components: Record<string, unknown>[] = [];
  for (const component of (input.components || []) as Record<string, unknown>[]) {
    if (!component || component.type !== 'body' || !Array.isArray(component.parameters) || component.parameters.length > 30) invalid('Use template body text parameters.');
    const parameters = component.parameters.map((p: Record<string, unknown>) => {
      if (!p || p.type !== 'text' || typeof p.text !== 'string' || !p.text.trim() || p.text.length > 1024) invalid('Each template parameter needs text of at most 1024 characters.');
      return { type: 'text', text: p.text };
    });
    components.push({ type: 'body', parameters });
  }
  return { name: input.name as string, language: input.language as string, ...(components.length ? { components } : {}) };
}
function checkRevision(campaign: Campaign, revision: unknown) {
  if (!Number.isInteger(revision) || revision !== campaign.revision) throw new TenantAccessError(409, 'Refresh and review the current campaign before continuing.');
}
async function currentAudience(campaign: Campaign) {
  const current = await CampaignService.preview(campaign.organization_id, campaign.contact_ids);
  if (current.hash !== campaign.audience_hash) throw new TenantAccessError(409, 'Audience or consent changed. Review a new draft before sending.');
}
async function currentCreator(campaign: Campaign) {
  if (!campaign.created_by) throw new TenantAccessError(403, 'Campaign creator authorization is unavailable.');
  const { data, error } = await campaignDb().from('org_members').select('role').eq('organization_id', campaign.organization_id).eq('user_id', campaign.created_by).maybeSingle();
  if (error) throw new TenantAccessError(503, 'Campaign creator authorization is unavailable.');
  if (!data || !['owner', 'admin', 'editor'].includes(data.role)) throw new TenantAccessError(403, 'The campaign creator no longer has permission to send.');
}
export class CampaignService {
  static async preview(organizationId: string, contactIds: unknown) {
    if (!Array.isArray(contactIds) || !contactIds.length || contactIds.length > 1000 || contactIds.some(id => typeof id !== 'string' || !uuid.test(id))) invalid('Select 1–1000 saved CRM contacts.');
    const resolved = await resolveCampaignAudience(organizationId, [...new Set(contactIds)]);
    const snapshot: AudienceSnapshot = { phones: [...resolved.phones].sort(), contactIds: [...resolved.contactIds].sort(), evidence: resolved.evidence };
    if (snapshot.phones.length > 1000) invalid('A campaign supports at most 1000 eligible phone numbers.');
    return { snapshot, hash: audienceHash(snapshot), excluded: resolved.excluded };
  }
  static async save(organizationId: string, actorId: string, input: Record<string, unknown>) {
    if (!uuid.test(String(input.id)) || !uuid.test(actorId)) invalid('A stable campaign identifier and signed-in workspace user are required.');
    if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 120) invalid('Enter a campaign name of at most 120 characters.');
    const id = String(input.id), accountId = String(input.accountId || ''); await account(organizationId, accountId);
    const content = template(input.template), reviewed = await this.preview(organizationId, input.contactIds);
    if (!reviewed.snapshot.phones.length) invalid('The audience has no eligible, opted-in WhatsApp recipients.');
    if (input.audienceHash !== reviewed.hash || input.reviewed !== true) throw new TenantAccessError(409, 'Review the exact audience and confirm consent before saving.');
    let existing: Campaign | null = null;
    try { existing = await CampaignStore.get(organizationId, id); } catch (e) { if (!(e instanceof TenantAccessError && e.status === 404)) throw e; }
    const values = { name: input.name.trim(), account_id: accountId, template: content, contact_ids: [...new Set(input.contactIds as string[])], audience_snapshot: reviewed.snapshot, audience_hash: reviewed.hash };
    if (existing) {
      if (input.revision === undefined && existing.audience_hash === reviewed.hash && existing.name === values.name && existing.account_id === accountId && JSON.stringify(existing.template) === JSON.stringify(content)) return existing;
      checkRevision(existing, input.revision);
      if (!['draft', 'needs_review'].includes(existing.status) || existing.provider_id || existing.operation_token) throw new TenantAccessError(409, 'Only an unsubmitted draft can be edited.');
      return CampaignStore.edit(organizationId, id, existing.revision, { ...values, status: 'draft', error: null, step: null });
    }
    return CampaignStore.create({ ...values, id, organization_id: organizationId, created_by: actorId });
  }
  static async schedule(organizationId: string, id: string, revision: unknown, scheduledAt: unknown) {
    const campaign = await CampaignStore.get(organizationId, id); checkRevision(campaign, revision);
    if (!['draft', 'scheduled'].includes(campaign.status) || campaign.provider_id) throw new TenantAccessError(409, 'Only an unsubmitted draft or scheduled campaign can be scheduled.');
    if (typeof scheduledAt !== 'string' || !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) < Date.now() + 60_000) invalid('Choose a time at least one minute in the future.');
    await account(organizationId, campaign.account_id); await currentAudience(campaign);
    await SaasAllowanceService.assertCapability({ organizationId, capability: 'campaign_send' });
    return CampaignStore.edit(organizationId, id, campaign.revision, { status: 'scheduled', scheduled_at: new Date(scheduledAt).toISOString() });
  }
  static async dispatch(organizationId: string, id: string, revision?: number) {
    const token = randomUUID(); let campaign = await CampaignStore.claim(organizationId, id, token);
    let attemptedProviderWrite = false;
    try {
      if (revision !== undefined && campaign.revision !== revision + 1) throw new TenantAccessError(409, 'The reviewed campaign changed. Review it again.');
      await currentCreator(campaign); await account(organizationId, campaign.account_id); await currentAudience(campaign);
      await WhatsAppBroadcastService.validateTemplate({ organizationId, accountId: campaign.account_id, template: campaign.template });
      const allowance = await SaasAllowanceService.reserveUnits({ organizationId, capability: 'campaign_send', operationKey: `campaign:${campaign.id}:${campaign.revision}`, units: campaign.audience_snapshot.phones.length });
      if (allowance.replayed || allowance.state !== 'reserved') throw new TenantAccessError(409, 'This spending operation already exists. Reconcile the existing campaign.');
      campaign = await CampaignStore.progress(campaign, token, { reservation_id: allowance.reservationId, step: 'create_attempted' });
      attemptedProviderWrite = true;
      const created = await WhatsAppBroadcastService.create({ organizationId, accountId: campaign.account_id, name: campaign.name, template: campaign.template, idempotencyKey: `campaign:${campaign.id}:create` });
      campaign = await CampaignStore.progress(campaign, token, { provider_id: created.broadcast!.id!, step: 'recipients_attempted' });
      await WhatsAppBroadcastService.addRecipients({ organizationId, accountId: campaign.account_id, broadcastId: campaign.provider_id!, phones: campaign.audience_snapshot.phones, idempotencyKey: `campaign:${campaign.id}:recipients` });
      await verifyProviderRecipients(campaign);
      const providerDraft = await campaignProviderRead(campaign);
      if (!providerDraft || JSON.stringify(stable(providerDraft.template)) !== JSON.stringify(stable(campaign.template))) {
        throw new TenantAccessError(409, 'The provider template differs from the reviewed draft. Sending was stopped.');
      }
      // This is deliberately immediately before sending, including scheduled jobs.
      await currentAudience(campaign); await currentCreator(campaign);
      campaign = await CampaignStore.progress(campaign, token, { step: 'send_attempted' });
      const result = await WhatsAppBroadcastService.send({ organizationId, accountId: campaign.account_id, broadcastId: campaign.provider_id!, idempotencyKey: `campaign:${campaign.id}:send` });
      return await CampaignStore.progress(campaign, token, { status: String(result.status), result, step: 'submitted', operation_token: null, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 600) : 'Campaign processing is unavailable.';
      if (!attemptedProviderWrite && campaign.reservation_id) await SaasAllowanceService.release({ organizationId, reservationId: campaign.reservation_id, reason: 'Stopped before any provider write', evidence: { campaignId: id, attemptedProviderWrite: false } });
      await CampaignStore.progress(campaign, token, { status: attemptedProviderWrite ? 'uncertain' : 'needs_review', error: message, operation_token: null });
      throw error;
    }
  }
  static async cancel(organizationId: string, id: string, revision: unknown) {
    const campaign = await CampaignStore.get(organizationId, id); checkRevision(campaign, revision);
    if (campaign.operation_token) throw new TenantAccessError(409, 'Campaign processing is in progress. Refresh before cancelling.');
    if (!campaign.provider_id && ['draft', 'scheduled', 'needs_review'].includes(campaign.status)) return CampaignStore.edit(organizationId, id, campaign.revision, { status: 'cancelled', scheduled_at: null });
    if (!campaign.provider_id) throw new TenantAccessError(409, 'The provider outcome is uncertain. Reconcile before changing this campaign.');
    const token = randomUUID(); const locked = await CampaignStore.edit(organizationId, id, campaign.revision, { operation_token: token, step: 'cancel_attempted' });
    try { const result = await cancelProviderCampaign(locked); return await CampaignStore.progress(locked, token, { status: 'cancelled', result, operation_token: null }); }
    catch (error) { await CampaignStore.progress(locked, token, { status: 'uncertain', error: 'Cancellation was not confirmed. Refresh provider results.', operation_token: null }); throw error; }
  }
  static async results(organizationId: string, id: string, skip = 0, status?: string) {
    const campaign = await CampaignStore.get(organizationId, id);
    if (campaign.status === 'cancelled' && campaign.result?.providerDraftDeleted === true) {
      return { campaign, provider: campaign.result, recipients: [], pagination: { hasMore: false, total: 0 },
        observedAt: campaign.updated_at, cost: null, costStatus: 'unavailable' };
    }
    const provider = await campaignProviderRead(campaign), recipients = await campaignRecipients(campaign, skip, status);
    return { campaign, provider, ...recipients, observedAt: new Date().toISOString(), cost: null, costStatus: 'unavailable' };
  }
  /** Read provider state only. This never sends or recreates a campaign. */
  static async reconcile(organizationId: string, id: string, revision: unknown) {
    const campaign = await CampaignStore.get(organizationId, id); checkRevision(campaign, revision);
    if (campaign.operation_token && Date.now() - Date.parse(campaign.updated_at) < 5 * 60_000) {
      throw new TenantAccessError(409, 'Campaign processing is still in progress. Wait before reconciling.');
    }
    if (!campaign.provider_id) throw new TenantAccessError(409, 'No provider identifier was confirmed. Review the provider account and contact support; do not repeat this campaign.');
    const provider = await campaignProviderRead(campaign);
    if (!provider || !['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'].includes(String(provider.status))) {
      throw new TenantAccessError(502, 'The provider campaign status could not be verified.');
    }
    const values = { status: provider.status === 'draft' ? 'needs_review' : String(provider.status), result: provider,
      operation_token: null, step: 'reconciled',
      error: provider.status === 'draft' ? 'The provider draft was not submitted. Cancel it and create a newly reviewed campaign.' : null };
    // Preserve reservations until actual billing evidence is available, including failures.
    return campaign.operation_token
      ? CampaignStore.progress(campaign, campaign.operation_token, { ...values, revision: campaign.revision + 1 })
      : CampaignStore.edit(organizationId, id, campaign.revision, values);
  }
  static async drain() {
    const { data, error } = await campaignDb().from('asra3_campaigns').select('id,organization_id').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(3);
    if (error || !data) throw new TenantAccessError(503, 'Scheduled campaigns could not be loaded.');
    let submitted = 0, stopped = 0;
    for (const row of data) { try { await this.dispatch(row.organization_id, row.id); submitted++; } catch { stopped++; } }
    return { submitted, stopped };
  }
}
