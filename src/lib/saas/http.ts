import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME,SESSION_MAX_AGE,encodeSession,type AuthSession } from '@/lib/auth/session';
export function sessionResponse(session: AuthSession) {
 const response=NextResponse.json({ok:true,user:session.user,tenant:session.tenant,redirectTo:session.user.role==='super_admin'?'/admin':`/dashboard?org=${encodeURIComponent(session.tenant.organizationId)}`});
 response.cookies.set(SESSION_COOKIE_NAME,encodeSession(session),{path:'/',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:SESSION_MAX_AGE});return response;
}
