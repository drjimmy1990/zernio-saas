'use client';
import { useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { ConnectAndAccountsHub } from './hubs/ConnectAndAccountsHub';
import { PublishingAndQueueHub } from './hubs/PublishingAndQueueHub';
import { LaunchInboxWorkspace } from './LaunchInboxWorkspace';
import { ManualCrmWorkspace } from './ManualCrmWorkspace';
import { CampaignWorkspace } from './CampaignWorkspace';
import { CustomerReportsWorkspace } from './CustomerReportsWorkspace';
import { SaasWorkspace } from './SaasWorkspace';
import { AdvancedPhoneWorkspace } from './AdvancedPhoneWorkspace';
import type { ConnectedAccountData } from './ConnectionWizardModal';

export function BusinessWorkspace({ workspace, policy, onRefreshWorkspace, onOpenConnectionWizard }: {
  workspace: any; policy: any; onRefreshWorkspace?: () => void; onOpenConnectionWizard: (platform?: string, account?: ConnectedAccountData) => void;
}) {
  const { dir } = useThemeAndLocale(), ar = dir === 'rtl'; const [tab, setTab] = useState('contacts');
  const jobs = [['contacts', 'العملاء', 'Contacts'], ['connect', 'الحسابات', 'Accounts'], ['inbox', 'الرسائل', 'Inbox'], ['publishing', 'النشر', 'Publishing'], ['campaigns', 'الحملات', 'Campaigns'], ['phone', 'الأرقام وواتساب', 'Phone and WhatsApp'], ['reports', 'التقارير', 'Reports'], ['settings', 'الفريق والإعدادات', 'Team and settings']];
  return <div dir={dir} className="space-y-6">
    <header><h2 className="text-2xl font-semibold">{ar ? 'مساحة عملك' : 'Your workspace'}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{ar ? 'نظّم عملاءك وتابع المحادثات وانشر محتواك من مكان واحد.' : 'Organize customers, follow up on conversations and publish from one place.'}</p></header>
    <nav className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-4" aria-label={ar ? 'مهام العمل' : 'Business tasks'}>{jobs.map(([id, arabic, english]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-[var(--bg-subtle)] aria-pressed:bg-[var(--accent-primary)] aria-pressed:text-white">{ar ? arabic : english}</button>)}</nav>
    {tab === 'contacts' && <ManualCrmWorkspace isRTL={ar} />}
    {tab === 'connect' && <ConnectAndAccountsHub workspace={workspace} policy={policy} onRefreshWorkspace={onRefreshWorkspace} onOpenConnectionWizard={onOpenConnectionWizard} />}
    {tab === 'inbox' && <LaunchInboxWorkspace />}
    {tab === 'publishing' && <PublishingAndQueueHub workspace={workspace} policy={policy} onRefreshWorkspace={onRefreshWorkspace} />}
    {tab === 'campaigns' && <CampaignWorkspace />}
    {tab === 'phone' && <AdvancedPhoneWorkspace />}
    {tab === 'reports' && <CustomerReportsWorkspace />}
    {tab === 'settings' && <SaasWorkspace />}
  </div>;
}
