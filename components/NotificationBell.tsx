'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Sparkles, CheckCheck, Building2, ChevronRight } from 'lucide-react';
import { graphqlRequest, GET_PROPERTIES } from '../lib/graphql';
import { Property, getOptimizedImageUrl } from '../lib/types';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  userId?: string | number;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newListings, setNewListings] = useState<Property[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Key for local storage based on user ID
  const storageKey = userId ? `read_notifications_user_${userId}` : 'read_notifications_guest';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setReadIds(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Error reading read notifications from localStorage:', err);
      }
    }
  }, [storageKey]);

  // Fetch recent properties when component mounts
  useEffect(() => {
    async function fetchRecentListings() {
      try {
        setLoading(true);
        const data = await graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES, {
          limit: 10,
        });
        if (data && data.properties) {
          // Sort by creation date or take recent properties
          setNewListings(data.properties.slice(0, 8));
        }
      } catch (err) {
        console.error('Error fetching new listing notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentListings();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = newListings.filter(p => !readIds.includes(String(p.id))).length;

  const markAllAsRead = () => {
    const allIds = newListings.map(p => String(p.id));
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }
  };

  const handleItemClick = (propertyId: string | number) => {
    const idStr = String(propertyId);
    if (!readIds.includes(idStr)) {
      const updated = [...readIds, idStr];
      setReadIds(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={styles.bellContainer} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.bellBtn}
        aria-label="New Listing Notifications"
        title="New Listing Alerts"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>
              <Sparkles size={16} style={{ color: 'var(--primary)' }} />
              New Listings Alert
            </span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.markReadBtn}>
                <CheckCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.notificationsList}>
            {loading ? (
              <div className={styles.emptyState}>Loading new listings...</div>
            ) : newListings.length === 0 ? (
              <div className={styles.emptyState}>No recent listings found.</div>
            ) : (
              newListings.map((property) => {
                const isUnread = !readIds.includes(String(property.id));
                const isFurniture = property.type?.toLowerCase().includes('furniture');
                return (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className={`${styles.notificationItem} ${isUnread ? styles.unreadItem : ''}`}
                    onClick={() => handleItemClick(property.id)}
                  >
                    {isUnread && <span className={styles.unreadDot} />}
                    <img
                      src={getOptimizedImageUrl(property.imageUrl || '/placeholder.png', 120)}
                      alt={property.title}
                      className={styles.itemImage}
                    />
                    <div className={styles.itemContent}>
                      <div className={styles.itemTitle}>{property.title}</div>
                      <div className={styles.itemMeta}>
                        <span className={styles.itemPrice}>
                          GH₵{property.price?.toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>{property.location}</span>
                      </div>
                      <div className={styles.itemTime}>
                        {isFurniture ? '📦 New Furniture' : '🏠 New Rental Listing'}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className={styles.dropdownFooter}>
            <Link
              href="/properties"
              className={styles.viewAllLink}
              onClick={() => setIsOpen(false)}
            >
              Browse All Properties &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
