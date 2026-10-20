import { WhatsAppService } from '@/lib/whatsapp/service';
import { WhatsAppBroadcastService } from '@/lib/whatsapp/broadcasts';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ZernioApiException } from '@/lib/zernio/client';

// One dispatcher keeps dashboard and developer API behavior consistent.
export async function runWhatsAppAction(organizationId: string, action: string, input: Record<string, any>) {
  const accountId = input.accountId;
  const params = { organizationId, accountId, conversationId: input.conversationId,
    cursor: input.cursor, limit: input.limit == null || input.limit === '' ? undefined : Number(input.limit) };
  switch (action) {
    case 'accounts': return WhatsAppService.listAccounts(organizationId);
    case 'conversations': return WhatsAppService.listConversations(params);
    case 'conversation': return WhatsAppService.getConversation(params);
    case 'messages': return WhatsAppService.listMessages({ ...params, sortOrder: input.sortOrder });
    case 'templates': return WhatsAppService.listTemplates({ organizationId, accountId, name: input.name, language: input.language, status: input.status });
    case 'mark_read': return WhatsAppService.markRead(params);
    case 'broadcasts': return WhatsAppBroadcastService.list({ ...params, skip: input.skip == null ? undefined : Number(input.skip) });
    case 'get_broadcast': return WhatsAppBroadcastService.get({ organizationId, accountId, broadcastId: input.broadcastId });
    case 'create_broadcast': return WhatsAppBroadcastService.create({ organizationId, accountId, name: input.name, template: input.template, idempotencyKey: input.idempotencyKey });
    case 'add_broadcast_recipients': return WhatsAppBroadcastService.addRecipients({ organizationId, accountId, broadcastId: input.broadcastId, phones: input.phones, idempotencyKey: input.idempotencyKey });
    case 'send_broadcast': throw new TenantAccessError(409, 'Use Campaigns to review CRM recipients, consent and spending before sending.');
    case 'send': {
      const template = input.template ?? (input.templateName ? { name: input.templateName,
        language: input.templateLanguage, parameters: input.templateParams, headerMedia: input.headerMedia } : undefined);
      return WhatsAppService.sendMessage({ ...params, recipient: input.recipient ?? input.participantId ?? input.to,
        text: input.text ?? input.message, template,
        attachments: input.attachments ?? (input.attachmentUrl ? [{ url: input.attachmentUrl, type: input.attachmentType, name: input.attachmentName }] : undefined),
        idempotencyKey: input.idempotencyKey });
    }
    case 'create_template': return WhatsAppService.createTemplate({ organizationId, accountId, name: input.name,
      language: input.language, category: input.category, components: input.components,
      parameter_format: input.parameter_format, message_send_ttl_seconds: input.message_send_ttl_seconds });
    default: throw new TenantAccessError(400, 'Unsupported WhatsApp action.');
  }
}

export function whatsAppError(error: unknown) {
  const provider = error instanceof ZernioApiException ? error.envelope : null;
  return { status: error instanceof TenantAccessError ? error.status : provider?.status || 503,
    payload: { success: false, error: { code: provider?.code || (error instanceof TenantAccessError ? 'access_denied' : 'whatsapp_unavailable'),
      message: error instanceof Error ? error.message : 'WhatsApp is unavailable.',
      ...(provider?.details ? { details: provider.details } : {}),
      ...(provider?.platformError ? { platformError: provider.platformError } : {}),
      ...(provider?.requestId ? { requestId: provider.requestId } : {}),
      ...(provider?.retryAfterSeconds != null ? { retryAfterSeconds: provider.retryAfterSeconds } : {}) } } };
}

export function isWhatsAppLifecyclePath(path: string[]) {
  return path[0] === 'messages' || path[0] === 'broadcasts' ||
    (path[0] === 'inbox' && ['conversations', 'reply', 'media'].includes(path[1])) ||
    (path[0] === 'whatsapp' && ['messages', 'templates', 'conversations', 'flows'].includes(path[1]));
}

export async function runWhatsAppPublicApi(organizationId: string, method: string, path: string[], input: Record<string, any>) {
  if (input.platform && input.platform !== 'whatsapp') throw new TenantAccessError(501, 'This messaging flow currently supports WhatsApp.');
  let action = '';
  if (path[0] === 'broadcasts') {
    if (path.length === 1) action = method === 'GET' ? 'broadcasts' : method === 'POST' ? 'create_broadcast' : '';
    if (path[1]) input = { ...input, broadcastId: path[1] };
    if (path.length === 2 && method === 'GET') action = 'get_broadcast';
    if (path.length === 3 && method === 'POST') action = path[2] === 'send' ? 'send_broadcast' : path[2] === 'recipients' ? 'add_broadcast_recipients' : '';
  }
  if (path[0] === 'whatsapp' && path[1] === 'templates' && path.length === 2) action = method === 'GET' ? 'templates' : method === 'POST' ? 'create_template' : '';
  if (path[0] === 'whatsapp' && path[1] === 'messages' && path.length === 2) action = method === 'POST' ? 'send' : method === 'GET' ? 'messages' : '';
  if (path[0] === 'inbox' && path[1] === 'reply' && path.length === 2 && method === 'POST') action = 'send';
  if (path[0] === 'messages' && path.length === 1) action = method === 'POST' ? 'send' : method === 'GET' ? (input.conversationId ? 'messages' : 'conversations') : '';
  if ((path[0] === 'inbox' || path[0] === 'messages' || path[0] === 'whatsapp') && path[1] === 'conversations') {
    if (path.length === 2) action = method === 'GET' ? 'conversations' : method === 'POST' ? 'send' : '';
    if (path[2] && path[2] !== 'search') {
      input = { ...input, conversationId: path[2] };
      if (path.length === 3 && method === 'GET') action = 'conversation';
      if (path.length === 4 && path[3] === 'messages') action = method === 'GET' ? 'messages' : method === 'POST' ? 'send' : '';
      if (path.length === 4 && path[3] === 'read' && method === 'POST') action = 'mark_read';
    }
  }
  if (!action) throw new TenantAccessError(501, 'This operation has no implemented provider flow.');
  return runWhatsAppAction(organizationId, action, input);
}
