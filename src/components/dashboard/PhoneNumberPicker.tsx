'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { retailAmountMinor } from '@/lib/billing/pricing';

type Row = Record<string, any>;
export type PhoneSelection = {
  country: string; numberType: string; phoneNumber?: string; areaCode?: string; locality?: string;
  monthlyCents: number; retailMonthlyCents: number; whatsappAvailable: boolean; smsAvailable: boolean;
  wantsSms: boolean; regulated: boolean;
};

const TYPES = ['local', 'mobile', 'national', 'toll_free'];
const chip = 'inline-flex items-center rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] font-semibold';
const field = 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm';

function flag(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + 127397)) : '';
}
/** Customer price: server-computed retail when present, else the same published margin rule. */
function retail(offer: Row | undefined): number | null {
  if (!offer) return null;
  if (Number.isSafeInteger(offer.retailMonthlyCents)) return offer.retailMonthlyCents;
  return Number.isSafeInteger(offer.monthlyCents) && offer.monthlyCents >= 0 ? retailAmountMinor(offer.monthlyCents) : null;
}
const usd = (minor: number | null) => minor === null ? '—' : `$${(minor / 100).toFixed(2)}`;
const regulatedOffer = (offer?: Row) => offer?.needsKyc === true || offer?.fulfilment === 'request';

