'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Search, MapPin, ShieldCheck, HelpCircle, PhoneCall, ArrowRight, SlidersHorizontal, ChevronDown, Star, Sparkles, Heart } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES } from '../lib/graphql';
import styles from './page.module.css';
import AuthPromptModal from '../components/AuthPromptModal';

import { Property, getPricePeriodLabel } from '../lib/types';

const TYPE_CHIPS = [
  { label: 'All', type: 'All' },
  { label: 'Filters', type: 'filters' },
  { label: 'Student Hostel', type: 'Student Hostel' },
  { label: 'Single Room', type: 'Single Room' },
  { label: 'Chamber & Hall', type: 'Chamber & Hall' },
  { label: 'Self-Contained', type: 'self-contained' },
  { label: 'Furnitures', type: 'Furnitures' },
  { label: 'Lands', type: 'Lands' },
  { label: 'Shops', type: 'Shops' },
  { label: 'Short Stay', type: 'Short Stay' }
];

const SELF_CONTAINED_OPTIONS = [
  { label: 'Single Room SC', type: 'Single Room SC' },
  { label: 'Chamber and Hall SC', type: 'Chamber and Hall SC' },
  { label: 'Two Bedroom SC', type: 'Two Bedroom SC' },
  { label: 'Three Bedroom SC', type: 'Three Bedroom SC' },
  { label: 'Four Bedroom SC', type: 'Four Bedroom SC' }
];

const POPULAR_AREAS = [
  { name: 'UHAS', icon: '🎓', label: 'UHAS Campus' },
  { name: 'Ho Poly', icon: '🏫', label: 'Ho Poly / HTU' },
  { name: 'SSNIT Flats', icon: '🏢', label: 'SSNIT Flats' },
  { name: 'Bankoe', icon: '🏙️', label: 'Bankoe' },
  { name: 'Sokode', icon: '🏡', label: 'Sokode' },
  { name: 'Civic Centre', icon: '📍', label: 'Civic Centre' }
];

