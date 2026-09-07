import { NextResponse, NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../lib/env';

// Cloudinary config automatically loads CLOUDINARY_URL from process.env
cloudinary.config();

function isAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  let token = authHeader ? authHeader.replace('Bearer ', '') : req.cookies.get('auth_token')?.value;

  if (token) {
    try {
      jwt.verify(token, getJwtSecret());
      return true;
    } catch {
      // Token verification failed
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthenticated(req)) {
      return NextResponse.json({ error: 'Unauthorized. Please log in to upload images.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'horentals' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result?.secure_url || '');
          }
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json({
      success: true,
      imageUrl: imageUrl,
      isCloudinary: true,
    });
  } catch (error: any) {
    console.error('Upload single error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
