'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck, Scale, AlertCircle, CheckCircle2, Download, Printer } from 'lucide-react';
import styles from './terms.module.css';

export default function TermsPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadTxt = () => {
    const textContent = `HO RENTALS - TERMS & CONDITIONS
Effective Date: 11th July 2026

1. WHO WE ARE
Ho Rentals is a Ghanaian mobile app that connects landlords and tenants directly — no agents, no hidden fees. We are based in Ho, Volta Region, Ghana. Contact: 0557922593.

2. WHO CAN USE HO RENTALS
You must be at least 18 years old and a resident of Ghana to use this platform. By creating an account, you confirm that all information you provide is accurate and that you will use the platform for lawful purposes only.

3. FOR LANDLORDS
By listing a property on Ho Rentals, you confirm that:
- All property details, photos, and pricing you provide are true and accurate.
- You are the rightful owner or authorised representative of the property.
- You consent to a physical verification visit by our team before your property goes live.
- You will not collect any payment from a tenant before they have physically viewed the property.
- You will not charge agent fees to any tenant who found you through Ho Rentals.
- You will not list properties that are already occupied or unavailable.
- You will not discriminate against any tenant on the basis of gender, ethnicity, religion, or disability.

Subscription Fees: GHS 50 (Basic) or GHS 100 (Premium). Success fee: 5% of first month's rent. Featured Boost: GHS 30 per use.

4. FOR TENANTS
By using Ho Rentals to search for accommodation, you agree to:
- Use the platform only for genuine rental inquiries.
- Physically inspect any property before making any payment to a landlord.
- Contact landlords respectfully and honestly.
- Not share landlord contact details with third parties.

5. OUR VERIFIED LISTINGS
Every property on Ho Rentals is physically visited and verified by our team before it goes live. Report suspicious listings to 0557922593.

6. WHAT WE ARE NOT RESPONSIBLE FOR
Ho Rentals is a connection platform. We are not a party to any rental agreement or transaction between a landlord and tenant.

7. YOUR ACCOUNT
Keep your login details secure. Account suspension applies for false information or fraud.

8. YOUR DATA
We collect personal information to operate the platform. We never sell your data to third parties.

9. CHANGES TO THESE TERMS
Ho Rentals may update these Terms at any time.

10. GOVERNING LAW
These Terms are governed by the laws of the Republic of Ghana.

Ho Rentals — Transparent. Direct. Trusted.`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Terms_and_Conditions_HO_Rentals.txt';
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
            title="Print Terms or Save as PDF"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          <button 
            onClick={handleDownloadTxt} 
            className="btn btn-primary" 
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
            title="Download text copy"
          >
            <Download size={15} /> Download Terms (.txt)
          </button>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headerTitleRow}>
          <FileText size={36} style={{ color: 'var(--primary)' }} />
          <h1 className={styles.title}>Terms &amp; Conditions</h1>
        </div>
        <p className={styles.effectiveDate}>Effective Date: <strong>11th July 2026</strong></p>
        <p className={styles.subtitle}>
          By downloading or using the Ho Rentals app or website, you agree to the following terms. Please read them carefully before using the platform.
        </p>
      </header>

      <div className={styles.contentGrid}>
        {/* Section 1 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>1. Who We Are</h2>
          <p className={styles.text}>
            Ho Rentals is a Ghanaian mobile and web platform that connects landlords and tenants directly — no agents, no hidden fees. We are based in Ho, Volta Region, Ghana. Contact: <strong>0557922593</strong>.
          </p>
        </section>

        {/* Section 2 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>2. Who Can Use Ho Rentals</h2>
          <p className={styles.text}>
            You must be at least 18 years old and a resident of Ghana to use this platform. By creating an account, you confirm that all information you provide is accurate and that you will use the platform for lawful purposes only.
          </p>
        </section>

        {/* Section 3 */}
        <section className={styles.sectionCard} style={{ borderColor: 'var(--primary)' }}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--primary)' }} /> 3. For Landlords
          </h2>
          <p className={styles.text}>By listing a property on Ho Rentals, you confirm that:</p>
          <ul className={styles.bulletList}>
            <li>All property details, photos, and pricing you provide are true and accurate.</li>
            <li>You are the rightful owner or authorised representative of the property.</li>
            <li>You consent to a physical verification visit by our team before your property goes live.</li>
            <li>You will not collect any payment from a tenant before they have physically viewed the property.</li>
            <li>You will not charge agent fees to any tenant who found you through Ho Rentals.</li>
            <li>You will not list properties that are already occupied or unavailable.</li>
            <li>You will not discriminate against any tenant on the basis of gender, ethnicity, religion, or disability.</li>
          </ul>

          <div className={styles.feeHighlightBox}>
            <h4 className={styles.feeTitle}>Landlord Fee Schedule:</h4>
            <p className={styles.feeText}>
              • <strong>Subscription Fees:</strong> GHS 50 (Basic) or GHS 100 (Premium).<br />
              • <strong>Success Fee:</strong> 5% of the first month&apos;s rent applies when a tenancy is confirmed through the platform.<br />
              • <strong>Featured Boost:</strong> GHS 30 per use.
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>4. For Tenants</h2>
          <p className={styles.text}>By using Ho Rentals to search for accommodation, you agree to:</p>
          <ul className={styles.bulletList}>
            <li>Use the platform only for genuine rental inquiries.</li>
            <li>Physically inspect any property before making any payment to a landlord.</li>
            <li>Contact landlords respectfully and honestly.</li>
            <li>Not share landlord contact details with third parties.</li>
          </ul>
          <div className={styles.alertBox}>
            <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span>Ho Rentals connects you with landlords but does not process payments or guarantee the conduct of any landlord. Always inspect a property in person and get a written agreement before paying.</span>
          </div>
        </section>

        {/* Section 5 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>5. Our Verified Listings</h2>
          <p className={styles.text}>
            Every property on Ho Rentals is physically visited and verified by our team before it goes live. However, property conditions may change after our visit. We strongly advise all tenants to inspect a property in person before committing. Report any suspicious listing to us at <strong>0557922593</strong>.
          </p>
        </section>

        {/* Section 6 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>6. What We Are Not Responsible For</h2>
          <p className={styles.text}>
            Ho Rentals is a connection platform. We are not a party to any rental agreement or transaction between a landlord and tenant. We are not liable for any financial loss arising from a direct transaction between users, any dispute between a landlord and tenant, or any change in property condition after our verification visit.
          </p>
        </section>

        {/* Section 7 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>7. Your Account</h2>
          <p className={styles.text}>
            You are responsible for keeping your login details secure. Do not share your account with anyone. Ho Rentals may suspend or remove your account if you are found to have provided false information, engaged in fraud, or violated these terms.
          </p>
        </section>

        {/* Section 8 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>8. Your Data</h2>
          <p className={styles.text}>
            We collect personal information to operate the platform and improve your experience. We will never sell your data to third parties. Your contact details are only shared with other users for the purpose of connecting you with a landlord or tenant. You may request access to or deletion of your data by contacting us at <strong>0557922593</strong>.
          </p>
        </section>

        {/* Section 9 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle}>9. Changes to These Terms</h2>
          <p className={styles.text}>
            Ho Rentals may update these Terms at any time. Updated terms will be posted in the app and on our website. Continued use of the platform after any update means you accept the revised terms.
          </p>
        </section>

        {/* Section 10 */}
        <section className={styles.sectionCard}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={20} style={{ color: 'var(--primary)' }} /> 10. Governing Law
          </h2>
          <p className={styles.text}>
            These Terms are governed by the laws of the <strong>Republic of Ghana</strong>.
          </p>
        </section>
      </div>

      {/* Footer Acknowledgement Banner */}
      <div className={styles.ackBanner}>
        <CheckCircle2 size={24} style={{ color: 'var(--primary)' }} />
        <div>
          <p className={styles.ackText}>By using Ho Rentals, you agree to these Terms &amp; Conditions in full.</p>
          <span className={styles.tagline}>Ho Rentals — Transparent. Direct. Trusted.</span>
        </div>
      </div>
    </div>
  );
}
