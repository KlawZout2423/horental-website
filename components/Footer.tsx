'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import styles from './Footer.module.css';

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
  };

  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register')
  ) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand Column */}
          <div className={styles.brandColumn}>
            <div className={styles.logo}>
              <Image src="/logo.png" alt="HO Rentals Logo" width={32} height={32} style={{ objectFit: 'contain' }} />
              <span>HO<span className={styles.logoTextSpan}>Rentals</span></span>
            </div>
            <p className={styles.description}>
              The premium student accommodation finder. Browse high-quality hostels, single rooms, and apartments tailored for students.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={styles.title}>Services</h4>
            <div className={styles.links}>
              <Link href="/properties" className={styles.link}>Browse Rentals</Link>
              {user && (user.role === 'admin' || user.role === 'partner') && (
                <Link href="/upload" className={styles.link}>List a Property</Link>
              )}
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className={styles.title}>Company</h4>
            <div className={styles.links}>
              <Link href="/" className={styles.link}>About Us</Link>
              <Link href="/" className={styles.link}>Contact Support</Link>
              <Link href="/" className={styles.link}>Terms & Conditions</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className={styles.newsletter}>
            <h4 className={styles.title}>Stay Updated</h4>
            <p className={styles.description} style={{ fontSize: '0.85rem' }}>
              Subscribe to get notified when new hostels near your campus are listed.
            </p>
            <form className={styles.form} onSubmit={handleSubmit}>
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                className={styles.input}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                Join
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} HO Rentals. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link href="/" className={styles.link}>Privacy Policy</Link>
            <Link href="/" className={styles.link}>Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
