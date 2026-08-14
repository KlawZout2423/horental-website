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
 * Record a page visit with UTM and referrer data.
 * Respects the existing 24h localStorage cooldown per storageKey.
 */
export function trackVisit(path: string, storageKey: string) {
  if (typeof window === 'undefined') return;

  const lastVisit = localStorage.getItem(storageKey);
  const now = Date.now();
  const COOLDOWN = 24 * 60 * 60 * 1000;

  if (lastVisit && now - parseInt(lastVisit, 10) < COOLDOWN) return;

  const utm = readUtmParams();
  const referrer = document.referrer || undefined;

  graphqlRequest(RECORD_PAGE_VISIT, {
    path,
    ...utm,
    referrer,
  })
    .then(() => localStorage.setItem(storageKey, String(now)))
    .catch((err: unknown) => console.error('Page visit log error:', err));
}
