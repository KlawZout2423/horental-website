'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, SlidersHorizontal, RefreshCcw, Star, Heart, X } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, GET_PROPERTIES } from '../../lib/graphql';
import styles from './properties.module.css';
import AuthPromptModal from '../../components/AuthPromptModal';

import { Property, getPricePeriodLabel, matchesAdvancedFilters } from '../../lib/types';

// All property type categories matching the Flutter app chips list
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

  // Authenticate user before seeing search results
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, user]);

  const handleCardClick = (e: React.MouseEvent, propertyId: string) => {
    if (!user) {
      e.preventDefault();
      setTargetPropertyId(propertyId);
      setShowAuthModal(true);
    }
  };

  // Calculate dynamic maximum price for range slider (rounded up to nearest 100)
  const maxPossiblePrice = properties.length > 0
    ? Math.ceil(Math.max(...properties.map(p => p.price)) / 100) * 100
    : 10000;

  // Read URL search params on mount
  useEffect(() => {
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'All';
    setSearchQuery(search);
    setPropertyType(type);
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

    // Log unique page visit (24h cooldown)
    if (typeof window !== 'undefined') {
      const storageKey = 'visit_search_timestamp';
      const lastVisit = localStorage.getItem(storageKey);
      const now = Date.now();
      const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

      if (!lastVisit || now - parseInt(lastVisit, 10) > COOLDOWN) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: '/properties' })
          .then(() => localStorage.setItem(storageKey, String(now)))
          .catch((err) => console.error('Page visit log error:', err));
      }
    }
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
    if (propertyType !== 'All') {
      if (propertyType.toLowerCase() === 'self-contained') {
        result = result.filter((p) => {
          const type = p.type.toLowerCase();
          return type.includes('sc') || type.includes('self contained') || type.includes('self-contained');
        });
      } else {
        result = result.filter((p) => p.type.toLowerCase() === propertyType.toLowerCase());
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
    <div className={`${styles.container} animate-fade-in`}>
      <h1 className={styles.title}>Search Properties</h1>
      <p className={styles.subtitle}>Filter and browse rooms, apartments, hostels, shops and lands in Ho and the Volta Region</p>

      {/* Sticky Mobile Filter Toggle Bar */}
      <div className={styles.mobileFilterBar}>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={styles.mobileFilterToggle}
          aria-label="Filter Listings"
        >
          <SlidersHorizontal size={14} />
          <span>{showMobileFilters ? 'Hide Filters' : 'Filter Listings'}</span>
        </button>
        {(searchQuery || propertyType !== 'All' || minPrice || maxPrice || availability !== 'All') && (
          <button onClick={handleResetFilters} className={styles.mobileResetBtn}>
            Clear Filters
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
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={16} /> Filters
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={handleResetFilters} className={styles.resetButton}>
                Reset All
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className={styles.closeMobileFilterBtn}
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Search text filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="search-keyword">Search Keyword</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="search-keyword"
                type="text"
                placeholder="Search location, hostel or property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '36px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
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
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <option value="All">All Categories</option>
              <option value="self-contained">Self-Contained (All)</option>
              {PROPERTY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div className={styles.filterGroup}>
            <label id="price-range-label">Price Range (GH₵)</label>
            <div className={styles.priceRangeInputs}>
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className={styles.priceInput}
                aria-label="Minimum price in GH₵"
              />
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={styles.priceInput}
                aria-label="Maximum price in GH₵"
              />
            </div>

            {/* Range Slider for Max Price */}
            <div style={{ marginTop: '12px' }}>
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
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--border)'
                }}
                aria-label="Maximum price slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <span>GH₵0</span>
                <span>Max: {maxPrice ? `GH₵${Number(maxPrice).toLocaleString()}` : 'Any'}</span>
                <span>GH₵{maxPossiblePrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Availability Status Filter */}
          <div className={styles.filterGroup}>
            <label>Availability</label>
            <div className={styles.radioList}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="availability"
                  checked={availability === 'All'}
                  onChange={() => setAvailability('All')}
                />
                All Properties
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="availability"
                  checked={availability === 'Available'}
                  onChange={() => setAvailability('Available')}
                />
                Available Only
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="availability"
                  checked={availability === 'Rented'}
                  onChange={() => setAvailability('Rented')}
                />
                Rented / Occupied
              </label>
            </div>
          </div>

          {/* Water Facilities Filter */}
          <div className={styles.filterGroup} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>💧 Water Supply</span>
              {selectedWaterTypes.length > 0 && <span className={styles.activeFilterCount}>{selectedWaterTypes.length}</span>}
            </label>
            <div className={styles.checkboxList}>
              {[
                { id: 'ghana-water', label: 'Ghana Water Supply', value: 'Ghana Water' },
                { id: 'polytank-water', label: 'Polytank / Storage Tank', value: 'Polytank' },
                { id: 'borehole-water', label: 'Borehole Water', value: 'Borehole' },
                { id: 'well-water', label: 'Well Water', value: 'Well' },
              ].map((item) => (
                <label key={item.id} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={selectedWaterTypes.includes(item.value)}
                    onChange={() => handleToggleWaterFilter(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Metering & Electricity Filter */}
          <div className={styles.filterGroup} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>⚡ Electricity & Metering</span>
              {selectedMeterTypes.length > 0 && <span className={styles.activeFilterCount}>{selectedMeterTypes.length}</span>}
            </label>
            <div className={styles.checkboxList}>
              {[
                { id: 'prepaid-meter', label: 'ECG Prepaid Meter', value: 'Prepaid' },
                { id: 'separate-meter', label: 'ECG Separate Meter / Postpaid', value: 'Postpaid' },
                { id: 'shared-meter', label: 'ECG Shared Meter', value: 'Shared' },
              ].map((item) => (
                <label key={item.id} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={selectedMeterTypes.includes(item.value)}
                    onChange={() => handleToggleMeterFilter(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amenities & Comfort Checklist Filter */}
          <div className={styles.filterGroup} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>✨ Comforts & Security</span>
              {selectedAmenities.length > 0 && <span className={styles.activeFilterCount}>{selectedAmenities.length}</span>}
            </label>
            <div className={styles.checkboxList}>
              {[
                { id: 'amenity-wifi', label: 'High-Speed WiFi', value: 'WiFi' },
                { id: 'amenity-ac', label: 'Air Conditioning (AC)', value: 'AC' },
                { id: 'amenity-desk', label: 'Study Desk & Chair', value: 'Study Desk' },
                { id: 'amenity-furnished', label: 'Furnished / Bed Included', value: 'Furnished' },
                { id: 'amenity-cctv', label: 'CCTV Security Camera', value: 'CCTV' },
                { id: 'amenity-gated', label: 'Gated & Fenced', value: 'Gated & Fenced' },
                { id: 'amenity-parking', label: 'Vehicle Parking Space', value: 'Parking' },
              ].map((item) => (
                <label key={item.id} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(item.value)}
                    onChange={() => handleToggleAmenityFilter(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.mobileDrawerFooter}>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px', fontWeight: 700 }}
            >
              Show {filteredProperties.length} Properties
            </button>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="btn btn-outline"
              style={{ padding: '12px 16px', fontWeight: 600 }}
            >
              Cancel
            </button>
          </div>
        </aside>

        {/* Listings Display Area */}
        <div className={styles.listingsArea}>
          <div className={styles.resultsHeader}>
            <span>Found {filteredProperties.length} properties</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label htmlFor="sort-select" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
                className={styles.selectInput}
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
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
                  <Link
                    href={`/properties/${p.id}`}
                    key={p.id}
                    onClick={(e) => handleCardClick(e, p.id)}
                    className={`${styles.propertyCard} animate-slide-up`}
                    style={{ animationDelay: `${index * 50}ms` }}
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
      </div>

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          if (!user) {
            router.push('/');
          }
        }}
        targetPropertyId={targetPropertyId}
      />
    </div>
  );
}
