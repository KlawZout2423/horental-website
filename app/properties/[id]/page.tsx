'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { ChevronLeft, ChevronRight, MapPin, ArrowLeft, Phone, Mail, MessageSquare, Loader, CheckCircle2, Calendar, Clock, FileText, Flag, X, Share2, Maximize2, Navigation, Car } from 'lucide-react';
import { graphqlRequest, GET_PROPERTY_BY_ID, UPDATE_PROPERTY, CREATE_REPORT } from '../../../lib/graphql';
import { trackVisit } from '../../../lib/trackVisit';
import styles from './detail.module.css';
import AuthPromptModal from '../../../components/AuthPromptModal';
import Toast from '../../../components/Toast';
import { getPricePeriodLabel, formatGhanaPhone, isValidGhanaPhone, sanitizeInput, getOptimizedImageUrl, parsePropertyDescription } from '../../../lib/types';

interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  order?: number;
}

interface PropertyOwner {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Property {
  id: string;
  title: string;
  type: string;
  status: string;
  price: number;
  location: string;
  digitalAddress?: string;
  landmarks?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  contact: string;
  imageUrl: string;
  createdAt: string;
  owner?: PropertyOwner;
  gallery?: GalleryItem[];
  landlordName?: string;
}

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Gallery slider state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = React.useRef<number | null>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const handleNextLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!property?.gallery || property.gallery.length <= 1) return;
    const slidesList = property.gallery.map((g: GalleryItem) => g.url);
    setLightboxIndex((prev) => (prev + 1) % slidesList.length);
  };

  const handlePrevLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!property?.gallery || property.gallery.length <= 1) return;
    const slidesList = property.gallery.map((g: GalleryItem) => g.url);
    setLightboxIndex((prev) => (prev - 1 + slidesList.length) % slidesList.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEndLightbox = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextLightbox();
      } else {
        handlePrevLightbox();
      }
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    const galLen = property?.gallery?.length || 0;
    if (!isLightboxOpen || galLen === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => (prev + 1) % galLen);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => (prev - 1 + galLen) % galLen);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, property]);




  // Connect & Audit States
  const [isLoggingContact, setIsLoggingContact] = useState(false);

  // Report Listing & Toast states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect Price');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      const parsedId = parseInt(id, 10);
      await graphqlRequest(CREATE_REPORT, {
        propertyId: isNaN(parsedId) ? 0 : parsedId,
        reason: reportReason,
        details: reportDetails || null,
      });
      setReportSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit report via API, fallback to UI acknowledgement:', err);
      setReportSubmitted(true);
    } finally {
      setIsSubmittingReport(false);
    }
  };


  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setToastMsg('Property link copied to clipboard! 📋');
    }
  };

  const [isBookingRide, setIsBookingRide] = useState(false);

  const getUserLiveLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return resolve(null);
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          resolve(`https://maps.google.com/?q=${lat},${lng}`);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 }
      );
    });
  };

  const handleYuyuRideClick = async () => {
    if (!property?.id) return;

    setIsBookingRide(true);

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const yuyuNumber = '233557922593';

    // Pre-open blank tab on desktop to bypass browser popup blockers
    let win: Window | null = null;
    if (!isMobile && typeof window !== 'undefined') {
      try {
        win = window.open('about:blank', '_blank');
      } catch {
        // Popup blocked
      }
    }

    try {
      // Attempt to retrieve user's live GPS coordinates (3.5s timeout fallback)
      const livePickup = await getUserLiveLocation();
      
      const res = await fetch('/api/rides/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: parseInt(property.id, 10),
          tenantName: user?.name || 'Guest Tenant',
          tenantPhone: user?.phone || '',
          userId: user?.id ? parseInt(user.id, 10) : undefined,
          pickupLocation: livePickup || undefined,
        }),
      });

      let targetUrl = '';
      if (res.ok) {
        const data = await res.json();
        targetUrl = isMobile && data?.whatsappAppUrl ? data.whatsappAppUrl : (data?.whatsappUrl || '');
      }

      if (!targetUrl) {
        const msgText = `Hi Yuyu Rides! 🚗 I'd like to request a ride to inspect a property listed on HO Rentals:\n\n🏠 Property: ${property.title}\n📍 Property Location: ${property.location}${livePickup ? `\n📍 Pickup / GPS: ${livePickup}` : ''}\n📍 I will add my live location now`;
        const encoded = encodeURIComponent(msgText);
        targetUrl = isMobile ? `whatsapp://send?phone=${yuyuNumber}&text=${encoded}` : `https://wa.me/${yuyuNumber}?text=${encoded}`;
      }

      if (isMobile) {
        window.location.href = targetUrl;
      } else if (win && !win.closed) {
        win.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }
    } catch (err) {
      console.error('Failed to log Yuyu ride referral:', err);
      const fallbackText = encodeURIComponent(`Hi Yuyu Rides! 🚗 I'd like to request a ride to inspect a property listed on HO Rentals:\n\n🏠 Property: ${property.title}\n📍 Property Location: ${property.location}\n📍 I will add my live location now`);
      const targetUrl = isMobile ? `whatsapp://send?phone=${yuyuNumber}&text=${fallbackText}` : `https://wa.me/${yuyuNumber}?text=${fallbackText}`;
      if (isMobile) {
        window.location.href = targetUrl;
      } else if (win && !win.closed) {
        win.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank');
      }
    } finally {
      setIsBookingRide(false);
    }
  };

  const handleConnectClick = async (actionType: 'call' | 'whatsapp' | 'sms') => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    const isOwnerOrAdmin = user && (user.role === 'admin' || user.id === property?.owner?.id);

    if (!isOwnerOrAdmin && property?.id) {
      try {
        const landlordPhone = property?.contact || '';
        const query = `
          mutation CreateContactLog($customerName: String!, $customerPhone: String!, $actionType: String!, $propertyId: Int!, $landlordPhone: String!) {
            createContactLog(customerName: $customerName, customerPhone: $customerPhone, actionType: $actionType, propertyId: $propertyId, landlordPhone: $landlordPhone) {
              id
            }
          }
        `;
        
        // Asynchronously log lead without blocking the user's action
        graphqlRequest(query, {
          customerName: user ? (user.name || 'Registered Customer') : 'Online Prospect (Guest)',
          customerPhone: user?.phone || 'Direct Web Click',
          actionType: actionType,
          propertyId: parseInt(property.id, 10),
          landlordPhone
        }).catch((err) => console.warn('Contact logging notice:', err));
      } catch (err: any) {
        console.warn('Contact logging notice:', err);
      }
    }

    try {
      const landlordPhone = property?.contact || '';
      const cleanPhone = landlordPhone.replace(/[^0-9]/g, '');

      if (actionType === 'call') {
        window.location.href = `tel:${cleanPhone}`;
      } else if (actionType === 'sms') {
        const price = `GH₵${property!.price.toLocaleString()} ${getPricePeriodLabel(property!.description, false)}`;
        const isAgentListing = property!.owner?.role === 'agent';
        const rawPhone = property!.contact ? property!.contact.replace(/[^0-9+]/g, '') : '';
        const targetPhone = isAgentListing && rawPhone ? rawPhone : '+233204940602';

        const msg = isAgentListing
          ? `Hello Agent ${property!.owner?.name || ''},\n\nI am interested in your property listed on HO Rentals:\n\n📌 ${property!.title}\n📍 ${property!.location}\n💰 ${price}\n🆔 ID: #${property!.id}\n\nI would like to arrange a viewing.`
          : `Hello HO Rentals,\n\nI am interested in:\n\n📌 ${property!.title}\n📍 ${property!.location}\n💰 ${price}\n🆔 ID: #${property!.id}`;

        window.location.href = `sms:${targetPhone}?body=${encodeURIComponent(msg)}`;
      } else {
        // Agent listings go directly to Agent's WhatsApp, Landlord listings go to HO Rentals
        const price = `GH₵${property!.price.toLocaleString()} ${getPricePeriodLabel(property!.description, false)}`;
        const isAgentListing = property!.owner?.role === 'agent';

        if (isAgentListing && cleanPhone) {
          const formattedAgentWa = cleanPhone.startsWith('0')
            ? '233' + cleanPhone.slice(1)
            : cleanPhone.startsWith('233')
              ? cleanPhone
              : '233' + cleanPhone;

          const msg = encodeURIComponent(
            `Hello Agent ${property!.owner?.name || ''},\n\nI am interested in your property listed on HO Rentals:\n\n` +
            `📌 *${property!.title}*\n` +
            `📍 Location: ${property!.location}\n` +
            `💰 Price: ${price}\n` +
            `🆔 Listing ID: #${property!.id}\n\n` +
            `I would like to arrange a viewing.`
          );
          window.open(`https://wa.me/${formattedAgentWa}?text=${msg}`, '_blank');
        } else {
          const msg = encodeURIComponent(
            `Hello HO Rentals,\n\nI am interested in the following property listed on your platform:\n\n` +
            `📌 *${property!.title}*\n` +
            `📍 Location: ${property!.location}\n` +
            `💰 Price: ${price}\n` +
            `🆔 Listing ID: #${property!.id}`
          );
          window.open(`https://wa.me/233204940602?text=${msg}`, '_blank');
        }
      }
    } catch (err: any) {
      console.error('Failed to open contact method:', err);
    }
  };



  useEffect(() => {
    async function loadPropertyDetails() {
      try {
        const data = await graphqlRequest<{ property: Property }>(GET_PROPERTY_BY_ID, { id: parseInt(id, 10) });
        if (data && data.property) {
          setProperty(data.property);
        } else {
          setError('Property not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    }
    loadPropertyDetails();

    // Log unique page visit with UTM + referrer (24h cooldown per property)
    trackVisit(`/properties/${id}`, `visit_detail_timestamp_${id}`);
  }, [id]);

  if (loading) {
    return (
      <div className={styles.container} style={{ opacity: 0.7 }}>
        <div style={{ width: '120px', height: '20px', background: 'var(--border)', borderRadius: '4px', marginBottom: '24px' }}></div>
        <div className={styles.layout}>
          <div>
            <div className={styles.carousel} style={{ background: 'var(--border)', height: '480px' }}></div>
            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '30%', height: '24px', background: 'var(--border)', borderRadius: '12px' }}></div>
              <div style={{ width: '70%', height: '36px', background: 'var(--border)', borderRadius: '6px' }}></div>
              <div style={{ width: '40%', height: '20px', background: 'var(--border)', borderRadius: '4px' }}></div>
              <div style={{ width: '25%', height: '54px', background: 'var(--border)', borderRadius: '12px', marginTop: '12px' }}></div>
            </div>
          </div>
          <div className={styles.sidebarCard} style={{ height: '380px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div style={{ width: '60%', height: '24px', background: 'var(--border)', borderRadius: '4px', marginBottom: '24px' }}></div>
            <div style={{ width: '100%', height: '48px', background: 'var(--border)', borderRadius: '24px', marginBottom: '12px' }}></div>
            <div style={{ width: '100%', height: '48px', background: 'var(--border)', borderRadius: '24px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className={styles.container}>
        <div className="card glass" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '40px' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Something Went Wrong</h2>
          <p style={{ color: 'var(--text-secondary)' }}>{error || 'We could not find the property you are looking for.'}</p>
          <Link href="/properties" className="btn btn-primary">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  // Compile image gallery slides
  const slides = [
    property.imageUrl,
    ...(property.gallery ? [...property.gallery].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((g) => g.url) : [])
  ].filter(Boolean);

  const handlePrevSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveImageIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const maskPhoneNumber = (phoneStr?: string) => {
    if (!phoneStr) return '024 ••• ••••';
    const formatted = formatGhanaPhone(phoneStr);
    if (formatted.length === 10) {
      return `${formatted.slice(0, 3)} ${formatted.slice(3, 6)} ••••`;
    }
    return '024 ••• ••••';
  };

  const getFallbackImage = (type: string) => {
    if (type.toLowerCase() === 'hostel') {
      return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';
  };


  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* Back Button & Share */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <Link href="/properties" className={styles.backButton} style={{ marginBottom: 0 }}>
          <ArrowLeft size={16} /> Back to Listings
        </Link>
        <button
          onClick={handleShare}
          className="btn btn-outline"
          style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, gap: '6px' }}
        >
          <Share2 size={14} /> Share Listing
        </button>
      </div>

      <div className={styles.layout}>
        {/* Main Details Area */}
        <div>
          {/* Gallery Carousel */}
          {slides.length > 0 ? (
            <div>
              <div
                className={styles.carousel}
                onClick={() => openLightbox(activeImageIndex)}
                style={{ cursor: 'zoom-in' }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEndLightbox}
              >
                <img
                  src={getOptimizedImageUrl(slides[activeImageIndex], 1000)}
                  alt=""
                  className={styles.slideBlurBg}
                  aria-hidden="true"
                />
                <img
                  src={getOptimizedImageUrl(slides[activeImageIndex], 1000)}
                  alt={`${property.title} - Image ${activeImageIndex + 1}`}
                  className={styles.slide}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />

                <div className={styles.zoomHint}>
                  <Maximize2 size={13} /> Full View
                </div>
                
                {slides.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrevSlide(e); }}
                      className={`${styles.carouselNav} ${styles.carouselPrev}`}
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleNextSlide(e); }}
                      className={`${styles.carouselNav} ${styles.carouselNext}`}
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                    <div className={styles.carouselIndicators} onClick={(e) => e.stopPropagation()}>
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`${styles.indicator} ${idx === activeImageIndex ? styles.activeIndicator : ''}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {slides.length > 1 && (
                <div className={styles.thumbnails}>
                  {slides.map((slide, idx) => (
                    <div
                      key={idx}
                      onClick={() => openLightbox(idx)}
                      className={`${styles.thumbnailWrapper} ${idx === activeImageIndex ? styles.activeThumbnail : ''}`}
                      title="Click to view full image"
                    >
                      <img
                        src={getOptimizedImageUrl(slide, 200)}
                        alt="thumbnail"
                        className={styles.thumbnailImage}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.carousel} onClick={() => openLightbox(0)} style={{ cursor: 'zoom-in' }}>
              <img src={getFallbackImage(property.type)} alt={property.title} className={styles.slide} />
              <div className={styles.zoomHint}>
                <Maximize2 size={13} /> Full View
              </div>
            </div>
          )}

          {/* Details sections */}
          <div className={styles.detailsSection}>
            <div className={styles.header}>
              <div className={styles.badges}>
                <span className="badge badge-primary">{property.type}</span>
                <span className={`badge badge-${property.status === 'available' ? 'available' : 'rented'}`}>
                  {property.status}
                </span>
              </div>
              <h1 className={styles.titleText}>{property.title}</h1>
              <div className={styles.location}>
                <MapPin size={16} style={{ color: 'var(--primary)' }} />
                <span>{property.location}</span>
              </div>
            </div>

            {/* Price badge */}
            <div className={styles.priceBlock}>
              <span className={styles.priceVal}>GH₵{property.price.toLocaleString()}</span>
              <span className={styles.priceUnit}>{getPricePeriodLabel(property.description, false)}</span>
            </div>

            {/* Description & Features box */}
            {(() => {
              const rawDesc = property.description || '';
              const { cleanDescription, specs: parsedSpecs } = parsePropertyDescription(rawDesc);
              
              // Strip PricePeriod suffix if present
              let cleanText = rawDesc;
              const pricePeriodIdx = cleanText.indexOf('PricePeriod:');
              if (pricePeriodIdx !== -1) {
                cleanText = cleanText.substring(0, pricePeriodIdx).trim();
              }

              const featuresIdx = cleanText.indexOf('Features:');
              let mainDesc = cleanDescription || cleanText;
              if (featuresIdx !== -1 && !cleanDescription) {
                mainDesc = cleanText.substring(0, featuresIdx).trim();
              }

              const water: string[] = [];
              const electricity: string[] = [];
              const amenities: string[] = [];
              const landSpecs: string[] = [];
              const furnSpecs: string[] = [];
              const other: string[] = [];

              const sanitizeFeatureText = (text: string) => {
                return text
                  .replace(/(?:Rooms Available|Advance Required|Available From|Rooms|Advance period|Available from):\s*[^|,\n.]+\.?,?/gi, '')
                  .replace(/\s+/g, ' ')
                  .trim();
              };

              if (featuresIdx !== -1) {
                const featuresPart = cleanText.substring(featuresIdx + 'Features:'.length).trim();
                const segments = featuresPart.split('|');

                segments.forEach((seg) => {
                  const trimmedSeg = seg.trim();
                  if (!trimmedSeg) return;

                  // Skip terms/specs segments (handled by Quick Specs cards above)
                  if (/^(?:Rooms Available|Advance Required|Available From|Rooms|Advance period|Available from):/i.test(trimmedSeg)) {
                    return;
                  }

                  if (trimmedSeg.startsWith('Water:')) {
                    const items = trimmedSeg.replace('Water:', '').split(',');
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) water.push(cleaned); });
                  } else if (trimmedSeg.startsWith('Electricity:')) {
                    const items = trimmedSeg.replace('Electricity:', '').split(',');
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) electricity.push(cleaned); });
                  } else if (trimmedSeg.startsWith('Amenities:')) {
                    const items = trimmedSeg.replace('Amenities:', '').split(',');
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) amenities.push(cleaned); });
                  } else if (trimmedSeg.startsWith('Land Specs:')) {
                    const items = trimmedSeg.replace('Land Specs:', '').split(',');
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) landSpecs.push(cleaned); });
                  } else if (trimmedSeg.startsWith('Furniture Specs:')) {
                    const items = trimmedSeg.replace('Furniture Specs:', '').split(',');
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) furnSpecs.push(cleaned); });
                  } else if (!trimmedSeg.toLowerCase().includes('priceperiod')) {
                    const items = trimmedSeg.includes(':') ? trimmedSeg.split(':')[1]?.split(',') || [trimmedSeg] : [trimmedSeg];
                    items.forEach((i) => { const cleaned = sanitizeFeatureText(i); if (cleaned) other.push(cleaned); });
                  }
                });
              }

              // Fallback keyword detection if no structured features block
              if (water.length === 0 && electricity.length === 0 && amenities.length === 0 && landSpecs.length === 0 && furnSpecs.length === 0 && other.length === 0) {
                const lower = rawDesc.toLowerCase();
                if (lower.includes('wifi') || lower.includes('wi-fi')) amenities.push('High-Speed WiFi');
                if (lower.includes(' ac ') || lower.includes('air conditioning') || lower.includes('a/c')) amenities.push('Air Conditioning (AC)');
                if (lower.includes('cctv')) amenities.push('CCTV Camera');
                if (lower.includes('furnished')) amenities.push('Furnished');
                if (lower.includes('fenced') || lower.includes('gated')) amenities.push('Gated & Fenced');
                if (lower.includes('newly built')) amenities.push('Newly Built');
                if (lower.includes('bed')) amenities.push('Bed Included');
                if (lower.includes('desk')) amenities.push('Study Desk');
                if (lower.includes('kitchen (private)') || lower.includes('private kitchen')) amenities.push('Kitchen (Private)');
                if (lower.includes('kitchen (shared)') || lower.includes('shared kitchen')) amenities.push('Kitchen (Shared)');
                if (lower.includes('bathroom (private)') || lower.includes('private bathroom')) amenities.push('Bathroom (Private)');
                if (lower.includes('bathroom (shared)') || lower.includes('shared bathroom')) amenities.push('Bathroom (Shared)');
                if (lower.includes('balcony') || lower.includes('veranda')) amenities.push('Balcony / Veranda');
                
                if (lower.includes('ghana water')) water.push('Ghana Water Supply');
                if (lower.includes('polytank')) water.push('Polytank Water');
                if (lower.includes('borehole')) water.push('Borehole Water');
                if (lower.includes('well')) water.push('Well Water');
                
                if (lower.includes('prepaid')) electricity.push('ECG Prepaid Meter');
                if (lower.includes('postpaid') || lower.includes('post-paid')) electricity.push('ECG Post-Paid');
                if (lower.includes('shared meter')) electricity.push('ECG Shared Meter');
              }

              const isAccommodation = !property.type?.toLowerCase().includes('land') && !property.type?.toLowerCase().includes('furniture');

              const cleanWater = Array.from(new Set(water.filter(Boolean)));
              const cleanElectricity = Array.from(new Set(electricity.filter(Boolean)));
              const cleanAmenities = Array.from(new Set(amenities.filter(Boolean)));
              const cleanOther = Array.from(new Set(other.filter(Boolean)));

              const hasAnyFeatures = cleanWater.length > 0 || cleanElectricity.length > 0 || cleanAmenities.length > 0 || landSpecs.length > 0 || furnSpecs.length > 0 || cleanOther.length > 0;

              return (
                <>
                  {/* Quick Rental Specifications Cards Grid */}
                  {isAccommodation && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      {/* Meter Type Card */}
                      <div style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ color: '#D97706', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ⚡ Electricity Meter
                        </span>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {parsedSpecs.meterType || (cleanElectricity[0] || 'ECG Prepaid')}
                        </span>
                      </div>

                      {/* Rooms Available Card */}
                      <div style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ color: '#2563EB', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          🛏️ Rooms Available
                        </span>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {parsedSpecs.rooms ? `${parsedSpecs.rooms} ${parsedSpecs.rooms === '1' ? 'Room' : 'Rooms'}` : '1 Room'}
                        </span>
                      </div>

                      {/* Advance Required Card */}
                      <div style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ color: '#059669', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ⏳ Advance Required
                        </span>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {parsedSpecs.advance || '1 Year'}
                        </span>
                      </div>

                      {/* Available From Card */}
                      <div style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ color: '#7C3AED', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          📅 Available From
                        </span>
                        <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {parsedSpecs.availableFrom || 'Immediately'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={styles.descriptionBox}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.descriptionText}>
                      {mainDesc || 'No description provided by the landlord.'}
                    </p>
                  </div>

                  {hasAnyFeatures && (
                    <div className={styles.descriptionBox} style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                      <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Key Features & Specifications</h3>
                      
                      {/* Category Specifications (Lands / Furnitures / Shops) */}
                      {(landSpecs.length > 0 || furnSpecs.length > 0) && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            📋 Category Specifications & Details
                          </h4>
                          <div className={styles.featuresGrid}>
                            {[...landSpecs, ...furnSpecs].map((item, idx) => (
                              <div key={idx} className={styles.featureCard} style={{ backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)' }}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: '#F59E0B' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Water Supply */}
                      {cleanWater.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            💧 Water Supply & Facilities
                          </h4>
                          <div className={styles.featuresGrid}>
                            {cleanWater.map((item, idx) => (
                              <div key={idx} className={styles.featureCard}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: '#0EA5E9' }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Electricity & Metering */}
                      {cleanElectricity.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            ⚡ Electricity & Metering
                          </h4>
                          <div className={styles.featuresGrid}>
                            {cleanElectricity.map((item, idx) => (
                              <div key={idx} className={styles.featureCard}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: '#F59E0B' }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comfort & General Amenities */}
                      {(cleanAmenities.length > 0 || cleanOther.length > 0) && (
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            ✨ Comforts & Security
                          </h4>
                          <div className={styles.featuresGrid}>
                            {Array.from(new Set([...cleanAmenities, ...cleanOther])).map((item, idx) => (
                              <div key={idx} className={styles.featureCard}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: 'var(--primary)' }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Location & Directions Section */}
                  <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <MapPin size={18} style={{ color: 'var(--primary)' }} /> Location & Directions Guide
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Neighborhood / Area</span>
                          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{property.location}</p>
                        </div>
                        {property.digitalAddress && (
                          <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, border: '1px solid var(--primary-border)' }}>
                            🇬🇭 {property.digitalAddress}
                          </span>
                        )}
                      </div>

                      {property.landmarks && (
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Landmarks / Directions</span>
                          <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{property.landmarks}</p>
                        </div>
                      )}

                      {/* Directions & Ride Booking Buttons */}
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <a
                          href={
                            property.latitude && property.longitude
                              ? `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location + ', Ho, Ghana')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '12px 18px', fontSize: '0.88rem', fontWeight: 700, gap: '10px', width: '100%', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary)', borderRadius: 'var(--radius-md)' }}
                        >
                          <Navigation size={18} /> 🧭 Get Turn-by-Turn Directions in Google Maps
                        </a>

                        {property.owner?.role !== 'agent' && (
                          <button
                            onClick={handleYuyuRideClick}
                            disabled={isBookingRide}
                            className="btn"
                            style={{
                              padding: '12px 18px',
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              gap: '10px',
                              width: '100%',
                              justifyContent: 'center',
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            {isBookingRide ? <Loader size={18} className="animate-spin" /> : <Car size={18} />}
                            Request Yuyu Ride
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Report Listing Button */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listing ID: #{property.id}</span>
                    <button
                      onClick={() => {
                        setReportSubmitted(false);
                        setShowReportModal(true);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Flag size={13} style={{ color: 'var(--danger)' }} /> Report Listing
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Sidebar contact widget */}
        <aside className={styles.sidebarCard}>
          {(() => {
            const isFurniture = property.type?.toLowerCase().includes('furniture');
            return (
              <>
                <h3 className={styles.sidebarCardTitle}>
                  {property.owner?.role === 'agent' ? 'Contact Agent' : (isFurniture ? 'Contact Owner' : 'Contact Landlord')}
                </h3>
                
                <div className={styles.landlordInfo}>
                  {property.landlordName ? (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {property.owner?.role === 'agent' ? 'Listed By Agent' : (isFurniture ? 'Owner Name' : 'Landlord Name')}
                      </span>
                      <span className={styles.infoValue}>{property.landlordName}</span>
                    </div>
                  ) : (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>
                        {property.owner?.role === 'agent' ? 'Agent' : (isFurniture ? 'Owner' : 'Landlord / Owner')}
                      </span>
                      <span className={styles.infoValue}>{property.owner?.name || 'HO Rentals Verified'}</span>
                    </div>
                  )}

                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone Contact</span>
                    <span className={styles.infoValue}>{maskPhoneNumber(property.contact)}</span>
                  </div>

                  {property.owner?.role === 'agent' && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <Link
                        href={`/agents/${property.owner.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-surface-secondary)',
                          border: '1px solid var(--border)',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <span>🏢 Listed by Agent: <strong>{property.owner.name}</strong></span>
                        <span style={{ color: 'var(--primary)', fontSize: '0.78rem' }}>View Profile &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>

                <div className={styles.contactActions}>
                  <button 
                    onClick={() => handleConnectClick('call')} 
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'var(--primary)', fontWeight: 700 }}
                  >
                    <Phone size={16} /> {property.owner?.role === 'agent' ? 'Call Agent' : (isFurniture ? 'Call Owner' : 'Call Landlord')}
                  </button>

                  <button 
                    onClick={() => handleConnectClick('whatsapp')} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={16} /> {property.owner?.role === 'agent' ? 'WhatsApp Agent' : 'WhatsApp HO Rentals'}
                  </button>

                  <button
                    onClick={() => handleConnectClick('sms')}
                    className="btn btn-outline"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <MessageSquare size={16} /> {property.owner?.role === 'agent' ? 'SMS Agent' : 'SMS HO Rentals'}
                  </button>

                  {property.owner?.role !== 'agent' && (
                    <button
                      onClick={handleYuyuRideClick}
                      disabled={isBookingRide}
                      className="btn"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        padding: '13px 16px',
                        fontSize: '0.88rem',
                        background: 'linear-gradient(135deg, #34D399 0%, #10B981 50%, #C1121F 100%)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        marginTop: '10px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      {isBookingRide ? (
                        <Loader size={18} className="animate-spin" />
                      ) : (
                        <Car size={18} />
                      )}
                      Request Ride with Yuyu Rides
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </aside>
      </div>






      {/* Report Listing Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '440px',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <button
              onClick={() => setShowReportModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flag size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Report Listing</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listing ID: #{id}</p>
              </div>
            </div>

            {reportSubmitted ? (
              <div style={{ padding: '20px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <CheckCircle2 size={28} style={{ color: '#047857', margin: '0 auto' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#065F46' }}>Report Submitted</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Thank you for helping keep HO Rentals safe and verified. Our moderation team will inspect this listing.</p>
                <button onClick={() => setShowReportModal(false)} className="btn btn-outline" style={{ marginTop: '8px', padding: '8px 16px', fontSize: '0.85rem' }}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="form-control"
                    style={{ padding: '10px', fontSize: '0.85rem', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <option value="Incorrect Price">Incorrect Price</option>
                    <option value="Already Rented">Already Rented / Occupied / Sold</option>
                    <option value="Fake/Scam Listing">Fake or Scam Listing</option>
                    <option value="Unresponsive Number">Unresponsive Landlord Contact</option>
                    <option value="Inaccurate Photos">Inaccurate Photos / Description</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Additional Details (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide any additional context..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="form-control"
                    style={{ padding: '10px', fontSize: '0.85rem', resize: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 'bold', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {isSubmittingReport ? (
                    <>
                      <Loader size={16} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
        }}
        targetPropertyId={id}
      />

      {/* Fullscreen Image Lightbox Modal */}
      {isLightboxOpen && slides.length > 0 && (
        <div
          className={styles.lightboxOverlay}
          onClick={closeLightbox}
          role="dialog"
          aria-label="Full Image Viewer"
        >
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <span className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {slides.length}
              </span>
              <button
                onClick={closeLightbox}
                className={styles.lightboxCloseBtn}
                aria-label="Close viewer"
              >
                <X size={18} />
                <span>Close (X)</span>
              </button>
            </div>

            <div
              className={styles.lightboxImageWrapper}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEndLightbox}
            >
              {slides.length > 1 && (
                <button
                  onClick={handlePrevLightbox}
                  className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              <img
                src={slides[lightboxIndex]}
                alt={`${property?.title || 'Property'} - Full Image ${lightboxIndex + 1}`}
                className={styles.lightboxImage}
              />

              {slides.length > 1 && (
                <button
                  onClick={handleNextLightbox}
                  className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                  aria-label="Next image"
                >
                  <ChevronRight size={28} />
                </button>
              )}
            </div>

            {slides.length > 1 && (
              <div className={styles.lightboxThumbnails}>
                {slides.map((slide: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`${styles.lightboxThumb} ${idx === lightboxIndex ? styles.lightboxThumbActive : ''}`}
                  >
                    <img src={slide} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AuthPromptModal isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />

      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}
