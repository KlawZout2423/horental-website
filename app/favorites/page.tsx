'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Heart, MapPin, Loader, ArrowLeft, Trash2, Search } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES } from '../../lib/graphql';
import { Property, getPricePeriodLabel } from '../../lib/types';
import AuthPromptModal from '../../components/AuthPromptModal';
import styles from './favorites.module.css';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/favorites');
    }
  }, [user, authLoading, router]);

  // Auth prompt modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetPropertyId, setTargetPropertyId] = useState<number | string | null>(null);

  // Read saved IDs from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('saved_properties');
      if (raw) {
        setSavedIds(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Error reading saved properties:', e);
    }
  }, []);

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        const data = await graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES);
        if (data && data.properties) {
          setProperties(data.properties);
        }
      } catch (err) {
        console.error('Failed to fetch properties for favorites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  const handleRemoveFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = savedIds.filter((savedId) => savedId !== id);
    setSavedIds(updated);
    localStorage.setItem('saved_properties', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    setSavedIds([]);
    localStorage.setItem('saved_properties', JSON.stringify([]));
  };

  const handleCardClick = (e: React.MouseEvent, propertyId: string) => {
    if (!user) {
      e.preventDefault();
      setTargetPropertyId(propertyId);
      setShowAuthModal(true);
    }
  };

  const savedProperties = properties.filter((p) => savedIds.includes(p.id));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className={styles.title}>
              <Heart size={30} className={styles.titleIcon} fill="var(--primary)" /> My Favorite Rentals
            </h1>
            <p className={styles.subtitle}>
              {savedProperties.length} {savedProperties.length === 1 ? 'property' : 'properties'} saved to your bookmarks
            </p>
          </div>

          {savedProperties.length > 0 && (
            <button
              onClick={handleClearAll}
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
            >
              <Trash2 size={16} /> Clear All Favorites
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {[1, 2, 3].map((n) => (
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
      ) : savedProperties.length === 0 ? (
        <div className={styles.emptyState}>
          <Heart size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No Favorite Properties Saved</h2>
          <p className={styles.emptyDesc}>
            You haven't saved any rental properties yet. Browse available hostels, rooms, and apartments and click the heart icon to save them here.
          </p>
          <Link href="/properties" className="btn btn-primary" style={{ marginTop: '8px' }}>
            <Search size={18} /> Browse Available Rentals
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {savedProperties.map((p) => (
            <Link
              href={`/properties/${p.id}`}
              key={p.id}
              onClick={(e) => handleCardClick(e, p.id)}
              className={styles.propertyCard}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={p.imageUrl || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
                  alt={p.title}
                  className={styles.propertyImage}
                />
                <button
                  onClick={(e) => handleRemoveFavorite(e, p.id)}
                  className={styles.saveButton}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >
                  <Heart size={18} fill="var(--primary)" color="var(--primary)" />
                </button>
              </div>

              <div className={styles.cardContent}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <span className={`badge badge-${p.status === 'available' ? 'available' : 'rented'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {p.status}
                  </span>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600, padding: '2px 8px', fontSize: '0.7rem' }}>
                    {p.type}
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{p.title}</h3>

                <div className={styles.cardLocation} style={{ marginTop: '6px' }}>
                  <MapPin size={12} style={{ color: 'var(--primary)' }} />
                  <span>{p.location}</span>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.cardPrice}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>GH₵{p.price.toLocaleString()}</span>
                    <span className={styles.cardPricePeriod}>{getPricePeriodLabel(p.description, true)}</span>
                  </div>
                  <span className={styles.viewDetailsBtn}>View Details &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        targetPropertyId={targetPropertyId}
      />
    </div>
  );
}
