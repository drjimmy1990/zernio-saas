'use client';

import React, { useState, useEffect } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import {
  Phone,
  ShoppingCart,
  CheckCircle2,
  MessageSquare,
  Bot,
  RefreshCw,
  PhoneCall,
} from 'lucide-react';
import type { OwnedPhoneNumber } from '@/types/telephony';
import { WhatsAppNumberOnboarding } from './WhatsAppNumberOnboarding';

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
}: PhoneMarketplaceProps) {
  const { locale } = useThemeAndLocale();
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  // Active Section
  const [activeSubTab, setActiveSubTab] = useState<'marketplace' | 'whatsapp' | 'voice_ai'>('marketplace');

  // AI Voice Agent State
  const [voiceSelectedNumberId, setVoiceSelectedNumberId] = useState<string>(
    ownedNumbers[0]?.id || ''
  );
  const [voiceAgentName, setVoiceAgentName] = useState<string>('AI Advisor');
  const [voiceLanguage, setVoiceLanguage] = useState<string>('ar-SA');
  const [voicePersona, setVoicePersona] = useState<string>('Support Voice Agent (Warm & Empathetic)');
  const [voicePrompt, setVoicePrompt] = useState<string>(
    loc('أنت المستشار الذكي لمنصة Asra3. رحب بالعملاء باحترافية، وقدم المساعدة حول أرقام الهواتف، وربط واتساب للأعمال، وتأكيد الطلبات، مع تحويل العميل للمشرف البشري عند الطلب.', 'You are the official AI advisor for Asra3. Greet clients warmly, assist with phone provisioning, WhatsApp templates, order tracking, and transfer to human agents upon request.')
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

  useEffect(() => {
    if (!ownedNumbers.some(number => number.id === voiceSelectedNumberId)) {
      setVoiceSelectedNumberId(ownedNumbers[0]?.id || '');
    }
  }, [ownedNumbers, voiceSelectedNumberId]);
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
                {loc('تحقق من توفر الأرقام واربط واتساب للأعمال وأدر إعدادات الصوت', 'Check number availability, connect WhatsApp Business and manage voice settings')}
              </p>
            </div>
          </div>
        </div>

        {/* Owned Numbers Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">{loc('الأرقام المملوكة:', 'Owned Numbers:')} </span>
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
          <span>{loc('1. متجر الأرقام', '1. Number Marketplace')}</span>
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
          <span>{loc('2. ربط واتساب للأعمال', '2. WhatsApp Connection')}</span>
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
      {activeSubTab !== 'voice_ai' && (
        <WhatsAppNumberOnboarding organizationId={organizationId} onNumbersUpdated={onNumbersUpdated} showPurchase={activeSubTab === 'marketplace'} />
      )}
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
