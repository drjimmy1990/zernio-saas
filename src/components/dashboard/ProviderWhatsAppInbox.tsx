'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';

type Account = { accountId: string; displayName?: string; username?: string; isActive?: boolean; needsReconnection?: boolean };
type Conversation = { id?: string; participantName?: string; participantId?: string; lastMessage?: string; unreadCount?: number | null; threadControl?: string };
type Message = { id?: string; message?: string; direction?: string; createdAt?: string; deliveryStatus?: string | null; deliveryError?: { title?: string; message?: string }; attachments?: { url?: string; filename?: string; type?: string }[] };
type Template = { id?: string; name?: string; language?: string; category?: string; status?: string; components?: Record<string, unknown>[] };
type Payload = { accounts?: Account[]; profileId?: string; data?: Conversation[]; messages?: Message[]; templates?: Template[]; pagination?: { nextCursor?: string | null }; error?: string | { message?: string; code?: string }; message?: string; success?: boolean; status?: string };
function mergeMessages(previous: Message[], incoming: Message[]): Message[] {
  const byId = new Map<string, Message>(), loose: Message[] = [];
  for (const item of [...previous, ...incoming]) { if (item.id) byId.set(item.id, { ...byId.get(item.id), ...item }); else loose.push(item); }
  const time = (item: Message) => { const value = item.createdAt ? Date.parse(item.createdAt) : NaN; return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY; };
  return [...byId.values(), ...loose].map((item, index) => ({ item, index })).sort((a, b) => time(a.item) - time(b.item) || a.index - b.index).map(entry => entry.item);
}
type PendingSend = { signature: string; key: string; createdAt: number; payload: Record<string, unknown> };

async function request(params: Record<string, unknown>, post = false): Promise<Payload> {
  const query = new URLSearchParams();
  if (!post) Object.entries(params).forEach(([key, value]) => { if (value !== undefined) query.set(key, String(value)); });
  const response = await fetch(`/api/whatsapp${post ? '' : `?${query}`}`, post ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params),
  } : { cache: 'no-store' });
  const data: Payload = await response.json();
  if (!response.ok || data.error || data.success === false) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || `WhatsApp request failed (${response.status})`), { status: response.status, code: typeof data.error === 'object' ? data.error.code : undefined });
  return data;
}

function attachmentHref(url: string, accountId: string, conversationId: string, messageId: string, attachmentIndex: number) {
  let parsed: URL;
  try { parsed = new URL(url, 'https://attachment.invalid'); } catch { return null; }
  if (parsed.pathname.includes('/whatsapp/media/')) {
    if (!messageId) return null;
    return `/api/whatsapp/media?${new URLSearchParams({ accountId, conversationId, messageId, attachmentIndex: String(attachmentIndex) })}`;
  }
  return /^https:\/\//i.test(url) && !parsed.username && !parsed.password ? url : null;
}

