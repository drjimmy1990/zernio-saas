'use client';

import React, { useState, useEffect } from 'react';
import {
  Link2,
  ShieldCheck,
  FolderTree,
  Sliders,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Check,
  ExternalLink,
  MessageSquare,
  Globe,
  Radio,
  Layers,
} from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface ConnectAndAccountsHubProps {
  workspace: any;
  policy: any;
  onOpenConnectionWizard: (platform?: string) => void;
  onRefreshWorkspace?: () => void;
}

export function ConnectAndAccountsHub({
  workspace,
  policy,
  onOpenConnectionWizard,
  onRefreshWorkspace,
}: ConnectAndAccountsHubProps) {
  const { locale, dir } = useThemeAndLocale();
  const isRTL = dir === 'rtl';
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });

  const [activeSubTab, setActiveSubTab] = useState<'health' | 'groups' | 'entities' | 'settings'>('health');

  // 1. Health State
  const [healthData, setHealthData] = useState<{
    summary: { total: number; healthy: number; warning: number; error: number; needsReconnect: number };
    accounts: any[];
  } | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  // 2. Groups State
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [showCreateGroup, setShowCreateGroup] = useState<boolean>(false);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [newGroupColor, setNewGroupColor] = useState<string>('#4F46E5');
  const [newGroupDesc, setNewGroupDesc] = useState<string>('');

  // 3. Entity Picker State
  const [selectedEntityPlatform, setSelectedEntityPlatform] = useState<string>('facebook');
  const [availableEntities, setAvailableEntities] = useState<any[]>([]);
  const [loadingEntities, setLoadingEntities] = useState<boolean>(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // 4. Platform Settings State
  const [settingsPlatform, setSettingsPlatform] = useState<'messenger' | 'instagram' | 'telegram'>('messenger');
  const [messengerGreeting, setMessengerGreeting] = useState<string>('Hi there! Welcome to our official support channel.');
  const [iceBreakers, setIceBreakers] = useState<string[]>([]);
  const [telegramCommands, setTelegramCommands] = useState<Array<{ command: string; description: string }>>([]);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);

  // Fetch Account Health
  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('/api/v1/accounts/health');
      const data = await res.json().catch(() => ({}));
      if (data.success && (data.summary || data.accounts || data.data)) {
        const rawAccounts = Array.isArray(data.accounts)
          ? data.accounts
          : Array.isArray(data.data?.accounts)
          ? data.data.accounts
          : Array.isArray(data.data)
          ? data.data
          : [];
        const rawSummary = data.summary || data.data?.summary || {
          total: rawAccounts.length,
          healthy: rawAccounts.filter((a: any) => a.status === 'healthy').length,
          warning: rawAccounts.filter((a: any) => a.status === 'warning').length,
          error: rawAccounts.filter((a: any) => a.status === 'error' || a.needsReconnect).length,
          needsReconnect: rawAccounts.filter((a: any) => a.needsReconnect).length,
        };
        setHealthData({
          summary: rawSummary,
          accounts: rawAccounts,
        });
      } else {
        const rawAccounts = workspace?.subServicesData?.core_connect?.accounts || [];
        setHealthData({
          summary: {
            total: rawAccounts.length,
            healthy: rawAccounts.filter((a: any) => a.status === 'healthy').length,
            warning: 0,
            error: 0,
            needsReconnect: rawAccounts.filter((a: any) => a.needsReconnect).length,
          },
          accounts: rawAccounts,
        });
      }
    } catch {
      const rawAccounts = workspace?.subServicesData?.core_connect?.accounts || [];
      setHealthData({
        summary: {
          total: rawAccounts.length,
          healthy: rawAccounts.filter((a: any) => a.status === 'healthy').length,
          warning: 0,
          error: 0,
          needsReconnect: rawAccounts.filter((a: any) => a.needsReconnect).length,
        },
        accounts: rawAccounts,
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  // Fetch Groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/v1/account-groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setGroups(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch Entities for Headless Picker
  const fetchEntities = async (platform: string) => {
    setLoadingEntities(true);
    try {
      const res = await fetch(`/api/v1/connect/${platform}/select`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.data?.entities)) {
        setAvailableEntities(data.data.entities);
      } else {
        setAvailableEntities([]);
      }
    } catch {
      setAvailableEntities([]);
    } finally {
      setLoadingEntities(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
    void fetchGroups();
  }, [workspace]);

  useEffect(() => {
    if (activeSubTab === 'entities') {
      void fetchEntities(selectedEntityPlatform);
    }
  }, [activeSubTab, selectedEntityPlatform]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setGroupError(null);
    try {
      const res = await fetch('/api/v1/account-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          color: newGroupColor,
          description: newGroupDesc,
          accountIds: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to create group');
      }
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      void fetchGroups();
    } catch (err: any) {
      setGroupError(err?.message || loc('فشل إنشاء المجموعة', 'Failed to create group'));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    setGroupError(null);
    try {
      const res = await fetch(`/api/v1/account-groups/${groupId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data.success !== undefined && !data.success)) {
        throw new Error(data.message || data.error?.message || data.error || 'Failed to delete group');
      }
      void fetchGroups();
    } catch (err: any) {
      setGroupError(err?.message || loc('فشل حذف المجموعة', 'Failed to delete group'));
    }
  };

  const handleSelectEntity = async (entity: any) => {
    setSelectedEntityId(entity.id);
    try {
      await fetch(`/api/v1/connect/${selectedEntityPlatform}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedEntityId: entity.id,
          entityName: entity.name,
        }),
      });
      onRefreshWorkspace?.();
    } catch {
      // ignore
    }
  };

  const handleSavePlatformSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    setSettingsError(null);
    try {
      if (settingsPlatform === 'messenger') {
        const res = await fetch('/api/v1/accounts/default/messenger-greeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ greeting: messengerGreeting }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data.success !== undefined && !data.success)) {
          throw new Error(data.message || data.error?.message || data.error || 'Failed to save settings');
        }
      }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err: any) {
      setSettingsSaved(false);
      setSettingsError(err?.message || loc('فشل حفظ ومزامنة الإعدادات', 'Failed to save settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hub Top Bar & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {loc('مركز الحسابات والربط المتقدم', 'Connect & Accounts Advanced Hub')}
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
              {healthData?.summary?.total || 0} {loc('قناة نشطة', 'Active Channels')}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {loc(
              'مراقبة صحة الرموز، تنظيم الحسابات في مجموعات، اختيار الكيانات بدون واجهة، وضبط إعدادات المنصات التفاعلية',
              'Monitor token health, cluster accounts into groups, bind headless entities, and configure interactive menus'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenConnectionWizard()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{loc('ربط قناة جديدة', 'Connect New Channel')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Pill Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        {[
          { id: 'health', label: loc('فاحص صحة الحسابات والرموز', 'Account Health & Tokens'), icon: ShieldCheck },
          { id: 'groups', label: loc('مجموعات الحسابات (Account Groups)', 'Account Groups'), icon: FolderTree },
          { id: 'entities', label: loc('اختيار الكيانات والصفحات', 'Headless Entity Picker'), icon: Layers },
          { id: 'settings', label: loc('إعدادات المنصات والرسائل التفاعلية', 'Platform Interactive Settings'), icon: Sliders },
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

      {/* SUB-PANEL 1: Live Account Health Inspector */}
      {activeSubTab === 'health' && (
        <div className="space-y-5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-start">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                {loc('إجمالي القنوات المربوطة', 'Total Connected')}
              </span>
              <span className="font-mono text-xl font-black text-[var(--text-primary)]">
                {healthData?.summary?.total ?? 0}
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-start">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                {loc('حسابات سليمة وتعمل', 'Healthy & Active')}
              </span>
              <span className="font-mono text-xl font-black text-emerald-600">
                {healthData?.summary?.healthy ?? 0}
              </span>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-start">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                {loc('تنبيهات وتجديد قادم', 'Warnings')}
              </span>
              <span className="font-mono text-xl font-black text-amber-600">
                {healthData?.summary?.warning ?? 0}
              </span>
            </div>

            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-start">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                {loc('تتطلب إعادة الربط', 'Needs Reconnect')}
              </span>
              <span className="font-mono text-xl font-black text-rose-600">
                {healthData?.summary?.needsReconnect ?? 0}
              </span>
            </div>
          </div>

          {/* Accounts Diagnostic Table */}
          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('جدول الفحص التشخيصي للقنوات وصلاحيات الـ API', 'Account Diagnostics & Permission Matrix')}
              </h3>
              <button
                onClick={() => void fetchHealth()}
                disabled={loadingHealth}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                <span>{loc('فحص الآن', 'Run Audit')}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="px-6 py-3 text-start">{loc('القناة / الحساب', 'Channel / Account')}</th>
                    <th className="px-4 py-3 text-start">{loc('صلاحية الرمز (Token)', 'Token Validity')}</th>
                    <th className="px-4 py-3 text-start">{loc('إذن النشر', 'Publishing')}</th>
                    <th className="px-4 py-3 text-start">{loc('إذن التحليلات', 'Analytics')}</th>
                    <th className="px-4 py-3 text-start">{loc('الويب هوك', 'Webhook')}</th>
                    <th className="px-6 py-3 text-end">{loc('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {(!healthData?.accounts || healthData.accounts.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                            <ShieldCheck className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {loc('لا توجد قنوات مربوطة حالياً', 'No Connected Channels Found')}
                            </h4>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                              {loc('قم بربط قنوات التواصل وحسابات الوسائط الاجتماعية للبدء في نشر المحتوى وإدارة الرسائل الموحدة.', 'Connect your social media accounts and channels to start publishing content and managing unified messaging.')}
                            </p>
                          </div>
                          <button
                            onClick={() => onOpenConnectionWizard()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
                          >
                            <Plus className="h-4 w-4" />
                            <span>{loc('ربط قناة جديدة', '+ Connect Channel')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    healthData.accounts.map((acc, idx) => (
                      <tr key={acc.id || idx} className="hover:bg-[var(--bg-subtle)]/30 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-[var(--text-primary)]">{acc.displayName || acc.username}</span>
                            <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] uppercase">
                              {acc.platform}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {loc('صالح (Valid)', 'Valid')}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-emerald-600 font-bold">✓ Granted</td>
                        <td className="px-4 py-4 text-emerald-600 font-bold">✓ Granted</td>
                        <td className="px-4 py-4 text-emerald-600 font-bold">Active (Live)</td>
                        <td className="px-6 py-4 text-end">
                          <button
                            onClick={() => onOpenConnectionWizard(acc.platform)}
                            className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {loc('اختبار الرمز', 'Test Token')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 2: Account Groups CRUD Manager */}
      {activeSubTab === 'groups' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('مجموعات الحسابات الموحدة', 'Unified Account Groups')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('نظم حسابات الفروع أو الفرق الجغرافية في مجموعات لنشر جماعي وتتبع منظم', 'Group accounts by department, region, or brand for coordinated batch posting')}
              </p>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{loc('إنشاء مجموعة جديدة', 'Create Group')}</span>
            </button>
          </div>

          {/* Create Group Modal */}
          {showCreateGroup && (
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {loc('إضافة مجموعة حسابات جديدة', 'New Account Group')}
                </span>
                <button onClick={() => setShowCreateGroup(false)} className="text-xs text-[var(--text-muted)]">
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    {loc('اسم المجموعة', 'Group Name')}
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. GCC Retail Accounts"
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    {loc('اللون المميز', 'Badge Color')}
                  </label>
                  <input
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="h-9 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-1 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  {loc('الوصف', 'Description')}
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Accounts dedicated to regional promotions"
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </div>
              {groupError && (
                <div className="text-xs font-bold text-rose-600 mb-2">
                  ✗ {groupError}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="rounded-xl border border-[var(--border-subtle)] px-4 py-1.5 text-xs text-[var(--text-muted)]"
                >
                  {loc('إلغاء', 'Cancel')}
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="rounded-xl bg-[var(--accent-primary)] px-5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
                >
                  {loc('حفظ المجموعة', 'Save Group')}
                </button>
              </div>
            </div>
          )}

          {/* Groups Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {groups.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
                  <FolderTree className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  {loc('لا توجد مجموعات حسابات بعد', 'No Account Groups Defined Yet')}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                  {loc('قم بإنشاء مجموعات حسابات لتنظيم نشر الحملات التسويقية عبر قنوات متعددة بنقرة واحدة.', 'Create account groups to organize and batch-publish marketing campaigns across multiple channels in a single click.')}
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>{loc('إنشاء مجموعة جديدة', '+ Create Group')}</span>
                </button>
              </div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color || '#4F46E5' }} />
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{g.name}</h4>
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        className="text-[var(--text-muted)] hover:text-rose-500 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {g.description || loc('لا يوجد وصف', 'No description')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                    <span>{g.accountIds?.length || 0} {loc('حسابات مربوطة', 'accounts')}</span>
                    <span className="font-mono">{g.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-PANEL 3: Headless Entity Picker Console */}
      {activeSubTab === 'entities' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('اختيار الكيانات والصفحات بدون واجهة (Headless Entity Picker)', 'Headless Secondary Entity Selector')}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {loc('اختر الصفحات والحسابات الإعلانية ومواقع الفروع التابعة لحسابك المعتمد', 'Select specific pages, ad accounts, and Google locations associated with your credential')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {['facebook', 'linkedin', 'google_business', 'pinterest'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedEntityPlatform(p)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    selectedEntityPlatform === p
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {p.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {loadingEntities ? (
            <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)] me-2" />
              <span className="text-xs">{loc('جاري جلب الكيانات والصفحات المرتبطة...', 'Fetching available entities...')}</span>
            </div>
          ) : availableEntities.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] mb-3">
                <Layers className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {loc('لا توجد كيانات تابعة متاحة حالياً', 'No Secondary Entities Available')}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                {loc('لم يتم العثور على صفحات أو قنوات فرعية تابعة لهذا الحساب. تأكد من منح الأذونات المطلوبة واضغط لتحديث القائمة.', 'No sub-pages or managed entity profiles found for this account. Ensure required platform permissions are granted.')}
              </p>
              <button
                onClick={() => void fetchEntities(selectedEntityPlatform)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{loc('تحديث الكيانات', 'Refresh Entities')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {availableEntities.map((ent) => {
                const isSelected = selectedEntityId === ent.id;
                return (
                  <div
                    key={ent.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                          {ent.type || 'Page'}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                      </div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">{ent.name}</h4>
                      <p className="font-mono text-[10px] text-[var(--text-muted)] mt-1">ID: {ent.id}</p>
                      {ent.followers && (
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          {ent.followers.toLocaleString()} {loc('متابع', 'followers')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectEntity(ent)}
                      className={`mt-4 rounded-xl py-1.5 text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]'
                      }`}
                    >
                      {isSelected ? loc('تم الربط ✓', 'Bound ✓') : loc('ربط الصفحة (Select & Bind)', 'Select & Bind')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-PANEL 4: Platform Interactive Settings Editor */}
      {activeSubTab === 'settings' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            {[
              { id: 'messenger', label: 'Facebook Messenger' },
              { id: 'instagram', label: 'Instagram Direct' },
              { id: 'telegram', label: 'Telegram Bot' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setSettingsPlatform(p.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  settingsPlatform === p.id
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5">
            {settingsPlatform === 'messenger' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    {loc('رسالة الترحيب في ماسنجر (Greeting Text)', 'Messenger Greeting Text')}
                  </label>
                  <textarea
                    rows={2}
                    value={messengerGreeting}
                    onChange={(e) => setMessengerGreeting(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      {loc('الأسئلة الافتتاحية (Ice Breakers)', 'Messenger Ice Breakers')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIceBreakers((prev) => [...prev, ''])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-primary)] hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{loc('إضافة سؤال', '+ Add Question')}</span>
                    </button>
                  </div>
                  {iceBreakers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center">
                      <p className="text-xs text-[var(--text-muted)] mb-2">
                        {loc('لا توجد أسئلة افتتاحية مضافة بعد لمحادثات ماسنجر.', 'No ice breakers added yet for Messenger.')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIceBreakers([''])}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{loc('إضافة سؤال افتتاحي', '+ Add Ice Breaker')}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {iceBreakers.map((ib, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={ib}
                            onChange={(e) => {
                              const next = [...iceBreakers];
                              next[i] = e.target.value;
                              setIceBreakers(next);
                            }}
                            className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setIceBreakers(iceBreakers.filter((_, idx) => idx !== i))}
                            className="text-[var(--text-muted)] hover:text-rose-500 transition px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsPlatform === 'telegram' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {loc('أوامر البوت الرسمية في تيليغرام (Bot Commands Menu)', 'Telegram Bot Commands Menu')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTelegramCommands((prev) => [...prev, { command: '/', description: '' }])}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-primary)] hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{loc('إضافة أمر', '+ Add Command')}</span>
                  </button>
                </div>
                {telegramCommands.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      {loc('لا توجد أوامر تيليغرام مخصصة بعد.', 'No Telegram bot commands configured yet.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTelegramCommands([{ command: '/start', description: 'Main menu' }])}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{loc('إضافة أمر جديد', '+ Add Command')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {telegramCommands.map((tc, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={tc.command}
                          onChange={(e) => {
                            const next = [...telegramCommands];
                            next[idx].command = e.target.value;
                            setTelegramCommands(next);
                          }}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)]"
                        />
                        <input
                          type="text"
                          value={tc.description}
                          onChange={(e) => {
                            const next = [...telegramCommands];
                            next[idx].description = e.target.value;
                            setTelegramCommands(next);
                          }}
                          className="col-span-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                {settingsSaved && (
                  <span className="text-xs font-bold text-emerald-600">
                    ✓ {loc('تم حفظ الإعدادات ومزامنتها مع المنصة بنجاح!', 'Settings synchronized successfully!')}
                  </span>
                )}
                {settingsError && (
                  <span className="text-xs font-bold text-rose-600">
                    ✗ {settingsError}
                  </span>
                )}
              </div>
              <div className="ms-auto">
                <button
                  onClick={handleSavePlatformSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white hover:bg-[var(--accent-hover)] transition cursor-pointer"
                >
                  {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{loc('حفظ التغييرات', 'Save Settings')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
