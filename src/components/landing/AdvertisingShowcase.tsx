'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  Megaphone,
  Sliders,
  BarChart3,
  Layers,
  Zap,
  Target,
  ArrowUpRight,
} from 'lucide-react';

const AD_NETWORKS = [
  { name: 'Meta Ads', icon: 'f', color: '#1877F2', tag: 'FB & IG CAPI' },
  { name: 'Google Ads', icon: 'G', color: '#4285F4', tag: 'Search & PMax' },
  { name: 'TikTok Ads', icon: 'TT', color: '#000000', tag: 'Spark Ads' },
  { name: 'LinkedIn Ads', icon: 'in', color: '#0A66C2', tag: 'B2B Sponsored' },
  { name: 'X Ads', icon: '𝕏', color: '#000000', tag: 'Engagement' },
  { name: 'Pinterest Ads', icon: 'P', color: '#BD081C', tag: 'Shopping Pins' },
  { name: 'Reddit Ads', icon: 'R', color: '#FF4500', tag: 'Subreddit Promos' },
  { name: 'OpenAI Ads', icon: '✦', color: '#10A37F', tag: 'Sponsored Actions' },
];

export default function AdvertisingShowcase() {
  const { t, locale } = useThemeAndLocale();
  const copy = getLandingCopy(locale).adsShowcase;

  const [activeTab, setActiveTab] = useState<'launch' | 'moderate' | 'report'>('launch');
  const [dailyBudget, setDailyBudget] = useState<number>(250);
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({
    meta: true,
    google: true,
    tiktok: true,
    linkedin: false,
  });

  const toggleCampaign = (id: string) => {
    setActiveToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="ads" className="scroll-mt-24 space-y-10 py-8">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
          <Megaphone className="h-3.5 w-3.5" />
          <span>{t.showcase.adsEyebrow}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t.showcase.adsTitle}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {t.showcase.adsSubtitle}
        </p>
      </div>

      {/* Main 3-Tab Card */}
      <div className="luxury-card mx-auto max-w-5xl rounded-3xl p-6 sm:p-10 space-y-8">
        {/* Tab Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab('launch')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'launch'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{copy.tab1}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('moderate')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'moderate'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{copy.tab2}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>{copy.tab3}</span>
            </button>
          </div>

          {/* CAPI Telemetry Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.capiBadge}</span>
          </div>
        </div>

        {/* Tab 1 Content: Launch (Campaign -> Ad Set -> Ad) */}
        {activeTab === 'launch' && (
          <div className="space-y-6 text-start">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {copy.launchTitle}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {copy.launchSub}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {AD_NETWORKS.slice(0, 5).map((net) => (
                  <span
                    key={net.name}
                    dir="ltr"
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)]"
                  >
                    {net.name}
                  </span>
                ))}
                <span className="text-[11px] text-[var(--text-muted)] font-bold">
                  {copy.moreNetworks}
                </span>
              </div>
            </div>

            {/* Tree View of Hierarchy */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-5 space-y-4">
              {/* Level 1: Campaign */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--brand-coral)] text-white flex items-center justify-center font-bold text-xs">
                    C1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {copy.campaignTitle}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {copy.campaignSub}
                    </div>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-bold">
                  {copy.activeBadge}
                </span>
              </div>

              {/* Level 2: Ad Sets (Indented) */}
              <div className="ms-4 sm:ms-6 space-y-3 border-s-2 border-[var(--brand-coral)]/40 ps-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span>{copy.adSet1Title}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {copy.adSet1Sub}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    <span dir="ltr">$150.00</span> {copy.perDay}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3.5 shadow-2xs">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Target className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      <span>{copy.adSet2Title}</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {copy.adSet2Sub}
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    <span dir="ltr">$100.00</span> {copy.perDay}
                  </span>
                </div>
              </div>

              {/* Level 3: Ad Creatives */}
              <div className="ms-8 sm:ms-12 space-y-2 border-s-2 border-emerald-500/40 ps-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-500/10 text-rose-600 px-2 py-0.5 text-[10px] font-bold">
                      {copy.creativeA}
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {copy.creativeAText}
                    </span>
                  </div>
                  <span dir="ltr" className="text-[11px] font-mono text-emerald-600 font-bold">
                    5.8x ROAS
                  </span>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-500/10 text-blue-600 px-2 py-0.5 text-[10px] font-bold">
                      {copy.creativeB}
                    </span>
                    <span className="text-[var(--text-primary)] font-medium">
                      {copy.creativeBText}
                    </span>
                  </div>
                  <span dir="ltr" className="text-[11px] font-mono text-emerald-600 font-bold">
                    4.6x ROAS
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Moderate (Live Budget Automation Sliders) */}
        {activeTab === 'moderate' && (
          <div className="space-y-6 text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {copy.moderateTitle}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {copy.moderateSub}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)] font-bold">
                  {copy.totalDailyLabel}
                </span>
                <span
                  dir="ltr"
                  className="font-mono text-lg font-extrabold text-[var(--brand-coral)]"
                >
                  ${dailyBudget * 2 + 100}.00
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'meta',
                  name: 'Meta Ads (Facebook & Instagram Feed/Reels)',
                  spend: '$180.40',
                  roas: '5.2x',
                  status: activeToggles.meta,
                },
                {
                  id: 'google',
                  name: 'Google Ads (Search & Performance Max)',
                  spend: '$124.80',
                  roas: '4.9x',
                  status: activeToggles.google,
                },
                {
                  id: 'tiktok',
                  name: 'TikTok Ads (Spark Video & In-Feed)',
                  spend: '$94.20',
                  roas: '4.4x',
                  status: activeToggles.tiktok,
                },
                {
                  id: 'linkedin',
                  name: 'LinkedIn Ads (B2B Sponsored Content)',
                  spend: '$45.00',
                  roas: '3.8x',
                  status: activeToggles.linkedin,
                },
              ].map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      dir="ltr"
                      onClick={() => toggleCampaign(row.id)}
                      className={`h-6 w-11 shrink-0 rounded-full p-1 transition cursor-pointer ${
                        row.status ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-700'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full bg-white transition transform ${
                          row.status ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <div dir="ltr" className="text-xs font-bold text-[var(--text-primary)]">
                        {row.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {copy.spentTodayLabel}{' '}
                        <strong dir="ltr" className="text-[var(--text-primary)]">
                          {row.spend}
                        </strong>{' '}
                        • {copy.targetRoasLabel}{' '}
                        <strong dir="ltr">{row.roas}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <input
                        type="range"
                        min="50"
                        max="1000"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(Number(e.target.value))}
                        className="w-full accent-[var(--brand-coral)] cursor-pointer"
                      />
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] min-w-[78px] text-end">
                      <span dir="ltr">${dailyBudget}</span>
                      {copy.perDay}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3 Content: Report (Unified ROAS Sparklines) */}
        {activeTab === 'report' && (
          <div className="space-y-6 text-start">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  {copy.reportTitle}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {copy.reportSub}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {copy.blendedRoasBadge}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                  {copy.metricSpend}
                </div>
                <div dir="ltr" className="text-xl font-extrabold text-[var(--text-primary)]">
                  $7,960
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span>{copy.metricSpendSub}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                  {copy.metricRev}
                </div>
                <div dir="ltr" className="text-xl font-extrabold text-[var(--brand-coral)]">
                  $38,420
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                  <span>{copy.metricRevSub}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                  {copy.metricCpa}
                </div>
                <div dir="ltr" className="text-xl font-extrabold text-[var(--text-primary)]">
                  $12.40
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  {copy.metricCpaSub}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-1">
                <div className="text-[11px] text-[var(--text-muted)] font-semibold">
                  {copy.metricConv}
                </div>
                <div className="text-xl font-extrabold text-emerald-600">
                  {copy.metricConvVal}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {copy.metricConvSub}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { network: 'Meta Ads', spend: '$3,200', rev: '$16,640', roas: '5.2x', width: '85%' },
                { network: 'Google Ads', spend: '$2,400', rev: '$11,760', roas: '4.9x', width: '78%' },
                { network: 'TikTok Ads', spend: '$1,400', rev: '$6,160', roas: '4.4x', width: '68%' },
                { network: 'OpenAI & Reddit Ads', spend: '$960', rev: '$3,860', roas: '4.0x', width: '55%' },
              ].map((item) => (
                <div
                  key={item.network}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-2 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span dir="ltr" className="font-bold text-[var(--text-primary)]">
                      {item.network}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[var(--text-muted)]">
                        {copy.spendLabel} <strong dir="ltr">{item.spend}</strong>
                      </span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        {copy.revLabel} <strong dir="ltr">{item.rev}</strong>
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded"
                      >
                        {item.roas} ROAS
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--brand-coral)] to-emerald-500"
                      style={{ width: item.width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Link */}
        <div className="pt-2 text-center border-t border-[var(--border-subtle)]">
          <Link
            href="/dashboard?tab=ads"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-coral)] hover:underline"
          >
            <span>{copy.footerCta}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
