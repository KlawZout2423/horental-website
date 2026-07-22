import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Proxy — runs on the server BEFORE any page is rendered.
 *
 * Protects /admin routes: if the request has no auth_token cookie, the server
 * redirects to /login.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to /admin routes
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      // No token at all — redirect to login with the original URL as redirect param
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run proxy on /admin and its sub-paths
  matcher: ['/admin/:path*'],
};
