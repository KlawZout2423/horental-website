'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, SlidersHorizontal, RefreshCcw, Star, Heart, X, ChevronDown, Check, Droplets, Zap, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, GET_PROPERTIES } from '../../lib/graphql';
import { trackVisit } from '../../lib/trackVisit';
import styles from './properties.module.css';
import AuthPromptModal from '../../components/AuthPromptModal';


import { Property, getPricePeriodLabel, matchesAdvancedFilters, getOptimizedImageUrl, getStatusLabel } from '../../lib/types';



const POPULAR_AREAS = [
  { name: 'UHAS', icon: '🎓', label: 'UHAS Campus' },
  { name: 'Ho Poly', icon: '🏫', label: 'Ho Poly / HTU' },
  { name: 'SSNIT Flats', icon: '🏢', label: 'SSNIT Flats' },
  { name: 'Bankoe', icon: '🏙️', label: 'Bankoe' },
  { name: 'Sokode', icon: '🏡', label: 'Sokode' },
  { name: 'Civic Centre', icon: '📍', label: 'Civic Centre' }
];

const PROPERTY_CATEGORIES = [
  'Student Hostel',
  'Single Room',
  'Chamber & Hall',
  'Single Room SC',
  'Chamber and Hall SC',
  'Two Bedroom SC',
  'Three Bedroom SC',
  'Four Bedroom SC',
  'Furnitures',
  'Lands',
  'Shops',
  'Short Stay'
];

