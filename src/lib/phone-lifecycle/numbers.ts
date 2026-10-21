import { provider, tenantProfile, inventory, ownedNumber, identifier, phone, invalid, malformed, profile, https } from './provider';
import { PhoneOperationStore } from './store';
import { acquire, reserve, dispatch } from './paid';
import { SaasAllowanceService } from '@/lib/saas/allowance';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { TenantAccessError } from '@/lib/auth/tenant-access';
export class PhoneNumbersLifecycle {
 static async list(organizationId:string) {return inventory(organizationId);}
 static async offers(organizationId:string,country?:string,numberType?:string) {
  await tenantProfile(organizationId);
  const catalog=await provider({path:'/phone-numbers/countries'});
  if(!Array.isArray(catalog.countries))malformed();
  if(!country)return catalog;
  const selectedType=numberType??'local';
  if(!/^[A-Z]{2}$/.test(country)||!['local','mobile','national','toll_free'].includes(selectedType))invalid('Choose a country and number type.');
  const offer=catalog.countries.find((c:any)=>(c.code??c.country)===country)?.types?.find((t:any)=>t.numberType===selectedType);
  if(!offer)invalid('This country and number type are not offered.');
  // Regulated orders assign the number after identity review, not from an exact-number picker.
  if(offer.needsKyc===true||offer.fulfilment==='request')return {httpStatus:catalog.httpStatus,country,numberType:selectedType,numbers:[],countries:catalog.countries,availabilityMode:'assigned_after_verification',notice:'The provider assigns this number after identity verification. Exact-number selection is unavailable; carrier sourcing may take additional time.'};
  const available=await provider({path:'/phone-numbers/available',query:{country,numberType:selectedType,limit:20}});
  if(!Array.isArray(available.numbers))malformed();
  return {...available,countries:catalog.countries};
 }
 static async detail(organizationId:string,numberId:string) {return {phoneNumber:await ownedNumber(organizationId,numberId),httpStatus:200};}
 static async purchase(organizationId:string,input:Record<string,any>) {
  const profileId=await tenantProfile(organizationId);if(!/^[A-Z]{2}$/.test(input.country)||!['local','mobile','national','toll_free'].includes(input.numberType)||!Number.isSafeInteger(input.expectedMonthlyCents)||input.expectedMonthlyCents<0)invalid('Review the current country, type and monthly price.');
  if(input.phoneNumber)phone(input.phoneNumber);for(const field of ['connectWhatsapp','wantsSms','allowMultiple'])if(typeof input[field]!=='boolean')invalid(`${field} must be explicitly selected.`);
  if(input.numberType==='toll_free'&&input.connectWhatsapp)invalid('Toll-free numbers cannot connect WhatsApp.');
  const catalog=await provider({path:'/phone-numbers/countries'});const offer=catalog.countries?.find((c:any)=>(c.code??c.country)===input.country)?.types?.find((t:any)=>t.numberType===input.numberType);
  if(!offer||!Number.isSafeInteger(offer.monthlyCents)||offer.monthlyCents!==input.expectedMonthlyCents)throw new TenantAccessError(409,'The monthly offer changed. Review it again.');
  if(input.connectWhatsapp&&offer.whatsappAvailable!==true||input.wantsSms&&offer.smsAvailable!==true)invalid('This number type does not support the requested capability.');
  if(input.phoneNumber&&offer.needsKyc)invalid('Regulated orders cannot select an exact phone number.');
  const current=await inventory(organizationId),policy=await assertSubServiceAllowed(organizationId,'telephony');if(!Number.isInteger(policy.quotas?.maxPhoneNumbers)||current.numbers.filter((n:any)=>n.status!=='released').length>=policy.quotas.maxPhoneNumbers)throw new TenantAccessError(409,'The workspace phone number quota has been reached.');const capability=await SaasAllowanceService.assertCapability({organizationId,capability:'phone_purchase'});if(capability.enabled!==true)throw new TenantAccessError(403,'Phone purchasing needs an administrator spending allocation.');if(current.numbers.some((n:any)=>n.status!=='released')&&!input.allowMultiple)throw new TenantAccessError(409,'Confirm that the additional number and its monthly rental are intentional.');
  const payload={profileId,country:input.country,numberType:input.numberType,phoneNumber:input.phoneNumber||undefined,connectWhatsapp:input.connectWhatsapp,wantsSms:input.wantsSms,allowMultiple:input.allowMultiple,purchaseIntentId:input.intent};
  const opened=await acquire(organizationId,profileId,'purchase',input.intent,{...payload,expectedMonthlyCents:offer.monthlyCents,baseline:current.numbers.map((n:any)=>n._id??n.id)});if(opened.result)return opened.result;const op=opened.operation;
  await reserve(op,'phone_rental',{amountMinor:offer.monthlyCents,source:'provider country/type monthly rental quote'});
  return dispatch(op,()=>provider({method:'POST',path:'/phone-numbers/purchase',body:payload,idempotencyKey:input.intent}),r=>{if(r.httpStatus===202&&r.status==='kyc_required'){https(r.kycUrl);return undefined;}if(r.checkoutUrl){https(r.checkoutUrl);return undefined;}const id=r.numberId??r.phoneNumber?.id??r.phoneNumber?._id;if(typeof id!=='string'||profile(r.profileId??r.phoneNumber?.profileId)!==profileId)malformed('The purchased number profile is unverified. Reconcile the original intent.');return id;},async r=>{if(op.provider_id){const n=await ownedNumber(organizationId,op.provider_id);if(n.monthlyCents!==offer.monthlyCents)malformed('Number rental differs from the reviewed purchase.');await PhoneOperationStore.rental(organizationId,n,n.status==='active'?'active':'pending',{purchaseResult:r});return {...r,confirmed:true,phoneNumber:n};}return {...r,confirmed:false};});
 }
 static async reconcile(organizationId:string,operationKey:string) {
  const op=await PhoneOperationStore.get(organizationId,operationKey);if(op.kind!=='purchase')throw new TenantAccessError(400,'Use the original purchase intent.');
  const list=await inventory(organizationId);if(list.profileId!==op.profile_id)throw new TenantAccessError(403,'Purchase profile no longer matches.');
  const matched=list.numbers.filter((n:any)=>!op.input.baseline.includes(n._id??n.id)&&n.country===op.input.country&&n.numberType===op.input.numberType&&(!op.input.phoneNumber||n.phoneNumber===op.input.phoneNumber));
  const n=op.provider_id?list.numbers.find((n:any)=>(n._id??n.id)===op.provider_id):matched.length===1?matched[0]:undefined;
  if(!n)return {operationKey,state:op.state,confirmed:false,httpStatus:202,message:'No unique allocation is confirmed. Keep the original reservation; do not buy another number.'};
  const verified=await ownedNumber(organizationId,n._id??n.id);if(verified.monthlyCents!==op.input.expectedMonthlyCents)malformed('Number rental differs from the reviewed purchase.');
  const result={operationKey,confirmed:true,phoneNumber:verified,httpStatus:200,allowanceStatus:'reserved_pending_provider_billing'};await PhoneOperationStore.rental(organizationId,verified,verified.status==='active'?'active':'pending',{reconciled:true});await PhoneOperationStore.save(op,{state:'confirmed',provider_id:verified._id,result});return result;
 }
 static async reconcileRelease(organizationId:string,operationKey:string) {const op=await PhoneOperationStore.get(organizationId,operationKey);if(op.kind!=='release')invalid('Use the original release intent.');const n=await ownedNumber(organizationId,op.input.numberId);if(n.profileId!==op.profile_id)throw new TenantAccessError(403,'Release profile no longer matches.');if(n.status!=='released')return {operationKey,confirmed:false,httpStatus:202,message:'Provider release remains unconfirmed; no second release was sent.'};await PhoneOperationStore.rental(organizationId,n,'released',{canonicalStatus:'released',reconciled:true});const result={operationKey,confirmed:true,phoneNumber:n,httpStatus:200,billingMessage:'Provider release contract stops future rental; final invoice remains provider-controlled.'};await PhoneOperationStore.save(op,{state:'confirmed',provider_id:n._id,result});return result;}
 static async release(organizationId:string,input:Record<string,any>) {
  if(input.confirmRelease!==true)invalid('Review the loss of this number and confirm release.');const n=await ownedNumber(organizationId,input.numberId);if(n.sipTrunkId)throw new TenantAccessError(409,'Detach the SIP trunk before releasing the number.');
  const opened=await acquire(organizationId,n.profileId,'release',input.intent,{numberId:n._id});if(opened.result)return opened.result;
  return dispatch(opened.operation,()=>provider({method:'DELETE',path:`/phone-numbers/${identifier(n._id)}`}),r=>{if(r.phoneNumber?.id!==n._id||r.phoneNumber?.status!=='released')malformed();return n._id;},async r=>{const verified=await ownedNumber(organizationId,n._id);if(verified.status!=='released')malformed('Release remains unconfirmed; refresh this number before repeating.');await PhoneOperationStore.rental(organizationId,verified,'released',{providerRelease:r,canonicalStatus:'released'});return {...r,confirmed:true,billingMessage:'Provider release contract stops future rental; final invoice remains provider-controlled.'};});
 }
}
