import { randomUUID } from 'node:crypto';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { saasDatabase } from '@/lib/saas/storage';
import { zernioClient } from '@/lib/zernio/client';
import { BillingWorkspaceService } from './workspace';

/** One unresolved commercial connection at a time; uncertain OAuth never silently frees capacity. */
export async function reserveConnectionCapacity(org:string,profileId:string,platform:string,continuation=false) {
  const subscription=await BillingWorkspaceService.subscription(org);
  if(!subscription)return; // Explicit private-beta policies precede commercial enrollment.
  await BillingWorkspaceService.assertSubscription(org);
  if(subscription.status!=='active')throw new TenantAccessError(402,'Renew the prepaid subscription before adding connections.');
  const {data}=await zernioClient.request<{accounts?:Array<{_id:string;platform:string;profileId:string|{_id?:string}}>}>({method:'GET',path:'/accounts',query:{profileId}});
  if(!Array.isArray(data.accounts)||data.accounts.some(a=>(typeof a.profileId==='string'?a.profileId:a.profileId?._id)!==profileId||!a._id))throw new TenantAccessError(503,'Current connected accounts could not be verified.');
  const ids=data.accounts.filter(a=>!['sms','phone'].includes(a.platform)).map(a=>a._id);
  const result=await saasDatabase().rpc('billing_connection_capacity',{p_org:org,p_platform:platform,p_account_ids:ids,p_limit:2+subscription.extraAccounts,p_continuation:continuation,p_reference:randomUUID()});
  if(result.error||result.data?.reserved!==true)throw new TenantAccessError(409,'Connection capacity is full or an earlier connection is unresolved. Finish that connection or ask the administrator to reconcile it before starting another.');
}
