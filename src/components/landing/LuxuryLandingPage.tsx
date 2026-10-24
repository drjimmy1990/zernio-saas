'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  ALL_SUB_SERVICES,
  type SubServiceKey,
} from '@/types/platform';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Link2,
  Send,
  MessageSquare,
  BarChart3,
  Megaphone,
  PhoneCall,
  ShoppingBag,
  Bot,
  Layers,
} from 'lucide-react';

import HeroStage from '@/components/landing/HeroStage';
import { launchCopy } from '@/components/landing/launch-copy';
import PlatformShowcase from '@/components/landing/PlatformShowcase';
import TelephonyBentoShowcase from '@/components/landing/TelephonyBentoShowcase';
import GiantBrandFooter from '@/components/landing/GiantBrandFooter';

const SUB_SERVICE_ICONS: Record<
  SubServiceKey,
  React.ComponentType<{ className?: string }>
> = {
  core_connect: Link2,
  publishing: Send,
  inbox_crm: MessageSquare,
  analytics: BarChart3,
  ads: Megaphone,
  telephony: PhoneCall,
  commerce_local: ShoppingBag,
  support_ai: Bot,
};

const SUB_SERVICE_ENDPOINTS: Record<SubServiceKey, string> = {
  core_connect: 'POST /api/connect',
  publishing: 'POST /api/publishing',
  inbox_crm: 'POST /v1/inbox/messages',
  analytics: 'GET /api/reports',
  ads: 'POST /v1/ads/campaigns',
  telephony: 'POST /api/phone-lifecycle',
  commerce_local: 'POST /v1/commerce/sync',
  support_ai: 'POST /v1/ai/diagnose',
};

