'use client';
import { useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { ProviderMetaInbox } from './ProviderMetaInbox';
import { ProviderMetaComments } from './ProviderMetaComments';
import { ProviderMetaSettings } from './ProviderMetaSettings';
import { ProviderWhatsAppInbox } from './ProviderWhatsAppInbox';
import { ManualCrmWorkspace } from './ManualCrmWorkspace';
import { CampaignWorkspace } from './CampaignWorkspace';

export function LaunchInboxWorkspace(_props: { workspace?: unknown; policy?: unknown; onRefreshWorkspace?: () => void }) {
  const { dir } = useThemeAndLocale(), ar = dir === 'rtl';
  const [tab, setTab] = useState('messages'), [channel, setChannel] = useState('meta');
  const tabs = [['messages', 'الرسائل', 'Messages'], ['comments', 'التعليقات', 'Comments'], ['crm', 'العملاء', 'Contacts'], ['campaigns', 'الحملات', 'Campaigns'], ['settings', 'إعدادات الرسائل', 'Messaging settings'], ['automations', 'الأتمتة — قريباً', 'Automations — Coming soon']];
  return <section dir={dir} className="space-y-5">
    <nav className="flex flex-wrap gap-2" aria-label={ar ? 'المحادثات والعملاء' : 'Inbox and contacts'}>{tabs.map(([id, arabic, english]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)} className="rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm aria-pressed:bg-[var(--accent-soft)]">{ar ? arabic : english}</button>)}</nav>
    {tab === 'messages' && <><div className="flex gap-2" aria-label={ar ? 'قناة الرسائل' : 'Messaging channel'}><button aria-pressed={channel === 'meta'} className="rounded-lg border px-4 py-2 text-sm" onClick={() => setChannel('meta')}>Messenger · Instagram</button><button aria-pressed={channel === 'whatsapp'} className="rounded-lg border px-4 py-2 text-sm" onClick={() => setChannel('whatsapp')}>WhatsApp</button></div>{channel === 'meta' ? <ProviderMetaInbox isRTL={ar} /> : <ProviderWhatsAppInbox />}</>}
    {tab === 'comments' && <ProviderMetaComments isRTL={ar} />}
    {tab === 'settings' && <ProviderMetaSettings isRTL={ar} />}
    {tab === 'crm' && <ManualCrmWorkspace isRTL={ar} />}
    {tab === 'campaigns' && <CampaignWorkspace />}
    {tab === 'automations' && <div className="border-y border-[var(--border-subtle)] py-10"><h2 className="text-lg font-semibold">{ar ? 'الأتمتة قريباً' : 'Automations are coming soon'}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{ar ? 'يمكنك إدارة العملاء والردود والحملات يدوياً الآن. الردود التلقائية والمسارات غير مفعّلة.' : 'Manage contacts, replies and campaigns manually today. Automatic replies and workflows are not enabled.'}</p></div>}
  </section>;
}
