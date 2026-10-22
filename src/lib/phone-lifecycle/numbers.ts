import { provider, tenantProfile, inventory, ownedNumber, identifier, phone, invalid, malformed, profile, https } from './provider';
import { PhoneOperationStore } from './store';
import { acquire, reserve, dispatch, customerHold, reserveCustomer, replayCustomerOperation, rejectBeforeDispatch } from './paid';
import { SaasAllowanceService } from '@/lib/saas/allowance';
import { assertSubServiceAllowed } from '@/lib/zernio/policy-engine';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { CustomerBillingService } from '@/lib/billing/service';
import { reserveConnectionCapacity } from '@/lib/billing/connections';

function purchaseBinding(profileId:string,input:Record<string,any>) {
 if(!/^[A-Z]{2}$/.test(input.country)||!['local','mobile','national','toll_free'].includes(input.numberType))invalid('Review the country and number type.');
 if(input.phoneNumber)phone(input.phoneNumber);
 for(const field of ['connectWhatsapp','wantsSms','allowMultiple'])if(typeof input[field]!=='boolean')invalid(`${field} must be explicitly selected.`);
 if(typeof input.intent!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(input.intent))invalid('Use the original purchase request identifier.');
 if(input.numberType==='toll_free'&&input.connectWhatsapp)invalid('Toll-free numbers cannot connect WhatsApp.');
 return {profileId,country:input.country,numberType:input.numberType,phoneNumber:input.phoneNumber||null,connectWhatsapp:input.connectWhatsapp,wantsSms:input.wantsSms,allowMultiple:input.allowMultiple,purchaseIntentId:input.intent};
}
async function purchaseOffer(organizationId:string,input:Record<string,any>) {
 const catalog=await provider({path:'/phone-numbers/countries'});
 const offer=catalog.countries?.find((c:any)=>(c.code??c.country)===input.country)?.types?.find((t:any)=>t.numberType===input.numberType);
 if(!offer||!Number.isSafeInteger(offer.monthlyCents)||offer.monthlyCents<0)throw new TenantAccessError(409,'The monthly offer is unavailable. Review it again.');
 if(input.connectWhatsapp&&offer.whatsappAvailable!==true||input.wantsSms&&offer.smsAvailable!==true)invalid('This number type does not support the requested capability.');
 const regulated=offer.needsKyc===true||offer.fulfilment==='request';
 if(input.phoneNumber&&regulated)invalid('Regulated orders cannot select an exact phone number.');
 if(regulated&&offer.inStock===false&&offer.preOrderable!==true)throw new TenantAccessError(409,'This regulated number type is not currently orderable.');
 if(!regulated){const fresh=await PhoneNumbersLifecycle.offers(organizationId,input.country,input.numberType,input.wantsSms);if(!fresh.numbers?.length||input.phoneNumber&&!fresh.numbers.some((number:any)=>number.phoneNumber===input.phoneNumber))throw new TenantAccessError(409,'The selected number is no longer available. Refresh the offers.');}
 return offer;
}
async function bindCustomerRental(organizationId:string,operation:any,number:any) {
 const held=customerHold(operation);if(!held)return;
 if(!Number.isSafeInteger(number.monthlyCents)||number.monthlyCents<0)malformed('Provider rental cost is unavailable for reconciliation.');
 await CustomerBillingService.bindRental({organizationId,numberId:number._id,reservationId:held.reservationId,providerCostMinor:number.monthlyCents,monthlyRetailMinor:held.amountMinor,activationStatus:number.status,activatedAt:number.provisionedAt??undefined,providerReference:number._id,evidence:{providerNumberId:number._id,profileId:number.profileId,purchaseOperationKey:operation.operation_key,quotedProviderMonthlyMinor:operation.input.expectedMonthlyCents}});
 return {reservationId:held.reservationId,amountMinor:held.amountMinor,state:number.status==='active'?'settled':'held'};
}
export class PhoneNumbersLifecycle {
 static async list(organizationId:string) {return inventory(organizationId);}
 static async offers(organizationId:string,country?:string,numberType?:string,wantsSms:unknown=false) {
  await tenantProfile(organizationId);
  if(![true,false,'true','false',undefined].includes(wantsSms as any))invalid('Choose whether SMS support is required.');
  const requireSms=wantsSms===true||wantsSms==='true';
  const catalog=await provider({path:'/phone-numbers/countries'});
  if(!Array.isArray(catalog.countries))malformed();
  if(!country)return catalog;
  const countryOffer=catalog.countries.find((c:any)=>(c.code??c.country)===country);
  const selectedType=numberType??countryOffer?.types?.[0]?.numberType;
  if(!/^[A-Z]{2}$/.test(country)||!['local','mobile','national','toll_free'].includes(selectedType))invalid('Choose a country and number type.');
  const offer=countryOffer?.types?.find((t:any)=>t.numberType===selectedType);
  if(!offer)invalid('This country and number type are not offered.');
  if(requireSms&&offer.smsAvailable!==true)invalid('This country and number type do not offer SMS-capable numbers.');
  const regulated=offer.needsKyc===true||offer.fulfilment==='request';
  if(regulated&&offer.inStock===false&&offer.preOrderable!==true)return {httpStatus:catalog.httpStatus,country,numberType:selectedType,requireSms,numbers:[],countries:catalog.countries,availabilityMode:'out_of_stock',notice:'This country and number type are currently out of stock.'};
  // Regulated orders assign the number after identity review, not from an exact-number picker.
  if(regulated)return {httpStatus:catalog.httpStatus,country,numberType:selectedType,numbers:[],countries:catalog.countries,availabilityMode:'assigned_after_verification',notice:'The provider assigns this number after identity verification. Exact-number selection is unavailable; carrier sourcing may take additional time.'};
  const available=await provider({path:'/phone-numbers/available',query:{country,numberType:selectedType,...(requireSms?{sms:true}:{}),limit:20}});
  if(!Array.isArray(available.numbers))malformed();
  if(available.country!==undefined&&available.country!==country||available.numberType!==undefined&&available.numberType!==selectedType)malformed('Number availability does not match the selected country and type.');
  if(requireSms&&available.numbers.some((n:any)=>!Array.isArray(n.features)||!n.features.includes('sms')))malformed('The provider did not confirm SMS support for these numbers.');
  return {...available,country,numberType:selectedType,requireSms,countries:catalog.countries,...(!available.numbers.length?{availabilityMode:'out_of_stock',notice:'No numbers currently match this country, type and capability search. Refresh to check live availability.'}:{})};
 }
 static async detail(organizationId:string,numberId:string) {return {phoneNumber:await ownedNumber(organizationId,numberId),httpStatus:200};}
 static async quote(organizationId:string,input:Record<string,any>) {
  const profileId=await tenantProfile(organizationId),binding=purchaseBinding(profileId,input),offer=await purchaseOffer(organizationId,input);
  const quote=await CustomerBillingService.createQuote({organizationId,kind:'phone_rental',operationKey:`purchase:${input.intent}`,input:binding,providerCostMinor:offer.monthlyCents,quoteSource:'current provider country/type monthly rental; full activation month and monthly renewal on the first'});
  return {httpStatus:200,quote,monthlyRetailMinor:quote.amountMinor};
 }
 static async purchase(organizationId:string,input:Record<string,any>) {
  const profileId=await tenantProfile(organizationId),binding=purchaseBinding(profileId,input);
  const replay=await replayCustomerOperation(organizationId,'purchase',input.intent,input.quoteId,binding);if(replay)return replay;
  const offer=await purchaseOffer(organizationId,input);
  await CustomerBillingService.verifyQuote({organizationId,quoteId:input.quoteId,operationKey:`purchase:${input.intent}`,input:binding,providerCostMinor:offer.monthlyCents});
  const current=await inventory(organizationId),policy=await assertSubServiceAllowed(organizationId,'telephony');if(!Number.isInteger(policy.quotas?.maxPhoneNumbers)||current.numbers.filter((n:any)=>n.status!=='released').length>=policy.quotas.maxPhoneNumbers)throw new TenantAccessError(409,'The workspace phone number quota has been reached.');const capability=await SaasAllowanceService.assertCapability({organizationId,capability:'phone_purchase'});if(capability.enabled!==true)throw new TenantAccessError(403,'Phone purchasing needs an administrator spending allocation.');if(current.numbers.some((n:any)=>n.status!=='released')&&!input.allowMultiple)throw new TenantAccessError(409,'Confirm that the additional number and its monthly rental are intentional.');
  const payload={...binding,phoneNumber:binding.phoneNumber||undefined};
  const opened=await acquire(organizationId,profileId,'purchase',input.intent,{...payload,quoteBinding:binding,quoteId:input.quoteId,expectedMonthlyCents:offer.monthlyCents,baseline:current.numbers.map((n:any)=>n._id??n.id)});if(opened.result)return opened.result;const op=opened.operation;
  await reserveCustomer(op,input.quoteId,binding);
  await reserve(op,'phone_rental',{amountMinor:offer.monthlyCents,source:'provider country/type monthly rental quote'});
  if(input.connectWhatsapp)try{await reserveConnectionCapacity(organizationId,profileId,'whatsapp');}catch(error){await rejectBeforeDispatch(op,error instanceof Error?error.message:'Connection capacity is unavailable','connection_capacity');throw error;}
  return dispatch(op,()=>provider({method:'POST',path:'/phone-numbers/purchase',body:payload,idempotencyKey:input.intent}),r=>{if(r.httpStatus===202&&r.status==='kyc_required'){https(r.kycUrl);return undefined;}if(r.checkoutUrl){https(r.checkoutUrl);return undefined;}const id=r.numberId??r.phoneNumber?.id??r.phoneNumber?._id;if(typeof id!=='string'||profile(r.profileId??r.phoneNumber?.profileId)!==profileId)malformed('The purchased number profile is unverified. Reconcile the original intent.');return id;},async r=>{if(op.provider_id){const n=await ownedNumber(organizationId,op.provider_id);await PhoneOperationStore.rental(organizationId,n,n.status==='active'?'active':'pending',{purchaseResult:r});const customerWallet=await bindCustomerRental(organizationId,op,n);return {...r,confirmed:true,phoneNumber:n,customerWallet};}return {...r,confirmed:false};});
 }
 static async reconcile(organizationId:string,operationKey:string) {
  const op=await PhoneOperationStore.get(organizationId,operationKey);if(op.kind!=='purchase')throw new TenantAccessError(400,'Use the original purchase intent.');
  const list=await inventory(organizationId);if(list.profileId!==op.profile_id)throw new TenantAccessError(403,'Purchase profile no longer matches.');
  const matched=list.numbers.filter((n:any)=>!op.input.baseline.includes(n._id??n.id)&&n.country===op.input.country&&n.numberType===op.input.numberType&&(!op.input.phoneNumber||n.phoneNumber===op.input.phoneNumber));
  const n=op.provider_id?list.numbers.find((n:any)=>(n._id??n.id)===op.provider_id):matched.length===1?matched[0]:undefined;
  if(!n)return {operationKey,state:op.state,confirmed:false,httpStatus:202,message:'No unique allocation is confirmed. Keep the original reservation; do not buy another number.'};
  const verified=await ownedNumber(organizationId,n._id??n.id);
  const customerWallet=await bindCustomerRental(organizationId,op,verified);const result={operationKey,confirmed:true,phoneNumber:verified,httpStatus:200,allowanceStatus:'reserved_pending_provider_billing',customerWallet};await PhoneOperationStore.rental(organizationId,verified,verified.status==='active'?'active':'pending',{reconciled:true});await PhoneOperationStore.save(op,{state:'confirmed',provider_id:verified._id,result});return result;
 }
 static async reconcileRelease(organizationId:string,operationKey:string) {const op=await PhoneOperationStore.get(organizationId,operationKey);if(op.kind!=='release')invalid('Use the original release intent.');const n=await ownedNumber(organizationId,op.input.numberId);if(n.profileId!==op.profile_id)throw new TenantAccessError(403,'Release profile no longer matches.');if(n.status!=='released')return {operationKey,confirmed:false,httpStatus:202,message:'Provider release remains unconfirmed; no second release was sent.'};await PhoneOperationStore.rental(organizationId,n,'released',{canonicalStatus:'released',reconciled:true});await CustomerBillingService.releaseRental({organizationId,numberId:n._id,providerReference:n._id,evidence:{status:'released',profileId:n.profileId}});const result={operationKey,confirmed:true,phoneNumber:n,httpStatus:200,billingMessage:'Provider release contract stops future rental; final invoice remains provider-controlled.'};await PhoneOperationStore.save(op,{state:'confirmed',provider_id:n._id,result});return result;}
 static async release(organizationId:string,input:Record<string,any>) {
  if(input.confirmRelease!==true)invalid('Review the loss of this number and confirm release.');const n=await ownedNumber(organizationId,input.numberId);if(n.sipTrunkId)throw new TenantAccessError(409,'Detach the SIP trunk before releasing the number.');
  const opened=await acquire(organizationId,n.profileId,'release',input.intent,{numberId:n._id});if(opened.result)return opened.result;
  return dispatch(opened.operation,()=>provider({method:'DELETE',path:`/phone-numbers/${identifier(n._id)}`}),r=>{if(r.phoneNumber?.id!==n._id||r.phoneNumber?.status!=='released')malformed();return n._id;},async r=>{const verified=await ownedNumber(organizationId,n._id);if(verified.status!=='released')malformed('Release remains unconfirmed; refresh this number before repeating.');await PhoneOperationStore.rental(organizationId,verified,'released',{providerRelease:r,canonicalStatus:'released'});await CustomerBillingService.releaseRental({organizationId,numberId:verified._id,providerReference:verified._id,evidence:{status:'released',profileId:verified.profileId}});return {...r,confirmed:true,billingMessage:'Provider release is confirmed and future customer rental renewals are stopped.'};});
 }
}
