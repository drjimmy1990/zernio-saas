'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Phone,
  Send,
  Bot,
  Megaphone,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Zap,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import { BuyNumberWhatsAppWizard } from './wizards/BuyNumberWhatsAppWizard';
import { SmartPostComposerWizard } from './wizards/SmartPostComposerWizard';
import { ThreeStepBroadcastWizard } from './wizards/ThreeStepBroadcastWizard';
import { ManyChatPresetsWizard } from './wizards/ManyChatPresetsWizard';
import { SimpleCtwaAdLauncherWizard } from './wizards/SimpleCtwaAdLauncherWizard';

interface SimpleModeConsoleProps {
  workspace: any;
  policy: any;
  onSwitchToAdvanced: () => void;
  onRefreshWorkspace?: () => void;
}

export function SimpleModeConsole({
  workspace,
  policy,
  onSwitchToAdvanced,
  onRefreshWorkspace,
}: SimpleModeConsoleProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [activeWizard, setActiveWizard] = useState<
    'buy_number' | 'composer' | 'broadcast' | 'manychat' | 'ctwa' | null
  >(null);

  const connectedCount =
    workspace?.subServicesData?.core_connect?.accounts?.length || 0;
  const numbersCount =
    workspace?.subServicesData?.telephony?.numbers?.length || 0;
  const unreadMessagesCount =
    workspace?.subServicesData?.inbox_crm?.data?.reduce(
      (sum: number, item: any) => sum + (item.unreadCount || 0),
      0
    ) || 0;
  const walletBalance =
    workspace?.subServicesData?.telephony?.wallet?.balanceUsd ?? 50.0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Welcoming Status HUD Banner */}
      <div className="luxury-card relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[var(--accent-soft)]/20 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {loc('كل الأنظمة تعمل بكفاءة عالية', 'All Systems Operational')}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                {loc('الوضع المبسط', 'Simple Mode')}
              </span>
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {loc(
                'مرحباً بك! ركّز على نمو أعمالك ودع المنصة تتولى الباقي',
                'Welcome back! Focus on growing your business effortlessly'
              )}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-2xl">
              {loc(
                'لقد صممنا الوضع المبسط ليمكنك من إنجاز أهم مهامك اليومية — تفعيل الواتساب، النشر الذكي، البث الجماعي، والإعلانات — بنقرة واحدة ودون الحاجة لأي معرفة تقنية معقدة.',
                'Simple Mode provides 1-click guided wizards for your essential daily tasks: activate numbers, auto-publish posts, launch broadcasts, and run ads without technical complexity.'
              )}
            </p>
          </div>

          {/* Quick HUD Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3 text-start">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {loc('القنوات', 'Channels')}
              </span>
              <span className="font-mono text-base font-black text-[var(--text-primary)]">
                {connectedCount}
              </span>
              <span className="block text-[9px] text-emerald-600 font-semibold mt-0.5">
                {connectedCount > 0 ? loc('متصلة ✓', 'Active ✓') : loc('جاهزة للربط', 'Ready')}
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3 text-start">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {loc('أرقام العمل', 'Phone Lines')}
              </span>
              <span className="font-mono text-base font-black text-[var(--text-primary)]">
                {numbersCount}
              </span>
              <span className="block text-[9px] text-emerald-600 font-semibold mt-0.5">
                {numbersCount > 0 ? loc('أرقام مملوكة', 'Owned numbers') : loc('متاح للشراء', 'Available')}
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3 text-start">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {loc('الرسائل غير المقروءة', 'Unread Inbox')}
              </span>
              <span className="font-mono text-base font-black text-[var(--text-primary)]">
                {unreadMessagesCount}
              </span>
              <span className="block text-[9px] text-[var(--text-muted)] mt-0.5">
                {unreadMessagesCount === 0 ? loc('صندوق نظيف ✓', 'Inbox Zero ✓') : loc('تحتاج رد', 'Needs Reply')}
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3 text-start">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {loc('محفظة الاتصالات', 'Telecom Wallet')}
              </span>
              <span className="font-mono text-base font-black text-emerald-600">
                ${walletBalance.toFixed(2)}
              </span>
              <span className="block text-[9px] text-[var(--text-muted)] mt-0.5">
                {loc('رصيد متاح', 'Available')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bento Grid of 5 1-Click Guided Wizards + Pro Switcher Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
              {loc('معالجات الإنجاز السريع بنقرة واحدة', '1-Click Guided Execution Wizards')}
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {loc('انقر فوق أي معالج لبدء التنفيذ فوراً', 'Click any wizard card to execute')}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Wizard 1 Card */}
          <div
            onClick={() => setActiveWizard('buy_number')}
            className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 transition group-hover:scale-110">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  {loc('إعداد موجّه', 'Guided setup')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition">
                {loc('شراء رقم وربط واتساب', 'Buy a number & connect WhatsApp')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'اختر رقمًا متاحًا، واستكمل متطلبات المزوّد، ثم اربطه بواتساب من خلال Meta.',
                  'Choose an available number, complete the provider requirements, then connect WhatsApp through Meta.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('بدء المعالج الآن', 'Start Wizard Now')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Wizard 2 Card */}
          <div
            onClick={() => setActiveWizard('composer')}
            className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-[var(--accent-primary)] hover:shadow-lg hover:shadow-[var(--accent-primary)]/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)] transition group-hover:scale-110">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent-primary)]">
                  {loc('فحص ذكي', 'Smart Pre-Flight')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition">
                {loc('مؤلف المنشورات الذكي وتوقيت الذروة', 'Smart Post Composer & Best Times')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'اكتب لجميع المنصات مع تدقيق فوري لحدود الحروف واقتراح أفضل أوقات النشر لزيادة التفاعل بنسبة 40%.',
                  'Cross-post with real-time length limit checks and 1-click scheduling for peak engagement hours.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('كتابة منشور الآن', 'Compose Post Now')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Wizard 3 Card */}
          <div
            onClick={() => setActiveWizard('broadcast')}
            className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 transition group-hover:scale-110">
                  <Send className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
                  {loc('3 خطوات', '3 Steps')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition">
                {loc('معالج البث الجماعي في 3 خطوات', '3-Step Broadcast Wizard')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'أرسل عروضك وتنبيهاتك لآلاف العملاء عبر واتساب وSMS مع معاينة حية لشاشة الهاتف وحساب دقيق للتكلفة.',
                  'Reach verified customer segments via WhatsApp & SMS with live smartphone preview and cost calculator.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600 pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('إطلاق حملة بث', 'Launch Broadcast')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Wizard 4 Card */}
          <div
            onClick={() => setActiveWizard('manychat')}
            className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 transition group-hover:scale-110">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-600">
                  {loc('4 قوالب جاهزة', '4 Presets')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-purple-600 transition">
                {loc('قوالب ميني شات الجاهزة بنقرة واحدة', '1-Click ManyChat Presets')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'فعّل روبوتات جمع العملاء، الرد على أسئلة المتجر، وتحويل التعليقات لرسائل خاصة فوراً مع محاكاة اختبارية.',
                  'Activate lead capture bots, e-commerce FAQ bots, and comment-to-DM flows with live test simulator.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-600 pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('تفعيل الروبوتات', 'Activate Bots')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Wizard 5 Card */}
          <div
            onClick={() => setActiveWizard('ctwa')}
            className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 transition group-hover:scale-110">
                  <Megaphone className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                  {loc('إعلانات ميتا', 'Meta Ads')}
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition">
                {loc('مُطلق إعلانات انقر للواتساب السريع', 'Simple CTWA Ad Launcher')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'أطلق إعلاناتك على إنستغرام بـ 4 حقول فقط، مع شريط تحكم تفاعلي بالميزانية ومعاينة فورية للإعلان الممول.',
                  'Launch sponsored Click-to-WhatsApp ads with 4 simple inputs, budget slider, and live Meta ad preview.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('إطلاق إعلان ممول', 'Launch Sponsored Ad')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Pro Switcher Invitation Card */}
          <div
            onClick={onSwitchToAdvanced}
            className="group relative flex flex-col justify-between rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 transition-all duration-200 hover:border-[var(--accent-primary)] hover:bg-[var(--accent-soft)]/10 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-card)] text-[var(--accent-primary)] border border-[var(--border-subtle)]">
                  <Sliders className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                  Pro Power
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('تحتاج تحكماً كاملاً؟ افتح الوضع الاحترافي', 'Need Full Control? Switch to Advanced Pro')}
              </h4>
              <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                {loc(
                  'انتقل إلى المراكز الخمسة المتقدمة للوصول إلى الهاتف السحابي، استوديو القوالب، مصفوفة التحليلات، وإعدادات الـ API.',
                  'Access the 5 Advanced Hubs for Softphone dialers, templates studio, SLA heatmaps, and raw developer tools.'
                )}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-primary)] pt-3 border-t border-[var(--border-subtle)]">
              <span>{loc('التبديل إلى الوضع الاحترافي', 'Switch to Advanced Pro')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Guided Wizards Modals */}
      <BuyNumberWhatsAppWizard
        isOpen={activeWizard === 'buy_number'}
        onClose={() => setActiveWizard(null)}
        onSuccess={() => onRefreshWorkspace?.()}
      />

      <SmartPostComposerWizard
        isOpen={activeWizard === 'composer'}
        onClose={() => setActiveWizard(null)}
        onSuccess={() => onRefreshWorkspace?.()}
      />

      <ThreeStepBroadcastWizard
        isOpen={activeWizard === 'broadcast'}
        onClose={() => setActiveWizard(null)}
        onSuccess={() => onRefreshWorkspace?.()}
      />

      <ManyChatPresetsWizard
        isOpen={activeWizard === 'manychat'}
        onClose={() => setActiveWizard(null)}
        onSuccess={() => onRefreshWorkspace?.()}
      />

      <SimpleCtwaAdLauncherWizard
        isOpen={activeWizard === 'ctwa'}
        onClose={() => setActiveWizard(null)}
        onSuccess={() => onRefreshWorkspace?.()}
      />
    </div>
  );
}