export default function LuxuryLandingPage() {
  const { t: dictionary, dir, locale } = useThemeAndLocale();
  const t = launchCopy(dictionary, locale === 'ar');
  const ar = locale === 'ar';
  const landingCopy = {...getLandingCopy(locale), howItWorks:{eyebrow:ar?'العمل اليومي':'Daily work',title:ar?'سجّل، راجع، وتابع':'Record, review and follow up',subtitle:ar?'إجراءات يدوية واضحة داخل مساحة عملك.':'Clear manual actions inside your workspace.',steps:[{stepNum:'01',badge:ar?'العملاء':'Customers',title:ar?'سجّل بيانات العملاء':'Record customer data',desc:ar?'أضف الهويات والحقول والملاحظات وموافقة التواصل.':'Add identities, fields, notes and communication consent.',highlights:[],ctaHref:'/dashboard',ctaText:ar?'فتح العملاء':'Open contacts'},{stepNum:'02',badge:ar?'القنوات':'Channels',title:'Facebook · Instagram · TikTok · WhatsApp',desc:ar?'اربط حساباتك وراجع الردود والمحتوى قبل التنفيذ.':'Connect accounts and review replies and content before execution.',highlights:[],ctaHref:'/dashboard?tab=core_connect',ctaText:ar?'مراجعة الحسابات':'Review accounts'},{stepNum:'03',badge:ar?'المتابعة':'Follow-up',title:ar?'راجع التقارير والحملات':'Review reports and campaigns',desc:ar?'النتائج الفعلية والموافقة الحالية تحدد الإرسال.':'Actual results and current consent guide sending.',highlights:[],ctaHref:'/dashboard?tab=inbox_crm',ctaText:ar?'فتح مساحة العمل':'Open workspace'}]}};

  const [selectedService, setSelectedService] =
    useState<SubServiceKey>('core_connect');

  const existingSvc = t.subServicesSection.services[selectedService];
  const activeSvc = {...existingSvc, tagline: ar ? 'أدوات يدوية للقنوات الحالية؛ الإتاحة حسب صلاحيات المزود.' : 'Manual tools for current channels; availability follows provider permissions.', bullets: selectedService==='core_connect' ? [ar?'ربط Facebook وInstagram وTikTok وWhatsApp بحسابات مساحة العمل':'Connect Facebook, Instagram, TikTok and WhatsApp to workspace accounts', ar?'حالة اتصال فعلية وإعادة ربط عند الحاجة':'Actual connection health and reconnection when required'] : selectedService==='analytics' ? [ar?'تقارير النشاط المتاحة؛ البيانات المفقودة غير متاحة':'Available activity reports; missing data remains unavailable'] : existingSvc.bullets};
  const ActiveIcon = SUB_SERVICE_ICONS[selectedService];
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 overflow-hidden">
      {/* 1. HERO & OMNICHANNEL STAGE */}
      <HeroStage />

      {/* 2. HOW IT WORKS IN 3 GUIDED STEPS (ARCHITECTURAL JOURNEY) */}
      <section className="space-y-10 py-4">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
            <Layers className="h-3.5 w-3.5" />
            <span>{landingCopy.howItWorks.eyebrow}</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {landingCopy.howItWorks.title}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {landingCopy.howItWorks.subtitle}
          </p>
        </div>

        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          {landingCopy.howItWorks.steps.map((step) => (
            <div
              key={step.stepNum}
              className="luxury-card luxury-card-interactive relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 text-start"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-xl bg-[var(--brand-coral-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-coral)]">
                    {step.badge}
                  </span>
                  <span
                    dir="ltr"
                    className="font-mono text-2xl font-extrabold text-[var(--brand-coral)]/25"
                  >
                    {step.stepNum}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-[var(--text-primary)] leading-snug">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.desc}
                </p>

                <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                  {step.highlights.filter(h => !/automat|auto-|ads|commerce|تلقائ|أتمت|إعلان|متجر/i.test(h)).map((h) => (
                    <div
                      key={h}
                      className="flex items-start gap-2 text-xs text-[var(--text-primary)]"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[var(--brand-coral)] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <Link
                  href={step.ctaHref}
                  className="inline-flex w-full items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)] hover:bg-[var(--brand-coral)] hover:text-white cursor-pointer"
                >
                  <span>{step.ctaText}</span>
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INTERACTIVE 18-PLATFORM SHOWCASE WITH MINI UI MOCKUPS */}
      <PlatformShowcase />

      {/* 4. TELEPHONY BENTO & COUNTRY-NUMBER FINDER SHOWCASE */}
      <TelephonyBentoShowcase />

      {/* 5. ASYMMETRIC SPLIT 8 SUB-SERVICES ARCHITECTURE EXPLORER */}
      <section className="space-y-10 py-6">
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--brand-coral)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.subServicesSection.eyebrow}</span>
          </span>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] sm:text-4xl">
            {ar ? 'أدوات مساحة العمل الحالية' : 'Current workspace tools'}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            {ar ? 'أدوات العملاء والرسائل والنشر والتقارير للقنوات الحالية.' : 'Customer, messaging, publishing and report tools for current channels.'}
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Vertical Selector (4 cols) */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
            {ALL_SUB_SERVICES.filter(key => !['ads','commerce_local','support_ai'].includes(key)).map((key) => {
              const Icon = SUB_SERVICE_ICONS[key];
              const item = t.subServicesSection.services[key];
              const active = selectedService === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedService(key)}
                  className={`flex items-center gap-3 rounded-2xl border p-3.5 text-start text-xs font-bold transition cursor-pointer ${
                    active
                      ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)] text-white shadow-md shadow-[var(--brand-coral)]/20'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-coral)]/40 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.shortTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Active Sub-Service Architectural Stage (8 cols) */}
          <div className="lg:col-span-8 luxury-card rounded-3xl p-6 sm:p-9 text-start space-y-6">
            <div className="flex flex-col justify-between gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-start">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]">
                  <ActiveIcon className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <span
                    dir="ltr"
                    className="inline-block rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--brand-coral)]"
                  >
                    {selectedService === 'inbox_crm' ? 'Manual CRM · /api/crm' : SUB_SERVICE_ENDPOINTS[selectedService]}
                  </span>
                  <h3 className="text-xl font-extrabold text-[var(--text-primary)] sm:text-2xl">
                    {selectedService === 'inbox_crm' ? (locale === 'ar' ? 'العملاء والرسائل اليدوية' : 'Manual CRM and inbox') : activeSvc.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {selectedService === 'inbox_crm' ? (locale === 'ar' ? 'بيانات دائمة وموافقات محفوظة؛ الأتمتة قريباً.' : 'Durable customer data and recorded consent; automation is coming soon.') : activeSvc.tagline}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {(selectedService === 'inbox_crm' ? [locale === 'ar' ? 'هويات متعددة وحقول ووسوم وملاحظات وموافقة لكل عميل' : 'Multiple identities, fields, tags, notes and consent per customer', locale === 'ar' ? 'محادثات وتعليقات ومراجعة حملات واتساب يدوياً' : 'Manual conversations, comments and reviewed WhatsApp campaigns'] : activeSvc.bullets.filter(bullet => !/automat|auto-|18|threads|polls|تلقائ|أتمت/i.test(bullet))).map((bullet) => (
                <div
                  key={bullet}
                  className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-page)] p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-coral)]" />
                  <span className="text-xs sm:text-sm leading-relaxed text-[var(--text-primary)]">
                    {bullet}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/dashboard?tab=${selectedService}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-coral)] px-5 py-3 text-xs font-bold text-white transition hover:bg-[var(--accent-hover)] cursor-pointer shadow-sm"
              >
                <span>{t.subServicesSection.openInWorkspace}</span>
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/docs#${selectedService}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-3 text-xs font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 cursor-pointer"
              >
                <span>{t.subServicesSection.viewApiDocs}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE 8-NETWORK ADVERTISING SHOWCASE */}
      <section id="ads" className="mx-auto max-w-5xl border-y border-[var(--border-subtle)] py-8 text-center"><h2 className="text-xl font-semibold">{locale === 'ar' ? 'الإعلانات والتجارة والأتمتة — قريباً' : 'Advertising, commerce and automation — Coming soon'}</h2></section>

      {/* 7. DARK-INK DEVELOPER & AI AGENT HUB (8 SDKS, MCP, CLI) */}
      <div id="developers" className="scroll-mt-24">
        <p className="text-center text-sm">{locale === 'ar' ? 'وثائق REST متاحة. أمثلة الكتالوج المتقدمة ليست ضماناً لإتاحة الوظائف.' : 'REST documentation is available. Advanced catalog examples do not guarantee feature availability.'} <Link href="/docs" className="underline">{locale === 'ar' ? 'عرض الوثائق' : 'View documentation'}</Link></p>
      </div>

      {/* 8. GIANT OUTLINED BRAND TYPOGRAPHY, 4-TIER PRICING, FAQ & FOOTER */}
      <GiantBrandFooter />
    </div>
  );
}
