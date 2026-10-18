'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy, type LandingPageCopy } from '@/i18n/landingTranslations';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Zap,
  Play,
  ShoppingBag,
} from 'lucide-react';

type PlatformId =
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'x_threads'
  | 'linkedin_youtube'
  | 'google_shopify';

const PLATFORM_IDS: PlatformId[] = [
  'instagram',
  'tiktok',
  'facebook',
  'x_threads',
  'linkedin_youtube',
  'google_shopify',
];

export default function PlatformShowcase() {
  const { t, locale } = useThemeAndLocale();
  const copy = getLandingCopy(locale).platformShowcase;
  const [activePlatform, setActivePlatform] = useState<PlatformId>('instagram');

  const activeData = copy.platforms[activePlatform];

  return (
    <section id="platforms" className="scroll-mt-24 space-y-10 py-6">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t.showcase.platformEyebrow}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t.showcase.platformTitle}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {t.showcase.platformSubtitle}
        </p>
      </div>

      {/* Platform Navigation Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-2">
        {PLATFORM_IDS.map((pid) => {
          const item = copy.platforms[pid];
          const isActive = activePlatform === pid;
          return (
            <button
              key={pid}
              type="button"
              onClick={() => setActivePlatform(pid)}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'border-[var(--brand-coral)] bg-[var(--brand-coral)] text-white shadow-md shadow-[var(--brand-coral)]/20'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--brand-coral)]/40 hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage for Selected Platform */}
      <div className="luxury-card mx-auto max-w-5xl rounded-3xl p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Details Column */}
          <div className="lg:col-span-5 space-y-5 text-start">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-[var(--brand-coral-soft)] px-2.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
                  {activeData.category}
                </span>
                <span
                  dir="ltr"
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px] font-mono text-[var(--text-muted)]"
                >
                  {activeData.badge}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
                {activeData.name}
              </h3>

              <p className="text-xs font-bold text-[var(--brand-coral)] tracking-wide">
                {activeData.tag}
              </p>

              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {activeData.description}
              </p>

              {/* Platform API Capabilities Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
                {copy.checklists.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-xs text-[var(--text-primary)]"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard?tab=core_connect"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-coral)] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  <span>{copy.connectCta}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* High-Fidelity Mini UI Mockup Column */}
          <div className="lg:col-span-7 flex justify-center">
            {activePlatform === 'instagram' && <InstagramMockup m={copy.mockups} />}
            {activePlatform === 'tiktok' && <TikTokMockup m={copy.mockups} />}
            {activePlatform === 'facebook' && <FacebookMockup m={copy.mockups} />}
            {activePlatform === 'x_threads' && <XThreadsMockup m={copy.mockups} />}
            {activePlatform === 'linkedin_youtube' && (
              <LinkedInYouTubeMockup m={copy.mockups} />
            )}
            {activePlatform === 'google_shopify' && (
              <GoogleShopifyMockup m={copy.mockups} />
            )}
          </div>
        </div>
      </div>

      {/* 18 Platforms Compact Grid Badge Bar */}
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 p-5">
        <div className="text-center text-xs font-bold text-[var(--text-secondary)] mb-3.5">
          {copy.all18Title}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {[
            'Instagram',
            'TikTok',
            'Facebook',
            'YouTube',
            'LinkedIn',
            'X (Twitter)',
            'Threads',
            'WhatsApp Business',
            'Telegram',
            'Discord',
            'Slack',
            'Messenger',
            'Pinterest',
            'Reddit',
            'Snapchat',
            'Bluesky',
            'Google Business',
            'Shopify & WordPress',
          ].map((ch) => (
            <span
              key={ch}
              dir="ltr"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-primary)] shadow-2xs"
            >
              ✓ {ch}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

type MockupStrings = LandingPageCopy['platformShowcase']['mockups'];

/* 1. Instagram Mini UI Mockup */
function InstagramMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl overflow-hidden text-start">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
            <div className="h-full w-full rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] font-bold text-[var(--brand-coral)]">
              TK
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <span dir="ltr">asra3_hq</span>
              <span className="h-3 w-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">
                ✓
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{m.igSponsored}</div>
          </div>
        </div>
        <span
          dir="ltr"
          className="rounded-full bg-[var(--brand-coral-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--brand-coral)]"
        >
          Reel · API
        </span>
      </div>

      {/* Stories Row */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 overflow-x-auto scrollbar-hide">
        {m.igStories.map((story, i) => (
          <div key={story} className="flex flex-col items-center gap-1 shrink-0">
            <div
              className={`h-11 w-11 rounded-full p-0.5 ${
                i === 0
                  ? 'border-2 border-dashed border-[var(--text-muted)]'
                  : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'
              }`}
            >
              <div className="h-full w-full rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
                {story.slice(0, 2)}
              </div>
            </div>
            <span className="text-[9px] text-[var(--text-muted)] truncate max-w-[52px]">
              {story}
            </span>
          </div>
        ))}
      </div>

      {/* Feed Image / Reel Preview */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-slate-900 via-stone-900 to-neutral-950 flex flex-col items-center justify-center text-white p-6">
        <div
          dir="ltr"
          className="absolute top-3 end-3 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono"
        >
          1080 × 1920 HD
        </div>
        <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-2 shadow-lg">
          <Play className="h-6 w-6 fill-white ms-0.5" />
        </div>
        <div className="text-center">
          <div className="text-sm font-bold">{m.igReelTitle}</div>
          <div className="text-[11px] text-white/70">{m.igReelSub}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-[var(--text-primary)]">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500 cursor-pointer" />
            <MessageCircle className="h-5 w-5 cursor-pointer" />
            <Share2 className="h-5 w-5 cursor-pointer" />
          </div>
          <Bookmark className="h-5 w-5 cursor-pointer text-[var(--text-secondary)]" />
        </div>
        <div className="text-xs font-bold text-[var(--text-primary)]">{m.igLikes}</div>
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          <strong dir="ltr" className="text-[var(--text-primary)] me-1">
            asra3_hq
          </strong>{' '}
          {m.igCaption}
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span>{m.igAutoDm}</span>
        </div>
      </div>
    </div>
  );
}

/* 2. TikTok Mini UI Mockup */
function TikTokMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-xs rounded-3xl border border-neutral-800 bg-black text-white shadow-2xl overflow-hidden relative aspect-[9/14] flex flex-col justify-between p-4">
      <div className="flex items-center justify-between text-xs font-bold z-10">
        <span className="text-white/60">{m.ttFollowing}</span>
        <span className="text-white border-b-2 border-white pb-0.5">{m.ttForYou}</span>
        <span className="text-white/60">{m.ttLive}</span>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-neutral-900 to-black flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div
            dir="ltr"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs"
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span>Direct Post API v2</span>
          </div>
          <div className="text-base font-extrabold text-white leading-snug">
            {m.ttVideoTitle}
          </div>
          <div dir="ltr" className="text-xs text-white/70">
            #asra3 #omnichannel #whatsapp #api
          </div>
        </div>
      </div>

      <div className="absolute end-3 bottom-16 flex flex-col items-center gap-3.5 z-10">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-rose-500 bg-neutral-800 flex items-center justify-center text-xs font-bold">
            TH
          </div>
          <span className="absolute -bottom-1 start-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
            +
          </span>
        </div>
        <div className="flex flex-col items-center">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
          <span className="text-[10px] font-bold">1.4M</span>
        </div>
        <div className="flex flex-col items-center">
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="text-[10px] font-bold">52.8K</span>
        </div>
        <div className="flex flex-col items-center">
          <Bookmark className="h-5 w-5 text-amber-400 fill-amber-400" />
          <span className="text-[10px] font-bold">198K</span>
        </div>
        <div className="flex flex-col items-center">
          <Share2 className="h-5 w-5 text-white" />
          <span className="text-[10px] font-bold">88.4K</span>
        </div>
      </div>

      <div className="z-10 text-start space-y-1 pe-14">
        <div dir="ltr" className="text-sm font-bold">
          @asra3.official ✓
        </div>
        <div className="text-xs text-white/90 line-clamp-2">{m.ttCaption}</div>
        <div className="text-[11px] text-white/70">{m.ttAudio}</div>
      </div>
    </div>
  );
}

