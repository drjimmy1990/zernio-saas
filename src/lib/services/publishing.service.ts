import { createHash } from 'node:crypto';
import { zernioClient, ZernioApiException } from '@/lib/zernio/client';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { requireTenantAccounts, type TenantProviderAccount } from '@/lib/auth/tenant-provider';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import type { SocialPlatform } from '@/types/platform';
import { publicMediaUrl, validateInstagramTarget, type PublishingMedia } from '@/lib/publishing/instagram';
import { validateFacebookTarget } from '@/lib/publishing/facebook';

export interface CreateTenantPostInput {
  organizationId: string;
  content: string;
  platforms: Array<{ platform: SocialPlatform; accountId: string; customContent?: string; customMedia?: Media[]; scheduledFor?: string; platformSpecificData?: Record<string, unknown> }>;
  mediaItems?: Media[];
  scheduledFor?: string;
  timezone?: string;
  publishNow?: boolean;
  isDraft?: boolean;
  useProfileQueue?: boolean;
  queueId?: string;
  idempotencyKey?: string;
}
type Media = PublishingMedia;
export type UpdateTenantPostInput = Partial<Omit<CreateTenantPostInput, 'organizationId'>>;
type ProviderPost = Record<string, any>;
const statuses = ['draft', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'cancelled'];
function malformed(): never { throw new ZernioApiException({ status: 502, code: 'invalid_provider_response', error: 'Invalid publishing provider response. Refresh before retrying with the original idempotency key.' }); }
function bad(message: string): never { throw new TenantAccessError(400, message); }
function configured() { if (!zernioClient.isConfigured()) throw new ZernioApiException({ status: 503, code: 'provider_not_configured', error: 'Publishing is not configured.' }); }
function key(org: string, operation: string, value?: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 255) bad('A stable Idempotency-Key of 1–255 characters is required. Reuse it for retries.');
  return `asra3-post-${createHash('sha256').update(JSON.stringify([org, operation, value])).digest('hex')}`;
}
function id(value: unknown): string { if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) bad('A valid provider post ID is required.'); return value; }
function reference(value: any) { return typeof value === 'string' ? value : value?._id; }
function https(value: unknown) { publicMediaUrl(value); }
function media(items: Media[] | undefined) {
  if (items === undefined) return;
  if (!Array.isArray(items)) bad('mediaItems must be an array.');
  for (const item of items) { if (!item || !['image', 'video', 'document'].includes(item.type)) bad('Unsupported media type.'); https(item.url); if (item.instagramThumbnail !== undefined) https(item.instagramThumbnail); if (item.altText !== undefined && typeof item.altText !== 'string') bad('altText must be text.'); }
}
function schedule(value?: string, timezone?: string) {
  if (timezone) { try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { bad('Use a valid IANA timezone.'); } }
  if (value !== undefined && (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.now())) bad('Schedule a future ISO datetime with an explicit timezone offset.');
}
async function scope(org: string) {
  await assertSubServiceAllowed(org, 'publishing'); configured();
  const profileId = await CoreConnectService.ensureTenantProfile(org);
  const { data } = await zernioClient.request<{ accounts?: TenantProviderAccount[] }>({ path: '/accounts', query: { profileId } });
  if (!Array.isArray(data.accounts)) malformed();
  return { profileId, accounts: data.accounts.filter(account => reference(account.profileId) === profileId) };
}
function assertPost(post: ProviderPost, tenant: Awaited<ReturnType<typeof scope>>, expectedId?: string) {
  if (!post || typeof post !== 'object' || typeof post._id !== 'string' || !/^[a-f0-9]{24}$/i.test(post._id) || !statuses.includes(post.status) || !Array.isArray(post.platforms)) malformed();
  if (expectedId && post._id !== expectedId) malformed();
  if (post.platforms.some((target: ProviderPost) => !target || !['pending', 'processing', 'uploading', 'published', 'failed', 'cancelled'].includes(target.status))) malformed();
  if (!post.platforms.length || post.platforms.some((target: ProviderPost) => !tenant.accounts.some(account => account._id === reference(target.accountId) && account.platform === target.platform)) || (post.queuedFromProfile && reference(post.queuedFromProfile) !== tenant.profileId)) throw new TenantAccessError(403, 'This post is not owned by your workspace.');
  return post;
}
async function postPreflight(input: { content?: string; mediaItems?: Media[]; platforms?: CreateTenantPostInput['platforms'] }): Promise<ProviderPost & { httpStatus: number }> {
  const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: '/tools/validate/post', body: { content: input.content, mediaItems: input.mediaItems, platforms: input.platforms?.map(target => storedTarget(target)) } });
  if (!data || typeof data !== 'object' || typeof data.valid !== 'boolean') malformed(); return { ...data, httpStatus: status };
}
async function mediaPreflight(url: string): Promise<ProviderPost & { httpStatus: number }> {
  https(url); const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: '/tools/validate/media', body: { url } });
  if (!data || typeof data !== 'object' || typeof data.valid !== 'boolean' || (data.valid && (data.url !== url || !['image','video','unknown'].includes(data.type) || typeof data.contentType !== 'string'))) malformed();
  return { ...data, httpStatus: status };
}
async function publishingQuota(accountId: string): Promise<ProviderPost & { httpStatus: number }> {
  const { data, status } = await zernioClient.request<ProviderPost>({ path: `/accounts/${encodeURIComponent(accountId)}/instagram/publishing-limit` });
  if (!data || typeof data !== 'object' || !Number.isSafeInteger(data.quotaUsage) || data.quotaUsage < 0 || !Number.isSafeInteger(data.quotaTotal) || data.quotaTotal < 1 || !Number.isSafeInteger(data.quotaDurationSeconds) || data.quotaDurationSeconds < 1) malformed();
  return { ...data, httpStatus: status };
}
async function ownedPreflightAccount(organizationId: string, accountId: string, instagramOnly = false) {
  const policy = await assertSubServiceAllowed(organizationId, 'publishing'); configured(); const [account] = await requireTenantAccounts(organizationId, [accountId]);
  if (!(instagramOnly ? ['instagram'] : ['facebook','instagram']).includes(account.platform)) bad('Select a supported connected publishing account.');
  if (!policy.allowedPlatforms.includes(account.platform as SocialPlatform)) throw new TenantAccessError(403, 'Publishing on this platform is disabled.');
  if (!account.isActive || account.needsReconnection || (account as TenantProviderAccount & { enabled?: boolean }).enabled === false) throw new TenantAccessError(409, 'Activate or reconnect this account before publishing.'); return account;
}
function storedTarget(target: ProviderPost) {
  return { platform: target.platform as SocialPlatform, accountId: reference(target.accountId), ...(target.customContent !== undefined ? { customContent: target.customContent } : {}), ...(target.customMedia !== undefined ? { customMedia: target.customMedia } : {}), ...(target.platformSpecificData !== undefined ? { platformSpecificData: target.platformSpecificData } : {}) };
}
function serializeTarget(target: CreateTenantPostInput['platforms'][number]) {
  return { platform: target.platform, accountId: target.accountId,
    ...(target.customContent !== undefined ? { customContent: target.customContent } : {}), ...(target.customMedia !== undefined ? { customMedia: target.customMedia } : {}),
    ...(target.scheduledFor !== undefined ? { scheduledFor: target.scheduledFor } : {}), ...(target.platformSpecificData !== undefined ? { platformSpecificData: target.platformSpecificData } : {}) };
}
function effectiveTargets(incoming: CreateTenantPostInput['platforms'], existing: ProviderPost) {
  return incoming.map(target => {
    if (target.platformSpecificData !== undefined && (!target.platformSpecificData || typeof target.platformSpecificData !== 'object' || Array.isArray(target.platformSpecificData))) bad('platformSpecificData must be an object.');
    const saved = existing.platforms.find((entry: ProviderPost) => reference(entry.accountId) === target.accountId && entry.platform === target.platform);
    if (!saved) return target;
    // Provider preserves omitted settings namespaces; a supplied namespace replaces it whole.
    const settings = { ...(target.platformSpecificData ?? {}) };
    for (const [name, value] of Object.entries(saved.platformSpecificData ?? {})) if (name.endsWith('Settings') && !Object.hasOwn(settings, name)) settings[name] = value;
    return { ...storedTarget(saved), ...(saved.scheduledFor !== undefined ? { scheduledFor: saved.scheduledFor } : {}), ...serializeTarget(target), ...(target.platformSpecificData === undefined ? { platformSpecificData: saved.platformSpecificData } : { platformSpecificData: settings }) };
  });
}
async function body(org: string, input: UpdateTenantPostInput, profileId: string, create: boolean, existing?: ProviderPost, preflight = true) {
  if (input.content !== undefined && typeof input.content !== 'string') bad('content must be text.');
  media(input.mediaItems); schedule(input.scheduledFor, input.timezone);
  for (const field of ['publishNow', 'isDraft', 'useProfileQueue'] as const) if (input[field] !== undefined && typeof input[field] !== 'boolean') bad(`${field} must be boolean.`);
  if ([input.publishNow === true, !!input.scheduledFor, input.useProfileQueue === true, input.isDraft === true].filter(Boolean).length > 1) bad('Choose one of draft, immediate publishing, schedule or queue.');
  if (input.queueId && !input.useProfileQueue) bad('queueId requires useProfileQueue.');
  if (input.queueId) {
    const { data } = await zernioClient.request<{ queues?: Array<{ _id: string }> }>({ path: '/queue/slots', query: { profileId, all: true } });
    if (!Array.isArray(data.queues)) malformed();
    if (!data.queues.some(queue => queue._id === input.queueId)) throw new TenantAccessError(403, 'This queue is not owned by your workspace.');
  }
  if (create && (!Array.isArray(input.platforms) || !input.platforms.length)) bad('Select at least one connected Facebook or Instagram account.');
  if (input.platforms !== undefined) {
    if (!Array.isArray(input.platforms) || !input.platforms.length || input.platforms.some(target => !target || typeof target.accountId !== 'string')) bad('Select a connected Facebook or Instagram account.');
    const policy = await assertSubServiceAllowed(org, 'publishing');
    const accounts = await requireTenantAccounts(org, input.platforms.map(target => target.accountId));
    if (new Set(input.platforms.map(target => target.accountId)).size !== input.platforms.length) bad('Duplicate account targets are not allowed.');
    input.platforms.forEach((target, index) => {
      if (!['facebook', 'instagram'].includes(target.platform)) throw new TenantAccessError(501, 'This publishing phase supports Facebook and Instagram.');
      if (!policy.allowedPlatforms.includes(target.platform)) throw new TenantAccessError(403, 'Publishing on this platform is disabled by your plan or administrator.');
      if (accounts[index].platform !== target.platform) throw new TenantAccessError(403, 'The account does not match the target platform.');
      if (!accounts[index].isActive || accounts[index].needsReconnection) throw new TenantAccessError(409, 'Reconnect this account before publishing.');
      if ((accounts[index] as TenantProviderAccount & { enabled?: boolean }).enabled === false) throw new TenantAccessError(409, 'Activate this connected account before publishing.');
      media(target.customMedia); schedule(target.scheduledFor, input.timezone);
      if (target.customContent !== undefined && typeof target.customContent !== 'string') bad('customContent must be text.');
      if (target.platformSpecificData !== undefined && (!target.platformSpecificData || typeof target.platformSpecificData !== 'object' || Array.isArray(target.platformSpecificData))) bad('platformSpecificData must be an object.');
      // The connected account binds the Page. Do not accept provider routing overrides.
      if (target.platformSpecificData && ('pageId' in target.platformSpecificData ||
        (target.platformSpecificData.facebookSettings && typeof target.platformSpecificData.facebookSettings === 'object' &&
          'pageId' in target.platformSpecificData.facebookSettings))) bad('Select the Facebook Page through accountId; pageId overrides are not supported.');
      if (target.platform === 'instagram') validateInstagramTarget(target, input.content ?? existing?.content, input.mediaItems ?? existing?.mediaItems, accounts[index] as TenantProviderAccount & { metadata?: Record<string, any> });
      if (target.platform === 'facebook') validateFacebookTarget(target, input.mediaItems ?? existing?.mediaItems);
    });
    const instagram = input.platforms.filter(target => target.platform === 'instagram');
    if (instagram.length && preflight) {
      const effective = { content: input.content ?? existing?.content, mediaItems: input.mediaItems ?? existing?.mediaItems, platforms: input.platforms };
      const checked = await postPreflight(effective);
      if (!checked.valid) throw new ZernioApiException({ status: 400, code: 'post_validation_failed', error: 'The provider rejected this post during validation.', details: checked });
      const checks = new Map<string, ProviderPost>();
      for (const target of instagram) {
        const details = validateInstagramTarget(target, effective.content, effective.mediaItems, accounts[input.platforms.indexOf(target)] as TenantProviderAccount & { metadata?: Record<string, any> });
        const urls = [...details.items.map(item => ({ url: item.url, type: item.type })), ...[details.options.instagramThumbnail, details.options.reelCover, ...details.items.map(item => item.instagramThumbnail)].filter(Boolean).map(url => ({ url: url as string, type: 'image' }))];
        for (const item of urls) {
          let check = checks.get(item.url); if (!check) { check = await mediaPreflight(item.url); checks.set(item.url, check); }
          if (!check.valid) throw new ZernioApiException({ status: 400, code: 'media_validation_failed', error: check.error || 'This media is unavailable to the provider.', details: check });
          if (check.type !== item.type || !(item.type === 'image' ? ['image/jpeg','image/png'] : ['video/mp4','video/quicktime']).includes(check.contentType?.split(';')[0]?.trim())) bad('Instagram media must be JPEG/PNG images or MP4/MOV videos, matching the declared type.');
          if (details.options.muteAudio === true && item.type === 'video' && check.size > 200 * 1024 ** 2) bad('Instagram cannot mute videos above 200MB. Mute the file before uploading.');
        }
        if (input.publishNow === true) { const quota = await publishingQuota(target.accountId); if (quota.quotaUsage >= quota.quotaTotal) throw new ZernioApiException({ status: 429, code: 'instagram_publishing_limit', error: 'This Instagram account has reached its current publishing limit.', details: quota }); }
      }
    }
  }
  if (create && !input.content?.trim() && !input.mediaItems?.length && !input.platforms?.every(target => target.customContent?.trim() || target.customMedia?.length)) bad('Add content or media.');
  const result: Record<string, unknown> = {};
  for (const field of ['content', 'mediaItems', 'scheduledFor', 'timezone', 'publishNow', 'isDraft'] as const) if (input[field] !== undefined) result[field] = input[field];
  if (input.platforms) result.platforms = input.platforms.map(serializeTarget);
  if (input.useProfileQueue) { result.queuedFromProfile = profileId; if (input.queueId) result.queueId = input.queueId; }
  if (create && !input.publishNow && !input.scheduledFor && !input.useProfileQueue) result.isDraft = true;
  return result;
}

