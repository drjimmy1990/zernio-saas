import { PublishingService } from '@/lib/services/publishing.service';
import { CoreConnectService } from '@/lib/services/core-connect.service';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ZernioApiException } from '@/lib/zernio/client';

export async function runPublishingAction(organizationId: string, action: string, input: Record<string, any>) {
  switch (action) {
    case 'accounts': return { ...await CoreConnectService.listTenantAccountsWithHealth(organizationId), httpStatus: 200 };
    case 'posts': return PublishingService.listTenantPosts(organizationId, { page: input.page == null ? undefined : Number(input.page), limit: input.limit == null ? undefined : Number(input.limit), status: input.status, accountId: input.accountId });
    case 'post': return PublishingService.getPost(organizationId, input.postId);
    case 'instagram_limit': return PublishingService.getInstagramPublishingLimit({ organizationId, accountId: input.accountId });
    case 'validate_post': return PublishingService.validatePost({ organizationId, content: input.content, mediaItems: input.mediaItems, platforms: input.platforms, tiktokSettings: input.tiktokSettings });
    case 'tiktok_creator_info': return PublishingService.getTikTokCreatorInfo({ organizationId, accountId: input.accountId, mediaType: input.mediaType });
    case 'validate_tiktok': return PublishingService.validateTikTokPost({ organizationId, accountId: input.accountId, content: input.content, mediaItems: input.mediaItems, tiktokSettings: input.tiktokSettings });
    case 'validate_media': return PublishingService.validateMedia({ organizationId, accountId: input.accountId, url: input.url });
    case 'create': return PublishingService.createPost({ organizationId, content: input.content, platforms: input.platforms,
      mediaItems: input.mediaItems, scheduledFor: input.scheduledFor, timezone: input.timezone, publishNow: input.publishNow,
      useProfileQueue: input.useProfileQueue, queueId: input.queueId, isDraft: input.isDraft, idempotencyKey: input.idempotencyKey, tiktokSettings: input.tiktokSettings });
    case 'update': return PublishingService.updatePost(organizationId, input.postId, { content: input.content, platforms: input.platforms,
      mediaItems: input.mediaItems, scheduledFor: input.scheduledFor, timezone: input.timezone, publishNow: input.publishNow,
      useProfileQueue: input.useProfileQueue, queueId: input.queueId, isDraft: input.isDraft, idempotencyKey: input.idempotencyKey, tiktokSettings: input.tiktokSettings });
    case 'delete': return PublishingService.deletePost(organizationId, input.postId);
    case 'retry': return PublishingService.retryPost(organizationId, input.postId, { idempotencyKey: input.idempotencyKey });
    case 'presign': return PublishingService.createMediaPresignedUpload({ organizationId, filename: input.filename, contentType: input.contentType, size: input.size });
    case 'create_queue': return PublishingService.upsertProfileQueue({ organizationId, name: input.name, timezone: input.timezone, slots: input.slots });
    default: throw new TenantAccessError(501, 'This publishing operation is not implemented.');
  }
}

export function publishingError(error: unknown) {
  const provider = error instanceof ZernioApiException ? error.envelope : null;
  return { status: error instanceof TenantAccessError ? error.status : provider?.status || 503,
    payload: { success: false, error: { code: provider?.code || (error instanceof TenantAccessError ? 'access_denied' : 'publishing_unavailable'),
      message: error instanceof Error ? error.message : 'Publishing is unavailable.',
      ...(provider?.details ? { details: provider.details } : {}), ...(provider?.requestId ? { requestId: provider.requestId } : {}),
      ...(provider?.platformError ? { platformError: provider.platformError } : {}),
      ...(provider?.retryAfterSeconds != null ? { retryAfterSeconds: provider.retryAfterSeconds } : {}) } } };
}

export function isPublishingPath(path: string[]) {
  return path[0] === 'posts' || path[0] === 'queue' || (path[0] === 'media' && path[1] === 'presign') ||
    (path[0] === 'accounts' && path.length === 4 && path[2] === 'instagram' && path[3] === 'publishing-limit') ||
    (path[0] === 'accounts' && path.length === 4 && path[2] === 'tiktok' && path[3] === 'creator-info') ||
    (path[0] === 'validate' && ['post', 'media'].includes(path[1]));
}

export async function runPublishingPublicApi(organizationId: string, method: string, path: string[], input: Record<string, any>) {
  let action = '';
  if (path[0] === 'posts') {
    if (path.length === 1) action = method === 'GET' ? 'posts' : method === 'POST' ? 'create' : '';
    if (path[1] && path[1] !== 'sync-external') {
      input = { ...input, postId: path[1] };
      if (path.length === 2) action = method === 'GET' ? 'post' : ['PUT', 'PATCH'].includes(method) ? 'update' : method === 'DELETE' ? 'delete' : '';
      if (path.length === 3 && path[2] === 'retry' && method === 'POST') action = 'retry';
    }
  }
  if (method === 'POST' && path.join('/') === 'media/presign') action = 'presign';
  if (method === 'POST' && path.length === 2 && path[0] === 'validate') action = path[1] === 'post' ? 'validate_post' : path[1] === 'media' ? 'validate_media' : '';
  if (method === 'GET' && path[0] === 'accounts' && path.length === 4 && path[2] === 'instagram' && path[3] === 'publishing-limit') {
    action = 'instagram_limit'; input = { ...input, accountId: path[1] };
  }
  if (method === 'GET' && path[0] === 'accounts' && path.length === 4 && path[2] === 'tiktok' && path[3] === 'creator-info') {
    action = 'tiktok_creator_info'; input = { ...input, accountId: path[1] };
  }
  if (method === 'POST' && ['queue', 'queue/slots'].includes(path.join('/'))) action = 'create_queue';
  if (!action) throw new TenantAccessError(501, 'This publishing operation is not implemented.');
  return runPublishingAction(organizationId, action, input);
}