/* 3. Facebook & Messenger Mini UI Mockup */
function FacebookMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl overflow-hidden text-start p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm">
            f
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1">
              <span>Asra3 Platform</span>
              <span className="h-3 w-3 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px]">
                ✓
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{m.fbTime}</div>
          </div>
        </div>
        <span
          dir="ltr"
          className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600"
        >
          Page Post + CAPI
        </span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-primary)]">{m.fbPostText}</p>

      <div className="flex items-center justify-between border-t border-b border-[var(--border-subtle)] py-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-blue-500 text-white p-0.5 text-[10px]">👍</span>
          <span className="rounded-full bg-rose-500 text-white p-0.5 text-[10px]">❤️</span>
          <span>{m.fbReactions}</span>
        </div>
        <div>{m.fbCommentsShares}</div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-2">
        <div className="flex items-start gap-2 text-xs">
          <div className="h-6 w-6 rounded-full bg-stone-300 dark:bg-stone-700 shrink-0 text-[10px] font-bold flex items-center justify-center">
            JD
          </div>
          <div>
            <span className="font-bold text-[var(--text-primary)]">John: </span>
            <span className="text-[var(--text-secondary)]">{m.fbUserComment}</span>
          </div>
        </div>

        <div className="ms-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2.5 text-[11px] text-emerald-700 dark:text-emerald-300 space-y-1">
          <div className="font-bold flex items-center gap-1">
            <Zap className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>{m.fbAutoDmBadge}</span>
          </div>
          <div>{m.fbAutoDmReply}</div>
        </div>
      </div>
    </div>
  );
}

