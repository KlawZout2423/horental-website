import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — runs on the server BEFORE any page is rendered.
 *
 * Protects /admin routes: if the request has no auth_token cookie, the server
 * never sends the admin page HTML/JS. The redirect happens at the CDN/edge level.
 *
 * This replaces the client-side useEffect guard in admin/page.tsx, which only
 * ran after the page had already been delivered to the browser.
 */
export function middleware(req: NextRequest) {
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

    // Token exists — let the page load.
    // The page itself still checks user.role === 'admin' as a second layer of defence.
    // Role verification happens in the admin page's own useEffect guard.
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on /admin and its sub-paths
  matcher: ['/admin/:path*'],
};
