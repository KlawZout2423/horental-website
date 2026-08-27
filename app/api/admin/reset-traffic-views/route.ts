import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * POST /api/admin/reset-traffic-views
 * Clears all historical records in the PageVisit table to reset traffic counters to 0.
 */
export async function POST(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('auth_token')?.value;

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'horentals-super-secret-jwt-key-2026';
      const decoded = jwt.verify(authCookie, JWT_SECRET) as { id: number };
      
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true }
      });
      if (!dbUser || dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const deleted = await prisma.pageVisit.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${deleted.count} traffic view records. Traffic counter is now reset to 0.`,
      deletedCount: deleted.count,
    });
  } catch (error: any) {
    console.error('Reset traffic views error:', error);
    return NextResponse.json({ error: error.message || 'Failed to reset traffic views.' }, { status: 500 });
  }
}
