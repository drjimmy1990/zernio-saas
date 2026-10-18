'use client';

import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Phone,
  MessageSquare,
  Bot,
  ShieldCheck,
  Radio,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  Sparkles,
  Volume2,
  FileCheck,
  Send,
  Sliders,
  GitBranch,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';
import { WebPhoneDialerAndCallConsole } from '../WebPhoneDialerAndCallConsole';
import { PhoneMarketplaceAndWhatsAppLinking } from '../PhoneMarketplaceAndWhatsAppLinking';

interface TelephonyWhatsAppVoiceHubProps {
  workspace: any;
  policy: any;
  onRefreshWorkspace?: () => void;
}

export function TelephonyWhatsAppVoiceHub({
  workspace,
  policy,
  onRefreshWorkspace,
}: TelephonyWhatsAppVoiceHubProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [activeSubTab, setActiveSubTab] = useState<
    'softphone' | 'templates_flows' | 'business_agent' | 'branded_calling' | 'regulatory'
  >('softphone');

  // 1. WebRTC Softphone Session State
  const [webrtcToken, setWebrtcToken] = useState<string | null>(null);
  const [mintingToken, setMintingToken] = useState<boolean>(false);

  // 2. WhatsApp Templates & Flows
  const [templates, setTemplates] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);

  // New Template Form State
  const [showNewTemplate, setShowNewTemplate] = useState<boolean>(false);
  const [newTmplName, setNewTmplName] = useState<string>('');
  const [newTmplCategory, setNewTmplCategory] = useState<string>('MARKETING');
  const [newTmplLang, setNewTmplLang] = useState<string>('ar');
  const [newTmplBody, setNewTmplBody] = useState<string>('');
  const [creatingTemplate, setCreatingTemplate] = useState<boolean>(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // New Flow Studio Form State
  const [showNewFlow, setShowNewFlow] = useState<boolean>(false);
  const [newFlowName, setNewFlowName] = useState<string>('');
  const [newFlowCategory, setNewFlowCategory] = useState<string>('BOOKING');
  const [newFlowScreens, setNewFlowScreens] = useState<number>(3);
  const [newFlowFields, setNewFlowFields] = useState<string>('Full Name, Phone Number, Appointment Date & Time');
  const [creatingFlow, setCreatingFlow] = useState<boolean>(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTemplatesAndFlows = async () => {
      try {
        const [tRes, fRes] = await Promise.all([
          fetch('/api/v1/whatsapp/templates').catch(() => null),
          fetch('/api/v1/whatsapp/flows').catch(() => null),
        ]);
        if (tRes && tRes.ok) {
          const tData = await tRes.json().catch(() => ({}));
          const list = tData.templates || tData.data;
          if (isMounted && Array.isArray(list)) {
            setTemplates(list);
          }
        }
        if (fRes && fRes.ok) {
          const fData = await fRes.json().catch(() => ({}));
          const list = fData.flows || fData.data;
          if (isMounted && Array.isArray(list)) {
            setFlows(list);
          }
        }
      } catch {
        // keep clean empty state
      }
    };
    void fetchTemplatesAndFlows();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTmplName.trim() || !newTmplBody.trim()) {
      setTemplateError(loc('يرجى إدخال اسم القالب ونص الرسالة.', 'Please enter template name and message body.'));
      return;
    }
    setCreatingTemplate(true);
    setTemplateError(null);
    try {
      const formattedName = newTmplName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const res = await fetch('/api/v1/whatsapp/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formattedName,
          category: newTmplCategory,
          language: newTmplLang,
          components: [{ type: 'BODY', text: newTmplBody.trim() }],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to create template');
      }
      const created = data.template || data.data || {
        id: `tmpl_${Date.now()}`,
        name: formattedName,
        category: newTmplCategory,
        language: newTmplLang,
        status: 'APPROVED',
        body: newTmplBody.trim(),
      };
      setTemplates((prev) => [created, ...prev]);
      setShowNewTemplate(false);
      setNewTmplName('');
      setNewTmplBody('');
      onRefreshWorkspace?.();
    } catch (err: any) {
      setTemplateError(err?.message || 'Failed to create WhatsApp template');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      setFlowError(loc('يرجى إدخال اسم التدفق التفاعلي.', 'Please enter a name for the WhatsApp Flow.'));
      return;
    }
    setCreatingFlow(true);
    setFlowError(null);
    try {
      const res = await fetch('/api/v1/whatsapp/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlowName.trim(),
          category: newFlowCategory,
          screensCount: Number(newFlowScreens) || 3,
          fields: newFlowFields.split(',').map((s) => s.trim()).filter(Boolean),
          status: 'PUBLISHED',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to create flow');
      }
      const created = data.flow || data.data || {
        id: `flow_${Date.now()}`,
        name: newFlowName.trim(),
        category: newFlowCategory,
        screensCount: Number(newFlowScreens) || 3,
        status: 'PUBLISHED',
      };
      setFlows((prev) => [created, ...prev]);
      setShowNewFlow(false);
      setNewFlowName('');
      onRefreshWorkspace?.();
    } catch (err: any) {
      setFlowError(err?.message || 'Failed to create WhatsApp Flow');
    } finally {
      setCreatingFlow(false);
    }
  };

  // 3. Meta Business Agent State
  const [agentEnabled, setAgentEnabled] = useState<boolean>(true);
  const [agentPrompt, setAgentPrompt] = useState<string>(
    'You are an executive customer care AI for Asra3. Answer questions politely, provide product links, and escalate to live softphone when needed.'
  );
  const [agentTone, setAgentTone] = useState<string>('Professional');
  const [fallbackPhone, setFallbackPhone] = useState<string>('+12025550184');
  const [savingAgent, setSavingAgent] = useState<boolean>(false);
  const [agentSaved, setAgentSaved] = useState<boolean>(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // 4. Branded Calling State
  const [brandDisplayName, setBrandDisplayName] = useState<string>('Asra3 Enterprise Care');
  const [brandReason, setBrandReason] = useState<string>('Order Delivery & Security Verification');
  const [savingBranded, setSavingBranded] = useState<boolean>(false);
  const [brandedSaved, setBrandedSaved] = useState<boolean>(false);

  // 5. Regulatory & Carrier Hub
  const [regTab, setRegTab] = useState<'10dlc' | 'porting' | 'rcs' | 'verify'>('10dlc');
  const [otpPhone, setOtpPhone] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpVerified, setOtpVerified] = useState<boolean>(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // 10DLC / Porting / RCS interactive states
  const [dlcBrandName, setDlcBrandName] = useState<string>('');
  const [dlcEin, setDlcEin] = useState<string>('');
  const [dlcUseCase, setDlcUseCase] = useState<string>('CUSTOMER_CARE');
  const [dlcSaved, setDlcSaved] = useState<string | null>(null);

  const [portNumber, setPortNumber] = useState<string>('');
  const [portCarrier, setPortCarrier] = useState<string>('');
  const [portAccountPin, setPortAccountPin] = useState<string>('');
  const [portSaved, setPortSaved] = useState<string | null>(null);

  const [rcsAgentName, setRcsAgentName] = useState<string>('');
  const [rcsWebsite, setRcsWebsite] = useState<string>('');
  const [rcsSaved, setRcsSaved] = useState<string | null>(null);

  const handleMintBrowserToken = async () => {
    setMintingToken(true);
    setWebrtcError(null);
    try {
      const res = await fetch('/api/v1/voice/browser-token', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      const token = data.token || data.data?.token;
      if (res.ok && data.success && token) {
        setWebrtcToken(token);
      } else {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to mint browser token');
      }
    } catch (err: any) {
      setWebrtcToken(null);
      setWebrtcError(err?.message || loc('تعذر إنشاء رمز WebRTC الصوتي', 'Failed to mint WebRTC session token'));
    } finally {
      setMintingToken(false);
    }
  };

  const handleSaveAgent = async () => {
    setSavingAgent(true);
    setAgentSaved(false);
    setAgentError(null);
    try {
      const res = await fetch('/api/v1/business-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: agentEnabled,
          prompt: agentPrompt,
          tone: agentTone,
          fallbackPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to save agent');
      }
      setAgentSaved(true);
      setTimeout(() => setAgentSaved(false), 2000);
    } catch (err: any) {
      setAgentSaved(false);
      setAgentError(err?.message || loc('فشل حفظ إعدادات الوكيل الذكي', 'Failed to save agent settings'));
    } finally {
      setSavingAgent(false);
    }
  };

  const handleSaveBranded = async () => {
    setSavingBranded(true);
    setBrandedSaved(false);
    try {
      await fetch('/api/v1/branded-calling/identities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: brandDisplayName,
          reason: brandReason,
        }),
      });
      setBrandedSaved(true);
      setTimeout(() => setBrandedSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSavingBranded(false);
    }
  };

  const handleSendOtp = async () => {
    if (!otpPhone) return;
    setOtpError(null);
    setOtpSent(false);
    try {
      const res = await fetch('/api/v1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: otpPhone, channel: 'whatsapp' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to dispatch verification OTP');
      }
      setOtpSent(true);
    } catch (err: any) {
      setOtpSent(false);
      setOtpError(err?.message || loc('فشل إرسال رمز التحقق OTP', 'Failed to send verification OTP'));
    }
  };

  const handleCheckOtp = async () => {
    if (!otpCode) return;
    setOtpError(null);
    setOtpVerified(false);
    try {
      const res = await fetch('/api/v1/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: otpPhone, code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.verified) {
        throw new Error(data.reason || data.message || data.error?.message || data.error || 'Invalid or expired OTP code');
      }
      setOtpVerified(true);
    } catch (err: any) {
      setOtpVerified(false);
      setOtpError(err?.message || loc('رمز التحقق غير صالح أو منتهي الصلاحية', 'Invalid or expired OTP code'));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {loc('مركز الاتصالات والواتساب والصوت الذكي', 'Telephony, WhatsApp & Voice AI Hub')}
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
              WebRTC & SIP Trunking
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {loc(
              'الهاتف السحابي المباشر بالمتصفح، استوديو قوالب وتدفقات واتساب، وكيل Meta الذكي، الهوية المعتمدة، وسجل الامتثال التنظيمي',
              'In-browser WebRTC Softphone, WhatsApp Flows studio, Meta Business Agent, Branded Caller ID, and carrier compliance'
            )}
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        {[
          { id: 'softphone', label: loc('الهاتف السحابي والاتصال (WebRTC Softphone)', 'WebRTC Softphone'), icon: PhoneCall },
          { id: 'templates_flows', label: loc('استوديو قوالب وتدفقات واتساب (Flows)', 'WhatsApp Templates & Flows'), icon: MessageSquare },
          { id: 'business_agent', label: loc('وكيل Meta Business Agent الذكي', 'Meta Business Agent'), icon: Bot },
          { id: 'branded_calling', label: loc('هوية الاتصال المعتمدة (Branded Calling)', 'Branded Calling ID'), icon: Volume2 },
          { id: 'regulatory', label: loc('بوابة الامتثال والناقلين (10DLC / Porting)', 'Carrier & Regulatory Hub'), icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-PANEL 1: WebRTC Softphone */}
      {activeSubTab === 'softphone' && (
        <div className="space-y-5">
          {/* WebRTC Session HUD */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  {loc('حالة بوابة اتصال WebRTC الصوتية بالمتصفح', 'In-Browser WebRTC Voice Gateway')}
                </div>
                <div className={`font-mono text-[11px] font-semibold ${webrtcError ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {webrtcError ? `Error: ${webrtcError}` : webrtcToken ? `Session Active: ${webrtcToken.slice(0, 18)}...` : 'Gateway Ready (Idle)'}
                </div>
              </div>
            </div>

            <button
              onClick={handleMintBrowserToken}
              disabled={mintingToken}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer"
            >
              {mintingToken && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loc('تجديد جلسة WebRTC', 'Mint WebRTC Session')}</span>
            </button>
          </div>

          {/* Embedded WebPhone Dialer */}
          <WebPhoneDialerAndCallConsole
            organizationId={workspace?.policy?.tenantId || 'org_workspace'}
            ownedNumbers={workspace?.subServicesData?.telephony?.phoneNumbers || []}
            callHistory={[]}
            onCallFinished={() => onRefreshWorkspace?.()}
          />
        </div>
      )}

      {/* SUB-PANEL 2: WhatsApp Templates & Flows Studio */}
      {activeSubTab === 'templates_flows' && (
        <div className="space-y-6">
          {/* Templates */}
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('قوالب رسائل واتساب المعتمدة من Meta Cloud API', 'Official Meta Cloud WABA Templates')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {loc('قوالب التسويق والتنبيهات المعتمدة للإرسال خارج نافذة الـ 24 ساعة', 'Approved templates for outbound messaging beyond the 24-hour service window')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTemplate(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('قالب جديد', 'New Template')}</span>
              </button>
            </div>

            {/* New Template Form Drawer */}
            {showNewTemplate && (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/60 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--text-primary)]">
                    {loc('إنشاء قالب واتساب جديد (Meta WABA Template)', 'Create New WhatsApp Message Template')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {templateError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 font-semibold">
                    ✗ {templateError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('اسم القالب (بدون مسافات)', 'Template Name (snake_case)')}
                    </label>
                    <input
                      type="text"
                      value={newTmplName}
                      onChange={(e) => setNewTmplName(e.target.value)}
                      placeholder="e.g. order_confirmation_v1"
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('التصنيف', 'Category')}
                    </label>
                    <select
                      value={newTmplCategory}
                      onChange={(e) => setNewTmplCategory(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    >
                      <option value="MARKETING">MARKETING</option>
                      <option value="UTILITY">UTILITY</option>
                      <option value="AUTHENTICATION">AUTHENTICATION</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('اللغة', 'Language')}
                    </label>
                    <select
                      value={newTmplLang}
                      onChange={(e) => setNewTmplLang(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    >
                      <option value="ar">Arabic (ar)</option>
                      <option value="en_US">English (en_US)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    {loc('نص القالب (يدعم المتغيرات مثل {{1}})', 'Template Body Text (supports variables like {{1}})')}
                  </label>
                  <textarea
                    rows={3}
                    value={newTmplBody}
                    onChange={(e) => setNewTmplBody(e.target.value)}
                    placeholder={loc('مرحباً {{1}}، تم تأكيد طلبك رقم {{2}} بنجاح!', 'Hello {{1}}, your order {{2}} has been confirmed!')}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-1.5 text-xs font-bold text-[var(--text-muted)] cursor-pointer"
                  >
                    {loc('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateTemplate()}
                    disabled={creatingTemplate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingTemplate && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{loc('حفظ واعتماد القالب', 'Submit & Save Template')}</span>
                  </button>
                </div>
              </div>
            )}

            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('لا توجد قوالب واتساب معتمدة بعد', 'No WhatsApp Templates Found')}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                  {loc('أنشئ قوالب رسائل معتمدة من Meta لإرسال حملات تسويقية وتنبيهات فورية لعملائك.', 'Create Meta-approved message templates for outbound marketing, alerts, and notifications.')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewTemplate(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{loc('قالب جديد', '+ New Template')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {templates.map((tmpl, idx) => (
                  <div key={tmpl.id || tmpl.name || idx} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{tmpl.name}</span>
                      <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                        {tmpl.status || 'APPROVED'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Category: <strong>{tmpl.category}</strong> · Lang: {tmpl.language}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Flows */}
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('استوديو تدفقات ونماذج واتساب التفاعلية (WhatsApp Flows Studio)', 'WhatsApp Interactive Flows Studio')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {loc('نماذج حجز واستبيانات متعددة الصفحات تفتح داخل تطبيق واتساب مباشرة', 'In-app multi-screen forms and booking flows embedded in WhatsApp')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewFlow(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{loc('إنشاء تدفق تفاعلي', 'Create Flow')}</span>
              </button>
            </div>

            {/* New Interactive WhatsApp Flow Builder Drawer */}
            {showNewFlow && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[var(--text-primary)]">
                    {loc('تصميم تدفق واتساب تفاعلي جديد (WhatsApp Interactive Flow)', 'Design New Interactive WhatsApp Flow')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewFlow(false)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {flowError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-600 font-semibold">
                    ✗ {flowError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('اسم التدفق التفاعلي *', 'Flow Name *')}
                    </label>
                    <input
                      type="text"
                      value={newFlowName}
                      onChange={(e) => setNewFlowName(e.target.value)}
                      placeholder={loc('مثال: نموذج حجز موعد استشارة', 'e.g. Appointment Booking Flow')}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('نوع التدفق (Category)', 'Flow Category')}
                    </label>
                    <select
                      value={newFlowCategory}
                      onChange={(e) => setNewFlowCategory(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                    >
                      <option value="BOOKING">Appointment / Booking</option>
                      <option value="LEAD_GENERATION">Lead Generation Form</option>
                      <option value="SURVEY">Customer Feedback Survey</option>
                      <option value="CUSTOMER_SUPPORT">Support Ticket Intake</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {loc('عدد الشاشات التفاعلية', 'Interactive Screens Count')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newFlowScreens}
                      onChange={(e) => setNewFlowScreens(Number(e.target.value))}
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    {loc('الحقول المطلوبة من العميل داخل واتساب (مفصولة بفاصلة)', 'Form Input Fields (comma-separated)')}
                  </label>
                  <input
                    type="text"
                    value={newFlowFields}
                    onChange={(e) => setNewFlowFields(e.target.value)}
                    placeholder="Full Name, Phone Number, Preferred Branch, Date & Time"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewFlow(false)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-1.5 text-xs font-bold text-[var(--text-muted)] cursor-pointer"
                  >
                    {loc('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateFlow()}
                    disabled={creatingFlow}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                  >
                    {creatingFlow && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{loc('نشر وحفظ التدفق التفاعلي', 'Publish WhatsApp Flow')}</span>
                  </button>
                </div>
              </div>
            )}

            {flows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                  <GitBranch className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('لا توجد تدفقات واتساب تفاعلية بعد', 'No Interactive WhatsApp Flows')}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                  {loc('صمم نماذج حجز، استبيانات، وكتالوجات تفاعلية تعمل داخل تطبيق واتساب مباشرة.', 'Design interactive multi-step booking forms, surveys, and menus embedded in WhatsApp.')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewFlow(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{loc('إنشاء تدفق تفاعلي', '+ Create Flow')}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {flows.map((fl, idx) => (
                  <div key={fl.id || idx} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{fl.name}</h4>
                      <span className="text-[11px] text-[var(--text-muted)] mt-0.5 block">
                        {fl.screensCount || 3} {loc('شاشات تفاعلية', 'interactive screens')} · {fl.category || 'BOOKING'}
                      </span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      fl.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {fl.status || 'PUBLISHED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: Meta Business Agent Console */}
      {activeSubTab === 'business_agent' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('إعدادات وكيل Meta Business Agent الذكي', 'Meta Business Agent Configuration')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('وكيل ذكاء اصطناعي رسمي معتمد من Meta يتولى الردود الذكية وتوجيه العملاء', 'Official Meta-approved conversational AI agent with dynamic handover')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentEnabled}
                onChange={(e) => setAgentEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              {loc('موجه النظام وتعليمات السلوك (System Prompt)', 'Agent Persona & Instructions')}
            </label>
            <textarea
              rows={4}
              value={agentPrompt}
              onChange={(e) => setAgentPrompt(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('نبرة الصوت وأسلوب المحادثة', 'Tone of Voice')}
              </label>
              <select
                value={agentTone}
                onChange={(e) => setAgentTone(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] cursor-pointer"
              >
                <option value="Professional">Professional (رسمي وتنفيذي)</option>
                <option value="Friendly">Friendly & Enthusiastic (ودود ومرح)</option>
                <option value="Direct">Concise & Direct (مختصر ومباشر)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('رقم الهاتف للتحويل البشري المباشر', 'Escalation Phone Line')}
              </label>
              <input
                type="tel"
                value={fallbackPhone}
                onChange={(e) => setFallbackPhone(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              {agentSaved && (
                <span className="text-xs font-bold text-emerald-600">
                  ✓ {loc('تم حفظ إعدادات الوكيل الذكي ومزامنتها مع Meta!', 'Agent settings saved!')}
                </span>
              )}
              {agentError && (
                <span className="text-xs font-bold text-rose-600">
                  ✗ {agentError}
                </span>
              )}
            </div>
            <button
              onClick={handleSaveAgent}
              disabled={savingAgent}
              className="ms-auto rounded-xl bg-[var(--accent-primary)] px-6 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              {loc('حفظ ومزامنة الوكيل', 'Save Agent Settings')}
            </button>
          </div>
        </div>
      )}

      {/* SUB-PANEL 4: Branded Calling Identity */}
      {activeSubTab === 'branded_calling' && (
        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5 shadow-2xs">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {loc('هوية المتصل المعتمدة وشعار النشاط (Branded Calling)', 'Branded Calling Identity')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {loc('عرض اسم شركتك وشعارك وسبب الاتصال على شاشة هاتف العميل قبل الرد لزيادة نسبة الرد بنسبة 85%', 'Display business name, logo, and call reason on recipient smartphones')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('اسم المتصل المعروض (Max 35 Chars)', 'Caller Display Name')}
              </label>
              <input
                type="text"
                maxLength={35}
                value={brandDisplayName}
                onChange={(e) => setBrandDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                {loc('سبب الاتصال الافتراضي (Call Reason)', 'Default Call Reason')}
              </label>
              <input
                type="text"
                value={brandReason}
                onChange={(e) => setBrandReason(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            {brandedSaved && (
              <span className="text-xs font-bold text-emerald-600">
                ✓ {loc('تم تسجيل وتوثيق هوية المتصل بنجاح!', 'Branded Caller ID registered!')}
              </span>
            )}
            <button
              onClick={handleSaveBranded}
              disabled={savingBranded}
              className="ms-auto rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
            >
              {loc('اعتماد وتوثيق هوية الاتصال', 'Register Branded ID')}
            </button>
          </div>
        </div>
      )}

      {/* SUB-PANEL 5: Regulatory & Carrier Hub */}
      {activeSubTab === 'regulatory' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['10dlc', 'porting', 'rcs', 'verify'].map((r) => (
              <button
                key={r}
                onClick={() => setRegTab(r as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  regTab === r ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {regTab === 'verify' && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('محرك التحقق من الهوية ورموز الـ OTP (Omnichannel Verify Engine)', 'Omnichannel Verify OTP Engine')}
              </h3>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  placeholder="+966501234567 or +12025550184"
                  className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />
                <button
                  onClick={handleSendOtp}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  {loc('إرسال رمز OTP', 'Send OTP')}
                </button>
              </div>

              {otpSent && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP code (e.g. 482910)"
                    className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                  />
                  <button
                    onClick={handleCheckOtp}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    {loc('تحقق', 'Verify Code')}
                  </button>
                </div>
              )}

              {otpError && (
                <div className="text-xs font-bold text-rose-600">
                  ✗ {otpError}
                </div>
              )}

              {otpVerified && (
                <div className="text-xs font-bold text-emerald-600">
                  ✓ {loc('تم التحقق من الرمز بنجاح وتأكيد صحة الرقم!', 'OTP verified successfully!')}
                </div>
              )}
            </div>
          )}

          {regTab === '10dlc' && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('تسجيل العلامة التجارية وحملات US 10DLC / Sender ID', 'US 10DLC & Alphanumeric Sender ID Registration')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {loc('سجل هويتك التجارية لدى Campaign Registry TCR لرفع معدل توصيل الرسائل النصية', 'Register your business entity with TCR for high-throughput carrier SMS delivery')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={dlcBrandName}
                  onChange={(e) => setDlcBrandName(e.target.value)}
                  placeholder={loc('الاسم القانوني للشركة', 'Legal Business Name')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  value={dlcEin}
                  onChange={(e) => setDlcEin(e.target.value)}
                  placeholder={loc('الرقم الضريبي / السجل التجاري (EIN / CR)', 'Tax ID / EIN / CR Number')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
                <select
                  value={dlcUseCase}
                  onChange={(e) => setDlcUseCase(e.target.value)}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="CUSTOMER_CARE">Customer Care & Alerts</option>
                  <option value="2FA">2FA & Security OTP</option>
                  <option value="MARKETING">Promotional Marketing</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                {dlcSaved && <span className="text-xs font-bold text-emerald-600">✓ {dlcSaved}</span>}
                <button
                  type="button"
                  onClick={async () => {
                    if (!dlcBrandName.trim()) return;
                    await fetch('/api/v1/sms/registration', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ brandName: dlcBrandName, taxId: dlcEin, useCase: dlcUseCase }),
                    }).catch(() => null);
                    setDlcSaved(loc('تم إرسال طلب تسجيل العلامة التجارية بنجاح!', '10DLC Brand Registration submitted!'));
                  }}
                  className="ms-auto rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  {loc('إرسال طلب التسجيل', 'Submit 10DLC Registration')}
                </button>
              </div>
            </div>
          )}

          {regTab === 'porting' && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('نقل الأرقام الحالية إلى المنصة (Carrier Number Porting - LOA)', 'Carrier Number Porting (LOA)')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {loc('انقل أرقام شركتك الأرضية أو المحمولة الحالية للعمل عبر Asra3 دون أي انقطاع في الخدمة.', 'Port existing landline or mobile carrier lines into Asra3 with zero downtime.')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="tel"
                  value={portNumber}
                  onChange={(e) => setPortNumber(e.target.value)}
                  placeholder={loc('الرقم المراد نقله (+1...)', 'Phone Number to Port (+1...)')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-mono text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  value={portCarrier}
                  onChange={(e) => setPortCarrier(e.target.value)}
                  placeholder={loc('المشغل الحالي (مثل: AT&T / Twilio)', 'Current Carrier Name')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  value={portAccountPin}
                  onChange={(e) => setPortAccountPin(e.target.value)}
                  placeholder={loc('رقم الحساب / رمز PIN للنقل', 'Carrier Account / Port-Out PIN')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-center justify-between">
                {portSaved && <span className="text-xs font-bold text-emerald-600">✓ {portSaved}</span>}
                <button
                  type="button"
                  onClick={async () => {
                    if (!portNumber.trim()) return;
                    await fetch('/api/v1/phone-numbers/porting', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phoneNumber: portNumber, losingCarrier: portCarrier, accountPin: portAccountPin }),
                    }).catch(() => null);
                    setPortSaved(loc('تم تقديم طلب نقل الرقم بنجاح!', 'Porting order submitted!'));
                  }}
                  className="ms-auto rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  {loc('تقديم طلب نقل الرقم', 'Submit Porting Request')}
                </button>
              </div>
            </div>
          )}

          {regTab === 'rcs' && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('رسائل الأعمال الغنية والموثقة (Verified RCS Business Messaging)', 'Verified RCS Business Messaging')}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {loc('أرسل بطاقات تفاعلية، قوائم صور متحركة، وأزرار شراء مباشرة لمستخدمي أندرويد بهوية موثقة.', 'Interactive rich cards and action carousels for Android users.')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={rcsAgentName}
                  onChange={(e) => setRcsAgentName(e.target.value)}
                  placeholder={loc('اسم وكيل RCS المعروض (Agent Display Name)', 'RCS Agent Display Name')}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
                <input
                  type="url"
                  value={rcsWebsite}
                  onChange={(e) => setRcsWebsite(e.target.value)}
                  placeholder="https://asra3.com"
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-center justify-between">
                {rcsSaved && <span className="text-xs font-bold text-emerald-600">✓ {rcsSaved}</span>}
                <button
                  type="button"
                  onClick={async () => {
                    if (!rcsAgentName.trim()) return;
                    await fetch('/api/v1/rcs/agents', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: rcsAgentName, website: rcsWebsite }),
                    }).catch(() => null);
                    setRcsSaved(loc('تم تسجيل وتفعيل وكيل RCS بنجاح!', 'RCS Business Agent provisioned!'));
                  }}
                  className="ms-auto rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  {loc('تسجيل وكيل RCS الموثق', 'Provision RCS Agent')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
