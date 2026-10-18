'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Key,
  Webhook,
  Wallet,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ShieldAlert,
  Send,
  Terminal,
  Download,
  ExternalLink,
  CheckCircle2,
  Lock,
  Play,
} from 'lucide-react';
import type {
  ApiKeyScope,
  DeveloperApiKeyItem,
  CustomerWebhookItem,
  ApiRequestLogItem,
  TelecomWalletState,
} from '@/lib/storage/workspace-store';

interface DeveloperApiAndWebhooksConsoleProps {
  isRTL: boolean;
  defaultApiKey: string;
  plan?: {
    id: string;
    name: string;
    price: string;
    maxConnectedAccounts: number;
    maxMonthlyPosts: number;
    maxPhoneNumbers: number;
    apiRequestsPerMinute?: number;
  };
  usage: {
    connectedAccounts: number;
    posts: number;
    phoneNumbers: number;
  };
  developerHub?: {
    apiKeys: DeveloperApiKeyItem[];
    webhooks: CustomerWebhookItem[];
    apiLogs: ApiRequestLogItem[];
    wallet: TelecomWalletState;
  };
  onRunServiceAction: (payload: Record<string, any>, toastMsg?: string) => Promise<any>;
  onRefreshWorkspace: () => Promise<void>;
}

const ALL_SCOPES: { id: ApiKeyScope; label: string; descAr: string; descEn: string }[] = [
  { id: 'full_access', label: 'full_access', descAr: 'صلاحية كاملة لجميع خدمات المنصة', descEn: 'Full access to all API v1 endpoints' },
  { id: 'accounts:read', label: 'accounts:read', descAr: 'قراءة القنوات والحسابات المربوطة', descEn: 'Read connected social accounts' },
  { id: 'accounts:write', label: 'accounts:write', descAr: 'ربط وفصل القنوات الاجتماعية (OAuth/Tokens)', descEn: 'Connect & disconnect social channels' },
  { id: 'posts:write', label: 'posts:write', descAr: 'نشر وجدولة المنشورات ورفع الوسائط', descEn: 'Publish, schedule & delete posts' },
  { id: 'telephony:read', label: 'telephony:read', descAr: 'البحث عن الأرقام وقراءة الرسائل والـ OTP وسجل المكالمات', descEn: 'Search numbers, read SMS/OTP & call logs' },
  { id: 'telephony:write', label: 'telephony:write', descAr: 'شراء الأرقام، ربط واتساب، إرسال SMS وإجراء مكالمات', descEn: 'Buy numbers, link WhatsApp, send SMS & voice calls' },
  { id: 'inbox:write', label: 'inbox:write', descAr: 'إدارة صندوق الرسائل الموحد والرد الآلي', descEn: 'Read & reply to unified inbox threads' },
  { id: 'ads:write', label: 'ads:write', descAr: 'إطلاق الحملات وإرسال أحداث Conversion API', descEn: 'Manage ad campaigns & fire CAPI events' },
  { id: 'commerce:write', label: 'commerce:write', descAr: 'إدارة المنتجات والطلبات والكتالوج', descEn: 'Manage products, catalog & orders' },
  { id: 'analytics:read', label: 'analytics:read', descAr: 'قراءة التقارير والتحليلات', descEn: 'Read cross-channel analytics' },
  { id: 'webhooks:write', label: 'webhooks:write', descAr: 'إدارة روابط الـ Webhooks وتوقيعات الأمان', descEn: 'Register & test outbound webhooks' },
];

