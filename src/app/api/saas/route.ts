import { NextResponse } from 'next/server';
import { requireTenantAccess, requireWorkspaceRole, TenantAccessError } from '@/lib/auth/tenant-access';
import { SaasWorkspaceService } from '@/lib/saas/workspaces';
import { SaasApiKeyService } from '@/lib/saas/api-keys';
import { SaasAllowanceService, type SpendingCapability } from '@/lib/saas/allowance';
import { issueUserSession } from '@/lib/saas/auth';
import { saasDatabase, saasRpc } from '@/lib/saas/storage';
import { sessionResponse } from '@/lib/saas/http';
import { SaasAdminService } from '@/lib/saas/admin';

function failure(error: unknown) { return NextResponse.json({ error: error instanceof TenantAccessError ? error.message : 'Workspace change was not confirmed. Reload settings before retrying.' }, { status: error instanceof TenantAccessError ? error.status : 503 }); }
export async function GET(request: Request) {
  try {
    const { session, role } = await requireTenantAccess(request);
    if(role==='super_admin') {
      const targets=await SaasAdminService.snapshot();const target=new URL(request.url).searchParams.get('organizationId');
      if(!target)return NextResponse.json({role,tenants:targets.tenants,customerPayments:'coming_soon'});
      if(!targets.tenants.some(t=>t.organizationId===target))throw new TenantAccessError(404,'Unknown workspace.');
      const db=saasDatabase();const [allowance,capabilities,reservations]=await Promise.all([db.from('saas_allowances').select('*').eq('organization_id',target).maybeSingle(),db.from('saas_spending_limits').select('*').eq('organization_id',target),db.from('saas_allowance_reservations').select('*').eq('organization_id',target).eq('state','reserved').limit(100)]);
      if(allowance.error||capabilities.error||reservations.error)throw new TenantAccessError(503,'Provider spending configuration is unavailable.');
      return NextResponse.json({role,organizationId:target,tenants:targets.tenants,allowance:allowance.data||{currency:'USD',available_minor:0,reserved_minor:0,spent_minor:0,overrun_minor:0},capabilities:capabilities.data,reservations:reservations.data,customerPayments:'coming_soon'});
    }
    return NextResponse.json(await SaasWorkspaceService.snapshot({ organizationId: session.tenant.organizationId, userId: session.user.id, role }));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const { session, role } = await requireTenantAccess(request);
    const organizationId = session.tenant.organizationId; const actorId = session.user.id;
    if (['checkout','topup','upgrade','payment'].includes(body.action)) throw new TenantAccessError(501, 'Customer payment collection is Coming soon.');
    if (body.action === 'switch' || body.action === 'accept_invitation') {
      if (role === 'super_admin') throw new TenantAccessError(403, 'Use the administrator workspace.');
      const { data, error } = await saasDatabase().auth.admin.getUserById(actorId);
      if (error || !data.user?.email_confirmed_at) throw new TenantAccessError(503, 'Verified identity could not be loaded.');
      let target = body.organizationId;
      if (body.action === 'accept_invitation') target = (await SaasWorkspaceService.accept({ userId: actorId, email: data.user.email || '', token: body.token })).organizationId;
      return sessionResponse(await issueUserSession(data.user, target));
    }
    if (body.organizationId != null && body.organizationId !== organizationId && role !== 'super_admin') throw new TenantAccessError(403, 'You cannot change another workspace.');
    if (body.action === 'revoke_session') { if(typeof body.sessionId!=='string'||!body.sessionId)throw new TenantAccessError(400,'Select a session to revoke.');await saasRpc('saas_revoke_sessions', { p_user_id: actorId, p_session_id: body.sessionId }); return NextResponse.json({ ok: true }); }
    requireWorkspaceRole(role);
    let result: unknown;
    if (body.action === 'invite') result = await SaasWorkspaceService.invite({ organizationId, actorId, email: body.email, role: body.role });
    else if (body.action === 'revoke_invitation') result = await SaasWorkspaceService.revokeInvitation({ organizationId, actorId, invitationId: body.invitationId });
    else if (body.action === 'change_member' || body.action === 'remove_member') {if(role!=='owner')throw new TenantAccessError(403,'Only a workspace owner can change membership roles.');if(body.action==='change_member'&&!['owner','admin','editor','viewer'].includes(body.role))throw new TenantAccessError(400,'Select a valid member role.');result = await SaasWorkspaceService.changeMember({ organizationId, actorId, userId: body.userId, role: body.action === 'remove_member' ? undefined : body.role });}
    else if (body.action === 'create_key') result = await SaasApiKeyService.create({ organizationId, actorId, name: body.name, scopes: body.scopes, expiresAt: body.expiresAt });
    else if (body.action === 'revoke_key') result = await SaasApiKeyService.revoke({ organizationId, actorId, keyId: body.keyId });
    else if (['grant_allowance','configure_spending','settle_allowance','release_allowance'].includes(body.action)) {
      if (role !== 'super_admin') throw new TenantAccessError(403, 'Only the platform administrator can allocate provider spending.');
      const target = body.organizationId;
      if (!target || target === 'org_admin_platform') throw new TenantAccessError(400, 'Select a customer workspace.');
      if(body.action==='grant_allowance')result=await SaasAllowanceService.grant({organizationId:target,actorId,amountMinor:body.amountMinor,operationKey:body.operationKey,reason:body.reason});
      else if(body.action==='settle_allowance')result=await SaasAllowanceService.settle({organizationId:target,reservationId:body.reservationId,actualAmountMinor:body.actualAmountMinor,providerReference:body.providerReference,evidence:body.evidence});
      else if(body.action==='release_allowance')result=await SaasAllowanceService.release({organizationId:target,reservationId:body.reservationId,reason:body.reason,evidence:body.evidence});
      else {if(typeof body.enabled!=='boolean')throw new TenantAccessError(400,'Explicit spending approval is required.');result=await saasRpc('saas_configure_spending',{p_organization_id:target,p_actor_id:actorId,p_capability:body.capability as SpendingCapability,p_enabled:body.enabled,p_unit_ceiling_minor:body.unitCeilingMinor??null,p_max_units:body.maxUnitsPerOperation??null,p_reason:body.reason});}
    } else throw new TenantAccessError(400, 'Unknown workspace action.');
    return NextResponse.json({ ok: true, result });
  } catch (error) { return failure(error); }
}
