import axios from 'axios';
import { formatGhanaPhone } from './types';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface InitializePaystackOptions {
  email: string;
  amountInGhs: number;
  reference?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[]; // e.g. ['mobile_money', 'card']
}

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      email: string;
      customer_code: string;
      phone?: string;
    };
  };
}

/**
 * Initializes a Paystack transaction for SaaS Subscriptions or Property Listing Payments.
 * Paystack converts GHS to pesewas (multiplied by 100).
 */
export async function initializePaystackTransaction(
  options: InitializePaystackOptions
): Promise<PaystackInitResponse> {
  const {
    email,
    amountInGhs,
    reference,
    callbackUrl,
    metadata = {},
    channels = ['mobile_money', 'card'],
  } = options;

  if (!PAYSTACK_SECRET_KEY) {
    console.warn(
      `[Paystack SaaS API] PAYSTACK_SECRET_KEY not configured. Simulating Paystack checkout initialization for ${email} - GHS ${amountInGhs}`
    );
    const mockRef = reference || `PAYSTACK_MOCK_${Date.now()}`;
    return {
      authorization_url: `${process.env.NEXT_PUBLIC_API_URL || ''}/properties?paystack_mock=true&ref=${mockRef}`,
      access_code: `MOCK_ACCESS_${Date.now()}`,
      reference: mockRef,
    };
  }

  try {
    const amountInPesewas = Math.round(amountInGhs * 100);

    const payload = {
      email,
      amount: amountInPesewas,
      currency: 'GHS',
      reference,
      callback_url: callbackUrl,
      channels,
      metadata,
    };

    const { data } = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack payment.');
    }

    return {
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (error: any) {
    console.error('[Paystack Initialization Error]:', error?.response?.data || error.message);
    throw new Error(`Paystack Payment initialization failed: ${error?.response?.data?.message || error.message}`);
  }
}

/**
 * Verifies a Paystack transaction by reference after completion.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    console.warn(`[Paystack SaaS API] PAYSTACK_SECRET_KEY not set. Simulating verification for ${reference}`);
    return {
      status: true,
      message: 'Simulated Verification Success',
      data: {
        id: 99999,
        domain: 'test',
        status: 'success',
        reference,
        amount: 1000,
        gateway_response: 'Successful (Simulated)',
        paid_at: new Date().toISOString(),
        channel: 'mobile_money',
        currency: 'GHS',
        ip_address: '127.0.0.1',
        metadata: {},
        customer: {
          id: 1,
          email: 'demo@horentals.com',
          customer_code: 'CUS_MOCK',
        },
      },
    };
  }

  try {
    const { data } = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    return data;
  } catch (error: any) {
    console.error('[Paystack Verification Error]:', error?.response?.data || error.message);
    throw new Error(`Paystack verification failed: ${error?.response?.data?.message || error.message}`);
  }
}

/**
 * Direct Mobile Money Charge via Paystack API (Ghana networks: mtn, vodafone/telecel, tigo/airteltigo)
 */
export async function chargePaystackMobileMoney(
  phone: string,
  amountInGhs: number,
  email: string,
  provider: 'mtn' | 'vod' | 'tgo' = 'mtn'
) {
  const formattedPhone = formatGhanaPhone(phone);
  if (!PAYSTACK_SECRET_KEY) {
    console.warn(`[Paystack MoMo] PAYSTACK_SECRET_KEY missing. Simulating charge for ${formattedPhone}`);
    return { status: true, reference: `MOMO_MOCK_${Date.now()}` };
  }

  try {
    const amountInPesewas = Math.round(amountInGhs * 100);

    const payload = {
      email,
      amount: amountInPesewas,
      currency: 'GHS',
      mobile_money: {
        phone: formattedPhone,
        provider,
      },
    };

    const { data } = await axios.post(
      `${PAYSTACK_BASE_URL}/charge`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return data;
  } catch (error: any) {
    console.error('[Paystack Charge Error]:', error?.response?.data || error.message);
    throw new Error(`Paystack MoMo charge failed: ${error?.response?.data?.message || error.message}`);
  }
}
