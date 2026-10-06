'use client';

import React from 'react';
import { 
  PhoneCall, 
  MessageCircle, 
  Car, 
  ArrowRight 
} from 'lucide-react';
import { SITE_CONFIG } from '../lib/siteConfig';
import styles from './UnderUpdateView.module.css';

interface UnderUpdateViewProps {
  onBypass?: () => void;
}

export default function UnderUpdateView({ onBypass }: UnderUpdateViewProps = {}) {
  const waUrl = `https://wa.me/${SITE_CONFIG.whatsAppNumber}?text=${encodeURIComponent(SITE_CONFIG.whatsAppDefaultMessage)}`;
  const yuyuWaUrl = `https://wa.me/${SITE_CONFIG.yuyuWhatsAppNumber}?text=${encodeURIComponent("Hi Yuyu Rides! 🚗 I would like to request an inspection ride for properties in Ho via HO Rentals.")}`;

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      <div className={styles.inner}>
        {/* Status Badge */}
        <div className={styles.badge}>
          <div className={styles.pulseDot} />
          <span>SCHEDULED SYSTEM UPGRADE & CATALOG ALIGNMENT</span>
        </div>

        {/* Headline */}
        <h1 className={styles.mainTitle}>
          We Are Currently <span className={styles.highlightText}>Updating Our Listings</span>
        </h1>

        {/* Subtitle */}
        <p className={styles.subtitle}>
          HO Rentals is currently fine-tuning its database catalog, verifying property photos, and updating listing details to provide you with the most authentic and transparent rental experience across Ho and the Volta Region.
        </p>

        {/* Immediate Assistance Hero Box */}
        <div className={styles.contactHeroCard}>
          <div className={styles.cardHeaderTitle}>
            <PhoneCall size={22} style={{ color: '#C1121F' }} />
            <span>Looking for Accommodation Right Now?</span>
          </div>
          <p className={styles.cardHeaderSubtitle}>
            Our team in Ho is actively online to help you find and inspect available student hostels, single rooms, self-contains, and apartments immediately.
          </p>

          <div className={styles.contactGrid}>
            {/* 1. WhatsApp Button */}
            <a 
              id="update-whatsapp-contact-btn"
              href={waUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`${styles.contactOption} ${styles.optionWhatsApp}`}
            >
              <div className={`${styles.optionIconWrapper} ${styles.iconWhatsApp}`}>
                <MessageCircle size={24} />
              </div>
              <div className={styles.optionTitle}>Chat on WhatsApp</div>
              <div className={styles.optionDesc}>
                Instant responses for available rooms, prices &amp; locations
              </div>
              <div className={styles.optionAction}>
                Open WhatsApp (+233 20 494 0602) <ArrowRight size={15} />
              </div>
            </a>

            {/* 2. Direct Phone Call */}
            <a 
              id="update-call-contact-btn"
              href={`tel:${SITE_CONFIG.contactPhone1International}`} 
              className={styles.contactOption}
            >
              <div className={`${styles.optionIconWrapper} ${styles.iconPhone}`}>
                <PhoneCall size={24} />
              </div>
              <div className={styles.optionTitle}>Call Support Line</div>
              <div className={styles.optionDesc}>
                Speak directly with an agent for urgent booking &amp; inquiries
              </div>
              <div className={styles.optionAction}>
                Call {SITE_CONFIG.contactPhone1} <ArrowRight size={15} />
              </div>
            </a>

            {/* 3. Yuyu Rides Partnership */}
            <a 
              id="update-yuyu-contact-btn"
              href={yuyuWaUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.contactOption}
            >
              <div className={`${styles.optionIconWrapper} ${styles.iconRide}`}>
                <Car size={24} />
              </div>
              <div className={styles.optionTitle}>Book Inspection Ride</div>
              <div className={styles.optionDesc}>
                Quick keke inspection ride to view hostels in Ho &amp; UHAS/HTU
              </div>
              <div className={styles.optionAction}>
                Book Yuyu Ride (+233 53 879 2644) <ArrowRight size={15} />
              </div>
            </a>
          </div>

          {/* Quick Phone Strip */}
          <div className={styles.quickPhoneStrip}>
            <span>Direct Support Lines:</span>
            <a href={`tel:${SITE_CONFIG.contactPhone1International}`} className={styles.phonePill}>
              📞 {SITE_CONFIG.contactPhone1}
            </a>
            <a href={`tel:${SITE_CONFIG.contactPhone2International}`} className={styles.phonePill}>
              📞 {SITE_CONFIG.contactPhone2}
            </a>
            <a href={`mailto:${SITE_CONFIG.supportEmail}`} className={styles.phonePill}>
              ✉️ {SITE_CONFIG.supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
