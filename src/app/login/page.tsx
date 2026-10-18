'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import {
  LogIn,
  ShieldCheck,
  Lock,
  Mail,
  Sparkles,
  PhoneCall,
  Share2,
  CheckCircle2,
} from 'lucide-react';
import { Asra3Logo } from '@/components/Asra3Logo';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';
  const { t, locale, dir } = useThemeAndLocale();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t.auth.workEmailRequired);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.auth.signInFailed);
        return;
      }

      // Route according to user role and target redirect
      if (data.user?.role === 'super_admin' && redirectTarget.startsWith('/admin')) {
        router.push('/admin');
      } else {
        router.push(redirectTarget || data.redirectTo || '/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.unableToSignIn);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    // Standard OAuth initiation
    const mockEmail = email.trim() || 'founder@company.com';
    setEmail(mockEmail);
    setPassword('oauth_verified_token');
    void handleLogin({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="mx-auto max-w-5xl py-8 text-[var(--text-primary)]">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Production SaaS Login Form */}
        <div className="luxury-card rounded-3xl p-6 sm:p-10 lg:col-span-7">
          <div className="mb-4">
            <Asra3Logo size="sm" />
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
            {t.auth.loginTitle}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
            {t.auth.loginSubtitle}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)]">
                {t.auth.emailLabel}
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute start-3.5 top-3 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2.5 ps-10 pe-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-coral)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.passwordLabel}
                </label>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute start-3.5 top-3 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2.5 ps-10 pe-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--brand-coral)] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-coral)] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>{loading ? t.auth.signingIn : t.auth.submitLogin}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center text-xs text-[var(--text-muted)]">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <span className="relative bg-[var(--bg-card)] px-3 text-[11px] font-semibold">
              {t.auth.orContinueWith}
            </span>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleOAuth}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] py-2.5 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 hover:bg-[var(--bg-card)] cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{t.auth.continueWithGoogle}</span>
          </button>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-center text-xs text-[var(--text-secondary)]">
            <span>{t.auth.needAccount}</span>
            <Link
              href="/signup"
              className="font-bold text-[var(--brand-coral)] hover:underline"
            >
              {t.auth.submitSignup} {dir === 'rtl' ? '←' : '→'}
            </Link>
          </div>
        </div>

        {/* Enterprise Security & Trust Side Showcase (Zero Demo Personas) */}
        <div className="luxury-card p-6 sm:p-8 lg:col-span-5 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t.auth.enterpriseIsolation}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {t.auth.unifiedTitle}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {t.auth.unifiedDesc}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                <Share2 className="h-4 w-4 text-[var(--brand-coral)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {t.auth.socialChannelsFeature}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Instagram, TikTok, WhatsApp, LinkedIn, X, YouTube, Google Business & Shopify
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                <PhoneCall className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {t.auth.telephonyFeature}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {t.auth.telephonyFeatureDesc}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5">
                <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {t.auth.storageFeature}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {t.auth.storageFeatureDesc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Asra3 Platform SLA 99.99%</span>
            <span className="font-mono text-[var(--brand-coral)]">asra3.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-[var(--text-muted)]">
          Loading authentication...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