/* 4. X (Twitter) & Threads Mini UI Mockup */
function XThreadsMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl overflow-hidden text-start p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">𝕏</span>
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            &amp; Threads API
          </span>
        </div>
        <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600">
          {m.xThreadBadge}
        </span>
      </div>

      <div className="flex items-start gap-3 relative">
        <div className="h-9 w-9 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
          T
        </div>
        <div className="absolute start-4.5 top-10 bottom-0 w-0.5 bg-[var(--border-subtle)]" />
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-primary)]">Asra3</span>
            <span dir="ltr" className="text-[var(--text-muted)]">
              @asra3_si • 2h
            </span>
          </div>
          <p className="text-[var(--text-primary)] leading-relaxed">{m.xPost1}</p>
          <div dir="ltr" className="flex items-center gap-5 text-[11px] text-[var(--text-muted)] pt-1">
            <span>💬 48</span>
            <span>🔁 182</span>
            <span>❤️ 1,240</span>
            <span>📊 42K</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 pt-2">
        <div className="h-9 w-9 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shrink-0">
          T
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[var(--text-primary)]">Asra3</span>
            <span dir="ltr" className="text-[var(--text-muted)]">
              @asra3_si • 2h
            </span>
          </div>
          <p className="text-[var(--text-primary)] leading-relaxed">{m.xPost2}</p>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 text-[11px] font-semibold text-[var(--text-secondary)]">
            {m.xCardLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

/* 5. LinkedIn & YouTube Mini UI Mockup */
function LinkedInYouTubeMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl overflow-hidden text-start p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div dir="ltr" className="flex items-center gap-2">
          <span className="font-bold text-[#0077b5] text-xs">LinkedIn Org</span>
          <span className="text-[var(--text-muted)] text-xs">+ YouTube Studio</span>
        </div>
        <span
          dir="ltr"
          className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600"
        >
          8.4% CTR • 4K Upload
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-[#0077b5] text-white flex items-center justify-center font-bold text-sm">
            in
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              Asra3 Group
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{m.liFollowers}</div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
          {m.liPostText}
        </p>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 flex items-center justify-between">
          <div>
            <div dir="ltr" className="text-xs font-bold text-[var(--text-primary)]">
              Enterprise_Architecture.pdf
            </div>
            <div className="text-[10px] text-[var(--text-muted)]">{m.liPdfSub}</div>
          </div>
          <span className="rounded-md bg-[var(--brand-coral)] px-2.5 py-1 text-[10px] font-bold text-white">
            {m.liViewDoc}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-red-500/5 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div dir="ltr" className="flex items-center gap-1.5 font-bold text-red-600">
            <span>▶ YouTube Studio</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">{m.ytMonetized}</span>
        </div>
        <div className="flex items-center justify-between text-xs gap-2">
          <div>
            <div className="font-bold text-[var(--text-primary)]">{m.ytVideoTitle}</div>
            <div className="text-[10px] text-[var(--text-muted)]">{m.ytViews}</div>
          </div>
          <span dir="ltr" className="font-mono text-xs font-bold text-[var(--brand-coral)] shrink-0">
            4K UHD
          </span>
        </div>
      </div>
    </div>
  );
}

/* 6. Google Business & Shopify/WordPress Mini UI Mockup */
function GoogleShopifyMockup({ m }: { m: MockupStrings }) {
  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-xl overflow-hidden text-start p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
        <div dir="ltr" className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#4285F4]">Google Maps</span>
          <span className="text-xs text-[var(--text-muted)]">&amp; Shopify</span>
        </div>
        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
          {m.gmbRating}
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              SA
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Sarah Al-Mansoor
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">{m.gmbGuide}</div>
            </div>
          </div>
          <div className="flex text-amber-400 text-xs">★★★★★</div>
        </div>

        <p className="text-xs text-[var(--text-primary)] leading-relaxed">
          {m.gmbReviewText}
        </p>

        <div className="ms-3 border-s-2 border-blue-500 ps-2.5 pt-1 text-[11px] text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{m.gmbOwnerLabel}</strong>
          {m.gmbOwnerReply}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span dir="ltr" className="font-bold text-[#96bf48] flex items-center gap-1">
            <ShoppingBag className="h-3.5 w-3.5" /> Shopify Sync
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">{m.shopifyStock}</span>
        </div>
        <div className="text-xs text-[var(--text-primary)] leading-relaxed">
          {m.shopifyDesc}
        </div>
      </div>
    </div>
  );
}
