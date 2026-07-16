import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/set-cookie
 * Receives { token, user } from the client after a successful GraphQL login/register.
 * Sets an HttpOnly cookie that JS cannot read — eliminating the XSS risk of localStorage.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, user } = body;

    if (!token || !user) {
      return NextResponse.json(
        { error: 'Missing token or user data.' },
        { status: 400 }
      );
    }

    // Basic JWT structure check (3 base64 segments)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid token format.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ success: true });

    const isProduction = process.env.NODE_ENV === 'production';

    // HttpOnly: JS cannot read this — XSS-safe
    // Secure: only sent over HTTPS in production
    // SameSite=Strict: blocks CSRF from cross-site requests
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // User data cookie — NOT HttpOnly so the client can read name/role for UI rendering
    // This contains no secrets — it's safe to be readable by JS
    response.cookies.set('user_data', JSON.stringify(user), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to set authentication cookies.' },
      { status: 500 }
    );
  }
}
