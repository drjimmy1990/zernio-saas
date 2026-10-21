'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';
import { authErrorMessage } from '@/lib/auth/messages';

export default function RecoveryPage() {
  const { locale, dir } = useThemeAndLocale(); const ar = locale === 'ar';
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [token,setToken] = useState(''); const [type,setType] = useState('');
  const [busy,setBusy] = useState(false); const [notice,setNotice] = useState(''); const [error,setError] = useState('');
  const [linkError,setLinkError] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const failed = params.has('error') || params.has('error_description');
    setToken(failed ? '' : params.get('access_token') || ''); setType(params.get('type') || '');
    setLinkError(failed);
    if (window.location.hash) window.history.replaceState(null,'',window.location.pathname);
  },[]);
  async function submit(action: string) {
    setBusy(true);setError('');setNotice('');setLinkError(false);
    try {
      const response = await fetch('/api/auth',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email,password,accessToken:token}) });
      const data = await response.json();
      if (!response.ok) {setError(authErrorMessage(data, locale, ar ? 'لم يتم تأكيد الطلب.' : 'Request was not confirmed.'));return;}
      if (data?.ok !== true) {setError(ar ? 'لم يتم تأكيد الطلب. حاول مرة أخرى.' : 'Request was not confirmed. Try again.');return;}
      if (action === 'verify_email') window.location.assign(data.redirectTo || '/dashboard');
      else {setNotice(ar ? action==='complete_recovery' ? 'تم تغيير كلمة المرور. سجّل الدخول مجدداً.' : 'إذا كان الحساب مؤهلاً ستصلك رسالة. راجع البريد ومجلد الرسائل غير المرغوبة.' : data.message || 'Check your email.'); if(action==='complete_recovery')setToken('');}
    } catch {setError(ar ? 'تعذّر الاتصال بخدمة الحساب. حاول مرة أخرى.' : 'Could not reach the account service. Try again.');} finally {setBusy(false);}
  }
  return <main dir={dir} className="mx-auto max-w-lg p-6 text-[var(--text-primary)]"><section className="luxury-card space-y-5 rounded-3xl p-6">
    <h1 className="text-2xl font-bold">{ar?'استعادة الحساب وتأكيد البريد':'Account recovery and email verification'}</h1>
    {(error || linkError) && <p role="alert" className="text-rose-500">{error || authErrorMessage({code:'invalid_auth_link'},locale,'Request a new link.')}</p>}{notice && <p role="status">{notice}</p>}
    {token ? type==='recovery' ? <form onSubmit={e=>{e.preventDefault();void submit('complete_recovery');}} className="space-y-4"><label className="block">{ar?'كلمة مرور جديدة':'New password'}<input type="password" autoComplete="new-password" minLength={10} maxLength={200} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--bg-subtle)]"/></label><button disabled={busy} className="rounded-xl bg-[var(--brand-coral)] p-3 text-white">{ar?'حفظ كلمة المرور':'Save password'}</button></form> : <button disabled={busy} onClick={()=>void submit('verify_email')} className="rounded-xl bg-[var(--brand-coral)] p-3 text-white">{ar?'تأكيد الحساب وفتح مساحة العمل':'Verify account and open workspace'}</button> : <form onSubmit={e=>{e.preventDefault();void submit('recover');}} className="space-y-4"><label className="block">{ar?'البريد الإلكتروني':'Email'}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--bg-subtle)]"/></label><div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-xl border p-3">{ar?'إرسال رابط الاستعادة':'Send recovery link'}</button><button type="button" disabled={busy||!email} onClick={()=>void submit('resend')} className="rounded-xl border p-3">{ar?'إعادة إرسال التأكيد':'Resend verification'}</button></div></form>}
    <Link href="/login" className="inline-block underline">{ar?'العودة لتسجيل الدخول':'Back to sign in'}</Link>
  </section></main>;
}
