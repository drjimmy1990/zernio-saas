import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
import type { CreateBroadcastData } from '@zernio/node';
import { createHash } from 'crypto';

type AccountParams = { organizationId: string; accountId: string };
type BroadcastParams = AccountParams & { broadcastId: string };
type Broadcast = { id?: string; accountId?: string; profileId?: string; platform?: string; status?: string; recipientCount?: number };
type ProviderResult = Record<string, unknown> & { httpStatus: number; broadcast?: Broadcast; broadcasts?: Broadcast[] };
function invalid(message: string): never { throw new ZernioApiException({ status: 400, code: 'invalid_request', error: message }); }
function malformed(message: string): never { throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: message }); }
function intentKey(params: AccountParams & { idempotencyKey?: string }, operation: string, fallback?: unknown) {
  if (params.idempotencyKey !== undefined && (typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim() || params.idempotencyKey.length > 200)) invalid('Invalid idempotency key.');
  if (!params.idempotencyKey && fallback === undefined) invalid('A stable idempotencyKey is required to create a broadcast.');
  return `asra3-bc-${createHash('sha256').update(JSON.stringify([params.organizationId, params.accountId, operation, params.idempotencyKey ?? fallback])).digest('hex')}`;
}
async function provider(params: Parameters<typeof zernioClient.request>[0]): Promise<ProviderResult> {
  const { data, status } = await zernioClient.request<Record<string, unknown>>({ ...params,
    ...(params.method && params.method !== 'GET' ? { retryOnRateLimit: false } : {}),
  });
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.success === false || data.error) malformed('The provider did not confirm this broadcast operation.');
  return { ...data, httpStatus: status };
}
async function owned(params: AccountParams, mutation = false) {
  await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
  const [account] = await requireTenantAccounts(params.organizationId, [params.accountId]);
  if (account.platform !== 'whatsapp') invalid('Select a connected WhatsApp account.');
  if (mutation && (!account.isActive || account.needsReconnection)) invalid('Reconnect this WhatsApp account before changing a broadcast.');
  return CoreConnectService.ensureTenantProfile(params.organizationId);
}
function path(id: string) {
  if (typeof id !== 'string' || !id.trim()) invalid('Select a provider broadcast.');
  return `/broadcasts/${encodeURIComponent(id)}`;
}
function assertBroadcast(result: ProviderResult, params: AccountParams, profileId: string) {
  const broadcast = result.broadcast;
  if (!broadcast?.id) malformed('The provider returned no broadcast identifier.');
  if (broadcast.accountId !== params.accountId || broadcast.platform !== 'whatsapp' || (broadcast.profileId !== undefined && broadcast.profileId !== profileId)) {
    throw new ZernioApiException({ status: 404, code: 'broadcast_not_found', error: 'Broadcast not found on this WhatsApp account.' });
  }
  return broadcast;
}
async function approved(params: AccountParams, template: NonNullable<CreateBroadcastData['body']['template']>) {
  if (typeof template?.name !== 'string' || !/^[a-z][a-z0-9_]*$/.test(template.name) || typeof template.language !== 'string' || !template.language) invalid('Select a template name and exact language.');
  const result = await provider({ path: '/whatsapp/templates', query: { accountId: params.accountId, name: template.name, language: template.language } });
  const templates = result.templates as { name?: string; language?: string; status?: string }[] | undefined;
  if (!Array.isArray(templates)) malformed('The provider returned no template list.');
  if (!templates.some(item => item.name === template.name && item.language === template.language && item.status === 'APPROVED')) invalid('The selected template is not approved for this account and language.');
}

