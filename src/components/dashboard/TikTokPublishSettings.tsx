'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * TikTok composer settings (zernio.txt "# TikTok": Creator info, Commercial content, Draft delivery).
 * Every option shown comes from the live creator-info read for the selected account; nothing is
 * pre-selected for privacy, interactions default off, and both consents must be ticked per post.
 */
export type TikTokKind = 'video' | 'photo';
type Interaction = { enabled: boolean; label?: string } | null;
export interface TikTokCreatorInfoView {
  mediaType: TikTokKind;
  creator: { nickname?: string; isVerified?: boolean; canPostMore: boolean };
  privacyLevels: Array<{ value: string; label: string }>;
  maxVideoDurationSec?: number;
  interactions: { allow_comment: Interaction; allow_duet: Interaction; allow_stitch: Interaction };
  commercialContentTypes: Array<{ value: string; label: string }>;
}
export interface TikTokComposerState {
  privacyLevel: string; allowComment: boolean; allowDuet: boolean; allowStitch: boolean;
  disclose: boolean; commercialType: '' | 'brand_organic' | 'brand_content';
  previewConfirmed: boolean; consentGiven: boolean; inboxDraft: boolean;
  aiGenerated: boolean; description: string; autoAddMusic: boolean;
}
export const emptyTikTokState: TikTokComposerState = {
  privacyLevel: '', allowComment: false, allowDuet: false, allowStitch: false, disclose: false, commercialType: '',
  previewConfirmed: false, consentGiven: false, inboxDraft: false, aiGenerated: false, description: '', autoAddMusic: false,
};

const PRIVACY_TEXT: Record<string, { en: string; ar: string }> = {
  PUBLIC_TO_EVERYONE: { en: 'Everyone', ar: 'الجميع' },
  MUTUAL_FOLLOW_FRIENDS: { en: 'Friends (followers you follow back)', ar: 'الأصدقاء (المتابعة المتبادلة)' },
  FOLLOWER_OF_CREATOR: { en: 'Followers', ar: 'المتابعون' },
  SELF_ONLY: { en: 'Only me', ar: 'أنا فقط' },
};
export function tiktokPrivacyLabel(value: string, isRTL: boolean, fallback?: string) {
  const text = PRIVACY_TEXT[value];
  return text ? (isRTL ? text.ar : text.en) : fallback || value;
}

/** The exact `tiktokSettings` object the server validates again against live creator-info. */
export function tiktokSettingsFrom(state: TikTokComposerState, kind: TikTokKind): Record<string, unknown> {
  return {
    privacy_level: state.privacyLevel,
    allow_comment: state.allowComment,
    ...(kind === 'video' ? { allow_duet: state.allowDuet, allow_stitch: state.allowStitch } : {}),
    content_preview_confirmed: state.previewConfirmed,
    express_consent_given: state.consentGiven,
    commercialContentType: state.disclose && state.commercialType ? state.commercialType : 'none',
    ...(state.inboxDraft ? { draft: true } : {}),
    ...(kind === 'photo' && state.description.trim() ? { description: state.description } : {}),
    ...(kind === 'photo' && state.autoAddMusic ? { auto_add_music: true } : {}),
    ...(kind === 'video' && state.aiGenerated ? { video_made_with_ai: true } : {}),
  };
}

