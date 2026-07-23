import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Heart,
  MessageSquare,
  Building2,
  Users,
  Compass
} from 'lucide-react';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'About Us | HO Rentals - Built by Students for Ghana',
  description: 'The story behind HO Rentals. Born at Ho Technical University to eliminate fake agents and connect tenants directly with verified landlords across Ho and the Volta Region.',
};

export default function AboutPage() {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* 1. Hero Section: Split Storytelling Header */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.locationTag}>
            <MapPin size={15} className={styles.pinIcon} />
            <span>Ho, Volta Region, Ghana</span>
          </div>

          <h1 className={styles.heroTitle}>
            We Were Sent to Properties That <span className={styles.highlightText}>Didn&apos;t Exist.</span>
            <br />
            So We Fixed It.
          </h1>

          <p className={styles.heroDescription}>
            In 2024, as first-year students at <strong>Ho Technical University (HTU)</strong>, we spent almost two months searching for a place to live. We paid inspection fees to agents who vanished, dealt with fake photos, and faced constant stress.
          </p>

          <p className={styles.heroDescription}>
            We are young entrepreneurs in our early 20s from Ho. We built <strong>HO Rentals</strong> to give tenants and landlords what we wished existed: a direct, honest, and 100% verified platform.
          </p>

          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>100%</span>
              <span className={styles.statLabel}>On-Site Verified</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>GH₵ 0</span>
              <span className={styles.statLabel}>Agent Inspection Fees</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>Direct</span>
              <span className={styles.statLabel}>Landlord Connection</span>
            </div>
          </div>
        </div>

        <div className={styles.heroMediaWrapper}>
          <div className={styles.imageFrame}>
            <Image
              src="/about_hero.png"
              alt="HO Rentals Founders & Mobile App in Ho Ghana"
              width={540}
              height={540}
              className={styles.heroImage}
              priority
            />
            <div className={`${styles.floatingChip} ${styles.chipTop}`}>
              <ShieldCheck size={18} style={{ color: '#10B981' }} />
              <div>
                <strong>HTU Campus Verified</strong>
                <span>Direct Landlord Access</span>
              </div>
            </div>

            <div className={`${styles.floatingChip} ${styles.chipBottom}`}>
              <Heart size={18} style={{ color: 'var(--primary)', fill: 'var(--primary)' }} />
              <div>
                <strong>Built for Students &amp; Workers</strong>
                <span>Transparent &bull; Honest &bull; Local</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Before & After: The Old System vs. The HO Rentals Way */}
      <section className={styles.comparisonSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.subHeading}>Why We Exist</span>
          <h2 className={styles.sectionTitle}>The Old Way vs. The HO Rentals Way</h2>
          <p className={styles.sectionDesc}>Renting in Ghana shouldn&apos;t feel like a gamble. Here is how we change the experience.</p>
        </div>

        <div className={styles.comparisonGrid}>
          {/* The Broken System */}
          <div className={`${styles.comparisonCard} ${styles.oldCard}`}>
            <div className={styles.cardHeaderRow}>
              <XCircle size={24} style={{ color: 'var(--danger)' }} />
              <h3>The Traditional Agent System</h3>
            </div>
            <ul className={styles.comparisonList}>
              <li>
                <XCircle size={16} className={styles.badIcon} />
                <span>Paying upfront inspection fees to middleman agents before seeing rooms.</span>
              </li>
              <li>
                <XCircle size={16} className={styles.badIcon} />
                <span>Misleading photos and listings that don&apos;t match reality.</span>
              </li>
              <li>
                <XCircle size={16} className={styles.badIcon} />
                <span>Unnecessary commission markups stacked onto monthly rent.</span>
              </li>
              <li>
                <XCircle size={16} className={styles.badIcon} />
                <span>Unresponsive contacts when maintenance problems arise.</span>
              </li>
            </ul>
          </div>

          {/* The HO Rentals Way */}
          <div className={`${styles.comparisonCard} ${styles.newCard}`}>
            <div className={styles.cardHeaderRow}>
              <CheckCircle2 size={24} style={{ color: '#10B981' }} />
              <h3>The HO Rentals Direct Standard</h3>
            </div>
            <ul className={styles.comparisonList}>
              <li>
                <CheckCircle2 size={16} className={styles.goodIcon} />
                <span><strong>Zero agent fees.</strong> Direct phone &amp; WhatsApp connection to landlords.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className={styles.goodIcon} />
                <span><strong>Physically visited &amp; inspected</strong> by our local Ho verification team.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className={styles.goodIcon} />
                <span>Accurate details on water supply, prepaid meters, and proximity to campus.</span>
              </li>
              <li>
                <CheckCircle2 size={16} className={styles.goodIcon} />
                <span>Instant physical viewing scheduling directly through our app or website.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Verification Process: 3 Simple Steps */}
      <section className={styles.processSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.subHeading}>Our Quality Commitment</span>
          <h2 className={styles.sectionTitle}>How Every Listing Gets Verified</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>01</div>
            <Building2 size={28} className={styles.stepIcon} />
            <h3>Landlord Listing Submission</h3>
            <p>Property owners submit listing details, price, utility arrangements, and photos.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>02</div>
            <Compass size={28} className={styles.stepIcon} />
            <h3>Physical Field Inspection</h3>
            <p>Our team in Ho personally visits the property, verifies features (water, meter type, security), and captures true photos.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepBadge}>03</div>
            <Users size={28} className={styles.stepIcon} />
            <h3>Direct Tenant Matching</h3>
            <p>The verified listing goes live. Students and tenants connect directly with landlords without middlemen.</p>
          </div>
        </div>
      </section>

      {/* 4. Founder's Personal Message */}
      <section className={styles.foundersSection}>
        <div className={styles.quoteWrapper}>
          <Sparkles size={32} className={styles.quoteSparkle} />
          <p className={styles.quoteBody}>
            &ldquo;We are not just building a business. We are building the solution we wished existed when we needed it most. Renting in Ghana should be simple, honest, and transparent.&rdquo;
          </p>
          <div className={styles.foundersMeta}>
            <div className={styles.foundersAvatarGroup}>
              <div className={styles.founderAvatar}>HTU</div>
              <div className={styles.founderAvatar} style={{ backgroundColor: 'var(--primary-dark)' }}>HO</div>
            </div>
            <div>
              <strong className={styles.foundersName}>The Founder Team</strong>
              <span className={styles.foundersTitle}>Young Ghanaian Entrepreneurs &bull; Ho, Volta Region</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contact & Call to Action Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaText}>
          <h2>Looking for a Room or Listing a Property?</h2>
          <p>Talk directly with our team in Ho or browse verified rooms near you today.</p>
          <div className={styles.ctaPhoneRow}>
            <Phone size={18} style={{ color: 'var(--primary)' }} />
            <span>Call / WhatsApp: <strong>0557922593</strong></span>
          </div>
        </div>

        <div className={styles.ctaButtons}>
          <Link href="/properties" className="btn btn-primary" style={{ padding: '14px 24px', fontWeight: 700 }}>
            Search Verified Rentals <ArrowRight size={16} />
          </Link>
          <a 
            href="https://wa.me/233557922593?text=Hi%20HO%20Rentals,%20I%20have%20an%20inquiry" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-outline"
            style={{ padding: '14px 24px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <MessageSquare size={16} /> WhatsApp Support
          </a>
        </div>
      </section>
    </div>
  );
}
