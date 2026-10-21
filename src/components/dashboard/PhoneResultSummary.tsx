type Data = Record<string, unknown>;

function secureLink(value: unknown) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

/** Show confirmed business facts; absence of a result never implies success. */
export function PhoneResultSummary({ result, ar }: { result: Data; ar: boolean }) {
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const item = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? { ...value as Data } : {};
  const number = item(result.phoneNumber), flow = item(result.flow), template = item(result.template), call = item(result.call), breakdown = item(result.breakdown);
  const status = result.status ?? number.status ?? flow.status ?? template.status ?? call.status;
  const statusLabels: Record<string, string> = { active:t('Active','نشط'), pending:t('Pending','قيد الانتظار'), pending_kyc:t('Identity verification required','مطلوب التحقق من الهوية'), confirmed:t('Confirmed','مؤكد'), failed:t('Failed','فشل'), unknown:t('Not yet confirmed','لم يتم التأكيد بعد'), approved:t('Approved','معتمد'), APPROVED:t('Approved','معتمد'), rejected:t('Rejected','مرفوض'), REJECTED:t('Rejected','مرفوض'), DRAFT:t('Draft','مسودة'), PUBLISHED:t('Published','منشور'), ended:t('Ended','انتهت'), submitted:t('Submitted for processing','تم تقديمه للمعالجة') };
  Object.assign(statusLabels, {kyc_required:t('Identity verification required','مطلوب التحقق من الهوية'),pending_payment:t('Payment setup required','مطلوب إعداد الدفع'),pending_regulatory:t('Regulatory review pending','بانتظار المراجعة التنظيمية'),provisioning:t('Preparing your number','جارٍ تجهيز الرقم'),verifying:t('Verification in progress','جارٍ التحقق'),suspended:t('Suspended','موقوف'),released:t('Released','تم التخلي عنه'),PENDING:t('Pending approval','بانتظار الموافقة'),PAUSED:t('Paused','متوقف مؤقتاً'),DISABLED:t('Disabled','معطل'),DEPRECATED:t('Retired','متوقف'),dialing:t('Dialing','جارٍ الاتصال'),in_progress:t('Call in progress','المكالمة جارية')});
  const fields: Array<[string, unknown]> = [
    [t('Status','الحالة'),typeof status === 'string' ? statusLabels[status] || status : undefined],
    [t('Confirmation','التأكيد'),typeof result.confirmed === 'boolean' ? result.confirmed ? t('Confirmed','مؤكد') : t('Not confirmed — review before retrying','غير مؤكد — راجع النتيجة قبل المحاولة مجدداً') : undefined],
    [t('Phone number','رقم الهاتف'),number.phoneNumber ?? number.number],
    [t('Name','الاسم'),flow.name ?? template.name],
    [t('Monthly price (USD)','السعر الشهري (دولار)'),typeof number.monthlyCents === 'number' ? number.monthlyCents / 100 : undefined],
    [t('Maximum estimated cost (USD)','أقصى تكلفة تقديرية (دولار)'),breakdown.billableCostUSD],
    [t('Maximum duration (seconds)','أقصى مدة (ثوانٍ)'),result.maxDurationSeconds],
    [t('From','من'),call.from], [t('To','إلى'),call.to],
    [t('Duration (seconds)','المدة (ثوانٍ)'),call.durationSeconds ?? call.duration],
    [t('Validation','الفحص'),typeof result.valid === 'boolean' ? result.valid ? t('Valid','صالح') : t('Needs corrections','يحتاج إلى تصحيح') : undefined],
    [t('Request','الطلب'),result.success === true && (result.messageId || result.callId || item(result.data).messageId) ? t('Accepted for processing — delivery is not confirmed','تم قبول الطلب للمعالجة — لم يتم تأكيد التسليم') : undefined],
    [t('Billing','الفوترة'),typeof result.settled === 'boolean' ? result.settled ? t('Settled','تمت التسوية') : t('Not yet settled','لم تتم التسوية بعد') : undefined],
    [t('Actual cost (USD)','التكلفة الفعلية (دولار)'),result.billableCostUSD ?? item(call.billing).billableCostUSD],
    [t('Messages submitted','الرسائل المقدمة'),result.submitted],
    [t('Messages delivered','الرسائل التي تم تسليمها'),result.delivered],
    [t('Messages failed','الرسائل التي فشلت'),result.failed],
  ];
  const lists = ['numbers','accounts','templates','flows','messages','responses','calls','validation_errors','data'].flatMap(key => Array.isArray(result[key]) ? [[key, result[key] as unknown[]] as const] : []);
  const listLabels: Record<string,string> = {numbers:t('Numbers','الأرقام'),accounts:t('Accounts','الحسابات'),templates:t('Templates','القوالب'),flows:t('Forms','النماذج'),messages:t('Messages','الرسائل'),responses:t('Responses','الردود'),data:t('Records','السجلات')};
  listLabels.calls=t('Call history','سجل المكالمات');listLabels.validation_errors=t('Corrections required','التصحيحات المطلوبة');
  const visible = fields.filter(([,value]) => typeof value === 'string' || typeof value === 'number');
  const capabilities = item(number.features);
  return <section aria-label={t('Action result','نتيجة الإجراء')} className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
    <h3 className="font-bold">{t('Action result','نتيجة الإجراء')}</h3>
    {visible.length > 0 && <dl className="grid gap-3 sm:grid-cols-2">{visible.map(([label,value])=><div key={label}><dt className="text-xs text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-words font-semibold">{String(value)}</dd></div>)}</dl>}
    {Object.keys(capabilities).length>0&&<div className="flex flex-wrap gap-3">{(['calls','sms','whatsapp'] as const).map(key=>typeof capabilities[key]==='boolean'?<p key={key} className="text-sm">{key==='calls'?t('Calls','المكالمات'):key==='sms'?'SMS':'WhatsApp'}: {capabilities[key]?t('Supported by this number','يدعمه هذا الرقم'):t('Not supported by this number','لا يدعمه هذا الرقم')}</p>:null)}</div>}
    {lists.map(([key,entries])=><div key={key}><h4 className="font-semibold">{listLabels[key]}: {entries.length}</h4>{entries.length===0&&<p className="text-sm">{t('No records returned.','لم يتم إرجاع سجلات.')}</p>}{entries.slice(0,50).map((entry,index)=>{const row=item(entry);const names:Record<string,string>={phoneNumber:t('Number','الرقم'),number:t('Number','الرقم'),displayName:t('Account','الحساب'),name:t('Name','الاسم'),text:t('Message','الرسالة'),body:t('Message','الرسالة'),message:t('Details','التفاصيل'),status:t('Status','الحالة'),createdAt:t('Date','التاريخ'),from:t('From','من'),to:t('To','إلى'),direction:t('Direction','الاتجاه'),duration:t('Duration (seconds)','المدة (ثوانٍ)'),durationSeconds:t('Duration (seconds)','المدة (ثوانٍ)'),billableCostUSD:t('Cost (USD)','التكلفة (دولار)'),monthlyCents:t('Monthly price (USD)','السعر الشهري (دولار)')};names.receivedAt=t('Received','وقت الاستلام');names.senderName=t('Sender','المرسل');names.field=t('Field','الحقل');names.path=t('Location','الموضع');names.error=t('Correction','التصحيح');if(typeof item(row.billing).billableCostUSD==='number')row.billableCostUSD=item(row.billing).billableCostUSD;const answers=Object.entries(item(row.data)).filter(([key,value])=>key!=='flow_token'&&(typeof value==='string'||typeof value==='number'||typeof value==='boolean'||Array.isArray(value)));const known=Object.keys(names).filter(field=>typeof row[field]==='string'||typeof row[field]==='number');return <article key={index} className="mt-2 space-y-1 border-t border-[var(--border-subtle)] pt-2 text-sm">{answers.map(([label,value])=><p key={label} className="break-words"><span className="text-[var(--text-secondary)]">{label}: </span>{Array.isArray(value)?value.filter(v=>['string','number','boolean'].includes(typeof v)).join(', '):typeof value==='boolean'?value?t('Yes','نعم'):t('No','لا'):String(value)}</p>)}{known.length?known.map(field=><p key={field} className="break-words"><span className="text-[var(--text-secondary)]">{names[field]}: </span>{field==='monthlyCents'?Number(row[field])/100:field==='status'?(statusLabels[String(row[field])]||String(row[field])):String(row[field])}</p>):answers.length?null:<p>{t('Record details are unavailable.','تفاصيل السجل غير متاحة.')}</p>}</article>;})}</div>)}
    {!visible.length&&!lists.length&&<p className="text-sm">{t('No confirmed details were returned. Review the account or number before repeating this action.','لم يتم إرجاع تفاصيل مؤكدة. راجع الحساب أو الرقم قبل تكرار الإجراء.')}</p>}
    {([['checkoutUrl',t('Review billing setup','مراجعة إعداد الفوترة')],['kycUrl',t('Complete identity verification','إكمال التحقق من الهوية')],['preview_url',t('Preview form','معاينة النموذج')]] as const).map(([key,label])=>{const href=secureLink(result[key]);return href?<a key={key} href={href} target="_blank" rel="noreferrer" className="block underline">{label}</a>:null;})}
  </section>;
}
