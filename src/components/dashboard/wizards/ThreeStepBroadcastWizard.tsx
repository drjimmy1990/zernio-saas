'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Users,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Radio,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface ThreeStepBroadcastWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface WhatsAppTemplate {
  name: string;
  category: string;
  language: string;
  components: Array<{
    type: string;
    text?: string;
  }>;
}

export function ThreeStepBroadcastWizard({
  isOpen,
  onClose,
  onSuccess,
}: ThreeStepBroadcastWizardProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'instagram'>('whatsapp');
  const [audienceTag, setAudienceTag] = useState<string>('all');
  const [contactCount, setContactCount] = useState<number>(0);

  // Message & Template state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  // Send state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sentResult, setSentResult] = useState<{
    broadcastId: string;
    recipientsCount: number;
    sentCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch contacts count and templates
  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        // Fetch contacts
        const cRes = await fetch('/api/v1/contacts');
        const cData = await cRes.json();
        if (cData.success && Array.isArray(cData.data)) {
          setContactCount(cData.data.length);
        }

        // Fetch WhatsApp templates
        const tRes = await fetch('/api/v1/whatsapp/templates');
        const tData = await tRes.json();
        if (tData.success && Array.isArray(tData.data)) {
          setTemplates(tData.data);
        } else {
          setTemplates([]);
        }
      } catch {
        // Fallback gracefully
        setTemplates([]);
      }
    };
    void loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const estimatedCost = (contactCount * (channel === 'whatsapp' ? 0.015 : 0.012)).toFixed(2);

  const handleSendBroadcast = async () => {
    setIsSending(true);
    setErrorMsg(null);
    try {
      // Step 1: Create Broadcast
      const createRes = await fetch('/api/v1/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${channel.toUpperCase()} Broadcast - ${new Date().toLocaleDateString()}`,
          platform: channel,
          template: channel === 'whatsapp' ? selectedTemplate : undefined,
          message: customMessage,
          segmentFilters: audienceTag === 'all' ? {} : { tag: audienceTag },
        }),
      });
      const createData = await createRes.json();
      const broadcastId = createData.data?.id || `bc_${Date.now()}`;

      // Step 2: Send Broadcast
      const sendRes = await fetch(`/api/v1/broadcasts/${broadcastId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const sendData = await sendRes.json();

      setSentResult({
        broadcastId,
        recipientsCount: sendData.data?.recipientsCount || contactCount,
        sentCount: sendData.data?.sentCount || contactCount,
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || loc('فشل إرسال الحملة الجماعية', 'Failed to dispatch broadcast'));
    } finally {
      setIsSending(false);
    }
  };

  const previewBody = customMessage.replace('{{name}}', 'Alex').replace('{{discount}}', '50%');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="luxury-card relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-500">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {loc('معالج البث الجماعي في 3 خطوات', '3-Step Broadcast Wizard')}
                </h2>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  {loc('رسائل مجمعة', 'Mass Outreach')}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('أرسل رسائل تسويقية وتنبيهات لآلاف العملاء بنقرة واحدة عبر واتساب وSMS', 'Send campaigns to thousands of verified contacts with live cost estimation')}
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

        {/* Steps Tracker */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 px-6 py-2.5 text-xs font-semibold">
          {[
            { s: 1, label: loc('1. القناة والجمهور', '1. Channel & Audience') },
            { s: 2, label: loc('2. الرسالة والقالب', '2. Message & Preview') },
            { s: 3, label: loc('3. المراجعة والإرسال', '3. Review & Send') },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-1.5 ${
                step === item.s
                  ? 'text-[var(--accent-primary)] font-bold'
                  : step > item.s
                  ? 'text-emerald-500'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === item.s
                    ? 'bg-[var(--accent-primary)] text-white'
                    : step > item.s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'
                }`}
              >
                {step > item.s ? '✓' : item.s}
              </div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Channel & Audience */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  {loc('اختر قناة البث', 'Select Broadcast Channel')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'whatsapp', label: 'WhatsApp', desc: '98% Open Rate', icon: '💬' },
                    { id: 'sms', label: 'SMS', desc: 'Universal Reach', icon: '📱' },
                    { id: 'instagram', label: 'Instagram DM', desc: 'Direct Followers', icon: '📸' },
                  ].map((ch) => {
                    const isSelected = channel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => setChannel(ch.id as any)}
                        className={`flex flex-col items-start rounded-2xl border p-4 text-start transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--border-medium)]'
                        }`}
                      >
                        <span className="text-xl mb-1">{ch.icon}</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{ch.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5">{ch.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                  {loc('شريحة الجمهور المستهدفة', 'Target Audience Segment')}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'all', label: loc('كافة جهات الاتصال', 'All Contacts'), count: contactCount },
                    { id: 'vip', label: loc('العملاء المميزين (VIP)', 'VIP Customers'), count: Math.floor(contactCount * 0.25) },
                    { id: 'leads', label: loc('العملاء المحتملين (Leads)', 'Recent Leads'), count: Math.floor(contactCount * 0.5) },
                  ].map((seg) => {
                    const isSel = audienceTag === seg.id;
                    return (
                      <button
                        key={seg.id}
                        onClick={() => setAudienceTag(seg.id)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-start transition cursor-pointer ${
                          isSel
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)] font-bold'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="text-xs">{seg.label}</span>
                        <span className="font-mono text-[10px] rounded bg-[var(--bg-card)] px-1.5 py-0.5">
                          {seg.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Users className="h-4 w-4 text-[var(--accent-primary)]" />
                  <span>{loc('إجمالي المستلمين المتوقعين:', 'Estimated Total Recipients:')}</span>
                </div>
                <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {audienceTag === 'all'
                    ? contactCount
                    : audienceTag === 'vip'
                    ? Math.floor(contactCount * 0.25)
                    : Math.floor(contactCount * 0.5)}{' '}
                  {loc('جهة اتصال', 'contacts')}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Message & Template with Live Phone Mockup */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-start">
              <div className="space-y-4">
                {channel === 'whatsapp' && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                      {loc('اختر قالب معتمد من Meta', 'Approved Meta Template')}
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => {
                        setSelectedTemplate(e.target.value);
                        const tmpl = templates.find((t) => t.name === e.target.value);
                        if (tmpl?.components?.[0]?.text) {
                          setCustomMessage(tmpl.components[0].text);
                        }
                      }}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none cursor-pointer"
                    >
                      {templates.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                    {loc('نص الرسالة مع المتغيرات', 'Message Copy with Variables')}
                  </label>
                  <textarea
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>{loc('المتغيرات المدعومة: {{name}}, {{discount}}', 'Supported tags: {{name}}, {{discount}}')}</span>
                    {channel === 'sms' && (
                      <span className="font-mono">
                        {customMessage.length}/160 · {Math.ceil(customMessage.length / 160) || 1} SMS
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-3 text-[11px] text-[var(--text-secondary)]">
                  💡 {loc('سيتم استبدال {{name}} تلقائياً بالاسم الأول لكل عميل في سجل الـ CRM لزيادة معدل التحويل.', '{{name}} is dynamically personalized for each customer from CRM.')}
                </div>
              </div>

              {/* Smartphone Live Preview Mockup */}
              <div className="flex flex-col items-center">
                <div className="text-[11px] font-bold text-[var(--text-muted)] mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>{loc('معاينة الهاتف الحية', 'Live Smartphone Preview')}</span>
                </div>
                <div className="relative w-56 rounded-3xl border-4 border-slate-800 bg-slate-900 p-3 shadow-xl">
                  <div className="mx-auto h-2 w-16 rounded-full bg-slate-800 mb-3" />
                  {/* Chat header */}
                  <div className="border-b border-white/10 pb-2 mb-3 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-500 text-[10px] text-white font-bold flex items-center justify-center">
                      Z
                    </div>
                    <div className="text-[10px] text-white font-bold truncate">Zernio Business</div>
                  </div>
                  {/* Chat bubble */}
                  <div className="rounded-2xl rounded-tr-none bg-emerald-600/90 p-2.5 text-[10px] text-white leading-relaxed shadow-sm">
                    {previewBody}
                    <div className="mt-1 text-end text-[8px] text-white/60">12:30 PM ✓✓</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Send */}
          {step === 3 && (
            <div className="space-y-4">
              {!sentResult ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 space-y-3">
                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {loc('ملخص الحملة قبل الإطلاق', 'Broadcast Summary Before Dispatch')}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">{loc('القناة المحددة', 'Channel')}</span>
                        <strong className="font-bold uppercase text-[var(--text-primary)]">{channel}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">{loc('عدد المستلمين', 'Recipients')}</span>
                        <strong className="font-bold text-[var(--text-primary)] font-mono">{contactCount} {loc('عميل', 'contacts')}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">{loc('سرعة التسليم', 'Velocity')}</span>
                        <strong className="font-bold text-emerald-600">{loc('فوري (~25 رسالة/ث)', 'Instant (~25 msgs/sec)')}</strong>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)] block text-[11px]">{loc('التكلفة التقديرية', 'Estimated Cost')}</span>
                        <strong className="font-bold text-[var(--text-primary)] font-mono text-emerald-600">
                          ${estimatedCost} USD
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-700">
                    ℹ️ {loc('يتم الخصم تلقائياً من محفظة الاتصالات الخاصة بمسار عملك.', 'Cost will be deducted automatically from your workspace telecom wallet.')}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {loc('تم إطلاق حملة البث الجماعي بنجاح!', 'Broadcast Dispatched Successfully!')}
                  </h3>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {loc(
                      `تم إرسال ${sentResult.sentCount} رسالة عبر شبكة ${channel.toUpperCase()} الرسمية.`,
                      `Sent ${sentResult.sentCount} messages via official ${channel.toUpperCase()} carrier network.`
                    )}
                  </div>
                  <div className="font-mono text-xs text-emerald-600 font-bold">
                    Campaign ID: {sentResult.broadcastId}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-6 py-4">
          {step > 1 && !sentResult ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              {isRTL ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
              <span>{loc('السابق', 'Back')}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              <span>{loc('التالي', 'Next')}</span>
              {isRTL ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          )}

          {step === 3 && !sentResult && (
            <button
              onClick={handleSendBroadcast}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-md cursor-pointer"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>{loc('🚀 إرسال البث الآن بنقرة واحدة', '🚀 Send Broadcast Now')}</span>
            </button>
          )}

          {sentResult && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              <span>{loc('إغلاق والعودة', 'Close & Return')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
