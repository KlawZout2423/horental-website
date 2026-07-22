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
}

export interface RegisterInput {
  name: string;
  phone: string;
  password: string;
  email?: string;
}

export function getPricePeriodLabel(desc?: string, short: boolean = true): string {
  if (!desc) return short ? '/sem' : '/ semester';
  const lower = desc.toLowerCase();
  if (lower.includes('priceperiod: per month') || lower.includes('priceperiod: month') || lower.includes('per month')) {
    return short ? '/month' : '/ month';
  }
  if (lower.includes('priceperiod: per year') || lower.includes('priceperiod: year') || lower.includes('per year')) {
    return short ? '/year' : '/ year';
  }
  return short ? '/sem' : '/ semester';
}