/** First blocking problem in plain language, or null when the TikTok part of the post is ready. */
export function tiktokComposerProblem(state: TikTokComposerState, info: TikTokCreatorInfoView | null, kind: TikTokKind | null, isRTL: boolean, videoSeconds?: number): string | null {
  const t = (ar: string, en: string) => isRTL ? ar : en;
  if (!kind) return t('تيك توك يتطلب فيديو أو صوراً. المنشورات النصية فقط غير مدعومة.', 'TikTok requires a video or photos. Text-only posts are not supported.');
  if (!info || info.mediaType !== kind) return t('جارٍ تحميل إعدادات حساب تيك توك. انتظر حتى تظهر الخيارات.', 'TikTok account settings are still loading. Wait until the options appear.');
  if (!state.privacyLevel || !info.privacyLevels.some(level => level.value === state.privacyLevel)) return t('اختر من يمكنه مشاهدة منشور تيك توك.', 'Choose who can view this TikTok post.');
  if (state.disclose && !state.commercialType) return t('اختر نوع الإفصاح التجاري، أو ألغِ خيار الإفصاح.', 'Choose the type of commercial disclosure, or turn disclosure off.');
  if (state.disclose && state.commercialType && state.privacyLevel === 'SELF_ONLY') return t('المحتوى الترويجي أو المدفوع لا يمكن نشره بخصوصية "أنا فقط".', 'Promotional or branded content cannot be posted with "Only me" privacy.');
  if (kind === 'video' && info.maxVideoDurationSec && videoSeconds != null && videoSeconds > info.maxVideoDurationSec) return t(`مدة الفيديو أطول من الحد المسموح لهذا الحساب (${Math.floor(info.maxVideoDurationSec)} ثانية).`, `The video is longer than this account allows (${Math.floor(info.maxVideoDurationSec)} seconds).`);
  if (kind === 'video' && videoSeconds != null && videoSeconds < 3) return t('فيديو تيك توك يجب ألا يقل عن ٣ ثوانٍ.', 'TikTok videos must be at least 3 seconds long.');
  if (kind === 'photo' && [...state.description].length > 4000) return t('وصف الصور يجب ألا يتجاوز ٤٠٠٠ حرف.', 'The photo description must be 4,000 characters or fewer.');
  if (!info.creator.canPostMore && !state.inboxDraft) return t('تيك توك لا يسمح لهذا الحساب بنشر المزيد الآن. أرسله كمسودة إلى صندوق تيك توك أو حاول لاحقاً.', 'TikTok is not letting this account publish more right now. Send it as a draft to the TikTok inbox or try later.');
  if (!state.previewConfirmed || !state.consentGiven) return t('أكّد معاينة المحتوى وموافقتك على شروط تيك توك قبل المتابعة.', 'Confirm the content preview and your agreement to TikTok\'s terms before continuing.');
  return null;
}

