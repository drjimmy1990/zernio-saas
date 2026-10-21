import { TenantAccessError } from '@/lib/auth/tenant-access';
import type { PublishingMedia } from './instagram';

type FacebookTarget = { customContent?: string; customMedia?: PublishingMedia[]; platformSpecificData?: Record<string, any> };

/** Facebook's documented media shape; file accessibility and dimensions remain provider checks. */
export function validateFacebookTarget(target: FacebookTarget, rootMedia: PublishingMedia[] | undefined) {
  const items = target.customMedia !== undefined ? target.customMedia : rootMedia ?? [];
  const contentType = target.platformSpecificData?.contentType;
  if (items.some(item => !['image', 'video'].includes(item.type))) throw new TenantAccessError(400, 'Facebook supports images or video; documents are unsupported.');
  if (items.length > 10 || items.some(item => item.type === 'video') && (items.length !== 1 || items[0].type !== 'video')) throw new TenantAccessError(400, 'Facebook supports up to 10 images or one video per post; images and videos cannot be mixed.');
  if (contentType !== undefined && !['story', 'reel'].includes(contentType)) throw new TenantAccessError(400, 'Facebook contentType supports story or reel; omit it for feed posts.');
  if (contentType === 'story' && items.length !== 1) throw new TenantAccessError(400, 'Facebook Stories require exactly one image or video.');
  if (contentType === 'reel' && (items.length !== 1 || items[0].type !== 'video')) throw new TenantAccessError(400, 'Facebook Reels require exactly one video.');
}
