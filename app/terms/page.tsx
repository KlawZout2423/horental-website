'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 80px', padding: '0 24px', color: 'var(--text-primary)' }}>
      <Link 
        href="/" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <FileText size={36} style={{ color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Terms &amp; Conditions</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px' }}>
        Last Updated: July 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', lineHeight: 1.6, fontSize: '1rem' }}>
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            By registering an account, search-browsing, or listing a property on HO Rentals, you agree to comply with and be bound by these Terms &amp; Conditions. If you do not agree, please do not use the services.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>2. User Registration and Account Security</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            To view search details, save favorites, or list rentals, users must create an account. You are responsible for maintaining the confidentiality of your password and credentials, and are fully responsible for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>3. Verification and Rental Listing Disclaimer</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            HO Rentals conducts verification checks on registered listings to increase safety. However, tenants are strongly encouraged to inspect the hostel or room in person and verify booking terms directly with the landlord before making rent payments.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>4. Prohibited Conduct</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Users are prohibited from listing duplicate properties, uploading misleading information, or violating local renting regulations. HO Rentals reserves the right to suspend or terminate accounts that violate these guidelines.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>5. Limitation of Liability</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            HO Rentals operates solely as a listing and directory connection service. We are not a party to any lease agreement or financial transactions between tenants and property owners, and shall not be held liable for any disputes or losses.
          </p>
        </section>
      </div>
    </div>
  );
}
