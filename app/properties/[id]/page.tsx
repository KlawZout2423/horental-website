'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { ChevronLeft, ChevronRight, MapPin, ArrowLeft, Phone, Mail, MessageSquare, Loader } from 'lucide-react';
import { graphqlRequest, GET_PROPERTY_BY_ID, UPDATE_PROPERTY } from '../../../lib/graphql';
import styles from './detail.module.css';

interface GalleryItem {
  id: string;
  url: string;
  caption?: string;
  order: number;
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
  const { user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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

  const maskPhoneNumber = (num: string) => {
    if (!num) return '';
    const digits = num.replace(/[^0-9]/g, '');
    if (digits.length >= 4) {
      return `${digits.substring(0, 3)} ••• ••• ${digits.substring(digits.length - 1)}`;
    }
    return '••• ••• •••';
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
      setConnectActionType(actionType);
      setShowConnectModal(true);
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

    // Log unique page visit per session
    if (typeof window !== 'undefined') {
      const sessionKey = `visit_detail_${id}`;
      const hasVisited = sessionStorage.getItem(sessionKey);
      if (!hasVisited) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: `/properties/${id}` })
          .then(() => sessionStorage.setItem(sessionKey, 'true'))
          .catch((err) => console.error('Page visit log error:', err));
      }
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading property information...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
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
    ...(property.gallery?.sort((a, b) => a.order - b.order).map((g) => g.url) || [])
  ].filter(Boolean);

  const handlePrevSlide = () => {
    setActiveImageIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveImageIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
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
      {/* Back Button */}
      <Link href="/properties" className={styles.backButton}>
        <ArrowLeft size={16} /> Back to Listings
      </Link>

      <div className={styles.layout}>
        {/* Main Details Area */}
        <div>
          {/* Gallery Carousel */}
          {slides.length > 0 ? (
            <div>
              <div className={styles.carousel}>
                <img
                  src={slides[activeImageIndex]}
                  alt={`${property.title} - Image ${activeImageIndex + 1}`}
                  className={styles.slide}
                />
                
                {slides.length > 1 && (
                  <>
                    <button onClick={handlePrevSlide} className={`${styles.carouselNav} ${styles.carouselPrev}`}>
                      <ChevronLeft size={24} />
                    </button>
                    <button onClick={handleNextSlide} className={`${styles.carouselNav} ${styles.carouselNext}`}>
                      <ChevronRight size={24} />
                    </button>
                    <div className={styles.carouselIndicators}>
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
                      onClick={() => setActiveImageIndex(idx)}
                      className={`${styles.thumbnailWrapper} ${idx === activeImageIndex ? styles.activeThumbnail : ''}`}
                    >
                      <img src={slide} alt="thumbnail" className={styles.thumbnailImage} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.carousel}>
              <img src={getFallbackImage(property.type)} alt={property.title} className={styles.slide} />
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
              <span className={styles.priceUnit}>/ semester</span>
            </div>

            {/* Description box */}
            <div className={styles.descriptionBox}>
              <h3 className={styles.sectionTitle}>Description</h3>
              <p className={styles.descriptionText}>
                {property.description || 'No description provided by the landlord.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar contact widget */}
        <aside className={styles.sidebarCard}>
          <h3 className={styles.sidebarCardTitle}>Contact Landlord</h3>
          
          <div className={styles.landlordInfo}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Landlord / Owner</span>
              <span className={styles.infoValue}>{property.owner?.name || 'HO Rentals Verified Agent'}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Phone Contact</span>
              <span className={styles.infoValue}>{maskPhoneNumber(property.contact)}</span>
            </div>

          </div>

          <div className={styles.contactActions}>
            <button onClick={() => handleConnectClick('call')} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Phone size={16} /> Call Landlord
            </button>
            
            <button 
              onClick={() => handleConnectClick('whatsapp')} 
              className="btn btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <MessageSquare size={16} /> WhatsApp Chat
            </button>

            {property.contact && (
              <a 
                href={`sms:${property.contact.trim()}?body=Hi, I am interested in your property "${property.title}" listed on HO Rentals.`} 
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <MessageSquare size={16} /> SMS Landlord
              </a>
            )}
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
            padding: '32px',
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
                      placeholder={momoProvider === 'card' ? '4000 1234 5678 9010' : '024 123 4567'}
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
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
            padding: '32px',
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
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
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
    </div>
  );
}
