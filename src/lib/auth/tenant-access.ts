import { getSessionFromCookieHeader, type AuthSession } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyCurrentSession } from '@/lib/saas/auth';
import { createHash } from 'node:crypto';
import { checkRequestOrigin } from '@/lib/auth/request-origin';

export type TenantRole = 'super_admin' | 'owner' | 'admin' | 'editor' | 'viewer';

export class TenantAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'TenantAccessError';
  }
}

/** Dashboard APIs only act on the workspace carried by a verified session. */
export function requireTenantSession(request: Request, requestedOrganizationId?: unknown): AuthSession {
  const session = getSessionFromCookieHeader(request.headers.get('cookie'));
  if (!session?.tenant?.organizationId) {
    throw new TenantAccessError(401, 'Sign in to access your workspace.');
  }

  if (requestedOrganizationId != null && requestedOrganizationId !== session.tenant.organizationId) {
    throw new TenantAccessError(403, 'You cannot access another workspace.');
  }

  // Session cookies are for this app; browser cross-origin mutations are refused.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = checkRequestOrigin(request);
    if (origin === 'misconfigured') {
      throw new TenantAccessError(503, 'Public application URL is not configured correctly.');
    }
    if (origin === 'cross-origin') {
      throw new TenantAccessError(403, 'Cross-origin workspace requests are not allowed.');
    }
  }

  return session;
}

/** Signed identity is checked against current membership on every protected request. */
export async function requireTenantAccess(request: Request, requestedOrganizationId?: unknown): Promise<{ session: AuthSession; role: TenantRole }> {
  const session = requireTenantSession(request, requestedOrganizationId);
  if (session.user.role === 'super_admin') {
    if (session.user.id !== 'usr_super_admin' || session.tenant.organizationId !== 'org_admin_platform') {
      throw new TenantAccessError(403, 'Invalid platform administrator identity.');
    }
    const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();const password=process.env.ADMIN_PASSWORD;
    if(!email||!password||['AdminPassword2026!','AnyPasswordForAdmin!'].includes(password)||session.user.email!==email||session.adminCredentialVersion!==createHash('sha256').update(`${email}:${password}`).digest('hex'))throw new TenantAccessError(401,'Administrator credentials changed. Sign in again.');
    return { session, role: 'super_admin' };
  }

  try {
    await verifyCurrentSession(session);
    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new TenantAccessError(503, 'Workspace membership verification is unavailable.');
    const { data: membership, error: membershipError } = await supabase.from('org_members')
      .select('user_id,organization_id,role').eq('user_id', session.user.id)
      .eq('organization_id', session.tenant.organizationId).maybeSingle();
    if (membershipError) throw new TenantAccessError(503, 'Could not verify workspace membership.');
    if (!membership || membership.user_id !== session.user.id || membership.organization_id !== session.tenant.organizationId ||
        !['owner', 'admin', 'editor', 'viewer'].includes(membership.role)) {
      throw new TenantAccessError(403, 'This account has no current workspace membership.');
    }
    const { data: organization, error: organizationError } = await supabase.from('organizations')
      .select('id,status').eq('id', session.tenant.organizationId).maybeSingle();
    if (organizationError) throw new TenantAccessError(503, 'Could not verify workspace availability.');
    if (!organization || organization.id !== session.tenant.organizationId || organization.status !== 'active') {
      throw new TenantAccessError(403, 'This workspace is unavailable.');
    }
    return { session, role: membership.role as TenantRole };
  } catch (error) {
    if (error instanceof TenantAccessError) throw error;
    throw new TenantAccessError(503, 'Workspace membership verification is unavailable.');
  }
}

export function canManageWorkspace(role: TenantRole): boolean {
  return ['super_admin', 'owner', 'admin'].includes(role);
}

export function requireWorkspaceRole(role: TenantRole, allowEditor = false): void {
  if (!canManageWorkspace(role) && !(allowEditor && role === 'editor')) {
    throw new TenantAccessError(403, 'Your workspace role does not permit this action.');
  }
}
