import { graphqlRequest } from './graphql';
import { RECORD_PAGE_VISIT } from './graphql';

/**
 * Resolve the traffic source label from UTM params or document.referrer.
 * Kept as a pure helper so it can be used for display purposes too.
 */
export function resolveSource(utmSource?: string | null, referrer?: string | null): string {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes('tiktok')) return 'TikTok';
    if (s.includes('instagram') || s.includes('ig')) return 'Instagram';
    if (s.includes('facebook') || s.includes('fb')) return 'Facebook';
    if (s.includes('whatsapp') || s.includes('wa')) return 'WhatsApp';
    if (s.includes('google')) return 'Google';
    if (s.includes('twitter') || s.includes('x.com')) return 'X / Twitter';
    return utmSource;
  }
  if (referrer) {
    const r = referrer.toLowerCase();
    if (r.includes('tiktok')) return 'TikTok';
    if (r.includes('instagram')) return 'Instagram';
    if (r.includes('facebook') || r.includes('fb.com')) return 'Facebook';
    if (r.includes('whatsapp')) return 'WhatsApp';
    if (r.includes('google')) return 'Google';
    if (r.includes('twitter') || r.includes('x.com')) return 'X / Twitter';
  }
  return 'Direct / Unknown';
}

/**
 * Read UTM params safely from a URL search string (or current window.location).
 */
export function readUtmParams(search?: string) {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(search ?? window.location.search);
  return {
    utmSource:   params.get('utm_source')   || undefined,
    utmMedium:   params.get('utm_medium')   || undefined,
    utmCampaign: params.get('utm_campaign') || undefined,
    utmContent:  params.get('utm_content')  || undefined,
  };
}

/**
 * Build a tracking URL for a campaign link without clobbering existing params.
 */
export function buildTrackingUrl(
  baseUrl: string,
  source: string,
  medium = 'social',
  campaign = '',
  content = ''
): string {
  // Use URL utility — never string-concatenate
  const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
  url.searchParams.set('utm_source', source.toLowerCase());
  if (medium)   url.searchParams.set('utm_medium',   medium);
  if (campaign) url.searchParams.set('utm_campaign', campaign);
  if (content)  url.searchParams.set('utm_content',  content);
  return url.toString();
}

/**
 * Get or create an anonymous 30-minute organic session ID.
 * Session ID is maintained across pageviews and expires after 30 minutes of inactivity.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const SESSION_KEY = 'ho_session_id';
  const SESSION_EXPIRY_KEY = 'ho_session_expiry';
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);

  if (!sessionId || !expiry || now > parseInt(expiry, 10)) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      sessionStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem(SESSION_EXPIRY_KEY, String(now + THIRTY_MINUTES));
    } catch {}
  } else {
    // Extend session expiry on activity
    try {
      localStorage.setItem(SESSION_EXPIRY_KEY, String(now + THIRTY_MINUTES));
    } catch {}
  }

  return sessionId;
}

// In-memory guard against React StrictMode double invocation
const pendingVisits = new Set<string>();

/**
 * Record a page visit with UTM, referrer, and organic session data.
 * Respects the existing 24h localStorage cooldown per storageKey.
 * Admin, agent, and landlord users are excluded — only track real prospective customers.
 */
export function trackVisit(path: string, storageKey: string) {
  if (typeof window === 'undefined') return;

  // Skip tracking for internal accounts (admin, agent, landlord) — only track real prospective customers
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user_data='));
    if (match) {
      const raw = decodeURIComponent(match.split('=').slice(1).join('='));
      const parsed = JSON.parse(raw);
      if (parsed?.role === 'admin' || parsed?.role === 'agent' || parsed?.role === 'landlord') {
        return; // Internal staff/agent visit — do not inflate real customer traffic counts
      }
    }
  } catch {
    // cookie unreadable — proceed normally
  }

  // Prevent synchronous duplicate executions from React 19 StrictMode / double mounts
  if (pendingVisits.has(storageKey)) return;

  const lastVisit = localStorage.getItem(storageKey);
  const now = Date.now();
  const COOLDOWN = 24 * 60 * 60 * 1000;

  if (lastVisit && now - parseInt(lastVisit, 10) < COOLDOWN) return;

  // Mark immediately & synchronously to block any parallel execution
  pendingVisits.add(storageKey);
  try {
    localStorage.setItem(storageKey, String(now));
  } catch {
    // localStorage quota / private mode fallback
  }

  const utm = readUtmParams();
  const referrer = document.referrer || undefined;
  const sessionId = getOrCreateSessionId();

  graphqlRequest(RECORD_PAGE_VISIT, {
    path,
    sessionId,
    ...utm,
    referrer,
  })
    .catch((err: unknown) => console.error('Page visit log error:', err))
    .finally(() => {
      // Remove from in-memory set after 5 seconds
      setTimeout(() => pendingVisits.delete(storageKey), 5000);
    });
}