const WEBHOOK_EVENTS = [
  { id: '*', label: '* (All 72 Events)', descAr: 'استقبال جميع الأحداث الـ 72 عبر كل الخدمات', descEn: 'Receive all 72 events across all 8 services' },
  { id: 'post.published', label: 'post.published', descAr: 'عند نشر أو جدولة منشور جديد', descEn: 'When a post is published or scheduled' },
  { id: 'post.failed', label: 'post.failed', descAr: 'عند فشل نشر منشور', descEn: 'When a post fails to publish' },
  { id: 'message.received', label: 'message.received', descAr: 'عند وصول رسالة واردة (واتساب/إنستغرام/ماسنجر/SMS)', descEn: 'When an inbound DM, WhatsApp, or SMS message arrives' },
  { id: 'message.sent', label: 'message.sent', descAr: 'عند إرسال رسالة صادرة وتحديث حالة التسليم', descEn: 'When an outbound message is sent or delivered' },
  { id: 'comment.received', label: 'comment.received', descAr: 'عند وصول تعليق جديد على أي منشور', descEn: 'When a new social post comment arrives' },
  { id: 'review.new', label: 'review.new', descAr: 'عند وصول تقييم نجوم جديد على فيسبوك أو جوجل', descEn: 'When a new Facebook or Google star review is posted' },
  { id: 'call.received', label: 'call.received', descAr: 'عند استقبال أو انتهاء مكالمة صوتية', descEn: 'When an inbound/outbound call is received or completed' },
  { id: 'lead.received', label: 'lead.received', descAr: 'عند تسجيل عميل محتمل جديد من إعلانات Lead Gen', descEn: 'When a new lead submits an instant Lead Gen form' },
  { id: 'whatsapp.template.status_updated', label: 'whatsapp.template.*', descAr: 'عند اعتماد أو رفض قالب واتساب رسمي', descEn: 'When a WhatsApp template or number status updates' },
  { id: 'verification.approved', label: 'verification.approved', descAr: 'عند نجاح التحقق من كود OTP للعميل', descEn: 'When a Verify OTP code is approved' },
  { id: 'commerce.product.created', label: 'commerce.product.*', descAr: 'عند إنشاء أو تحديث منتج في المتجر', descEn: 'When a store product is created or updated' },
  { id: 'number.purchased', label: 'number.purchased', descAr: 'عند شراء وتفعيل رقم افتراضي جديد', descEn: 'When a virtual number is provisioned' },
  { id: 'whatsapp.linked', label: 'whatsapp.linked', descAr: 'عند توثيق وربط رقم بـ WhatsApp Cloud API', descEn: 'When WhatsApp Business OTP verification succeeds' },
];

