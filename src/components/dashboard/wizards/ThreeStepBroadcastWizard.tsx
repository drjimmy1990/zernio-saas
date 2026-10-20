'use client';

import { useEffect, useRef, useState } from 'react';
import { useThemeAndLocale } from '@/i18n/ThemeAndLocaleProvider';

type Account = { accountId: string; displayName?: string; username?: string; isActive?: boolean; needsReconnection?: boolean };
type Template = { name: string; language: string; status: string; components?: Record<string, unknown>[] };
type Broadcast = { id?: string; status?: string; recipientCount?: number; sentCount?: number; deliveredCount?: number; readCount?: number; failedCount?: number };
async function api(input: Record<string, unknown>, post = false) {
  const query = new URLSearchParams();
  if (!post) Object.entries(input).forEach(([key,value]) => query.set(key,String(value)));
  const response = await fetch(`/api/whatsapp${post ? '' : `?${query}`}`, post ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)} : {cache:'no-store'});
  const data = await response.json();
  if (!response.ok || data.error || data.success === false) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Broadcast request failed');
  return data;
}

export function ThreeStepBroadcastWizard({ isOpen, onClose, onSuccess }: {isOpen:boolean;onClose:()=>void;onSuccess?:()=>void}) {
  const {locale}=useThemeAndLocale();
  const loc=(ar:string,en:string)=>locale==='ar'?ar:en;
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [accountId,setAccountId]=useState('');
  const [templates,setTemplates]=useState<Template[]>([]);
  const [selected,setSelected]=useState('');
  const [name,setName]=useState('');
  const [phones,setPhones]=useState('');
  const [variables,setVariables]=useState('');
  const [broadcast,setBroadcast]=useState<Broadcast|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [creationUncertain,setCreationUncertain]=useState(false);
  const [recipientsAdded,setRecipientsAdded]=useState(false);
  const lock=useRef(false);
  const activeAccount=useRef(accountId);activeAccount.current=accountId;
  const intent=useRef<{signature:string;key:string}|null>(null);
  const account=accounts.find(item=>item.accountId===accountId);
  const writable=account?.isActive===true&&!account.needsReconnection;
  const template=templates.find(item=>`${item.name}:${item.language}`===selected);
  const recipients=[...new Set(phones.split(/[,\n]/).map(item=>item.trim()).filter(Boolean))];
  const inputClass='w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2 text-xs';
  const buttonClass='rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50';
  useEffect(()=>{if(!isOpen)return;let cancelled=false;api({action:'accounts'}).then(data=>{if(!cancelled)setAccounts(data.accounts||[])}).catch(err=>{if(!cancelled)setError(err.message)});return()=>{cancelled=true}},[isOpen]);
  useEffect(()=>{setTemplates([]);setSelected('');if(!accountId)return;let cancelled=false;api({action:'templates',accountId}).then(data=>{if(!cancelled)setTemplates((data.templates||[]).filter((item:Template)=>item.status==='APPROVED'&&!item.components?.some(part=>part.type==='HEADER'&&part.format&&part.format!=='TEXT')))}).catch(err=>{if(!cancelled)setError(err.message)});return()=>{cancelled=true}},[accountId]);
  const create=async()=>{
    if(lock.current||!writable||!template)return;
    if(!recipients.length||recipients.some(phone=>!/^\+?[1-9]\d{6,14}$/.test(phone))){setError(loc('أدخل أرقاماً دولية صحيحة، سطراً لكل مستلم.','Enter valid international numbers, one per recipient.'));return;}
    lock.current=true;setBusy(true);setError('');setNotice('');
    const payload={action:'create_broadcast',accountId,name,template:{name:template.name,language:template.language,variableMapping:Object.fromEntries(variables?variables.split('\n').map((value,index)=>[String(index+1),{field:'custom',customValue:value}]):[])}};
    const signature=JSON.stringify(payload);
    if(intent.current?.signature!==signature)intent.current={signature,key:crypto.randomUUID()};
    try{const data=await api({...payload,idempotencyKey:intent.current.key},true);if(!data.broadcast?.id)throw new Error('Provider returned no broadcast identifier.');setBroadcast(data.broadcast);try{sessionStorage.setItem('whatsapp-broadcast-draft',JSON.stringify({accountId,broadcast:data.broadcast,phones}));}catch{}setNotice(loc('تم إنشاء المسودة. راجعها قبل الإرسال.','Draft created. Review it before dispatch.'));intent.current=null;}
    catch(err){setCreationUncertain(true);setError(`${err instanceof Error?err.message:'Draft creation failed'} ${loc('راجع قائمة الحملات لدى المزود قبل إنشاء مسودة أخرى؛ النتيجة قد تكون غير معروفة.','Review the provider broadcast list before creating another draft; the outcome may be uncertain.')}`)}
    finally{lock.current=false;setBusy(false)}
  };
  useEffect(()=>{if(!isOpen)return;try{const saved=JSON.parse(sessionStorage.getItem('whatsapp-broadcast-draft')||'null');if(saved){setAccountId(saved.accountId);setBroadcast(saved.broadcast);setPhones(saved.phones||'');}}catch{}},[isOpen]);
  const addRecipients=async()=>{
    if(lock.current||!broadcast?.id||!writable)return;
    if(!recipients.length||recipients.some(phone=>!/^\+?[1-9]\d{6,14}$/.test(phone))){setError('Enter valid international numbers.');return;}
    lock.current=true;setBusy(true);setError('');
    try{await api({action:'add_broadcast_recipients',accountId,broadcastId:broadcast.id,phones:recipients},true);setRecipientsAdded(true);setNotice(loc('تمت إضافة الأرقام. راجع الحالة قبل الإرسال.','Recipient addition accepted. Review status before dispatch.'));await refresh();}
    catch(err){setError(err instanceof Error?err.message:'Recipient addition failed')}finally{lock.current=false;setBusy(false)}
  };
  const dispatch=async()=>{
    if(lock.current||!broadcast?.id||!writable||!recipientsAdded)return;
    lock.current=true;setBusy(true);setError('');
    try{const data=await api({action:'send_broadcast',accountId,broadcastId:broadcast.id},true);const updated={...broadcast,status:data.status||'unconfirmed'};setBroadcast(updated);try{sessionStorage.setItem('whatsapp-broadcast-draft',JSON.stringify({accountId,broadcast:updated,phones}));}catch{}setNotice(loc('قبل المزود طلب الإرسال؛ راجع الحالة والإيصالات.','Provider accepted dispatch; check status and receipts.'));onSuccess?.();}
    catch(err){setError(err instanceof Error?err.message:'Dispatch failed')}
    finally{lock.current=false;setBusy(false)}
  };
  const refresh=async()=>{if(!broadcast?.id)return;try{const data=await api({action:'get_broadcast',accountId,broadcastId:broadcast.id});if(activeAccount.current===accountId)setBroadcast(data.broadcast)}catch(err){setError(err instanceof Error?err.message:'Refresh failed')}};
  if(!isOpen)return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="WhatsApp broadcast" className="luxury-card max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto p-6">
    <div className="flex justify-between"><h2 className="text-sm font-bold">{loc('حملة واتساب','WhatsApp broadcast')}</h2><button disabled={busy} onClick={onClose} aria-label="Close">×</button></div>
    <p className="text-xs">{loc('استخدم حساباً متصلاً وقالباً معتمداً وأرقام مستلمين وافقوا على التواصل. بث SMS وInstagram غير متاح في هذه المرحلة.','Use a connected account, an approved template, and explicit recipients who opted in. SMS and Instagram broadcasts are unavailable in this phase.')}</p>
    {error&&<p role="alert" className="text-xs text-rose-600">{error}</p>}{notice&&<p role="status" className="text-xs text-emerald-600">{notice}</p>}
    <label className="block text-xs">{loc('حساب واتساب','WhatsApp account')}<select className={inputClass} value={accountId} disabled={busy||Boolean(broadcast)} onChange={e=>setAccountId(e.target.value)}><option value="">{loc('اختر حساباً','Select account')}</option>{accounts.map(item=><option key={item.accountId} value={item.accountId}>{item.displayName||item.username||item.accountId}</option>)}</select></label>
    {!broadcast?<form className="space-y-3" onSubmit={e=>{e.preventDefault();void create()}}>
      <label className="block text-xs">{loc('اسم الحملة','Broadcast name')}<input required className={inputClass} value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label>
      <label className="block text-xs">{loc('قالب نص معتمد','Approved text template')}<select required className={inputClass} value={selected} disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">{loc('اختر قالباً','Select template')}</option>{templates.map(item=><option key={`${item.name}:${item.language}`} value={`${item.name}:${item.language}`}>{item.name} · {item.language}</option>)}</select></label>
      <label className="block text-xs">{loc('أرقام المستلمين، سطر لكل رقم','Recipients: one international number per line')}<textarea required className={inputClass} value={phones} disabled={busy} onChange={e=>setPhones(e.target.value)}/></label>
      <label className="block text-xs">{loc('قيم متغيرات القالب، سطر لكل قيمة','Template variable values: one per line')}<textarea className={inputClass} value={variables} disabled={busy} onChange={e=>setVariables(e.target.value)}/></label>
      <p className="text-xs">{loc('الأرقام المحددة','Selected numbers')}: {recipients.length}. {loc('التكلفة الفعلية من المزود؛ الإرسال لا يضمن التسليم.','Actual charges come from the provider; sending does not guarantee delivery.')}</p>
      <button className={buttonClass} disabled={busy||!writable||!template||creationUncertain}>{loc('إنشاء مسودة للمراجعة','Create draft for review')}</button>
    </form>:<div className="space-y-3 text-xs"><p>{loc('معرف الحملة','Broadcast ID')}: {broadcast.id}</p><p>{loc('حالة المزود','Provider status')}: {broadcast.status||loc('غير مؤكدة','Unconfirmed')}</p>{(['recipientCount','sentCount','deliveredCount','readCount','failedCount'] as const).map(key=>typeof broadcast[key]==='number'?<p key={key}>{key}: {broadcast[key]}</p>:null)}<button className={buttonClass} disabled={busy} onClick={()=>void refresh()}>{loc('تحديث الحالة','Refresh status')}</button>{broadcast.status==='draft'&&<><label className="block text-xs">{loc('أرقام المستلمين','Recipient numbers')}<textarea className={inputClass} value={phones} disabled={busy||recipientsAdded} onChange={e=>setPhones(e.target.value)}/></label><button className={buttonClass} disabled={busy||!writable||recipientsAdded} onClick={()=>void addRecipients()}>{loc('إضافة الأرقام إلى المسودة','Add recipients to draft')}</button><button className={buttonClass} disabled={busy||!writable||!recipientsAdded} onClick={()=>void dispatch()}>{loc('إرسال الحملة للمستلمين المحددين','Dispatch to selected recipients')}</button></>}</div>}
  </section></div>;
}