export default function PropertiesClient() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availability, setAvailability] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Advanced Multi-Criteria Filter States
  const [selectedWaterTypes, setSelectedWaterTypes] = useState<string[]>([]);
  const [selectedMeterTypes, setSelectedMeterTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Bookmark active state
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(null);



  // Calculate dynamic maximum price for range slider (rounded up to nearest 100)
  const maxPossiblePrice = properties.length > 0
    ? Math.ceil(Math.max(...properties.map(p => p.price)) / 100) * 100
    : 10000;

  // Read URL search params on mount
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'All';
    const openFilters = searchParams.get('openFilters') === 'true';
    setSearchQuery(search);
    setPropertyType(type);
    if (openFilters) {
      setShowMobileFilters(true);
    }
  }, [searchParams]);

  // Fetch properties from GraphQL backend
  useEffect(() => {
    async function fetchProperties() {
      try {
        const data = await graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES);
        if (data && data.properties) {
          setProperties(data.properties);
          setFilteredProperties(data.properties);
        }
      } catch (e) {
        console.error('Error loading properties:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();

    // Log unique page visit with UTM + referrer (24h cooldown)
    trackVisit('/properties', 'visit_search_timestamp');
  }, []);

  // Recalculate filtered properties
  useEffect(() => {
    let result = properties;

    // Filter by text search (title, location, description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Filter by property type
    if (propertyType === 'All') {
      // Exclude agent properties from the default "All" filter
      result = result.filter((p) => p.owner?.role !== 'agent');
    } else if (propertyType.toLowerCase() === 'agents') {
      result = result.filter((p) => p.owner?.role === 'agent');
    } else {
      if (propertyType.toLowerCase() === 'self-contained') {
        result = result.filter((p) => {
          const type = p.type.toLowerCase();
          return (type.includes('sc') || type.includes('self contained') || type.includes('self-contained')) && p.owner?.role !== 'agent';
        });
      } else {
        result = result.filter((p) => p.type.toLowerCase() === propertyType.toLowerCase() && p.owner?.role !== 'agent');
      }
    }

    // Filter by min price
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        result = result.filter((p) => p.price >= min);
      }
    }

    // Filter by max price
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        result = result.filter((p) => p.price <= max);
      }
    }

    // Filter by availability
    if (availability !== 'All') {
      result = result.filter((p) => p.status.toLowerCase() === availability.toLowerCase());
    }

    // Filter by Advanced Criteria (Water, Metering, Amenities)
    result = result.filter((p) =>
      matchesAdvancedFilters(p.description, {
        waterTypes: selectedWaterTypes,
        meterTypes: selectedMeterTypes,
        amenities: selectedAmenities,
      })
    );

    // Sort results
    const sorted = [...result];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => b.price - a.price);
    }

    setFilteredProperties(sorted);
  }, [searchQuery, propertyType, minPrice, maxPrice, availability, sortBy, selectedWaterTypes, selectedMeterTypes, selectedAmenities, properties]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPropertyType('All');
    setMinPrice('');
    setMaxPrice('');
    setAvailability('All');
    setSelectedWaterTypes([]);
    setSelectedMeterTypes([]);
    setSelectedAmenities([]);
  };

  const handleToggleWaterFilter = (type: string) => {
    setSelectedWaterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleMeterFilter = (type: string) => {
    setSelectedMeterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleAmenityFilter = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const activeAdvancedFilterCount = selectedWaterTypes.length + selectedMeterTypes.length + selectedAmenities.length;

  // Pulse the show button when filtered count changes
  const [btnPulse, setBtnPulse] = useState(false);
  const prevCountRef = useRef(filteredProperties.length);
  useEffect(() => {
    if (prevCountRef.current !== filteredProperties.length) {
      prevCountRef.current = filteredProperties.length;
      setBtnPulse(true);
      const t = setTimeout(() => setBtnPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [filteredProperties.length]);

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

  const activeFiltersCount = [
    searchQuery ? 1 : 0,
    propertyType !== 'All' ? 1 : 0,
    minPrice ? 1 : 0,
    maxPrice ? 1 : 0,
    availability !== 'All' ? 1 : 0,
    selectedWaterTypes.length,
    selectedMeterTypes.length,
    selectedAmenities.length,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <h1 className={styles.title} style={{ marginBottom: '12px' }}>Filter &amp; Search Properties</h1>



      {/* Sticky Mobile Filter Toggle Bar */}
      <div className={styles.mobileFilterBar}>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={styles.mobileFilterToggle}
          aria-label="Filter Listings"
        >
          <SlidersHorizontal size={14} />
          <span>{showMobileFilters ? 'Hide Filters' : `Filter Listings ${activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}`}</span>
        </button>
        {activeFiltersCount > 0 && (
          <button onClick={handleResetFilters} className={styles.mobileResetBtn}>
            Clear Filters ({activeFiltersCount})
          </button>
        )}
      </div>

      <div className={styles.layout}>
        {/* Backdrop for mobile modal filter drawer */}
        {showMobileFilters && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        {/* Sidebar Filters */}
        <aside className={`${styles.sidebar} ${showMobileFilters ? styles.showMobile : ''}`}>
          <div className={styles.filterSectionTitle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className={styles.filterIconBadge}>
                <SlidersHorizontal size={15} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Filters</span>
              {((searchQuery.trim() ? 1 : 0) + (propertyType !== 'All' ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (availability !== 'All' ? 1 : 0) + selectedWaterTypes.length + selectedMeterTypes.length + selectedAmenities.length) > 0 && (
                <span className={styles.activeFilterCount}>
                  {(searchQuery.trim() ? 1 : 0) + (propertyType !== 'All' ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (availability !== 'All' ? 1 : 0) + selectedWaterTypes.length + selectedMeterTypes.length + selectedAmenities.length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {((searchQuery.trim() ? 1 : 0) + (propertyType !== 'All' ? 1 : 0) + (minPrice || maxPrice ? 1 : 0) + (availability !== 'All' ? 1 : 0) + selectedWaterTypes.length + selectedMeterTypes.length + selectedAmenities.length) > 0 && (
                <button onClick={handleResetFilters} className={styles.resetButton} title="Clear all active filters">
                  <RefreshCcw size={11} style={{ marginRight: '4px', display: 'inline' }} /> Reset
                </button>
              )}
              <button
                onClick={() => setShowMobileFilters(false)}
                className={styles.closeMobileFilterBtn}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable filter content */}
          <div className={styles.sidebarScrollArea}>

            {/* Search text filter */}
            <div className={styles.filterGroup}>
              <label htmlFor="search-keyword">Search Keyword</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="search-keyword"
                  type="text"
                  placeholder="Search location, hostel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '34px', paddingRight: searchQuery ? '32px' : '10px', fontSize: '0.84rem' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '11px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                    }}
                    aria-label="Clear search keyword"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Property Type Filter */}
            <div className={styles.filterGroup}>
              <label htmlFor="accommodation-type">Accommodation Type</label>
              <select
                id="accommodation-type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className={styles.selectInput}
                style={{ backgroundColor: 'var(--bg-surface)', fontSize: '0.84rem' }}
              >
                <option value="All">All Categories</option>
                <option value="self-contained">Self-Contained (All SC)</option>
                {PROPERTY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className={styles.filterGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label id="price-range-label">Budget (GH₵)</label>
                {(minPrice || maxPrice) && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                    {minPrice ? `GH₵${minPrice}` : '0'} – {maxPrice ? `GH₵${maxPrice}` : 'Max'}
                  </span>
                )}
              </div>
              <div className={styles.priceRangeInputs}>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className={styles.priceInput}
                  aria-label="Minimum price in GH₵"
                />
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className={styles.priceInput}
                  aria-label="Maximum price in GH₵"
                />
              </div>
              <div style={{ marginTop: '6px' }}>
                <input
                  type="range"
                  min="0"
                  max={maxPossiblePrice}
                  step="50"
                  value={maxPrice ? Number(maxPrice) : maxPossiblePrice}
                  onChange={(e) => setMaxPrice(e.target.value === String(maxPossiblePrice) ? '' : e.target.value)}
                  style={{
                    width: '100%',
                    accentColor: 'var(--primary)',
                    cursor: 'pointer',
                    height: '5px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--border)'
                  }}
                  aria-label="Maximum price slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>GH₵0</span>
                  <span>Max: {maxPrice ? `GH₵${Number(maxPrice).toLocaleString()}` : 'Any'}</span>
                  <span>GH₵{maxPossiblePrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Availability Status - Modern Segmented Switch */}
            <div className={styles.filterGroup}>
              <label>Availability</label>
              <div className={styles.segmentedControl}>
                {[
                  { label: 'All', value: 'All' },
                  { label: 'Available', value: 'Available' },
                  { label: 'Rented', value: 'Rented' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={`${styles.segmentedBtn} ${availability === tab.value ? styles.segmentedBtnActive : ''}`}
                    onClick={() => setAvailability(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Group 1: Water Supply */}
            <div className={styles.filterCardSection}>
              <div className={styles.filterCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Droplets size={14} style={{ color: '#06B6D4' }} />
                  <span className={styles.filterCardTitle}>Water Supply</span>
                </div>
                {selectedWaterTypes.length > 0 && (
                  <span className={styles.sectionBadge}>{selectedWaterTypes.length}</span>
                )}
              </div>
              <div className={styles.featureGrid}>
                {[
                  { label: 'Ghana Water', icon: '💧', value: 'Ghana Water' },
                  { label: 'Polytank', icon: '🪣', value: 'Polytank' },
                  { label: 'Borehole', icon: '🏗️', value: 'Borehole' },
                  { label: 'Well Water', icon: '🚰', value: 'Well' },
                ].map((item) => {
                  const isSelected = selectedWaterTypes.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.featureCard} ${isSelected ? styles.featureCardActive : ''}`}
                      onClick={() => handleToggleWaterFilter(item.value)}
                    >
                      <span className={styles.featureCardIcon}>{item.icon}</span>
                      <span className={styles.featureCardLabel}>{item.label}</span>
                      {isSelected && <Check size={12} className={styles.featureCheckIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Group 2: Electricity & Metering */}
            <div className={styles.filterCardSection}>
              <div className={styles.filterCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={14} style={{ color: '#F59E0B' }} />
                  <span className={styles.filterCardTitle}>Electricity &amp; Meter</span>
                </div>
                {selectedMeterTypes.length > 0 && (
                  <span className={styles.sectionBadge}>{selectedMeterTypes.length}</span>
                )}
              </div>
              <div className={styles.featureGrid}>
                {[
                  { label: 'ECG Prepaid', icon: '⚡', value: 'Prepaid' },
                  { label: 'ECG Separate', icon: '🔌', value: 'Postpaid' },
                  { label: 'ECG Shared', icon: '🤝', value: 'Shared' },
                ].map((item) => {
                  const isSelected = selectedMeterTypes.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.featureCard} ${isSelected ? styles.featureCardActive : ''}`}
                      onClick={() => handleToggleMeterFilter(item.value)}
                    >
                      <span className={styles.featureCardIcon}>{item.icon}</span>
                      <span className={styles.featureCardLabel}>{item.label}</span>
                      {isSelected && <Check size={12} className={styles.featureCheckIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Group 3: Comforts & Security */}
            <div className={styles.filterCardSection}>
              <div className={styles.filterCardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} style={{ color: '#10B981' }} />
                  <span className={styles.filterCardTitle}>Amenities &amp; Security</span>
                </div>
                {selectedAmenities.length > 0 && (
                  <span className={styles.sectionBadge}>{selectedAmenities.length}</span>
                )}
              </div>
              <div className={styles.featureGrid}>
                {[
                  { label: 'WiFi', icon: '📶', value: 'WiFi' },
                  { label: 'AC', icon: '❄️', value: 'AC' },
                  { label: 'Furnished', icon: '🛋️', value: 'Furnished' },
                  { label: 'Study Desk', icon: '📚', value: 'Study Desk' },
                  { label: 'CCTV Camera', icon: '📹', value: 'CCTV' },
                  { label: 'Gated / Fenced', icon: '🚪', value: 'Gated & Fenced' },
                  { label: 'Parking', icon: '🚗', value: 'Parking' },
                ].map((item) => {
                  const isSelected = selectedAmenities.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`${styles.featureCard} ${isSelected ? styles.featureCardActive : ''}`}
                      onClick={() => handleToggleAmenityFilter(item.value)}
                    >
                      <span className={styles.featureCardIcon}>{item.icon}</span>
                      <span className={styles.featureCardLabel}>{item.label}</span>
                      {isSelected && <Check size={12} className={styles.featureCheckIcon} />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>{/* end sidebarScrollArea */}

          {/* Pinned footer — always visible at bottom of drawer */}
          <div className={styles.mobileDrawerFooter}>
            <button
              onClick={() => setShowMobileFilters(false)}
              className={`btn btn-primary ${styles.showPropertiesBtn} ${btnPulse ? styles.showPropertiesBtnPulse : ''}`}
            >
              <span style={{ fontSize: '1.05rem' }}>
                {filteredProperties.length === 0
                  ? 'No Results — Clear Filters'
                  : `Show ${filteredProperties.length} ${filteredProperties.length === 1 ? 'Property' : 'Properties'} →`}
              </span>
            </button>
            <button
              onClick={handleResetFilters}
              className={`btn btn-outline ${styles.resetDrawerBtn}`}
            >
              Reset
            </button>
          </div>
        </aside>

        {/* Listings Display Area */}
        <div className={styles.listingsArea}>
          <div className={styles.resultsHeader}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              Found {filteredProperties.length} properties
            </span>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
              className={styles.sortSelect}
              aria-label="Sort properties"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Sort: Price (Low → High)</option>
              <option value="price_desc">Sort: Price (High → Low)</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.grid}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className={styles.propertyCard} style={{ height: '360px', opacity: 0.6 }}>
                  <div className={styles.imageWrapper} style={{ background: 'var(--border)' }}></div>
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: '40%', height: '18px', background: 'var(--border)', borderRadius: '4px' }}></div>
                    <div style={{ width: '80%', height: '22px', background: 'var(--border)', borderRadius: '4px' }}></div>
                    <div style={{ width: '60%', height: '14px', background: 'var(--border)', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className={styles.noListings}>
              <RefreshCcw size={48} style={{ color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No Properties Match Your Filters</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Try broadening your search keyword or clearing filters.</p>
              <button onClick={handleResetFilters} className="btn btn-outline">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredProperties.map((p, index) => {
                const isSaved = savedIds.includes(p.id);

                return (
                  <React.Fragment key={p.id}>
                    <Link
                      href={`/properties/${p.id}`}
                      className={`${styles.propertyCard} animate-slide-up`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={styles.imageWrapper}>
                        <img
                          src={getOptimizedImageUrl(p.imageUrl || getFallbackImage(p.type), 500)}
                          alt={p.title}
                          className={styles.propertyImage}
                          loading={index < 2 ? "eager" : "lazy"}
                          fetchPriority={index < 2 ? "high" : "low"}
                          decoding="async"
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
                          <span className={`badge badge-${p.status === 'available' ? 'available' : p.status === 'rented' || p.status === 'occupied' ? 'rented' : 'pending'}`} style={{ padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px', fontWeight: 700 }}>
                            {getStatusLabel(p.status, p.type)}
                          </span>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600, padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px' }}>
                            {p.type}
                          </span>
                        </div>

                        <h3 className={styles.cardTitle} style={{ marginTop: '2px', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 700, textTransform: 'capitalize' }}>{p.title}</h3>

                        <div className={styles.cardMetaRow} style={{ marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <div className={styles.cardLocation} style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                            <MapPin size={13} style={{ color: 'var(--primary)' }} />
                            <span>{p.location.toLowerCase().includes('ho') ? p.location : `${p.location}, Ho`}</span>
                          </div>
                          {p.digitalAddress && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary-dark)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                              🇬🇭 {p.digitalAddress}
                            </span>
                          )}
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

                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
        }}
        targetPropertyId={targetPropertyId}
      />
    </div>
  );
}
