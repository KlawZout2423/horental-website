export interface SaaSProperty {
  id: number;
  title: string;
  location: string;
  price: number;
  period: string; // 'month' | 'year' | 'day'
  type: string; // 'Apartment' | 'House' | 'Commercial' | 'Short Stay'
  status: 'available' | 'pending_verification' | 'rented' | 'flagged';
  landlordName: string;
  landlordPhone: string;
  isVerified: boolean;
  featured: boolean;
  views: number;
  leads: number;
  imageUrl: string;
  createdAt: string;
}

export interface SaaSLead {
  id: number;
  customerName: string;
  customerPhone: string;
  propertyTitle: string;
  propertyId: number;
  actionType: 'whatsapp' | 'call' | 'inquiry';
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in GHS
  billingCycle: 'monthly' | 'yearly';
  propertyLimit: number; // -1 for unlimited
  featuredLimit: number;
  verificationIncluded: boolean;
  whatsappBoost: boolean;
  popular?: boolean;
}

export interface SaaSUserMetrics {
  totalProperties: number;
  activeListings: number;
  pendingVerifications: number;
  totalLeads: number;
  conversionRate: string;
  revenueGenerated: number;
  currentPlan: string;
  planExpiry: string;
}

export const MOCK_SAAS_METRICS: SaaSUserMetrics = {
  totalProperties: 18,
  activeListings: 14,
  pendingVerifications: 3,
  totalLeads: 142,
  conversionRate: '12.4%',
  revenueGenerated: 8500,
  currentPlan: 'Pro Agent Tier',
  planExpiry: '2026-12-31',
};

export const MOCK_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Starter Landlord',
    price: 0,
    billingCycle: 'monthly',
    propertyLimit: 2,
    featuredLimit: 0,
    verificationIncluded: false,
    whatsappBoost: false,
  },
  {
    id: 'pro_agent',
    name: 'Pro Agent Plan',
    price: 150,
    billingCycle: 'monthly',
    propertyLimit: 15,
    featuredLimit: 3,
    verificationIncluded: true,
    whatsappBoost: true,
    popular: true,
  },
  {
    id: 'agency_ultra',
    name: 'Agency Enterprise',
    price: 450,
    billingCycle: 'monthly',
    propertyLimit: -1, // unlimited
    featuredLimit: 10,
    verificationIncluded: true,
    whatsappBoost: true,
  },
];

export const MOCK_SAAS_PROPERTIES: SaaSProperty[] = [
  {
    id: 101,
    title: 'Luxury 3-Bedroom Executive Apartment',
    location: 'East Legon, Accra',
    price: 4500,
    period: 'month',
    type: 'Apartment',
    status: 'available',
    landlordName: 'Kwame Mensah',
    landlordPhone: '+233 24 123 4567',
    isVerified: true,
    featured: true,
    views: 420,
    leads: 28,
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-08-20',
  },
  {
    id: 102,
    title: 'Modern Commercial Office Space',
    location: 'Airport Residential Area, Accra',
    price: 8000,
    period: 'month',
    type: 'Commercial',
    status: 'available',
    landlordName: 'Abena Osei',
    landlordPhone: '+233 20 987 6543',
    isVerified: true,
    featured: false,
    views: 310,
    leads: 19,
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-08-22',
  },
  {
    id: 103,
    title: 'Cozy 1-Bedroom Furnished Studio',
    location: 'Osu, Accra',
    price: 1800,
    period: 'month',
    type: 'Short Stay',
    status: 'pending_verification',
    landlordName: 'Kofi Addo',
    landlordPhone: '+233 55 444 3322',
    isVerified: false,
    featured: false,
    views: 85,
    leads: 4,
    imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-08-26',
  },
  {
    id: 104,
    title: 'Spacious 4-Bedroom Gated Villa with Pool',
    location: 'Cantonments, Accra',
    price: 12000,
    period: 'month',
    type: 'House',
    status: 'rented',
    landlordName: 'Ebenezer Appiah',
    landlordPhone: '+233 24 555 6677',
    isVerified: true,
    featured: true,
    views: 890,
    leads: 64,
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-08-10',
  },
  {
    id: 105,
    title: 'Affordable 2-Bedroom Apartment',
    location: 'Spintex Road, Accra',
    price: 2200,
    period: 'month',
    type: 'Apartment',
    status: 'flagged',
    landlordName: 'Samuel Boateng',
    landlordPhone: '+233 27 111 2233',
    isVerified: false,
    featured: false,
    views: 140,
    leads: 2,
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    createdAt: '2026-08-25',
  },
];

export const MOCK_SAAS_LEADS: SaaSLead[] = [
  {
    id: 1,
    customerName: 'Daniel Owusu',
    customerPhone: '+233 24 888 9900',
    propertyTitle: 'Luxury 3-Bedroom Executive Apartment',
    propertyId: 101,
    actionType: 'whatsapp',
    status: 'new',
    createdAt: '2026-08-27 13:40',
  },
  {
    id: 2,
    customerName: 'Grace Ansah',
    customerPhone: '+233 50 123 7788',
    propertyTitle: 'Modern Commercial Office Space',
    propertyId: 102,
    actionType: 'call',
    status: 'contacted',
    createdAt: '2026-08-27 11:15',
  },
  {
    id: 3,
    customerName: 'Francis Kwarteng',
    customerPhone: '+233 26 999 1122',
    propertyTitle: 'Cozy 1-Bedroom Furnished Studio',
    propertyId: 103,
    actionType: 'inquiry',
    status: 'new',
    createdAt: '2026-08-26 18:05',
  },
];
