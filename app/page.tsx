'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Search, MapPin, ShieldCheck, HelpCircle, PhoneCall, ArrowRight, SlidersHorizontal, ChevronDown, Star, Sparkles, Heart } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES } from '../lib/graphql';
import styles from './page.module.css';

import { Property } from '../lib/types';

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
          const featured = data.properties.filter((p) => p.isFeatured === true);
          if (featured.length > 0) {
            setProperties(featured);
            setFilteredProperties(featured);
          } else {
            setProperties(data.properties);
            setFilteredProperties(data.properties);
          }
        }
      } catch (e) {
        console.error('Error fetching properties:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();

    // Log unique page visit per session
    if (typeof window !== 'undefined') {
      const hasVisited = sessionStorage.getItem('visit_landing');
      if (!hasVisited) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: '/' })
          .then(() => sessionStorage.setItem('visit_landing', 'true'))
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
      router.push('/properties');
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '40px', backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-light)', marginBottom: '8px' }}>
              <Sparkles size={14} /> Student Accommodation Platform
            </div>
            <h1 className={styles.title}>Find Your Next Campus Home</h1>
            <p className={styles.subtitle}>
              Verified hostels, single rooms & self-contained apartments near HTU, UHAS & Trafalgar campuses.
            </p>

            <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search campus or area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search campus or area"
                />
              </div>
              <select
                value={activeTypeFilter}
                onChange={(e) => setActiveTypeFilter(e.target.value)}
                className={styles.searchSelect}
                aria-label="Select property category"
              >
                <option value="All">All Categories</option>
                <option value="Student Hostel">Hostels</option>
                <option value="Single Room">Single Room</option>
                <option value="self-contained">Self-Contained</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '9999px' }}>
                Search
              </button>
            </form>
          </div>
          
          <div className={styles.heroRight}>
            <div className={styles.heroImageContainer}>
              <img src="/student_campus_vibe.png" alt="Students on Campus" className={styles.heroImage} />
            </div>
            <div className={`${styles.floatingBadge} ${styles.badgeTop}`}>
              <ShieldCheck size={16} style={{ color: '#10B981' }} />
              <span>100% Verified Hostels</span>
            </div>
            <div className={`${styles.floatingBadge} ${styles.badgeBottom}`}>
              <Star size={16} fill="var(--accent)" color="var(--accent)" />
              <span>Trusted by Students</span>
            </div>
          </div>
        </div>
      </header>

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

      {/* Branded Section: "Top Picks Near Campus" */}
      <section className={`${styles.section} ${styles.listingsSection}`} style={{ maxWidth: 'none' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
            <div>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '8px' }}>Orbit Spotlight</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Highly-rated student hostels orbiting your campus</p>
            </div>
            <Link href="/properties" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              View All <ArrowRight size={16} />
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
                      return 'No student hostels available yet — be the first to list!';
                    case 'Single Room':
                      return 'No single rooms available yet — be the first to list!';
                    case 'Chamber & Hall':
                      return 'No chamber & halls available yet — be the first to list!';
                    case 'Single Room SC':
                      return 'No self-contained single rooms available yet — be the first to list!';
                    case 'Chamber and Hall SC':
                      return 'No self-contained chamber & halls available yet — be the first to list!';
                    case 'Two Bedroom SC':
                      return 'No 2-bedroom apartments available yet — be the first to list!';
                    case 'Three Bedroom SC':
                      return 'No 3-bedroom apartments available yet — be the first to list!';
                    case 'Four Bedroom SC':
                      return 'No 4-bedroom apartments available yet — be the first to list!';
                    case 'Furnitures':
                      return 'No furniture listings available yet — be the first to list!';
                    case 'Lands':
                      return 'No land plots available yet — be the first to list!';
                    case 'Shops':
                      return 'No shop spaces available yet — be the first to list!';
                    case 'Short Stay':
                      return 'No short stay rentals available yet — be the first to list!';
                    default:
                      return 'No properties available yet — be the first to list!';
                  }
                })()}
              </h3>
              <p className={styles.noListingsSubtitle}>
                {(() => {
                  switch (activeTypeFilter) {
                    case 'Student Hostel':
                      return "We couldn't find any student hostels matching your filters. If you are a hostel owner, help students by listing your hostel!";
                    case 'Single Room':
                      return "We couldn't find any single rooms available. If you have rooms to let, list them to reach students!";
                    case 'Chamber & Hall':
                      return "We couldn't find any chamber & hall listings. Post your listing today to connect with active searchers!";
                    case 'Single Room SC':
                      return "No self-contained single rooms are listed right now. Help students find housing by listing your property!";
                    case 'Chamber and Hall SC':
                      return "No self-contained chamber and hall apartments found. List your space to make it visible to seekers!";
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
                      return "We couldn't find any student accommodations or listings matching your active filters. If you are a landlord, help students by listing your property!";
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
                    className={`${styles.propertyCard} animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={styles.imageWrapper}>
                      <img 
                        src={p.imageUrl || getFallbackImage(p.type)} 
                        alt={p.title} 
                        className={styles.propertyImage}
                      />
                      
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
                        <span className={`badge badge-${p.status === 'available' ? 'available' : 'rented'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                          {p.status}
                        </span>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600, padding: '2px 8px', fontSize: '0.7rem' }}>
                          {p.type}
                        </span>
                      </div>

                      <h3 className={styles.cardTitle} style={{ marginTop: '0px', marginBottom: '8px' }}>{p.title}</h3>

                      <div className={styles.cardMetaRow}>
                        <div className={styles.cardLocation}>
                          <MapPin size={12} style={{ color: 'var(--primary)' }} />
                          <span>{p.location}</span>
                        </div>
                      </div>
                      
                      {(() => {
                        const desc = p.description?.toLowerCase() || '';
                        let showWifi = desc.includes('wi-fi') || desc.includes('wifi');
                        let showWater = desc.includes('water');
                        let showPrepaid = desc.includes('prepaid') || desc.includes('meter');
                        let showBed = desc.includes('bed') || desc.includes('room') || desc.includes('desk') || desc.includes('hostel');
                        
                        if (!showWifi && !showWater && !showPrepaid && !showBed) {
                          showWater = true;
                          showBed = true;
                        }

                        return (
                          <div className={styles.amenitiesRow}>
                            {showBed && <span className={styles.amenity}>🛏️ Bed/Room</span>}
                            {showWater && <span className={styles.amenity}>💧 Water</span>}
                            {showPrepaid && <span className={styles.amenity}>⚡ Prepaid</span>}
                            {showWifi && <span className={styles.amenity}>📶 WiFi</span>}
                          </div>
                        );
                      })()}
                    </div>
                    
                    <div className={styles.cardFooter}>
                      <div className={styles.cardPrice}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>GH₵{p.price.toLocaleString()}</span>
                        <span className={styles.cardPricePeriod}>/sem</span>
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
      <section className={styles.section} style={{ paddingTop: '0px', paddingBottom: '60px' }}>
        <div className={styles.trustBanner}>
          <div className={styles.trustBannerItem}>
            <ShieldCheck size={20} className={styles.trustIcon} />
            <div>
              <strong>Double Verification:</strong> Physical audit of facilities near campus.
            </div>
          </div>
          <div className={styles.trustBannerDivider}></div>
          <div className={styles.trustBannerItem}>
            <HelpCircle size={20} className={styles.trustIcon} />
            <div>
              <strong>Direct Renting:</strong> Zero middleman agent commissions.
            </div>
          </div>
          <div className={styles.trustBannerDivider}></div>
          <div className={styles.trustBannerItem}>
            <PhoneCall size={20} className={styles.trustIcon} />
            <div>
              <strong>24/7 Support:</strong> Direct student navigation helpline.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
