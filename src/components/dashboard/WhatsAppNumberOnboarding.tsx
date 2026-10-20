'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { AvailablePhoneNumber, OwnedPhoneNumber } from '@/types/telephony';

type NumberType = 'local' | 'mobile' | 'toll_free' | 'national';
type CountryOption = { country: string; countryName: string; types: Array<{
  numberType: NumberType; monthlyCents: number; needsKyc: boolean; whatsappAvailable: boolean; inStock: boolean; smsAvailable?: boolean; fulfilment?: string;
}> };
type PurchaseChoice = { country: string; numberType: NumberType; phoneNumber?: string; monthlyPriceUsd: number; needsKyc: boolean; wantsSms?: boolean };
type PendingPurchase = { id: string; choice: PurchaseChoice };
type PurchaseResult = { status: string; message: string; kycUrl?: string; phoneNumber?: OwnedPhoneNumber };

class PurchaseRequestError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

function errorMessage(data: { error?: string | { message?: string }; message?: string }, fallback: string) {
  return typeof data.error === 'string' ? data.error : data.error?.message || data.message || fallback;
}

function secureLink(value?: string) {
  try { return value && new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

/** Both purchase screens use the same provider-backed purchase and Meta flow. */
export function WhatsAppNumberOnboarding({ organizationId, onNumbersUpdated, showPurchase = true }: {
  organizationId?: string;
  onNumbersUpdated?: () => void;
  showPurchase?: boolean;
}) {
  const { locale } = useThemeAndLocale();
  const loc = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const [org, setOrg] = useState(organizationId || '');
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [country, setCountry] = useState('US');
  const [numberType, setNumberType] = useState<NumberType>('local');
  const [available, setAvailable] = useState<AvailablePhoneNumber[]>([]);
  const [numbers, setNumbers] = useState<OwnedPhoneNumber[]>([]);
  const [choice, setChoice] = useState<PurchaseChoice | null>(null);
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const [canReselect, setCanReselect] = useState(false);
  const purchaseLock = useRef(false);
  const storageKey = org ? `asra3:phone-purchase:${org}` : '';

  useEffect(() => {
    if (organizationId) { setOrg(organizationId); return; }
    let active = true;
    fetch('/api/auth?action=session', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!active) return;
      if (data.authenticated && data.session?.tenant?.organizationId) setOrg(data.session.tenant.organizationId);
      else setError('Sign in to manage phone numbers.');
    }).catch(() => { if (active) setError('Could not load your workspace. Reload to retry.'); });
    return () => { active = false; };
  }, [organizationId]);

  useEffect(() => {
    if (!storageKey) return;
    setStorageReady(false);
    setPending(null); setChoice(null); setResult(null); setConsent(false);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as PendingPurchase;
        if (!parsed.id || !parsed.choice?.country || !parsed.choice?.numberType) throw new Error('Invalid saved purchase');
        setPending(parsed); setChoice(parsed.choice);
      }
      setStorageReady(true);
    } catch {
      setError('Your saved purchase could not be loaded. Contact support before starting another purchase.');
    }
  }, [storageKey]);

  const service = useCallback(async (action: string, fields: Record<string, unknown> = {}) => {
    const response = await fetch('/api/services', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subService: 'telephony', action, organizationId: org, ...fields }),
    });
    const data = await response.json();
    if (!response.ok) throw new PurchaseRequestError(errorMessage(data, `Request failed (${response.status})`), response.status, data.code || data.error?.code);
    return data;
  }, [org]);

  const refresh = useCallback(async () => {
    if (!org) return;
    setListError('');
    try {
      const data = await service('list_numbers');
      setNumbers(data.numbers || []);
    } catch (err) {
      setNumbers([]);
      setListError(err instanceof Error ? err.message : 'Could not verify owned numbers.');
    }
  }, [org, service]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!org || !showPurchase) return;
    let active = true;
    setSearching(true); setAvailable([]);
    service('search_numbers', { country, numberType, capabilities: { whatsapp: true }, limit: 20 }).then(data => {
      if (!active) return;
      setCountries(data.countries || []); setAvailable((data.results || []).filter((item: AvailablePhoneNumber) => !item.requestOnly && !!item.phoneNumber));
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [org, country, numberType, service, showPurchase, searchRevision]);

  const purchase = async () => {
    if (!choice || !consent || !storageReady || purchaseLock.current) return;
    purchaseLock.current = true; setBusy('purchase'); setError(''); setCanReselect(false);
    try {
      // Save BEFORE the request. A timeout, refresh, or payment/KYC round trip
      // must retry this same intent, including its original selection.
      const intent = pending || { id: crypto.randomUUID(), choice };
      localStorage.setItem(storageKey, JSON.stringify(intent));
      setPending(intent);
      const data = await service('buy_number', {
        purchaseIntentId: intent.id, country: intent.choice.country,
        numberType: intent.choice.numberType, phoneNumber: intent.choice.phoneNumber,
        wantsSms: intent.choice.wantsSms !== false,
        expectedMonthlyCents: Math.round(intent.choice.monthlyPriceUsd * 100),
      });
      setResult(data);
      await refresh();
      if (data.phoneNumber) onNumbersUpdated?.();
    } catch (err) {
      // Only an explicit refusal before allocation permits a new selection.
      // Ambiguous/network/payment/KYC failures retain the original intent.
      setCanReselect(err instanceof PurchaseRequestError && [400, 409].includes(err.status) && ['PHONE_NUMBER_UNAVAILABLE', 'PRICE_CHANGED', 'COUNTRY_NOT_AVAILABLE', 'WHATSAPP_NOT_AVAILABLE', 'EXACT_NUMBER_REQUIRES_INSTANT_PROVISIONING', 'SMS_NOT_AVAILABLE', 'INVALID_PURCHASE_REQUEST'].includes(err.code || ''));
      setError(`${err instanceof Error ? err.message : 'Purchase response unavailable.'} Retry this purchase to check its status.`);
    } finally { purchaseLock.current = false; setBusy(''); }
  };

  const connect = async (number: OwnedPhoneNumber) => {
    setBusy(number.id); setError('');
    try {
      const response = await fetch('/api/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_oauth', organizationId: org, platform: 'whatsapp',
          whatsappOnboarding: 'api', whatsappSignupMode: 'hosted', purchasedNumberId: number.id }),
      });
      const data = await response.json();
      if (!response.ok || !secureLink(data.authUrl)) throw new Error(errorMessage(data, 'Could not start Meta onboarding.'));
      window.location.assign(data.authUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'Connection failed.'); setBusy(''); }
  };

  const selectedCountry = countries.find(item => item.country === country);
  const offer = selectedCountry?.types.find(item => item.numberType === numberType);
  const kycUrl = secureLink(result?.kycUrl);
  const inputClass = 'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 text-sm';
  const buttonClass = 'rounded-xl bg-[var(--accent-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
  return <div className="space-y-5">
    <p className="text-sm text-[var(--text-secondary)]">{loc('اشترِ رقمًا ثم أكمل ربط واتساب من خلال Meta. قد يلزم التحقق من الهوية أو الانتظار لتفعيل الرقم.', 'Purchase a number, then connect WhatsApp through Meta. Identity checks or activation time may be required.')}</p>
    {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-600"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {showPurchase && <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{loc('١. اختر رقمًا', '1. Choose a number')}</h3><button disabled={searching || !!busy || !org} onClick={() => { setError(''); setSearchRevision(value => value + 1); }} className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4" />{loc('تحديث الأسعار والتوفر', 'Refresh prices & availability')}</button></div>
      {pending ? <p className="text-sm">{loc('لديك طلب محفوظ. أعد المحاولة بنفس الطلب لمعرفة حالته دون إنشاء طلب شراء جديد.', 'A purchase is saved. Retry it to check the status using the same purchase intent.')} <span className="break-all font-mono text-xs">{pending.id}</span></p> : <>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">{loc('الدولة', 'Country')}<select aria-label="Country" className={inputClass} value={country} disabled={searching} onChange={e => { setCountry(e.target.value); setNumberType(countries.find(item => item.country === e.target.value)?.types[0]?.numberType || 'local'); setChoice(null); setConsent(false); }}>
            {!countries.length && <option value="US">{loc('جارٍ تحميل الدول…', 'Loading countries…')}</option>}
            {countries.map(item => <option key={item.country} value={item.country}>{item.countryName || item.country}</option>)}
          </select></label>
          <label className="space-y-1 text-sm">{loc('نوع الرقم', 'Number type')}<select aria-label="Number type" className={inputClass} value={numberType} onChange={e => { setNumberType(e.target.value as NumberType); setChoice(null); setConsent(false); }}>
            {(selectedCountry?.types.map(item => item.numberType) || [numberType]).map(type => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
          </select></label>
        </div>
        {searching ? <p role="status" className="flex gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{loc('جارٍ التحقق من التوفر…', 'Checking availability…')}</p> : <div className="grid gap-2 sm:grid-cols-2">
          {available.map(number => <button key={number.id} className={`${inputClass} text-start ${choice?.phoneNumber === number.phoneNumber ? 'ring-2 ring-[var(--accent-primary)]' : ''}`} onClick={() => { setChoice({ country: number.country, numberType: number.type, phoneNumber: number.phoneNumber, monthlyPriceUsd: number.monthlyPriceUsd, needsKyc: number.needsKyc, wantsSms: number.capabilities.sms }); setConsent(false); }}>
            <span className="block font-mono" dir="ltr">{number.phoneNumber}</span><span className="text-xs">${number.monthlyPriceUsd.toFixed(2)} / {loc('شهر', 'month')}</span>
          </button>)}
          {(offer?.needsKyc || offer?.fulfilment === 'request') && offer.whatsappAvailable && <button className={`${inputClass} text-start`} onClick={() => { setChoice({ country, numberType, monthlyPriceUsd: offer.monthlyCents / 100, needsKyc: offer.needsKyc, wantsSms: offer.smsAvailable === true }); setConsent(false); }}>
            {loc('طلب رقم من المزوّد', 'Request a number from the provider')} — ${(offer.monthlyCents / 100).toFixed(2)} / {loc('شهر', 'month')}
          </button>}
          {!available.length && !offer?.needsKyc && <p className="text-sm text-[var(--text-muted)]">{loc('لا توجد أرقام متاحة بهذا الاختيار.', 'No numbers are currently available for this selection.')}</p>}
        </div>}
      </>}
      {choice && <div className="space-y-3 rounded-xl bg-[var(--bg-subtle)] p-4">
        <p className="font-medium">{choice.phoneNumber || `${choice.country} · ${choice.numberType}`} — ${choice.monthlyPriceUsd.toFixed(2)} / {loc('شهر', 'month')}</p>
        {choice.needsKyc && <p className="text-sm">{loc('ستكمل التحقق من الهوية قبل تخصيص الرقم.', 'Complete the provider’s identity verification before a number is allocated.')}</p>}
        {choice.wantsSms === false && <p className="text-sm">{loc('هذا العرض لا يتضمن الرسائل النصية SMS.', 'SMS is not included with this offer.')}</p>}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{loc('أوافق على الاشتراك الشهري بسعر المزوّد المعروض. تُحاسب خدمات الاستخدام بشكل منفصل.', 'I agree to the displayed provider monthly subscription. Usage is billed separately.')}</label>
        <button onClick={() => void purchase()} disabled={!!busy || !consent || !storageReady} className={buttonClass}>{busy === 'purchase' ? loc('جارٍ التحقق…', 'Checking…') : pending ? loc('إعادة المحاولة بنفس الطلب', 'Retry saved purchase') : loc('شراء بهذا السعر', 'Purchase at this price')}</button>
        {canReselect && <button className="ms-3 text-sm underline" onClick={() => {
          try {
            localStorage.removeItem(storageKey); setPending(null); setChoice(null); setConsent(false); setResult(null); setError(''); setCanReselect(false); setSearchRevision(value => value + 1);
          } catch { setError('Could not update your saved purchase. Reload before continuing.'); }
        }}>{loc('اختيار رقم وسعر جديدين', 'Choose another number and price')}</button>}
      </div>}
      {result && <div role="status" className="space-y-2 rounded-xl border border-[var(--border-subtle)] p-4">
        <p>{result.message}</p><p className="text-sm">{loc('الحالة:', 'Status:')} {result.phoneNumber?.status || result.status}</p>
        {kycUrl && <a href={kycUrl} target="_blank" rel="noopener noreferrer" className="underline">{loc('استكمال التحقق من الهوية', 'Complete identity verification')}</a>}
        <p className="text-xs text-[var(--text-muted)]">{loc('بعد تحديث الدفع أو التحقق من الهوية، أعد المحاولة بنفس الطلب.', 'After updating payment or completing identity verification, retry the saved purchase.')}</p>
      </div>}
    </section>}
    <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{loc('٢. ربط الرقم بواتساب', '2. Connect your number to WhatsApp')}</h3><button disabled={!!busy || !org} onClick={() => void refresh()} className="flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4" />{loc('تحديث', 'Refresh')}</button></div>
      {listError && <p role="alert" className="text-sm text-red-600">{listError}</p>}
      {!numbers.length && !listError && <p className="text-sm text-[var(--text-muted)]">{loc('لم يتم العثور على أرقام مملوكة مؤكدة.', 'No verified owned numbers found.')}</p>}
      {numbers.map(number => <div key={number.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
        <div><p dir="ltr" className="font-mono">{number.phoneNumber || loc('بانتظار تخصيص الرقم', 'Awaiting number allocation')}</p><p className="text-xs text-[var(--text-secondary)]">{number.status} · {number.whatsappLinked ? loc('واتساب متصل', 'WhatsApp connected') : loc('واتساب غير متصل', 'WhatsApp not connected')}</p>
          {number.status !== 'active' && secureLink(number.kycUrl) && <a href={secureLink(number.kycUrl)!} target="_blank" rel="noopener noreferrer" className="text-sm underline">{loc('استكمال التحقق من الهوية', 'Complete identity verification')}</a>}
        </div>
        {!number.whatsappLinked && <button className={`${buttonClass} flex items-center gap-2`} disabled={!!busy || number.status !== 'active'} onClick={() => void connect(number)}>{busy === number.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{loc('المتابعة مع Meta', 'Continue with Meta')}</button>}
      </div>)}
    </section>
  </div>;
}