async function read(input: Row) {
  const query = new URLSearchParams(Object.entries(input).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  const response = await fetch(`/api/phone-lifecycle?${query}`, { credentials: 'include', cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || 'Phone service unavailable.');
  return data;
}

/** Live Zernio catalog → number type → filters → inventory, with customer prices only. */
export function PhoneNumberPicker({ selection, onSelect, disabled = false, whatsappOnly = false }: {
  selection: PhoneSelection | null; onSelect: (value: PhoneSelection | null) => void; disabled?: boolean; whatsappOnly?: boolean;
}) {
  const { locale } = useThemeAndLocale();
  const ar = locale === 'ar', t = (en: string, arabic: string) => ar ? arabic : en;
  const [catalog, setCatalog] = useState<Row[]>([]), [loadingCatalog, setLoadingCatalog] = useState(true);
  const [query, setQuery] = useState(''), [country, setCountry] = useState(''), [numberType, setNumberType] = useState('');
  const [sms, setSms] = useState(false), [areaCode, setAreaCode] = useState(''), [contains, setContains] = useState('');
  const [areas, setAreas] = useState<Row[]>([]), [result, setResult] = useState<Row | null>(null);
  const [searching, setSearching] = useState(false), [error, setError] = useState(''), [reload, setReload] = useState(0);
  const revision = useRef(0);

  const name = (code: string, fallback?: string) => { try { return new Intl.DisplayNames([locale], { type: 'region' }).of(code) || fallback || code; } catch { return fallback || code; } };
  const typeLabel = (value: string) => ({ local: t('Local', 'محلي'), mobile: t('Mobile', 'محمول'), national: t('National', 'وطني'), toll_free: t('Toll-free', 'مجاني') } as Row)[value] || value;
  const visible = catalog.filter(c => !whatsappOnly || c.types?.some((x: Row) => x.whatsappAvailable === true))
    .filter(c => !query.trim() || `${c.code} ${name(c.code, c.name)} ${c.name || ''}`.toLowerCase().includes(query.trim().toLowerCase()));
  const chosen = catalog.find(c => c.code === country);
  const types = (chosen?.types || []).filter((x: Row) => TYPES.includes(x.numberType) && (!whatsappOnly || x.whatsappAvailable === true));
  const offer = types.find((x: Row) => x.numberType === numberType);
  const regulated = regulatedOffer(offer);
  const busy = disabled || searching;

  function pick(next: PhoneSelection | null) { onSelect(next); }
  function base(o: Row): Omit<PhoneSelection, 'phoneNumber' | 'areaCode' | 'locality'> {
    return { country, numberType, monthlyCents: o.monthlyCents, retailMonthlyCents: retail(o) ?? 0, whatsappAvailable: o.whatsappAvailable === true && numberType !== 'toll_free', smsAvailable: o.smsAvailable === true, wantsSms: sms, regulated: regulatedOffer(o) };
  }

  useEffect(() => {
    let active = true; setLoadingCatalog(true); setError('');
    read({ action: 'offers' }).then(data => {
      if (!active) return;
      if (!Array.isArray(data.countries)) throw new Error(t('The country catalog is unavailable.', 'قائمة الدول غير متاحة.'));
      const list = data.countries.map((c: Row) => ({ ...c, code: c.code ?? c.country })).filter((c: Row) => /^[A-Z]{2}$/.test(c.code));
      setCatalog(list);
      setCountry(current => current && list.some((c: Row) => c.code === current) ? current : '');
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Phone service unavailable.'); })
      .finally(() => { if (active) setLoadingCatalog(false); });
    return () => { active = false; };
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  async function search(filters: { areaCode?: string; contains?: string } = {}) {
    if (!country || !numberType) return;
    const current = ++revision.current; setSearching(true); setError(''); setResult(null); pick(null);
    try {
      const area = filters.areaCode ?? areaCode, digits = filters.contains ?? contains;
      const data = await read({ action: 'offers', country, numberType, wantsSms: sms, areaCode: area.trim(), contains: digits.trim(), limit: 50 });
      if (current !== revision.current) return;
      if (Array.isArray(data.countries)) setCatalog(data.countries.map((c: Row) => ({ ...c, code: c.code ?? c.country })));
      setResult({ ...data, queryKey: `${country}:${numberType}:${sms}` });
    } catch (e) { if (current === revision.current) setError(e instanceof Error ? e.message : 'Phone service unavailable.'); }
    finally { if (current === revision.current) setSearching(false); }
  }

  // Changing country, type or SMS requirement discards stale stock and any chosen number, then searches live.
  useEffect(() => {
    setResult(null); setAreas([]); pick(null);
    if (!country || !numberType) return;
    void search({ areaCode: '', contains: '' });
    if (!regulatedOffer(types.find((x: Row) => x.numberType === numberType))) {
      read({ action: 'availability', country, numberType, wantsSms: sms }).then(data => setAreas(Array.isArray(data.areaOptions) ? data.areaOptions : [])).catch(() => setAreas([]));
    }
  }, [country, numberType, sms]); // eslint-disable-line react-hooks/exhaustive-deps

  function chooseCountry(code: string) {
    const next = catalog.find(c => c.code === code);
    const first = (next?.types || []).find((x: Row) => TYPES.includes(x.numberType) && (!whatsappOnly || x.whatsappAvailable === true));
    revision.current++; setSearching(false); setAreaCode(''); setContains(''); setSms(false);
    setCountry(code); setNumberType(first?.numberType || '');
  }
  function submit(event: FormEvent) { event.preventDefault(); void search(); }

  const current = result?.queryKey === `${country}:${numberType}:${sms}` ? result : null;
  const numbers: Row[] = Array.isArray(current?.numbers) ? current!.numbers : [];
  const price = retail(offer);
  return <div className="space-y-4" dir={ar ? 'rtl' : 'ltr'}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-semibold">{t('1. Choose a country', '١. اختر الدولة')}</h4>
      <button type="button" className="flex items-center gap-2 text-sm" disabled={busy || loadingCatalog} onClick={() => setReload(v => v + 1)}><RefreshCw className="h-4 w-4" />{t('Refresh prices & availability', 'تحديث الأسعار والتوفر')}</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-500/40 p-3 text-sm">{error}</p>}
    <input aria-label={t('Search countries', 'ابحث عن دولة')} className={field} placeholder={t('Search by country name or code', 'ابحث باسم الدولة أو رمزها')} value={query} onChange={e => setQuery(e.target.value)} />
    {loadingCatalog ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{t('Loading live countries and prices…', 'جارٍ تحميل الدول والأسعار الحالية…')}</p>
      : <div role="listbox" aria-label={t('Countries', 'الدول')} className="grid max-h-80 gap-2 overflow-y-auto pe-1 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(c => {
          const priced = (c.types || []).map(retail).filter((v: number | null): v is number => v !== null);
          const from = priced.length ? Math.min(...priced) : null, any = (k: string) => c.types?.some((x: Row) => x[k] === true);
          const kyc = c.types?.length && c.types.every((x: Row) => regulatedOffer(x)), stock = c.types?.some((x: Row) => x.inStock !== false || x.preOrderable === true);
          return <button key={c.code} type="button" role="option" aria-selected={c.code === country} disabled={busy}
            className={`rounded-xl border p-3 text-start transition ${c.code === country ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`} onClick={() => chooseCountry(c.code)}>
            <span className="flex items-center justify-between gap-2"><span className="font-semibold"><span aria-hidden="true">{flag(c.code)} </span>{name(c.code, c.name)}</span><span className="text-xs text-[var(--text-secondary)]">{c.code}</span></span>
            <span className="mt-1 block text-sm">{t('From', 'يبدأ من')} <strong dir="ltr">{usd(from)}</strong> / {t('month', 'شهر')}</span>
            <span className="mt-2 flex flex-wrap gap-1">{any('whatsappAvailable') && <span className={chip}>WhatsApp</span>}{any('smsAvailable') && <span className={chip}>SMS</span>}{any('callsAvailable') !== false && <span className={chip}>{t('Calls', 'مكالمات')}</span>}{kyc && <span className={chip}>{t('ID required', 'يتطلب هوية')}</span>}{!stock && <span className={chip}>{t('Out of stock', 'غير متوفر')}</span>}</span>
          </button>;
        })}
        {!visible.length && <p className="text-sm text-[var(--text-secondary)]">{t('No offered country matches this search.', 'لا توجد دولة متاحة تطابق البحث.')}</p>}
      </div>}

    {chosen && <section aria-label={t('Number type', 'نوع الرقم')} className="space-y-2">
      <h4 className="font-semibold">{t('2. Number type', '٢. نوع الرقم')}</h4>
      <div role="radiogroup" aria-label={t('Number type', 'نوع الرقم')} className="flex flex-wrap gap-2">
        {types.map((x: Row) => <button key={x.numberType} type="button" role="radio" aria-checked={x.numberType === numberType} disabled={busy}
          className={`rounded-xl border px-3 py-2 text-sm ${x.numberType === numberType ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}
          onClick={() => { revision.current++; setSearching(false); setAreaCode(''); setContains(''); setNumberType(x.numberType); if (x.smsAvailable !== true) setSms(false); }}>
          <span className="font-semibold">{typeLabel(x.numberType)}</span> · <span dir="ltr">{usd(retail(x))}</span>/{t('mo', 'شهر')}{regulatedOffer(x) ? ` · ${t('ID required', 'يتطلب هوية')}` : ''}{x.inStock === false && x.preOrderable !== true ? ` · ${t('out of stock', 'غير متوفر')}` : ''}
        </button>)}
      </div>
      {offer && <p className="text-xs text-[var(--text-secondary)]">WhatsApp: {offer.whatsappAvailable && numberType !== 'toll_free' ? t('available', 'متاح') : t('unavailable', 'غير متاح')} · SMS: {offer.smsAvailable ? t('available', 'متاح') : t('unavailable', 'غير متاح')} · {t('Price per month, charged on activation and on the 1st of each month.', 'السعر شهرياً، يُحصّل عند التفعيل وفي أول كل شهر.')}</p>}
    </section>}

    {offer && !regulated && <form onSubmit={submit} className="grid gap-3 rounded-xl border border-[var(--border-subtle)] p-3 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-sm">{t('Area code or city', 'رمز المنطقة أو المدينة')}<input aria-label={t('Area code or city', 'رمز المنطقة أو المدينة')} list="asra3-area-options" className={`${field} mt-1`} placeholder={t('e.g. 415 or Madrid', 'مثال: 415 أو مدريد')} value={areaCode} onChange={e => setAreaCode(e.target.value)} />
        <datalist id="asra3-area-options">{areas.map(a => <option key={a.ndc} value={a.ndc}>{a.name}{Number.isSafeInteger(a.count) ? ` (${a.count})` : ''}</option>)}</datalist></label>
      <label className="text-sm">{t('Number contains digits', 'الرقم يحتوي على أرقام')}<input aria-label={t('Number contains digits', 'الرقم يحتوي على أرقام')} inputMode="numeric" dir="ltr" className={`${field} mt-1`} value={contains} onChange={e => setContains(e.target.value.replace(/\D/g, '').slice(0, 15))} /></label>
      <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 self-end rounded-xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40"><Search className="h-4 w-4" />{t('Search numbers', 'ابحث عن أرقام')}</button>
      <label className="text-sm sm:col-span-3"><input type="checkbox" className="me-2" checked={sms} disabled={busy || offer.smsAvailable !== true} onChange={e => setSms(e.target.checked)} />{t('SMS-capable numbers only', 'أرقام تدعم SMS فقط')}</label>
      {areas.length > 0 && <div className="flex flex-wrap gap-1 sm:col-span-3">{areas.slice(0, 12).map(a => <button key={a.ndc} type="button" className={chip} disabled={busy} onClick={() => { setAreaCode(a.ndc); void search({ areaCode: a.ndc }); }}>{a.name} · {a.ndc}{Number.isSafeInteger(a.count) ? ` (${a.count})` : ''}</button>)}</div>}
    </form>}

    {offer && <section aria-label={t('Available numbers', 'الأرقام المتاحة')} className="space-y-2">
      <h4 className="font-semibold">{t('3. Choose your number', '٣. اختر رقمك')}</h4>
      {searching && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{t('Checking live inventory…', 'جارٍ فحص المخزون الحالي…')}</p>}
      {!searching && current && (regulated ? (current.availabilityMode === 'out_of_stock'
        ? <p role="status" className="text-sm">{t('This country and number type are out of stock and cannot be ordered now. Choose another offer.', 'هذا النوع في الدولة غير متوفر ولا يمكن طلبه الآن. اختر عرضاً آخر.')}</p>
        : <button type="button" disabled={busy} aria-pressed={!!selection && !selection.phoneNumber} className={`w-full rounded-xl border p-4 text-start ${selection && !selection.phoneNumber ? 'ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`} onClick={() => pick(base(offer))}>
          <strong>{t('Assigned after identity verification', 'يُخصّص بعد التحقق من الهوية')}</strong> — <span dir="ltr">{usd(price)}</span> / {t('month', 'شهر')}
          <span className="mt-1 block text-sm">{t('This number is assigned after identity verification. Review the monthly price, then complete the required business or identity documents. An exact number is not available to choose yet.', 'يُخصّص الرقم بعد التحقق من الهوية. راجع السعر الشهري ثم أكمل مستندات المنشأة أو الهوية المطلوبة. لا يمكن اختيار رقم محدد الآن.')}</span>
        </button>)
        : <div role="listbox" aria-label={t('Available numbers', 'الأرقام المتاحة')} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {numbers.length > 0 && <button type="button" role="option" aria-selected={!!selection && !selection.phoneNumber} disabled={busy} className={`rounded-xl border p-3 text-start ${selection && !selection.phoneNumber ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]' : 'border-dashed border-[var(--border-subtle)]'}`}
            onClick={() => pick({ ...base(offer), ...(/^[0-9]{1,4}$/.test(areaCode.trim()) ? { areaCode: areaCode.trim() } : {}) })}>
            <span className="block font-semibold">{t('Any available number', 'أي رقم متاح')}</span>
            <span className="text-xs text-[var(--text-secondary)]">{/^[0-9]{1,4}$/.test(areaCode.trim()) ? t(`Assigned in area ${areaCode.trim()}`, `يُخصّص في المنطقة ${areaCode.trim()}`) : t('Assigned automatically by the provider', 'يخصصه المزود تلقائياً')}</span>
            <span className="mt-1 block text-sm" dir="ltr">{usd(price)} / {t('month', 'شهر')}</span>
          </button>}
          {numbers.map(n => <button key={n.phoneNumber} type="button" role="option" aria-selected={selection?.phoneNumber === n.phoneNumber} disabled={busy}
            className={`rounded-xl border p-3 text-start ${selection?.phoneNumber === n.phoneNumber ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]' : 'border-[var(--border-subtle)]'}`}
            onClick={() => pick({ ...base(offer), phoneNumber: n.phoneNumber, locality: n.locality || undefined, smsAvailable: Array.isArray(n.features) ? n.features.includes('sms') : offer.smsAvailable === true })}>
            <span className="block font-mono text-base font-semibold" dir="ltr">{n.phoneNumber}</span>
            <span className="text-xs text-[var(--text-secondary)]">{n.locality || name(country)}{n.bestEffort ? ` · ${t('nearby match', 'قريب من البحث')}` : ''}</span>
            <span className="mt-2 flex flex-wrap gap-1">{(Array.isArray(n.features) ? n.features : []).map((f: string) => <span key={f} className={chip}>{({ voice: t('Calls', 'مكالمات'), sms: 'SMS', mms: 'MMS' } as Row)[f] || f}</span>)}{offer.whatsappAvailable && numberType !== 'toll_free' && <span className={chip}>WhatsApp</span>}</span>
            <span className="mt-2 block text-sm font-semibold" dir="ltr">{usd(price)} / {t('month', 'شهر')}</span>
          </button>)}
          {!numbers.length && <p role="status" className="text-sm text-[var(--text-secondary)] sm:col-span-3">{t('No numbers match this search right now. Try another area code or city, or clear the filters.', 'لا توجد أرقام تطابق البحث حالياً. جرّب رمز منطقة أو مدينة أخرى أو امسح عوامل التصفية.')}</p>}
        </div>)}
    </section>}
  </div>;
}
