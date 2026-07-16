import { NextResponse, NextRequest } from 'next/server';
import prisma from '../../../../../lib/prisma';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'https://sandbox.momodeveloper.mtn.com';
const MOMO_ENV = process.env.MOMO_ENV || 'sandbox';
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY || '';
const MOMO_CALLBACK_HOST = process.env.MOMO_CALLBACK_HOST || '';

async function provisionApiUser() {
  const referenceId = uuidv4();
  const callbackHost = MOMO_CALLBACK_HOST || '';

  await axios.post(
    `${BASE_URL}/v1_0/apiuser`,
    { providerCallbackHost: callbackHost },
    {
      headers: {
        'X-Reference-Id': referenceId,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );

  const { data } = await axios.post(
    `${BASE_URL}/v1_0/apiuser/${referenceId}/apikey`,
    {},
    {
      headers: {
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  
  return { referenceId, apiKey: data.apiKey };
}

async function getAccessToken(referenceId: string, apiKey: string) {
  const auth = Buffer.from(`${referenceId}:${apiKey}`).toString('base64');
  const { data } = await axios.post(
    `${BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  return data.access_token;
}

async function disburseToPartner(momoAccount: string, amount: number, externalId: string) {
  const { referenceId, apiKey } = await provisionApiUser();
  const token = await getAccessToken(referenceId, apiKey);
  const referenceIdForDisburse = uuidv4();

  const transferOptions = {
    amount: amount.toString(),
    currency: 'GHS',
    externalId,
    payee: { partyIdType: 'MSISDN', partyId: `233${momoAccount.slice(1)}` },
    payerMessage: 'Ho Rentals Partner Payout',
    payeeNote: 'Booking commission deducted',
  };

  await axios.post(
    `${BASE_URL}/disbursement/v1_0/transfer`,
    transferOptions,
    {
      headers: {
        'X-Reference-Id': referenceIdForDisburse,
        'X-Target-Environment': MOMO_ENV,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return referenceIdForDisburse;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { externalId, resultCode } = body;

    if (resultCode === 0) {
      // Find the booking by momoTxId
      const booking = await prisma.booking.findFirst({
        where: { momoTxId: externalId },
        include: { company: true },
      });

      if (booking) {
        // Update booking status
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'paid' },
        });

        // Trigger disbursement if not own company and has commission
        if (!booking.company.isOwnCompany && booking.commissionAmount > 0 && booking.company.momoAccount) {
          const netAmount = booking.totalAmount - booking.commissionAmount;
          try {
            await disburseToPartner(booking.company.momoAccount, netAmount, `payout_${externalId}`);
          } catch (disburseError) {
            console.error('Failed to disburse to partner:', disburseError);
          }
        }
      }
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('momo callback error:', error);
    return new NextResponse(error.message || 'Error', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