export function TikTokPublishSettings({ accountId, kind, isRTL, value, onChange, onInfo, disabled = false }: {
  accountId: string; kind: TikTokKind | null; isRTL: boolean; value: TikTokComposerState;
  onChange: (next: TikTokComposerState) => void; onInfo: (info: TikTokCreatorInfoView | null) => void; disabled?: boolean;
}) {
  const t = (ar: string, en: string) => isRTL ? ar : en;
  const mediaType: TikTokKind = kind || 'video';
  const [info, setInfo] = useState<TikTokCreatorInfoView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const latest = useRef({ value, onChange, onInfo });
  latest.current = { value, onChange, onInfo };

  const load = useCallback(async (signal: { stale: boolean }) => {
    setLoading(true); setError(''); setInfo(null); latest.current.onInfo(null);
    try {
      const response = await fetch(`/api/publishing?action=tiktok_creator_info&accountId=${encodeURIComponent(accountId)}&mediaType=${mediaType}`, { cache: 'no-store' });
      let data; try { data = await response.json(); } catch { throw new Error('The server response could not be read.'); }
      if (signal.stale) return;
      if (!response.ok || !Array.isArray(data.privacyLevels) || data.mediaType !== mediaType || !data.creator || !data.interactions) throw new Error(data.error?.message || 'TikTok account settings are unavailable.');
      const next = data as TikTokCreatorInfoView;
      setInfo(next); latest.current.onInfo(next);
      // Keep only choices the creator still allows; never invent a default.
      const current = latest.current.value;
      const allowed = (key: 'allow_comment' | 'allow_duet' | 'allow_stitch') => next.interactions[key]?.enabled === true;
      const sanitized: TikTokComposerState = { ...current,
        privacyLevel: next.privacyLevels.some(level => level.value === current.privacyLevel) ? current.privacyLevel : '',
        allowComment: allowed('allow_comment') && current.allowComment,
        allowDuet: mediaType === 'video' && allowed('allow_duet') && current.allowDuet,
        allowStitch: mediaType === 'video' && allowed('allow_stitch') && current.allowStitch,
        commercialType: next.commercialContentTypes.some(type => type.value === current.commercialType) ? current.commercialType : '' };
      if (JSON.stringify(sanitized) !== JSON.stringify(current)) latest.current.onChange(sanitized);
    } catch (failure) { if (!signal.stale) setError(failure instanceof Error ? failure.message : 'TikTok account settings are unavailable.'); }
    finally { if (!signal.stale) setLoading(false); }
  }, [accountId, mediaType]);
  useEffect(() => { const signal = { stale: false }; void load(signal); return () => { signal.stale = true; }; }, [load, attempt]);

  const set = (patch: Partial<TikTokComposerState>) => onChange({ ...value, ...patch });
  const commercialOptions = (info?.commercialContentTypes || []).filter(type => type.value === 'brand_organic' || type.value === 'brand_content');
  const box = 'mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent-primary)]';
  const row = 'flex items-start gap-2 text-sm leading-relaxed';
  const field = 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]';

  return <section data-testid="tiktok-settings" aria-label={t('إعدادات تيك توك', 'TikTok settings')} className="min-w-0 space-y-4 border-b border-[var(--border-subtle)] pb-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-sm font-semibold">{t('إعدادات منشور تيك توك', 'TikTok post settings')}</h3>
      {info?.creator.nickname && <p className="min-w-0 break-words text-xs text-[var(--text-secondary)]">{t('النشر باسم', 'Posting as')} <bdi dir="ltr">@{info.creator.nickname}</bdi></p>}
    </div>
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{kind === 'photo'
      ? t('منشور صور: حتى ٣٥ صورة JPEG أو PNG أو WebP. نص المنشور يصبح عنوان الصور (٩٠ حرفاً)، وضع الوصف الكامل أدناه.', 'Photo post: up to 35 JPEG, PNG or WebP photos. The post text becomes the photo title (90 characters); put the full caption below.')
      : kind === 'video' ? t(`منشور فيديو: فيديو واحد MP4 أو MOV أو WebM${info?.maxVideoDurationSec ? `، حتى ${Math.floor(info.maxVideoDurationSec)} ثانية` : ''}. الأفضل بنسبة ٩:١٦ عمودياً.`, `Video post: one MP4, MOV or WebM video${info?.maxVideoDurationSec ? `, up to ${Math.floor(info.maxVideoDurationSec)} seconds` : ''}. Vertical 9:16 works best.`)
      : t('أضف فيديو واحداً أو حتى ٣٥ صورة. تيك توك لا يقبل منشورات نصية فقط.', 'Add one video or up to 35 photos. TikTok does not accept text-only posts.')}</p>
    {loading && <p role="status" className="text-sm">{t('جارٍ تحميل إعدادات حساب تيك توك…', 'Loading TikTok account settings…')}</p>}
    {error && <div role="alert" className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"><p className="break-words">{error}</p><button type="button" className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold" onClick={() => setAttempt(n => n + 1)} disabled={disabled}>{t('إعادة المحاولة', 'Try again')}</button></div>}
    {info && <fieldset disabled={disabled} className="min-w-0 space-y-4">
      {!info.creator.canPostMore && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{t('تيك توك لا يسمح لهذا الحساب بنشر المزيد الآن. يمكنك إرساله كمسودة إلى صندوق تيك توك.', 'TikTok is not letting this account publish more right now. You can still send it as a draft to your TikTok inbox.')}</p>}
      <label className="block space-y-2"><span className="text-sm font-semibold">{t('من يمكنه مشاهدة هذا المنشور؟', 'Who can view this post?')}</span>
        <select aria-label={t('من يمكنه مشاهدة منشور تيك توك', 'Who can view this TikTok post')} className={field} value={value.privacyLevel} onChange={e => set({ privacyLevel: e.target.value })} aria-required="true">
          <option value="" disabled>{t('اختر الجمهور', 'Choose an audience')}</option>
          {info.privacyLevels.map(level => <option key={level.value} value={level.value} disabled={level.value === 'SELF_ONLY' && value.disclose && !!value.commercialType}>{tiktokPrivacyLabel(level.value, isRTL, level.label)}</option>)}
        </select>
      </label>
      <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">{t('السماح للمشاهدين بـ', 'Allow viewers to')}</legend>
        {info.interactions.allow_comment?.enabled ? <label className={row}><input className={box} type="checkbox" checked={value.allowComment} onChange={e => set({ allowComment: e.target.checked })} />{t('التعليق', 'Comment')}</label>
          : <p className="text-xs text-[var(--text-secondary)]">{t('التعليقات مغلقة لهذا الحساب في تطبيق تيك توك.', 'Comments are turned off for this account in the TikTok app.')}</p>}
        {mediaType === 'video' && (info.interactions.allow_duet?.enabled ? <label className={row}><input className={box} type="checkbox" checked={value.allowDuet} onChange={e => set({ allowDuet: e.target.checked })} />{t('عمل دويتو (Duet)', 'Duet')}</label>
          : <p className="text-xs text-[var(--text-secondary)]">{t('الدويتو مغلق لهذا الحساب في تطبيق تيك توك.', 'Duets are turned off for this account in the TikTok app.')}</p>)}
        {mediaType === 'video' && (info.interactions.allow_stitch?.enabled ? <label className={row}><input className={box} type="checkbox" checked={value.allowStitch} onChange={e => set({ allowStitch: e.target.checked })} />{t('عمل ستيتش (Stitch)', 'Stitch')}</label>
          : <p className="text-xs text-[var(--text-secondary)]">{t('الستيتش مغلق لهذا الحساب في تطبيق تيك توك.', 'Stitches are turned off for this account in the TikTok app.')}</p>)}
      </fieldset>
      <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">{t('الإفصاح عن المحتوى التجاري', 'Commercial content disclosure')}</legend>
        {commercialOptions.length ? <>
          <label className={row}><input className={box} type="checkbox" checked={value.disclose} onChange={e => set({ disclose: e.target.checked, ...(e.target.checked ? {} : { commercialType: '' }) })} />{t('هذا المنشور يروّج لعلامة تجارية أو منتج أو خدمة', 'This post promotes a brand, product or service')}</label>
          {value.disclose && <div className="space-y-2 ps-6">{commercialOptions.map(option => <label key={option.value} className={row}><input className={box} type="radio" name={`tiktok-commercial-${accountId}`} checked={value.commercialType === option.value} onChange={() => set({ commercialType: option.value as TikTokComposerState['commercialType'] })} />
            <span>{option.value === 'brand_organic' ? t('علامتك التجارية — تروّج لنفسك أو لنشاطك. سيُوسم المنشور "محتوى ترويجي".', 'Your brand — you are promoting yourself or your own business. The post will be labeled "Promotional content".') : t('محتوى مدفوع — شراكة مدفوعة مع جهة أخرى. سيُوسم المنشور "شراكة مدفوعة".', 'Branded content — a paid partnership with another brand. The post will be labeled "Paid partnership".')}</span></label>)}</div>}
        </> : <p className="text-xs text-[var(--text-secondary)]">{t('الإفصاح التجاري غير متاح لهذا الحساب.', 'Commercial disclosure is unavailable for this account.')}</p>}
      </fieldset>
      {kind === 'photo' && <div className="space-y-2">
        <label className="block space-y-2"><span className="text-sm font-semibold">{t('وصف الصور (النص الكامل)', 'Photo description (full caption)')}</span><textarea aria-label={t('وصف صور تيك توك', 'TikTok photo description')} rows={4} className={`${field} resize-y`} value={value.description} onChange={e => set({ description: e.target.value })} /></label>
        <p className={`text-end text-xs ${[...value.description].length > 4000 ? 'text-rose-600' : 'text-[var(--text-muted)]'}`}>{[...value.description].length.toLocaleString(isRTL ? 'ar' : 'en')} / {isRTL ? '٤٬٠٠٠' : '4,000'}</p>
        <label className={row}><input className={box} type="checkbox" checked={value.autoAddMusic} onChange={e => set({ autoAddMusic: e.target.checked })} />{t('السماح لتيك توك بإضافة موسيقى مقترحة', 'Let TikTok add recommended music')}</label>
      </div>}
      {kind === 'video' && <label className={row}><input className={box} type="checkbox" checked={value.aiGenerated} onChange={e => set({ aiGenerated: e.target.checked })} />{t('هذا الفيديو مُنشأ بالذكاء الاصطناعي', 'This video is AI-generated')}</label>}
      <label className={`${row} rounded-xl border border-[var(--border-subtle)] p-3`}><input className={box} type="checkbox" checked={value.inboxDraft} onChange={e => set({ inboxDraft: e.target.checked })} />
        <span><span className="font-semibold">{t('إرسال كمسودة إلى صندوق تيك توك', 'Send as draft to TikTok inbox')}</span><span className="block text-xs text-[var(--text-secondary)]">{t('لن يُنشر شيء. ستصلك إشعار في تطبيق تيك توك (الإصدار 31.8 أو أحدث) لإكمال المنشور ونشره بنفسك. يسمح تيك توك بخمس مسودات معلّقة يومياً.', 'Nothing goes live. You get a notification in the TikTok app (version 31.8 or later) to finish and post it yourself. TikTok allows 5 pending drafts per day.')}</span></span></label>
      <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">{t('موافقات تيك توك المطلوبة', 'Required TikTok confirmations')}</legend>
        <label className={row}><input className={box} type="checkbox" aria-required="true" checked={value.previewConfirmed} onChange={e => set({ previewConfirmed: e.target.checked })} />{t('راجعت معاينة هذا المحتوى وهو جاهز للمشاركة على تيك توك.', 'I have previewed this content and it is ready to share on TikTok.')}</label>
        <label className={row}><input className={box} type="checkbox" aria-required="true" checked={value.consentGiven} onChange={e => set({ consentGiven: e.target.checked })} />
          <span>{t('بالنشر، أوافق على ', 'By posting, I agree to TikTok\'s ')}<a className="text-[var(--accent-primary)] underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer">{t('تأكيد استخدام الموسيقى في تيك توك', 'Music Usage Confirmation')}</a>{value.disclose && value.commercialType === 'brand_content' && <>{t(' و', ' and ')}<a className="text-[var(--accent-primary)] underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer">{t('سياسة المحتوى المدفوع', 'Branded Content Policy')}</a></>}.</span></label>
      </fieldset>
    </fieldset>}
  </section>;
}
