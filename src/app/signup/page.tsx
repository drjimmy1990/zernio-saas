'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import {
  UserPlus,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Code2,
} from 'lucide-react';

function SignUpFormContent() {
  const router = useRouter();
  const { t, locale, dir } = useThemeAndLocale();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get('plan') || 'growth';

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [planKey, setPlanKey] = useState<string>(initialPlan);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
          planKey,
          primaryColor: '#eb3514',
          language: locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create account');
        return;
      }
      router.push(
        data.redirectTo || `/dashboard?org=${data.tenant.organizationId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl py-6 text-[var(--text-primary)]">
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Clean, Simple Sign Up Form */}
        <div className="luxury-card p-6 sm:p-8 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.auth.signUpBadge}</span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl">
            {t.auth.signupTitle}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
            {t.auth.signupSubtitle}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.auth.fullNamePlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.emailLabel}
                </label>
                <input
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
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.companyLabel}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t.auth.companyNamePlaceholder}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                  {t.auth.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1.5 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Simple Plan Selector */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)]">
                {t.auth.selectPlanLabel}
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  {
                    key: 'starter',
                    label: t.pricingSection.plans.starter.name,
                    price: '$29',
                  },
                  {
                    key: 'growth',
                    label: t.pricingSection.plans.growth.name,
                    price: '$79',
                  },
                  {
                    key: 'agency_pro',
                    label: t.pricingSection.plans.agency.name,
                    price: '$199',
                  },
                  {
                    key: 'enterprise',
                    label: t.pricingSection.plans.enterprise.name,
                    price: '$499',
                  },
                ].map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setPlanKey(tier.key)}
                    className={`rounded-xl border p-3 text-start transition ${
                      planKey === tier.key
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="text-xs font-bold">{tier.label}</div>
                    <div className="mt-0.5 font-mono text-xs font-extrabold">
                      {tier.price}
                      {t.pricingSection.perMonth}
                    </div>
                  </button>
                ))}
              </div>
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

        {/* Right Column: What You Get Immediately */}
        <div className="space-y-5 lg:col-span-5">
          <div className="luxury-card p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {t.auth.whatYouGetTitle}
            </h2>

            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {t.auth.whatYouGet1}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {t.auth.whatYouGet2}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>
                  {t.auth.whatYouGet3}
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
