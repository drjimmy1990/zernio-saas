'use client';

import { useState } from 'react';

type ControlAction = 'take' | 'request' | 'release' | 'pass';
type Conversation = { id: string; threadControl?: string; [key: string]: unknown };
type Intent = { action: ControlAction; targetAppId?: string };
const button = 'rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold disabled:opacity-50';
// Zernio's Meta handover guide identifies this app as Page Inbox.
const pageInboxAppId = '263902037430900';

export function MetaConversationControl({ profileId, accountId, conversation, platform, loginMethod, isRTL, disabled, onBusyChange, onChange }: {
  profileId: string; accountId: string; conversation: Conversation; platform: string; loginMethod?: string; isRTL: boolean;
  disabled: boolean; onBusyChange: (busy: boolean) => void; onChange: (conversation: Conversation) => void;
}) {
  const t = (ar: string, en: string) => isRTL ? ar : en;
  const storage = `asra3:meta:control:${profileId}:${accountId}:${conversation.id}`;
  const [pending, setPending] = useState<Intent | null>(() => {
    try { const item = JSON.parse(sessionStorage.getItem(storage) || 'null'); return item && ['take', 'request', 'release', 'pass'].includes(item.action) ? item : null; } catch { return null; }
  });
  const [review, setReview] = useState<ControlAction | null>(null), [targetAppId, setTargetAppId] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [checked, setChecked] = useState(false);
  const supportsTake = platform === 'facebook' || loginMethod === 'facebook_login';
  const blocked = disabled || busy;
  const owner = conversation.threadControl === 'app' ? t('Asra3 يمكنه الرد', 'Asra3 can reply') : conversation.threadControl === 'other' ? t('تطبيق آخر يتحكم بالردود', 'Another app controls replies') : t('جهة التحكم غير مؤكدة', 'Reply control is unconfirmed');
  const label = (action: ControlAction) => action === 'take' ? t('الرد من Asra3', 'Reply from Asra3') : action === 'request' ? t('طلب التحكم للرد', 'Request reply control') : action === 'release' ? t('إعادة التحكم', 'Return control') : t('نقل التحكم لتطبيق', 'Pass control to an app');
  function remember(intent: Intent | null) { setPending(intent); setChecked(false); try { if (intent) sessionStorage.setItem(storage, JSON.stringify(intent)); else sessionStorage.removeItem(storage); } catch { /* Keep the current intent in memory. */ } }
  async function request(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || data.error || data.success === false) throw Object.assign(new Error(data.error?.message || `Request failed (${response.status}).`), { status: response.status });
    return data;
  }
  async function refresh() {
    if (blocked) return;
    setBusy(true); onBusyChange(true); setError('');
    try {
      const data = await request(`/api/inbox?${new URLSearchParams({ action: 'conversation', accountId, conversationId: conversation.id })}`);
      if (data.data?.id !== conversation.id) throw Error(t('تعذر التحقق من المحادثة.', 'The conversation could not be verified.'));
      onChange(data.data); setChecked(true);
      setNotice(t('تم تحديث جهة التحكم. الطلب السابق لا يزال قيد المراجعة.', 'Reply control refreshed. Review any previous request before another change.'));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not refresh control.'); }
    finally { setBusy(false); onBusyChange(false); }
  }
  async function change() {
    if (blocked || pending || !review) return;
    const intent: Intent = { action: review, ...(review === 'pass' ? { targetAppId } : {}) };
    remember(intent); setBusy(true); onBusyChange(true); setError(''); setNotice(''); setReview(null);
    try {
      const result = await request('/api/messaging-settings', { action: 'thread_control', accountId, conversationId: conversation.id, controlAction: intent.action, targetAppId: intent.targetAppId });
      if (result.conversation?.id !== conversation.id) throw Error(t('نتيجة تغيير التحكم غير مؤكدة.', 'The control change is unconfirmed.'));
      onChange(result.conversation);
      if (result.confirmed === true) { remember(null); setNotice(t('تم تأكيد جهة التحكم الجديدة.', 'The new reply control is confirmed.')); }
      else setNotice(t('قبلت الخدمة الطلب، لكن نقل التحكم لم يتأكد بعد. حدّث الحالة قبل أي طلب جديد.', 'The service accepted the request, but control has not been confirmed. Refresh before another request.'));
    } catch (failure) {
      const item = failure as Error & { status?: number };
      if (item.status && item.status >= 400 && item.status < 500 && ![408, 409, 429].includes(item.status)) remember(null);
      setError(item.message);
    } finally { setBusy(false); onBusyChange(false); }
  }
  return <details className="my-4 border-y border-[var(--border-subtle)] py-3" aria-label="Conversation reply control">
    <summary className="cursor-pointer text-sm font-semibold">{t('من يرد على العميل؟', 'Who replies to the customer?')} <span className="font-normal text-[var(--text-secondary)]">· {owner}</span></summary>
    <div className="mt-4 space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">{t('استخدم التحكم عندما تتشارك تطبيقات متعددة هذه المحادثة. التغيير لا يرسل رسالة للعميل ولا يمدد نافذة الرد.', 'Use reply control when multiple apps share this conversation. Changing control does not message the customer or extend the reply window.')}</p>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
      {pending && <aside aria-label="Pending control request" className="space-y-3 rounded-xl bg-amber-500/10 p-4 text-sm">
        <strong>{t('طلب يحتاج للمراجعة', 'Request needs review')}: {label(pending.action)}</strong>
        <p>{t('قد يكون الطلب نُفّذ أو ما زال ينتظر التطبيق الآخر. حدّث الحالة وراجع التطبيق الآخر قبل تغيير التحكم مجدداً.', 'The request may have completed or may be waiting for the other app. Refresh control and review the other app before changing it again.')}</p>
        <button className={button} disabled={blocked || !checked} onClick={() => { remember(null); setNotice(''); }}>{t('راجعت الحالة، إنهاء المراجعة', 'I reviewed the state, finish review')}</button>
      </aside>}
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={blocked} onClick={() => void refresh()}>{t('تحديث جهة التحكم', 'Refresh reply control')}</button>
        {supportsTake && <><button className={button} disabled={blocked || !!pending} onClick={() => setReview('take')}>{label('take')}</button><button className={button} disabled={blocked || !!pending} onClick={() => setReview('request')}>{label('request')}</button></>}
        <button className={button} disabled={blocked || !!pending} onClick={() => setReview('release')}>{label('release')}</button>
        <button className={button} disabled={blocked || !!pending} onClick={() => { setTargetAppId(pageInboxAppId); setReview('pass'); }}>{t('الرد من صندوق وارد الصفحة', 'Reply in Page Inbox')}</button>
      </div>
      {!supportsTake && <p className="text-xs text-[var(--text-secondary)]">{t('هذا الاتصال المباشر بـ Instagram لا يدعم أخذ التحكم أو طلبه.', 'This direct Instagram connection does not support taking or requesting control.')}</p>}
      <details><summary className="cursor-pointer text-sm">{t('نقل لتطبيق آخر', 'Pass to another app')}</summary><div className="mt-3 flex flex-wrap gap-2"><input aria-label="Receiving Meta app ID" placeholder={t('معرّف تطبيق Meta المستلم', 'Receiving Meta app ID')} className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm" inputMode="numeric" value={targetAppId} disabled={blocked || !!pending} onChange={event => { setTargetAppId(event.target.value); setReview(null); }} /><button className={button} disabled={blocked || !!pending || !/^[0-9]+$/.test(targetAppId)} onClick={() => setReview('pass')}>{label('pass')}</button></div></details>
      {review && <div aria-label="Control change review" className="space-y-3 rounded-xl border border-[var(--border-subtle)] p-4 text-sm"><strong>{label(review)}</strong><p>{review === 'request' ? t('سيحتاج التطبيق المسؤول للموافقة على نقل التحكم.', 'The controlling app must agree to pass control.') : review === 'take' ? t('يتطلب هذا أن يكون التطبيق مخوّلاً بأخذ التحكم. تتحقق Meta من الصلاحية.', 'This app must have permission to take control. Meta checks that permission.') : t('قد تتوقف الردود من Asra3 حتى يُعاد التحكم إليه.', 'Replies from Asra3 may stop until control is returned.')}{review === 'pass' && ` ${targetAppId}`}</p><button className={button} disabled={blocked || !!pending} onClick={() => void change()}>{t('تأكيد تغيير التحكم', 'Confirm control change')}</button></div>}
    </div>
  </details>;
}
