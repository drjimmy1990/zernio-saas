import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { createHash } from 'node:crypto';
export type PhoneOperation = { organization_id: string; operation_key: string; kind: string; profile_id: string; input: Record<string, any>; state: string; result?: Record<string, any>; provider_id?: string; reservations: any[]; replayed?: boolean };
function database() { const db=createSupabaseAdminClient(); if(!db || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new TenantAccessError(503,'Durable phone storage is unavailable.'); return db; }
function checked(error: any) { if(error) throw new TenantAccessError(503,'Phone operation could not be saved or verified. Reconcile the original intent.'); }
export const PhoneOperationStore = {
 async acquire(organizationId:string,profileId:string,kind:string,intent:string,input:Record<string,any>):Promise<PhoneOperation> {
  if(typeof intent!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(intent)) throw new TenantAccessError(400,'Use a stable operation intent of 8–128 letters, digits, underscores or hyphens.');
  const operationKey=`${kind}:${intent}`,fingerprint=createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(input).filter(([key])=>key!=='baseline')))).digest('hex');
  const {data,error}=await database().rpc('acquire_phone_lifecycle_operation',{p_org:organizationId,p_key:operationKey,p_kind:kind,p_profile:profileId,p_fingerprint:fingerprint,p_input:input}); checked(error);
  if(!data||data.organization_id!==organizationId||data.operation_key!==operationKey) throw new TenantAccessError(503,'Phone intent ownership is unavailable.'); return data;
 },
 async get(organizationId:string,operationKey:string):Promise<PhoneOperation> { const {data,error}=await database().from('phone_lifecycle_operations').select('*').eq('organization_id',organizationId).eq('operation_key',operationKey).maybeSingle();checked(error);if(!data)throw new TenantAccessError(404,'Phone intent not found.');return data; },
 async save(operation:PhoneOperation,patch:Partial<PhoneOperation>) { const {data,error}=await database().from('phone_lifecycle_operations').update({...patch,updated_at:new Date().toISOString()}).eq('organization_id',operation.organization_id).eq('operation_key',operation.operation_key).select('operation_key').maybeSingle();checked(error);if(!data)throw new TenantAccessError(503,'Phone intent was not saved.');Object.assign(operation,patch); },
 async rental(organizationId:string,number:any,state:'pending'|'active'|'released',evidence:Record<string,any>) { if(!Number.isSafeInteger(number.monthlyCents)||number.monthlyCents<0)throw new TenantAccessError(502,'Number rental price is unknown.');const {error}=await database().from('phone_rental_obligations').upsert({organization_id:organizationId,number_id:number._id??number.id,profile_id:typeof number.profileId==='string'?number.profileId:number.profileId._id,monthly_cents:number.monthlyCents,state,evidence,updated_at:new Date().toISOString()});checked(error); },
};