export default function DeveloperApiAndWebhooksConsole({
  isRTL,
  defaultApiKey,
  plan,
  usage,
  developerHub,
  onRunServiceAction,
  onRefreshWorkspace,
}: DeveloperApiAndWebhooksConsoleProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newlyCreatedSecretKey, setNewlyCreatedSecretKey] = useState<string | null>(null);

  // Create API Key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(['full_access']);
  const [creatingKey, setCreatingKey] = useState(false);

  // Create Webhook form state
  const [webhookUrl, setWebhookUrl] = useState('https://api.yourcompany.com/webhooks/techurity');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    '*',
    'post.published',
    'message.received',
    'message.sent',
    'call.received',
    'lead.received',
  ]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Live API v1 Test Runner state
  const [selectedTestEndpoint, setSelectedTestEndpoint] = useState<{
    label: string;
    method: 'GET' | 'POST';
    path: string;
    body?: Record<string, any>;
  }>({
    label: isRTL ? 'فحص الحساب والحصص والرصيد (GET /api/v1/me)' : 'Inspect Workspace, Quotas & Wallet (GET /api/v1/me)',
    method: 'GET',
    path: '/api/v1/me',
  });
  const [liveTestResponse, setLiveTestResponse] = useState<string | null>(null);
  const [runningLiveTest, setRunningLiveTest] = useState(false);

  const apiKeys = developerHub?.apiKeys || [];
  const webhooks = developerHub?.webhooks || [];
  const apiLogs = developerHub?.apiLogs || [];
  const wallet: TelecomWalletState = developerHub?.wallet || {
    balanceUsd: 50.0,
    monthlySpentUsd: 0,
    currency: 'USD',
    transactions: [],
  };

  const activeBearerKey =
    apiKeys.find((k) => k.status === 'active')?.token || defaultApiKey;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleScope = (scope: ApiKeyScope) => {
    if (scope === 'full_access') {
      setSelectedScopes(['full_access']);
      return;
    }
    const withoutFull = selectedScopes.filter((s) => s !== 'full_access');
    if (withoutFull.includes(scope)) {
      const next = withoutFull.filter((s) => s !== scope);
      setSelectedScopes(next.length > 0 ? next : ['full_access']);
    } else {
      setSelectedScopes([...withoutFull, scope]);
    }
  };

  const toggleWebhookEvent = (ev: string) => {
    if (selectedEvents.includes(ev)) {
      const next = selectedEvents.filter((e) => e !== ev);
      if (next.length > 0) setSelectedEvents(next);
    } else {
      setSelectedEvents([...selectedEvents, ev]);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await onRunServiceAction(
        {
          subService: 'support_ai',
          action: 'create_api_key',
          name: newKeyName.trim(),
          environment: newKeyEnv,
          scopes: selectedScopes,
        },
        isRTL ? 'تم توليد مفتاح API الجديد بنجاح!' : 'New scoped API key generated!'
      );
      if (res?.apiKey?.token) {
        setNewlyCreatedSecretKey(res.apiKey.token);
      }
      setNewKeyName('');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRollKey = async (keyId: string) => {
    const res = await onRunServiceAction(
      {
        subService: 'support_ai',
        action: 'roll_api_key',
        keyId,
      },
      isRTL ? 'تم تدوير المفتاح وإصدار مفتاح سري جديد!' : 'API key rotated successfully!'
    );
    if (res?.apiKey?.token) {
      setNewlyCreatedSecretKey(res.apiKey.token);
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setCreatingWebhook(true);
    try {
      await onRunServiceAction(
        {
          subService: 'support_ai',
          action: 'create_webhook',
          url: webhookUrl.trim(),
          events: selectedEvents,
        },
        isRTL ? 'تم تسجيل رابط الـ Webhook مع مفتاح التوقيع بنجاح!' : 'Outbound Webhook registered with HMAC secret!'
      );
    } finally {
      setCreatingWebhook(false);
    }
  };

  const runRealApiV1Call = async (
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, any>
  ) => {
    setRunningLiveTest(true);
    try {
      const res = await fetch(path, {
        method,
        headers: {
          Authorization: `Bearer ${activeBearerKey}`,
          'Content-Type': 'application/json',
        },
        body: method === 'POST' && body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setLiveTestResponse(JSON.stringify(data, null, 2));
      await onRefreshWorkspace();
    } catch (err: any) {
      setLiveTestResponse(JSON.stringify({ error: err?.message || 'Network error' }, null, 2));
    } finally {
      setRunningLiveTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PLAN QUOTAS & TELECOM CREDIT WALLET */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Quotas Card */}
        <div className="lg:col-span-7 bg-[#111928]/90 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {isRTL ? 'حصص الباقة وحدود الاستخدام الفعلي (Hard Quotas)' : 'Plan Quotas & Real-Time Enforcement'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRTL
                    ? `الباقة الحالية: ${plan?.name || 'Pro Growth'} • يتم تطبيق الحدود تلقائياً على الواجهة والـ API`
                    : `Active Plan: ${plan?.name || 'Pro Growth'} • Enforced across UI & REST API v1`}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {plan?.apiRequestsPerMinute ?? 120} req/min
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">
                {isRTL ? 'القنوات الاجتماعية المربوطة' : 'Connected Channels'}
              </div>
              <div className="text-xl font-black text-white">
                {usage.connectedAccounts}{' '}
                <span className="text-xs text-slate-500 font-semibold">/ {plan?.maxConnectedAccounts ?? 25}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.connectedAccounts / (plan?.maxConnectedAccounts || 25)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">
                {isRTL ? 'المنشورات الشهرية والجدولة' : 'Monthly Posts & Queue'}
              </div>
              <div className="text-xl font-black text-white">
                {usage.posts}{' '}
                <span className="text-xs text-slate-500 font-semibold">/ {plan?.maxMonthlyPosts ?? 500}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.posts / (plan?.maxMonthlyPosts || 500)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4">
              <div className="text-xs text-slate-400 mb-1">
                {isRTL ? 'الأرقام الافتراضية المملوكة' : 'Virtual Phone Numbers'}
              </div>
              <div className="text-xl font-black text-white">
                {usage.phoneNumbers}{' '}
                <span className="text-xs text-slate-500 font-semibold">/ {plan?.maxPhoneNumbers ?? 5}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((usage.phoneNumbers / (plan?.maxPhoneNumbers || 5)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telecom Credit Wallet Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950/40 via-[#111928] to-[#111928] border border-emerald-500/25 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isRTL ? 'محفظة رصيد الاتصالات (Telecom Wallet)' : 'Telecom & Messaging Credit Wallet'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRTL
                      ? 'تُخصم منها رسوم شراء الأرقام، رسائل الـ SMS، والمكالمات الصوتية'
                      : 'Used for Virtual Numbers, SMS ($0.015), WhatsApp & Voice ($0.04/m)'}
                  </p>
                </div>
              </div>
              <div className="text-end">
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  ${wallet.balanceUsd.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isRTL ? `استهلاك الشهر: $${wallet.monthlySpentUsd.toFixed(2)}` : `Spent: $${wallet.monthlySpentUsd.toFixed(2)}`}
                </div>
              </div>
            </div>

            {wallet.transactions && wallet.transactions.length > 0 && (
              <div className="bg-slate-950/75 border border-white/5 rounded-xl p-2.5 mb-3 max-h-24 overflow-y-auto space-y-1">
                {wallet.transactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 truncate max-w-[220px]">{tx.description}</span>
                    <span className={`font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-amber-300'}`}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amountUsd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <span className="text-[11px] text-slate-400">
              {isRTL ? 'جاهز للربط مع بوابة الدفع (Stripe / Paymob)' : 'Payment Gateway Ready (Webhook Top-up)'}
            </span>
            <button
              onClick={() =>
                onRunServiceAction(
                  { subService: 'support_ai', action: 'topup_wallet', amountUsd: 25 },
                  isRTL ? 'تم شحن محفظة الاتصالات بمبلغ $25.00 بنجاح!' : 'Added $25.00 to Telecom Credit Wallet!'
                )
              }
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer"
            >
              {isRTL ? '+ شحن رصيد تجريبي ($25)' : '+ Top Up $25 Credit'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. SCOPED DEVELOPER API KEYS MANAGER */}
      <div className="bg-[#111928]/90 border border-white/10 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {isRTL ? 'مفاتيح الـ API وصلاحيات الوصول (Scoped API Keys)' : 'Scoped Developer API Keys (Bearer Auth)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRTL
                  ? 'أنشئ مفاتيح بصلاحيات مخصصة (قراءة فقط، نشر، أرقام واتساب، أو صلاحية كاملة) مع دعم التدوير الفوري والإلغاء'
                  : 'Create keys with granular scopes (full_access, telephony:write, posts:write) and rotate or revoke anytime'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              OpenAPI 3.1 JSON
            </a>
            <a
              href="/api/v1/postman.json"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Postman Collection
            </a>
            <Link
              href="/docs"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-black text-white flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {isRTL ? 'مرجع الـ API الكامل' : 'Full API Docs'}
            </Link>
          </div>
        </div>

        {/* Newly minted secret banner */}
        {newlyCreatedSecretKey && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {isRTL
                  ? 'تم إصدار المفتاح السري الجديد — انسخه الآن لاستخدامه في تطبيقك:'
                  : 'New Secret API Key Generated — Copy it now for your Authorization header:'}
              </div>
              <code className="text-xs font-mono text-white mt-1 block break-all">{newlyCreatedSecretKey}</code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyText(newlyCreatedSecretKey, 'newly_minted')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'newly_minted' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'newly_minted' ? (isRTL ? 'تم النسخ' : 'Copied') : isRTL ? 'نسخ المفتاح' : 'Copy Key'}
              </button>
              <button
                onClick={() => setNewlyCreatedSecretKey(null)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white text-xs"
              >
                {isRTL ? 'إخفاء' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {/* Create new key bar */}
        <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            <div className="md:col-span-6">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isRTL ? 'اسم المفتاح (مثال: سيرفر الباك إند / تطبيق الموبايل)' : 'Key Label (e.g. Production Worker / Mobile App)'}
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={isRTL ? 'مثال: Production Backend API Key' : 'e.g. Production Backend API Key'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                {isRTL ? 'بيئة المفتاح' : 'Environment'}
              </label>
              <select
                value={newKeyEnv}
                onChange={(e) => setNewKeyEnv(e.target.value as 'live' | 'test')}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="live">Production (tk_live_...)</option>
                <option value="test">Sandbox (tk_test_...)</option>
              </select>
            </div>
            <div className="md:col-span-3 flex items-end">
              <button
                onClick={handleCreateKey}
                disabled={creatingKey || !newKeyName.trim()}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'توليد مفتاح API جديد' : 'Generate Scoped Key'}
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-2">
              {isRTL ? 'اختر صلاحيات المفتاح (Scopes):' : 'Select Permission Scopes:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SCOPES.map((sc) => {
                const active = selectedScopes.includes(sc.id);
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => toggleScope(sc.id)}
                    title={isRTL ? sc.descAr : sc.descEn}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600/25 border-indigo-500 text-indigo-200'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Keys Table */}
        <div className="space-y-2.5">
          {/* Default Workspace Key always visible at top */}
          <div className="p-4 rounded-2xl border bg-slate-950/80 border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-black text-white">
                  {isRTL ? 'مفتاح مساحة العمل الافتراضي (Default Workspace Key)' : 'Default Workspace Key'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  {defaultApiKey}
                </code>
                <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[10px] border border-white/5">
                  full_access
                </span>
              </div>
            </div>
            <button
              onClick={() => copyText(defaultApiKey, 'default_key')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === 'default_key' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'default_key' ? (isRTL ? 'تم النسخ' : 'Copied') : isRTL ? 'نسخ المفتاح' : 'Copy Key'}
            </button>
          </div>

          {apiKeys.map((k) => (
            <div
              key={k.id}
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                k.status === 'revoked'
                  ? 'bg-slate-950/40 border-red-500/20 opacity-60'
                  : 'bg-slate-950/80 border-white/10'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-black text-white">{k.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      k.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {k.status}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isRTL ? `عدد الطلبات: ${k.requestCount || 0}` : `Requests: ${k.requestCount || 0}`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                    {k.token}
                  </code>
                  {k.scopes.map((sc) => (
                    <span
                      key={sc}
                      className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[10px] border border-white/5"
                    >
                      {sc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyText(k.token, k.id)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === k.id ? (isRTL ? 'تم النسخ' : 'Copied') : isRTL ? 'نسخ' : 'Copy'}
                </button>
                {k.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleRollKey(k.id)}
                      title={isRTL ? 'تدوير المفتاح وإصدار رمز جديد' : 'Roll / Rotate Secret Key'}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {isRTL ? 'تدوير (Roll)' : 'Roll Key'}
                    </button>
                    <button
                      onClick={() =>
                        onRunServiceAction(
                          { subService: 'support_ai', action: 'revoke_api_key', keyId: k.id },
                          isRTL ? 'تم إيقاف صلاحية المفتاح فوراً' : 'API Key revoked'
                        )
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                    >
                      {isRTL ? 'إيقاف' : 'Revoke'}
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    onRunServiceAction(
                      { subService: 'support_ai', action: 'delete_api_key', keyId: k.id },
                      isRTL ? 'تم حذف المفتاح' : 'API Key deleted'
                    )
                  }
                  className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. OUTBOUND WEBHOOKS & LIVE API v1 TEST RUNNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Outbound Webhooks Manager */}
        <div className="lg:col-span-6 bg-[#111928]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isRTL ? 'روابط الـ Webhooks الصادرة للعميل (HMAC-SHA256)' : 'Customer Outbound Webhooks (HMAC Signed)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRTL
                      ? 'استقبل إشعارات لحظية في سيرفرك عند وصول رسالة أو شراء رقم أو نشر بوست'
                      : 'Receive real-time HTTPS POST payloads signed with X-Techurity-Signature'}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  onRunServiceAction(
                    { subService: 'support_ai', action: 'test_webhook', eventName: 'webhook.test' },
                    isRTL ? 'تم إرسال حدث Webhook تجريبي موقع بـ HMAC-SHA256!' : 'Dispatched HMAC-signed test webhook!'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isRTL ? 'إرسال Ping تجريبي' : 'Send Test Ping'}
              </button>
            </div>

            {/* Add Webhook Form */}
            <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  {isRTL ? 'رابط استقبال الأحداث في سيرفرك (HTTPS Endpoint URL)' : 'Destination HTTPS Endpoint URL'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.yourcompany.com/webhooks/techurity"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleCreateWebhook}
                    disabled={creatingWebhook || !webhookUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black cursor-pointer"
                  >
                    {isRTL ? '+ إضافة الرابط' : '+ Add Endpoint'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {WEBHOOK_EVENTS.map((ev) => {
                  const active = selectedEvents.includes(ev.id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => toggleWebhookEvent(ev.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-purple-600/25 border-purple-500 text-purple-200'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      }`}
                    >
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Registered Webhooks List */}
            <div className="space-y-2.5">
              {webhooks.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">
                  {isRTL
                    ? 'لم يتم تسجيل أي رابط Webhook بعد. أضف رابط سيرفرك بالأعلى للحصول على مفتاح التوقيع whsec_...'
                    : 'No outbound webhooks registered yet. Add your HTTPS endpoint above to generate a whsec_... signing secret.'}
                </div>
              ) : (
                webhooks.map((wh) => (
                  <div key={wh.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-purple-300 truncate max-w-[320px]">{wh.url}</code>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {wh.lastDeliveryStatus ? `HTTP ${wh.lastDeliveryStatus}` : 'READY'}
                        </span>
                        <button
                          onClick={() =>
                            onRunServiceAction(
                              { subService: 'support_ai', action: 'delete_webhook', webhookId: wh.id },
                              isRTL ? 'تم حذف رابط الـ Webhook' : 'Webhook endpoint removed'
                            )
                          }
                          className="text-slate-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Signing Secret:</span>
                        <code className="text-amber-300 font-mono">{wh.secret}</code>
                        <button
                          onClick={() => copyText(wh.secret, wh.id)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedId === wh.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <span>{wh.lastDeliveryAt || (isRTL ? 'لم يرسل بعد' : 'No deliveries yet')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Interactive Live REST API v1 Runner + Request Logs */}
        <div className="lg:col-span-6 bg-[#111928]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isRTL ? 'مختبر الـ API الفوري وسجل الطلبات (Live API v1 Logs)' : 'Live REST API v1 Tester & Request Logs'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isRTL
                      ? 'نفّذ طلب حقيقي الآن على /api/v1/... بمفتاحك وشاهد الرد وسجل الـ HTTP الحي'
                      : 'Execute a real HTTP request against /api/v1/... using your Bearer token'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick endpoint buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                {
                  label: isRTL ? 'GET /api/v1/me (الحساب والرصيد)' : 'GET /api/v1/me',
                  method: 'GET' as const,
                  path: '/api/v1/me',
                },
                {
                  label: isRTL ? 'GET /api/v1/phone-numbers/available' : 'GET /api/v1/phone-numbers/available',
                  method: 'GET' as const,
                  path: '/api/v1/phone-numbers/available?country=US',
                },
                {
                  label: isRTL ? 'GET /api/v1/sms/otp/latest (قراءة OTP)' : 'GET /api/v1/sms/otp/latest',
                  method: 'GET' as const,
                  path: '/api/v1/sms/otp/latest',
                },
                {
                  label: isRTL ? 'POST /api/v1/posts (نشر عبر API)' : 'POST /api/v1/posts',
                  method: 'POST' as const,
                  path: '/api/v1/posts',
                  body: {
                    content: 'Automated post published directly via Techurity REST API v1! 🚀',
                    platforms: ['instagram', 'linkedin', 'x'],
                    publishNow: true,
                  },
                },
              ].map((ep) => (
                <button
                  key={ep.path}
                  onClick={() => {
                    setSelectedTestEndpoint(ep);
                    runRealApiV1Call(ep.method, ep.path, ep.body);
                  }}
                  disabled={runningLiveTest}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/40 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  {ep.label}
                </button>
              ))}
            </div>

            {liveTestResponse && (
              <div className="mb-4 bg-slate-950 border border-cyan-500/30 rounded-2xl p-3 max-h-44 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono mb-1">
                  <span>
                    {selectedTestEndpoint.method} {selectedTestEndpoint.path}
                  </span>
                  <span className="text-emerald-400">200 OK • Bearer {activeBearerKey.slice(0, 14)}...</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap">{liveTestResponse}</pre>
              </div>
            )}

            {/* Live Request Logs Table */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {apiLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  {isRTL
                    ? 'اضغط على أي زر بالأعلى لتنفيذ أول طلب API ومشاهدة السجل الفوري هنا.'
                    : 'Click any endpoint button above to fire a live API v1 call and inspect the log here.'}
                </div>
              ) : (
                apiLogs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-black ${
                          log.method === 'GET'
                            ? 'bg-sky-500/15 text-sky-300'
                            : log.method === 'POST'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {log.method}
                      </span>
                      <code className="font-mono text-white truncate">{log.path}</code>
                      <span className="text-slate-500 truncate hidden sm:inline">• {log.responseSummary}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span
                        className={
                          log.status >= 200 && log.status < 300 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                        }
                      >
                        {log.status}
                      </span>
                      <span className="text-slate-500">{log.latencyMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
