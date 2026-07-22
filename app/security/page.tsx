'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto 80px', padding: '0 24px', color: 'var(--text-primary)' }}>
      <Link 
        href="/" 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <ShieldAlert size={36} style={{ color: 'var(--primary)' }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Security Policy</h1>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px' }}>
        Last Updated: July 2026
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', lineHeight: 1.6, fontSize: '1rem' }}>
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>1. Data Protection and Encryption</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We protect your user details using standard security protocols. All communication between the client web page and backend database uses HTTPS encryption. Password credentials are encrypted before storage.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>2. Safe Account Practices</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            To protect your account, choose a unique password containing a combination of uppercase letters, numbers, and symbols. We enforce a minimum password strength indicator on registration to ensure safety.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)' }}>3. Reporting Vulnerabilities</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            If you discover a security issue or vulnerability on the platform, please report it immediately to our operations desk at <a href="mailto:security@horentals.com" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>security@horentals.com</a>. We will investigate and remediate reported bugs promptly.
          </p>
        </section>
      </div>
    </div>
  );
}