// Testimonials data removed

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Data State
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [showSelfContainedDropdown, setShowSelfContainedDropdown] = useState(false);

  // Bookmark active state
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(null);

  const handleCardClick = (e: React.MouseEvent, propertyId: string) => {
    if (!user) {
      e.preventDefault();
      setTargetPropertyId(propertyId);
      setShowAuthModal(true);
    }
  };
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown overlay when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSelfContainedDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch properties from database
  useEffect(() => {
    async function fetchProperties() {
      try {
        const data = await graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES);
        if (data && data.properties) {
          // Show ALL properties, featured ones sorted to the top
          const sorted = [...data.properties].sort((a, b) => {
            if (a.isFeatured === b.isFeatured) return 0;
            return a.isFeatured ? -1 : 1;
          });
          setProperties(sorted);
          setFilteredProperties(sorted);
        }
      } catch (e) {
        console.error('Error fetching properties:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();

    // Log unique page visit (24h cooldown)
    if (typeof window !== 'undefined') {
      const storageKey = 'visit_landing_timestamp';
      const lastVisit = localStorage.getItem(storageKey);
      const now = Date.now();
      const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

      if (!lastVisit || now - parseInt(lastVisit, 10) > COOLDOWN) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: '/' })
          .then(() => localStorage.setItem(storageKey, String(now)))
          .catch((err) => console.error('Page visit log error:', err));
      }
    }
  }, []);

  // Apply filters
  useEffect(() => {
    let result = properties;

    if (activeTypeFilter !== 'All') {
      if (activeTypeFilter === 'self-contained') {
        result = result.filter((p) => {
          const type = p.type.toLowerCase();
          return type.includes('sc') || type.includes('self contained') || type.includes('self-contained');
        });
      } else {
        result = result.filter((p) => p.type.toLowerCase() === activeTypeFilter.toLowerCase());
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q)
      );
    }

    // Always keep featured at the top within any filter result
    result = [...result].sort((a, b) => {
      if (a.isFeatured === b.isFeatured) return 0;
      return a.isFeatured ? -1 : 1;
    });

    setFilteredProperties(result);
  }, [activeTypeFilter, searchQuery, properties]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let path = `/properties?`;
    if (searchQuery) path += `search=${encodeURIComponent(searchQuery)}&`;
    if (activeTypeFilter !== 'All') path += `type=${encodeURIComponent(activeTypeFilter)}`;
    router.push(path);
  };

  const handleChipClick = (type: string) => {
    if (type === 'filters') {
      router.push('/properties?openFilters=true');
    } else if (type === 'self-contained') {
      setShowSelfContainedDropdown(!showSelfContainedDropdown);
    } else {
      setActiveTypeFilter(type);
      setShowSelfContainedDropdown(false);
    }
  };

  const handleSelfContainedSelect = (subType: string) => {
    setActiveTypeFilter(subType);
    setShowSelfContainedDropdown(false);
  };

  // Load saved bookmarks from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saved_properties');
      if (stored) {
        try {
          setSavedIds(JSON.parse(stored));
        } catch (err) {
          console.error('Error parsing saved properties from localStorage:', err);
        }
      }
    }
  }, []);

  const handleToggleSave = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setTargetPropertyId(id);
      setShowAuthModal(true);
      return;
    }
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((savedId) => savedId !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('saved_properties', JSON.stringify(next));
      }
      return next;
    });
  };

  const getFallbackImage = (type: string) => {
    if (type.toLowerCase().includes('hostel')) {
      return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';
    }
    return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80';
  };

  return (
    <div className="animate-fade-in">
      
      {/* Hero Banner */}
      <header className={styles.hero}>
        <div className={styles.heroWrapper}>
          <div className={styles.heroLeft}>
            <div className={styles.heroBadge} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '40px', backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              <Sparkles size={14} /> Ghana Rentals Property Platform
            </div>
            <h1 className={styles.title}>Find Your Perfect Place in Ghana</h1>
            <p className={styles.subtitle}>
              Rooms, apartments, hostels, shops & lands across Ho, Volta Region and across Ghana.
            </p>

            <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search location, hostel or property..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search location, hostel or property"
                />
              </div>
              <button type="submit" className={styles.searchButton}>
                <Search size={16} />
                <span className={styles.btnText}>Search</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
          
          <div className={styles.heroRight}>
            <div className={styles.heroImageContainer}>
              <img src="/student_campus_vibe.png" alt="Properties in Ghana" className={styles.heroImage} />
            </div>
            <div className={`${styles.floatingBadge} ${styles.badgeTop}`}>
              <ShieldCheck size={16} style={{ color: '#10B981' }} />
              <span>100% Verified Hostels</span>
            </div>
            <div className={`${styles.floatingBadge} ${styles.badgeBottom}`}>
              <Star size={16} fill="var(--accent)" color="var(--accent)" />
              <span>Trusted by Tenants & Buyers</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky search + chips wrapper — sticky on mobile */}
      <div className={styles.stickySearchBar}>
        {/* Mobile-only mini search (hidden on desktop since hero has the full one) */}
        <div className={styles.mobileSearchRow}>
          <form onSubmit={handleSearchSubmit} className={styles.mobileSearchForm}>
            <div className={styles.mobileSearchInputWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Search properties"
              />
            </div>
            <button type="submit" className={styles.mobileSearchBtn} aria-label="Search">
              <Search size={16} />
            </button>
          </form>
        </div>

        {/* Horizontal scrolling chips */}
        <div className={styles.chipsOuter}>
          <div className={styles.chipsContainer}>
            {TYPE_CHIPS.map((chip) => {
              const isSelected = activeTypeFilter === chip.type || 
                                (chip.type === 'self-contained' && 
                                 SELF_CONTAINED_OPTIONS.some(opt => opt.type === activeTypeFilter));
              
              if (chip.type === 'self-contained') {
                return (
                  <div key={chip.type} className={styles.dropdownContainer} ref={dropdownRef}>
                    <button
                      onClick={() => handleChipClick(chip.type)}
                      className={`${styles.chip} ${isSelected ? styles.activeChip : ''}`}
                    >
                      <span>{chip.label}</span>
                      <ChevronDown size={14} />
                    </button>
                    
                    {showSelfContainedDropdown && (
                      <div className={styles.dropdownMenu}>
                        {SELF_CONTAINED_OPTIONS.map((opt) => (
                          <button
                            key={opt.type}
                            onClick={() => handleSelfContainedSelect(opt.type)}
                            className={styles.dropdownItem}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={chip.type}
                  onClick={() => handleChipClick(chip.type)}
                  className={`${styles.chip} ${isSelected ? styles.activeChip : ''}`}
                >
                  {chip.type === 'filters' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SlidersHorizontal size={14} /> Filters
                    </span>
                  ) : (
                    <span>{chip.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Popular Student Areas Bar */}
        <div className={styles.chipsOuter} style={{ paddingTop: 0, paddingBottom: '10px' }}>
          <div className={styles.chipsContainer}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Area:
            </span>
            {POPULAR_AREAS.map((area) => (
              <button
                key={area.name}
                onClick={() => router.push(`/properties?search=${encodeURIComponent(area.name)}`)}
                className={styles.chip}
                style={{ fontSize: '0.8rem', padding: '6px 14px', gap: '4px' }}
                title={`Find rentals near ${area.label}`}
              >
                <span>{area.icon} {area.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Property Listings Section */}
      <section className={`${styles.section} ${styles.listingsSection}`} style={{ maxWidth: 'none' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className={styles.sectionHeaderRow}>
            <div>
              <h2 className={styles.sectionHeaderTitle}>Top Listings</h2>
              <p className={styles.sectionHeaderSubtitle}>Discover the newest verified rentals across Ho.</p>
            </div>
            <Link href="/properties" className={`btn btn-outline ${styles.viewAllLink}`}>
              View All &rarr;
            </Link>
          </div>

          {loading ? (
            <div className={styles.gridCards}>
              {[1, 2, 3].map((n) => (
                <div key={n} className={styles.propertyCard} style={{ height: '380px', opacity: 0.6 }}>
                  <div className={styles.imageWrapper} style={{ background: 'var(--border)' }}></div>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ width: '40%', height: '20px', background: 'var(--border)', borderRadius: '4px' }}></div>
                    <div style={{ width: '80%', height: '24px', background: 'var(--border)', borderRadius: '4px' }}></div>
                    <div style={{ width: '60%', height: '16px', background: 'var(--border)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className={styles.noListingsCard}>
              <div className={styles.noListingsIllustration}>
                <div className={styles.dormIconWrapper}>
                  <MapPin size={48} className={styles.bouncingPin} style={{ color: 'var(--primary)' }} />
                </div>
              </div>
              <h3 className={styles.noListingsTitle}>
                {(() => {
                  switch (activeTypeFilter) {
                    case 'Student Hostel':
                      return 'No hostels listed yet — be the first!';
                    case 'Single Room':
                      return 'No single rooms listed yet — be the first!';
                    case 'Chamber & Hall':
                      return 'No chamber & hall listings yet — be the first!';
                    case 'Single Room SC':
                      return 'No self-contained single rooms listed yet — be the first!';
                    case 'Chamber and Hall SC':
                      return 'No self-contained chamber & halls listed yet — be the first!';
                    case 'Two Bedroom SC':
                      return 'No 2-bedroom apartments listed yet — be the first!';
                    case 'Three Bedroom SC':
                      return 'No 3-bedroom apartments listed yet — be the first!';
                    case 'Four Bedroom SC':
                      return 'No 4-bedroom apartments listed yet — be the first!';
                    case 'Furnitures':
                      return 'No furniture listings yet — be the first!';
                    case 'Lands':
                      return 'No land plots listed yet — be the first!';
                    case 'Shops':
                      return 'No shop spaces listed yet — be the first!';
                    case 'Short Stay':
                      return 'No short stay rentals listed yet — be the first!';
                    default:
                      return 'No properties listed yet — be the first!';
                  }
                })()}
              </h3>
              <p className={styles.noListingsSubtitle}>
                {(() => {
                  switch (activeTypeFilter) {
                    case 'Student Hostel':
                      return "No hostels match your current filters. If you own a hostel, list it here to reach people looking for accommodation.";
                    case 'Single Room':
                      return "No single rooms are listed right now. Have a room to let? Add your listing and connect with interested tenants.";
                    case 'Chamber & Hall':
                      return "No chamber & hall listings found. Post yours today to reach people actively searching in this category.";
                    case 'Single Room SC':
                      return "No self-contained single rooms are listed yet. List your property to reach people looking for this type.";
                    case 'Chamber and Hall SC':
                      return "No self-contained chamber & hall apartments found. List your space to make it visible to seekers.";
                    case 'Two Bedroom SC':
                    case 'Three Bedroom SC':
                    case 'Four Bedroom SC':
                      return "We couldn't find any multi-bedroom apartments matching this filter. List your flats to attract tenants!";
                    case 'Furnitures':
                      return "No furniture items are listed for sale or rent. Post your furniture listings to connect with buyers!";
                    case 'Lands':
                      return "No land plots or properties available in this category. List your land assets to match with buyers!";
                    case 'Shops':
                      return "No shop fronts or commercial spaces are currently available. Post your retail properties to reach business owners!";
                    case 'Short Stay':
                      return "No short stay rentals found matching this filter. If you host guest houses or short-term flats, list them here!";
                    default:
                      return "No listings match your current filters. If you have a property to let or sell, post it here and reach people actively searching in Ho and surrounding areas.";
                  }
                })()}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => { setActiveTypeFilter('All'); setSearchQuery(''); }} 
                  className="btn btn-outline"
                >
                  Clear Active Filters
                </button>
                <Link href="/upload" className="btn btn-primary">
                  Post Your Listing
                </Link>
              </div>
            </div>
          ) : (
            <div className={styles.gridCards}>
              {filteredProperties.slice(0, 6).map((p, index) => {
                const isSaved = savedIds.includes(p.id);
                return (
                  <Link 
                    href={`/properties/${p.id}`} 
                    key={p.id} 
                    onClick={(e) => handleCardClick(e, p.id)}
                    className={`${styles.propertyCard} ${p.isFeatured ? styles.featuredCard : ''} animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={styles.imageWrapper}>
                      <img 
                        src={p.imageUrl || getFallbackImage(p.type)} 
                        alt={p.title} 
                        className={styles.propertyImage}
                      />

                      {/* Featured badge */}
                      {p.isFeatured && (
                        <div className={styles.featuredBadge}>
                          <Star size={11} fill="currentColor" />
                          <span>FEATURED</span>
                        </div>
                      )}
                      
                      {/* Heart save button */}
                      <button
                        onClick={(e) => handleToggleSave(e, p.id)}
                        className={styles.saveButton}
                        aria-label="Save listing"
                      >
                        <Heart size={16} fill={isSaved ? 'var(--primary)' : 'none'} color={isSaved ? 'var(--primary)' : 'currentColor'} />
                      </button>
                    </div>
                    
                    <div className={styles.cardContent}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge badge-${p.status === 'available' ? 'available' : p.status === 'rented' || p.status === 'occupied' ? 'rented' : 'pending'}`} style={{ padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px', fontWeight: 700 }}>
                          {p.status === 'available' ? 'Available' : p.status === 'rented' ? 'Occupied' : p.status}
                        </span>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600, padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px' }}>
                          {p.type}
                        </span>
                      </div>

                      <h3 className={styles.cardTitle} style={{ marginTop: '2px', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.title}</h3>

                      <div className={styles.cardMetaRow} style={{ marginBottom: '8px' }}>
                        <div className={styles.cardLocation} style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                          <MapPin size={13} style={{ color: 'var(--primary)' }} />
                          <span>📍 {p.location.toLowerCase().includes('ho') ? p.location : `${p.location}, Ho`}</span>
                        </div>
                      </div>
                      
                      {(() => {
                        const desc = p.description?.toLowerCase() || '';
                        let showWifi = desc.includes('wi-fi') || desc.includes('wifi');
                        let showWater = desc.includes('water');
                        let showPrepaid = desc.includes('prepaid') || desc.includes('meter');
                        let showBed = desc.includes('bed') || desc.includes('room') || desc.includes('desk') || desc.includes('hostel');
                        let showParking = desc.includes('park') || desc.includes('car');
                        
                        if (!showWifi && !showWater && !showPrepaid && !showBed) {
                          showWater = true;
                          showBed = true;
                          showPrepaid = true;
                        }

                        return (
                          <div className={styles.amenitiesRow}>
                            {showBed && <span className={styles.amenity}>🛏️ Bed/Room</span>}
                            {showWater && <span className={styles.amenity}>💧 Water</span>}
                            {showPrepaid && <span className={styles.amenity}>⚡ Prepaid</span>}
                            {showWifi && <span className={styles.amenity}>📶 WiFi</span>}
                            {showParking && <span className={styles.amenity}>🚗 Parking</span>}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className={styles.cardFooter} style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                      <div className={styles.cardPrice}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>GH₵ {p.price.toLocaleString()}</span>
                        <span className={styles.cardPricePeriod} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{getPricePeriodLabel(p.description, true)}</span>
                      </div>
                      <span className={styles.viewDetailsBtn}>View Details &rarr;</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trust Banner */}
      <section className={`${styles.section} ${styles.trustSection}`}>
        <div className={styles.trustBanner}>
          <div className={styles.trustBannerItem}>
            <ShieldCheck size={20} className={styles.trustIcon} />
            <div>
              <strong>Verified Listings:</strong> Properties physically checked before going live.
            </div>
          </div>
          <div className={styles.trustBannerDivider}></div>
          <div className={styles.trustBannerItem}>
            <HelpCircle size={20} className={styles.trustIcon} />
            <div>
              <strong>Direct Renting:</strong> Zero middleman (Agent).
            </div>
          </div>
          <div className={styles.trustBannerDivider}></div>
          <div className={styles.trustBannerItem}>
            <PhoneCall size={20} className={styles.trustIcon} />
            <div>
              <strong>24/7 Support:</strong> We're here to help you find or list a property.
            </div>
          </div>
        </div>
      </section>

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        targetPropertyId={targetPropertyId}
      />
    </div>
  );
}
