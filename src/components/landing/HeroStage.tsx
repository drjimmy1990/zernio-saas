'use client';
import { launchCopy } from './launch-copy';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Terminal,
  CheckCircle2,
  BookOpen,
  Layers,
  Radio,
  Cpu,
  PhoneCall,
} from 'lucide-react';
import { Asra3Mark } from '@/components/Asra3Logo';

export default function HeroStage() {
  const { t: dictionary, dir, locale } = useThemeAndLocale();
  const t = launchCopy(dictionary, locale === 'ar');
  const copy = {...getLandingCopy(locale).heroExtra, agentReadyLabel:locale==='ar'?'REST مع مراجعة يدوية':'REST with manual review', windowConnectedBadge:locale==='ar'?'مثال توضيحي':'Illustrative example',stat1Value:'1',stat2Value:'3',stat2Sub:'Facebook · Instagram · WhatsApp',stat3Value:'Manual',stat3Sub:locale==='ar'?'الأتمتة قريباً':'Automation — Coming soon',stat4Value:'EN / AR',radarCards:{igTitle:'Instagram',igStatus:locale==='ar'?'مراجعة يدوية':'Manual review',ttTitle:'Facebook',ttStatus:locale==='ar'?'مراجعة يدوية':'Manual review',liTitle:locale==='ar'?'العملاء':'Manual CRM',liStatus:locale==='ar'?'بيانات دائمة':'Durable data',waTitle:'WhatsApp',waStatus:locale==='ar'?'موافقة ومراجعة':'Consent and review'},radarFooter:locale==='ar'?'نماذج توضيحية؛ النتائج الفعلية من المزود.':'Illustrative previews; actual results come from the provider.'};

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const agentPromptText = 'Read https://asra3.com/docs for reviewed manual REST operations. Use a current asra3_ workspace key. Preserve tenant ownership, consent and idempotency. Automation, payments, advertising and commerce are coming soon.';
  const codeSnippet = `const response = await fetch('/api/publishing', {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({action: 'create', isDraft: true,
    idempotencyKey: crypto.randomUUID(), content: 'Our new collection',
    platforms: [{platform: 'facebook', accountId: 'OWNED_ACCOUNT_ID'}]})
});
const result = await response.json(); // Review the returned real status`;
  const copyToClipboard = (text: string, type: 'code' | 'prompt') => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedPrompt(true);
        setToastMessage(t.showcase.promptCopiedToast);
        setTimeout(() => {
          setCopiedPrompt(false);
          setToastMessage(null);
        }, 3000);
      }
    }
  };

  const agentBadges = [
    { name: 'Claude Code', tag: copy.agentTags.cli },
    { name: 'Cursor', tag: copy.agentTags.composer },
    { name: 'Codex / GPT-4o', tag: copy.agentTags.actions },


  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 bg-architectural-grid pt-8 pb-12 sm:pt-12 sm:pb-16 px-4 sm:px-8 shadow-[var(--shadow-luxury)]">
      {/* Warm-coral blurred architectural arch backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[980px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--brand-coral)_0%,_rgba(235,53,20,0.16)_42%,_transparent_72%)] opacity-30 blur-3xl dark:opacity-25"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-[var(--bg-card)] px-5 py-2.5 text-xs font-semibold text-emerald-600 shadow-2xl backdrop-blur-md dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative mx-auto max-w-6xl space-y-8 text-center">
        {/* Top Announcement Pill */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-4 py-1.5 text-xs font-semibold text-[var(--brand-coral)] shadow-2xs backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-coral)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-coral)]" />
          </span>
          <span className="font-bold">{t.hero.badge}</span>
          <span className="hidden sm:inline-block opacity-40">•</span>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 font-extrabold underline underline-offset-4 hover:opacity-80"
          >
            <span>{copy.specLink}</span>
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </div>

        {/* High-Impact Editorial Headline */}
        <div className="mx-auto max-w-4xl space-y-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl lg:text-[3.5rem] sm:leading-[1.16]">
            {t.hero.titlePart1}{' '}
            <span className="bg-gradient-to-r from-[var(--brand-coral)] via-rose-500 to-amber-600 bg-clip-text text-transparent">
              {t.hero.titleHighlight}
            </span>{' '}
            {t.hero.titlePart2}
          </h1>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {t.hero.subtitle}
          </p>
        </div>

        {/* Primary Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-1">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2.5 rounded-2xl bg-[var(--brand-coral)] px-7 py-4 text-sm font-bold text-white shadow-xl shadow-[var(--brand-coral)]/25 transition hover:bg-[var(--accent-hover)] hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{t.hero.ctaStart}</span>
            <ArrowIcon className="h-4 w-4" />
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-4 text-sm font-bold text-[var(--text-primary)] shadow-sm transition hover:border-[var(--brand-coral)]/40 hover:text-[var(--brand-coral)] cursor-pointer"
          >
            <Layers className="h-4 w-4 text-[var(--brand-coral)]" />
            <span>{t.hero.ctaWorkspace}</span>
          </Link>

          <a
            href="#telephony"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-4 text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--brand-coral)]/40 cursor-pointer"
          >
            <PhoneCall className="h-4 w-4 text-[var(--brand-coral)]" />
            <span>{getLandingCopy(locale).navAnchors.telephony}</span>
          </a>

          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-5 py-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] cursor-pointer"
          >
            <BookOpen className="h-4 w-4 text-[var(--brand-coral)]" />
            <span>{t.hero.ctaDocs}</span>
          </Link>
        </div>

        {/* AI Agent Compatibility Bar with 1-Click Copy Setup Prompt */}
        <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-3.5 sm:p-4 backdrop-blur-md shadow-sm">
          <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <Cpu className="h-4 w-4 text-[var(--brand-coral)]" />
                <span>{copy.agentReadyLabel}</span>
              </span>
              {agentBadges.map((badge) => (
                <span
                  key={badge.name}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
                >
                  <span dir="ltr" className="font-bold text-[var(--text-primary)]">
                    {badge.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    • {badge.tag}
                  </span>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(agentPromptText, 'prompt')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--brand-coral)]/40 bg-[var(--brand-coral-soft)] px-4 py-2 text-xs font-bold text-[var(--brand-coral)] transition hover:bg-[var(--brand-coral)] hover:text-white cursor-pointer"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>{t.showcase.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t.showcase.copyPrompt}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Split macOS Showcase Window (POST /v1/posts + Live Radar Orbit) */}
        <div className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
          {/* macOS Title Bar */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-3 text-xs">
            <div dir="ltr" className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
              <span className="ms-2 font-mono text-[11px] text-[var(--text-muted)] hidden sm:inline">
                asra3.com — POST /v1/posts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{copy.windowConnectedBadge}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x rtl:lg:divide-x-reverse divide-[var(--border-subtle)]">
            {/* Pane 1: Code Editor */}
            <div
              dir="ltr"
              className="lg:col-span-6 bg-[#0e0d0c] p-5 sm:p-6 text-start font-mono text-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-white/50">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-[var(--brand-coral)]" />
                    <span className="text-[11px] text-white/80 font-semibold">
                      reviewed-draft.ts
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(codeSnippet, 'code')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] text-white/90 hover:bg-white/20 transition cursor-pointer"
                  >
                    {copiedCode ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedCode ? copy.copiedBtn : copy.copyBtn}</span>
                  </button>
                </div>

                <pre className="mt-4 overflow-x-auto text-[11px] sm:text-xs leading-relaxed text-slate-200">
                  <code>{codeSnippet}</code>
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>Illustrative draft request</span>
                <span className="text-emerald-400 font-semibold">Review the returned status</span>
              </div>
            </div>

            {/* Pane 2: Concentric Radar Pulse + Non-Overlapping 2x2 Live Channel Matrix */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-[var(--bg-subtle)]/50 p-5 sm:p-6">
              {/* Radar Center Hub */}
              <div className="relative mx-auto my-2 flex h-40 w-40 items-center justify-center">
                <div className="absolute h-40 w-40 rounded-full border border-[var(--brand-coral)]/20 animate-radar-pulse" />
                <div
                  className="absolute h-28 w-28 rounded-full border border-[var(--brand-coral)]/30 animate-radar-pulse"
                  style={{ animationDelay: '0.9s' }}
                />
                <div
                  className="absolute h-20 w-20 rounded-full border border-[var(--brand-coral)]/40 animate-radar-pulse"
                  style={{ animationDelay: '1.8s' }}
                />
                <div className="relative z-10 flex items-center justify-center">
                  <Asra3Mark size="lg" />
                </div>
              </div>

              {/* Clean 2x2 Channel Delivery Status Grid (Zero Overlap) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                {/* Instagram Card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm text-start flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-xs font-extrabold">
                    IG
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {copy.radarCards.igTitle}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3 shrink-0" />
                      <span className="truncate">{copy.radarCards.igStatus}</span>
                    </div>
                  </div>
                </div>

                {/* TikTok Card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm text-start flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-black text-white flex items-center justify-center text-xs font-extrabold border border-white/15">
                    FB
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {copy.radarCards.ttTitle}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3 shrink-0" />
                      <span className="truncate">{copy.radarCards.ttStatus}</span>
                    </div>
                  </div>
                </div>

                {/* LinkedIn Card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm text-start flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-[#0077b5] text-white flex items-center justify-center text-xs font-extrabold">
                    CRM
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {copy.radarCards.liTitle}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3 shrink-0" />
                      <span className="truncate">{copy.radarCards.liStatus}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Business Card */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm text-start flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-[#25d366] text-white flex items-center justify-center text-xs font-extrabold">
                    WA
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-[var(--text-primary)]">
                      {copy.radarCards.waTitle}
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3 shrink-0" />
                      <span className="truncate">{copy.radarCards.waStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Footer inside Right Pane */}
              <div className="pt-3 border-t border-[var(--border-subtle)] text-center">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {copy.radarFooter}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Executive Metrics (100% Localized) */}
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-4 shadow-2xs space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {copy.stat1Value}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              {t.hero.stat1Label}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-4 shadow-2xs space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-coral)]">
              {copy.stat2Value}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              {copy.stat2Sub}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-4 shadow-2xs space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {copy.stat3Value}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              {copy.stat3Sub}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/90 p-4 shadow-2xs space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--brand-coral)]">
              {copy.stat4Value}
            </div>
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              {t.hero.stat4Label}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
