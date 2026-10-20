import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ZernioApiException } from '@/lib/zernio/client';
import { runWhatsAppAction, runWhatsAppPublicApi } from '@/lib/whatsapp/actions';
import { MetaInboxService } from '@/lib/meta-inbox/service';

export async function runMetaInboxAction(organizationId: string, action: string, input: Record<string, any>) {
  const params = { organizationId, accountId: input.accountId, conversationId: input.conversationId,
    cursor: input.cursor, limit: input.limit == null || input.limit === '' ? undefined : Number(input.limit),
    folder: input.folder, status: input.status, sortOrder: input.sortOrder };
  switch (action) {
    case 'accounts': return MetaInboxService.listAccounts(organizationId);
    case 'conversations': return MetaInboxService.listConversations(params);
    case 'conversation': return MetaInboxService.getConversation(params);
    case 'messages': return MetaInboxService.listMessages(params);
    case 'mark_read': return MetaInboxService.markRead(params);
    case 'send': return MetaInboxService.sendMessage({ ...params, text: input.text ?? input.message,
      attachments: input.attachments, idempotencyKey: input.idempotencyKey,
      messagingType: input.messagingType, messageTag: input.messageTag });
    case 'accept': return MetaInboxService.acceptRequest({ ...params, text: input.text ?? input.message,
      idempotencyKey: input.idempotencyKey });
    default: throw new TenantAccessError(501, 'This inbox operation is not available.');
  }
}

/** Select from the verified provider account, never from the caller's platform label. */
async function inboxPlatform(organizationId: string, input: Record<string, any>) {
  if (!input.accountId) {
    if (input.platform && input.platform !== 'whatsapp') throw new TenantAccessError(400, 'Select a connected account.');
    return 'whatsapp';
  }
  const [account] = await requireTenantAccounts(organizationId, [input.accountId]);
  if (input.platform && input.platform !== account.platform) throw new TenantAccessError(400, 'The platform does not match this account.');
  if (!['facebook', 'instagram', 'whatsapp'].includes(account.platform)) throw new TenantAccessError(501, 'This messaging channel is not available.');
  return account.platform;
}

export async function runInboxReply(organizationId: string, input: Record<string, any>) {
  return (await inboxPlatform(organizationId, input)) === 'whatsapp'
    ? runWhatsAppAction(organizationId, 'send', input)
    : runMetaInboxAction(organizationId, 'send', input);
}

export async function runInboxPublicApi(organizationId: string, method: string, path: string[], input: Record<string, any>, options: { allowMeta?: boolean } = {}) {
  // Explicit WhatsApp routes keep their existing policy and platform validation.
  if (path[0] === 'whatsapp' || path[0] === 'broadcasts' || (await inboxPlatform(organizationId, input)) === 'whatsapp') {
    return runWhatsAppPublicApi(organizationId, method, path, input);
  }
  if (options.allowMeta === false) throw new TenantAccessError(403, 'Messenger and Instagram require accounts:read or inbox:write permission.');
  let action = '';
  if (path[0] === 'inbox' && path[1] === 'reply' && path.length === 2 && method === 'POST') action = 'send';
  if (path[0] === 'messages' && path.length === 1) action = method === 'POST' ? 'send' : method === 'GET' ? (input.conversationId ? 'messages' : 'conversations') : '';
  if (['inbox', 'messages'].includes(path[0]) && path[1] === 'conversations') {
    if (path.length === 2 && method === 'GET') action = 'conversations';
    if (path[2] && path[2] !== 'search') {
      input = { ...input, conversationId: path[2] };
      if (path.length === 3 && method === 'GET') action = 'conversation';
      if (path.length === 4 && path[3] === 'messages') action = method === 'GET' ? 'messages' : method === 'POST' ? 'send' : '';
      if (path.length === 4 && path[3] === 'read' && method === 'POST') action = 'mark_read';
      if (path.length === 4 && path[3] === 'accept' && method === 'POST') action = 'accept';
    }
  }
  if (!action) throw new TenantAccessError(501, 'This operation has no implemented provider flow. Messenger and Instagram replies require an existing customer conversation.');
  return runMetaInboxAction(organizationId, action, input);
}

export function inboxError(error: unknown) {
  const provider = error instanceof ZernioApiException ? error.envelope : null;
  return { status: error instanceof TenantAccessError ? error.status : provider?.status || 503,
    payload: { success: false, error: { code: provider?.code || (error instanceof TenantAccessError ? 'access_denied' : 'inbox_unavailable'),
      message: error instanceof Error ? error.message : 'The inbox is unavailable.',
      ...(provider?.details ? { details: provider.details } : {}),
      ...(provider?.platformError ? { platformError: provider.platformError } : {}),
      ...(provider?.requestId ? { requestId: provider.requestId } : {}),
      ...(provider?.retryAfterSeconds != null ? { retryAfterSeconds: provider.retryAfterSeconds } : {}) } } };
}
