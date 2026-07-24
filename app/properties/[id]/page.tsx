'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { ChevronLeft, ChevronRight, MapPin, ArrowLeft, Phone, Mail, MessageSquare, Loader, CheckCircle2, Calendar, Clock, FileText, Flag, X, Share2, Maximize2, Navigation } from 'lucide-react';
import { graphqlRequest, GET_PROPERTY_BY_ID, UPDATE_PROPERTY } from '../../../lib/graphql';
import styles from './detail.module.css';
import AuthPromptModal from '../../../components/AuthPromptModal';
import Toast from '../../../components/Toast';
import { getPricePeriodLabel, formatGhanaPhone, isValidGhanaPhone, sanitizeInput, getOptimizedImageUrl } from '../../../lib/types';

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



  // Reservation states
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'submitting' | 'success'>('details');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'telecel' | 'card'>('mtn');
  const [momoNumber, setMomoNumber] = useState('');

  // Connect & Audit States
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectActionType, setConnectActionType] = useState<'call' | 'whatsapp' | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isLoggingContact, setIsLoggingContact] = useState(false);

  // Viewing Appointment states
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [viewingDate, setViewingDate] = useState('');
  const [viewingTimeSlot, setViewingTimeSlot] = useState('Morning (9am - 12pm)');
  const [viewingName, setViewingName] = useState('');
  const [viewingPhone, setViewingPhone] = useState('');
  const [isBookingViewing, setIsBookingViewing] = useState(false);
  const [viewingSubmitted, setViewingSubmitted] = useState(false);

  // Report Listing & Toast states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Incorrect Price');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setToastMsg('Property link copied to clipboard! 📋');
    }
  };

  const handleBookViewingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBookingViewing(true);
    try {
      const landlordPhone = property?.contact || '';
      const formattedDate = viewingDate || 'Next available date';
      
      const message = encodeURIComponent(
        `Hi! I would like to book a physical viewing for "${property?.title}" on ${formattedDate} (${viewingTimeSlot}).\n\nName: ${viewingName}\nPhone: ${viewingPhone}`
      );

      try {
        await graphqlRequest(`
          mutation CreateContactLog($customerName: String!, $customerPhone: String!, $actionType: String!, $propertyId: Int!, $landlordPhone: String!) {
            createContactLog(customerName: $customerName, customerPhone: $customerPhone, actionType: $actionType, propertyId: $propertyId, landlordPhone: $landlordPhone) {
              id
            }
          }
        `, {
          customerName: viewingName,
          customerPhone: viewingPhone,
          actionType: 'book_viewing',
          propertyId: parseInt(id, 10),
          landlordPhone
        });
      } catch (logErr) {
        console.error('Contact log creation failed:', logErr);
      }

      setIsBookingViewing(false);
      setViewingSubmitted(true);
      if (typeof window !== 'undefined') {
        window.open(`https://wa.me/233557922593?text=${message}`, '_blank');
      }
    } catch (err) {
      console.error('Booking viewing failed:', err);
      setIsBookingViewing(false);
    }
  };

  const handleConnectClick = async (actionType: 'call' | 'whatsapp') => {
    if (user) {
      setIsLoggingContact(true);
      try {
        const landlordPhone = property?.contact || '';
        const query = `
          mutation CreateContactLog($customerName: String!, $customerPhone: String!, $actionType: String!, $propertyId: Int!, $landlordPhone: String!) {
            createContactLog(customerName: $customerName, customerPhone: $customerPhone, actionType: $actionType, propertyId: $propertyId, landlordPhone: $landlordPhone) {
              id
            }
          }
        `;
        
        await graphqlRequest(query, {
          customerName: user.name || 'Logged In User',
          customerPhone: user.phone || 'N/A',
          actionType: actionType,
          propertyId: parseInt(property!.id, 10),
          landlordPhone
        });

        const cleanPhone = landlordPhone.replace(/[^0-9]/g, '');
        if (actionType === 'call') {
          window.location.href = `tel:${cleanPhone}`;
        } else {
          window.open(`https://wa.me/${cleanPhone}?text=Hi, I am interested in your property "${property!.title}" on HO Rentals.`, '_blank');
        }
      } catch (err: any) {
        console.error('Failed to log contact audit record:', err);
        const cleanPhone = property!.contact.replace(/[^0-9]/g, '');
        if (actionType === 'call') {
          window.location.href = `tel:${cleanPhone}`;
        } else {
          window.open(`https://wa.me/${cleanPhone}`, '_blank');
        }
      } finally {
        setIsLoggingContact(false);
      }
    } else {
      setShowAuthPrompt(true);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setIsLoggingContact(true);
    try {
      const landlordPhone = property.contact || '';
      const query = `
        mutation CreateContactLog($customerName: String!, $customerPhone: String!, $actionType: String!, $propertyId: Int!, $landlordPhone: String!) {
          createContactLog(customerName: $customerName, customerPhone: $customerPhone, actionType: $actionType, propertyId: $propertyId, landlordPhone: $landlordPhone) {
            id
          }
        }
      `;
      
      await graphqlRequest(query, {
        customerName,
        customerPhone,
        actionType: connectActionType,
        propertyId: parseInt(property.id, 10),
        landlordPhone
      });

      setShowConnectModal(false);

      const cleanPhone = landlordPhone.replace(/[^0-9]/g, '');
      if (connectActionType === 'call') {
        window.location.href = `tel:${cleanPhone}`;
      } else {
        window.open(`https://wa.me/${cleanPhone}?text=Hi, I am interested in your property "${property.title}" on HO Rentals.`, '_blank');
      }

      setCustomerName('');
      setCustomerPhone('');
    } catch (err: any) {
      console.error('Failed to log contact audit record:', err);
      setShowConnectModal(false);
      const cleanPhone = property.contact.replace(/[^0-9]/g, '');
      if (connectActionType === 'call') {
        window.location.href = `tel:${cleanPhone}`;
      } else {
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
      }
    } finally {
      setIsLoggingContact(false);
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

    // Log unique page visit (24h cooldown)
    if (typeof window !== 'undefined') {
      const storageKey = `visit_detail_timestamp_${id}`;
      const lastVisit = localStorage.getItem(storageKey);
      const now = Date.now();
      const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

      if (!lastVisit || now - parseInt(lastVisit, 10) > COOLDOWN) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: `/properties/${id}` })
          .then(() => localStorage.setItem(storageKey, String(now)))
          .catch((err) => console.error('Page visit log error:', err));
      }
    }
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

  const handleConfirmPayment = async () => {
    if (!property) return;
    setCheckoutStep('submitting');
    
    // Simulate payment gateway delay (Mobile Money prompt authorization)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) throw new Error('Invalid property ID format');

      const input = {
        title: property.title,
        location: property.location,
        price: property.price,
        type: property.type,
        status: 'rented',
        description: property.description || '',
        contact: property.contact || '',
        imageUrl: property.imageUrl || '',
      };

      await graphqlRequest(UPDATE_PROPERTY, { id: parsedId, input });
      
      // Update local state status to rented
      setProperty((prev) => prev ? { ...prev, status: 'rented' } : null);
      setCheckoutStep('success');
    } catch (err: any) {
      alert(err.message || 'Payment simulation failed.');
      setCheckoutStep('details');
    }
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
              
              // Strip PricePeriod suffix if present
              let cleanText = rawDesc;
              const pricePeriodIdx = cleanText.indexOf('PricePeriod:');
              if (pricePeriodIdx !== -1) {
                cleanText = cleanText.substring(0, pricePeriodIdx).trim();
              }

              const featuresIdx = cleanText.indexOf('Features:');
              let mainDesc = cleanText;
              const water: string[] = [];
              const electricity: string[] = [];
              const amenities: string[] = [];
              const other: string[] = [];

              if (featuresIdx !== -1) {
                mainDesc = cleanText.substring(0, featuresIdx).trim();
                const featuresPart = cleanText.substring(featuresIdx + 'Features:'.length).trim();
                const segments = featuresPart.split('|');

                segments.forEach((seg) => {
                  const trimmedSeg = seg.trim();
                  if (!trimmedSeg) return;

                  if (trimmedSeg.startsWith('Water:')) {
                    const items = trimmedSeg.replace('Water:', '').split(',');
                    items.forEach((i) => { if (i.trim()) water.push(i.trim()); });
                  } else if (trimmedSeg.startsWith('Electricity:')) {
                    const items = trimmedSeg.replace('Electricity:', '').split(',');
                    items.forEach((i) => { if (i.trim()) electricity.push(i.trim()); });
                  } else if (trimmedSeg.startsWith('Amenities:')) {
                    const items = trimmedSeg.replace('Amenities:', '').split(',');
                    items.forEach((i) => { if (i.trim()) amenities.push(i.trim()); });
                  } else if (!trimmedSeg.toLowerCase().includes('priceperiod')) {
                    const items = trimmedSeg.includes(':') ? trimmedSeg.split(':')[1]?.split(',') || [trimmedSeg] : [trimmedSeg];
                    items.forEach((i) => { if (i.trim()) other.push(i.trim()); });
                  }
                });
              }

              // Fallback keyword detection if no structured features block
              if (water.length === 0 && electricity.length === 0 && amenities.length === 0 && other.length === 0) {
                const lower = rawDesc.toLowerCase();
                if (lower.includes('wifi') || lower.includes('wi-fi')) amenities.push('High-Speed WiFi');
                if (lower.includes('cctv')) amenities.push('CCTV Camera');
                if (lower.includes('furnished')) amenities.push('Furnished');
                if (lower.includes('fenced') || lower.includes('gated')) amenities.push('Gated & Fenced');
                if (lower.includes('newly built')) amenities.push('Newly Built');
                if (lower.includes('bed')) amenities.push('Bed Included');
                if (lower.includes('desk')) amenities.push('Study Desk');
                
                if (lower.includes('ghana water')) water.push('Ghana Water Supply');
                if (lower.includes('polytank')) water.push('Polytank Water');
                if (lower.includes('borehole')) water.push('Borehole Water');
                if (lower.includes('well')) water.push('Well Water');
                
                if (lower.includes('prepaid')) electricity.push('ECG Prepaid Meter');
                if (lower.includes('postpaid') || lower.includes('post-paid')) electricity.push('ECG Post-Paid');
                if (lower.includes('shared meter')) electricity.push('ECG Shared Meter');
              }

              const hasAnyFeatures = water.length > 0 || electricity.length > 0 || amenities.length > 0 || other.length > 0;

              return (
                <>
                  <div className={styles.descriptionBox}>
                    <h3 className={styles.sectionTitle}>Description</h3>
                    <p className={styles.descriptionText}>
                      {mainDesc || 'No description provided by the landlord.'}
                    </p>
                  </div>

                  {hasAnyFeatures && (
                    <div className={styles.descriptionBox} style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                      <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>Key Features & Amenities</h3>
                      
                      {/* Water Supply */}
                      {water.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            💧 Water Supply & Facilities
                          </h4>
                          <div className={styles.featuresGrid}>
                            {water.map((item, idx) => (
                              <div key={idx} className={styles.featureCard}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: '#0EA5E9' }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Electricity & Metering */}
                      {electricity.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            ⚡ Electricity & Metering
                          </h4>
                          <div className={styles.featuresGrid}>
                            {electricity.map((item, idx) => (
                              <div key={idx} className={styles.featureCard}>
                                <CheckCircle2 size={16} className={styles.featureIcon} style={{ color: '#F59E0B' }} />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comfort & General Amenities */}
                      {(amenities.length > 0 || other.length > 0) && (
                        <div>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            ✨ Comforts & Security
                          </h4>
                          <div className={styles.featuresGrid}>
                            {[...amenities, ...other].map((item, idx) => (
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

                      {/* Google Maps Turn-by-Turn Directions Button */}
                      <div style={{ marginTop: '8px' }}>
                        <a
                          href={
                            property.latitude && property.longitude
                              ? `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location + ', Ho, Ghana')}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, gap: '8px', width: '100%', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        >
                          <Navigation size={16} /> 🧭 Get Turn-by-Turn Directions in Google Maps
                        </a>
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
          <h3 className={styles.sidebarCardTitle}>Contact Landlord</h3>
          
          <div className={styles.landlordInfo}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Landlord / Owner</span>
              <span className={styles.infoValue}>{property.owner?.name || 'HO Rentals Verified (Agent)'}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Phone Contact</span>
              <span className={styles.infoValue}>{maskPhoneNumber(property.contact)}</span>
            </div>

          </div>

          <div className={styles.contactActions}>
            <button 
              onClick={() => handleConnectClick('call')} 
              className="btn btn-primary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'var(--primary)', fontWeight: 700 }}
            >
              <Phone size={16} /> Call Landlord / Support
            </button>

            <button 
              onClick={() => handleConnectClick('whatsapp')} 
              className="btn btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={16} /> WhatsApp Chat (0557922593)
            </button>

            <a 
              href={`sms:0557922593?body=Hi, I am interested in property "${property.title}" listed on HO Rentals.`} 
              className="btn btn-outline" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={16} /> SMS Support (0557922593)
            </a>
          </div>
        </aside>
      </div>

      {/* Checkout reservation Modal */}
      {showCheckoutModal && (
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
            maxHeight: '90vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <button
              onClick={() => {
                setShowCheckoutModal(false);
                setCheckoutStep('details');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            {checkoutStep === 'details' && (
              <>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Reserve Room</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Secure this room immediately by making a commitment fee deposit of **GH₵ 100**. This payment is verified securely.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {['mtn', 'telecel', 'card'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setMomoProvider(opt as any)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: 'var(--radius-sm)',
                          border: `2px solid ${momoProvider === opt ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: momoProvider === opt ? 'var(--primary-light)' : 'transparent',
                          color: momoProvider === opt ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        {opt === 'mtn' && 'MTN MoMo'}
                        {opt === 'telecel' && 'Telecel'}
                        {opt === 'card' && 'Card'}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {momoProvider === 'card' ? 'Card Number' : 'Wallet Number'}
                    </label>
                    <input
                      type="text"
                      placeholder={momoProvider === 'card' ? '4000 1234 5678 9010' : 'e.g. 0241234567'}
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(momoProvider === 'card' ? e.target.value : formatGhanaPhone(e.target.value))}
                      maxLength={momoProvider === 'card' ? 16 : 10}
                      className="form-control"
                      style={{ padding: '12px' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleConfirmPayment}
                  disabled={!momoNumber}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', background: 'var(--accent)', borderColor: 'var(--accent)', fontWeight: 'bold' }}
                >
                  Confirm Reservation (GH₵ 100)
                </button>
              </>
            )}

            {checkoutStep === 'submitting' && (
              <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Loader size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontWeight: 700 }}>Authorizing Payment...</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  A Mobile Money push prompt has been sent to your phone. Enter your PIN code to authorize.
                </p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                }}>
                  ✓
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#065F46' }}>Reservation Completed!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The booking deposit is confirmed. This room has been marked as **Rented**, and the landlord has been notified.
                </p>
                <button
                  onClick={() => {
                    setShowCheckoutModal(false);
                    setCheckoutStep('details');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  Finish
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {showConnectModal && (
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
            maxHeight: '90vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <button
              onClick={() => setShowConnectModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Connect with Landlord
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                To connect with the landlord via {connectActionType === 'call' ? 'phone call' : 'WhatsApp'}, please enter your details. We will log your request and connect you.
              </p>
            </div>

            <form onSubmit={handleConnectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="form-control"
                  style={{ padding: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Your Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0241234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatGhanaPhone(e.target.value))}
                  required
                  maxLength={10}
                  className="form-control"
                  style={{ padding: '12px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingContact}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
              >
                {isLoggingContact ? 'Connecting...' : `Proceed to ${connectActionType === 'call' ? 'Call' : 'WhatsApp'}`}
              </button>
            </form>
          </div>
        </div>
      )}



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
              <form onSubmit={(e) => {
                e.preventDefault();
                setReportSubmitted(true);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason for Report</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="form-control"
                    style={{ padding: '10px', fontSize: '0.85rem', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <option value="Incorrect Price">Incorrect Price</option>
                    <option value="Already Rented">Already Rented / Occupied</option>
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
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontWeight: 'bold', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  Submit Report
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

      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}
    </div>
  );
}
