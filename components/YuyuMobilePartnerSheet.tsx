'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { X, Car, ShieldCheck } from 'lucide-react';
import styles from './YuyuMobilePartnerSheet.module.css';

export default function YuyuMobilePartnerSheet() {
  const { user, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (loading || !user) {
      setIsVisible(false);
      return;
    }

    if (typeof window === 'undefined') return;

    // Check screen width (mobile only)
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    // Check if previously dismissed by this logged in user
    const storageKey = `yuyu_mobile_partner_dismissed_${user.id}`;
    const dismissed = localStorage.getItem(storageKey);

    if (dismissed !== 'true') {
      // Small timeout to allow login UI smooth transition
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [user, loading]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined' && user) {
      localStorage.setItem(`yuyu_mobile_partner_dismissed_${user.id}`, 'true');
    }
  };

  if (!isVisible || !user) return null;

  return (
    <>
      {/* Dark Overlay Backdrop (Tap outside to close) */}
      <div 
        className={styles.overlay} 
        onClick={handleDismiss} 
        aria-label="Close Yuyu Rides Partner Announcement" 
      />

      {/* Slide-In Sheet Container */}
      <div className={styles.sheet} role="dialog" aria-labelledby="yuyu-partner-title">
        <div className={styles.handle} />

        <div className={styles.headerRow}>
          <div>
            <div className={styles.badge}>
              <ShieldCheck size={13} />
              <span>OFFICIAL PARTNERSHIP</span>
            </div>
            <h2 id="yuyu-partner-title" className={styles.title}>
              HO Rentals × Yuyu Rides 🚗
            </h2>
          </div>

          {/* Prominent High-Visibility Exit Button */}
          <button 
            type="button"
            className={styles.closeBtn} 
            onClick={handleDismiss}
            aria-label="Close"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.logoRow}>
          <img 
            src="/yuyu_rides_logo.jpg" 
            alt="Yuyu Rides Logo" 
            className={styles.logoImg}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className={styles.logoText}>
            <div>Need a keke ride for inspection in Ho?</div>
            <div style={{ color: '#a7f3d0', fontSize: '0.76rem' }}>Ride safely with verified Yuyu drivers.</div>
          </div>
        </div>

        <p className={styles.body}>
          Welcome! As a logged-in user, you get direct access to <strong>Yuyu Rides</strong> keke dispatches for fast, reliable property viewings across Ho, Trafalgar, UHAS &amp; HTU campuses.
        </p>

        <div className={styles.actions}>
          {/* Primary CTA */}
          <Link 
            href="/properties" 
            className={styles.primaryBtn}
            onClick={handleDismiss}
          >
            <Car size={18} />
            Browse Properties with Yuyu
          </Link>

          {/* Clear Secondary Exit Button */}
          <button 
            type="button"
            className={styles.secondaryBtn}
            onClick={handleDismiss}
          >
            Close &amp; Continue
          </button>
        </div>
      </div>
    </>
  );
}
