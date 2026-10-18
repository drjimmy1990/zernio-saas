'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLandingCopy } from '@/i18n/landingTranslations';
import {
  Phone,
  PhoneCall,
  PhoneOutgoing,
  MessageSquare,
  Check,
  CheckCheck,
  Radio,
  Globe,
  Mic,
  Volume2,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface CountryNumberOption {
  countryCode: 'SA' | 'AE' | 'EG' | 'US' | 'GB' | 'DE';
  flag: string;
  dialCode: string;
  sampleNumber: string;
  type: 'Local' | 'Mobile' | 'Toll-Free';
  priceAmount: string;
}

const COUNTRY_OPTIONS: CountryNumberOption[] = [
  {
    countryCode: 'SA',
    flag: '🇸🇦',
    dialCode: '+966',
    sampleNumber: '+966 54 819 2041',
    type: 'Mobile',
    priceAmount: '$4.50',
  },
  {
    countryCode: 'AE',
    flag: '🇦🇪',
    dialCode: '+971',
    sampleNumber: '+971 50 721 9402',
    type: 'Mobile',
    priceAmount: '$5.00',
  },
  {
    countryCode: 'EG',
    flag: '🇪🇬',
    dialCode: '+20',
    sampleNumber: '+20 10 9341 8820',
    type: 'Mobile',
    priceAmount: '$3.00',
  },
  {
    countryCode: 'US',
    flag: '🇺🇸',
    dialCode: '+1',
    sampleNumber: '+1 (415) 890-4122',
    type: 'Local',
    priceAmount: '$2.00',
  },
  {
    countryCode: 'GB',
    flag: '🇬🇧',
    dialCode: '+44',
    sampleNumber: '+44 7700 900412',
    type: 'Mobile',
    priceAmount: '$3.50',
  },
  {
    countryCode: 'DE',
    flag: '🇩🇪',
    dialCode: '+49',
    sampleNumber: '+49 1522 349012',
    type: 'Local',
    priceAmount: '$3.80',
  },
];

export default function TelephonyBentoShowcase() {
  const { t, locale } = useThemeAndLocale();
  const copy = getLandingCopy(locale).telephonyShowcase;

  const [selectedCountry, setSelectedCountry] =
    useState<CountryNumberOption['countryCode']>('SA');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Mobile' | 'Local' | 'Toll-Free'>('All');
  const [dialedInput, setDialedInput] = useState<string>('');
  const [isDialing, setIsDialing] = useState<boolean>(false);

  const activeCountry =
    COUNTRY_OPTIONS.find((c) => c.countryCode === selectedCountry) || COUNTRY_OPTIONS[0];

  const displayedType =
    typeFilter === 'All' ? copy.types[activeCountry.type] : copy.types[typeFilter];

  const handleDialKey = (key: string) => {
    if (dialedInput.length < 15) {
      setDialedInput((prev) => prev + key);
    }
  };

  const handleDialClear = () => {
    setDialedInput('');
    setIsDialing(false);
  };

  return (
    <section id="telephony" className="scroll-mt-24 space-y-10 py-8">
      {/* Section Header */}
      <div className="mx-auto max-w-3xl text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-coral)]/30 bg-[var(--brand-coral-soft)] px-3.5 py-1 text-xs font-bold text-[var(--brand-coral)]">
          <Phone className="h-3.5 w-3.5" />
          <span>{t.telephony.eyebrow}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {t.telephony.title}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {t.telephony.subtitle}
        </p>
      </div>

      {/* Part 1: Interactive Country-Number Finder Bar */}
      <div className="luxury-card mx-auto max-w-5xl rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5 text-start">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Globe className="h-5 w-5 text-[var(--brand-coral)] shrink-0" />
              <span>{t.telephony.marketTitle}</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {t.telephony.marketSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-bold">
              {copy.typeLabel}
            </span>
            {(['All', 'Mobile', 'Local', 'Toll-Free'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTypeFilter(filter)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  typeFilter === filter
                    ? 'bg-[var(--brand-coral)] text-white shadow-sm'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {copy.types[filter]}
              </button>
            ))}
          </div>
        </div>

        {/* Country Selector Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {COUNTRY_OPTIONS.map((item) => {
            const isSelected = selectedCountry === item.countryCode;
            return (
              <button
                key={item.countryCode}
                type="button"
                onClick={() => setSelectedCountry(item.countryCode)}
                className={`flex flex-col items-start p-3.5 rounded-2xl border text-start transition cursor-pointer ${
                  isSelected
                    ? 'border-[var(--brand-coral)] bg-[var(--brand-coral-soft)] ring-2 ring-[var(--brand-coral)]/25'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--brand-coral)]/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl">{item.flag}</span>
                  <span className="text-[11px] font-bold text-[var(--brand-coral)]">
                    <span dir="ltr">{item.priceAmount}</span>
                    {copy.perMonthSuffix}
                  </span>
                </div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-1.5 line-clamp-1">
                  {copy.countries[item.countryCode]}
                </div>
                <div dir="ltr" className="text-[11px] text-[var(--text-muted)] font-mono">
                  {item.dialCode}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Country Active Number Showcase Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5 text-start">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-[var(--brand-coral)] text-white flex items-center justify-center font-bold text-xl shadow-sm">
              {activeCountry.flag}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  dir="ltr"
                  className="font-mono text-base sm:text-lg font-extrabold text-[var(--text-primary)]"
                >
                  {activeCountry.sampleNumber}
                </span>
                <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-bold">
                  {copy.availableBadge}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mt-1">
                <span>
                  {copy.numberLabel} {displayedType}
                </span>
                <span>•</span>
                <span className="font-bold text-[var(--brand-coral)]">
                  <span dir="ltr">{activeCountry.priceAmount}</span>
                  {copy.perMonthSuffix}
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {copy.capabilitiesBadge}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <Link
              href={`/dashboard?tab=telephony&buy=${activeCountry.countryCode}`}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-coral)] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              <span>{t.telephony.buyBtn}</span>
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      {/* Part 2: Dedicated 4-Card Bento Grid */}
      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bento 1: WhatsApp Business Broadcast & Live Chat */}
        <div className="luxury-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 text-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366]/15 text-[#1da851] dark:text-[#25d366] px-2.5 py-1 text-xs font-bold">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{copy.bento1.badge}</span>
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {copy.bento1.metaBadge}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {copy.bento1.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {copy.bento1.desc}
            </p>
          </div>

          {/* Authentic WhatsApp Chat UI Mockup */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[#efeae2] dark:bg-[#0b141a] p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[#25d366] text-white flex items-center justify-center font-bold text-[10px]">
                  WA
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                    <span>{copy.bento1.storeName}</span>
                    <span className="text-[10px] text-blue-500">✓</span>
                  </div>
                  <div className="text-[9px] text-neutral-600 dark:text-neutral-400">
                    {copy.bento1.officialAccount}
                  </div>
                </div>
              </div>
              <span
                dir="ltr"
                className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono"
              >
                {activeCountry.sampleNumber}
              </span>
            </div>

            {/* Outbound Broadcast Template */}
            <div className="ms-auto max-w-[88%] rounded-2xl rounded-se-xs bg-[#d9fdd3] dark:bg-[#005c4b] p-3 text-xs shadow-xs text-neutral-900 dark:text-neutral-100 space-y-1">
              <div className="font-bold text-[11px] text-[#075e54] dark:text-[#25d366]">
                {copy.bento1.msg1Title}
              </div>
              <p className="text-[11px] leading-relaxed">{copy.bento1.msg1Body}</p>
              <div
                dir="ltr"
                className="flex items-center justify-end gap-1 text-[9px] text-neutral-500 dark:text-neutral-300"
              >
                <span>10:42 AM</span>
                <CheckCheck className="h-3 w-3 text-sky-500" />
              </div>
            </div>

            {/* Inbound Customer Reply */}
            <div className="me-auto max-w-[82%] rounded-2xl rounded-ss-xs bg-white dark:bg-[#202c33] p-3 text-xs shadow-xs text-neutral-900 dark:text-neutral-100 space-y-1">
              <p className="text-[11px]">{copy.bento1.msg2Body}</p>
              <div dir="ltr" className="text-end text-[9px] text-neutral-400">
                10:43 AM
              </div>
            </div>

            {/* Automated Agent Confirmation */}
            <div className="ms-auto max-w-[88%] rounded-2xl rounded-se-xs bg-[#d9fdd3] dark:bg-[#005c4b] p-3 text-xs shadow-xs text-neutral-900 dark:text-neutral-100 space-y-1">
              <p className="text-[11px]">{copy.bento1.msg3Body}</p>
              <div
                dir="ltr"
                className="flex items-center justify-end gap-1 text-[9px] text-neutral-500 dark:text-neutral-300"
              >
                <span>10:43 AM</span>
                <CheckCheck className="h-3 w-3 text-sky-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Bento 2: AI Voice Agent & Incoming/Active Call Screen */}
        <div className="luxury-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 text-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-coral-soft)] text-[var(--brand-coral)] px-2.5 py-1 text-xs font-bold">
                <Radio className="h-3.5 w-3.5" />
                <span>{copy.bento2.badge}</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-600 font-bold">
                {copy.bento2.latencyBadge}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {copy.bento2.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {copy.bento2.desc}
            </p>
          </div>

          {/* iPhone Call Screen Mockup */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-neutral-950 text-white p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{copy.bento2.activeCall}</span>
              </span>
              <span dir="ltr" className="font-mono font-bold text-white">
                01:42
              </span>
            </div>

            <div className="text-center space-y-1">
              <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-tr from-[var(--brand-coral)] to-rose-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-rose-600/30">
                AI
              </div>
              <div className="text-sm font-bold">{copy.bento2.agentName}</div>
              <div dir="ltr" className="text-xs text-white/60 font-mono">
                {activeCountry.sampleNumber}
              </div>
            </div>

            {/* Audio Waveform Animation Bars */}
            <div className="flex items-center justify-center gap-1.5 h-10 py-1">
              {[4, 12, 24, 18, 28, 14, 26, 20, 8, 22, 16, 6].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-gradient-to-t from-[var(--brand-coral)] to-rose-400 animate-waveform"
                  style={{
                    height: `${h}px`,
                    animationDelay: `${(i % 5) * 0.18}s`,
                  }}
                />
              ))}
            </div>

            {/* Live Dual-Party Transcript Snippet */}
            <div className="rounded-xl bg-white/10 p-3 text-[11px] text-white/90 space-y-1.5">
              <div className="text-white/60 text-[10px]">
                {copy.bento2.transcriptHeader}
              </div>
              <div>
                <strong className="text-[var(--brand-coral)]">
                  {copy.bento2.callerLabel}
                </strong>{' '}
                {copy.bento2.callerText}
              </div>
              <div>
                <strong className="text-emerald-400">{copy.bento2.aiLabel}</strong>{' '}
                {copy.bento2.aiText}
              </div>
            </div>

            {/* Call Action Bar */}
            <div className="flex items-center justify-around pt-1">
              <div className="flex flex-col items-center gap-1 text-[10px] text-white/70">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Mic className="h-4 w-4" />
                </div>
                <span>{copy.bento2.mute}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[10px] text-white/70">
                <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Volume2 className="h-4 w-4" />
                </div>
                <span>{copy.bento2.speaker}</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-[10px] text-white/70">
                <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center text-white">
                  <PhoneOutgoing className="h-4 w-4 rotate-135" />
                </div>
                <span>{copy.bento2.end}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento 3: Interactive Web Phone Softphone Dialer Preview */}
        <div className="luxury-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 text-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 text-blue-600 px-2.5 py-1 text-xs font-bold">
                <PhoneCall className="h-3.5 w-3.5" />
                <span>{copy.bento3.badge}</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {copy.bento3.protocolBadge}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {copy.bento3.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {copy.bento3.desc}
            </p>
          </div>

          {/* Interactive Mini Softphone Keypad */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-3">
            <div
              dir="ltr"
              className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 py-2.5 font-mono text-sm font-bold text-[var(--text-primary)] min-h-[42px]"
            >
              <span>{dialedInput || activeCountry.sampleNumber}</span>
              {dialedInput && (
                <button
                  type="button"
                  onClick={handleDialClear}
                  className="text-xs font-sans font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  {copy.bento3.clearBtn}
                </button>
              )}
            </div>

            {/* 12-Key Pad */}
            <div dir="ltr" className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: '1', sub: '' },
                { k: '2', sub: 'ABC' },
                { k: '3', sub: 'DEF' },
                { k: '4', sub: 'GHI' },
                { k: '5', sub: 'JKL' },
                { k: '6', sub: 'MNO' },
                { k: '7', sub: 'PQRS' },
                { k: '8', sub: 'TUV' },
                { k: '9', sub: 'WXYZ' },
                { k: '*', sub: '' },
                { k: '0', sub: '+' },
                { k: '#', sub: '' },
              ].map((b) => (
                <button
                  key={b.k}
                  type="button"
                  onClick={() => handleDialKey(b.k)}
                  className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--brand-coral-soft)] hover:border-[var(--brand-coral)] transition cursor-pointer"
                >
                  <span className="text-sm">{b.k}</span>
                  {b.sub && (
                    <span className="text-[9px] text-[var(--text-muted)]">{b.sub}</span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsDialing(!isDialing)}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition cursor-pointer shadow-md ${
                isDialing
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <PhoneCall className="h-4 w-4" />
              <span>
                {isDialing ? copy.bento3.callActiveBtn : copy.bento3.callStartBtn}
              </span>
            </button>
          </div>
        </div>

        {/* Bento 4: Live 2-Way SMS & OTP Capture */}
        <div className="luxury-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 text-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 px-2.5 py-1 text-xs font-bold">
                <Check className="h-3.5 w-3.5" />
                <span>{copy.bento4.badge}</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {copy.bento4.routingBadge}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {copy.bento4.title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {copy.bento4.desc}
            </p>
          </div>

          {/* SMS UI Preview */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{copy.bento4.otpHeader}</span>
                </span>
                <span dir="ltr" className="text-[10px] text-[var(--text-muted)] shrink-0">
                  10:41 AM
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)]">
                {copy.bento4.otpBodyPrefix}
                <strong
                  dir="ltr"
                  className="font-mono text-sm text-[var(--brand-coral)]"
                >
                  849201
                </strong>
                {copy.bento4.otpBodySuffix}
              </p>
              <div className="text-[10px] text-[var(--text-muted)]">
                {copy.bento4.receivedOn}{' '}
                <span dir="ltr" className="font-mono font-bold">
                  {activeCountry.sampleNumber}
                </span>
              </div>
            </div>

            <div className="ms-auto max-w-[92%] rounded-xl bg-blue-600 text-white p-3 text-xs space-y-1">
              <p className="leading-relaxed">{copy.bento4.outboundSms}</p>
              <div className="text-end text-[10px] text-blue-200 font-semibold">
                {copy.bento4.delivered}
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/dashboard?tab=telephony"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand-coral)] hover:underline"
              >
                <span>{copy.bento4.openDashboardLink}</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
