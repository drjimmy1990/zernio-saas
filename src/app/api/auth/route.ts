import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/auth/session';
import { getSessionFromCookieHeader } from '@/lib/auth/session';
import { sessionResponse } from '@/lib/saas/http';
import { createHash } from 'node:crypto';
import { requireTenantAccess, TenantAccessError } from '@/lib/auth/tenant-access';
import { issueUserSession, throttleAuth } from '@/lib/saas/auth';
import { saasDatabase, saasRpc } from '@/lib/saas/storage';
import { checkRequestOrigin } from '@/lib/auth/request-origin';

function originGuard(request: Request) {
  const origin = checkRequestOrigin(request);
  if (origin === 'misconfigured') throw new TenantAccessError(503, 'Public application URL is not configured correctly.');
  if (origin === 'cross-origin') throw new TenantAccessError(403, 'Cross-origin authentication requests are not allowed.');
}
export async function GET(request: Request) {
  try {
    if ((new URL(request.url).searchParams.get('action') || 'session') !== 'session') return NextResponse.json({ error: 'Use POST to sign out.' }, { status: 405 });
    const { session, role } = await requireTenantAccess(request); return NextResponse.json({ authenticated: true, session, role });
  } catch (error) {
    const status = error instanceof TenantAccessError ? error.status : 503;
    return NextResponse.json({ authenticated: false, session: null, error: status === 503 ? 'Session verification is unavailable.' : undefined }, { status: status === 503 ? 503 : 200 });
  }
}
export async function POST(request: Request) {
  try {
    originGuard(request);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TenantAccessError(400, 'Expected a JSON object.');
    const action = body.action;
    if (action === 'logout' || action === 'logout_all') {
      const session=action==='logout_all'?(await requireTenantAccess(request)).session:getSessionFromCookieHeader(request.headers.get('cookie'));
      if (session?.user.role !== 'super_admin'&&session?.sessionId) await saasRpc('saas_revoke_sessions', { p_user_id: session.user.id, p_session_id: action === 'logout_all' ? null : session.sessionId });
      const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 }); return response;
    }
    if (!['login','signup','recover','resend','complete_recovery','verify_email'].includes(action)) throw new TenantAccessError(400, 'Unsupported authentication action.');
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase(); const adminPassword = process.env.ADMIN_PASSWORD;
    if (action === 'login' && adminEmail && email === adminEmail && adminPassword && !['AdminPassword2026!', 'AnyPasswordForAdmin!'].includes(adminPassword)) {
      await throttleAuth(request, action, email);
      if (password !== adminPassword) throw new TenantAccessError(401, 'Invalid email or password.');
      const now = Date.now(); return sessionResponse({ user: { id: 'usr_super_admin', fullName: 'Platform administrator', email, role: 'super_admin' }, tenant: { organizationId: 'org_admin_platform', organizationName: 'Asra3', slug: 'admin', planKey: 'enterprise' }, createdAt: now, expiresAt: now + SESSION_MAX_AGE * 1000,adminCredentialVersion:createHash('sha256').update(`${adminEmail}:${adminPassword}`).digest('hex') });
    }
    const db = saasDatabase();
    if (action === 'complete_recovery' || action === 'verify_email') {
      if (typeof body.accessToken !== 'string' || !body.accessToken || body.accessToken.length > 10000) throw new TenantAccessError(400, 'Open a valid authentication email link.');
      const { data, error } = await db.auth.getUser(body.accessToken);
      if (error || !data.user?.id || !data.user.email_confirmed_at) throw new TenantAccessError(401, 'This email link is invalid or expired. Request a new link.');
      const { data: security, error: securityError } = await db.from('saas_user_security').select('disabled,revoked_before').eq('user_id',data.user.id).maybeSingle();
      if(securityError) throw new TenantAccessError(503,'Recovery security verification is unavailable.');
      if(security?.disabled) throw new TenantAccessError(403,'This account is disabled.');
      if(security?.revoked_before) {
        let issuedAt:number;try {issuedAt=Number(JSON.parse(Buffer.from(body.accessToken.split('.')[1],'base64url').toString('utf8')).iat)*1000;}catch{issuedAt=0;}
        if(!Number.isFinite(issuedAt)||issuedAt<=Date.parse(security.revoked_before))throw new TenantAccessError(401,'This authentication link was revoked. Request a new email.');
      }
      await throttleAuth(request, action, data.user.email || data.user.id);
      if (action === 'complete_recovery') {
        if (password.length < 10 || password.length > 200) throw new TenantAccessError(400, 'Use a password between 10 and 200 characters.');
        await saasRpc('saas_recover_access', { p_user_id: data.user.id });
        const { error: updateError } = await db.auth.admin.updateUserById(data.user.id, { password });
        if (updateError) throw new TenantAccessError(503, 'Password change was not confirmed.');
        await saasRpc('saas_recover_access', { p_user_id: data.user.id });
        return NextResponse.json({ ok: true, message: 'Password changed. Sign in again.' });
      }
      return sessionResponse(await issueUserSession(data.user));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new TenantAccessError(400, 'Enter a valid email address.');
    await throttleAuth(request, action, email);
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const redirectTo = `${configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin}/recovery`;
    if (action === 'recover' || action === 'resend') {
      const result = action === 'recover' ? await db.auth.resetPasswordForEmail(email, { redirectTo }) : await db.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo } });
      if (result.error && result.error.status && result.error.status >= 500) throw new TenantAccessError(503, 'Authentication email service is unavailable.');
      return NextResponse.json({ ok: true, message: 'If the account is eligible, an email has been sent.' });
    }
    if (password.length < (action === 'signup' ? 10 : 1) || password.length > 200) throw new TenantAccessError(400, 'Use a password between 10 and 200 characters.');
    if (action === 'signup') {
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 160) : '';
      const companyName = typeof body.companyName === 'string' ? body.companyName.trim().slice(0, 160) : 'My workspace';
      if (!fullName) throw new TenantAccessError(400, 'Enter your name.');
      const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { full_name: fullName, company_name: companyName } } });
      if (error) throw new TenantAccessError(error.status && error.status >= 500 ? 503 : 400, 'Registration could not be confirmed. Sign in or request verification if the account exists.');
      if (data.user?.email_confirmed_at) throw new TenantAccessError(503, 'Email confirmation must be enabled before accepting new registrations. Contact support.');
      return NextResponse.json({ ok: true, verificationRequired: true, message: 'Check your email to verify your account, then sign in.' });
    }
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error || !data.user?.id) throw new TenantAccessError(401, 'Invalid email or password. Verify your email before signing in.');
    return sessionResponse(await issueUserSession(data.user));
  } catch (error) {
    return NextResponse.json({ error: error instanceof TenantAccessError ? error.message : 'Authentication could not be completed.' }, { status: error instanceof TenantAccessError ? error.status : 503 });
  }
}
