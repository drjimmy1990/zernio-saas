import { requireTenantAccounts, type TenantProviderAccount } from '@/lib/auth/tenant-provider';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
import type { CreateWhatsAppTemplateData, GetWhatsAppTemplatesData } from '@zernio/node';
import { createHash } from 'crypto';
import { reservedWhatsAppSend } from '@/lib/saas/send';
import { assertDestinationConsent } from '@/lib/crm/consent';
import { normalizeCrmPhone } from '@/lib/crm/audience';

type AccountParams = { organizationId: string; accountId: string };
type ConversationParams = AccountParams & { conversationId: string };
type PageParams = { cursor?: string; limit?: number; sortOrder?: 'asc' | 'desc' };
export type WhatsAppAttachment = { url: string; type: 'image' | 'video' | 'audio' | 'file'; name?: string };
export type WhatsAppSendTemplate = {
  name: string; language: string; parameters?: string[];
  components?: Record<string, unknown>[];
  headerMedia?: { type: 'image' | 'video' | 'document'; link?: string; id?: string; filename?: string };
};

function invalid(message: string): never {
  throw new ZernioApiException({ status: 400, code: 'invalid_request', error: message });
}

function malformed(): never {
  throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'The provider returned an incomplete result. A send outcome may be unknown; review the conversation before another send. An idempotency key alone cannot prevent duplicates after an uncertain failure.' });
}

function messageKey(params: AccountParams & { idempotencyKey?: string }) {
  if (typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim() || params.idempotencyKey.length > 200) invalid('A stable idempotencyKey (up to 200 characters) is required for sending.');
  return `asra3-wa-${createHash('sha256').update(JSON.stringify([params.organizationId, params.accountId, params.idempotencyKey])).digest('hex')}`;
}

function sentResult(result: Record<string, unknown> & { httpStatus: number }) {
  const data = result.data as { messageId?: unknown } | undefined;
  if (typeof data?.messageId !== 'string' || !data.messageId.trim()) malformed();
  return result;
}

function page(params: PageParams) {
  if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) invalid('Limit must be between 1 and 100.');
  if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) invalid('Invalid sort order.');
  return { cursor: params.cursor, limit: params.limit, sortOrder: params.sortOrder };
}

function conversationPath(conversationId: string) {
  if (typeof conversationId !== 'string' || !conversationId.trim()) invalid('Select a conversation.');
  return `/inbox/conversations/${encodeURIComponent(conversationId)}`;
}

async function ownedAccount(params: AccountParams, mutation = false) {
  await assertSubServiceAllowed(params.organizationId, 'telephony');
  const [account] = await requireTenantAccounts(params.organizationId, [params.accountId]);
  if (account.platform !== 'whatsapp') invalid('Select a connected WhatsApp account.');
  if (mutation && (!account.isActive || account.needsReconnection)) {
    throw new ZernioApiException({ status: 409, code: 'account_reconnection_required', error: 'Reconnect this WhatsApp account before sending.' });
  }
  return account;
}

async function provider(params: Parameters<typeof zernioClient.request>[0]): Promise<Record<string, unknown> & { httpStatus: number }> {
  const { data, status } = await zernioClient.request<Record<string, unknown>>(params);
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.error || data.success === false) malformed();
  return { ...data, httpStatus: status };
}

