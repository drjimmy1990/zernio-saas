import { TenantAccessError } from '@/lib/auth/tenant-access';
import { publicMediaUrl, type PublishingMedia } from './instagram';

/**
 * TikTok publishing rules (Zernio docs, "# TikTok"): media is mandatory, one video or
 * 1–35 photos (never mixed), `tiktokSettings` is required on every post, both consent
 * flags must be `true`, and `privacy_level` must be one of the creator-info values.
 * Provider state is never assumed: creator-info is read live before every write.
 */
export const TIKTOK_PRIVACY_LEVELS = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'] as const;
export type TikTokPrivacyLevel = typeof TIKTOK_PRIVACY_LEVELS[number];
export type TikTokMediaKind = 'video' | 'photo';
export type TikTokCommercialType = 'none' | 'brand_organic' | 'brand_content';
export type TikTokInteraction = { enabled: boolean; label?: string } | null;
export interface TikTokCreatorInfo {
  mediaType: TikTokMediaKind;
  creator: { nickname?: string; isVerified?: boolean; canPostMore: boolean };
  privacyLevels: Array<{ value: TikTokPrivacyLevel; label: string }>;
  maxVideoDurationSec?: number;
  interactions: { allow_comment: TikTokInteraction; allow_duet: TikTokInteraction; allow_stitch: TikTokInteraction };
  commercialContentTypes: Array<{ value: Exclude<TikTokCommercialType, 'none'> | 'none'; label: string }>;
}
export type TikTokSettings = Record<string, unknown> & {
  privacy_level: TikTokPrivacyLevel; allow_comment: boolean; content_preview_confirmed: true; express_consent_given: true;
  media_type: TikTokMediaKind; allow_duet?: boolean; allow_stitch?: boolean; draft?: boolean; commercialContentType?: TikTokCommercialType;
};
type Target = { customContent?: string; customMedia?: PublishingMedia[]; platformSpecificData?: Record<string, unknown> };

export const TIKTOK_LIMITS = { caption: 2200, description: 4000, photos: 35, imageBytes: 20 * 1024 ** 2, videoBytes: 4 * 1024 ** 3 } as const;
export const TIKTOK_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const TIKTOK_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

function bad(message: string): never { throw new TenantAccessError(400, message); }
const ALIASES: Record<string, string> = {
  privacyLevel: 'privacy_level', allowComment: 'allow_comment', allowDuet: 'allow_duet', allowStitch: 'allow_stitch',
  contentPreviewConfirmed: 'content_preview_confirmed', expressConsentGiven: 'express_consent_given',
  videoCoverTimestampMs: 'video_cover_timestamp_ms', videoCoverImageUrl: 'video_cover_image_url', mediaType: 'media_type',
  photoCoverIndex: 'photo_cover_index', autoAddMusic: 'auto_add_music', videoMadeWithAi: 'video_made_with_ai',
  commercial_content_type: 'commercialContentType',
};
const SUPPORTED = ['privacy_level', 'allow_comment', 'allow_duet', 'allow_stitch', 'content_preview_confirmed', 'express_consent_given',
  'video_cover_timestamp_ms', 'video_cover_image_url', 'media_type', 'photo_cover_index', 'description', 'auto_add_music',
  'video_made_with_ai', 'draft', 'commercialContentType'];
const UNSUPPORTED = ['locationId', 'locationName', 'musicSoundInfo', 'videoOriginalSoundVolume', 'isAdsOnly', 'isBrandOrganicPost', 'brandPartnerPromote'];

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Accept documented snake_case/camelCase spellings, return one canonical object, reject anything else. */
export function canonicalTikTokSettings(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (!object(raw)) bad('tiktokSettings must be an object.');
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (UNSUPPORTED.includes(name)) bad(`TikTok ${name} is not supported in this release.`);
    const key = ALIASES[name] || name;
    if (!SUPPORTED.includes(key)) bad(`Unsupported TikTok setting: ${name}.`);
    if (Object.hasOwn(result, key) && result[key] !== value) bad(`TikTok setting ${key} was provided twice with different values.`);
    result[key] = value;
  }
  return result;
}

/** One video, or 1–35 images; documents and mixed posts are rejected. Text-only posts are impossible on TikTok. */
export function tiktokMediaKind(items: PublishingMedia[]): TikTokMediaKind {
  if (!Array.isArray(items) || !items.length) bad('TikTok requires a video or at least one photo. Text-only posts are not supported.');
  if (items.some(item => !['image', 'video'].includes(item?.type))) bad('TikTok supports videos and photos only; documents are unsupported.');
  const videos = items.filter(item => item.type === 'video').length;
  if (videos && (videos !== 1 || items.length !== 1)) bad('TikTok accepts one video per post, or up to 35 photos. Photos and videos cannot be mixed.');
  if (!videos && items.length > TIKTOK_LIMITS.photos) bad('TikTok photo carousels support up to 35 photos.');
  return videos ? 'video' : 'photo';
}

