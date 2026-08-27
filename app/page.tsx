'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Search, MapPin, ShieldCheck, HelpCircle, PhoneCall, ArrowRight, SlidersHorizontal, ChevronDown, Star, Sparkles, Heart, Building2, Zap, UserCheck, Building } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES, GET_AGENTS } from '../lib/graphql';
import { trackVisit } from '../lib/trackVisit';
import styles from './page.module.css';
import AuthPromptModal from '../components/AuthPromptModal';

import { Property, getPricePeriodLabel, getOptimizedImageUrl, getStatusLabel } from '../lib/types';

interface AgentUser {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  bio?: string;
  profileImage?: string;
  agentLocation?: string;
  agentWhatsapp?: string;
  verificationStatus?: string;
}

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
  { label: 'Short Stay', type: 'Short Stay' },
  { label: '🏢 Agent Listings', type: 'agents' }
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
  const [agents, setAgents] = useState<AgentUser[]>([]);
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
  const selfContainedBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Close dropdown overlay when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        selfContainedBtnRef.current && !selfContainedBtnRef.current.contains(event.target as Node)
      ) {
        setShowSelfContainedDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate dropdown position whenever it opens
  useEffect(() => {
    if (showSelfContainedDropdown && selfContainedBtnRef.current) {
      const rect = selfContainedBtnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
      });
    }
  }, [showSelfContainedDropdown]);

  // Fetch properties & agents from database
  useEffect(() => {
    async function fetchData() {
      try {
        const [propsRes, agentsRes] = await Promise.all([
          graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES),
          graphqlRequest<{ agents: AgentUser[] }>(GET_AGENTS)
        ]);

        if (propsRes && propsRes.properties) {
          const sorted = [...propsRes.properties].sort((a, b) => {
            if (a.isFeatured === b.isFeatured) return 0;
            return a.isFeatured ? -1 : 1;
          });
          setProperties(sorted);
          setFilteredProperties(sorted);
        }

        if (agentsRes && agentsRes.agents) {
          setAgents(agentsRes.agents);
        }
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Log unique page visit with UTM + referrer (24h cooldown)
    trackVisit('/', 'visit_landing_timestamp');
  }, []);

  // Apply filters
  useEffect(() => {
    let result = properties;

    if (activeTypeFilter === 'All') {
      // Exclude agent-submitted properties from the "All" chip
      result = result.filter((p) => p.owner?.role !== 'agent');
    } else if (activeTypeFilter === 'agents') {
      // Handled separately by rendering Agent Profile Cards Grid
      result = result.filter((p) => p.owner?.role === 'agent');
    } else {
      // Category chips (Student Hostel, Single Room, etc.) exclude agent properties
      if (activeTypeFilter === 'self-contained') {
        result = result.filter((p) => {
          const type = p.type.toLowerCase();
          return (type.includes('sc') || type.includes('self contained') || type.includes('self-contained')) && p.owner?.role !== 'agent';
        });
      } else {
        result = result.filter((p) => p.type.toLowerCase() === activeTypeFilter.toLowerCase() && p.owner?.role !== 'agent');
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
            <h1 className={styles.title}>Find Verified Rooms & Apartments in Ho</h1>
            <p className={styles.subtitle}>
              Verified rooms, apartments, student hostels, shops & commercial spaces across Ho, Volta Region and Ghana. Zero middleman markups.
            </p>

            <div style={{ display: 'flex', gap: '12px', margin: '8px 0 16px', flexWrap: 'wrap' }}>
              <a href="#properties" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '30px', fontWeight: 600, color: '#fff' }}>
                <Search size={16} /> Browse Rentals
              </a>
            </div>

            <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search location, campus (UHAS, HTU), or property title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                  aria-label="Search location, hostel or property"
                />
              </div>
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

        {/* Property Type Filter Chips */}
        <div className={styles.chipsWrapper}>
          <div className={styles.chipsOuter}>
            <div className={styles.chipsContainer}>
              {TYPE_CHIPS.map((chip) => {
                const isSelfContained = chip.type === 'self-contained';
                const isFilters = chip.type === 'filters';
                const isActive =
                  activeTypeFilter === chip.type ||
                  (isSelfContained &&
                    SELF_CONTAINED_OPTIONS.some((opt) => opt.type === activeTypeFilter));

                if (isSelfContained) {
                  return (
                    <button
                      key={chip.type}
                      ref={selfContainedBtnRef}
                      type="button"
                      className={`${styles.chip} ${isActive ? styles.activeChip : ''}`}
                      onClick={() => handleChipClick(chip.type)}
                    >
                      <span>{chip.label}</span>
                      <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: showSelfContainedDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    </button>
                  );
                }

                return (
                  <button
                    key={chip.type}
                    type="button"
                    className={`${styles.chip} ${isActive ? styles.activeChip : ''}`}
                    onClick={() => handleChipClick(chip.type)}
                  >
                    {isFilters && <SlidersHorizontal size={14} />}
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Self-Contained dropdown — rendered as fixed overlay outside scroll container */}
        {showSelfContainedDropdown && dropdownPos && (
          <div
            ref={dropdownRef}
            className={styles.dropdownMenu}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              zIndex: 99999,
            }}
          >
            {SELF_CONTAINED_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleSelfContainedSelect(opt.type)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
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
          ) : activeTypeFilter === 'agents' ? (
            agents.length === 0 ? (
              <div className={styles.noListingsCard}>
                <Building size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                <h3>No Verified Agents Listed Yet</h3>
                <p>No verified rental agents are available at the moment.</p>
              </div>
            ) : (
              <div className={styles.gridCards}>
                {agents.map((agent, index) => {
                  const agentProps = properties.filter(
                    (p) => String(p.owner?.id) === String(agent.id)
                  );
                  const count = agentProps.length;

                  return (
                    <div
                      key={agent.id}
                      className={`${styles.propertyCard} animate-slide-up`}
                      style={{
                        animationDelay: `${index * 80}ms`,
                        padding: '22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-surface-secondary)',
                            border: '2px solid var(--primary)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.4rem'
                          }}>
                            {agent.profileImage ? (
                              <img src={agent.profileImage} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              agent.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                {agent.name}
                              </h3>
                              <ShieldCheck size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                            </div>
                            <span style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700 }}>
                              Verified Rental Agent
                            </span>
                          </div>
                        </div>

                        {agent.agentLocation && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span>{agent.agentLocation}</span>
                          </div>
                        )}

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {agent.bio || 'Verified independent rental agent on HO Rentals. Contact directly to arrange viewings.'}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          🏢 {count} Active {count === 1 ? 'Listing' : 'Listings'}
                        </span>

                        <Link
                          href={`/agents/${agent.id}`}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '7px 14px', fontSize: '0.8rem', borderRadius: '20px', textDecoration: 'none', fontWeight: 700 }}
                        >
                          View Agent Profile →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
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
                {user && (user.role === 'agent' || user.role === 'partner' || user.role === 'admin') && (
                  <Link href="/upload" className="btn btn-primary">
                    Post Your Listing
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.gridCards}>
              {filteredProperties.slice(0, 10).map((p, index) => {
                const isSaved = savedIds.includes(p.id);
                return (
                  <Link 
                    href={`/properties/${p.id}`} 
                    key={p.id} 
                    className={`${styles.propertyCard} ${p.isFeatured ? styles.featuredCard : ''} animate-slide-up`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={styles.imageWrapper}>
                      <img 
                        src={getOptimizedImageUrl(p.imageUrl || getFallbackImage(p.type), 600)} 
                        alt={p.title} 
                        className={styles.propertyImage}
                        loading="lazy"
                        decoding="async"
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
                          {getStatusLabel(p.status, p.type)}
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
                        const isLand = p.type?.toLowerCase().includes('land');
                        const isFurniture = p.type?.toLowerCase().includes('furniture');
                        const isShop = p.type?.toLowerCase().includes('shop');
                        const rawDesc = p.description || '';

                        if (isLand || isFurniture || isShop) {
                          return (
                            <p
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                margin: '4px 0 0',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: '1.35'
                              }}
                            >
                              {rawDesc || 'Verified listing — click to view full details.'}
                            </p>
                          );
                        }

                        const desc = rawDesc.toLowerCase();
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div className={styles.amenitiesRow}>
                              {showBed && <span className={styles.amenity}>🛏️ Bed/Room</span>}
                              {showWater && <span className={styles.amenity}>💧 Water</span>}
                              {showPrepaid && <span className={styles.amenity}>⚡ Prepaid</span>}
                              {showWifi && <span className={styles.amenity}>📶 WiFi</span>}
                              {showParking && <span className={styles.amenity}>🚗 Parking</span>}
                            </div>
                            {rawDesc && (
                              <p
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted)',
                                  margin: '2px 0 0',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '1.3'
                                }}
                              >
                                {rawDesc}
                              </p>
                            )}
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
