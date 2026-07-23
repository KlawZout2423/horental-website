import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

/**
 * POST /api/admin/reset-traffic-views
 * Clears all historical records in the PageVisit table to reset traffic counters to 0.
 */
export async function POST(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('auth_token')?.value;
    const userDataCookie = req.cookies.get('user_data')?.value;

    if (!authCookie || !userDataCookie) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let userObj: any = {};
    try {
      userObj = JSON.parse(decodeURIComponent(userDataCookie));
    } catch {}

    if (userObj.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
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
