'use client';

import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { Asra3Logo } from '@/components/Asra3Logo';

export default function RegistrationComingSoon() {
  const { locale, dir } = useThemeAndLocale();
  const ar = locale === 'ar';
  return <main dir={dir} className="mx-auto max-w-xl px-6 py-16">
    <section className="luxury-card space-y-6 rounded-3xl p-8">
      <Asra3Logo size="sm" />
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">{ar ? 'التسجيل قريباً' : 'Registration coming soon'}</h1>
      <p className="text-[var(--text-secondary)]">{ar ? 'التسجيل العام مغلق حالياً أثناء اختبار المنصة. يمكن لأصحاب الحسابات الحالية تسجيل الدخول.' : 'Public registration is currently closed while the platform is being tested. Existing account holders can sign in.'}</p>
      <div className="flex flex-wrap gap-4">
        <Link href="/login" className="rounded-xl bg-[var(--accent-primary)] px-5 py-3 font-bold text-white">{ar ? 'تسجيل الدخول' : 'Sign in'}</Link>
        <Link href="/recovery" className="rounded-xl border border-[var(--border-subtle)] px-5 py-3 text-[var(--text-primary)]">{ar ? 'استعادة الحساب' : 'Recover account'}</Link>
      </div>
    </section>
  </main>;
}
