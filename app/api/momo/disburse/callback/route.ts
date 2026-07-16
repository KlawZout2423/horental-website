import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Disbursement callback received:', body);
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    return new NextResponse('Error', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
