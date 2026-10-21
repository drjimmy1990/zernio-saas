'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import {
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Code2,
} from 'lucide-react';
import { Asra3Logo } from '@/components/Asra3Logo';
import { authErrorMessage } from '@/lib/auth/messages';

function SignUpFormContent() {
  const { t, locale, dir } = useThemeAndLocale();
  const ar = locale === 'ar';

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          fullName,
          email,
          password,
          companyName: companyName || `${fullName}'s Workspace`,
          primaryColor: '#eb3514',
          language: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(authErrorMessage(data, locale, ar ? 'تعذّر إنشاء الحساب.' : 'Could not create account.'));
        return;
      }
      if (data?.ok === true && data.verificationRequired === true) {
        setNotice(ar ? 'إذا كان البريد مؤهلاً للتسجيل، ستصلك رسالة تأكيد. راجع بريدك والرسائل غير المرغوبة. إذا كان لديك حساب بالفعل، سجّل الدخول.' : 'If this email is eligible for registration, you will receive a verification link. Check your inbox and spam folder. If you already have an account, sign in.');
        return;
      }
      setError(authErrorMessage({ code: 'registration_unconfirmed' }, locale, 'Registration could not be confirmed.'));
    } catch {
      setError(ar ? 'تعذّر الاتصال بخدمة التسجيل. حاول مرة أخرى.' : 'Could not reach the registration service. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-6 text-[var(--text-primary)]">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Clean, Simple Sign Up Form */}
        <div className="luxury-card rounded-3xl p-6 sm:p-8 lg:col-span-7">
          <div className="mb-4">
            <Asra3Logo size="sm" />
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
            {t.auth.signupTitle}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
            {ar ? 'أنشئ مساحة عمل لنشاطك، ثم أكّد بريدك الإلكتروني لبدء استخدام الخدمات المفعّلة لحسابك.' : 'Create your business workspace, then verify your email to use the services enabled for your account.'}
          </p>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600">
              {error}
            </div>
          )}
          {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-500/30 p-3 text-sm">{notice} <Link href="/login" className="underline">{locale === 'ar' ? 'تسجيل الدخول' : 'Sign in'}</Link></div>}
          {(error || notice) && <Link href="/recovery" className="mt-3 inline-block text-sm underline">{ar ? 'إعادة إرسال التأكيد أو استعادة الحساب' : 'Resend verification or recover your account'}</Link>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.nameLabel}
                </label>
                <input
                  id="signup-name"
                  autoComplete="name"
                  maxLength={160}
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.auth.fullNamePlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.emailLabel}
                </label>
                <input
                  id="signup-email"
                  autoComplete="email"
                  maxLength={254}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="signup-company" className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.companyLabel}
                </label>
                <input
                  id="signup-company"
                  autoComplete="organization"
                  maxLength={160}
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t.auth.companyNamePlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.passwordLabel}
                </label>
                <input
                  id="signup-password"
                  autoComplete="new-password"
                  maxLength={200}
                  type="password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
              <p className="text-xs font-bold">{t.pricingSection.plans.starter.name}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {ar ? 'تبدأ مساحات العمل الجديدة بخطة Starter. يحدد المسؤول الخدمات المتاحة؛ الدفع الإلكتروني قريباً.' : 'New workspaces start on the Starter plan. An administrator controls service access; online payments are coming soon.'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              <span>{loading ? '...' : t.hero.ctaStart}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[var(--text-secondary)]">
            {t.auth.alreadyHaveAccount}{' '}
            <Link
              href="/login"
              className="font-bold text-[var(--accent-primary)] hover:underline"
            >
              {t.nav.login} {dir === 'rtl' ? '←' : '→'}
            </Link>
          </div>
        </div>

        {/* Workspace capabilities */}
        <div className="space-y-5 lg:col-span-5">
          <div className="luxury-card p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {ar ? 'مساحة عمل لنشاطك' : 'Your business workspace'}
            </h2>

            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {ar ? 'سجّل جهات الاتصال وبيانات العملاء وتابعها من مكان واحد.' : 'Record and manage your contacts and customer details in one place.'}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {ar ? 'انشر المحتوى وردّ على العملاء عبر القنوات المتصلة والمفعّلة لحسابك.' : 'Publish content and reply to customers through connected channels enabled for your account.'}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {ar ? 'الأتمتة والدفع الإلكتروني قريباً.' : 'Automations and online payments are coming soon.'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] hover:underline"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{t.auth.exploreApiDocs}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] text-sm font-semibold text-[var(--text-secondary)]">
          Loading...
        </div>
      }
    >
      <SignUpFormContent />
    </Suspense>
  );
}