function bool(settings: Record<string, unknown>, key: string, required: boolean) {
  const value = settings[key];
  if (value === undefined) { if (required) bad(`TikTok requires an explicit ${key} choice.`); return; }
  if (typeof value !== 'boolean') bad(`${key} must be true or false.`);
}

/**
 * Structural checks that need no provider read. Returns the effective settings: root
 * `tiktokSettings` merged with the per-entry `platformSpecificData.tiktokSettings`
 * (the per-entry value wins, as documented), plus the derived media kind.
 */
export function validateTikTokTarget(target: Target, content: string | undefined, rootMedia: PublishingMedia[] | undefined, rootSettings: unknown) {
  const options = target.platformSpecificData ?? {};
  if (Object.keys(options).some(key => key !== 'tiktokSettings')) bad('Unsupported TikTok publishing fields. Put TikTok options in tiktokSettings.');
  const items = target.customMedia !== undefined ? target.customMedia : rootMedia ?? [];
  const caption = target.customContent !== undefined ? target.customContent : content ?? '';
  const kind = tiktokMediaKind(items);
  if (typeof caption !== 'string') bad('content must be text.');
  if ([...caption].length > TIKTOK_LIMITS.caption) bad('TikTok captions must be at most 2,200 characters.');
  const settings = { ...canonicalTikTokSettings(rootSettings), ...canonicalTikTokSettings(options.tiktokSettings) };
  if (!Object.keys(settings).length) bad('TikTok settings are required: choose who can view the post and confirm both TikTok consents.');
  if (settings.content_preview_confirmed !== true || settings.express_consent_given !== true) {
    bad('Confirm that you previewed the content and agree to TikTok\'s Music Usage Confirmation before posting.');
  }
  if (typeof settings.privacy_level !== 'string' || !(TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(settings.privacy_level)) {
    bad('Choose who can view this TikTok post. TikTok does not allow a default privacy level.');
  }
  if (settings.media_type !== undefined && settings.media_type !== kind) bad(`TikTok media_type must match the media: this is a ${kind} post.`);
  settings.media_type = kind;
  bool(settings, 'allow_comment', true);
  bool(settings, 'draft', false);
  bool(settings, 'video_made_with_ai', false);
  if (kind === 'video') {
    bool(settings, 'allow_duet', true); bool(settings, 'allow_stitch', true);
    for (const key of ['photo_cover_index', 'description', 'auto_add_music']) if (settings[key] !== undefined) bad(`${key} applies to TikTok photo posts only.`);
    if (settings.video_cover_timestamp_ms !== undefined && (!Number.isSafeInteger(settings.video_cover_timestamp_ms) || (settings.video_cover_timestamp_ms as number) < 0)) bad('video_cover_timestamp_ms must be nonnegative milliseconds.');
    if (settings.video_cover_image_url !== undefined) publicMediaUrl(settings.video_cover_image_url);
  } else {
    for (const key of ['allow_duet', 'allow_stitch', 'video_cover_timestamp_ms', 'video_cover_image_url']) if (settings[key] !== undefined) bad(`${key} applies to TikTok video posts only.`);
    if (settings.photo_cover_index !== undefined && (!Number.isSafeInteger(settings.photo_cover_index) || (settings.photo_cover_index as number) < 0 || (settings.photo_cover_index as number) >= items.length)) bad('photo_cover_index must identify one of the photos.');
    if (settings.description !== undefined && (typeof settings.description !== 'string' || [...settings.description].length > TIKTOK_LIMITS.description)) bad('TikTok photo descriptions must be text of at most 4,000 characters.');
    bool(settings, 'auto_add_music', false);
    // Business app connections (every new connection) reject the AI disclosure on direct photo posts.
    if (settings.video_made_with_ai === true && settings.draft !== true) bad('TikTok accepts the AI-generated disclosure on video posts only. Send photos as a draft and set the disclosure in the TikTok app.');
  }
  const commercial = settings.commercialContentType;
  if (commercial !== undefined && !['none', 'brand_organic', 'brand_content'].includes(commercial as string)) bad('Choose a supported TikTok commercial content disclosure.');
  if (commercial && commercial !== 'none' && settings.privacy_level === 'SELF_ONLY') bad('Branded or promotional TikTok content cannot be posted with "Only me" privacy.');
  return { items, caption, kind, settings: settings as TikTokSettings };
}

/** Rules that depend on the creator's live TikTok capabilities. */
export function assertTikTokSettingsAllowed(settings: TikTokSettings, info: TikTokCreatorInfo) {
  if (info.mediaType !== settings.media_type) throw new TenantAccessError(409, 'TikTok creator information does not match this post type. Refresh and try again.');
  if (!info.privacyLevels.some(level => level.value === settings.privacy_level)) {
    throw new TenantAccessError(400, `TikTok does not offer "${settings.privacy_level}" for this account. Choose one of: ${info.privacyLevels.map(level => level.label || level.value).join(', ') || 'none available'}.`);
  }
  for (const key of ['allow_comment', 'allow_duet', 'allow_stitch'] as const) {
    const capability = info.interactions[key];
    if (settings[key] === true && capability?.enabled !== true) throw new TenantAccessError(400, `This TikTok account has ${({ allow_comment: 'comments', allow_duet: 'duets', allow_stitch: 'stitches' })[key]} turned off in the TikTok app.`);
  }
  const commercial = settings.commercialContentType;
  if (commercial && commercial !== 'none' && !info.commercialContentTypes.some(type => type.value === commercial)) {
    throw new TenantAccessError(400, 'This TikTok account cannot use that commercial content disclosure.');
  }
  if (settings.draft !== true && info.creator.canPostMore === false) {
    throw new TenantAccessError(429, 'TikTok says this account cannot publish more posts right now. Send it as a draft to the TikTok inbox or try again later.');
  }
}

function interaction(value: unknown): TikTokInteraction | undefined {
  if (value === null) return null;
  if (!object(value) || typeof value.enabled !== 'boolean') return undefined;
  return { enabled: value.enabled, ...(typeof value.label === 'string' ? { label: value.label } : {}) };
}

/** Strictly normalizes `GET /v1/accounts/{id}/tiktok/creator-info`; returns null for malformed provider data. */
export function normalizeTikTokCreatorInfo(raw: unknown, mediaType: TikTokMediaKind): TikTokCreatorInfo | null {
  if (!object(raw) || !object(raw.creator) || !Array.isArray(raw.privacyLevels) || !object(raw.postingLimits)) return null;
  const creator = raw.creator;
  if (creator.canPostMore !== undefined && typeof creator.canPostMore !== 'boolean') return null;
  const privacyLevels = raw.privacyLevels.map(level => object(level) && typeof level.value === 'string' && (TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(level.value)
    ? { value: level.value as TikTokPrivacyLevel, label: typeof level.label === 'string' ? level.label : level.value } : null);
  if (privacyLevels.some(level => !level)) return null;
  const settings = object(raw.postingLimits.interactionSettings) ? raw.postingLimits.interactionSettings : null;
  if (!settings) return null;
  const comment = interaction(settings.allow_comment), duet = interaction(settings.allow_duet ?? null), stitch = interaction(settings.allow_stitch ?? null);
  if (comment === undefined || comment === null || duet === undefined || stitch === undefined) return null;
  const commercialRaw = raw.commercialContentTypes === undefined ? [] : raw.commercialContentTypes;
  if (!Array.isArray(commercialRaw)) return null;
  const commercialContentTypes = commercialRaw.map(type => object(type) && ['none', 'brand_organic', 'brand_content'].includes(type.value as string)
    ? { value: type.value as TikTokCommercialType, label: typeof type.label === 'string' ? type.label : String(type.value) } : null);
  if (commercialContentTypes.some(type => !type)) return null;
  const max = raw.postingLimits.maxVideoDurationSec;
  if (max !== undefined && max !== null && (!Number.isFinite(max) || (max as number) <= 0)) return null;
  return {
    mediaType,
    creator: { canPostMore: creator.canPostMore !== false, ...(typeof creator.nickname === 'string' ? { nickname: creator.nickname } : {}), ...(typeof creator.isVerified === 'boolean' ? { isVerified: creator.isVerified } : {}) },
    privacyLevels: privacyLevels as TikTokCreatorInfo['privacyLevels'],
    ...(typeof max === 'number' ? { maxVideoDurationSec: max } : {}),
    interactions: { allow_comment: comment, allow_duet: mediaType === 'photo' ? null : duet, allow_stitch: mediaType === 'photo' ? null : stitch },
    commercialContentTypes: commercialContentTypes as TikTokCreatorInfo['commercialContentTypes'],
  };
}

/** Media preflight verdict check, mirroring the Instagram path but with TikTok's formats and limits. */
export function assertTikTokMediaCheck(item: PublishingMedia, check: { type?: string; contentType?: string; size?: number | null }) {
  const contentType = check.contentType?.split(';')[0]?.trim().toLowerCase() || '';
  if (check.type !== item.type || !(item.type === 'image' ? TIKTOK_IMAGE_TYPES : TIKTOK_VIDEO_TYPES).includes(contentType)) {
    bad('TikTok media must be JPEG, PNG or WebP photos, or MP4, MOV or WebM video, matching the declared type.');
  }
  if (typeof check.size === 'number' && check.size > (item.type === 'image' ? TIKTOK_LIMITS.imageBytes : TIKTOK_LIMITS.videoBytes)) {
    bad(item.type === 'image' ? 'TikTok photos must be 20 MB or smaller.' : 'TikTok videos must be 4 GB or smaller.');
  }
}
