const messages: Record<string, [string, string]> = {
  auth_rate_limited: ['Too many requests. Wait a few minutes before trying again.', 'تم إرسال طلبات كثيرة. انتظر بضع دقائق قبل المحاولة مرة أخرى.'],
  email_delivery_unavailable: ['Account email delivery is unavailable. Contact support to restore it.', 'إرسال رسائل الحساب غير متاح حالياً. تواصل مع الدعم لتفعيل الخدمة.'],
  signup_unavailable: ['New account registration is unavailable. Contact support.', 'إنشاء الحسابات غير متاح حالياً. تواصل مع الدعم.'],
  auth_verification_unavailable: ['Account verification is unavailable. Contact support.', 'التحقق من الحساب غير متاح حالياً. تواصل مع الدعم.'],
  weak_password: ['Choose a stronger password that meets the account security requirements.', 'اختر كلمة مرور أقوى تستوفي متطلبات أمان الحساب.'],
  invalid_email: ['Enter a valid email address.', 'أدخل عنوان بريد إلكتروني صحيحاً.'],
  auth_unavailable: ['Authentication is temporarily unavailable. Try again later.', 'خدمة الدخول غير متاحة مؤقتاً. حاول لاحقاً.'],
  invalid_credentials: ['Check your email and password, and verify your email before signing in.', 'راجع البريد وكلمة المرور، وأكّد بريدك الإلكتروني قبل تسجيل الدخول.'],
  registration_unconfirmed: ['Registration could not be confirmed. If you already registered, sign in or request a new verification email.', 'تعذّر تأكيد التسجيل. إذا سجّلت من قبل، جرّب تسجيل الدخول أو اطلب رسالة تأكيد جديدة.'],
  invalid_auth_link: ['This email link is invalid or expired. Request a new link.', 'رابط البريد غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.'],
};

/** Localize stable public error codes; provider internals stay on the server. */
export function authErrorMessage(data: unknown, locale: string, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const result = data as { code?: unknown; error?: unknown };
  const message = typeof result.code === 'string' && Object.hasOwn(messages, result.code)
    ? messages[result.code] : undefined;
  if (message) return message[locale === 'ar' ? 1 : 0];
  return typeof result.error === 'string' && result.error ? result.error : fallback;
}
