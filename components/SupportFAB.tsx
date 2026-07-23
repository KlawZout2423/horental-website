'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mail, X } from 'lucide-react';
import styles from './SupportFAB.module.css';

export default function SupportFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <div className={styles.fabContainer} ref={containerRef}>
      {isOpen && (
        <div className={styles.popupMenu}>
          <div className={styles.popupHeader}>
            <span className={styles.popupTitle}>HO Rentals Support</span>
            <span className={styles.popupSubtitle}>Need help with a listing or booking?</span>
          </div>
          <div className={styles.popupDivider} />
          
          <a
            href="https://wa.me/233557922593?text=Hi%20HO%20Rentals,%20I%20have%20an%20issue/inquiry%20regarding%20the%20platform."
            target="_blank"
            rel="noopener noreferrer"
            className={styles.optionItem}
            onClick={() => setIsOpen(false)}
          >
            <MessageSquare size={18} className={styles.optionIcon} style={{ color: '#25D366' }} />
            <div className={styles.optionLabel}>
              <span>WhatsApp Chat</span>
              <span className={styles.optionValue}>0557 922 593</span>
            </div>
          </a>

          <a
            href="sms:+233557922593?body=Hi%20HO%20Rentals,%20I%20need%20help%20with..."
            className={styles.optionItem}
            onClick={() => setIsOpen(false)}
          >
            <MessageSquare size={18} className={styles.optionIcon} style={{ color: 'var(--primary)' }} />
            <div className={styles.optionLabel}>
              <span>SMS Support</span>
              <span className={styles.optionValue}>0557 922 593</span>
            </div>
          </a>

          <a
            href="mailto:thehorentals@gmail.com"
            className={styles.optionItem}
            onClick={() => setIsOpen(false)}
          >
            <Mail size={18} className={styles.optionIcon} style={{ color: '#3b82f6' }} />
            <div className={styles.optionLabel}>
              <span>Send Email</span>
              <span className={styles.optionValue}>thehorentals@gmail.com</span>
            </div>
          </a>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.fabButton}
        title="Contact Support"
        aria-label="Contact Support"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        <span className={styles.badge} />
      </button>
    </div>
  );
}
