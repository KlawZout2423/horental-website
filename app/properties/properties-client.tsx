'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, SlidersHorizontal, RefreshCcw, Star, Heart } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES } from '../../lib/graphql';
import styles from './properties.module.css';

import { Property } from '../../lib/types';

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

  // Bookmark active state
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

    // Log unique page visit per session
    if (typeof window !== 'undefined') {
      const hasVisited = sessionStorage.getItem('visit_search');
      if (!hasVisited) {
        graphqlRequest(`
          mutation RecordVisit($path: String!) {
            recordPageVisit(path: $path)
          }
        `, { path: '/properties' })
          .then(() => sessionStorage.setItem('visit_search', 'true'))
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

    setFilteredProperties(result);
  }, [searchQuery, propertyType, minPrice, maxPrice, availability, properties]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPropertyType('All');
    setMinPrice('');
    setMaxPrice('');
    setAvailability('All');
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
    <div className={`${styles.container} animate-fade-in`}>
      <h1 className={styles.title}>Search Accommodations</h1>
      <p className={styles.subtitle}>Filter and discover student hostels, rooms, and self-contained apartments near campus</p>

      {/* Sticky Mobile Filter Toggle Bar */}
      <div className={styles.mobileFilterBar}>
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className={styles.mobileFilterToggle}
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
        {/* Sidebar Filters */}
        <aside className={`${styles.sidebar} ${showMobileFilters ? styles.showMobile : ''}`}>
          <div className={styles.filterSectionTitle}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={16} /> Filters
            </span>
            <button onClick={handleResetFilters} className={styles.resetButton}>
              Reset All
            </button>
          </div>

          {/* Search text filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="search-keyword">Search Keyword</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="search-keyword"
                type="text"
                placeholder="Search campus or area..."
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

          <button
            onClick={() => setShowMobileFilters(false)}
            className={`btn btn-primary ${styles.mobileApplyBtn}`}
            style={{ marginTop: '16px' }}
          >
            Apply Filters
          </button>
        </aside>

        {/* Listings Display Area */}
        <div className={styles.listingsArea}>
          <div className={styles.resultsHeader}>
            <span>Found {filteredProperties.length} properties</span>
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
      </div>
    </div>
  );
}
