'use client';

import { useEffect, useRef, useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';

type Report = { platform: string; source: string; totals?: Record<string, number | null>; previousTotals?: Record<string, number | null>;
  summary?: Record<string, number | null>; previousSummary?: Record<string, number | null>; responseTime?: Record<string, number | null>;
  unavailable: boolean; stale?: boolean; dataAsOf: string | null; fetchedAt: string; note: string; daily: Record<string, unknown>[] };
const control = 'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]';
const labels: Record<string, [string, string]> = {
  impressions: ['مرات الظهور', 'Impressions'], reach: ['الوصول', 'Reach'], likes: ['الإعجابات', 'Likes'], comments: ['التعليقات', 'Comments'], shares: ['المشاركات', 'Shares'], saves: ['الحفظ', 'Saves'], clicks: ['النقرات', 'Clicks'], views: ['المشاهدات', 'Views'], engagementRate: ['معدل التفاعل', 'Engagement rate'],
  received: ['الرسائل المستلمة', 'Received'], sent: ['الرسائل المرسلة', 'Sent'], read: ['الرسائل المقروءة', 'Read'], failed: ['الرسائل الفاشلة', 'Failed'], uniqueConversations: ['المحادثات الفريدة', 'Unique conversations'], sampleSize: ['حجم العينة', 'Sample size'], medianSeconds: ['الوسيط بالثواني', 'Median seconds'], p90Seconds: ['٩٠٪ بالثواني', '90th percentile seconds'], meanSeconds: ['المتوسط بالثواني', 'Mean seconds'],
};
export function CustomerReportsWorkspace() {
  const { dir } = useThemeAndLocale(); const ar = dir === 'rtl'; const loc = (a: string, e: string) => ar ? a : e;
  const [kind, setKind] = useState('social'), [platform, setPlatform] = useState('facebook');
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [timezone, setTimezone] = useState('Africa/Cairo'), [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<{ _id: string; platform: string; username?: string }[]>([]);
  const [role, setRole] = useState('viewer');
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => { const abort = new AbortController(); void fetch('/api/accounts', { signal: abort.signal }).then(async response => {
    const data = await response.json(); if (response.ok && Array.isArray(data.accounts)) setAccounts(data.accounts.map((a: { _id?: string; id?: string; accountId?: string; platform: string; username?: string }) => ({ ...a, _id: a._id || a.accountId || a.id || '' })));
  }).catch(() => {}); return () => { abort.abort(); request.current?.abort(); }; }, []);
  const query = () => new URLSearchParams({ kind, platform, fromDate: from, toDate: to, timezone, ...(kind === 'messaging' && accountId ? { accountId } : {}) });
  const clear = () => { request.current?.abort(); setBusy(false); setReport(null); setError(''); };
  async function refresh() {
    request.current?.abort(); const abort = new AbortController(); request.current = abort;
    setBusy(true); setError(''); setReport(null);
    try { const response = await fetch(`/api/reports?${query()}`, { signal: abort.signal }); const data = await response.json();
      if (!response.ok || !data.report) throw new Error(typeof data.error === 'string' ? data.error : loc('التقرير غير متاح.', 'The report is unavailable.'));
      if (!abort.signal.aborted) { setReport(data.report); setRole(data.role || 'viewer'); }
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Report unavailable.'); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(ar ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 }) : loc('غير متاح', 'Unavailable');
  const totals = report?.totals || report?.summary || {}, previous = report?.previousTotals || report?.previousSummary || {};
  return <section dir={dir} className="space-y-6" aria-label={loc('التقارير', 'Reports')}>
    <header><h2 className="text-xl font-semibold">{loc('تقارير نشاطك', 'Your business reports')}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{loc('اختر قناة وفترة لمراجعة النتائج المتاحة من المنصة.', 'Choose a channel and period to review the results available from the platform.')}</p></header>
    <form onSubmit={e => { e.preventDefault(); void refresh(); }} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">{loc('نوع التقرير', 'Report type')}<select className={control} value={kind} onChange={e => { clear(); setKind(e.target.value); setPlatform(e.target.value === 'social' ? 'facebook' : 'whatsapp'); setAccountId(''); }}><option value="social">{loc('منشورات وتفاعل', 'Posts and engagement')}</option><option value="messaging">{loc('الرسائل', 'Messages')}</option></select></label>
      <label className="grid gap-1 text-sm">{loc('القناة', 'Channel')}<select className={control} value={platform} onChange={e => { clear(); setPlatform(e.target.value); setAccountId(''); }}><option value="facebook">Facebook / Messenger</option><option value="instagram">Instagram</option>{kind === 'messaging' && <option value="whatsapp">WhatsApp</option>}</select></label>
      {kind === 'messaging' && <label className="grid gap-1 text-sm">{loc('الحساب', 'Account')}<select className={control} value={accountId} onChange={e => { clear(); setAccountId(e.target.value); }}><option value="">{loc('كل حسابات القناة', 'All accounts in this channel')}</option>{accounts.filter(a => a.platform === platform).map(a => <option key={a._id} value={a._id}>{a.username || a._id}</option>)}</select></label>}
      <label className="grid gap-1 text-sm">{loc('من', 'From')}<input className={control} type="date" required value={from} onChange={e => { clear(); setFrom(e.target.value); }} /></label>
      <label className="grid gap-1 text-sm">{loc('إلى', 'To')}<input className={control} type="date" required min={from} value={to} onChange={e => { clear(); setTo(e.target.value); }} /></label>
      <label className="grid gap-1 text-sm">{loc('عرض التوقيت', 'Display timezone')}<select className={control} value={timezone} onChange={e => { clear(); setTimezone(e.target.value); }}><option value="Africa/Cairo">Cairo</option><option value="UTC">UTC</option><option value="Asia/Riyadh">Riyadh</option><option value="Asia/Dubai">Dubai</option></select></label>
      <button disabled={busy} className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? loc('جاري التحميل…', 'Loading…') : loc('عرض التقرير', 'View report')}</button>
    </form>
    <p className="text-xs text-[var(--text-muted)]">{loc('حدود الأيام حسب تقويم المنصة؛ اختيار التوقيت يغيّر عرض وقت التحديث فقط.', 'Day boundaries follow the platform reporting calendar; timezone changes the displayed update time only.')}</p>
    {error && <p role="alert" className="rounded-lg border border-rose-400 p-3 text-sm">{error}</p>}
    {!report && !busy && !error && <p className="border-y border-[var(--border-subtle)] py-8 text-sm text-[var(--text-secondary)]">{loc('اعرض تقريرك لمتابعة النتائج. البيانات المفقودة ستظهر كغير متاحة.', 'View your report to see results. Missing data will appear as unavailable.')}</p>}
    {report && <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--text-secondary)]">{report.dataAsOf ? `${loc('آخر بيانات', 'Data as of')}: ${new Date(report.dataAsOf).toLocaleString(ar ? 'ar-EG' : 'en-GB', { timeZone: timezone })}` : loc('وقت آخر مزامنة غير متاح من المنصة.', 'The platform does not provide a last-sync timestamp.')}{report.stale && ` · ${loc('البيانات أقدم من ٢٤ ساعة', 'Data is over 24 hours old')}`}</p>{['owner','admin','editor','super_admin'].includes(role) && <a className="text-sm underline" href={`/api/reports?${query()}&format=csv`}>{loc('تنزيل CSV', 'Download CSV')}</a>}</div>
      {report.unavailable && <p role="status" className="text-sm">{loc('بيانات هذه الفترة غير متاحة حالياً.', 'Data for this period is currently unavailable.')}</p>}
      <div className="overflow-x-auto"><table className="w-full text-start text-sm"><thead><tr className="border-b border-[var(--border-subtle)]">{[loc('المؤشر', 'Metric'), loc('الفترة المختارة', 'Selected period'), loc('الفترة السابقة', 'Previous period'), loc('التغير', 'Change')].map(label => <th key={label} className="p-3 text-start font-medium">{label}</th>)}</tr></thead><tbody>{Object.entries(totals).map(([key, value]) => <tr key={key} className="border-b border-[var(--border-subtle)]"><th className="p-3 text-start font-normal">{labels[key]?.[ar ? 0 : 1] || key}</th><td className="p-3">{number(value)}</td><td className="p-3">{number(previous[key])}</td><td className="p-3">{typeof value === 'number' && typeof previous[key] === 'number' ? number(value - previous[key]!) : number(null)}</td></tr>)}</tbody></table></div>
      <details className="rounded-lg border border-[var(--border-subtle)] p-3"><summary className="cursor-pointer text-sm font-medium">{loc('النتائج اليومية', 'Daily results')}</summary>{report.daily.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{Object.keys(report.daily[0]).map(key => <th key={key} className="p-2 text-start">{key === 'date' ? loc('التاريخ', 'Date') : labels[key]?.[ar ? 0 : 1] || key}</th>)}</tr></thead><tbody>{report.daily.map((row,i) => <tr key={i}>{Object.keys(report.daily[0]).map(key => <td key={key} className="p-2">{key === 'date' ? String(row[key] || loc('غير متاح','Unavailable')) : number(row[key])}</td>)}</tr>)}</tbody></table></div> : <p className="mt-2 text-sm">{loc('لم توفر المنصة صفوف بيانات يومية لهذه الفترة.', 'The provider returned no daily rows for this period.')}</p>}</details>
      {report.responseTime && <div><h3 className="font-semibold">{loc('وقت أول رد', 'Time to first reply')}</h3><p className="my-2 text-xs text-[var(--text-secondary)]">{loc('العينة تشمل فقط الرسائل التي تلقت رداً.', 'Samples include only messages that received a reply.')}</p><dl className="flex flex-wrap gap-6">{Object.entries(report.responseTime).map(([key, value]) => <div key={key}><dt className="text-xs text-[var(--text-secondary)]">{labels[key]?.[ar ? 0 : 1] || key}</dt><dd className="mt-1 text-lg">{number(value)}</dd></div>)}</dl></div>}
    </>}
  </section>;
}
