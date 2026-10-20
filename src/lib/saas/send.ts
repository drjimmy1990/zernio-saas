import { SaasAllowanceService } from './allowance';
import { ZernioApiException } from '@/lib/zernio/client';

export async function reservedWhatsAppSend(params: {organizationId:string;accountId:string;resource:string;idempotencyKey?:string;fingerprint:unknown[]},dispatch:()=>Promise<Record<string,unknown>&{httpStatus:number}>) {
 const spending=await SaasAllowanceService.reserveUnits({organizationId:params.organizationId,capability:'whatsapp_send',operationKey:SaasAllowanceService.operationKey([params.organizationId,'whatsapp_send',params.accountId,params.resource,params.idempotencyKey]),intentFingerprint:SaasAllowanceService.operationKey(params.fingerprint),units:1});
 if(spending.replayed)throw new ZernioApiException({status:409,code:'spending_operation_pending',error:'This send already has an allowance reservation. Review the existing provider operation before another send.',details:{reservationId:spending.reservationId,state:spending.state}});
 try{return {...await dispatch(),allowance:{...spending,outcome:'pending_reconciliation',message:'Provider cost is not yet confirmed. The allocation remains reserved.'}};}
 catch(error){if(error instanceof ZernioApiException)error.envelope.details={...error.envelope.details,reservationId:spending.reservationId,allowanceState:'reserved',spendingOutcome:'pending_reconciliation'};throw error;}
}
