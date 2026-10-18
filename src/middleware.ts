import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, decodeSession } from '@/lib/auth/session';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protect /dashboard and /admin routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = decodeSession(sessionCookie);

    // If no valid session, redirect to /login with redirect query param
    if (!session || !session.user) {
      const fullPath = `${pathname}${search}`;
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', fullPath);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based protection for /admin: only super_admin can enter
    if (pathname.startsWith('/admin') && session.user.role !== 'super_admin') {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/admin', '/admin/:path*'],
};
