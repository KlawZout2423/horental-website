import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { sendRideReferralAlertSMS } from "../../../../lib/sms";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { propertyId, tenantName, tenantPhone, userId, pickupLocation } = body;

    const parsedPropId = parseInt(String(propertyId), 10);
    if (!propertyId || isNaN(parsedPropId) || parsedPropId <= 0) {
      return NextResponse.json(
        { error: "Valid Property ID is required" },
        { status: 400 }
      );
    }

    const parsedUserId = userId ? parseInt(String(userId), 10) : undefined;
    const validUserId = parsedUserId && !isNaN(parsedUserId) ? parsedUserId : null;

    const property = await prisma.property.findUnique({
      where: { id: parsedPropId },
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
        propertyId: parsedPropId,
        userId: validUserId,
        tenantName: tenantName ? String(tenantName).trim() : null,
        tenantPhone: tenantPhone ? String(tenantPhone).trim() : null,
        pickupLocation: pickupLocation ? String(pickupLocation).trim() : null,
        status: "redirected",
        commissionAmt: 12.5,
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
    const yuyuNumber = process.env.YUYU_WHATSAPP_NUMBER || "233538792644";

    const orderTimeStr = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "GMT",
    });
    const passengerName = tenantName ? String(tenantName).trim() : (validUserId ? "Registered Tenant" : "Guest Passenger");
    const passengerPhone = tenantPhone ? String(tenantPhone).trim() : "";

    const cleanPickup = pickupLocation ? String(pickupLocation).trim() : '';
    let text = `🚗 *YUYU RIDE REQUEST*\n\n`;
    text += `👤 *Passenger:* ${passengerName}${passengerPhone ? ` (${passengerPhone})` : ''}\n`;
    text += `🕒 *Order Time:* ${orderTimeStr}\n`;
    text += `🏠 *Property:* ${property.title}\n`;
    text += `📍 *Property Location:* ${property.location}\n`;

    if (cleanPickup) {
      text += `📍 *Pickup Location:* ${cleanPickup}\n`;
    } else {
      text += `📍 *Pickup Location:* Live GPS attached below\n`;
    }

    text += `📌 *Ref Code:* ${refCode}`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${yuyuNumber}&text=${encodedText}`;
    const whatsappAppUrl = `https://wa.me/${yuyuNumber}?text=${encodedText}`;

    return NextResponse.json(
      {
        success: true,
        refCode: referral.refCode,
        whatsappUrl,
        whatsappAppUrl,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
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
    const limit = Number(searchParams.get("limit")) || 200;
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

    return NextResponse.json(
      {
        success: true,
        referrals,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching ride referrals from database:", error);
    return NextResponse.json(
      { error: "Failed to fetch ride referrals" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Referral ID is required" },
        { status: 400 }
      );
    }

    const referralId = parseInt(id, 10);
    if (isNaN(referralId) || referralId <= 0) {
      return NextResponse.json(
        { error: "Invalid referral ID" },
        { status: 400 }
      );
    }

    await prisma.rideReferral.delete({
      where: { id: referralId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Yuyu Ride referral record deleted successfully",
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error deleting Yuyu ride referral:", error);
    return NextResponse.json(
      { error: "Failed to delete Yuyu ride referral log" },
      { status: 500 }
    );
  }
}

