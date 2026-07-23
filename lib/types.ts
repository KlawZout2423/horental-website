export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user' | 'partner' | string;
}

export interface Property {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  location: string;
  description: string;
  contact: string;
  imageUrl: string;
  isFeatured?: boolean;
  createdAt?: string;
}

/**
 * Checks if a property listing is considered "New" (uploaded within the last maxDays, default 7 days).
 * After maxDays (e.g. 7 days), it automatically becomes a standard listing.
 */
export function isNewListing(createdAt?: string, maxDays: number = 7): boolean {
  if (!createdAt) return false;
  const createdDate = new Date(createdAt).getTime();
  if (isNaN(createdDate)) return false;
  const ageInMs = Date.now() - createdDate;
  const maxAgeInMs = maxDays * 24 * 60 * 60 * 1000;
  return ageInMs <= maxAgeInMs;
}

/**
 * Automatically optimizes image URLs (Cloudinary & Unsplash) with WebP auto-format,
 * compression, and target width scaling to make page loads 10x faster.
 */
export function getOptimizedImageUrl(url?: string, width: number = 800): string {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  if (url.includes('images.unsplash.com')) {
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}w=${width}&q=75&auto=format`;
  }
  return url;
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
}

/**
 * Sanitizes input strings by trimming whitespace and stripping unsafe script/HTML tags.
 */
export function sanitizeInput(input?: string): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '');
}

/**
 * Formats and restricts Ghanaian phone numbers to a maximum of 10 digits (e.g., 0241234567).
 * Converts international format (+233241234567 or 233241234567) to local 10-digit format (0241234567).
 */
export function formatGhanaPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  
  if (cleaned.startsWith('+233')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('233') && cleaned.length > 9) {
    cleaned = '0' + cleaned.slice(3);
  }
  
  const digitsOnly = cleaned.replace(/\D/g, '');
  return digitsOnly.slice(0, 10);
}

/**
 * Checks if a phone number is a valid 10-digit Ghanaian phone number starting with 0.
 */
export function isValidGhanaPhone(phone?: string): boolean {
  const formatted = formatGhanaPhone(phone);
  return /^0[0-9]{9}$/.test(formatted);
}

export function getPricePeriodLabel(desc?: string, short: boolean = true): string {
  if (!desc) return short ? '/sem' : '/ semester';
  const lower = desc.toLowerCase();
  if (lower.includes('priceperiod: per academic year') || lower.includes('per academic year') || lower.includes('academic year')) {
    return short ? '/acad year' : '/ academic year';
  }
  if (lower.includes('priceperiod: per plot') || lower.includes('per plot')) {
    return short ? '/plot' : '/ plot';
  }
  if (lower.includes('priceperiod: per acre') || lower.includes('per acre') || lower.includes('per achre')) {
    return short ? '/acre' : '/ acre';
  }
  if (lower.includes('priceperiod: per outright sale') || lower.includes('outright sale')) {
    return short ? '' : ' (outright sale)';
  }
  if (lower.includes('priceperiod: per month') || lower.includes('priceperiod: month') || lower.includes('per month')) {
    return short ? '/month' : '/ month';
  }
  if (lower.includes('priceperiod: per year') || lower.includes('priceperiod: year') || lower.includes('per year')) {
    return short ? '/year' : '/ year';
  }
  return short ? '/sem' : '/ semester';
}

export function parsePropertyDescription(desc?: string) {
  let cleanDesc = desc || '';
  const amenities: string[] = [];

  if (!desc) {
    return { cleanDescription: '', amenities: [] };
  }

  // 1. Strip PricePeriod tag if present
  const pricePeriodIdx = cleanDesc.indexOf('PricePeriod:');
  if (pricePeriodIdx !== -1) {
    cleanDesc = cleanDesc.substring(0, pricePeriodIdx).trim();
  }

  // 2. Parse Flutter-style ||amenities:...|| format
  const amenityStartIdx = cleanDesc.indexOf('||amenities:');
  if (amenityStartIdx !== -1) {
    const endIdx = cleanDesc.indexOf('||', amenityStartIdx + 12);
    const amenitiesPart = cleanDesc.substring(amenityStartIdx + 12, endIdx !== -1 ? endIdx : undefined).trim();
    // Strip from clean description
    cleanDesc = cleanDesc.substring(0, amenityStartIdx).trim();

    // Split and map keys
    const keys = amenitiesPart.split(',').map(k => k.trim().toLowerCase());
    keys.forEach(key => {
      if (key === 'wifi') amenities.push('WiFi');
      else if (key === 'water') amenities.push('Water');
      else if (key === 'electricity') amenities.push('Prepaid');
      else if (key === 'security') amenities.push('Security');
      else if (key === 'parking') amenities.push('Parking');
      else if (key === 'bathroom') amenities.push('Bathroom');
      else if (key === 'kitchen') amenities.push('Kitchen');
      else if (key === 'furnished') amenities.push('Furnished');
      else if (key === 'ac') amenities.push('AC');
      else if (key === 'cctv') amenities.push('CCTV');
    });
  }

  // 3. Parse Web-style Features: ... format
  const featuresIdx = cleanDesc.indexOf('Features:');
  if (featuresIdx !== -1) {
    const featuresPart = cleanDesc.substring(featuresIdx + 9).trim();
    // Strip from clean description
    cleanDesc = cleanDesc.substring(0, featuresIdx).trim();

    const segments = featuresPart.split('|');
    segments.forEach(seg => {
      const trimmedSeg = seg.trim().toLowerCase();
      if (!trimmedSeg) return;

      if (trimmedSeg.startsWith('water:')) {
        amenities.push('Water');
      } else if (trimmedSeg.startsWith('electricity:')) {
        amenities.push('Prepaid');
      } else if (trimmedSeg.startsWith('amenities:')) {
        const items = trimmedSeg.replace('amenities:', '').split(',');
        items.forEach(item => {
          const name = item.trim();
          if (name.includes('wifi') || name.includes('wi-fi')) {
            if (!amenities.includes('WiFi')) amenities.push('WiFi');
          } else if (name.includes('cctv')) {
            if (!amenities.includes('CCTV')) amenities.push('CCTV');
          } else if (name.includes('furnished')) {
            if (!amenities.includes('Furnished')) amenities.push('Furnished');
          } else if (name.includes('security') || name.includes('gated') || name.includes('fenced')) {
            if (!amenities.includes('Security')) amenities.push('Security');
          } else if (name.includes('parking') || name.includes('car')) {
            if (!amenities.includes('Parking')) amenities.push('Parking');
          } else if (name.includes('ac') || name.includes('air condition')) {
            if (!amenities.includes('AC')) amenities.push('AC');
          } else if (name.includes('bed') || name.includes('room') || name.includes('desk') || name.includes('hostel')) {
            if (!amenities.includes('Bed/Room')) amenities.push('Bed/Room');
          }
        });
      }
    });
  }

  // 4. Fallback Keyword detection (if no structured format or amenities list is empty)
  if (amenities.length === 0) {
    const lower = desc.toLowerCase();
    if (lower.includes('wifi') || lower.includes('wi-fi')) amenities.push('WiFi');
    if (lower.includes('water')) amenities.push('Water');
    if (lower.includes('prepaid') || lower.includes('meter')) amenities.push('Prepaid');
    if (lower.includes('security') || lower.includes('fenced') || lower.includes('gated')) amenities.push('Security');
    if (lower.includes('parking') || lower.includes('car')) amenities.push('Parking');
    if (lower.includes('cctv')) amenities.push('CCTV');
    if (lower.includes('ac') || lower.includes('air condition')) amenities.push('AC');
    if (lower.includes('furnished') || lower.includes('bed') || lower.includes('room') || lower.includes('desk')) {
      amenities.push('Furnished');
    }
  }

  // Deduplicate and filter empty values
  const uniqueAmenities = Array.from(new Set(amenities)).filter(Boolean);

  return {
    cleanDescription: cleanDesc,
    amenities: uniqueAmenities
  };
}

export interface AdvancedFilters {
  waterTypes: string[];
  meterTypes: string[];
  amenities: string[];
}

export function matchesAdvancedFilters(desc?: string, filters?: AdvancedFilters): boolean {
  if (!filters) return true;
  const { waterTypes = [], meterTypes = [], amenities = [] } = filters;
  if (waterTypes.length === 0 && meterTypes.length === 0 && amenities.length === 0) {
    return true;
  }
  const text = (desc || '').toLowerCase();

  // 1. Water Supply Check
  if (waterTypes.length > 0) {
    const matchesWater = waterTypes.some((w) => {
      const wLower = w.toLowerCase();
      if (wLower.includes('ghana water')) return text.includes('ghana water');
      if (wLower.includes('polytank')) return text.includes('polytank');
      if (wLower.includes('borehole')) return text.includes('borehole');
      if (wLower.includes('well')) return text.includes('well');
      return text.includes(wLower);
    });
    if (!matchesWater) return false;
  }

  // 2. Electricity & Metering Check
  if (meterTypes.length > 0) {
    const matchesMeter = meterTypes.some((m) => {
      const mLower = m.toLowerCase();
      if (mLower.includes('prepaid')) return text.includes('prepaid');
      if (mLower.includes('postpaid') || mLower.includes('separate')) {
        return text.includes('postpaid') || text.includes('post-paid') || text.includes('separate meter');
      }
      if (mLower.includes('shared')) return text.includes('shared meter') || text.includes('shared');
      return text.includes(mLower);
    });
    if (!matchesMeter) return false;
  }

  // 3. Amenities Check (Must match all selected amenities)
  if (amenities.length > 0) {
    const matchesAllAmenities = amenities.every((a) => {
      const aLower = a.toLowerCase();
      if (aLower.includes('wifi')) return text.includes('wifi') || text.includes('wi-fi');
      if (aLower.includes('ac') || aLower.includes('air condition')) return text.includes('ac') || text.includes('air condition');
      if (aLower.includes('desk')) return text.includes('desk') || text.includes('study');
      if (aLower.includes('furnished')) return text.includes('furnished');
      if (aLower.includes('cctv')) return text.includes('cctv');
      if (aLower.includes('gated') || aLower.includes('fenced')) return text.includes('gated') || text.includes('fenced') || text.includes('security');
      if (aLower.includes('parking')) return text.includes('parking') || text.includes('car');
      return text.includes(aLower);
    });
    return matchesAllAmenities;
  }

  return true;
}

/**
 * Transforms raw database, network, or server stack traces into clean, human-friendly error messages.
 */
export function getFriendlyErrorMessage(err: unknown, defaultMsg: string = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return defaultMsg;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Can't reach database server") || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED') || msg.includes('Failed to fetch')) {
    return '📶 Temporary network error: Unable to reach database server. Please check your internet connection and refresh.';
  }
  if (msg.includes('Prisma') || msg.includes('TURBOPACK') || msg.includes('invocation')) {
    return '⚠️ Temporary server connection issue. Please refresh the page in a moment.';
  }
  return msg;
}
