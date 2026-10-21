import { TenantAccessError } from '@/lib/auth/tenant-access';

export type PublishingMedia = { type: 'image' | 'video' | 'document'; url: string; altText?: string; instagramThumbnail?: string };
export type InstagramTarget = { platform: string; customContent?: string; customMedia?: PublishingMedia[]; platformSpecificData?: Record<string, any> };
function bad(message: string): never { throw new TenantAccessError(400, message); }

/** Local syntax checks only. The provider performs DNS, redirects and actual accessibility checks. */
export function publicMediaUrl(value: unknown) {
 if (typeof value !== 'string') bad('Media must use public HTTPS URLs.');
 let url: URL; try { url = new URL(value); } catch { bad('Media must use public HTTPS URLs.'); }
 const host = url!.hostname.toLowerCase().replace(/\.$/, ''), literal = host.replace(/^\[|\]$/g, '');
 if (url!.protocol !== 'https:' || url!.username || url!.password || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') && !host.includes(':') || /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(host) || host === '255.255.255.255' || literal.includes(':') && /^(?:::|fc|fd|fe[89ab]|::ffff:)/i.test(literal)) bad('Media must use a public HTTPS URL without credentials or a local address.');
}
function boolean(value: unknown, field: string) { if (value !== undefined && typeof value !== 'boolean') bad(`${field} must be boolean.`); }
function text(value: unknown, field: string) { if (typeof value !== 'string' || !value.trim()) bad(`${field} must be nonempty text.`); }
function strings(value: unknown, field: string, max: number) { if (!Array.isArray(value) || !value.length || value.length > max || value.some(item => typeof item !== 'string' || !item.trim())) bad(`${field} must contain 1–${max} nonempty values.`); }

/** @zernio/node InstagramPlatformData (types.gen.ts:7798–7911), not a new contentType dialect. */
export function validateInstagramTarget(target: InstagramTarget, content: string | undefined, rootMedia: PublishingMedia[] | undefined, account: { metadata?: Record<string, any> }) {
 const items = target.customMedia !== undefined ? target.customMedia : rootMedia ?? [], caption = target.customContent !== undefined ? target.customContent : content ?? '';
 if (!items.length || items.length > 10 || items.some(item => !['image', 'video'].includes(item.type))) bad('Instagram requires 1–10 image or video items; documents are unsupported.');
 if ([...caption].length > 2200) bad('Instagram captions must be at most 2,200 characters.');
 const options = target.platformSpecificData ?? {};
 const allowed = ['contentType','shareToFeed','collaborators','firstComment','trialParams','userTags','audioName','audioConfiguration','muteAudio','thumbOffset','instagramThumbnail','reelCover','isAiGenerated','isPaidPartnership','brandedContentSponsors','commentsEnabled','locationId'];
 if (Object.keys(options).some(key => !allowed.includes(key))) bad('Unsupported Instagram publishing fields. Select the connected account through accountId.');
 if (options.contentType !== undefined && options.contentType !== 'story') bad('Instagram contentType supports story only. A single video is a Reel; omit contentType for feed and carousel posts.');
 const story = options.contentType === 'story', reel = !story && items.length === 1 && items[0].type === 'video';
 if (story && items.length !== 1) bad('Instagram Stories require exactly one image or video.');
 for (const field of ['shareToFeed','muteAudio','isAiGenerated','isPaidPartnership','commentsEnabled']) boolean(options[field], field);
 for (const field of ['shareToFeed','trialParams','audioName','audioConfiguration','thumbOffset','instagramThumbnail','reelCover']) if (options[field] !== undefined && !reel) bad(`${field} requires a single-video Reel.`);
 if (options.collaborators !== undefined) { strings(options.collaborators, 'collaborators', 3); if (story) bad('Stories do not support collaborators.'); }
 if (options.firstComment !== undefined) { text(options.firstComment, 'firstComment'); if (story) bad('Stories do not support first comments.'); }
 if (options.trialParams !== undefined && (!options.trialParams || typeof options.trialParams !== 'object' || Array.isArray(options.trialParams) || Object.keys(options.trialParams).some(key => key !== 'graduationStrategy') || options.trialParams.graduationStrategy !== undefined && !['MANUAL','SS_PERFORMANCE'].includes(options.trialParams.graduationStrategy))) bad('Use a supported Trial Reel graduation strategy.');
 if (options.thumbOffset !== undefined && (!Number.isFinite(options.thumbOffset) || options.thumbOffset < 0)) bad('thumbOffset must be nonnegative milliseconds.');
 for (const field of ['instagramThumbnail','reelCover']) if (options[field] !== undefined) publicMediaUrl(options[field]);
 if (options.audioName !== undefined) text(options.audioName, 'audioName');
 if (options.audioConfiguration !== undefined) {
  const audio = options.audioConfiguration;
  if (!audio || typeof audio !== 'object' || Array.isArray(audio) || Object.keys(audio).some(key => !['audioId','audioVolume','videoVolume'].includes(key))) bad('Invalid audioConfiguration.');
  text(audio.audioId, 'audioId');
  for (const field of ['audioVolume','videoVolume']) if (audio[field] !== undefined && (!Number.isInteger(audio[field]) || audio[field] < 0 || audio[field] > 100)) bad(`${field} must be an integer from 0 to 100.`);
  if (account.metadata?.loginMethod !== 'facebook_login') bad('Instagram catalog audio requires reconnecting through Facebook Login.');
 }
 if (options.brandedContentSponsors !== undefined) strings(options.brandedContentSponsors, 'brandedContentSponsors', 2);
 if (options.isPaidPartnership === true || options.brandedContentSponsors !== undefined) { if (story) bad('Stories do not support paid partnerships.'); if (account.metadata?.loginMethod !== 'facebook_login') bad('Instagram paid partnerships require reconnecting through Facebook Login.'); }
 if (options.locationId !== undefined && (typeof options.locationId !== 'string' || !/^\d+$/.test(options.locationId) || story)) bad('locationId must be a numeric Facebook location Page ID and is unavailable for Stories.');
 if (options.userTags !== undefined) {
  if (!Array.isArray(options.userTags)) bad('userTags must be an array.');
  for (const tag of options.userTags) {
   if (!tag || typeof tag !== 'object' || Object.keys(tag).some(key => !['username','x','y','mediaIndex'].includes(key))) bad('Invalid Instagram user tag.'); text(tag.username, 'Tag username');
   const index = tag.mediaIndex ?? 0; if (!Number.isInteger(index) || index < 0 || index >= items.length) bad('Tag mediaIndex must identify an existing media item.');
   for (const coordinate of ['x','y']) if (tag[coordinate] !== undefined && (!Number.isFinite(tag[coordinate]) || tag[coordinate] < 0 || tag[coordinate] > 1)) bad('Tag coordinates must be between 0 and 1.');
   if (!story && items[index].type === 'image' && (tag.x === undefined || tag.y === undefined)) bad('Photo tags require x and y coordinates.');
  }
 }
 return { items, caption, story, reel, options };
}
