import { MetaSettingsService } from './service';
import { MetaInboxService } from '@/lib/meta-inbox/service';
import { TenantAccessError } from '@/lib/auth/tenant-access';

const settings = ['messenger-greeting', 'messenger-menu', 'messenger-ice-breakers', 'instagram-ice-breakers'];

export function isMetaSettingsPath(path: string[]) {
  return path[0] === 'accounts' && path.length === 3 && settings.includes(path[2]);
}

export function isMetaThreadControlPath(path: string[]) {
  return path[0] === 'inbox' && path[1] === 'conversations' && path.length === 4 && ['thread-control', 'handover'].includes(path[3]);
}

export async function runMetaSettingsAction(organizationId: string, action: string, input: Record<string, any>) {
  const params = { organizationId, accountId: input.accountId, setting: input.setting };
  switch (action) {
    case 'accounts': return MetaInboxService.listAccounts(organizationId);
    case 'settings': return MetaSettingsService.getSetting(params);
    case 'save': return MetaSettingsService.setSetting({ ...params, value: input.value });
    case 'reset': return MetaSettingsService.deleteSetting(params);
    case 'thread_control': return MetaSettingsService.threadControl({ organizationId, accountId: input.accountId,
      conversationId: input.conversationId, action: input.controlAction, targetAppId: input.targetAppId, metadata: input.metadata });
    default: throw new TenantAccessError(501, 'This messaging setting is not available.');
  }
}

export async function runMetaSettingsPublicApi(organizationId: string, method: string, path: string[], input: Record<string, any>) {
  if (isMetaSettingsPath(path)) {
    const action = method === 'GET' ? 'settings' : method === 'PUT' ? 'save' : method === 'DELETE' ? 'reset' : '';
    if (action) return runMetaSettingsAction(organizationId, action, { ...input, accountId: path[1], setting: path[2] });
  }
  if (isMetaThreadControlPath(path) && method === 'POST') {
    return runMetaSettingsAction(organizationId, 'thread_control', { ...input, conversationId: path[2], controlAction: input.action });
  }
  throw new TenantAccessError(501, 'Use a supported messaging setting or conversation control operation.');
}
