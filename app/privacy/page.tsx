'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 80px', padding: '0 24px', color: 'var(--text-primary)' }}>
      <Link 
        href="/" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <Shield size={36} style={{ color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Privacy Policy</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px' }}>
        Last Updated: July 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', lineHeight: 1.6, fontSize: '1rem' }}>
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>1. Information We Collect</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We collect personal information that you provide to us when registering on the HO Rentals platform. This includes your name, phone number, and password. Additionally, for landlords and partners, we collect property descriptions, images, and contact numbers.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>2. How We Use Your Information</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
            We use the collected information for the following purposes:
          </p>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>To connect tenants with landlords and hostel managers.</li>
            <li>To log user inquiries and contact requests.</li>
            <li>To secure and authenticate user accounts.</li>
            <li>To improve the search experience and verify hostel locations.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>3. Cookies & Tracking Technologies</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We use Google Analytics cookies to track anonymous traffic statistics, page visits, and user sessions. This helps us optimize search results and platform layout. You can configure your browser settings to reject cookies if preferred.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>4. Third-Party Services</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Our website uses third-party analytics and advertising services provided by Google (Google Analytics and Google AdSense). These services may collect information about your visits to this and other websites in order to provide targeted advertisements.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>5. Contact Us</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            If you have any questions or concerns regarding our privacy practices, please contact us at <a href="mailto:support@horentals.com" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>support@horentals.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