/** Provider reads are canonical; acceptance never implies platform publication. */
export class PublishingService {
  static async validatePost(input: Omit<CreateTenantPostInput, 'content'> & { content?: string }) {
    const tenant = await scope(input.organizationId);
    await body(input.organizationId, input, tenant.profileId, true, undefined, false);
    return postPreflight(input);
  }
  static async validateMedia(params: { organizationId: string; accountId: string; url: string }) {
    await ownedPreflightAccount(params.organizationId, params.accountId); return mediaPreflight(params.url);
  }
  static async getInstagramPublishingLimit(params: { organizationId: string; accountId: string }) {
    await ownedPreflightAccount(params.organizationId, params.accountId, true); return publishingQuota(params.accountId);
  }
  static async createPost(input: CreateTenantPostInput) {
    const idempotencyKey = key(input.organizationId, 'create', input.idempotencyKey), tenant = await scope(input.organizationId);
    const payload = await body(input.organizationId, input, tenant.profileId, true);
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: '/posts', body: payload, idempotencyKey });
    return { ...data, simulated: false, httpStatus: status, idempotencyKey, post: assertPost(data.post, tenant) };
  }
  static async listTenantPosts(org: string, options: { page?: number; limit?: number; status?: string; accountId?: string } = {}) {
    const tenant = await scope(org), page = options.page ?? 1, limit = options.limit ?? 50;
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) bad('Use page >= 1 and limit between 1 and 100.');
    if (options.status && !statuses.includes(options.status)) bad('Unknown post status.');
    if (options.accountId && !tenant.accounts.some(account => account._id === options.accountId)) throw new TenantAccessError(403, 'This account is not owned by your workspace.');
    const { data, status } = await zernioClient.request<ProviderPost>({ path: '/posts', query: { profileId: tenant.profileId, page, limit, status: options.status, accountId: options.accountId } });
    if (!Array.isArray(data.posts) || !data.pagination || typeof data.pagination !== 'object') malformed();
    let omittedCount = 0;
    const posts = (data.posts as ProviderPost[]).filter(post => {
      try { assertPost(post, tenant); return true; }
      catch (error) {
        if (!(error instanceof TenantAccessError) || error.status !== 403) throw error;
        omittedCount++; return false;
      }
    });
    return { ...data, posts, pagination: data.pagination, omittedCount,
      ...(omittedCount ? { warnings: ['Some provider posts could not be verified against currently connected workspace accounts and were omitted.'] } : {}),
      simulated: false, httpStatus: status };
  }
  static async listPosts(org: string) { return (await this.listTenantPosts(org)).posts; }
  static async getPost(org: string, postId: string) {
    id(postId); const tenant = await scope(org);
    const { data, status } = await zernioClient.request<ProviderPost>({ path: `/posts/${postId}` });
    return { ...data, simulated: false, httpStatus: status, post: assertPost(data.post, tenant, postId) };
  }
  static async updatePost(org: string, postId: string, input: UpdateTenantPostInput) {
    const existing = await this.getPost(org, postId);
    if (['published', 'partial', 'publishing'].includes(existing.post.status)) throw new TenantAccessError(409, 'This operation updates drafts and schedules. Published posts require platform editing.');
    const tenant = await scope(org);
    if (input.platforms !== undefined && (!Array.isArray(input.platforms) || !input.platforms.length || input.platforms.some(target => !target || typeof target.accountId !== 'string'))) bad('Select a connected Facebook or Instagram account.');
    const targets = effectiveTargets(input.platforms ?? existing.post.platforms.map(storedTarget), existing.post);
    const payload = await body(org, { ...input, platforms: targets }, tenant.profileId, false, existing.post);
    // Omitted root platforms stay untouched. Only Settings namespace omission has an
    // explicit provider merge guarantee; carry effective custom overrides when targets are sent.
    if (input.platforms) payload.platforms = input.platforms.map((target, index) => serializeTarget({ ...target,
      customContent: targets[index].customContent, customMedia: targets[index].customMedia, scheduledFor: targets[index].scheduledFor,
      ...(target.platformSpecificData === undefined ? { platformSpecificData: targets[index].platformSpecificData } : {}) }));
    else delete payload.platforms;
    if (input.publishNow || input.scheduledFor || input.useProfileQueue) payload.isDraft = false;
    const idempotencyKey = key(org, `update:${postId}`, input.idempotencyKey);
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'PUT', path: `/posts/${postId}`, body: payload, idempotencyKey });
    return { ...data, simulated: false, httpStatus: status, idempotencyKey, post: assertPost(data.post, tenant, postId) };
  }
  static async deletePost(org: string, postId: string) {
    await this.getPost(org, postId);
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'DELETE', path: `/posts/${postId}` });
    if (typeof data.message !== 'string') malformed();
    return { ...data, simulated: false, httpStatus: status };
  }
  static async retryPost(org: string, postId: string, input: { idempotencyKey?: string }) {
    const existing = await this.getPost(org, postId);
    if (!['failed', 'partial'].includes(existing.post.status)) throw new TenantAccessError(409, 'Only failed or partial posts can be retried.');
    const tenant = await scope(org);
    if (existing.post.platforms.some((target: ProviderPost) => ['pending','processing','uploading'].includes(target.status))) throw new TenantAccessError(409, 'Publishing is still in progress. Refresh the post before retrying.');
    const failed = existing.post.platforms.filter((target: ProviderPost) => target.status === 'failed').map(storedTarget);
    if (!failed.length) throw new TenantAccessError(409, 'This post has no failed targets to retry.');
    await body(org, { content: existing.post.content, mediaItems: existing.post.mediaItems, platforms: failed, publishNow: true }, tenant.profileId, false);
    const idempotencyKey = key(org, `retry:${postId}`, input.idempotencyKey);
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: `/posts/${postId}/retry`, idempotencyKey });
    return { ...data, simulated: false, httpStatus: status, idempotencyKey, post: assertPost(data.post, tenant, postId) };
  }
  static async upsertProfileQueue(params: { organizationId: string; name: string; timezone: string; slots: Array<{ dayOfWeek: number; time: string }> }) {
    const tenant = await scope(params.organizationId); schedule(undefined, params.timezone);
    if (typeof params.name !== 'string' || !params.name.trim() || typeof params.timezone !== 'string' || !params.timezone || !Array.isArray(params.slots) || !params.slots.length || params.slots.some(slot => !slot || !Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time))) bad('Provide a queue name and valid weekday/time slots.');
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: '/queue/slots', body: { profileId: tenant.profileId, name: params.name, timezone: params.timezone, slots: params.slots } });
    if (!data.schedule || reference(data.schedule.profileId) !== tenant.profileId || typeof data.schedule._id !== 'string') malformed();
    return { ...data, simulated: false, httpStatus: status };
  }
  static async createMediaPresignedUpload(params: { organizationId: string; filename: string; contentType: string; size?: number }) {
    await assertSubServiceAllowed(params.organizationId, 'publishing'); configured();
    if (typeof params.filename !== 'string' || !params.filename || params.filename.length > 255 || /[\\/\x00-\x1f]/.test(params.filename)) bad('Provide a safe filename.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'application/pdf'].includes(params.contentType)) bad('Unsupported upload content type.');
    if (params.size !== undefined && (!Number.isSafeInteger(params.size) || params.size < 1 || params.size > 5 * 1024 ** 3)) bad('Upload size must be between 1 byte and 5GB.');
    const { data, status } = await zernioClient.request<ProviderPost>({ method: 'POST', path: '/media/presign', body: { filename: params.filename, contentType: params.contentType, ...(params.size !== undefined ? { size: params.size } : {}) } });
    if (typeof data.uploadUrl !== 'string' || typeof data.publicUrl !== 'string' || !Number.isFinite(data.expiresIn)) malformed();
    try { https(data.uploadUrl); https(data.publicUrl); } catch { malformed(); }
    return { ...data, provider: 'zernio-presign', simulated: false, httpStatus: status, uploadUrl: data.uploadUrl as string, publicUrl: data.publicUrl as string, expiresIn: data.expiresIn as number };
  }
}
