'use client';

import { useCallback, useEffect, useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { ConnectedAccountData } from './ConnectionWizardModal';

type Account = ConnectedAccountData & { status: string; isActive?: boolean; needsReconnect?: boolean; checkedAt?: string; issues?: string[] };
const PLATFORM_NAMES: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp' };
export function ProviderAccountsPanel({ onOpenConnectionWizard, onRefreshWorkspace, refreshKey }: {
  onOpenConnectionWizard: (platform?: string, account?: ConnectedAccountData) => void;
  onRefreshWorkspace?: () => void;
  refreshKey?: unknown;
}) {
  const { locale } = useThemeAndLocale();
  const text = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/accounts', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || data.success !== true || !Array.isArray(data.accounts)) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Account health is unavailable.');
      setAccounts(data.accounts);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Account health is unavailable.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh, refreshKey]);
  async function disconnect() {
    if (!review) return;
    setBusy(true); setNotice('');
    try {
      const response = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect', accountId: review.accountId || review.id }) });
      const data = await response.json();
      if (!response.ok || data.success !== true) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Disconnection was not confirmed. Refresh accounts before retrying.');
      setReview(null); setNotice(text('تم تأكيد فصل الحساب.', 'Account disconnection confirmed.')); onRefreshWorkspace?.();
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Disconnection was not confirmed.'); }
    finally { await refresh(); setBusy(false); }
  }
  const button = 'rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-[var(--bg-subtle)]';
  return <section className="space-y-5" aria-label={text('حسابات الأعمال', 'Business accounts')}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h3 className="text-lg font-bold">{text('حساباتك المتصلة', 'Your connected accounts')}</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{text('تحقق من حالة الربط وأعد ربط الحساب عند الحاجة.', 'Check connection health and reconnect when needed.')}</p></div>
      <div className="flex gap-2"><button className={button} disabled={loading || busy} onClick={() => void refresh()}>{text('تحديث الحالة', 'Refresh health')}</button><button className={button} onClick={() => onOpenConnectionWizard()}>{text('ربط حساب', 'Connect account')}</button></div>
    </div>
    {loading && <p role="status">{text('جارٍ التحقق من الحسابات…', 'Checking accounts…')}</p>}
    {error && <div role="alert" className="border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><p>{error}</p>{accounts && <p className="mt-1">{text('القائمة السابقة معروضة للمراجعة فقط. الحالة الحالية غير مؤكدة.', 'Previous results shown for reference. Current health is unconfirmed.')}</p>}</div>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {!loading && !error && accounts?.length === 0 && <div className="py-12 text-center"><h4 className="font-semibold">{text('اربط أول حساب لأعمالك', 'Connect your first business account')}</h4><p className="mt-2 text-sm text-[var(--text-secondary)]">{text('ابدأ بصفحة فيسبوك للنشر والتواصل مع العملاء.', 'Start with your Facebook Page to publish and reply to customers.')}</p><button className={`${button} mt-5`} onClick={() => onOpenConnectionWizard('facebook')}>{text('ربط فيسبوك', 'Connect Facebook')}</button></div>}
    <ul className="divide-y divide-[var(--border-subtle)]">{accounts?.map((account) => <li key={account.accountId || account.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div className="min-w-0"><p className="font-semibold">{account.displayName || account.username}</p><p className="text-sm text-[var(--text-secondary)]">{PLATFORM_NAMES[account.platform] || account.platform} · {account.username}</p><p className="mt-2 text-sm">{error ? text('الحالة غير مؤكدة', 'Health unconfirmed') : account.needsReconnect || account.isActive === false ? text('إعادة الربط مطلوبة', 'Reconnect needed') : account.status === 'healthy' ? text('سليم', 'Healthy') : account.status === 'warning' ? text('يحتاج مراجعة', 'Needs attention') : account.status === 'error' ? text('مشكلة في الربط', 'Connection issue') : text('الحالة غير معروفة', 'Health unknown')}</p>{!error && account.issues?.map((issue) => <p key={issue} className="text-xs text-[var(--text-secondary)]">{issue}</p>)}</div>
      <div className="flex gap-2"><button className={button} disabled={busy || !!error || loading} onClick={() => onOpenConnectionWizard(account.platform, account)}>{text('إعادة الربط', 'Reconnect')}</button><button className={button} disabled={busy || !!error || loading} onClick={() => { setReview(account); setNotice(''); }}>{text('فصل الحساب', 'Disconnect')}</button></div>
    </li>)}</ul>
    {review && <div className="border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-5" role="region" aria-label={text('مراجعة فصل الحساب', 'Review disconnection')}><h4 className="font-semibold">{text('فصل', 'Disconnect')} {review.displayName}?</h4><p className="mt-2 text-sm text-[var(--text-secondary)]">{text('سيتوقف النشر والتواصل عبر هذا الحساب حتى تربطه مجدداً.', 'Publishing and customer replies through this account will stop until you reconnect it.')}</p><div className="mt-4 flex gap-2"><button className={button} disabled={busy} onClick={() => setReview(null)}>{text('إلغاء', 'Cancel')}</button><button className={`${button} text-rose-600`} disabled={busy || !!error || loading} onClick={() => void disconnect()}>{busy ? text('جارٍ التأكيد…', 'Confirming…') : text('تأكيد الفصل', 'Confirm disconnect')}</button></div></div>}
  </section>;
}
