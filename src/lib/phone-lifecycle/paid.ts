import { SaasAllowanceService, type SpendingCapability } from '@/lib/saas/allowance';
import { PhoneOperationStore, type PhoneOperation } from './store';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { ZernioApiException } from '@/lib/zernio/client';
import { CustomerBillingService } from '@/lib/billing/service';
export function customerHold(operation:PhoneOperation) { return operation.reservations.find(reservation=>reservation.kind==='customer_wallet'); }
export async function replayCustomerOperation(organizationId:string,kind:string,intent:string,quoteId:string,binding:Record<string,any>) {
 if(typeof intent!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(intent)||typeof quoteId!=='string'||!quoteId)throw new TenantAccessError(400,'Review a current retail quote and use its original request identifier.');
 let operation;try{operation=await PhoneOperationStore.get(organizationId,`${kind}:${intent}`);}catch(error){if(error instanceof TenantAccessError&&error.status===404)return;throw error;}
 if(operation.input.quoteId!==quoteId||JSON.stringify(operation.input.replayBinding??operation.input.quoteBinding)!==JSON.stringify(binding))throw new TenantAccessError(409,'This request identifier belongs to a different reviewed operation.');
 if(operation.state==='confirmed'&&operation.result)return operation.result;
 throw new TenantAccessError(409,'This operation already has a durable intent. Reconcile its result; no second provider request was sent.');
}
export async function reserveCustomer(operation:PhoneOperation,quoteId:string,input:Record<string,any>) {
 let result;try{result=await CustomerBillingService.reserveQuote({organizationId:operation.organization_id,quoteId,operationKey:operation.operation_key,input});}catch(error){if(error instanceof TenantAccessError&&[400,402,403,404,409].includes(error.status))await PhoneOperationStore.save(operation,{state:'failed',result:{error:error.message,providerDispatched:false}});throw error;}
 if(result.replayed)throw new TenantAccessError(409,'This customer balance is already held. Reconcile the original action; no new provider dispatch was sent.');
 await PhoneOperationStore.save(operation,{reservations:[...operation.reservations,{kind:'customer_wallet',...result}]});return result;
}
export async function rejectBeforeDispatch(operation:PhoneOperation,reason:string,stage:string) {
 const evidence={providerDispatched:false,stage};
 for(const reservation of operation.reservations){const input={organizationId:operation.organization_id,reservationId:reservation.reservationId,reason,evidence};if(reservation.kind==='customer_wallet')await CustomerBillingService.release(input);else await SaasAllowanceService.release(input);}
 await PhoneOperationStore.save(operation,{state:'failed',result:{error:reason,providerDispatched:false}});
}
export function usdMinor(value:any) {if(typeof value!=='number'||!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100)))throw new TenantAccessError(503,'The provider cost is unknown.');return Math.ceil(value*100-1e-8);}
export async function reserve(operation:PhoneOperation,capability:SpendingCapability,quote?:{amountMinor:number;source:string},units=1) {
 const operationKey=SaasAllowanceService.operationKey([operation.organization_id,operation.operation_key,capability]);
 let result;try{result=quote?await SaasAllowanceService.reserve({organizationId:operation.organization_id,capability,operationKey,amountMinor:quote.amountMinor,currency:'USD',quoteSource:quote.source}):await SaasAllowanceService.reserveUnits({organizationId:operation.organization_id,capability,operationKey,units});}catch(error){const held=customerHold(operation);if(held)await CustomerBillingService.release({organizationId:operation.organization_id,reservationId:held.reservationId,reason:'Provider spending authorization failed before dispatch',evidence:{providerDispatched:false,stage:'provider_allowance'}});if(error instanceof TenantAccessError&&[400,403,409].includes(error.status)||held)await PhoneOperationStore.save(operation,{state:'failed',result:{error:error instanceof Error?error.message:'Provider spending authorization unavailable',providerDispatched:false}});throw error;}
 if(result.replayed)throw new TenantAccessError(409,'This allowance is already reserved. Reconcile the original action; no new dispatch was sent.');
 await PhoneOperationStore.save(operation,{reservations:[...operation.reservations,{capability,...result}]});return result;
}
export async function acquire(organizationId:string,profileId:string,kind:string,intent:string,input:Record<string,any>) {
 const op=await PhoneOperationStore.acquire(organizationId,profileId,kind,intent,input);
 if(op.replayed){if(op.state==='confirmed'&&op.result)return {operation:op,result:op.result};throw new TenantAccessError(409,'This action already has a durable intent. Refresh its result or reconcile; no second dispatch was sent.');}return {operation:op};
}
export async function dispatch(operation:PhoneOperation,send:()=>Promise<Record<string,any>>,validate:(result:Record<string,any>)=>string|undefined,finalize?:(result:Record<string,any>)=>Promise<Record<string,any>>):Promise<Record<string,any>> {
 await PhoneOperationStore.save(operation,{state:'dispatched'});
 try {const result=await send(),providerId=validate(result);await PhoneOperationStore.save(operation,{provider_id:providerId});const final=finalize?await finalize(result):result;const held=customerHold(operation);const output={...final,operationKey:operation.operation_key,...(held?{customerWallet:final.customerWallet??{reservationId:held.reservationId,amountMinor:held.amountMinor,state:'held'}}:{}),allowanceStatus:operation.reservations.some(r=>r.kind!=='customer_wallet')||final.allowance?.reservationId?'reserved_pending_provider_billing':'not_applicable'};await PhoneOperationStore.save(operation,{state:final.confirmed===false?'unknown':'confirmed',result:output});return output;}
 catch(error){const envelope=error instanceof ZernioApiException?error.envelope:null;const known=!operation.provider_id&&!envelope?.details?.reservationId&&envelope&&[400,401,403,404,405,422].includes(envelope.status);await PhoneOperationStore.save(operation,{state:known?'failed':'unknown',result:{error:error instanceof Error?error.message:'Provider outcome unknown',...(envelope?{providerStatus:envelope.status,providerCode:envelope.code,details:envelope.details}:{})}});
  // Only an explicit pre-acceptance rejection releases a reservation. Timeout/rate-limit ambiguity remains held.
  if(known)for(const r of operation.reservations){const input={organizationId:operation.organization_id,reservationId:r.reservationId,reason:'Provider rejected before acceptance',evidence:{providerStatus:envelope.status,providerCode:envelope.code??'request_rejected'}};if(r.kind==='customer_wallet')await CustomerBillingService.release(input);else await SaasAllowanceService.release(input);}
  throw error;
 }
}
