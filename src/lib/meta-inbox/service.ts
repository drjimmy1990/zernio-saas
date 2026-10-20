import { createHash } from 'node:crypto';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';

type AccountParams = { organizationId: string; accountId: string };
type ConversationParams = AccountParams & { conversationId: string };
export type MetaInboxAttachment = { url: string; type: 'image' | 'video' | 'audio' | 'file'; name?: string };
export type MetaInboxPage = { cursor?: string; limit?: number; sortOrder?: 'asc' | 'desc' };
export type MetaInboxSend = ConversationParams & { text?: string; attachments?: MetaInboxAttachment[]; idempotencyKey?: string; messagingType?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG'; messageTag?: 'CONFIRMED_EVENT_UPDATE' | 'POST_PURCHASE_UPDATE' | 'ACCOUNT_UPDATE' | 'HUMAN_AGENT' };
type Result = Record<string, any> & { httpStatus: number };
function invalid(error: string): never { throw new ZernioApiException({ status: 400, code: 'invalid_request', error }); }
function malformed(): never { throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'The provider response is incomplete. A send may have been accepted; reconcile messages before retrying.', details: { outcome: 'unknown', reconcileBeforeRetry: true } }); }
function path(id: string) { if (typeof id !== 'string' || !id.trim()) invalid('Select an existing customer conversation.'); return `/inbox/conversations/${encodeURIComponent(id)}`; }
function page(options: MetaInboxPage) {
 if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)) invalid('Limit must be between 1 and 100.');
 if (options.cursor !== undefined && typeof options.cursor !== 'string') invalid('Cursor must be a string.');
 if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) invalid('Invalid sort order.');
 return { cursor: options.cursor, limit: options.limit, sortOrder: options.sortOrder };
}
async function owned(params: AccountParams, mutation = false) {
 const policy = await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
 const [account] = await requireTenantAccounts(params.organizationId, [params.accountId]);
 if (!['facebook', 'instagram'].includes(account.platform)) invalid('Select a connected Facebook or Instagram account.');
 if (!policy.allowedPlatforms.includes(account.platform as 'facebook' | 'instagram')) throw new ZernioApiException({ status: 403, code: 'platform_disabled', error: 'This platform is disabled by your plan or administrator.' });
 if (mutation && (!account.isActive || account.needsReconnection)) throw new ZernioApiException({ status: 409, code: 'account_reconnection_required', error: 'Reconnect this account before sending.' });
 return account;
}
async function provider(options: Parameters<typeof zernioClient.request>[0]): Promise<Result> {
 try {
  const { data, status } = await zernioClient.request<Record<string, any>>(options);
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.success === false || data.error) malformed();
  return { ...data, httpStatus: status };
 } catch (error) {
  if (options.method === 'POST' && error instanceof ZernioApiException && error.envelope.status >= 500) throw new ZernioApiException({ ...error.envelope, details: { ...error.envelope.details, outcome: 'unknown', reconcileBeforeRetry: true }, error: `${error.message} Reconcile message history before retrying; a timeout or 5xx does not prove the message was unsent.` });
  throw error;
 }
}
function identity(conversation: any, params: ConversationParams | AccountParams, platform: string) {
 if (!conversation || typeof conversation.id !== 'string' || !conversation.id) malformed();
 if (conversation.accountId !== params.accountId || conversation.platform !== platform || ('conversationId' in params && conversation.id !== params.conversationId)) throw new ZernioApiException({ status: 404, code: 'conversation_not_found', error: 'Conversation not found on this account.' });
}
function sendKey(params: ConversationParams & { idempotencyKey?: string }, operation: string) {
 if (typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim() || params.idempotencyKey.length > 200) invalid('A stable idempotencyKey of up to 200 characters is required.');
 return `asra3-meta-${createHash('sha256').update(JSON.stringify([params.organizationId, params.accountId, params.conversationId, operation, params.idempotencyKey])).digest('hex')}`;
}
function sent(result: Result) { if (typeof result.data?.messageId !== 'string' || !result.data.messageId.trim()) malformed(); return result; }

