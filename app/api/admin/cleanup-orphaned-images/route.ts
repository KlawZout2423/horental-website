import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import prisma from '../../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../../lib/env';

// Automatically load Cloudinary configuration from process.env (CLOUDINARY_URL)
cloudinary.config();

/**
 * POST /api/admin/cleanup-orphaned-images
 * Scans the database and Cloudinary storage for orphaned / unreferenced media files.
 * Deletes unneeded images and returns a detailed cleanup summary.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authorization
    const authCookie = req.cookies.get('auth_token')?.value;

    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    try {
      const JWT_SECRET = getJwtSecret();
      const decoded = jwt.verify(authCookie, JWT_SECRET) as { id: number };
      
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true }
      });
      if (!dbUser || dbUser.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
    }

    // 2. Fetch all active image URLs from database (Properties, Gallery, Company Logos, User Avatars, Landlord Submissions, ID Docs)
    const [properties, propertyImages, companies, users, landlordRegistrations, verificationRequests] = await Promise.all([
      prisma.property.findMany({ select: { imageUrl: true } }),
      prisma.propertyImage.findMany({ select: { url: true } }),
      prisma.company.findMany({ select: { logoUrl: true } }),
      prisma.user.findMany({ select: { profileImage: true } }),
      prisma.landlordRegistration.findMany({ select: { photos: true } }),
      prisma.verificationRequest.findMany({ select: { documentUrls: true } }),
    ]);

    const activeUrls = new Set<string>();

    properties.forEach((p) => {
      if (p.imageUrl && p.imageUrl.trim()) activeUrls.add(p.imageUrl.trim());
    });

    propertyImages.forEach((pi) => {
      if (pi.url && pi.url.trim()) activeUrls.add(pi.url.trim());
    });

    companies.forEach((c) => {
      if (c.logoUrl && c.logoUrl.trim()) activeUrls.add(c.logoUrl.trim());
    });

    users.forEach((u) => {
      if (u.profileImage && u.profileImage.trim()) activeUrls.add(u.profileImage.trim());
    });

    landlordRegistrations.forEach((lr) => {
      if (Array.isArray(lr.photos)) {
        lr.photos.forEach((photo) => {
          if (photo && photo.trim()) activeUrls.add(photo.trim());
        });
      }
    });

    verificationRequests.forEach((vr) => {
      if (Array.isArray(vr.documentUrls)) {
        vr.documentUrls.forEach((docUrl) => {
          if (docUrl && docUrl.trim()) activeUrls.add(docUrl.trim());
        });
      }
    });

    // Helper: extract Cloudinary public_id from secure_url
    const extractPublicId = (url: string): string | null => {
      if (!url.includes('res.cloudinary.com')) return null;
      try {
        const uploadIdx = url.indexOf('/upload/');
        if (uploadIdx === -1) return null;
        let pathAfterUpload = url.substring(uploadIdx + 8);
        
        // Remove transformation segments (e.g. f_auto,q_auto,w_800/)
        const parts = pathAfterUpload.split('/');
        const cleanParts = parts.filter((part) => !part.includes(',') && !part.match(/^v\d+$/));
        pathAfterUpload = cleanParts.join('/');

        // Remove file extension (.jpg, .png, .webp, etc)
        const dotIdx = pathAfterUpload.lastIndexOf('.');
        if (dotIdx !== -1) {
          pathAfterUpload = pathAfterUpload.substring(0, dotIdx);
        }
        return pathAfterUpload;
      } catch {
        return null;
      }
    };

    const activePublicIds = new Set<string>();
    activeUrls.forEach((url) => {
      const pubId = extractPublicId(url);
      if (pubId) activePublicIds.add(pubId);
    });

    // 3. Query Cloudinary for resources in the 'horentals' folder
    let cloudinaryResources: any[] = [];
    try {
      const res = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'horentals/',
        max_results: 500,
      });
      cloudinaryResources = res.resources || [];
    } catch (cErr: any) {
      console.warn('[Storage Cleanup] Could not query Cloudinary API:', cErr.message);
    }

    // 4. Identify orphaned Cloudinary public IDs (stored in storage but not in DB)
    const orphanedPublicIds: string[] = [];
    let reclaimedBytes = 0;

    cloudinaryResources.forEach((resource) => {
      const publicId = resource.public_id; // e.g. "horentals/img_123"
      const isReferenced = activePublicIds.has(publicId) || Array.from(activeUrls).some((url) => url.includes(publicId));
      
      if (!isReferenced) {
        orphanedPublicIds.push(publicId);
        reclaimedBytes += resource.bytes || 0;
      }
    });

    // 5. Delete orphaned resources from Cloudinary
    let deletedCount = 0;
    if (orphanedPublicIds.length > 0) {
      for (let i = 0; i < orphanedPublicIds.length; i += 100) {
        const batch = orphanedPublicIds.slice(i, i + 100);
        await cloudinary.api.delete_resources(batch);
        deletedCount += batch.length;
      }
    }

    // 6. Clean up any orphaned PropertyImage DB records whose parent property was deleted
    const orphanDbImages = await prisma.propertyImage.deleteMany({
      where: {
        propertyId: {
          notIn: (await prisma.property.findMany({ select: { id: true } })).map((p) => p.id),
        },
      },
    });

    const reclaimedMB = (reclaimedBytes / (1024 * 1024)).toFixed(2);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} unneeded storage images and ${orphanDbImages.count} orphaned database records.`,
      stats: {
        totalCloudinaryScanned: cloudinaryResources.length,
        activeDbImagesCount: activeUrls.size,
        orphanedImagesDeleted: deletedCount,
        orphanedDbRowsDeleted: orphanDbImages.count,
        reclaimedSpaceMB: `${reclaimedMB} MB`,
        deletedPublicIds: orphanedPublicIds,
      },
    });
  } catch (error: any) {
    console.error('[Storage Cleanup Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Storage cleanup failed.' },
      { status: 500 }
    );
  }
}
