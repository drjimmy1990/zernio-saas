'use client';
import { launchCopy } from './launch-copy';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  HelpCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Asra3Logo } from '@/components/Asra3Logo';

export default function GiantBrandFooter() {
  const { t: dictionary, dir, locale } = useThemeAndLocale();
  const t = launchCopy(dictionary, locale === 'ar');
  const originalCopy = getLandingCopy(locale).footer;
  const ar = locale === 'ar';
  const copy = {
    ...originalCopy,
    col1Title: ar ? 'أدوات العمل الحالية' : 'Current workspace tools',
    col1Links: [ar ? 'ربط Facebook وInstagram وTikTok وWhatsApp' : 'Connect Facebook, Instagram, TikTok and WhatsApp', ar ? 'النشر والجدولة المدعومان' : 'Supported publishing and scheduling', ar ? 'العملاء والمحادثات اليدوية' : 'Manual customers and conversations', ar ? 'الإعلانات — قريباً' : 'Advertising — Coming soon'],
    col2Title: ar ? 'الأرقام والمراسلة' : 'Numbers and messaging',
    col2Links: [ar ? 'أرقام المزود حسب التوافر والموافقة' : 'Provider numbers subject to availability and approval', ar ? 'ربط واتساب للأرقام المؤهلة' : 'WhatsApp connection for eligible numbers', ar ? 'المكالمات اليدوية المدعومة' : 'Supported manual calls', ar ? 'رسائل SMS مع المراجعة والموافقة' : 'Reviewed SMS with consent'],
    col3Title: ar ? 'الوثائق ومساحة العمل' : 'Documentation and workspace',
    col3Links: [ar ? 'الوثائق وإتاحة الموارد' : 'Documentation and resource availability', ar ? 'دليل عمليات REST اليدوية' : 'Manual REST operation guide', ar ? 'مواصفات API وحدود الإتاحة' : 'API specifications and availability limits', ar ? 'مساحة العمل والتقارير' : 'Workspace and reports'],
    col4Title: ar ? 'روابط الاكتشاف العامة' : 'Public discovery links',
    col4Links: [ar ? 'ملخص المنتج الاختياري llms.txt' : 'Optional product summary: llms.txt', 'sitemap.xml', 'robots.txt', ar ? 'الإتاحة حسب الحساب وصلاحيات المزود' : 'Availability follows account and provider permissions'],
    statusText: ar ? 'الأدوات اليدوية الحالية؛ الإتاحة حسب المزود' : 'Current manual tools; availability depends on the provider',
  };
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
          <div className="space-y-4 pt-4">
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {ar ? 'اتفق مع الإدارة على تفاصيل الدفع. يُضاف رصيدك بعد التحقق من استلام الدفعة فقط. الدفع الإلكتروني داخل الموقع غير متاح حالياً.' : 'Arrange payment details directly with the administrator. Your balance is credited only after payment receipt is verified. Online checkout is currently unavailable.'}
            </p>
            <a href="mailto:support@asra3.com" className="btn-premium-primary inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-5 py-3 text-sm font-bold text-white cursor-pointer">
              <span>{ar ? 'تواصل معنا' : 'Contact us'}</span>
              <span dir="ltr">support@asra3.com</span>
            </a>
          </div>
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
          {locale==='ar'?'عملاء ومحادثات ونشر وحملات واتساب يدوية. الأتمتة قريباً.':'Manual customers, conversations, publishing and WhatsApp campaigns. Automation is coming soon.'}
        </div>
      </section>

      {/* 4. STRUCTURED FOOTER WITH SEO / GEO / AEO NAVIGATION */}
      <footer className="border-t border-[var(--border-subtle)] pt-12 pb-8 text-xs text-[var(--text-secondary)] space-y-8">
        <a href="mailto:support@asra3.com" className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-coral)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand-coral)]">
          <span>{ar ? 'تواصل معنا' : 'Contact us'}</span>
          <span dir="ltr" className="underline underline-offset-4">support@asra3.com</span>
        </a>
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
                  href="#ads"
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
                  href="/docs"
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
