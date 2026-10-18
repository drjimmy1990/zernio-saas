'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Megaphone,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  MessageCircle,
  ArrowRight,
  Send,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface SimpleCtwaAdLauncherWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SimpleCtwaAdLauncherWizard({
  isOpen,
  onClose,
  onSuccess,
}: SimpleCtwaAdLauncherWizardProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [targetNumber, setTargetNumber] = useState<string>('+12025550184');
  const [headline, setHeadline] = useState<string>('Chat with Us on WhatsApp — Claim 20% Off!');
  const [greetingMessage, setGreetingMessage] = useState<string>(
    'Hi! I saw your sponsored ad on Instagram and want to claim my 20% discount.'
  );
  const [creativeUrl, setCreativeUrl] = useState<string>(
    'https://images.unsplash.com/photo-1556742049-0a67c5574f73'
  );
  const [dailyBudget, setDailyBudget] = useState<number>(30);

  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchSuccess, setLaunchSuccess] = useState<boolean>(false);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available numbers for target number dropdown
  useEffect(() => {
    if (!isOpen) return;
    const fetchNumbers = async () => {
      try {
        const res = await fetch('/api/v1/phone-numbers');
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTargetNumber(data.data[0].phoneNumber);
        }
      } catch {
        // Fallback default
      }
    };
    void fetchNumbers();
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculators for daily reach and chats
  const estimatedReachMin = Math.round(dailyBudget * 400);
  const estimatedReachMax = Math.round(dailyBudget * 800);
  const estimatedChatsMin = Math.round(dailyBudget * 0.8);
  const estimatedChatsMax = Math.round(dailyBudget * 1.5);

  const handleLaunchAd = async () => {
    setIsLaunching(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/ads/ctwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `CTWA - ${headline.slice(0, 30)}`,
          headline,
          dailyBudgetUsd: dailyBudget,
          targetPhoneNumber: targetNumber,
          destination: 'whatsapp',
          mediaUrl: creativeUrl,
          initialGreeting: greetingMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCampaignData(data.data);
        setLaunchSuccess(true);
        onSuccess?.();
      } else {
        throw new Error(data.error?.message || 'Failed to launch CTWA ad campaign');
      }
    } catch (err: any) {
      setErrorMsg(err.message || loc('فشل إطلاق الحملة الإعلانية', 'Failed to launch ad campaign'));
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="luxury-card relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {loc('مُطلق إعلانات انقر للواتساب السريع (CTWA)', 'Simple Click-to-WhatsApp (CTWA) Ad Launcher')}
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  {loc('إعلانات ميتا', 'Meta Ads')}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('أطلق إعلانات ممولة على إنستغرام وفيسبوك توجه العملاء لمحادثتك مباشرة', 'Launch sponsored Instagram & Facebook ads routing directly into your WhatsApp inbox')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!launchSuccess ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
              {/* Form Inputs (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Target Number */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    {loc('رقم الواتساب المستهدف للاستقبال', 'Target WhatsApp Line')}
                  </label>
                  <input
                    type="text"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 2. Headline & Greeting */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    {loc('عنوان الإعلان الرئيسي', 'Ad Headline')}
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-xs font-bold text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    {loc('رسالة الترحيب المسبقة في واتساب العميل', 'Pre-Filled Customer Greeting Message')}
                  </label>
                  <textarea
                    rows={2}
                    value={greetingMessage}
                    onChange={(e) => setGreetingMessage(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {loc('تظهر تلقائياً في خانة كتابة العميل بمجرد النقر على الإعلان', 'Auto-populated in customer chat input when clicking ad')}
                  </span>
                </div>

                {/* 3. Creative Image URL */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    {loc('رابط صورة الإعلان (Creative Image URL)', 'Creative Image URL')}
                  </label>
                  <input
                    type="url"
                    value={creativeUrl}
                    onChange={(e) => setCreativeUrl(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* 4. Interactive Daily Budget Slider & Dynamic Estimator */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {loc('الميزانية اليومية للحملة:', 'Daily Ad Budget:')}
                    </span>
                    <span className="font-mono text-base font-black text-emerald-600">
                      ${dailyBudget} / {loc('يوم', 'day')}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={5}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  {/* Estimation Chips */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/15 text-[11px]">
                    <div>
                      <span className="text-[var(--text-muted)] block">{loc('الوصول المتوقع:', 'Estimated Reach:')}</span>
                      <strong className="text-[var(--text-primary)] font-mono">
                        {estimatedReachMin.toLocaleString()} - {estimatedReachMax.toLocaleString()} {loc('ظهور', 'impressions')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block">{loc('المحادثات المتوقعة:', 'Estimated Conversations:')}</span>
                      <strong className="text-emerald-600 font-mono">
                        {estimatedChatsMin} - {estimatedChatsMax} {loc('محادثة / يوم', 'chats / day')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Meta Ad Mockup (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                  {loc('معاينة الإعلان في إنستغرام/فيسبوك', 'Meta Sponsored Feed Mockup')}
                </div>
                <div className="w-full max-w-xs rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3 shadow-lg">
                  {/* Feed Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                      Z
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[var(--text-primary)]">Zernio Brand</div>
                      <div className="text-[9px] text-[var(--text-muted)]">Sponsored · 🌐</div>
                    </div>
                  </div>

                  {/* Creative Preview Image */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={creativeUrl}
                      alt="Ad Creative"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73';
                      }}
                    />
                  </div>

                  {/* Feed CTA Bar */}
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-600 px-3 py-2 text-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold truncate">
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <span className="truncate">{headline}</span>
                    </div>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[9px] font-bold shrink-0">
                      Send WhatsApp
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Success HUD */
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-4 animate-in fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {loc('تم إطلاق حملة انقر للواتساب بنجاح في Meta Ads!', 'CTWA Campaign Active in Meta Ads Manager!')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                {loc(
                  'الحملة الإعلانية قيد التشغيل الآن، وستبدأ المحادثات بالتدفق فوراً إلى صندوق المحادثات الموحد.',
                  'Ad campaign is now delivering impressions. Inbound customer chats will stream directly into your Unified Inbox.'
                )}
              </p>
              <div className="font-mono text-xs text-emerald-600 font-bold">
                Campaign ID: {campaignData?.id || `camp_${Date.now()}`}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            {launchSuccess ? loc('إغلاق', 'Close') : loc('إلغاء', 'Cancel')}
          </button>

          {!launchSuccess ? (
            <button
              onClick={handleLaunchAd}
              disabled={isLaunching || !targetNumber}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLaunching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{loc('🚀 إطلاق الحملة الآن بنقرة واحدة', '🚀 1-Click Launch Ad Campaign')}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              <span>{loc('العودة للوحة التحكم', 'Return to Dashboard')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
