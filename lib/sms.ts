/**
 * SailUp SMS Gateway Integration for HO Rentals
 * Handles sending automated SMS alerts for leads, verifications, and approvals.
 */

import { formatGhanaPhone, isValidGhanaPhone } from './types';

const SAILUP_API_URL = 'https://api.sailup.io/v1/sms/';

// Simple in-memory deduplication cache to prevent sending duplicate SMS within a short time window
// Key: `${phone}_${actionKey}`, Value: timestamp
const smsDeduplicationCache = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface SendSmsOptions {
  to: string | string[];
  message: string;
  senderId?: string;
  dedupKey?: string;
}

interface SendSmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends an SMS message using the SailUp API
 */
export async function sendSMS({
  to,
  message,
  senderId,
  dedupKey,
}: SendSmsOptions): Promise<SendSmsResponse> {
  const apiKey = process.env.SAILUP_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ [SailUp SMS] SAILUP_API_KEY is not configured in environment variables.');
    return { success: false, error: 'SAILUP_API_KEY not configured' };
  }

  // Normalize recipient list
  const recipientList = Array.isArray(to) ? to : [to];
  const validRecipients = recipientList
    .map(p => formatGhanaPhone(p))
    .filter(p => isValidGhanaPhone(p));

  if (validRecipients.length === 0) {
    console.warn('⚠️ [SailUp SMS] No valid Ghanaian phone numbers provided:', to);
    return { success: false, error: 'No valid Ghanaian phone numbers' };
  }

  // Check deduplication
  if (dedupKey) {
    const primaryPhone = validRecipients[0];
    const cacheKey = `${primaryPhone}_${dedupKey}`;
    const lastSent = smsDeduplicationCache.get(cacheKey);
    const now = Date.now();

    if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
      console.log(`ℹ️ [SailUp SMS] Skipped duplicate SMS to ${primaryPhone} (Key: ${dedupKey}) within 15min cooldown.`);
      return { success: true, messageId: 'deduplicated' };
    }
    smsDeduplicationCache.set(cacheKey, now);
  }

  const fromSender = senderId || process.env.SAILUP_SENDER_ID || 'HORENTALS';

  // Keep message concise (<= 160 chars recommended for single segment)
  const trimmedMessage = message.trim();

  try {
    const response = await fetch(SAILUP_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromSender,
        to: validRecipients,
        body: trimmedMessage,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('❌ [SailUp SMS Error]', response.status, data);
      let errMsg = data?.message || data?.error || `HTTP ${response.status}`;
      if (typeof errMsg === 'string' && (errMsg.toLowerCase().includes('sender') || errMsg.toLowerCase().includes('approved'))) {
        errMsg = `Sender ID "${fromSender}" is not approved on your SailUp project. Please enter your approved Sender ID in the Sender ID field (e.g. from your sailup.io dashboard) or register "${fromSender}" with SailUp.`;
      }
      return { success: false, error: errMsg };
    }

    console.log(`✅ [SailUp SMS Sent] To: ${validRecipients.join(', ')} | From: ${fromSender}`);
    return { success: true, messageId: data?.id || data?.message_id || 'sent' };
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || String(err);
    console.error('❌ [SailUp SMS Exception]', errorMsg);
    return { success: false, error: errorMsg || 'Network error' };
  }
}

/**
 * 1. Sends real-time SMS alert to landlord/agent when a tenant inquires on a listing
 */
export async function sendLeadAlertSMS({
  landlordPhone,
  customerName,
  customerPhone,
  propertyTitle,
  propertyId,
  actionType = 'Inquiry',
}: {
  landlordPhone: string;
  customerName: string;
  customerPhone: string;
  propertyTitle: string;
  propertyId?: number | string;
  actionType?: string;
}): Promise<SendSmsResponse> {
  const shortTitle = propertyTitle.length > 30 ? `${propertyTitle.slice(0, 27)}...` : propertyTitle;
  const cleanCustomerName = customerName.trim() || 'A tenant';
  const cleanCustomerPhone = formatGhanaPhone(customerPhone);

  const message = `HO Rentals: New ${actionType} from ${cleanCustomerName} (${cleanCustomerPhone}) for your listing "${shortTitle}". Follow up promptly!`;
  const dedupKey = propertyId ? `lead_${propertyId}_${cleanCustomerPhone}` : undefined;

  return sendSMS({
    to: landlordPhone,
    message,
    dedupKey,
  });
}

/**
 * 2. Sends SMS notification when an agent account is verified by admin
 */
export async function sendAgentVerifiedSMS({
  agentPhone,
  agentName,
}: {
  agentPhone: string;
  agentName: string;
}): Promise<SendSmsResponse> {
  const firstName = agentName.split(' ')[0] || 'Agent';
  const message = `HO Rentals: Congrats ${firstName}! Your agent account has been verified. You can now publish rental listings at horentals.com/upload`;

  return sendSMS({
    to: agentPhone,
    message,
    dedupKey: `agent_verified_${agentPhone}`,
  });
}

/**
 * 3. Sends SMS notification when a landlord registration / listing is published live
 */
export async function sendPropertyPublishedSMS({
  ownerPhone,
  propertyTitle,
  propertyLocation,
}: {
  ownerPhone: string;
  propertyTitle: string;
  propertyLocation?: string;
}): Promise<SendSmsResponse> {
  const shortTitle = propertyTitle.length > 35 ? `${propertyTitle.slice(0, 32)}...` : propertyTitle;
  const loc = propertyLocation ? ` in ${propertyLocation}` : '';
  const message = `HO Rentals: Your listing "${shortTitle}"${loc} is now LIVE on horentals.com. Tenants can now contact you directly.`;

  return sendSMS({
    to: ownerPhone,
    message,
  });
}

/**
 * 4. Sends real-time SMS notification to HO Rentals admin when a tenant requests a Yuyu Ride for property inspection
 */
export async function sendRideReferralAlertSMS({
  customerName,
  customerPhone,
  propertyTitle,
  propertyLocation,
  referralCode,
}: {
  customerName?: string;
  customerPhone?: string;
  propertyTitle: string;
  propertyLocation?: string;
  referralCode: string;
}): Promise<SendSmsResponse> {
  const adminPhones = [
    process.env.ADMIN_NOTIFICATION_PHONE,
    process.env.NEXT_PUBLIC_SUPPORT_PHONE,
    '0204940602',
    '0557922593',
  ].filter(Boolean) as string[];

  const cleanCustomerName = (customerName || 'Tenant').trim();
  const cleanCustomerPhone = customerPhone ? formatGhanaPhone(customerPhone) : 'Web App';
  const shortTitle = propertyTitle.length > 25 ? `${propertyTitle.slice(0, 22)}...` : propertyTitle;

  const message = `HO RENTALS RIDE ALERT: ${cleanCustomerName} (${cleanCustomerPhone}) requested a Yuyu Ride for "${shortTitle}" (${propertyLocation || 'Ho'}). Ref: ${referralCode}. Est Comm: GHc5.00`;

  return sendSMS({
    to: adminPhones,
    message,
    dedupKey: `ride_${referralCode}`,
  });
}
