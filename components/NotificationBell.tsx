'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, Sparkles, CheckCheck, Building2, ChevronRight } from 'lucide-react';
import {
  graphqlRequest,
  GET_PROPERTIES,
  READ_NOTIFICATION_IDS_QUERY,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '../lib/graphql';
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

  // Stable user ID string for consistent hook dependency sizing
  const currentUserId = userId ? String(userId) : '';
  const storageKey = currentUserId ? `read_notifications_user_${currentUserId}` : 'read_notifications_guest';

  // Load from localStorage (both user-specific key and global fallback key)
  const loadLocalReadIds = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const globalStored = localStorage.getItem('read_notifications_global');
      const userStored = localStorage.getItem(storageKey);
      const gIds = globalStored ? JSON.parse(globalStored) : [];
      const uIds = userStored ? JSON.parse(userStored) : [];
      return Array.from(new Set([...gIds, ...uIds].map(String)));
    } catch {
      return [];
    }
  };

  const saveLocalReadIds = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = loadLocalReadIds();
      const merged = Array.from(new Set([...existing, ...ids].map(String)));
      localStorage.setItem('read_notifications_global', JSON.stringify(merged));
      localStorage.setItem(storageKey, JSON.stringify(merged));
      setReadIds(merged);
    } catch (err) {
      console.error('Error saving read notifications:', err);
    }
  };

  useEffect(() => {
    setReadIds(loadLocalReadIds());
  }, [storageKey]);

  // Fetch recent properties and DB read notifications on mount or user login
  useEffect(() => {
    async function fetchRecentListings() {
      try {
        setLoading(true);
        const localRead = loadLocalReadIds();
        setReadIds(localRead);

        const [data, dbReads] = await Promise.all([
          graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES, { limit: 10 }),
          currentUserId
            ? graphqlRequest<{ readNotificationIds: number[] }>(READ_NOTIFICATION_IDS_QUERY).catch(() => ({ readNotificationIds: [] }))
            : Promise.resolve({ readNotificationIds: [] }),
        ]);

        if (data && data.properties) {
          setNewListings(data.properties.slice(0, 8));
        }

        const dbReadStrings = (dbReads?.readNotificationIds || []).map(String);
        const combined = Array.from(new Set([...localRead, ...dbReadStrings]));
        saveLocalReadIds(combined);
      } catch (err) {
        console.error('Error fetching new listing notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentListings();
  }, [currentUserId, storageKey]);

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

  const unreadCount = newListings.filter((p) => !readIds.includes(String(p.id))).length;

  const markAllAsRead = async () => {
    const allIds = newListings.map((p) => String(p.id));
    const numericIds = newListings.map((p) => Number(p.id));
    saveLocalReadIds(allIds);

    if (userId && numericIds.length > 0) {
      try {
        await graphqlRequest(MARK_ALL_NOTIFICATIONS_READ, { propertyIds: numericIds });
      } catch (e) {
        console.error('Failed to mark notifications read in DB:', e);
      }
    }
  };

  const handleItemClick = async (propertyId: string | number) => {
    const idStr = String(propertyId);
    const numId = Number(propertyId);

    if (!readIds.includes(idStr)) {
      saveLocalReadIds([idStr]);

      if (userId) {
        try {
          await graphqlRequest(MARK_NOTIFICATION_READ, { propertyId: numId });
        } catch (e) {
          console.error('Failed to mark notification read in DB:', e);
        }
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
