import { NextResponse } from 'next/server';

/**
 * POST /api/auth/clear-cookie
 * Clears the auth_token and user_data cookies on logout.
 * Must be done server-side because auth_token is HttpOnly (JS can't touch it).
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0, // Immediately expire
  });

  response.cookies.set('user_data', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
