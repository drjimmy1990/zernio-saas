'use client';

import { useState } from 'react';
import { FolderTree, Layers, Plus, ShieldCheck, Sliders } from 'lucide-react';
import { ProviderAccountsPanel } from '@/components/dashboard/ProviderAccountsPanel';
import { ProviderMetaSettings } from '@/components/dashboard/ProviderMetaSettings';
import type { ConnectedAccountData } from '@/components/dashboard/ConnectionWizardModal';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { getLocalizedText } from '@/i18n/dictionaries';

interface ConnectAndAccountsHubProps {
  workspace: unknown;
  policy: unknown;
  onOpenConnectionWizard: (platform?: string, account?: ConnectedAccountData) => void;
  onRefreshWorkspace?: () => void;
}

export function ConnectAndAccountsHub({
  workspace,
  onOpenConnectionWizard,
  onRefreshWorkspace,
}: ConnectAndAccountsHubProps) {
  const { locale, dir } = useThemeAndLocale();
  const loc = (ar: string, en: string) => getLocalizedText(locale, { ar, en });
  const [activeSubTab, setActiveSubTab] = useState<'health' | 'groups' | 'entities' | 'settings'>('health');
  const tabs = [
    { id: 'health', label: loc('الحسابات المتصلة', 'Connected accounts'), icon: ShieldCheck },
    { id: 'groups', label: loc('مجموعات الحسابات', 'Account groups'), icon: FolderTree },
    { id: 'entities', label: loc('الصفحات والملفات الشخصية', 'Pages and profiles'), icon: Layers },
    { id: 'settings', label: loc('إعدادات الرسائل', 'Messaging settings'), icon: Sliders },
  ] as const;
  const button = 'inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{loc('حسابات الأعمال', 'Business accounts')}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{loc('اربط قنواتك، وتابع حالة الحسابات، واضبط تجربة بدء المحادثة.', 'Connect your channels, check account health, and manage conversation welcome settings.')}</p>
        </div>
        <button className={button} onClick={() => onOpenConnectionWizard()}><Plus className="h-4 w-4" />{loc('ربط قناة جديدة', 'Connect New Channel')}</button>
      </header>

      <nav aria-label={loc('أقسام الحسابات', 'Account sections')} className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-3">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} aria-pressed={activeSubTab === id} onClick={() => setActiveSubTab(id)}
            className={'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ' + (activeSubTab === id ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]')}>
            <Icon className="h-4 w-4" />{label}
            {id === 'groups' && <span className="text-xs">{' '}{loc('قريباً', 'Coming soon')}</span>}
          </button>
        ))}
      </nav>

      {activeSubTab === 'health' && <ProviderAccountsPanel refreshKey={workspace} onOpenConnectionWizard={onOpenConnectionWizard} onRefreshWorkspace={onRefreshWorkspace} />}

      {activeSubTab === 'groups' && (
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <h3 className="font-bold">{loc('مجموعات الحسابات — قريباً', 'Account groups — coming soon')}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{loc('تجميع الحسابات غير متاح في هذا الإصدار. يمكنك ربط كل حساب وإدارته من تبويب الحسابات المتصلة.', 'Grouping accounts is unavailable in this release. Connect and manage each account from Connected accounts.')}</p>
        </section>
      )}

      {activeSubTab === 'entities' && (
        <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <h3 className="font-bold">{loc('اختيار الصفحة أثناء الربط', 'Choose your page during connection')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{loc('افتح خطوات ربط الحساب وسجّل الدخول إلى المنصة. ستظهر الصفحات والملفات المتاحة للاختيار عندما تتطلب المنصة ذلك. لإعادة ربط حساب موجود، استخدم زر إعادة الربط الخاص به في الحسابات المتصلة.', 'Open the connection steps and sign in to the platform. Available pages and profiles appear for selection when required by that platform. To reconnect an existing account, use its reconnect button in Connected accounts.')}</p>
          <button className={button} onClick={() => onOpenConnectionWizard()}>{loc('بدء ربط حساب', 'Start account connection')}</button>
        </section>
      )}

      {activeSubTab === 'settings' && <ProviderMetaSettings isRTL={dir === 'rtl'} />}
    </div>
  );
}
