import { randomBytes, createHash } from 'node:crypto';
import { TenantAccessError, type TenantRole } from '@/lib/auth/tenant-access';
import { saasDatabase, saasRpc } from './storage';

export class SaasWorkspaceService {
  static async snapshot(params: { organizationId: string; userId: string; role: TenantRole }) {
    const db = saasDatabase();
    const manager = ['owner','admin','super_admin'].includes(params.role);
    const reads = await Promise.all([
      db.from('org_members').select('organization_id,role,organizations(id,name,slug,plan_key,status)').eq('user_id', params.userId),
      db.from('org_members').select('user_id,role,created_at').eq('organization_id', params.organizationId).order('created_at').limit(200),
      manager ? db.from('saas_invitations').select('id,email,role,expires_at,accepted_at,revoked_at').eq('organization_id', params.organizationId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      manager ? db.from('saas_api_keys').select('id,name,prefix,scopes,created_at,expires_at,revoked_at').eq('organization_id', params.organizationId).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
      db.from('saas_allowances').select('currency,available_minor,reserved_minor,spent_minor,overrun_minor').eq('organization_id', params.organizationId).maybeSingle(),
      db.from('saas_spending_limits').select('capability,enabled,unit_ceiling_minor,max_units_per_operation').eq('organization_id', params.organizationId),
      manager ? db.from('saas_allowance_reservations').select('id,capability,operation_key,amount_minor,quote_source,state,actual_minor,provider_reference,created_at').eq('organization_id', params.organizationId).eq('state', 'reserved').order('created_at').limit(100) : Promise.resolve({ data: [], error: null }),
      db.from('saas_sessions').select('id,created_at,expires_at,revoked_at,organization_id').eq('user_id', params.userId).is('revoked_at', null).order('created_at', { ascending: false }).limit(100),
    ]);
    if (reads.some(r => r.error)) throw new TenantAccessError(503, 'Workspace settings could not be loaded.');
    const [workspaces,members,invitations,keys,allowance,capabilities,reservations,sessions] = reads.map(r => r.data);
    const identities=await Promise.all((members as any[]||[]).map(async m=>{const identity=await db.auth.admin.getUserById(m.user_id);if(identity.error)throw new TenantAccessError(503,'Team identities could not be loaded.');return {...m,displayName:identity.data.user?.user_metadata?.full_name||identity.data.user?.email||m.user_id,email:identity.data.user?.email};}));
    return { organizationId: params.organizationId, role: params.role, workspaces, members:identities, invitations, keys, allowance: allowance || { currency: 'USD', available_minor: 0, reserved_minor: 0, spent_minor: 0 }, capabilities, reservations, sessions, customerPayments: 'coming_soon', legacyKeys: 'retired', observedAt: new Date().toISOString() };
  }
  static async invite(params: { organizationId: string; actorId: string; email: string; role: 'admin' | 'editor' | 'viewer' }) {
    if(typeof params.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email)||params.email.length>254||!['admin','editor','viewer'].includes(params.role))throw new TenantAccessError(400,'Provide a valid invited email and role.');
    const token = randomBytes(32).toString('hex');
    const invitation = await saasRpc('saas_invite_member', { p_organization_id: params.organizationId, p_actor_id: params.actorId, p_email: params.email, p_role: params.role, p_hash: createHash('sha256').update(token).digest('hex') });
    return { invitation, token, message: 'Share this invitation privately with its recipient. They must sign in with the verified invited email.' };
  }
  static async accept(params: { userId: string; email: string; token: string }) {
    if (!/^[a-f0-9]{64}$/.test(params.token)) throw new TenantAccessError(400, 'Invalid invitation.');
    return { organizationId: await saasRpc<string>('saas_accept_invitation', { p_user: params.userId, p_email: params.email, p_token_hash: createHash('sha256').update(params.token).digest('hex') }) };
  }
  static async changeMember(params: { organizationId: string; actorId: string; userId: string; role?: 'owner' | 'admin' | 'editor' | 'viewer' }) {
    return saasRpc('saas_change_member', { p_org: params.organizationId, p_actor: params.actorId, p_user: params.userId, p_role: params.role ?? null });
  }
  static async revokeInvitation(params: { organizationId: string; actorId: string; invitationId: string }) {
    return saasRpc('saas_revoke_invitation', { p_organization_id: params.organizationId, p_actor_id: params.actorId, p_invitation_id: params.invitationId });
  }
}
