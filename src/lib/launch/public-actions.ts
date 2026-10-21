import { requireWorkspaceRole, TenantAccessError, type TenantRole } from '@/lib/auth/tenant-access';
import { ManualCrmService } from '@/lib/crm/service';
import { SaasApiKeyService } from '@/lib/saas/api-keys';
import { PHONE_READ_ACTIONS, runPhoneLifecycleAction } from '@/lib/phone-lifecycle/actions';
import { ReportsService } from '@/lib/reports/service';

export type PublicActor = { organizationId: string; userId: string; role: TenantRole };
/** Adapters only: every operation uses the same durable service as its dashboard. */
export async function runLaunchPublicApi(actor: PublicActor, method: string, path: string[], input: Record<string, any>): Promise<Record<string, any> | null> {
  const org = actor.organizationId, root = path[0], id = path[1], key = '/' + path.join('/');
  if (input.organizationId && input.organizationId !== org) throw new TenantAccessError(403, 'This workspace is not accessible.');
  if (['api-keys', 'keys'].includes(root)) {
    requireWorkspaceRole(actor.role);
    if (method === 'GET' && path.length === 1) return SaasApiKeyService.list(org);
    if (method === 'POST' && path.length === 1) return SaasApiKeyService.create({ organizationId: org, actorId: actor.userId, name: input.name, scopes: input.scopes, expiresAt: input.expiresAt });
    if (['DELETE', 'POST'].includes(method) && id && (path.length === 2 || (path.length === 3 && path[2] === 'revoke'))) {
      const revoked = await SaasApiKeyService.revoke({ organizationId: org, actorId: actor.userId, keyId: id });
      if (revoked !== true) throw new TenantAccessError(404, 'API key was not found in this workspace.');
      return { revoked: true, keyId: id };
    }
    throw new TenantAccessError(501, 'Create a replacement key, update your client, then revoke the old key.');
  }
  if (root === 'contacts') {
    if (path.length > 2) throw new TenantAccessError(501, 'This CRM operation is not available.');
    if (method === 'GET') return id ? { contact: await ManualCrmService.get(org, id) } : ManualCrmService.list(org, input);
    requireWorkspaceRole(actor.role, true);
    if (method === 'POST' && !id) return ManualCrmService.save(actor, input.contact || input, { duplicateDecision: input.duplicateDecision });
    if (['PUT', 'PATCH'].includes(method) && id) return ManualCrmService.save(actor, input.contact || input, { id, revision: input.revision });
    if (method === 'DELETE' && id) return ManualCrmService.archive(actor, id, input.revision, true);
    throw new TenantAccessError(501, 'Use the CRM workspace for reviewed imports, consent changes and manual inbox links.');
  }
  if (root === 'custom-fields' || root === 'segments') {
    if (path.length !== 1) throw new TenantAccessError(501, 'Editing this CRM resource is not available.');
    if (method === 'GET') return root === 'custom-fields' ? { fields: await ManualCrmService.fields(org) } : ManualCrmService.audiences(org);
    requireWorkspaceRole(actor.role, true);
    if (method === 'POST') return root === 'custom-fields' ? ManualCrmService.saveField(actor, input) : ManualCrmService.saveAudience(actor, input.name, input.contactIds);
    throw new TenantAccessError(501, 'This manual CRM operation is not available.');
  }
  if (['/analytics', '/analytics/dashboard', '/inbox-analytics', '/analytics/inbox/volume', '/analytics/inbox/response-time'].includes(key)) {
    if (method !== 'GET') throw new TenantAccessError(405, 'Use GET for reports.');
    const reportInput = { organizationId: org, fromDate: input.fromDate, toDate: input.toDate, platform: input.platform, accountId: input.accountId, timezone: input.timezone };
    return key.includes('inbox') ? ReportsService.messaging(reportInput) : ReportsService.social(reportInput);
  }
  const phone = root === 'phone-lifecycle' || root === 'phone-numbers' || root === 'sms' || root === 'voice' || (root === 'whatsapp' && id === 'flows');
  if (!phone) return null;
  if ((root === 'phone-lifecycle' && path.length !== 1) || (root !== 'whatsapp' && path.length > 2) || (root === 'whatsapp' && path.length > 4)) throw new TenantAccessError(501, 'This phone operation is not available.');
  let action = root === 'phone-lifecycle' ? input.action : '';
  if (root === 'phone-numbers') {
    if (method === 'GET') action = !id ? 'numbers' : id === 'available' ? 'offers' : 'number';
    if (method === 'POST' && id === 'buy') action = 'purchase';
    if (method === 'DELETE' && id) action = 'release';
    if (id && !['available', 'buy'].includes(id)) input = { ...input, numberId: id };
  }
  if (root === 'sms' && method === 'POST' && id === 'send') action = 'sms_send';
  if (root === 'voice') {
    if (method === 'GET' && id === 'calls') action = 'call_history';
    if (method === 'GET' && id === 'estimate') action = 'call_estimate';
    if (method === 'POST' && id === 'calls') action = 'call_start';
  }
  if (root === 'whatsapp' && id === 'flows') {
    input = { ...input, ...(path[2] ? { flowId: path[2] } : {}) };
    if (method === 'GET') action = !path[2] ? 'flows' : !path[3] ? 'flow' : path[3] === 'responses' ? 'flow_responses' : path[3] === 'preview' ? 'flow_preview' : '';
    if (method === 'POST') action = !path[2] ? 'flow_create' : ['upload', 'publish', 'deprecate', 'send'].includes(path[3]) ? `flow_${path[3]}` : '';
    if (method === 'DELETE' && path[2] && path.length === 3) action = 'flow_delete';
  }
  if (!action) throw new TenantAccessError(501, 'Use the Phone workspace or /phone-lifecycle with an implemented action.');
  if (method === 'GET' && !PHONE_READ_ACTIONS.includes(action)) throw new TenantAccessError(405, 'Use POST for a reviewed phone change.');
  if (method !== 'GET') {
    requireWorkspaceRole(actor.role, action !== 'call_settings_save');
    if (PHONE_READ_ACTIONS.includes(action)) throw new TenantAccessError(405, 'Use GET for phone reads.');
  }
  return runPhoneLifecycleAction(org, action, { ...input, intent: input.idempotencyKey || input.intent });
}
