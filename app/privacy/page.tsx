'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, FileText, CheckCircle2, Download, Printer } from 'lucide-react';
import styles from './privacy.module.css';

export default function PrivacyPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadTxt = () => {
    const textContent = `HO RENTALS - PRIVACY POLICY
Effective Date: 11th July 2026
Governing Law: Data Protection Act, 2012 (Act 843), Republic of Ghana

1. INTRODUCTION
Ho Rentals ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our mobile app or website in Ho, Volta Region, Ghana.

2. INFORMATION WE COLLECT
We collect personal information necessary to connect tenants and landlords directly:
- Contact Information: Full name, Ghanaian phone number (e.g. 024XXXXXXX).
- Property Information (For Landlords): Property title, location, photos, pricing, utility details.
- Usage Data: Saved favorite properties and search preferences.

3. HOW WE USE YOUR INFORMATION
We use your information to:
- Connect tenants directly with verified landlords via phone or WhatsApp.
- Schedule physical property verification visits in Ho.
- Maintain platform security and prevent fraud or fake listings.

4. WE NEVER SELL YOUR DATA
We do not sell, rent, or trade your personal information to third parties or marketing agencies. Your contact details are shared only with the specific landlord or tenant you choose to connect with.

5. DATA SECURITY & PROTECTION
We implement technical and organizational security measures in accordance with the Data Protection Act of Ghana (Act 843) to safeguard your data against unauthorized access, loss, or misuse.

6. YOUR RIGHTS & DATA DELETION
Under Ghanaian law, you have the right to:
- Request access to the personal data we hold about you.
- Request correction of inaccurate information.
- Request full deletion of your account and data.

To exercise these rights, contact us at 0557922593 or support@horentals.com.

7. GOVERNING LAW
This Privacy Policy is governed by the laws of the Republic of Ghana.

Ho Rentals — Transparent. Direct. Trusted.`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Privacy_Policy_HO_Rentals.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.topNavRow}>
        <Link href="/" className={styles.backBtn} aria-label="Back to home">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className={styles.downloadActions}>
          <button 
            onClick={handlePrint} 
            className="btn btn-outline" 
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
            title="Print Privacy Policy or Save as PDF"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          <button 
            onClick={handleDownloadTxt} 
            className="btn btn-primary" 
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
            title="Download text copy"
          >
            <Download size={15} /> Download Policy (.txt)
          </button>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <Shield size={36} style={{ color: 'var(--primary)' }} />
          <h1 className={styles.title}>Privacy Policy</h1>
        </div>
        <p className={styles.effectiveDate}>Effective Date: <strong>11th July 2026</strong> &bull; Ghana Act 843 Compliant</p>
        <p className={styles.subtitle}>
          Your privacy matters to us. Learn how Ho Rentals collects, uses, and protects your personal data in accordance with the Data Protection Act, 2012 (Act 843) of the Republic of Ghana.
        </p>
      </header>

      <div className={styles.contentGrid}>
        {/* Section 1 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>1. Introduction</h2>
          <p className={styles.text}>
            Ho Rentals (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates a direct rental platform in Ho, Volta Region, Ghana. We respect your privacy and are committed to protecting your personal information.
          </p>
        </section>

        {/* Section 2 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
          <p className={styles.text}>We collect only the essential details required to operate our platform:</p>
          <ul className={styles.bulletList}>
            <li><strong>Account &amp; Contact Info:</strong> Full name and Ghanaian phone number (e.g. 024XXXXXXX).</li>
            <li><strong>Listing Info (For Landlords):</strong> Property location, rental pricing, photos, water &amp; prepaid meter details.</li>
            <li><strong>Preference Data:</strong> Saved favorite properties and search filters.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
          <p className={styles.text}>We use your information strictly for the following purposes:</p>
          <ul className={styles.bulletList}>
            <li>To connect tenants directly with verified landlords via phone call or WhatsApp.</li>
            <li>To coordinate physical on-site verification visits by our team in Ho.</li>
            <li>To prevent fraudulent listings, fake agents, and unauthorized duplicate rentals.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className={styles.sectionCard} style={{ borderColor: '#10B981' }}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} style={{ color: '#10B981' }} /> 4. We Never Sell Your Data
          </h2>
          <p className={styles.text}>
            We do <strong>not</strong> sell, rent, or trade your personal information to third parties, ad networks, or marketing companies. Your contact details are shared only with the specific landlord or tenant you choose to connect with.
          </p>
        </section>

        {/* Section 5 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>5. Data Security &amp; Ghana Act 843 Compliance</h2>
          <p className={styles.text}>
            We implement strict security measures in full compliance with the <strong>Data Protection Act, 2012 (Act 843) of Ghana</strong> to ensure your data is kept confidential and protected against loss, theft, or unauthorized access.
          </p>
        </section>

        {/* Section 6 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} style={{ color: 'var(--primary)' }} /> 6. Your Rights &amp; Data Deletion
          </h2>
          <p className={styles.text}>Under Ghanaian data protection law, you have full control over your data:</p>
          <ul className={styles.bulletList}>
            <li>Request a copy of the personal information we hold about you.</li>
            <li>Request updates or corrections to your profile or property listing.</li>
            <li>Request permanent deletion of your account and associated phone data.</li>
          </ul>
          <p className={styles.text} style={{ marginTop: '8px' }}>
            To request data deletion, call or WhatsApp our support line at <strong>0557922593</strong>.
          </p>
        </section>

        {/* Section 7 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>7. Governing Law</h2>
          <p className={styles.text}>
            This Privacy Policy is governed by and construed in accordance with the laws of the <strong>Republic of Ghana</strong>.
          </p>
        </section>
      </div>

      {/* Footer Acknowledgement Banner */}
      <div className={styles.ackBanner}>
        <CheckCircle2 size={24} style={{ color: '#10B981' }} />
        <div>
          <p className={styles.ackText}>Your Data is Safe &amp; Protected with Ho Rentals.</p>
          <span className={styles.tagline}>Ho Rentals — Transparent. Direct. Trusted.</span>
        </div>
      </div>
    </div>
  );
}
