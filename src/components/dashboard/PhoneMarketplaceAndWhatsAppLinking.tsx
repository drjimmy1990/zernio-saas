'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  Phone,
  Globe,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Bot,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  QrCode,
  Check,
  RefreshCw,
  PhoneCall,
  Sliders,
  Radio,
  FileText,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import type {
  AvailablePhoneNumber,
  OwnedPhoneNumber,
} from '@/types/telephony';
import { GLOBAL_TELEPHONY_COUNTRIES } from '@/types/telephony';

interface PhoneMarketplaceProps {
  organizationId: string;
  ownedNumbers: OwnedPhoneNumber[];
  onNumbersUpdated: () => void;
  onNavigateToDialer?: (number: string) => void;
  onNavigateToInbox?: (number: string) => void;
}

export function PhoneMarketplaceAndWhatsAppLinking({
  organizationId,
  ownedNumbers,
  onNumbersUpdated,
  onNavigateToDialer,
  onNavigateToInbox,
}: PhoneMarketplaceProps) {
  const { locale } = useThemeAndLocale();
  const isAr = locale === 'ar';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  // Active Section
  const [activeSubTab, setActiveSubTab] = useState<'marketplace' | 'whatsapp' | 'voice_ai'>('marketplace');

  // Marketplace State
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'local' | 'mobile' | 'toll_free'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [capabilityFilter, setCapabilityFilter] = useState<{
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  }>({ voice: false, sms: false, whatsapp: false });

  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [buySuccessMessage, setBuySuccessMessage] = useState<string | null>(null);
  const [buyErrorMessage, setBuyErrorMessage] = useState<string | null>(null);

  // WhatsApp Linking Wizard State
  const [waSelectedNumberId, setWaSelectedNumberId] = useState<string>(
    ownedNumbers[0]?.id || ''
  );
  const [waStep, setWaStep] = useState<1 | 2 | 3 | 4>(1);
  const [waDisplayName, setWaDisplayName] = useState<string>('Techurity Customer Care');
  const [waCategory, setWaCategory] = useState<string>('CUSTOMER_SERVICE');
  const [waMethod, setWaMethod] = useState<'sms_otp' | 'voice_otp' | 'qr_code'>('sms_otp');
  const [waOtpCode, setWaOtpCode] = useState<string>('');
  const [waIsLinking, setWaIsLinking] = useState<boolean>(false);
  const [waLinkedSuccess, setWaLinkedSuccess] = useState<boolean>(false);

  // Test WhatsApp Message State
  const [testWaRecipient, setTestWaRecipient] = useState<string>('+1 (415) 890-4412');
  const [testWaTemplate, setTestWaTemplate] = useState<string>('order_update');
  const [testWaParam1, setTestWaParam1] = useState<string>('Customer Support');
  const [testWaParam2, setTestWaParam2] = useState<string>('88412');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testWaReceipt, setTestWaReceipt] = useState<{
    messageId: string;
    status: string;
    readReceipt: boolean;
    sentAt: string;
    body: string;
  } | null>(null);

  // AI Voice Agent State
  const [voiceSelectedNumberId, setVoiceSelectedNumberId] = useState<string>(
    ownedNumbers[0]?.id || ''
  );
  const [voiceAgentName, setVoiceAgentName] = useState<string>('AI Advisor');
  const [voiceLanguage, setVoiceLanguage] = useState<string>('ar-SA');
  const [voicePersona, setVoicePersona] = useState<string>('Support Voice Agent (Warm & Empathetic)');
  const [voicePrompt, setVoicePrompt] = useState<string>(
    loc('أنت المستشار الذكي لمنصة Zernio. رحب بالعملاء باحترافية، وقدم المساعدة حول أرقام الهواتف، وربط واتساب للأعمال، وتأكيد الطلبات، مع تحويل العميل للمشرف البشري عند الطلب.', 'You are the official AI advisor for Zernio. Greet clients warmly, assist with phone provisioning, WhatsApp templates, order tracking, and transfer to human agents upon request.')
  );
  const [voiceTransferNumber, setVoiceTransferNumber] = useState<string>('+1 (800) 555-0199');
  const [voiceSaving, setVoiceSaving] = useState<boolean>(false);
  const [voiceSaveSuccess, setVoiceSaveSuccess] = useState<boolean>(false);
  const [testCalling, setTestCalling] = useState<boolean>(false);
  const [testCallResult, setTestCallResult] = useState<{
    callId: string;
    status: string;
    duration: number;
    transcripts: Array<{ role: string; text: string; timestamp: string }>;
  } | null>(null);

  // Sync selected number IDs when ownedNumbers changes
  useEffect(() => {
    if (ownedNumbers.length > 0) {
      if (!waSelectedNumberId || !ownedNumbers.some((n) => n.id === waSelectedNumberId)) {
        setWaSelectedNumberId(ownedNumbers[0].id);
      }
      if (!voiceSelectedNumberId || !ownedNumbers.some((n) => n.id === voiceSelectedNumberId)) {
        setVoiceSelectedNumberId(ownedNumbers[0].id);
      }
    }
  }, [ownedNumbers, waSelectedNumberId, voiceSelectedNumberId]);

  // Fetch Available Numbers from Backend API
  const fetchAvailableNumbers = useCallback(async () => {
    setLoadingSearch(true);
    setBuyErrorMessage(null);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'search_numbers',
          organizationId,
          country: selectedCountry,
          numberType: selectedType,
          capabilities: capabilityFilter,
          search: searchQuery,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (res.ok && data.results) {
        setAvailableNumbers(data.results);
      } else {
        setBuyErrorMessage(data.error || 'Failed to search numbers');
      }
    } catch {
      setBuyErrorMessage('Network error while searching numbers.');
    } finally {
      setLoadingSearch(false);
    }
  }, [organizationId, selectedCountry, selectedType, capabilityFilter, searchQuery]);

  useEffect(() => {
    void fetchAvailableNumbers();
  }, [fetchAvailableNumbers]);

  // 1-Click Buy Phone Number
  const handleBuyNumber = async (item: AvailablePhoneNumber) => {
    setBuyingId(item.id);
    setBuySuccessMessage(null);
    setBuyErrorMessage(null);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'buy_number',
          organizationId,
          country: item.country,
          phoneNumber: item.phoneNumber,
          numberType: item.type,
          locality: item.locality,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBuySuccessMessage(
          loc(`تهانينا! تم شراء الرقم ${item.phoneNumber} بنجاح وإضافته إلى خطوطك النشطة.`, `Success! Purchased ${item.phoneNumber} successfully and provisioned to your lines.`)
        );
        onNumbersUpdated();
        // Automatically set as active for WhatsApp / Voice AI configuration
        if (data.phoneNumber?.id) {
          setWaSelectedNumberId(data.phoneNumber.id);
          setVoiceSelectedNumberId(data.phoneNumber.id);
        }
      } else {
        setBuyErrorMessage(data.error || 'Failed to purchase number.');
      }
    } catch {
      setBuyErrorMessage('Network error purchasing number.');
    } finally {
      setBuyingId(null);
    }
  };

  // WhatsApp Linking Wizard - Action
  const handleLinkWhatsApp = async () => {
    setWaIsLinking(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'link_whatsapp',
          organizationId,
          phoneNumberId: waSelectedNumberId,
          displayName: waDisplayName,
          category: waCategory,
          verificationMethod: waMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaLinkedSuccess(true);
        if (data.verificationOtp) {
          setWaOtpCode(data.verificationOtp);
        }
        setWaStep(4);
        onNumbersUpdated();
      } else {
        alert(data.error || 'Failed to link WhatsApp Business.');
      }
    } catch {
      alert('Network error linking WhatsApp Business.');
    } finally {
      setWaIsLinking(false);
    }
  };

  // Send Test WhatsApp Broadcast
  const handleSendTestWhatsApp = async () => {
    setTestSending(true);
    setTestWaReceipt(null);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'send_test_whatsapp',
          organizationId,
          phoneNumberId: waSelectedNumberId,
          recipientPhone: testWaRecipient,
          templateName: testWaTemplate,
          parameters: [testWaParam1, testWaParam2],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestWaReceipt({
          messageId: data.messageId,
          status: data.status,
          readReceipt: data.readReceipt,
          sentAt: data.sentAt,
          body: data.body,
        });
        onNumbersUpdated();
      } else {
        alert(data.error || 'Failed to send test message');
      }
    } catch {
      alert('Network error sending test WhatsApp message');
    } finally {
      setTestSending(false);
    }
  };

  // Save AI Voice Agent Config
  const handleSaveVoiceConfig = async () => {
    setVoiceSaving(true);
    setVoiceSaveSuccess(false);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'configure_ai_voice',
          organizationId,
          phoneNumberId: voiceSelectedNumberId,
          agentName: voiceAgentName,
          language: voiceLanguage,
          systemPrompt: voicePrompt,
          voicePersona,
          humanTransferNumber: voiceTransferNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVoiceSaveSuccess(true);
        onNumbersUpdated();
        setTimeout(() => setVoiceSaveSuccess(false), 4000);
      } else {
        alert(data.error || 'Failed to save Voice AI configuration');
      }
    } catch {
      alert('Network error saving Voice AI configuration');
    } finally {
      setVoiceSaving(false);
    }
  };

  // Trigger Test AI Call
  const handleTriggerTestCall = async () => {
    setTestCalling(true);
    setTestCallResult(null);
    const selectedNum = ownedNumbers.find((n) => n.id === voiceSelectedNumberId);
    const fromPhone = selectedNum?.phoneNumber || '+1 (415) 555-0100';
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subService: 'telephony',
          action: 'initiate_call',
          organizationId,
          fromNumber: fromPhone,
          toNumber: '+1 (415) 890-4412',
          mode: 'ai_voice_agent',
          agentPrompt: voicePrompt,
          voicePersona,
          humanTransferNumber: voiceTransferNumber,
          language: voiceLanguage,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestCallResult({
          callId: data.callSession.callId,
          status: data.callSession.status,
          duration: data.callSession.durationSeconds,
          transcripts: data.callSession.transcripts,
        });
        onNumbersUpdated();
      } else {
        alert(data.error || 'Failed to trigger test call');
      }
    } catch {
      alert('Network error triggering test call');
    } finally {
      setTestCalling(false);
    }
  };

  const selectedNumberObj = useMemo(() => {
    return ownedNumbers.find((n) => n.id === waSelectedNumberId) || ownedNumbers[0];
  }, [ownedNumbers, waSelectedNumberId]);

  return (
    <div className="space-y-6">
      {/* Top Telephony Stats & Sub-Tab Navigation */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {loc('سوق أرقام الهواتف وربط واتساب والذكاء الصوتي', 'Phone Numbers Marketplace & AI Voice Suite')}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('شراء أرقام دولية فورية عبر 55+ دولة، وربط واتساب للأعمال، وتفعيل الذكاء الاصطناعي الصوتي 24/7', 'Provision numbers in 55+ countries, link WhatsApp Business & deploy 24/7 Voice AI Agents')}
              </p>
            </div>
          </div>
        </div>

        {/* Owned Numbers Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">{loc('الأرقام المملوكة:', 'Active Lines:')} </span>
            <span className="font-extrabold text-[var(--text-primary)]">{ownedNumbers.length}</span>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">{loc('واتساب مفعّل:', 'WhatsApp Active:')} </span>
            <span className="font-extrabold text-emerald-600">
              {ownedNumbers.filter((n) => n.whatsappLinked).length}
            </span>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">{loc('الذكاء الصوتي:', 'Voice AI:')} </span>
            <span className="font-extrabold text-[var(--brand-coral)]">
              {ownedNumbers.filter((n) => n.voiceAgent?.enabled).length}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Stepper */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          onClick={() => setActiveSubTab('marketplace')}
          className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-xs font-bold transition ${
            activeSubTab === 'marketplace'
              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
              : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{loc('1. متجر الأرقام الافتراضية (55+ دولة)', '1. Number Marketplace (55+ Countries)')}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('whatsapp')}
          className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-xs font-bold transition ${
            activeSubTab === 'whatsapp'
              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
              : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>{loc('2. ربط واتساب للأعمال وقوالب البث', '2. WhatsApp Business & Templates')}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('voice_ai')}
          className={`flex items-center justify-center gap-2 rounded-xl p-3.5 text-xs font-bold transition ${
            activeSubTab === 'voice_ai'
              ? 'bg-[var(--accent-primary)] text-white shadow-sm'
              : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>{loc('3. إعداد الوكيل الصوتي الذكي والمكالمات', '3. AI Voice Agent & Dialing')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PHONE NUMBERS MARKETPLACE */}
      {/* ========================================================================= */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Notification Messages */}
          {buySuccessMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{buySuccessMessage}</span>
            </div>
          )}
          {buyErrorMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{buyErrorMessage}</span>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="luxury-card p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Country Picker */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  <Globe className="inline h-3.5 w-3.5 me-1 text-[var(--accent-primary)]" />
                  {loc('الدولة:', 'Country:')}
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">{loc('جميع الدول (55+ دولة)', 'All Countries (55+ Countries)')}</option>
                  {GLOBAL_TELEPHONY_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.dialCode}) — ${c.monthlyUsd}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Number Type */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  <Sliders className="inline h-3.5 w-3.5 me-1 text-[var(--accent-primary)]" />
                  {loc('نوع الخط:', 'Number Type:')}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as 'all' | 'local' | 'mobile' | 'toll_free')}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="all">{loc('الكل (محلي، جوال، مجاني)', 'All Types')}</option>
                  <option value="local">{loc('أرضي محلي (Local)', 'Local')}</option>
                  <option value="mobile">{loc('جوال (Mobile)', 'Mobile')}</option>
                  <option value="toll_free">{loc('مجاني (Toll-Free 800)', 'Toll-Free')}</option>
                </select>
              </div>

              {/* Search text / area code */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  <Search className="inline h-3.5 w-3.5 me-1 text-[var(--accent-primary)]" />
                  {loc('بحث بالمدينة أو كود المنطقة أو الأرقام:', 'Search City, Area Code or Number:')}
                </label>
                <div className="relative">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={loc('مثال: Dubai, London, Cairo, 415...', 'e.g. San Francisco, London, Riyadh, 415...')}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] ps-3.5 pe-10 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                  {loadingSearch && (
                    <RefreshCw className="absolute end-3 top-2.5 h-3.5 w-3.5 animate-spin text-[var(--accent-primary)]" />
                  )}
                </div>
              </div>
            </div>

            {/* Capability Checkbox Toggles */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-xs">
              <span className="font-bold text-[var(--text-secondary)]">
                {loc('تصفية حسب القدرات:', 'Filter Capabilities:')}
              </span>

              <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={capabilityFilter.whatsapp}
                  onChange={(e) => setCapabilityFilter({ ...capabilityFilter, whatsapp: e.target.checked })}
                  className="rounded text-[var(--accent-primary)]"
                />
                <span className="font-medium">{loc('واتساب للأعمال (WhatsApp)', 'WhatsApp Business')}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={capabilityFilter.voice}
                  onChange={(e) => setCapabilityFilter({ ...capabilityFilter, voice: e.target.checked })}
                  className="rounded text-[var(--accent-primary)]"
                />
                <span className="font-medium">{loc('مكالمات صوتية (Voice)', 'Voice Calling')}</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={capabilityFilter.sms}
                  onChange={(e) => setCapabilityFilter({ ...capabilityFilter, sms: e.target.checked })}
                  className="rounded text-[var(--accent-primary)]"
                />
                <span className="font-medium">{loc('رسائل نصية (SMS)', 'SMS Messages')}</span>
              </label>
            </div>
          </div>

          {/* Numbers Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>
                {loc(`تم العثور على ${availableNumbers.length} رقم افتراضي متاح للشراء الفوري`, `Showing ${availableNumbers.length} available numbers for instant purchase`)}
              </span>
              <span>{loc('التفعيل: فوري أو خلال دقائق', 'Provisioning: Instant')}</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableNumbers.map((num) => {
                const isBuying = buyingId === num.id;
                return (
                  <div
                    key={num.id}
                    className="luxury-card flex flex-col justify-between p-5 transition hover:border-[var(--accent-primary)] hover:shadow-md"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{num.flag}</span>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)]">
                              {num.countryName}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {num.locality} · {num.type.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        {/* Price Badge */}
                        <div className="rounded-lg bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-extrabold text-[var(--accent-primary)]">
                          ${num.monthlyPriceUsd}/mo
                        </div>
                      </div>

                      {/* Phone Number Display */}
                      <div dir="ltr" className="my-3 font-mono text-base font-extrabold text-[var(--text-primary)] tracking-wide">
                        {num.phoneNumber}
                      </div>

                      {/* Capabilities Chips */}
                      <div className="flex flex-wrap gap-1.5 my-2.5">
                        {num.capabilities.whatsapp && (
                          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            WhatsApp ✓
                          </span>
                        )}
                        {num.capabilities.voice && (
                          <span className="rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                            Voice AI ✓
                          </span>
                        )}
                        {num.capabilities.sms && (
                          <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            SMS ✓
                          </span>
                        )}
                        {num.needsKyc && (
                          <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            KYC Required
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] mt-2">
                      <button
                        disabled={isBuying}
                        onClick={() => void handleBuyNumber(num)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
                      >
                        {isBuying ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>{loc('جاري الشراء والتفعيل...', 'Provisioning...')}</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3.5 w-3.5" />
                            <span>{loc('شراء وتفعيل الرقم فوراً', '1-Click Buy Number')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WHATSAPP BUSINESS LINKING WIZARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'whatsapp' && (
        <div className="space-y-6">
          {ownedNumbers.length === 0 ? (
            <div className="luxury-card p-10 text-center flex flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {loc('لا توجد أرقام افتراضية مملوكة بعد', 'No virtual numbers owned yet')}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md">
                {loc(
                  'لربط واتساب للأعمال الرسمي (WhatsApp Cloud API)، يرجى شراء وتفعيل رقم افتراضي من متجر الأرقام أولاً.',
                  'To link official WhatsApp Business (WhatsApp Cloud API), please purchase a virtual number from the marketplace first.'
                )}
              </p>
              <button
                onClick={() => setActiveSubTab('marketplace')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{loc('الانتقال إلى متجر الأرقام لشراء خط', 'Browse & Buy Number in Marketplace')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Target Owned Number Selector */}
              <div className="luxury-card p-5">
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  {loc('اختر الرقم الافتراضي لربطه بواتساب للأعمال:', 'Select Virtual Number to Link to WhatsApp Business:')}
                </label>
            <div className="flex flex-wrap gap-2.5">
              {ownedNumbers.map((num) => (
                <button
                  key={num.id}
                  onClick={() => setWaSelectedNumberId(num.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    waSelectedNumberId === num.id
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span>{num.flag}</span>
                  <span dir="ltr">{num.phoneNumber}</span>
                  {num.whatsappLinked && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 font-extrabold">
                      {loc('مربوط ✓', 'Linked ✓')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stepper Wizard Card */}
          <div className="luxury-card p-6 space-y-6">
            {/* Stepper Progress */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold border-b border-[var(--border-subtle)] pb-4">
              <div className={`${waStep >= 1 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                1. {loc('بيانات النشاط', 'Profile')}
              </div>
              <div className={`${waStep >= 2 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                2. {loc('التحقق والمصادقة', 'Verification')}
              </div>
              <div className={`${waStep >= 3 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                3. {loc('مزامنة القوالب', 'Templates')}
              </div>
              <div className={`${waStep >= 4 ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                4. {loc('إرسال رسالة تجريبية', 'Test Broadcast')}
              </div>
            </div>

            {/* Step 1: Profile & Category */}
            {waStep === 1 && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {loc('الخطوة 1: اسم النشاط التجاري والتصنيف', 'Step 1: Business Profile & Category')}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {loc('حدد الاسم الرسمي والتصنيف الذي سيظهر لعملائك على واتساب الرسمي.', 'Set the official display name and category shown to customers on WhatsApp.')}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {loc('اسم النشاط التجاري (Display Name):', 'Business Display Name:')}
                  </label>
                  <input
                    value={waDisplayName}
                    onChange={(e) => setWaDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {loc('التصنيف التجاري (Category):', 'Industry Category:')}
                  </label>
                  <select
                    value={waCategory}
                    onChange={(e) => setWaCategory(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="CUSTOMER_SERVICE">{loc('خدمة ودعم العملاء (Customer Service)', 'Customer Service')}</option>
                    <option value="RETAIL">{loc('تجارة تجزئة وإلكترونية (Retail & E-commerce)', 'Retail & E-commerce')}</option>
                    <option value="FINANCE">{loc('خدمات مالية وتقنية (Financial Services)', 'Financial Services')}</option>
                    <option value="HEALTHCARE">{loc('صحة وطب (Healthcare)', 'Healthcare')}</option>
                    <option value="EDUCATION">{loc('تعليم وتدريب (Education)', 'Education')}</option>
                  </select>
                </div>

                <button
                  onClick={() => setWaStep(2)}
                  className="rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition"
                >
                  {loc('المتابعة للتحقق ←', 'Continue to Verification →')}
                </button>
              </div>
            )}

            {/* Step 2: Verification Method */}
            {waStep === 2 && (
              <div className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {loc('الخطوة 2: طريقة التحقق والتأكيد', 'Step 2: Verification Method')}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {loc('اختر وسيلة استلام كود التحقق. يتم التقاط رسائل SMS مباشرة على رقمك الافتراضي.', 'Choose how to receive verification. Inbound SMS is captured automatically on your virtual number.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setWaMethod('sms_otp')}
                    className={`rounded-xl border p-3.5 text-start transition ${
                      waMethod === 'sms_otp'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-primary)]">SMS OTP</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      {loc('استلام كود التحقق عبر SMS فوري', 'Auto-captured on virtual line')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaMethod('voice_otp')}
                    className={`rounded-xl border p-3.5 text-start transition ${
                      waMethod === 'voice_otp'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-primary)]">Voice Call OTP</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      {loc('مكالمة آلية لنطق كود التفعيل', 'Automated voice readout')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWaMethod('qr_code')}
                    className={`rounded-xl border p-3.5 text-start transition ${
                      waMethod === 'qr_code'
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-primary)]">QR Code Coexistence</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1">
                      {loc('مسح رمز الاستجابة السريعة QR', 'Direct app scan')}
                    </div>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setWaStep(1)}
                    className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    {loc('رجوع', 'Back')}
                  </button>
                  <button
                    onClick={() => setWaStep(3)}
                    className="rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition"
                  >
                    {loc('المتابعة لمزامنة القوالب ←', 'Continue to Templates →')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Template Sync & Binding */}
            {waStep === 3 && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {loc('الخطوة 3: مزامنة قوالب واتساب المعتمدة', 'Step 3: WhatsApp Pre-Approved Templates')}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {loc('يتم مزامنة 3 قوالب معتمدة دولياً ومصنفة رسمياً (UTILITY & MARKETING) لبدء البث الفوري.', 'Syncing 3 pre-approved official templates for instant utility & marketing broadcasts.')}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                      <span>order_update (UTILITY)</span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 font-extrabold">APPROVED ✓</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                      Hello {'{{1}}'}, your order #{'{{2}}'} has been confirmed and is on its way. Track live: {'{{3}}'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                      <span>promo_campaign_50 (MARKETING)</span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 font-extrabold">APPROVED ✓</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                      Special Offer: Get 50% off all enterprise communication plans with code {'{{1}}'} today only!
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                      <span>welcome_offer (MARKETING)</span>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-600 font-extrabold">APPROVED ✓</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                      Welcome to Techurity! Here is your 20% discount code: {'{{1}}'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setWaStep(2)}
                    className="rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]"
                  >
                    {loc('رجوع', 'Back')}
                  </button>
                  <button
                    disabled={waIsLinking}
                    onClick={() => void handleLinkWhatsApp()}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {waIsLinking ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{loc('جاري الربط والمصادقة...', 'Linking to WhatsApp...')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{loc('إتمام الربط والمصادقة الرسمية', 'Complete WhatsApp Linking')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Live Test Message Sender & Status */}
            {waStep === 4 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {loc(`تم ربط الرقم الافتراضي ${selectedNumberObj?.phoneNumber} بواتساب للأعمال بنجاح!`, `Virtual number ${selectedNumberObj?.phoneNumber} is officially linked to WhatsApp Business!`)}
                    </span>
                  </div>
                  {waOtpCode && (
                    <div className="mt-2 text-xs text-emerald-800 dark:text-emerald-200">
                      {loc('كود التحقق الملتقط آلياً عبر SMS:', 'Auto-captured SMS Verification OTP:')}{' '}
                      <span className="font-mono font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20">{waOtpCode}</span>
                    </div>
                  )}
                </div>

                {/* Test Broadcast Composer */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5 space-y-4">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {loc('إرسال رسالة بث تجريبية مباشرة (Send Test Broadcast):', 'Send Live Test WhatsApp Broadcast:')}
                  </h4>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        {loc('رقم هاتف المستلم (مع كود الدولة):', 'Recipient Phone Number:')}
                      </label>
                      <input
                        dir="ltr"
                        value={testWaRecipient}
                        onChange={(e) => setTestWaRecipient(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        {loc('القالب المعتمد:', 'Approved Template:')}
                      </label>
                      <select
                        value={testWaTemplate}
                        onChange={(e) => setTestWaTemplate(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold"
                      >
                        <option value="order_update">order_update (تأكيد الطلب والتتبع)</option>
                        <option value="promo_campaign_50">promo_campaign_50 (عرض تخفيض 50%)</option>
                        <option value="welcome_offer">welcome_offer (ترحيب وخصم 20%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        {loc('المتغير الأول (Customer Name):', 'Parameter {{1}}:')}
                      </label>
                      <input
                        value={testWaParam1}
                        onChange={(e) => setTestWaParam1(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        {loc('المتغير الثاني (Order/Code):', 'Parameter {{2}}:')}
                      </label>
                      <input
                        value={testWaParam2}
                        onChange={(e) => setTestWaParam2(e.target.value)}
                        className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <button
                    disabled={testSending}
                    onClick={() => void handleSendTestWhatsApp()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {testSending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{loc('جاري إرسال البث...', 'Sending Broadcast...')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>{loc('إرسال رسالة البث التجريبية الآن', 'Send Test WhatsApp Broadcast')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Delivery Status Receipt Preview (with authentic green WhatsApp bubble) */}
                {testWaReceipt && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[var(--text-secondary)]">
                      {loc('إيصال التسليم والمعاينة المباشرة (Live WhatsApp Bubble Preview):', 'Delivery Receipt & Live Bubble Preview:')}
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[#0b141a] p-4 text-white">
                      {/* Authentic WhatsApp Bubble */}
                      <div className="max-w-md rounded-2xl bg-[#005c4b] p-3 text-xs text-white shadow-sm ms-auto">
                        <p className="leading-relaxed">{testWaReceipt.body}</p>
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200">
                          <span>18:42</span>
                          {/* Double Blue Checkmarks */}
                          <span className="text-[#53bdeb] font-bold">✓✓</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-emerald-400 border-t border-emerald-900/40 pt-2">
                        <span>Message ID: {testWaReceipt.messageId}</span>
                        <span>Status: Delivered · Read ✓✓</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI VOICE AGENT CONFIGURATION & TEST CALL */}
      {/* ========================================================================= */}
      {activeSubTab === 'voice_ai' && (
        <div className="space-y-6">
          {ownedNumbers.length === 0 ? (
            <div className="luxury-card p-10 text-center flex flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-coral-soft)] text-[var(--brand-coral)] mb-3">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {loc('لا توجد خطوط افتراضية للوكيل الصوتي', 'No virtual lines available for Voice AI')}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md">
                {loc(
                  'لتشغيل الرد الآلي الذكي 24/7 بصوت عربي أو إنجليزي فائق الطبيعية، يجب امتلاك رقم هاتف افتراضي يدعم Voice AI أولاً.',
                  'To enable 24/7 ultra-natural AI voice answering in Arabic or English, you need an active virtual line that supports Voice AI first.'
                )}
              </p>
              <button
                onClick={() => setActiveSubTab('marketplace')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{loc('الانتقال إلى متجر الأرقام لشراء خط', 'Browse & Buy Number in Marketplace')}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {voiceSaveSuccess && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{loc('تم حفظ وتفعيل إعدادات الوكيل الصوتي بنجاح!', 'AI Voice Agent configuration saved and live!')}</span>
                </div>
              )}

              {/* Target Line Selector */}
              <div className="luxury-card p-5">
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                  {loc('الرقم الافتراضي المربوط بالوكيل الصوتي:', 'Target Number for AI Voice Answering:')}
                </label>
            <div className="flex flex-wrap gap-2.5">
              {ownedNumbers.map((num) => (
                <button
                  key={num.id}
                  onClick={() => setVoiceSelectedNumberId(num.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    voiceSelectedNumberId === num.id
                      ? 'border-[var(--brand-coral)] bg-[var(--brand-coral-soft)] text-[var(--brand-coral)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span>{num.flag}</span>
                  <span dir="ltr">{num.phoneNumber}</span>
                  {num.voiceAgent?.enabled && (
                    <span className="rounded-full bg-[var(--brand-coral)]/10 px-2 py-0.5 text-[10px] text-[var(--brand-coral)] font-extrabold">
                      {loc('نشط 24/7', 'AI Active')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Configuration Form */}
            <div className="luxury-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[var(--brand-coral)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  {loc('إعدادات وكيل الذكاء الاصطناعي الصوتي', 'AI Voice Agent Parameters')}
                </h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {loc('اسم الوكيل الصوتي (Agent Name):', 'Agent Name:')}
                </label>
                <input
                  value={voiceAgentName}
                  onChange={(e) => setVoiceAgentName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {loc('اللغة واللهجة:', 'Language & Dialect:')}
                  </label>
                  <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="ar-SA">العربية (اللهجة السعودية والخليجية)</option>
                    <option value="ar-EG">العربية (اللهجة المصرية)</option>
                    <option value="en-US">English (US Professional)</option>
                    <option value="en-GB">English (UK Executive)</option>
                    <option value="fr-FR">Français (Parisian)</option>
                    <option value="de-DE">Deutsch (Standard)</option>
                    <option value="es-ES">Español (Castilian)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {loc('نبرة وشخصية الصوت:', 'Voice Persona:')}
                  </label>
                  <select
                    value={voicePersona}
                    onChange={(e) => setVoicePersona(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="Support Voice Agent (Warm & Empathetic)">Support Voice Agent (Warm & Empathetic)</option>
                    <option value="Alex (Professional & Concise)">Alex (Professional & Concise)</option>
                    <option value="Fahad (Executive Arabic Advisor)">Fahad (Executive Arabic Advisor)</option>
                    <option value="Elena (Multilingual Specialist)">Elena (Multilingual Specialist)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {loc('التعليمات والتوجيهات (System Prompt):', 'System Prompt & Answering Rules:')}
                </label>
                <textarea
                  rows={4}
                  value={voicePrompt}
                  onChange={(e) => setVoicePrompt(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  {loc('رقم التحويل للمشرف البشري (Call Transfer Number):', 'Human Call-Transfer Number:')}
                </label>
                <input
                  dir="ltr"
                  value={voiceTransferNumber}
                  onChange={(e) => setVoiceTransferNumber(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <button
                disabled={voiceSaving}
                onClick={() => void handleSaveVoiceConfig()}
                className="w-full rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
              >
                {voiceSaving
                  ? loc('جاري الحفظ والتفعيل...', 'Saving...')
                  : loc('حفظ وتفعيل الوكيل الصوتي على الخط', 'Save & Deploy AI Voice Agent')}
              </button>
            </div>

            {/* Right: Trigger Test Call & Live Waveform Preview */}
            <div className="luxury-card p-6 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {loc('اختبار المكالمة الصوتية الذكية', 'Test AI Voice Call')}
                  </h3>
                  <span className="rounded-full bg-[var(--brand-coral)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--brand-coral)]">
                    HD Opus Audio
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {loc('قم بإجراء مكالمة اختبارية فورية مع الوكيل الصوتي لمعاينة الموجات الصوتية والنسخ المباشر للكلام.', 'Trigger an immediate test session to inspect real-time audio waveforms and dual-party speech transcripts.')}
                </p>

                {/* Animated Waveform Display */}
                <div className="my-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-6 text-center">
                  <div className="text-xs font-bold text-[var(--text-muted)] mb-3">
                    {testCalling || testCallResult ? 'Live Audio Waveform Stream' : 'Audio Waveform Idle'}
                  </div>

                  <div className="flex h-16 items-center justify-center gap-1.5">
                    {[12, 28, 48, 64, 32, 54, 78, 92, 45, 60, 30, 72, 85, 40, 20].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-300 ${
                          testCalling || testCallResult
                            ? 'bg-[var(--brand-coral)] animate-waveform'
                            : 'bg-[var(--border-subtle)] h-2'
                        }`}
                        style={{
                          height: testCalling || testCallResult ? `${Math.max(8, h * 0.7)}px` : '6px',
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 text-[11px] font-mono text-[var(--text-secondary)]">
                    {testCalling
                      ? loc('المكالمة متصلة الآن (00:38)...', 'Call Connected (00:38)...')
                      : testCallResult
                      ? loc('اكتملت المكالمة الاختبارية بنجاح', 'Test call session completed')
                      : loc('جاهز للاختبار', 'Ready to test')}
                  </div>
                </div>

                {/* Real-time Dual-Party Transcript Stream */}
                {testCallResult && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {loc('النسخ النصي التلقائي للمكالمة (Speech-to-Text Transcript):', 'Dual-Party Speech Transcript:')}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-xs">
                      {testCallResult.transcripts.map((t, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg ${
                            t.role === 'agent'
                              ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                              : t.role === 'customer'
                              ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                              : 'bg-emerald-500/10 text-emerald-600 text-[10px] font-mono'
                          }`}
                        >
                          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
                            <span className="font-bold">{t.role.toUpperCase()}</span>
                            <span>{t.timestamp}</span>
                          </div>
                          <p>{t.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  disabled={testCalling}
                  onClick={() => void handleTriggerTestCall()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                >
                  {testCalling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{loc('جاري الاتصال واختبار الوكيل...', 'Connecting Call...')}</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="h-4 w-4" />
                      <span>{loc('بدء مكالمة اختبارية فورية مع الوكيل الصوتي', 'Trigger Test Call with AI Agent')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
