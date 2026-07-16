import { NextRequest, NextResponse } from 'next/server';

const BACKEND_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
    : process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000/graphql'
      : 'https://ho-rentals-backend.vercel.app/graphql';

/**
 * POST /api/graphql
 *
 * A transparent GraphQL proxy. It:
 * 1. Reads the HttpOnly auth_token cookie (inaccessible to browser JS)
 * 2. Attaches it as an Authorization: Bearer header to the backend request
 * 3. Forwards the GraphQL query/variables to the real backend
 * 4. Returns the response to the client
 *
 * This keeps the JWT completely out of client-side JavaScript, eliminating
 * the XSS vulnerability of storing tokens in localStorage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Read the HttpOnly cookie server-side — JS on the client CANNOT do this
    const token = req.cookies.get('auth_token')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const backendRes = await fetch(BACKEND_GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Proxy error contacting GraphQL backend.';
    console.error('[/api/graphql proxy] Error:', message);
    return NextResponse.json(
      { errors: [{ message: 'Service temporarily unavailable. Please try again.' }] },
      { status: 502 }
    );
  }
}

// This route reads cookies and proxies requests — must never be statically cached
export const dynamic = 'force-dynamic';
