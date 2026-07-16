import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary config automatically loads CLOUDINARY_URL from process.env
cloudinary.config();

export async function GET() {
  try {
    const cloudinaryStatus = process.env.CLOUDINARY_URL ? 
      await cloudinary.api.ping().then(() => 'connected').catch(() => 'failed') : 
      'not configured';

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      cloudinary: cloudinaryStatus,
      upload_service: 'cloudinary',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message || 'Health check failed',
    }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