// Flat values follow Zernio's order: text header, body, then dynamic URL buttons.
// Replies in an existing conversation instead require Meta's component send shape.
function templateSendComponents(definition: Record<string, unknown>[] | undefined, values: string[]) {
  if (!Array.isArray(definition)) invalid('Refresh this template before sending; its variable definitions are unavailable.');
  let offset = 0;
  const result: Record<string, unknown>[] = [];
  const parameters = (text: unknown, named = true) => {
    const variables = [...new Set(typeof text === 'string' ? [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map(match => match[1]) : [])];
    if (variables.every(value => /^\d+$/.test(value))) variables.sort((a, b) => Number(a) - Number(b));
    return variables.map(variable => {
      const value = values[offset++];
      if (typeof value !== 'string' || !value.trim()) invalid('Enter a value for every template variable, in header, body and link order.');
      return { type: 'text', text: value, ...(named && !/^\d+$/.test(variable) ? { parameter_name: variable } : {}) };
    });
  };
  for (const type of ['HEADER', 'BODY', 'BUTTONS']) {
    for (const part of definition.filter(item => String(item.type).toUpperCase() === type)) {
      if (type === 'HEADER' && part.format && String(part.format).toUpperCase() !== 'TEXT') {
        invalid('This template needs a media or location header. Supply its template components before sending.');
      }
      if (type === 'BUTTONS') {
        for (const [index, button] of (Array.isArray(part.buttons) ? part.buttons : []).entries()) {
          if (String(button.type).toUpperCase() === 'URL') {
            const params = parameters(button.url, false);
            if (params.length) result.push({ type: 'button', sub_type: 'url', index: String(index), parameters: params });
          } else if (!['PHONE_NUMBER', 'QUICK_REPLY'].includes(String(button.type).toUpperCase())) {
            invalid('This template needs specialised button values. Supply its template components before sending.');
          }
        }
      } else {
        const params = parameters(part.text);
        if (params.length) result.push({ type: type.toLowerCase(), parameters: params });
      }
    }
  }
  if (definition.some(part => !['HEADER', 'BODY', 'FOOTER', 'BUTTONS'].includes(String(part.type).toUpperCase()))) {
    invalid('This template needs specialised content. Supply its template components before sending.');
  }
  if (offset !== values.length) invalid('The number of values must match this template’s header, body and link variables.');
  return result.length ? result : undefined;
}

/** Provider inbox and Meta template state are canonical; no synthetic receipts or local cache. */
export class WhatsAppService {
  static async listAccounts(organizationId: string) {
    await assertSubServiceAllowed(organizationId, 'telephony');
    const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
    const { data, status } = await zernioClient.request<{ accounts?: TenantProviderAccount[] }>({ path: '/accounts', query: { profileId } });
    if (!Array.isArray(data.accounts)) throw new ZernioApiException({ status: 502, error: 'Zernio did not return an account list.' });
    const accounts = data.accounts.filter(account => account.platform === 'whatsapp' &&
      (typeof account.profileId === 'string' ? account.profileId : account.profileId?._id) === profileId)
      .map(account => ({ _id: account._id, accountId: account._id, platform: account.platform, username: account.username,
        displayName: account.displayName, isActive: account.isActive, needsReconnection: account.needsReconnection }));
    return { accounts, profileId, httpStatus: status };
  }

  static async listConversations(params: { organizationId: string; accountId?: string; status?: 'active' | 'archived' } & PageParams) {
    await assertSubServiceAllowed(params.organizationId, 'telephony');
    const profileId = await CoreConnectService.ensureTenantProfile(params.organizationId);
    if (params.accountId) await ownedAccount({ ...params, accountId: params.accountId });
    const result = await provider({ path: '/inbox/conversations', query: { ...page(params), profileId, accountId: params.accountId, platform: 'whatsapp', status: params.status } });
    if (!Array.isArray(result.data) || result.data.some(item => !item || typeof item.id !== 'string' || item.platform !== 'whatsapp' || (params.accountId && item.accountId !== params.accountId))) malformed();
    return result;
  }

  static async getConversation(params: ConversationParams) {
    await ownedAccount(params);
    const result = await provider({ path: conversationPath(params.conversationId), query: { accountId: params.accountId } });
    const conversation = result.data as { id?: string; accountId?: string; platform?: string } | undefined;
    if (!conversation || conversation.id !== params.conversationId || conversation.accountId !== params.accountId || conversation.platform !== 'whatsapp') {
      throw new ZernioApiException({ status: 404, code: 'conversation_not_found', error: 'Conversation not found on this WhatsApp account.' });
    }
    return result;
  }

  static async listMessages(params: ConversationParams & PageParams) {
    await this.getConversation(params);
    const result = await provider({ path: `${conversationPath(params.conversationId)}/messages`, query: { ...page(params), accountId: params.accountId } });
    if (!Array.isArray(result.messages) || result.messages.some(item => !item || typeof item.id !== 'string')) malformed();
    return result;
  }

  static async markRead(params: ConversationParams) {
    await ownedAccount(params, true);
    await this.getConversation(params);
    return provider({ method: 'POST', path: `${conversationPath(params.conversationId)}/read`, body: { accountId: params.accountId } });
  }

  static async sendMessage(params: AccountParams & {
    conversationId?: string; recipient?: string; text?: string; attachments?: WhatsAppAttachment[];
    template?: WhatsAppSendTemplate; idempotencyKey?: string;
  }) {
    await ownedAccount(params, true);
    if (Boolean(params.conversationId) === Boolean(params.recipient)) invalid('Provide one conversation or recipient.');
    const idempotencyKey = messageKey(params);
    if (params.recipient !== undefined && typeof params.recipient !== 'string') invalid('Recipient must be an international phone number.');
    if (params.text !== undefined && typeof params.text !== 'string') invalid('Message text must be a string.');
    const attachments = params.attachments ?? [];
    if (!Array.isArray(attachments) || attachments.length > 1) invalid('Send one attachment per message.');
    const attachment = attachments[0];
    if (attachment) {
      let url: URL;
      try { url = new URL(attachment.url); } catch { invalid('Attachment must have a public HTTPS URL.'); }
      if (url!.protocol !== 'https:' || url!.username || url!.password || !['image', 'video', 'audio', 'file'].includes(attachment.type)) invalid('Invalid attachment URL or type.');
    }
    const template = params.template;
    if (template && (!/^[a-z][a-z0-9_]*$/.test(template.name) || !template.language)) invalid('Provide a template name and language.');
    if (template?.parameters !== undefined && (!Array.isArray(template.parameters) || template.parameters.some(value => typeof value !== 'string'))) invalid('Template parameters must be an array of strings.');
    if (template?.components !== undefined && (!Array.isArray(template.components) || template.components.some(value => !value || typeof value !== 'object' || Array.isArray(value)))) invalid('Template components must be an array of objects.');
    if (template?.headerMedia && (typeof template.headerMedia !== 'object' || !['image', 'video', 'document'].includes(template.headerMedia.type))) invalid('Invalid template header media.');
    if (template && (params.text?.trim() || attachment)) invalid('Send a template separately from text or attachments.');
    if (!template && !params.text?.trim() && !attachment) invalid('Message text, attachment, or template is required.');
    let purpose: 'transactional' | 'marketing' = 'transactional';
    let approvedComponents: Record<string, unknown>[] | undefined;
    if (template) {
      const templates = await this.listTemplates({ organizationId: params.organizationId, accountId: params.accountId, name: template.name, language: template.language });
      const approved = (templates.templates as { name?: string; language?: string; status?: string; category?: string; components?: Record<string, unknown>[] }[])
        .find(item => item.name === template.name && item.language === template.language && item.status === 'APPROVED');
      if (!approved || !['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(approved.category || '')) invalid('This template is not currently approved with a verified category. Refresh templates.');
      purpose = approved.category === 'MARKETING' ? 'marketing' : 'transactional';
      approvedComponents = approved.components;
    }
    if (params.conversationId) {
      const owned = await this.getConversation({ ...params, conversationId: params.conversationId });
      const participant = (owned.data as { participantId?: unknown }).participantId;
      if (typeof participant !== 'string' || !/^\+?[1-9]\d{7,14}$/.test(participant)) invalid('This owned conversation has no verifiable phone destination. Refresh the provider conversation before sending.');
      await assertDestinationConsent({ organizationId: params.organizationId, channel: 'whatsapp', phone: normalizeCrmPhone(`+${participant.replace(/^\+/, '')}`), purpose });
      if (template?.headerMedia || (template?.parameters?.length && template.components?.length)) invalid('For an existing conversation use send-shape components for template media and variables.');
      const components = template ? template.components ?? templateSendComponents(approvedComponents, template.parameters ?? []) : undefined;
      return reservedWhatsAppSend({...params,resource:params.conversationId,fingerprint:[params.text,params.attachments,params.template]},async()=>sentResult(await provider({ method: 'POST', path: `${conversationPath(params.conversationId!)}/messages`, idempotencyKey, retryOnRateLimit: false,
        body: { accountId: params.accountId, message: params.text, attachmentUrl: attachment?.url, attachmentType: attachment?.type, attachmentName: attachment?.name,
          ...(template ? { template: { elements: [{ name: template.name, language: template.language, components }] } } : {}) } })));
    }
    if (!/^\+?[1-9]\d{6,14}$/.test(params.recipient!)) invalid('Recipient must be an international phone number.');
    await assertDestinationConsent({ organizationId: params.organizationId, channel: 'whatsapp', phone: normalizeCrmPhone(`+${params.recipient!.replace(/^\+/, '')}`), purpose });
    if (template?.components?.length) invalid('For a new recipient use template parameters and headerMedia.');
    // Zernio checks the customer-service window and approved template state atomically.
    return reservedWhatsAppSend({...params,resource:params.recipient!,fingerprint:[params.text,params.attachments,params.template]},async()=>sentResult(await provider({ method: 'POST', path: '/inbox/conversations', idempotencyKey, retryOnRateLimit: false,
      body: { accountId: params.accountId, participantId: params.recipient!.replace(/^\+/, ''), message: params.text,
        attachmentUrl: attachment?.url, attachmentType: attachment?.type, attachmentName: attachment?.name,
        templateName: template?.name, templateLanguage: template?.language, templateParams: template?.parameters, headerMedia: template?.headerMedia } })));
  }

  static async listTemplates(params: AccountParams & Omit<GetWhatsAppTemplatesData['query'], 'accountId'>) {
    await ownedAccount(params);
    const result = await provider({ path: '/whatsapp/templates', query: { accountId: params.accountId, name: params.name, language: params.language, status: params.status } });
    if (!Array.isArray(result.templates)) malformed();
    return result;
  }

  static async createTemplate(params: { organizationId: string } & CreateWhatsAppTemplateData['body']) {
    await ownedAccount(params, true);
    if (!/^[a-z][a-z0-9_]*$/.test(params.name) || !params.language || !['AUTHENTICATION', 'MARKETING', 'UTILITY'].includes(params.category)) invalid('Provide a valid template name, language and category.');
    if (!Array.isArray(params.components) || !params.components.length) invalid('Template components are required.');
    const result = await provider({ method: 'POST', path: '/whatsapp/templates', body: { accountId: params.accountId, name: params.name, language: params.language,
      category: params.category, components: params.components, parameter_format: params.parameter_format, message_send_ttl_seconds: params.message_send_ttl_seconds } });
    const template = result.template as { id?: unknown; status?: unknown } | undefined;
    if (typeof template?.id !== 'string' || typeof template.status !== 'string') malformed();
    return result;
  }
}
