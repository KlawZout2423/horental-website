import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { sendRideReferralAlertSMS } from "../../../../lib/sms";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { propertyId, tenantName, tenantPhone, userId, pickupLocation } = body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property ID is required" },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: Number(propertyId) },
      select: { id: true, title: true, location: true },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Generate unique reference code, e.g. HOR-YY-4921
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const refCode = `HOR-YY-${randomCode}`;

    // Create RideReferral record
    const referral = await prisma.rideReferral.create({
      data: {
        refCode,
        propertyId: Number(propertyId),
        userId: userId ? Number(userId) : null,
        tenantName: tenantName || null,
        tenantPhone: tenantPhone || null,
        pickupLocation: pickupLocation || null,
        status: "redirected",
        commissionAmt: 5.0,
      },
    });

    // Asynchronously dispatch SMS notification to HO Rentals admin
    sendRideReferralAlertSMS({
      customerName: tenantName || undefined,
      customerPhone: tenantPhone || undefined,
      propertyTitle: property.title,
      propertyLocation: property.location,
      referralCode: referral.refCode,
    }).catch((err) => console.warn("Failed to dispatch ride SMS alert:", err));

    // Default Yuyu Rides WhatsApp contact (can be overridden via env variable YUYU_WHATSAPP_NUMBER)
    const yuyuNumber = process.env.YUYU_WHATSAPP_NUMBER || "233557922593";

    const text = `Hi Yuyu Rides! 🚗 I'd like to request a ride to inspect a property listed on HO Rentals:\n\n🏠 Property: ${property.title}\n📍 Location: ${property.location}\n📌 Ref Code: ${refCode}`;

    const whatsappUrl = `https://wa.me/${yuyuNumber}?text=${encodeURIComponent(text)}`;

    return NextResponse.json({
      success: true,
      refCode: referral.refCode,
      whatsappUrl,
    });
  } catch (error: unknown) {
    console.error("Error creating ride referral:", error);
    return NextResponse.json(
      { error: "Failed to create ride referral log" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      prisma.rideReferral.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: {
          property: {
            select: { id: true, title: true, location: true },
          },
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      }),
      prisma.rideReferral.count(),
    ]);

    return NextResponse.json({
      success: true,
      referrals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error("Error fetching ride referrals:", error);
    return NextResponse.json(
      { error: "Failed to fetch ride referral logs" },
      { status: 500 }
    );
  }
}
