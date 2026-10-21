import type { User } from '@supabase/supabase-js';
import { TenantAccessError } from '@/lib/auth/tenant-access';
import { SESSION_MAX_AGE, type AuthSession } from '@/lib/auth/session';
import { createHash } from 'node:crypto';
import { saasDatabase, saasRpc } from './storage';
import { isPublicRegistrationEnabled } from '@/lib/auth/registration';

export async function throttleAuth(request: Request, action: string, email: string) {
  // Identity throttling is durable. Forwarded headers are not trusted as a unique client identity.
  const key = createHash('sha256').update(`${action}:${email}`).digest('hex');
  if (!await saasRpc<boolean>('saas_auth_throttle', { p_key: key, p_limit: action === 'login' ? 12 : 5 })) throw new TenantAccessError(429, 'Too many attempts. Try again in fifteen minutes.');
}
export async function issueUserSession(user: User, organizationId?: string): Promise<AuthSession> {
  if (!user.id || !user.email_confirmed_at) throw new TenantAccessError(403, 'Verify your email before entering a workspace.');
  const db = saasDatabase();
  let query = db.from('org_members').select('organization_id,role,organizations(id,name,slug,plan_key,status)').eq('user_id', user.id).order('created_at');
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data: memberships, error } = await query;
  if (error) throw new TenantAccessError(503, 'Workspace membership could not be loaded.');
  const membership = memberships?.find((m: any) => (Array.isArray(m.organizations) ? m.organizations[0] : m.organizations)?.status === 'active');
  if (!membership && !organizationId && !memberships?.length) {
    if (!isPublicRegistrationEnabled()) {
      // Load after session modules initialize; provider errors extend TenantAccessError.
      const { AuthProviderError } = await import('@/lib/auth/provider-errors');
      throw new AuthProviderError(403, 'Registration is coming soon. Existing accounts can still sign in.', 'registration_closed');
    }
    const org = await saasRpc<string>('saas_provision_signup', { p_user_id: user.id, p_name: user.user_metadata?.company_name || user.user_metadata?.full_name || 'My workspace' });
    if (!org || typeof org !== 'string') throw new TenantAccessError(503, 'Workspace recovery was not confirmed.');
    return issueUserSession(user, org);
  }
  if (!membership) throw new TenantAccessError(403, 'No available workspace membership.');
  const org = (Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations) as any;
  const now = Date.now();
  const persisted = await saasRpc<{ sessionId: string; securityVersion: number }>('saas_issue_session', { p_user_id: user.id, p_org: org.id, p_expires_at: new Date(now + SESSION_MAX_AGE * 1000).toISOString() });
  if (!persisted.sessionId || !Number.isInteger(persisted.securityVersion)) throw new TenantAccessError(503, 'Session persistence was not confirmed.');
  return { user: { id: user.id, fullName: user.user_metadata?.full_name || user.email || 'Member', email: user.email || '', role: membership.role === 'owner' ? 'owner' : 'member' }, tenant: { organizationId: org.id, organizationName: org.name, slug: org.slug, planKey: org.plan_key }, createdAt: now, expiresAt: now + SESSION_MAX_AGE * 1000, ...persisted };
}
export async function verifyCurrentSession(session: AuthSession) {
  const db = saasDatabase();
  if (!session.sessionId || !Number.isInteger(session.securityVersion)) throw new TenantAccessError(401, 'Sign in again to upgrade this session.');
  const [{ data: record, error: sessionError }, { data: security, error: securityError }, { data: identity, error: identityError }] = await Promise.all([
    db.from('saas_sessions').select('user_id,organization_id,expires_at,revoked_at').eq('id', session.sessionId).maybeSingle(),
    db.from('saas_user_security').select('version,disabled').eq('user_id', session.user.id).maybeSingle(),
    db.auth.admin.getUserById(session.user.id),
  ]);
  if (sessionError || securityError || identityError) throw new TenantAccessError(503, 'Session verification is unavailable.');
  if (!record || record.user_id !== session.user.id || record.organization_id !== session.tenant.organizationId || record.revoked_at || !Number.isFinite(Date.parse(record.expires_at)) || Date.parse(record.expires_at) <= Date.now() || !security || security.disabled || security.version !== session.securityVersion || !identity.user?.email_confirmed_at) throw new TenantAccessError(401, 'This session has expired or been revoked. Sign in again.');
}
