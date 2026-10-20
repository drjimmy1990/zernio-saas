import { createHash } from 'node:crypto';
import { requireTenantAccounts } from '@/lib/auth/tenant-provider';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';

export type MetaCommentsAccount = { organizationId: string; accountId: string };
export type MetaCommentsPost = MetaCommentsAccount & { postId: string };
export type MetaCommentsTarget = MetaCommentsPost & { commentId: string };
export type MetaCommentsPage = { cursor?: string; limit?: number };
export type MetaCommentsSend = MetaCommentsTarget & { text?: string; idempotencyKey?: string };
type Result = Record<string, any> & { httpStatus: number };
const MAX_VERIFICATION_PAGES = 25;
function invalid(error: string): never { throw new ZernioApiException({ status: 400, code: 'invalid_request', error }); }
function malformed(): never { throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'The provider response is incomplete. Refresh the post and conversation before another action.' }); }
function notFound(kind: 'post' | 'comment'): never { throw new ZernioApiException({ status: 404, code: `${kind}_not_found`, error: `${kind === 'post' ? 'Post' : 'Comment'} not found on this account and post. Hidden Instagram comments may be unavailable through Facebook Login.` }); }
function segment(value: string) {
 if (typeof value !== 'string' || !value.trim() || value === '.' || value === '..' || /[\u0000-\u001f\u007f]/.test(value)) invalid('Select a valid provider resource ID.');
 return encodeURIComponent(value);
}
function postPath(postId: string) { return `/inbox/comments/${segment(postId)}`; }
function page(params: MetaCommentsPage) {
 if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)) invalid('Limit must be between 1 and 100.');
 if (params.cursor !== undefined && typeof params.cursor !== 'string') invalid('Cursor must be a string.');
 return { cursor: params.cursor, limit: params.limit };
}
async function owned(params: MetaCommentsAccount, mutation = false) {
 const policy = await assertSubServiceAllowed(params.organizationId, 'inbox_crm');
 const [account] = await requireTenantAccounts(params.organizationId, [params.accountId]);
 if (!['facebook', 'instagram'].includes(account.platform)) invalid('Select a Facebook Page or Instagram professional account.');
 if (!policy.allowedPlatforms.includes(account.platform as 'facebook' | 'instagram')) throw new ZernioApiException({ status: 403, code: 'platform_disabled', error: 'This platform is disabled by your plan or administrator.' });
 if (mutation && (!account.isActive || account.needsReconnection)) throw new ZernioApiException({ status: 409, code: 'account_reconnection_required', error: 'Reconnect this account before moderating or replying.' });
 return account;
}
async function provider(options: Parameters<typeof zernioClient.request>[0], operation?: 'reply' | 'private'): Promise<Result> {
 try {
  // Private replies are one-shot; even short 429s may carry consumed evidence.
  const response = await zernioClient.request<Record<string, any>>({ ...options, ...(operation === 'private' ? { retryOnRateLimit: false } : {}) });
  const data = response.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) malformed();
  if (data.error || data.success === false) throw new ZernioApiException({ ...data, status: response.status >= 400 ? response.status : 502, error: typeof data.error === 'string' ? data.error : 'Provider action failed.' });
  return { ...data, httpStatus: response.status };
 } catch (error) {
  if (error instanceof ZernioApiException && operation) {
   const envelope = error.envelope, consumed = envelope.details?.privateReplyConsumed === true;
   const unknown = !consumed && (envelope.status >= 500 || envelope.details?.privateReplyOutcome === 'unknown');
   if (consumed || unknown) throw new ZernioApiException({ ...envelope, details: { ...envelope.details, ...(consumed ? { retryAllowed: false } : { outcome: 'unknown', reconcileBeforeRetry: true, ...(operation === 'private' ? { privateReplyOutcome: 'unknown', retryAllowed: false } : {}) }) } });
  }
  throw error;
 }
}
function key(params: MetaCommentsSend, operation: string) {
 if (typeof params.idempotencyKey !== 'string' || !params.idempotencyKey.trim() || params.idempotencyKey.length > 200) invalid('A stable idempotencyKey of up to 200 characters is required.');
 return `asra3-comments-${createHash('sha256').update(JSON.stringify([params.organizationId, params.accountId, params.postId, params.commentId, operation, params.idempotencyKey])).digest('hex')}`;
}
function text(params: MetaCommentsSend) { if (typeof params.text !== 'string' || !params.text.trim()) invalid('Review a plain text reply before sending.'); return params.text; }
function postsIdentity(result: Result, params: MetaCommentsAccount, platform: string) {
 if (!Array.isArray(result.data)) malformed();
 for (const row of result.data) { if (!row || typeof row.id !== 'string' || !row.id) malformed(); if (row.accountId !== params.accountId || row.platform !== platform || row.isAd === true) notFound('post'); }
}
function commentsIdentity(result: Result, params: MetaCommentsPost & { commentId?: string }, platform: string) {
 if (!Array.isArray(result.comments)) malformed();
 if (result.meta?.accountId !== params.accountId || result.meta?.platform !== platform || result.meta?.postId !== params.postId) notFound('post');
 if (result.post && result.post.id !== params.postId) notFound('post');
 if (params.commentId && result.comment?.id !== params.commentId) notFound('comment');
 const check = (rows: any[], parentId?: string) => { for (const row of rows) {
  if (!row || typeof row.id !== 'string' || !row.id) malformed();
  if ((row.platform !== undefined && row.platform !== platform) || (row.accountId !== undefined && row.accountId !== params.accountId) || (row.postId !== undefined && row.postId !== params.postId) || (row.parentId !== undefined && row.parentId !== null && row.parentId !== parentId)) notFound('comment');
  if (row.replies !== undefined) { if (!Array.isArray(row.replies)) malformed(); check(row.replies, row.id); }
 } }; check(result.comments, params.commentId);
}
function next(result: Result, field: 'nextCursor' | 'cursor') {
 if (result.pagination?.hasMore !== true) return undefined;
 const cursor = result.pagination?.[field]; if (typeof cursor !== 'string' || !cursor) malformed(); return cursor;
}
function incomplete(): never { throw new ZernioApiException({ status: 503, code: 'ownership_verification_incomplete', error: 'The provider returned too many pages to verify this resource. No action was sent; select a more recent post.' }); }
async function ownedPost(params: MetaCommentsPost, account: Awaited<ReturnType<typeof owned>>) {
 postPath(params.postId);
 const profileId = typeof account.profileId === 'string' ? account.profileId : account.profileId._id;
 const seen = new Set<string>(); let cursor: string | undefined;
 for (let index = 0; index < MAX_VERIFICATION_PAGES; index++) {
  const result = await provider({ path: '/inbox/comments', query: { accountId: params.accountId, profileId, platform: account.platform, limit: 100, minComments: 0, sortBy: 'date', sortOrder: 'desc', cursor } });
  postsIdentity(result, params, account.platform);
  if (result.data.some((row: any) => row.id === params.postId)) return;
  if (result.meta?.failedAccounts?.some((row: any) => row.accountId === params.accountId) || result.meta?.accountsSkipped?.some((row: any) => row.accountId === params.accountId)) throw new ZernioApiException({ status: 503, code: 'ownership_verification_incomplete', error: 'The provider could not list this account’s posts. No action was sent.', details: { providerHttpStatus: result.httpStatus, meta: result.meta } });
  cursor = next(result, 'nextCursor'); if (!cursor) notFound('post'); if (seen.has(cursor)) malformed(); seen.add(cursor);
 }
 incomplete();
}
async function commentsPage(params: MetaCommentsPost & MetaCommentsPage & { commentId?: string }, platform: string) {
 const result = await provider({ path: postPath(params.postId), query: { accountId: params.accountId, ...page(params), commentId: params.commentId } });
 commentsIdentity(result, params, platform); return result;
}
async function ownedComment(params: MetaCommentsTarget, account: Awaited<ReturnType<typeof owned>>) {
 segment(params.commentId); await ownedPost(params, account);
 let pages = 0;
 const walk = async (parentId?: string): Promise<any> => {
  const seen = new Set<string>(); let cursor: string | undefined;
  do {
   if (++pages > MAX_VERIFICATION_PAGES) incomplete();
   const result = await commentsPage({ ...params, commentId: parentId, cursor, limit: 100 }, account.platform);
   if (parentId && result.comment?.id !== parentId) notFound('comment');
   for (const row of result.comments) {
    if (parentId && row.parentId !== parentId) notFound('comment');
    const find = (entry: any): any => entry.id === params.commentId ? entry : (entry.replies ?? []).map(find).find(Boolean);
    const found = find(row); if (found) return found;
    if (!parentId && (row.repliesHasMore === true || row.replyCount > (row.replies?.length ?? 0))) { const reply = await walk(row.id); if (reply) return reply; }
   }
   cursor = next(result, 'cursor'); if (cursor && seen.has(cursor)) malformed(); if (cursor) seen.add(cursor);
  } while (cursor);
 };
 const comment = await walk(); if (!comment) notFound('comment'); return comment;
}