/** Draft creation, recipient addition, and dispatch remain separate provider operations. */
export class WhatsAppBroadcastService {
  static async validateTemplate(params: AccountParams & { template: NonNullable<CreateBroadcastData['body']['template']> }) {
    await owned(params, true);
    await approved(params, params.template);
  }
  static async list(params: AccountParams & { skip?: number; limit?: number }) {
    const profileId = await owned(params);
    if (params.skip !== undefined && (!Number.isInteger(params.skip) || params.skip < 0)) invalid('Invalid broadcast page offset.');
    if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) invalid('Limit must be between 1 and 100.');
    const result = await provider({ path: '/broadcasts', query: { profileId, platform: 'whatsapp', skip: params.skip, limit: params.limit } });
    if (!Array.isArray(result.broadcasts)) malformed('The provider returned no broadcast list.');
    return { ...result, broadcasts: result.broadcasts.filter(item => item.accountId === params.accountId && item.platform === 'whatsapp' && (item.profileId === undefined || item.profileId === profileId)) };
  }

  static async create(params: AccountParams & { name: string; template: NonNullable<CreateBroadcastData['body']['template']>; idempotencyKey?: string }) {
    const profileId = await owned(params, true);
    const idempotencyKey = intentKey(params, 'create');
    if (typeof params.name !== 'string' || !params.name.trim()) invalid('Enter a broadcast name.');
    await approved(params, params.template);
    const result = await provider({ method: 'POST', path: '/broadcasts', idempotencyKey,
      body: { profileId, accountId: params.accountId, platform: 'whatsapp', name: params.name.trim(),
        template: { name: params.template.name, language: params.template.language, components: params.template.components, variableMapping: params.template.variableMapping } } });
    assertBroadcast(result, params, profileId);
    return result;
  }

  static async get(params: BroadcastParams) {
    const profileId = await owned(params);
    const result = await provider({ path: path(params.broadcastId) });
    const broadcast = assertBroadcast(result, params, profileId);
    if (broadcast.id !== params.broadcastId) malformed('The provider returned a different broadcast.');
    return result;
  }

  static async addRecipients(params: BroadcastParams & { phones: string[]; idempotencyKey?: string }) {
    await owned(params, true);
    const draft = await this.get(params);
    if (draft.broadcast?.status !== 'draft') invalid('Recipients can only be added to a draft broadcast.');
    if (!Array.isArray(params.phones) || !params.phones.length || params.phones.length > 1000 || params.phones.some(phone => typeof phone !== 'string' || !/^\+?[1-9]\d{6,14}$/.test(phone))) invalid('Provide 1–1000 international recipient numbers.');
    const phones = [...new Set(params.phones.map(phone => phone.replace(/^\+/, '')))];
    const result = await provider({ method: 'POST', path: `${path(params.broadcastId)}/recipients`, idempotencyKey: intentKey(params, `recipients:${params.broadcastId}`, [...phones].sort()), body: { phones, useSegment: false } });
    if (typeof result.added !== 'number' || typeof result.skipped !== 'number') malformed('The provider did not confirm recipient addition.');
    return result;
  }

  static async send(params: BroadcastParams & { idempotencyKey?: string }) {
    await owned(params, true);
    const result = await this.get(params);
    if (result.broadcast?.status !== 'draft') invalid('Only a draft broadcast can be dispatched. Refresh provider state before retrying.');
    if (typeof result.broadcast!.recipientCount !== 'number' || result.broadcast!.recipientCount < 1) invalid('Add recipients to this draft before dispatch.');
    const template = result.broadcast as Broadcast & { template?: NonNullable<CreateBroadcastData['body']['template']> };
    if (!template.template) malformed('The provider returned no broadcast template.');
    await approved(params, template.template);
    const sent = await provider({ method: 'POST', path: `${path(params.broadcastId)}/send`, idempotencyKey: intentKey(params, `send:${params.broadcastId}`, params.broadcastId) });
    if (!['sending', 'completed', 'failed'].includes(String(sent.status)) || typeof sent.sent !== 'number' || typeof sent.failed !== 'number' || typeof sent.recipientCount !== 'number') malformed('The provider did not confirm broadcast dispatch. Refresh the existing broadcast before retrying.');
    return sent;
  }
}
