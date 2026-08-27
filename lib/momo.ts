import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { formatGhanaPhone } from './types';

const BASE_URL = process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
const MOMO_ENV = process.env.MOMO_ENV || 'sandbox';
const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY || '';
const MOMO_CALLBACK_HOST = process.env.MOMO_CALLBACK_HOST || '';

/**
 * Provisions a sandbox or live MoMo API user reference ID and API Key.
 */
async function provisionApiUser() {
  if (!MOMO_SUBSCRIPTION_KEY) {
    throw new Error('MOMO_SUBSCRIPTION_KEY environment variable is not configured.');
  }

  const referenceId = uuidv4();
  const callbackHost = MOMO_CALLBACK_HOST || 'https://horentals.com';

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

/**
 * Requests an Access Token from MTN MoMo collection/disbursement API.
 */
async function getAccessToken(referenceId: string, apiKey: string) {
  const auth = Buffer.from(`${referenceId}:${apiKey}`).toString('base64');
  const { data } = await axios.post(
    `${BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
      },
    }
  );
  return data.access_token;
}

import { chargePaystackMobileMoney } from './paystack';

/**
 * Initiates a Mobile Money payment collection prompt on the customer's phone.
 * Automatically uses Paystack (for SaaS transition) if PAYSTACK_SECRET_KEY is configured,
 * or falls back to direct MoMo API / simulated success in dev.
 */
export async function collectPayment(
  phone: string,
  amount: number,
  transactionId: string,
  description: string
): Promise<boolean> {
  const formattedPhone = formatGhanaPhone(phone);
  const msisdn = formattedPhone.startsWith('0') ? `233${formattedPhone.slice(1)}` : formattedPhone;

  // Paystack SaaS Transition Check: if Paystack Secret Key is configured, route payment via Paystack
  if (process.env.PAYSTACK_SECRET_KEY) {
    console.log(`[SaaS Payment] Processing payment via Paystack for ${msisdn} - GHS ${amount}`);
    await chargePaystackMobileMoney(formattedPhone, amount, 'payments@horentals.com');
    return true;
  }

  // Fallback to simulated payment in local dev mode if subscription key is not present
  if (!MOMO_SUBSCRIPTION_KEY) {
    console.warn(`[Payment API] Neither PAYSTACK_SECRET_KEY nor MOMO_SUBSCRIPTION_KEY set. Simulating payment request for ${msisdn} - GHS ${amount} (TxId: ${transactionId})`);
    return true;
  }


  try {
    const { referenceId, apiKey } = await provisionApiUser();
    const token = await getAccessToken(referenceId, apiKey);
    const referenceIdForRequest = uuidv4();

    const payload = {
      amount: amount.toString(),
      currency: 'GHS',
      externalId: transactionId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: msisdn,
      },
      payerMessage: description,
      payeeNote: 'HO Rentals Payment',
    };

    await axios.post(
      `${BASE_URL}/collection/v1_0/requesttopay`,
      payload,
      {
        headers: {
          'X-Reference-Id': referenceIdForRequest,
          'X-Target-Environment': MOMO_ENV,
          'Ocp-Apim-Subscription-Key': MOMO_SUBSCRIPTION_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[MoMo Payment API] Payment request sent successfully to ${msisdn}. ReferenceId: ${referenceIdForRequest}`);
    return true;
  } catch (error: any) {
    console.error('[MoMo Payment API Error]:', error?.response?.data || error.message);
    throw new Error(`Mobile Money Payment failed: ${error?.response?.data?.message || error.message}`);
  }
}
