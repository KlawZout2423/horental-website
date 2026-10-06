import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../lib/env';
import { SITE_CONFIG } from '../../../lib/siteConfig';

/**
 * GET /api/system-status
 * Public endpoint returning whether the website is currently in update/maintenance mode.
 */
export async function GET() {
  try {
    const rows: any = await prisma.$queryRawUnsafe(
      `SELECT "value", "updatedAt" FROM "SystemSetting" WHERE "key" = 'maintenance_mode' LIMIT 1;`
    );

    const isUnderMaintenance = rows && rows.length > 0 ? rows[0].value === 'true' : SITE_CONFIG.isUnderMaintenance;

    return NextResponse.json({
      isUnderMaintenance,
      updatedAt: rows && rows.length > 0 ? rows[0].updatedAt : new Date().toISOString(),
      config: {
        contactPhone1: SITE_CONFIG.contactPhone1,
        contactPhone2: SITE_CONFIG.contactPhone2,
        whatsAppNumber: SITE_CONFIG.whatsAppNumber,
        yuyuWhatsAppNumber: SITE_CONFIG.yuyuWhatsAppNumber,
        supportEmail: SITE_CONFIG.supportEmail,
      }
    });
  } catch (error: any) {
    // If table doesn't exist yet, fallback to default config
    return NextResponse.json({
      isUnderMaintenance: SITE_CONFIG.isUnderMaintenance,
      error: error.message
    });
  }
}

/**
 * POST /api/system-status
 * Admin-only endpoint to toggle maintenance / update mode on or off.
 */
export async function POST(req: NextRequest) {
  try {
    const authCookie = req.cookies.get('auth_token')?.value;
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const token = authCookie || authHeader;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Authentication token missing.' }, { status: 401 });
    }

    const JWT_SECRET = getJwtSecret();
    let decoded: { id: number };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { isUnderMaintenance } = body;

    if (typeof isUnderMaintenance !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameter. "isUnderMaintenance" must be a boolean.' }, { status: 400 });
    }

    const strValue = isUnderMaintenance ? 'true' : 'false';

    // Ensure SystemSetting table exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemSetting" (
        "key" VARCHAR(255) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Upsert into SystemSetting
    await prisma.$executeRawUnsafe(`
      INSERT INTO "SystemSetting" ("key", "value", "updatedAt")
      VALUES ('maintenance_mode', '${strValue}', NOW())
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();
    `);

    // Log action to AuditLog
    const actionDesc = isUnderMaintenance 
      ? `Admin ${adminUser.name || adminUser.email} ENABLED System Update / Maintenance Mode (Visitors now see Info Page).`
      : `Admin ${adminUser.name || adminUser.email} DISABLED System Update / Maintenance Mode (Site is now fully Live).`;

    try {
      await prisma.auditLog.create({
        data: {
          action: 'SYSTEM_MAINTENANCE_TOGGLED',
          details: actionDesc,
          userEmail: adminUser.email || undefined,
        }
      });
    } catch (auditErr) {
      console.warn('Could not record audit log for maintenance toggle:', auditErr);
    }

    return NextResponse.json({
      success: true,
      isUnderMaintenance,
      message: isUnderMaintenance 
        ? 'System update mode has been ENABLED. Visitors will now see the Info page with contact details.'
        : 'System update mode has been DISABLED. The website is now live for all visitors.'
    });
  } catch (error: any) {
    console.error('Error toggling system status:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
