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
    const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours session timeout

    const userPayload = {
      ...user,
      loggedInAt: Date.now()
    };

    // HttpOnly: JS cannot read this — XSS-safe
    // Secure: only sent over HTTPS in production
    // SameSite=Lax: enables seamless navigation across tabs
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    // User data cookie — NOT HttpOnly so the client can read name/role for UI rendering
    response.cookies.set('user_data', JSON.stringify(userPayload), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Failed to set authentication cookies.' },
      { status: 500 }
    );
  }
}
