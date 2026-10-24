'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import type { OwnedPhoneNumber } from '@/types/telephony';
import { PhoneNumberPicker, type PhoneSelection } from './PhoneNumberPicker';

type PurchaseInput = { country: string; numberType: string; phoneNumber?: string; areaCode?: string; expectedMonthlyCents: number; connectWhatsapp: boolean; wantsSms: boolean; allowMultiple: boolean };
/** Saved before any paid request so a timeout, refresh or KYC round trip reuses the same intent and quote. */
type PendingPurchase = { id: string; input: PurchaseInput; quoteId: string; amountMinor: number; label: string };
type PurchaseResult = { status: string; message: string; kycUrl?: string; confirmed?: boolean };

function errorMessage(data: { error?: string | { message?: string }; message?: string }, fallback: string) {
  return typeof data.error === 'string' ? data.error : data.error?.message || data.message || fallback;
}

function secureLink(value?: string) {
  try { return value && new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

async function phoneWrite(action: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await fetch('/api/phone-lifecycle', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
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
  const [numbers, setNumbers] = useState<OwnedPhoneNumber[]>([]);
  const [choice, setChoice] = useState<PhoneSelection | null>(null);
  const [quote, setQuote] = useState<{ id: string; amountMinor: number; intent: string; input: PurchaseInput } | null>(null);
  const [pending, setPending] = useState<PendingPurchase | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [consent, setConsent] = useState(false);
  const [additional, setAdditional] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const purchaseLock = useRef(false);
  const storageKey = org ? `asra3:phone-purchase:${org}` : '';
  const ownsNumber = numbers.some(number => number.status !== 'released');

  useEffect(() => {
    if (organizationId) { setOrg(organizationId); return; }
    let active = true;
    fetch('/api/auth?action=session', { cache: 'no-store' }).then(r => r.json()).then(data => {
      if (!active) return;
      if (data.authenticated && data.session?.tenant?.organizationId) setOrg(data.session.tenant.organizationId);
      else setError(loc('سجّل الدخول لإدارة أرقام الهاتف.', 'Sign in to manage phone numbers.'));
    }).catch(() => { if (active) setError(loc('تعذر تحميل مساحة العمل. أعد التحميل للمحاولة.', 'Could not load your workspace. Reload to retry.')); });
    return () => { active = false; };
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storageKey) return;
    setStorageReady(false);
    setPending(null); setChoice(null); setQuote(null); setResult(null); setConsent(false);
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as PendingPurchase;
        // Entries from the retired purchase path never reached the provider; they are safe to discard.
        if (parsed?.id && parsed.quoteId && parsed.input?.country) setPending(parsed); else localStorage.removeItem(storageKey);
      }
      setStorageReady(true);
    } catch {
      setError(loc('تعذر تحميل طلب الشراء المحفوظ. تواصل مع الدعم قبل بدء شراء آخر.', 'Your saved purchase could not be loaded. Contact support before starting another purchase.'));
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    if (!org) return;
    setListError('');
    try {
      const response = await fetch('/api/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subService: 'telephony', action: 'list_numbers', organizationId: org }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, `Request failed (${response.status})`));
      setNumbers(data.numbers || []);
    } catch (err) {
      setNumbers([]);
      setListError(err instanceof Error ? err.message : 'Could not verify owned numbers.');
    }
  }, [org]);

  useEffect(() => { void refresh(); }, [refresh]);

  function select(next: PhoneSelection | null) { setChoice(next); setQuote(null); setConsent(false); setResult(null); setError(''); }

  const purchaseInput = (selection: PhoneSelection): PurchaseInput => ({
    country: selection.country, numberType: selection.numberType, phoneNumber: selection.phoneNumber, areaCode: selection.areaCode,
    expectedMonthlyCents: selection.monthlyCents, connectWhatsapp: selection.whatsappAvailable, wantsSms: selection.wantsSms, allowMultiple: ownsNumber && additional,
  });

  // Step 1: a server-created customer quote (5-minute expiry) for this exact selection.
  const review = async () => {
    if (!choice || busy) return;
    setBusy('quote'); setError(''); setQuote(null); setConsent(false);
    try {
      const intent = crypto.randomUUID().replaceAll('-', '');
      const input = purchaseInput(choice);
      const { ok, data } = await phoneWrite('purchase_quote', { ...input, intent });
      if (!ok || !data.quote?.id || !Number.isSafeInteger(data.quote.amountMinor)) throw new Error(errorMessage(data, loc('تعذر تجهيز السعر. حاول مرة أخرى.', 'The price could not be prepared. Try again.')));
      setQuote({ id: data.quote.id, amountMinor: data.quote.amountMinor, intent, input });
    } catch (err) { setError(err instanceof Error ? err.message : 'Price review failed.'); }
    finally { setBusy(''); }
  };

  // Step 2: the paid request. The intent is saved first and reused on every retry.
  const purchase = async (saved?: PendingPurchase) => {
    const intent = saved || (quote && choice ? { id: quote.intent, input: quote.input, quoteId: quote.id, amountMinor: quote.amountMinor, label: choice.phoneNumber || `${choice.country} · ${choice.numberType}` } : null);
    if (!intent || !storageReady || purchaseLock.current || (!saved && !consent)) return;
    purchaseLock.current = true; setBusy('purchase'); setError('');
    try {
      localStorage.setItem(storageKey, JSON.stringify(intent));
      setPending(intent);
      const { ok, status, data } = await phoneWrite('purchase', { ...intent.input, intent: intent.id, quoteId: intent.quoteId }, intent.id);
      if (!ok) {
        // A refusal before dispatch frees the selection; anything uncertain keeps the saved intent.
        if ([400, 403, 409].includes(status) && data.error?.details?.outcome !== 'unknown') { localStorage.removeItem(storageKey); setPending(null); }
        throw new Error(errorMessage(data, loc('لم يتم تأكيد الشراء.', 'The purchase was not confirmed.')));
      }
      const kycUrl = secureLink(data.kycUrl) || undefined;
      setResult({ status: data.phoneNumber?.status || data.status || (data.confirmed ? 'active' : 'pending'), confirmed: data.confirmed === true, kycUrl,
        message: kycUrl ? loc('هذا الرقم يتطلب التحقق من الهوية قبل التفعيل.', 'This number needs identity verification before activation.')
          : data.confirmed ? loc('تم شراء الرقم. اربطه بواتساب أدناه عندما يصبح نشطاً.', 'Number purchased. Connect it to WhatsApp below once it is active.')
          : loc('تم استلام الطلب لدى المزود. تحقق من الحالة بعد قليل.', 'The provider accepted the order. Check its status shortly.') });
      if (data.confirmed || kycUrl) { localStorage.removeItem(storageKey); setPending(null); setChoice(null); setQuote(null); setConsent(false); }
      await refresh();
      if (data.phoneNumber) onNumbersUpdated?.();
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Purchase response unavailable.'}`);
    } finally { purchaseLock.current = false; setBusy(''); }
  };

  const reconcile = async () => {
    if (!pending || busy) return;
    setBusy('reconcile'); setError('');
    try {
      const { ok, data } = await phoneWrite('purchase_reconcile', { operationKey: `purchase:${pending.id}` });
      if (!ok) throw new Error(errorMessage(data, loc('تعذر التحقق من حالة الطلب.', 'The order status could not be checked.')));
      if (data.confirmed) {
        localStorage.removeItem(storageKey); setPending(null);
        setResult({ status: data.phoneNumber?.status || 'active', confirmed: true, message: loc('تم تأكيد الرقم.', 'The number is confirmed.') });
        await refresh(); onNumbersUpdated?.();
      } else setResult({ status: 'pending', message: data.message || loc('لم يتأكد التخصيص بعد. لا تشترِ رقماً آخر.', 'Allocation is not confirmed yet. Do not buy another number.') });
    } catch (err) { setError(err instanceof Error ? err.message : 'Status check failed.'); }
    finally { setBusy(''); }
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

  const kycUrl = secureLink(result?.kycUrl);
  const buttonClass = 'btn-premium-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer';
  const secondaryButton = 'btn-premium-secondary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50 cursor-pointer';
  const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;
  return <div className="space-y-5">
    <p className="text-sm text-[var(--text-secondary)]">{loc('اشترِ رقمًا ثم أكمل ربط واتساب من خلال Meta. قد يلزم التحقق من الهوية أو الانتظار لتفعيل الرقم.', 'Purchase a number, then connect WhatsApp through Meta. Identity checks or activation time may be required.')}</p>
    {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-600"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {showPurchase && <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] p-5">
      <h3 className="font-semibold">{loc('١. اختر رقمًا', '1. Choose a number')}</h3>
      {pending ? <div className="space-y-3 rounded-xl border border-amber-500/40 p-4 text-sm">
        <p>{loc('لديك طلب شراء محفوظ. تحقق من حالته أو أعد إرساله بنفس الطلب دون إنشاء شراء جديد.', 'A purchase is saved. Check its status, or retry it with the same request without creating a new purchase.')}</p>
        <p dir="ltr" className="font-mono">{pending.label} · {usd(pending.amountMinor)} / {loc('شهر', 'month')}</p>
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={!!busy} onClick={() => void reconcile()}>{busy === 'reconcile' ? loc('جارٍ التحقق…', 'Checking…') : loc('التحقق من حالة الطلب', 'Check order status')}</button>
          <button className={secondaryButton} disabled={!!busy || !storageReady} onClick={() => void purchase(pending)}>{loc('إعادة المحاولة بنفس الطلب', 'Retry saved purchase')}</button>
        </div>
      </div> : <>
        <PhoneNumberPicker whatsappOnly selection={choice} onSelect={select} disabled={!!busy || !org} />
        {choice && <div aria-label="Purchase review" className="space-y-3 rounded-xl bg-[var(--bg-subtle)] p-4">
          <p className="font-medium"><span dir="ltr">{choice.phoneNumber || (choice.areaCode ? `${choice.country} · ${choice.areaCode}` : `${choice.country} · ${choice.numberType}`)}</span> — {usd(quote?.amountMinor ?? choice.retailMonthlyCents)} / {loc('شهر', 'month')}</p>
          {choice.regulated && <p className="text-sm">{loc('ستكمل التحقق من الهوية قبل تخصيص الرقم.', 'Complete the provider’s identity verification before a number is allocated.')}</p>}
          {!choice.smsAvailable && <p className="text-sm">{loc('هذا العرض لا يتضمن الرسائل النصية SMS.', 'SMS is not included with this offer.')}</p>}
          {ownsNumber && <label className="flex gap-2 text-sm"><input type="checkbox" checked={additional} onChange={e => { setAdditional(e.target.checked); setQuote(null); setConsent(false); }} />{loc('أريد رقماً إضافياً بإيجار شهري منفصل.', 'I intend an additional number with its own monthly rental.')}</label>}
          {!quote ? <button className={buttonClass} disabled={!!busy || (ownsNumber && !additional)} onClick={() => void review()}>{busy === 'quote' ? loc('جارٍ تجهيز السعر…', 'Preparing price…') : loc('مراجعة السعر', 'Review price')}</button> : <>
            <p className="text-sm">{loc('يُخصم من رصيدك عند التفعيل ثم شهرياً في اليوم الأول (UTC). لا توجد تجزئة للشهر الأول. الاستخدام يُحاسب بشكل منفصل.', 'Charged from your balance on activation, then monthly on the 1st (UTC). No first-month proration. Usage is billed separately.')}</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{loc(`أوافق على الإيجار الشهري ${usd(quote.amountMinor)}.`, `I agree to the ${usd(quote.amountMinor)} monthly rental.`)}</label>
            <button onClick={() => void purchase()} disabled={!!busy || !consent || !storageReady} className={buttonClass}>{busy === 'purchase' ? loc('جارٍ الشراء…', 'Purchasing…') : loc('شراء بهذا السعر', 'Purchase at this price')}</button>
          </>}
        </div>}
      </>}
      {result && <div role="status" className="space-y-2 rounded-xl border border-[var(--border-subtle)] p-4">
        <p>{result.message}</p><p className="text-sm">{loc('الحالة:', 'Status:')} {result.status}</p>
        {kycUrl && <a href={kycUrl} target="_blank" rel="noopener noreferrer" className="underline">{loc('استكمال التحقق من الهوية', 'Complete identity verification')}</a>}
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
