'use client';
import { useEffect, useState } from 'react';
import {
  Users,
  Link2,
  MessageSquare,
  Send,
  Megaphone,
  PhoneCall,
  BarChart3,
  Settings,
} from 'lucide-react';
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
  // Deep links such as /dashboard?tab=core_connect (used by "Reconnect → Accounts") open the matching task.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab') || '';
    const mapped = ({ core_connect: 'connect', accounts: 'connect', inbox_crm: 'inbox', telephony: 'phone', analytics: 'reports', billing: 'settings' } as Record<string, string>)[requested] || requested;
    if (['contacts', 'connect', 'inbox', 'publishing', 'campaigns', 'phone', 'reports', 'settings'].includes(mapped)) setTab(mapped);
  }, []);
  const jobs: [string, string, string, React.ComponentType<{ className?: string }>][] = [
    ['contacts', 'العملاء', 'Contacts', Users],
    ['connect', 'الحسابات', 'Accounts', Link2],
    ['inbox', 'الرسائل', 'Inbox', MessageSquare],
    ['publishing', 'النشر', 'Publishing', Send],
    ['campaigns', 'الحملات', 'Campaigns', Megaphone],
    ['phone', 'الأرقام وواتساب', 'Phone and WhatsApp', PhoneCall],
    ['reports', 'التقارير', 'Reports', BarChart3],
    ['settings', 'الفريق والإعدادات', 'Team and settings', Settings],
  ];
  return <div dir={dir} className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{ar ? 'مساحة عملك' : 'Your workspace'}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{ar ? 'نظّم عملاءك وتابع المحادثات وانشر محتواك من مكان واحد.' : 'Organize customers, follow up on conversations and publish from one place.'}</p>
      </div>
    </header>
    <div className="overflow-x-auto pb-1 scrollbar-hide">
      <nav className="tab-pill-container inline-flex min-w-full sm:min-w-0" aria-label={ar ? 'مهام العمل' : 'Business tasks'}>
        {jobs.map(([id, arabic, english, Icon]) => {
          const isSelected = tab === id;
          return (
            <button
              key={id}
              aria-pressed={isSelected}
              onClick={() => setTab(id)}
              className={`tab-pill-btn flex-1 sm:flex-initial justify-center ${
                isSelected
                  ? 'tab-pill-btn-active !text-[var(--text-primary)]'
                  : 'hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? 'text-[var(--brand-coral)]' : 'text-[var(--text-muted)]'}`} />
              <span>{ar ? arabic : english}</span>
            </button>
          );
        })}
      </nav>
    </div>
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