/** Customer-initiated Meta threads only. Provider window/permissions remain authoritative. */
export class MetaInboxService {
 static async listAccounts(organizationId: string) {
  const policy = await assertSubServiceAllowed(organizationId, 'inbox_crm');
  const profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  const result = await provider({ path: '/accounts', query: { profileId } });
  if (!Array.isArray(result.accounts)) malformed();
  return { ...result, profileId, accounts: result.accounts.filter((a: any) => ['facebook', 'instagram'].includes(a.platform) && policy.allowedPlatforms.includes(a.platform) && (typeof a.profileId === 'string' ? a.profileId : a.profileId?._id) === profileId).map((a: any) => ({ _id: a._id, accountId: a._id, platform: a.platform, username: a.username, displayName: a.displayName, isActive: a.isActive, needsReconnection: a.needsReconnection, loginMethod: a.platform === 'instagram' ? (a.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' : 'instagram_login') : undefined, platformUserId: a.platformUserId })) };
 }
 static async listConversations(params: AccountParams & MetaInboxPage & { folder?: 'inbox' | 'requests'; status?: 'active' | 'archived' }) {
  const account = await owned(params); const profileId = typeof account.profileId === 'string' ? account.profileId : account.profileId._id;
  if (params.folder && !['inbox', 'requests'].includes(params.folder)) invalid('Invalid conversation folder.');
  if (params.status && !['active', 'archived'].includes(params.status)) invalid('Invalid conversation status.');
  if (params.folder === 'requests' && params.cursor) invalid('Message requests do not support cursors.');
  const result = await provider({ path: '/inbox/conversations', query: { ...page(params), accountId: params.accountId, profileId, platform: account.platform, folder: params.folder, status: params.status } });
  if (!Array.isArray(result.data)) malformed(); result.data.forEach((item: any) => identity(item, params, account.platform));
  return result;
 }
 static async getConversation(params: ConversationParams) {
  const account = await owned(params); const result = await provider({ path: path(params.conversationId), query: { accountId: params.accountId } }); identity(result.data, params, account.platform); return result;
 }
 static async listMessages(params: ConversationParams & MetaInboxPage) {
  await this.getConversation(params); const result = await provider({ path: `${path(params.conversationId)}/messages`, query: { ...page(params), accountId: params.accountId } });
  if (!Array.isArray(result.messages) || result.messages.some((m: any) => !m || typeof m.id !== 'string')) malformed(); return result;
 }
 static async markRead(params: ConversationParams) {
  await owned(params, true); await this.getConversation(params); const result = await provider({ method: 'POST', path: `${path(params.conversationId)}/read`, body: { accountId: params.accountId } });
  if (result.success !== true) malformed(); return result;
 }
 static async sendMessage(params: MetaInboxSend) {
  const account = await owned(params, true), idempotencyKey = sendKey(params, 'send');
  if (params.text !== undefined && typeof params.text !== 'string') invalid('Message text must be a string.');
  const attachments = params.attachments ?? []; if (!Array.isArray(attachments) || attachments.length > 1) invalid('Send at most one attachment.');
  const attachment = attachments[0];
  if (attachment) { let url: URL; try { url = new URL(attachment.url); } catch { invalid('Use a public HTTPS attachment URL.'); }
   if (url!.protocol !== 'https:' || url!.username || url!.password || !['image', 'video', 'audio', 'file'].includes(attachment.type)) invalid('Invalid attachment URL or type.'); }
  if (!params.text?.trim() && !attachment) invalid('Add text or an attachment.');
  if (params.messagingType && !['RESPONSE', 'UPDATE', 'MESSAGE_TAG'].includes(params.messagingType)) invalid('Invalid messaging type.');
  if (params.messageTag && (!['CONFIRMED_EVENT_UPDATE', 'POST_PURCHASE_UPDATE', 'ACCOUNT_UPDATE', 'HUMAN_AGENT'].includes(params.messageTag) || (account.platform === 'instagram' && params.messageTag !== 'HUMAN_AGENT'))) invalid('This tag is not supported on the selected platform.');
  if ((params.messageTag && params.messagingType !== 'MESSAGE_TAG') || (params.messagingType === 'MESSAGE_TAG' && !params.messageTag)) invalid('An explicit message tag and MESSAGE_TAG messaging type must be provided together.');
  const conversation = await this.getConversation(params);
  if (conversation.data.threadControl === 'other') throw new ZernioApiException({ status: 409, code: 'not_thread_owner', error: 'Another application controls this thread.' });
  return sent(await provider({ method: 'POST', path: `${path(params.conversationId)}/messages`, idempotencyKey, body: { accountId: params.accountId, message: params.text, attachmentUrl: attachment?.url, attachmentType: attachment?.type, messagingType: params.messagingType, messageTag: params.messageTag } }));
 }
 static async acceptRequest(params: ConversationParams & { text?: string; idempotencyKey?: string }) {
  await owned(params, true); const idempotencyKey = sendKey(params, 'accept');
  if (typeof params.text !== 'string' || !params.text.trim()) invalid('Review a text reply before accepting this message request.');
  await this.getConversation(params);
  return sent(await provider({ method: 'POST', path: `${path(params.conversationId)}/accept`, idempotencyKey, body: { accountId: params.accountId, message: params.text } }));
 }
}
