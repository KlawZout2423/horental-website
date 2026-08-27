import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '../../../../lib/prisma';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const paystackSignature = req.headers.get('x-paystack-signature');

    // 1. Verify Paystack Signature (HMAC SHA512 using PAYSTACK_SECRET_KEY)
    if (PAYSTACK_SECRET_KEY && paystackSignature) {
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(rawBody)
        .digest('hex');

      if (hash !== paystackSignature) {
        console.warn('⚠️ [Paystack Webhook] Invalid signature detected');
        return new NextResponse('Invalid signature', { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    console.log(`💳 [Paystack Webhook] Received Event: ${event.event}`);

    // 2. Process Successful Charge Event
    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data;
      const amountInGhs = amount / 100;

      console.log(`✅ [Paystack Payment Success] Ref: ${reference}, Amount: GHS ${amountInGhs}, Customer: ${customer?.email}`);

      // Record Audit Log for successful payment
      await prisma.auditLog.create({
        data: {
          action: 'PAYSTACK_PAYMENT_SUCCESS',
          details: `Paystack transaction ${reference} succeeded for GHS ${amountInGhs} (${customer?.email || 'N/A'})`,
          userEmail: customer?.email || null,
        },
      });

      // Handle SaaS Subscription or Property Feature Boost if metadata exists
      if (metadata?.propertyId) {
        await prisma.property.update({
          where: { id: parseInt(metadata.propertyId, 10) },
          data: { isFeatured: true },
        });
        console.log(`🌟 [Paystack SaaS] Property #${metadata.propertyId} marked as featured upon payment!`);
      }

      if (metadata?.subscriptionPlan && customer?.email) {
        const userObj = await prisma.user.findUnique({ where: { email: customer.email } });
        if (userObj) {
          const sub = await prisma.subscription.create({
            data: {
              name: metadata.subscriptionPlan,
              price: amountInGhs,
              status: 'active',
              paystackCustomerCode: customer.customer_code || null,
              paystackSubscriptionCode: reference,
            },
          });
          await prisma.user.update({
            where: { id: userObj.id },
            data: {
              subscriptionId: sub.id,
              role: userObj.role === 'user' ? 'agent' : userObj.role,
            },
          });
          console.log(`💎 [Paystack SaaS] User ${userObj.email} subscribed to ${metadata.subscriptionPlan}!`);
        }
      }
    }

    // 3. Process Subscription Created / Disabled Events
    if (event.event === 'subscription.create') {
      const { subscription_code, customer } = event.data;
      console.log(`💎 [Paystack SaaS Subscription Created] Code: ${subscription_code}, Customer: ${customer?.email}`);
    }

    if (event.event === 'subscription.disable') {
      const { subscription_code } = event.data;
      await prisma.subscription.updateMany({
        where: { paystackSubscriptionCode: subscription_code },
        data: { status: 'canceled' },
      });
      console.log(`⚠️ [Paystack SaaS Subscription Canceled] Code: ${subscription_code}`);
    }

    return new NextResponse('Webhook Handled Successfully', { status: 200 });
  } catch (error: any) {
    console.error('❌ [Paystack Webhook Error]:', error);
    return new NextResponse(error.message || 'Webhook Error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
