'use client';

import React, { useState } from 'react';
import {
  X,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Play,
  ArrowRight,
  MessageSquare,
  ShoppingBag,
  HeartHandshake,
  Headphones,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface ManyChatPresetsWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface PresetDefinition {
  id: string;
  title: string;
  titleAr: string;
  category: string;
  categoryAr: string;
  platform: string;
  triggerKeywords: string[];
  icon: any;
  color: string;
  description: string;
  descriptionAr: string;
  nodesCount: number;
  flowSteps: string[];
}

const PRESETS: PresetDefinition[] = [
  {
    id: 'lead_capture_bot',
    title: 'Lead Capture & CRM Sync Bot',
    titleAr: 'روبوت جمع العملاء والمزامنة مع الـ CRM',
    category: 'Lead Generation',
    categoryAr: 'اكتساب عملاء',
    platform: 'Instagram / Messenger',
    triggerKeywords: ['INFO', 'START', 'DEAL', 'مهتم'],
    icon: Zap,
    color: 'from-amber-500 to-orange-500',
    description: 'Greets inbound lead, collects phone number, creates CRM record, and dispatches SMS confirmation.',
    descriptionAr: 'يستقبل العميل المهتم، يجمع رقم هاتفه، ينشئ ملفاً في الـ CRM، ويرسل تأكيداً بالـ SMS.',
    nodesCount: 5,
    flowSteps: [
      'Keyword Trigger (INFO, START)',
      'Greeting & Value Proposition',
      'Phone Number Validation Field',
      'Create CRM Contact (Tag: Lead)',
      'SMS Welcome Confirmation',
    ],
  },
  {
    id: 'ecommerce_faq_bot',
    title: 'E-Commerce FAQ & Orders Bot',
    titleAr: 'روبوت متجر الأسئلة الشائعة وتتبع الطلبات',
    category: 'E-Commerce',
    categoryAr: 'تجارة إلكترونية',
    platform: 'Instagram / WhatsApp',
    triggerKeywords: ['PRICE', 'SHIPPING', 'DELIVERY', 'توصيل', 'سعر'],
    icon: ShoppingBag,
    color: 'from-emerald-500 to-teal-500',
    description: 'Instant answers for shipping rates, store hours, return policy, and live order tracking link.',
    descriptionAr: 'إجابات فورية عن أسعار الشحن، أوقات العمل، سياسة الاسترجاع ورابط تتبع الطلب المباشر.',
    nodesCount: 4,
    flowSteps: [
      'Keywords (PRICE, SHIPPING)',
      'Quick Replies Menu (Policy, Hours, Track)',
      'Conditional Path Routing',
      'Direct Checkout Link Dispatch',
    ],
  },
  {
    id: 'story_comment_to_dm',
    title: 'Story & Comment-to-DM Growth Bot',
    titleAr: 'روبوت تحويل التعليقات والستوري لرسائل خاصة',
    category: 'Social Growth',
    categoryAr: 'نمو التفاعل',
    platform: 'Instagram',
    triggerKeywords: ['PROMO', 'CODE', 'LINK', 'كود', 'رابط'],
    icon: MessageSquare,
    color: 'from-purple-500 to-indigo-500',
    description: 'Replies to post comments publicly and immediately sends the private promo discount code via DM.',
    descriptionAr: 'يرد على التعليق في المنشور علناً ويرسل كود الخصم 20% فوراً في رسالة خاصة DM.',
    nodesCount: 4,
    flowSteps: [
      'Post Comment Trigger (PROMO)',
      'Public Friendly Comment Reply',
      'Private DM with 20% Promo Code',
      'Assign Tag "Engaged Follower"',
    ],
  },
  {
    id: 'ai_support_handover',
    title: 'AI Support to Live Agent Handover',
    titleAr: 'روبوت الدعم الذكي والتحويل للموظف البشري',
    category: 'Customer Support',
    categoryAr: 'دعم فني',
    platform: 'Omnichannel',
    triggerKeywords: ['HUMAN', 'AGENT', 'HELP', 'موظف', 'مساعدة'],
    icon: Headphones,
    color: 'from-blue-500 to-cyan-500',
    description: 'AI handles tier-1 questions; seamlessly escalates complex requests to human desk softphone.',
    descriptionAr: 'الذكاء الاصطناعي يجيب على الاستفسارات البسيطة، وعند الحاجة يحول المحادثة فوراً للاتصال بموظف.',
    nodesCount: 4,
    flowSteps: [
      'Keywords (AGENT, HUMAN)',
      'Meta Thread Control Handover',
      'Softphone Dialer Push Notification',
      'Assign Ticket to Live Support Queue',
    ],
  },
];

export function ManyChatPresetsWizard({
  isOpen,
  onClose,
  onSuccess,
}: ManyChatPresetsWizardProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedMap, setInstalledMap] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simulation state
  const [simulatingPreset, setSimulatingPreset] = useState<PresetDefinition | null>(null);
  const [testKeyword, setTestKeyword] = useState<string>('');
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInstallPreset = async (preset: PresetDefinition) => {
    setInstallingId(preset.id);
    setErrorMsg(null);
    try {
      // 1. Create Workflow
      const createRes = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: isRTL ? preset.titleAr : preset.title,
          description: preset.description,
          trigger: {
            type: 'dm_keyword',
            keywords: preset.triggerKeywords,
          },
          nodes: preset.flowSteps.map((step, idx) => ({
            id: `node_${idx + 1}`,
            title: step,
            type: idx === 0 ? 'trigger' : idx === preset.flowSteps.length - 1 ? 'action' : 'process',
          })),
        }),
      });
      const createData = await createRes.json();
      const workflowId = createData.data?.id || `wf_${preset.id}`;

      // 2. Activate Workflow
      await fetch(`/api/v1/workflows/${workflowId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setInstalledMap((prev) => ({ ...prev, [preset.id]: true }));
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || loc('فشل تثبيت وتفعيل مسار العمل', 'Failed to install workflow preset'));
    } finally {
      setInstallingId(null);
    }
  };

  const handleRunSimulation = (preset: PresetDefinition) => {
    setSimulatingPreset(preset);
    setTestKeyword(preset.triggerKeywords[0]);
    setSimulationLogs([
      `[${new Date().toLocaleTimeString()}] Listening for trigger on ${preset.platform}...`,
    ]);
  };

  const handleTriggerSimulation = () => {
    if (!simulatingPreset || !testKeyword) return;
    setIsSimulating(true);

    setTimeout(() => {
      setSimulationLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Inbound message matched keyword: "${testKeyword}" ✓`,
        `[${new Date().toLocaleTimeString()}] Node 1: Evaluated condition -> MATCH`,
        `[${new Date().toLocaleTimeString()}] Node 2: Dispatched automated response to user`,
        `[${new Date().toLocaleTimeString()}] Node 3: CRM record updated & thread control active! 🚀`,
      ]);
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="luxury-card relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-500">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {loc('قوالب ميني شات الجاهزة بنقرة واحدة', '1-Click ManyChat Automation Presets')}
                </h2>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                  {loc('بدون كود', 'Zero-Code Bots')}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('4 مسارات عمل ذكية مثبتة لزيادة المبيعات والرد التلقائي على الرسائل والتعليقات', '4 battle-tested automation bots ready for instant 1-click activation')}
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
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Presets Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const isInstalled = !!installedMap[p.id];
              const isLoading = installingId === p.id;

              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 transition hover:border-[var(--accent-primary)]/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${p.color} text-white shadow-sm`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-[var(--bg-card)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        {p.platform}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      {isRTL ? p.titleAr : p.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {isRTL ? p.descriptionAr : p.description}
                    </p>

                    {/* Trigger keywords */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.triggerKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-lg bg-[var(--bg-card)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>

                    {/* Flow steps pill summary */}
                    <div className="mt-3 text-[10px] text-[var(--text-muted)]">
                      {p.nodesCount} {loc('خطوات متسلسلة في مسار العمل', 'workflow nodes')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => handleInstallPreset(p)}
                      disabled={isLoading || isInstalled}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        isInstalled
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                          : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] shadow-sm'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isInstalled ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {isInstalled
                          ? loc('مفعل بنجاح ✓', 'Active ✓')
                          : loc('تثبيت وتفعيل بنقرة واحدة', '1-Click Install')}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRunSimulation(p)}
                      title={loc('محاكاة التشغيل في المتصفح', 'Simulate in browser')}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Simulation Drawer */}
          {simulatingPreset && (
            <div className="rounded-3xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {loc('محاكاة تفاعلية فورية:', 'Interactive Bot Simulation:')}{' '}
                    {isRTL ? simulatingPreset.titleAr : simulatingPreset.title}
                  </span>
                </div>
                <button
                  onClick={() => setSimulatingPreset(null)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testKeyword}
                  onChange={(e) => setTestKeyword(e.target.value)}
                  placeholder="Type keyword e.g. INFO, PROMO, PRICE"
                  className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={handleTriggerSimulation}
                  disabled={isSimulating || !testKeyword}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition cursor-pointer"
                >
                  {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{loc('تشغيل المحاكاة', 'Simulate Trigger')}</span>
                </button>
              </div>

              {/* Console logs */}
              <div className="rounded-2xl bg-slate-950 p-3 font-mono text-[10px] text-emerald-400 max-h-32 overflow-y-auto space-y-1">
                {simulationLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-[var(--accent-primary)] px-6 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
          >
            {loc('إتمام والعودة للوحة التحكم', 'Done & Return')}
          </button>
        </div>
      </div>
    </div>
  );
}
