/**
 * Client-safe classifier for documented TikTok/Zernio failure messages
 * (zernio.txt "# TikTok" → Common errors, Direct posting at capacity, Draft delivery,
 * and Rate limits → Posting velocity limits). It explains the provider's real message;
 * it never replaces or hides it.
 */
export type TikTokErrorCode = 'tiktok_direct_post_capacity' | 'tiktok_api_daily_limit' | 'tiktok_pending_drafts' | 'tiktok_velocity_limit'
  | 'tiktok_missing_permissions' | 'tiktok_privacy_unavailable' | 'tiktok_spam_risk' | 'tiktok_duplicate' | 'tiktok_media_download' | 'tiktok_upload_timeout';

const RULES: Array<{ code: TikTokErrorCode; test: RegExp; en: string; ar: string; suggestDraft?: boolean }> = [
  { code: 'tiktok_direct_post_capacity', test: /direct posting is at capacity|daily active user quota|reached_active_user_cap/i, suggestDraft: true,
    en: 'TikTok is temporarily limiting direct posting for older connections. Nothing is wrong with your account or video. Send it as a draft to your TikTok inbox now, try again in a few hours, or reconnect the account to move it to TikTok\'s Business connection, which is not affected.',
    ar: 'تيك توك يحدّ مؤقتاً من النشر المباشر للاتصالات القديمة، ولا توجد مشكلة في حسابك أو الفيديو. أرسله الآن كمسودة إلى صندوق تيك توك، أو أعد المحاولة بعد بضع ساعات، أو أعد ربط الحساب لنقله إلى اتصال تيك توك للأعمال غير المتأثر بهذا الحد.' },
  { code: 'tiktok_pending_drafts', test: /5 pending drafts|pending drafts per account/i,
    en: 'TikTok allows only 5 pending drafts per account in 24 hours. Open the TikTok app and post or discard existing drafts; waiting does not free a slot.',
    ar: 'يسمح تيك توك بخمس مسودات معلّقة فقط لكل حساب خلال ٢٤ ساعة. افتح تطبيق تيك توك وانشر المسودات الحالية أو احذفها؛ الانتظار لا يحرر مكاناً.' },
  { code: 'tiktok_api_daily_limit', test: /too many posts in the last 24 hours/i,
    en: 'TikTok\'s own daily limit for posts created through apps has been reached for this account. Wait for TikTok\'s rolling 24-hour window, or post directly in the TikTok app.',
    ar: 'وصل هذا الحساب إلى حد تيك توك اليومي للمنشورات عبر التطبيقات. انتظر انقضاء نافذة الـ٢٤ ساعة المتجددة، أو انشر مباشرة من تطبيق تيك توك.' },
  { code: 'tiktok_velocity_limit', test: /rate limit|velocity|posts per hour|daily (posting )?(cap|limit)|retry after/i,
    en: 'The posting limit for this account was reached (25 posts per hour, and TikTok\'s daily caps). Wait for the time shown, then try again or schedule the post for later.',
    ar: 'تم بلوغ حد النشر لهذا الحساب (٢٥ منشوراً في الساعة إضافة إلى الحدود اليومية لتيك توك). انتظر المدة الموضحة ثم أعد المحاولة أو جدوِل المنشور لوقت لاحق.' },
  { code: 'tiktok_missing_permissions', test: /missing required tiktok permissions|missing_tiktok_permissions/i,
    en: 'TikTok did not grant every permission this account needs. Reconnect the account and accept all permissions on TikTok\'s consent screen.',
    ar: 'لم يمنح تيك توك كل الصلاحيات المطلوبة لهذا الحساب. أعد ربط الحساب ووافق على جميع الصلاحيات في شاشة موافقة تيك توك.' },
  { code: 'tiktok_privacy_unavailable', test: /privacy level .* is not available|does not offer .* for this account/i,
    en: 'That audience option is not available for this TikTok account. Reload the account settings and choose one of the listed options.',
    ar: 'خيار الجمهور هذا غير متاح لهذا الحساب على تيك توك. أعد تحميل إعدادات الحساب واختر أحد الخيارات المعروضة.' },
  { code: 'tiktok_spam_risk', test: /spam_risk|potentially risky/i,
    en: 'TikTok\'s moderation flagged this post. Review the caption and media; moderation through apps is stricter than in the TikTok app.',
    ar: 'نظام المراجعة في تيك توك أشار إلى هذا المنشور. راجع النص والوسائط؛ المراجعة عبر التطبيقات أشد من تطبيق تيك توك نفسه.' },
  { code: 'tiktok_duplicate', test: /duplicate content/i,
    en: 'TikTok detected the same content posted recently. Change the caption or media before retrying.',
    ar: 'اكتشف تيك توك محتوى مطابقاً نُشر مؤخراً. غيّر النص أو الوسائط قبل إعادة المحاولة.' },
  { code: 'tiktok_media_download', test: /download failed|video url returned an error/i,
    en: 'TikTok could not download the media. Use a direct file link (not a Drive or Dropbox sharing page) or upload the file here.',
    ar: 'تعذر على تيك توك تنزيل الوسائط. استخدم رابطاً مباشراً للملف (وليس صفحة مشاركة من Drive أو Dropbox) أو ارفع الملف هنا.' },
  { code: 'tiktok_upload_timeout', test: /timeout waiting for platform response/i,
    en: 'TikTok is still processing a large upload. Check the post status again in a few minutes before retrying.',
    ar: 'ما زال تيك توك يعالج ملفاً كبيراً. تحقق من حالة المنشور بعد بضع دقائق قبل إعادة المحاولة.' },
];

export function explainTikTokError(message: unknown, status?: number): { code: TikTokErrorCode; en: string; ar: string; suggestDraft: boolean } | null {
  const text = typeof message === 'string' ? message : '';
  const rule = RULES.find(item => item.test.test(text)) || (status === 429 ? RULES.find(item => item.code === 'tiktok_velocity_limit') : undefined);
  return rule ? { code: rule.code, en: rule.en, ar: rule.ar, suggestDraft: rule.suggestDraft === true } : null;
}