/** Owned organic posts only. Provider permissions and private-reply eligibility remain authoritative. */
export class MetaCommentsService {
 static async listAccounts(organizationId: string) {
  const policy = await assertSubServiceAllowed(organizationId, 'inbox_crm'), profileId = await CoreConnectService.ensureTenantProfile(organizationId);
  const result = await provider({ path: '/accounts', query: { profileId } }); if (!Array.isArray(result.accounts)) malformed();
  return { ...result, profileId, accounts: result.accounts.filter((a: any) => ['facebook', 'instagram'].includes(a.platform) && policy.allowedPlatforms.includes(a.platform) && (typeof a.profileId === 'string' ? a.profileId : a.profileId?._id) === profileId).map((a: any) => ({ _id: a._id, accountId: a._id, platform: a.platform, username: a.username, displayName: a.displayName, isActive: a.isActive, needsReconnection: a.needsReconnection, loginMethod: a.platform === 'instagram' ? (a.metadata?.loginMethod === 'facebook_login' ? 'facebook_login' : 'instagram_login') : undefined })) };
 }
 static async listPosts(params: MetaCommentsAccount & MetaCommentsPage & { since?: string; minComments?: number }) {
  const account = await owned(params), profileId = typeof account.profileId === 'string' ? account.profileId : account.profileId._id;
  if (params.since !== undefined && (typeof params.since !== 'string' || !Number.isFinite(Date.parse(params.since)))) invalid('since must be a valid date.');
  if (params.minComments !== undefined && (!Number.isInteger(params.minComments) || params.minComments < 0)) invalid('minComments must be a non-negative integer.');
  const result = await provider({ path: '/inbox/comments', query: { ...page(params), accountId: params.accountId, profileId, platform: account.platform, since: params.since, minComments: params.minComments ?? 0, sortBy: 'date', sortOrder: 'desc' } }); postsIdentity(result, params, account.platform); return result;
 }
 static async listComments(params: MetaCommentsPost & MetaCommentsPage & { commentId?: string }) {
  const account = await owned(params); if (params.commentId) await ownedComment(params as MetaCommentsTarget, account); else await ownedPost(params, account);
  return commentsPage(params, account.platform);
 }
 static async reply(params: MetaCommentsSend) {
  const message = text(params), idempotencyKey = key(params, 'reply'), account = await owned(params, true); const comment = await ownedComment(params, account);
  if (comment.canReply === false) throw new ZernioApiException({ status: 403, code: 'comment_reply_not_allowed', error: 'The provider does not permit replying to this comment.' });
  const result = await provider({ method: 'POST', path: postPath(params.postId), idempotencyKey, body: { accountId: params.accountId, commentId: params.commentId, message } }, 'reply');
  if (result.success !== true || typeof result.data?.commentId !== 'string' || !result.data.commentId) throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'Reply outcome unknown. Review the comments before retrying.', details: { outcome: 'unknown', reconcileBeforeRetry: true } }); return result;
 }
 static async privateReply(params: MetaCommentsSend) {
  const extra = params as MetaCommentsSend & Record<string, unknown>; if (extra.buttons !== undefined || extra.quickReplies !== undefined || extra.attachments !== undefined || extra.attachmentUrl !== undefined) invalid('Private replies support plain text only.');
  const message = text(params), idempotencyKey = key(params, 'private'), account = await owned(params, true), comment = await ownedComment(params, account);
  if (comment.createdTime) { const created = Date.parse(comment.createdTime); if (!Number.isFinite(created)) malformed(); if (Date.now() - created > 7 * 24 * 60 * 60 * 1000) throw new ZernioApiException({ status: 400, code: 'private_reply_window_closed', error: 'Private replies must be sent within seven days of the comment.' }); }
  // The SDK documents no replay guarantee for this endpoint; this key identifies intent only.
  const result = await provider({ method: 'POST', path: `${postPath(params.postId)}/${segment(params.commentId)}/private-reply`, idempotencyKey, body: { accountId: params.accountId, message } }, 'private');
  if (typeof result.messageId !== 'string' || !result.messageId || result.commentId !== params.commentId || result.platform !== account.platform) throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'Private reply outcome unknown. Review the conversation before another action.', details: { privateReplyOutcome: 'unknown', retryAllowed: false, reconcileBeforeRetry: true } }); return result;
 }
 static async hide(params: MetaCommentsTarget & { hidden: boolean }) {
  if (typeof params.hidden !== 'boolean') invalid('Specify whether to hide or unhide.'); const account = await owned(params, true), comment = await ownedComment(params, account);
  if (comment.canHide === false) throw new ZernioApiException({ status: 403, code: 'comment_hide_not_allowed', error: 'The provider does not permit hiding this comment.' });
  const result = await provider({ method: params.hidden ? 'POST' : 'DELETE', path: `${postPath(params.postId)}/${segment(params.commentId)}/hide`, ...(params.hidden ? { body: { accountId: params.accountId } } : { query: { accountId: params.accountId } }) });
  if (result.commentId !== params.commentId || result.hidden !== params.hidden || result.platform !== account.platform || typeof result.status !== 'string') malformed(); return result;
 }
 static async deleteComment(params: MetaCommentsTarget) {
  const account = await owned(params, true), comment = await ownedComment(params, account); if (comment.canDelete === false) throw new ZernioApiException({ status: 403, code: 'comment_delete_not_allowed', error: 'The provider does not permit deleting this comment.' });
  const result = await provider({ method: 'DELETE', path: postPath(params.postId), query: { accountId: params.accountId, commentId: params.commentId } }); if (result.success !== true) malformed(); return result;
 }
}