export function ProviderWhatsAppInbox({ initialTab = 'inbox' }: { initialTab?: 'inbox' | 'templates' }) {
  const { locale } = useThemeAndLocale();
  const loc = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [pending, setPending] = useState<PendingSend | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [parameters, setParameters] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en_US');
  const [category, setCategory] = useState('UTILITY');
  const [body, setBody] = useState('');
  const [examples, setExamples] = useState('');
  const sending = useRef(false);
  const currentSelection = useRef({ accountId, conversationId });
  currentSelection.current = { accountId, conversationId };
  const account = accounts.find(item => item.accountId === accountId);
  const writable = Boolean(profileId && account && account.isActive === true && !account.needsReconnection);
  const inputClass = 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 text-xs text-[var(--text-primary)]';
  const buttonClass = 'rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50';
  const approved = templates.filter(item => item.status === 'APPROVED' && !item.components?.some(part => part.type === 'HEADER' && part.format && part.format !== 'TEXT'));
  const template = approved.find(item => `${item.name}:${item.language}` === selectedTemplate);

  useEffect(() => {
    let cancelled = false;
    request({ action: 'accounts' }).then(data => {
      if (!cancelled) {
        if (!data.profileId) throw new Error('Could not verify the WhatsApp workspace. Refresh the inbox.');
        setAccounts(data.accounts || []); setProfileId(data.profileId);
        try {
          const saved = JSON.parse(sessionStorage.getItem(`asra3:whatsapp:pending:${data.profileId}`) || 'null');
          if (saved && typeof saved.key === 'string' && saved.payload && typeof saved.payload.accountId === 'string') setPending(saved);
        } catch { /* A pending request also remains in memory when storage is unavailable. */ }
      }
    }).catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError('');
    try {
      const [threads, tpls] = await Promise.all([request({ action: 'conversations', accountId }), request({ action: 'templates', accountId })]);
      if (currentSelection.current.accountId !== accountId) return;
      setConversations(threads.data || []); setCursor(threads.pagination?.nextCursor || null); setTemplates(tpls.templates || []);
    } catch (err) { if (currentSelection.current.accountId === accountId) setError(err instanceof Error ? err.message : 'WhatsApp unavailable'); }
    finally { if (currentSelection.current.accountId === accountId) setLoading(false); }
  }, [accountId]);

  useEffect(() => {
    setConversations([]); setMessages([]); setTemplates([]); setConversationId(''); setSelectedTemplate(''); setNotice('');
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!accountId || !conversationId) return;
    let cancelled = false;
    setMessages([]); setMessageCursor(null);
    let first = true;
    const load = async () => {
      try { const data = await request({ action: 'messages', accountId, conversationId }); if (!cancelled) { setMessages(previous => mergeMessages(previous, data.messages || [])); if (first) { setMessageCursor(data.pagination?.nextCursor || null); first = false; } } }
      catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load messages'); }
    };
    void load(); const timer = window.setInterval(() => void load(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [accountId, conversationId]);

  const send = async () => {
    if (sending.current || !writable || pending) return;
    sending.current = true;
    setBusy(true); setError(''); setNotice('');
    const payload = { action: 'send', accountId, ...(conversationId ? { conversationId } : { recipient }),
      ...(template ? { templateName: template.name, templateLanguage: template.language, templateParams: parameters ? parameters.split('\n') : [] } : { text, attachmentUrl: mediaUrl || undefined, attachmentType: mediaUrl ? mediaType : undefined }) };
    const signature = JSON.stringify(payload);
    const intent: PendingSend = { signature, key: crypto.randomUUID(), createdAt: Date.now(), payload };
    setPending(intent); setReviewed(false);
    try { sessionStorage.setItem(`asra3:whatsapp:pending:${profileId}`, JSON.stringify(intent)); } catch { /* Retain in memory. */ }
    try {
      const data = await request({ ...payload, idempotencyKey: intent.key }, true);
      setNotice(data.status ? `${loc('حالة المزود', 'Provider status')}: ${data.status}` : loc('قبل المزود الطلب. تأكيد التسليم يظهر عند وصول إيصال.', 'Provider accepted the request. Delivery remains unconfirmed until a receipt arrives.'));
      setText(''); setMediaUrl(''); setParameters(''); setSelectedTemplate(''); setPending(null);
      try { sessionStorage.removeItem(`asra3:whatsapp:pending:${profileId}`); } catch { /* storage may be unavailable */ }
      await refresh();
      if (conversationId) {
        try { const latest = await request({ action: 'messages', accountId, conversationId }); if (currentSelection.current.accountId === accountId && currentSelection.current.conversationId === conversationId) setMessages(latest.messages || []); }
        catch (err) { setError(`${loc('تم قبول الإرسال، لكن تعذر تحديث الرسائل:', 'Send accepted, but messages could not refresh:')} ${err instanceof Error ? err.message : ''}`); }
      }
    } catch (err) {
      const failure = err as Error & { status?: number; code?: string };
      const definitive = failure.status && failure.status >= 400 && failure.status < 500 && ![408, 429].includes(failure.status) && failure.code !== 'idempotency_conflict';
      if (definitive) {
        setPending(null);
        try { sessionStorage.removeItem(`asra3:whatsapp:pending:${profileId}`); } catch { /* storage may be unavailable */ }
      }
      setError(err instanceof Error ? err.message : 'Send failed');
    }
    finally { sending.current = false; setBusy(false); }
  };

  const createTemplate = async () => {
    if (sending.current || !writable) return;
    sending.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request({ action: 'create_template', accountId, name, language, category,
        components: [{ type: 'BODY', text: body, ...(examples ? { example: { body_text: [examples.split('\n')] } } : {}) }] }, true);
      setNotice(data.status ? `${loc('حالة المزود', 'Provider status')}: ${data.status}` : loc('تم تقديم القالب. حدّث القائمة لمعرفة حالة مراجعة Meta.', 'Template submitted. Refresh the list for Meta review status.'));
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Template creation failed'); }
    finally { sending.current = false; setBusy(false); }
  };

  const loadMore = async (kind: 'conversations' | 'messages') => {
    setLoading(true);
    try {
      const data = await request({ action: kind, accountId, ...(kind === 'messages' ? { conversationId } : {}), cursor: kind === 'messages' ? messageCursor : cursor });
      if (currentSelection.current.accountId !== accountId || (kind === 'messages' && currentSelection.current.conversationId !== conversationId)) return;
      if (kind === 'messages') { setMessages(previous => mergeMessages(previous, data.messages || [])); setMessageCursor(data.pagination?.nextCursor || null); }
      else { setConversations(previous => [...previous, ...(data.data || [])]); setCursor(data.pagination?.nextCursor || null); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load page'); }
    finally { setLoading(false); }
  };

  return <section className="luxury-card space-y-4 p-4" aria-label="WhatsApp provider inbox">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-sm font-bold">WhatsApp</h3>
      <label className="min-w-56 flex-1 text-xs">{loc('حساب واتساب المتصل', 'Connected WhatsApp account')}
        <select className={inputClass} value={accountId} disabled={busy} onChange={event => setAccountId(event.target.value)}>
          <option value="">{loc('اختر حساباً', 'Select an account')}</option>
          {accounts.map(item => <option key={item.accountId} value={item.accountId}>{item.displayName || item.username || item.accountId}{item.needsReconnection || item.isActive !== true ? loc(' — يحتاج إعادة ربط', ' — reconnect required') : ''}</option>)}
        </select>
      </label>
      <button className={buttonClass} disabled={!accountId || loading || busy} onClick={() => void refresh()}>{loading ? loc('تحميل…', 'Loading…') : loc('تحديث', 'Refresh')}</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-600">{error}</p>}
    {notice && <p role="status" className="text-xs text-emerald-600">{notice}</p>}
    {pending && !busy && <aside className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm" aria-label="Unconfirmed WhatsApp send">
      <strong>{loc('نتيجة إرسال غير مؤكدة', 'Send outcome unconfirmed')}</strong>
      <p>{loc('راجع المحادثة في واتساب قبل إرسال رسالة أخرى. قد تكون الرسالة وصلت حتى إذا لم تظهر هنا بعد؛ إعادة الإرسال قد تكررها.', 'Review the conversation in WhatsApp before another send. The message may have arrived even if it is not visible here yet; resending could duplicate it.')}</p>
      <p className="break-words whitespace-pre-wrap">{String(pending.payload.text || pending.payload.templateName || pending.payload.attachmentUrl || '')}</p>
      <p className="break-all text-xs">{String(pending.payload.recipient || pending.payload.conversationId || '')}</p>
      <button className={buttonClass} onClick={async () => {
        setAccountId(String(pending.payload.accountId)); setConversationId(String(pending.payload.conversationId || ''));
        try {
          if (pending.payload.conversationId) {
            const latest = await request({ action: 'messages', accountId: pending.payload.accountId, conversationId: pending.payload.conversationId });
            if (currentSelection.current.accountId === pending.payload.accountId && currentSelection.current.conversationId === pending.payload.conversationId) setMessages(latest.messages || []);
          } else setNotice(loc('افتح محادثة المستلم في واتساب للتحقق من الإرسال.', 'Open the recipient’s conversation in WhatsApp to verify this send.'));
        } catch (err) { setError(err instanceof Error ? err.message : 'Could not review messages'); }
      }}>{loc('مراجعة الرسائل', 'Review messages')}</button>
      <label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} onChange={event => setReviewed(event.target.checked)} />{loc('راجعت المحادثة وأفهم أن أي إرسال جديد قد يكرر الرسالة.', 'I reviewed the conversation and understand a new send may duplicate this message.')}</label>
      <button className={buttonClass} disabled={!reviewed} onClick={() => {
        setPending(null); setReviewed(false); setText(''); setMediaUrl(''); setParameters(''); setSelectedTemplate(''); setError('');
        try { sessionStorage.removeItem(`asra3:whatsapp:pending:${profileId}`); } catch { /* storage may be unavailable */ }
        setNotice(loc('انتهت المراجعة. لم نُعِد إرسال الرسالة.', 'Review completed. No message was resent.'));
      }}>{loc('إنهاء المراجعة', 'Finish review')}</button>
    </aside>}
    {!accountId && <p className="text-xs text-[var(--text-secondary)]">{loc('اختر حساباً متصلاً من رقمك الحالي أو المشترى. شراء الرقم وحده لا يفعّل واتساب.', 'Choose the connected account for your existing or purchased number. Purchasing a number alone does not activate WhatsApp.')}</p>}
    {accountId && <>
      {!writable && <p className="text-xs text-amber-600">{loc('أعد اتصال الحساب قبل الإرسال أو إنشاء القوالب.', 'Reconnect this account before sending or creating templates.')}</p>}
      <div className="flex gap-2">{(['inbox', 'templates'] as const).map(value => <button key={value} className={`${buttonClass} ${tab !== value ? 'opacity-60' : ''}`} onClick={() => setTab(value)}>{value === 'inbox' ? loc('المحادثات', 'Inbox') : loc('القوالب', 'Templates')}</button>)}</div>
      {tab === 'templates' ? <div className="space-y-3">
        <p className="text-xs">{loc('الحالة تأتي من Meta؛ إنشاء قالب لا يعني اعتماده.', 'Meta supplies approval status; creating a template does not approve it.')}</p>
        {!loading && !templates.length && <p className="text-xs">{loc('لا توجد قوالب لهذا الحساب.', 'No templates on this account.')}</p>}
        {templates.map((item, index) => <div key={item.id || `${item.name}:${item.language}:${index}`} className="rounded-xl border border-[var(--border-subtle)] p-3 text-xs"><strong>{item.name}</strong> · {item.language} · {item.category} · {item.status || loc('غير مؤكدة', 'Unconfirmed')}<p className="mt-1 whitespace-pre-wrap">{String(item.components?.find(part => part.type === 'BODY')?.text || '')}</p></div>)}
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void createTemplate(); }}>
          <label className="text-xs">{loc('اسم القالب', 'Template name')}<input required pattern="[a-z][a-z0-9_]*" className={inputClass} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="text-xs">{loc('رمز اللغة', 'Language code')}<input required className={inputClass} value={language} onChange={e => setLanguage(e.target.value)} /></label>
          <label className="text-xs">{loc('التصنيف', 'Category')}<select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option>UTILITY</option><option>MARKETING</option></select></label>
          <label className="text-xs">{loc('أمثلة المتغيرات: سطر لكل متغير', 'Variable examples: one per line')}<textarea className={inputClass} value={examples} onChange={e => setExamples(e.target.value)} /></label>
          <label className="text-xs sm:col-span-2">{loc('نص القالب', 'Template body')}<textarea required className={inputClass} value={body} onChange={e => setBody(e.target.value)} /></label>
          <button className={buttonClass} disabled={!writable || busy}>{loc('تقديم لمراجعة Meta', 'Submit for Meta review')}</button>
        </form>
      </div> : <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <button className={buttonClass} disabled={busy} onClick={() => { setConversationId(''); setMessages([]); }}>{loc('مستلم جديد', 'New recipient')}</button>
          {!loading && !conversations.length && <p className="text-xs">{loc('لا توجد محادثات لهذا الحساب.', 'No conversations on this account.')}</p>}
          {conversations.map(item => <button key={item.id} disabled={busy} className={`${inputClass} text-start ${conversationId === item.id ? 'border-emerald-500' : ''}`} onClick={() => { setConversationId(item.id || ''); setRecipient(''); }}><strong>{item.participantName || item.participantId || item.id}</strong>{typeof item.unreadCount === 'number' && item.unreadCount > 0 ? ` (${item.unreadCount})` : ''}<p className="truncate">{item.lastMessage}</p>{item.threadControl && <small>{loc('التحكم', 'Control')}: {item.threadControl}</small>}</button>)}
          {cursor && <button className={buttonClass} disabled={loading} onClick={() => void loadMore('conversations')}>{loc('المزيد', 'More conversations')}</button>}
        </div>
        <div className="space-y-3 lg:col-span-2">
          {conversationId && <button className={buttonClass} disabled={!writable || busy} onClick={async () => {
            if (sending.current) return;
            sending.current = true; setBusy(true);
            try { await request({ action: 'mark_read', accountId, conversationId }, true); await refresh(); }
            catch (err) { setError(err instanceof Error ? err.message : 'Could not mark read'); }
            finally { sending.current = false; setBusy(false); }
          }}>{loc('وضع علامة مقروءة', 'Mark read')}</button>}
          <div className="max-h-96 space-y-2 overflow-auto" aria-live="polite">
            {messages.map((item, index) => <div key={item.id || index} className={`rounded-xl p-3 text-xs ${item.direction === 'outgoing' ? 'bg-emerald-500/10' : 'bg-[var(--bg-subtle)]'}`}><p className="whitespace-pre-wrap">{item.message}</p>{item.attachments?.map((media, mediaIndex) => media.url && attachmentHref(media.url, accountId, conversationId, item.id || '', mediaIndex) ? <a key={mediaIndex} className="block underline" target="_blank" rel="noopener noreferrer" href={attachmentHref(media.url!, accountId, conversationId, item.id || '', mediaIndex)!}>{media.filename || media.type || loc('وسائط', 'Media')}</a> : <span key={mediaIndex}>{media.type || loc('وسائط', 'Media')}</span>)}<small>{item.createdAt ? new Date(item.createdAt).toLocaleString(locale) : ''} {item.direction === 'outgoing' ? ` · ${item.deliveryStatus || loc('الحالة غير مؤكدة', 'Status unconfirmed')}` : ''}</small>{item.deliveryError && <p className="text-rose-600">{item.deliveryError.title || item.deliveryError.message}</p>}</div>)}
            {messageCursor && <button className={buttonClass} disabled={loading} onClick={() => void loadMore('messages')}>{loc('المزيد من الرسائل', 'More messages')}</button>}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{loc('النص والوسائط داخل نافذة خدمة العميل ٢٤ ساعة. خارجها استخدم قالباً معتمداً. المزود يتحقق من النافذة والصلاحيات عند الإرسال.', 'Text and media require the 24-hour customer service window. Outside it, use an approved template. The provider checks window eligibility and permissions when sending.')}</p>
          <form className="space-y-2" onSubmit={event => { event.preventDefault(); void send(); }}>
            {!conversationId && <label className="block text-xs">{loc('رقم المستلم الدولي', 'Recipient international number')}<input required pattern="\+?[1-9][0-9]{6,14}" className={inputClass} value={recipient} disabled={busy} onChange={e => setRecipient(e.target.value)} /></label>}
            <label className="block text-xs">{loc('قالب معتمد اختياري (قوالب النص)', 'Approved template (text templates)')}<select className={inputClass} value={selectedTemplate} disabled={busy} onChange={e => { setSelectedTemplate(e.target.value); setParameters(''); }}><option value="">{loc('نص أو وسائط', 'Text or media')}</option>{approved.map(item => <option key={`${item.name}:${item.language}`} value={`${item.name}:${item.language}`}>{item.name} · {item.language}</option>)}</select></label>
            {template ? <div className="space-y-2">
              <p className="whitespace-pre-wrap rounded-xl bg-[var(--bg-subtle)] p-3 text-sm">{template.components?.filter(part => ['HEADER', 'BODY', 'FOOTER'].includes(String(part.type).toUpperCase())).map(part => String(part.text || '')).filter(Boolean).join('\n')}</p>
              <label className="block text-xs">{loc('قيم المتغيرات: سطر لكل قيمة بالترتيب', 'Template variables: one value per line in order')}<textarea className={inputClass} disabled={busy} value={parameters} onChange={e => setParameters(e.target.value)} /></label>
              <p className="text-xs text-[var(--text-secondary)]">{loc('ابدأ بمتغيرات العنوان، ثم نص الرسالة، ثم روابط الأزرار. اترك الحقل فارغاً إذا لم توجد متغيرات.', 'Enter header values first, then message body values, then button link values. Leave empty when the template has no variables.')}</p>
            </div> : <>
              <label className="block text-xs">{loc('الرسالة', 'Message')}<textarea className={inputClass} disabled={busy} value={text} onChange={e => setText(e.target.value)} /></label>
              <label className="block text-xs">{loc('رابط وسائط HTTPS عام', 'Public HTTPS media URL')}<input type="url" pattern="https://.*" className={inputClass} disabled={busy} value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} /></label>
              <select aria-label="Media type" className={inputClass} disabled={busy} value={mediaType} onChange={e => setMediaType(e.target.value)}>{['image', 'video', 'audio', 'file'].map(type => <option key={type}>{type}</option>)}</select>
            </>}
            <button className={buttonClass} disabled={!writable || busy || !!pending || (!template && !text.trim() && !mediaUrl)}>{busy ? loc('جارٍ الإرسال…', 'Sending…') : loc('إرسال', 'Send')}</button>
          </form>
        </div>
      </div>}
    </>}
  </section>;
}
