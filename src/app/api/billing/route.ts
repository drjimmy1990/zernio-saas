import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { saasDatabase } from '@/lib/saas/storage';
import { CustomerBillingService } from '@/lib/billing/service';
import { BillingWorkspaceService } from '@/lib/billing/workspace';

const headers={'Cache-Control':'private, no-store'};
function failure(error:unknown){return NextResponse.json({error:error instanceof TenantAccessError?error.message:'Billing could not be confirmed. Refresh and reconcile the original reference.'},{status:error instanceof TenantAccessError?error.status:503,headers});}
async function scope(request:Request,target:unknown){
  const {session,role}=await requireTenantAccess(request);requireWorkspaceRole(role);
  let org=session.tenant.organizationId;let tenants:{organizationId:string;organizationName:string}[]=[];
  if(role==='super_admin'){
    if(request.method==='POST'&&(typeof target!=='string'||!target))throw new TenantAccessError(400,'Select the customer workspace explicitly before changing billing.');
    const {data,error}=await saasDatabase().from('organizations').select('id,name').eq('status','active').order('name').limit(500);
    if(error)throw new TenantAccessError(503,'Customer workspaces could not be verified.');
    tenants=(data??[]).map(r=>({organizationId:r.id,organizationName:r.name}));org=typeof target==='string'?target:tenants[0]?.organizationId;
    if(!org||!tenants.some(t=>t.organizationId===org))throw new TenantAccessError(400,'Select an active customer workspace.');
  }else if(target!=null&&target!==org)throw new TenantAccessError(403,'You cannot access another workspace.');
  return {org,role,tenants,actorId:session.user.id};
}
export async function GET(request:Request){try{const s=await scope(request,new URL(request.url).searchParams.get('organizationId')??undefined);return NextResponse.json(await BillingWorkspaceService.snapshot(s.org,s.role,s.tenants),{headers});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
  const body=await request.json().catch(()=>null);if(!body||typeof body!=='object'||Array.isArray(body))throw new TenantAccessError(400,'Use a JSON object.');
  const s=await scope(request,body.organizationId);
  if(['checkout','topup','payment','crypto'].includes(body.action))throw new TenantAccessError(501,'Payment collection is coming soon.');
  if(body.action==='credit'||body.action==='refund'){
    if(s.role!=='super_admin')throw new TenantAccessError(403,'Only the platform administrator can confirm payments or refunds.');
    const result=body.action==='credit'?await CustomerBillingService.credit({...body,organizationId:s.org,actorId:s.actorId}):await CustomerBillingService.refund({...body,organizationId:s.org,actorId:s.actorId});
    return NextResponse.json({[body.action==='credit'?'credited':'refunded']:true,result},{headers});
  }
  if(body.action==='subscribe')return NextResponse.json({subscription:await BillingWorkspaceService.subscribe(s.org,s.actorId,body.extraAccounts,body.termsAccepted)},{headers});
  if(body.action==='cancel_subscription')return NextResponse.json(await BillingWorkspaceService.cancelSubscription(s.org,s.actorId,body.confirmed),{headers});
  if(body.action==='renew')return NextResponse.json(await BillingWorkspaceService.renew(s.org),{headers});
  throw new TenantAccessError(400,'Unknown billing action.');
}catch(e){return failure(e);}}
