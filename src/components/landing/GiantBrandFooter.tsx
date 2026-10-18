'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Asra3Logo } from '@/components/Asra3Logo';

export default function GiantBrandFooter() {
  const { t, dir, locale } = useThemeAndLocale();
  const copy = getLandingCopy(locale).footer;
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const pricingTiers = [
    {
      key: 'starter',
      price: 29,
      data: t.pricingSection.plans.starter,
      featured: false,
    },
    {
      key: 'growth',
      price: 79,
      data: t.pricingSection.plans.growth,
      featured: false,
    },
    {
      key: 'agency',
      price: 199,
      data: t.pricingSection.plans.agency,
      featured: true,
    },
    {
      key: 'enterprise',
      price: 499,
      data: t.pricingSection.plans.enterprise,
      featured: false,
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-20 pt-8">
      {/* 1. LUXURY 4-TIER PRICING */}
      <section id="pricing" className="scroll-mt-24 space-y-10">
        <div className="mx-auto max-w-3xl text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-coral)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.pricingSection.eyebrow}</span>
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] sm:text-4xl">
            {t.pricingSection.title}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t.pricingSection.subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <div
              key={tier.key}
              className={`luxury-card flex flex-col justify-between rounded-3xl p-7 transition text-start ${
                tier.featured
                  ? 'ring-2 ring-[var(--brand-coral)] shadow-xl relative'
                  : 'hover:border-[var(--brand-coral)]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {tier.data.name}
                  </h3>
                  {tier.featured && (
                    <span className="rounded-full bg-[var(--brand-coral)] px-3 py-0.5 text-[11px] font-bold text-white shadow-xs shrink-0">
                      {t.pricingSection.popularBadge}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span
                    dir="ltr"
                    className="text-4xl font-extrabold text-[var(--text-primary)]"
                  >
                    ${tier.price}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    {t.pricingSection.perMonth}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {tier.data.desc}
                </p>

                <ul className="mt-6 space-y-3 border-t border-[var(--border-subtle)] pt-6">
                  {tier.data.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2.5 text-xs text-[var(--text-primary)]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-coral)]" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/signup?plan=${tier.key}`}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold transition cursor-pointer shadow-sm ${
                  tier.featured
                    ? 'bg-[var(--brand-coral)] text-white hover:bg-[var(--accent-hover)]'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-muted)] text-[var(--text-primary)] hover:border-[var(--brand-coral)]/40 hover:text-[var(--brand-coral)]'
                }`}
              >
                <span>{t.pricingSection.choosePlan}</span>
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 2. AEO & GEO DIRECT-ANSWER FAQ ACCORDION */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="scroll-mt-24 mx-auto max-w-4xl space-y-8"
      >
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-coral)]">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{t.faqSection.eyebrow}</span>
          </span>
          <h2
            id="faq-heading"
            className="text-2xl font-extrabold text-[var(--text-primary)] sm:text-3xl"
          >
            {t.faqSection.title}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t.faqSection.subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {t.faqSection.items.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={item.q}
                className="luxury-card rounded-2xl transition overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between p-5 text-start font-bold text-sm sm:text-base text-[var(--text-primary)] hover:text-[var(--brand-coral)] transition cursor-pointer gap-3"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[var(--brand-coral)]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-5 py-4 text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)] text-start">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. GIANT OUTLINED BRAND TYPOGRAPHY */}
      <section className="relative overflow-hidden py-10 select-none text-center">
        <div
          dir="ltr"
          className="font-extrabold tracking-widest uppercase text-center text-[12vw] sm:text-[13vw] leading-none text-transparent opacity-30 hover:opacity-50 transition-opacity duration-500"
          style={{
            WebkitTextStroke: '1.5px var(--brand-coral)',
            letterSpacing: '0.08em',
          }}
        >
          ASRA3
        </div>
        <div className="mt-3 text-xs sm:text-sm font-bold tracking-wide text-[var(--text-secondary)]">
          {copy.brandSubtitle}
        </div>
      </section>

      {/* 4. STRUCTURED FOOTER WITH SEO / GEO / AEO NAVIGATION */}
      <footer className="border-t border-[var(--border-subtle)] pt-12 pb-8 text-xs text-[var(--text-secondary)] space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-start">
          {/* Column 1 */}
          <div className="space-y-3">
            <h4 className="font-bold text-[var(--text-primary)] text-xs">
              {copy.col1Title}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/dashboard?tab=core_connect"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col1Links[0]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=publishing"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col1Links[1]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=inbox_crm"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col1Links[2]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=ads"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col1Links[3]}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="space-y-3">
            <h4 className="font-bold text-[var(--text-primary)] text-xs">
              {copy.col2Title}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/dashboard?tab=telephony"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col2Links[0]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=telephony"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col2Links[1]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=telephony"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col2Links[2]}
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard?tab=telephony"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col2Links[3]}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-3">
            <h4 className="font-bold text-[var(--text-primary)] text-xs">
              {copy.col3Title}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/docs" className="hover:text-[var(--brand-coral)] transition">
                  {copy.col3Links[0]}
                </Link>
              </li>
              <li>
                <a
                  href="#developers"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col3Links[1]}
                </a>
              </li>
              <li>
                <Link
                  href="/docs#mcp"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col3Links[2]}
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="hover:text-[var(--brand-coral)] transition"
                >
                  {copy.col3Links[3]}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="space-y-3">
            <h4 className="font-bold text-[var(--text-primary)] text-xs">
              {copy.col4Title}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="/llms.txt"
                  className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {copy.col4Links[0]}
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="font-mono hover:underline">
                  {copy.col4Links[1]}
                </a>
              </li>
              <li>
                <a href="/robots.txt" className="font-mono hover:underline">
                  {copy.col4Links[2]}
                </a>
              </li>
              <li>
                <span className="text-[var(--text-muted)]">{copy.col4Links[3]}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center">
              <Asra3Logo size="sm" showDomainBadge={false} />
            </Link>
            <span className="hidden sm:inline text-[var(--border-subtle)]">|</span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-[var(--text-primary)]">
                {copy.statusText}
              </span>
            </div>
          </div>

          <div>
            © {new Date().getFullYear()}{' '}
            <strong dir="ltr">Asra3 (asra3.com)</strong> —{' '}
            {copy.copyrightSuffix}
          </div>
        </div>
      </footer>
    </div>
  );
}
