import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { 
  Car, 
  Home, 
  Building2, 
  ShieldCheck, 
  Armchair, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare,
  Sparkles,
  PhoneCall,
  MapPin
} from 'lucide-react';
import styles from './services.module.css';

export const metadata: Metadata = {
  title: 'Our Services & Yuyu Rides Partnership | HO Rentals',
  description: 'Explore HO Rentals services including Yuyu Rides for instant property inspection transportation, room rentals, landlord listings, agent networks, and furniture in Ho, Ghana.',
};

export default function ServicesPage() {
  const yuyuWhatsAppUrl = "https://wa.me/233538792644?text=" + encodeURIComponent("Hi Yuyu Rides! 🚗 I'd like to request a ride for property inspection via HO Rentals.");

  return (
    <div className={styles.container}>
      {/* 1. Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBadge}>
          <Sparkles size={16} />
          <span>Curated Solutions in Ho &amp; Ghana</span>
        </div>
        <h1 className={styles.heroTitle}>
          Our Services for <span className={styles.highlightText}>Housing &amp; Mobility</span>
        </h1>
        <p className={styles.heroDescription}>
          From instant inspection rides with <strong>Yuyu Rides</strong> to verified student hostels, landlord listings, and home furniture — we make renting seamless and stress-free.
        </p>
      </section>

      {/* 2. Featured Service: Yuyu Rides Partnership */}
      <section id="yuyu-rides" className={styles.featuredYuyuSection}>
        <div className={styles.yuyuCard}>
          <div>
            <div className={styles.yuyuBadge}>
              🤝 Official Partnership
            </div>
            <h2 className={styles.yuyuTitle}>
              Yuyu Rides 🚗
            </h2>
            <p className={styles.yuyuDesc}>
              Need quick transportation to view a room, apartment, or land plot in Ho? HO Rentals has partnered directly with <strong>Yuyu Rides</strong> to provide instant, safe keke &amp; ride dispatch straight to property locations across Ho, HTU, UHAS, and surrounding areas.
            </p>
            <ul className={styles.yuyuFeatureList}>
              <li className={styles.yuyuFeatureItem}>
                <span className={styles.yuyuFeatureIcon}>
                  <CheckCircle2 size={16} />
                </span>
                <span>Instant dispatch via WhatsApp with pre-filled property address</span>
              </li>
              <li className={styles.yuyuFeatureItem}>
                <span className={styles.yuyuFeatureIcon}>
                  <CheckCircle2 size={16} />
                </span>
                <span>Safe, student-friendly local drivers in Ho</span>
              </li>
              <li className={styles.yuyuFeatureItem}>
                <span className={styles.yuyuFeatureIcon}>
                  <CheckCircle2 size={16} />
                </span>
                <span>Affordable inspection ride rates with zero stress</span>
              </li>
            </ul>
            <div className={styles.yuyuActions}>
              <a 
                href={yuyuWhatsAppUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.yuyuPrimaryBtn}
              >
                <MessageSquare size={18} /> Request Yuyu Ride Now
              </a>
              <Link href="/properties" className={styles.yuyuSecondaryBtn}>
                Browse Rentals <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          <div className={styles.yuyuVisualCard}>
            <div className={styles.yuyuVisualIcon}>🚗💨</div>
            <div className={styles.yuyuVisualText}>Inspection Rides Made Easy</div>
            <div className={styles.yuyuVisualPhone}>WhatsApp: +233 53 879 2644</div>
            <div style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.85 }}>
              Available across Ho, HTU &amp; UHAS Campuses
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core HO Rentals Services */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>More Services We Offer</h2>
        <p className={styles.sectionDesc}>Everything you need for living and property management in Volta Region.</p>
      </div>

      <div className={styles.servicesGrid}>
        {/* Service 1 */}
        <div className={styles.serviceCard}>
          <div>
            <div className={styles.serviceIconWrapper}>
              <Home size={28} />
            </div>
            <h3 className={styles.cardTitle}>Room &amp; Apartment Rentals</h3>
            <p className={styles.cardDesc}>
              Discover student hostels, single rooms, self-contained units, chamber &amp; hall, and luxury apartments across Ho and Ghana.
            </p>
            <ul className={styles.cardList}>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>100% physically inspected &amp; verified</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Zero fake photos or middleman markups</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Direct contact with property managers</span>
              </li>
            </ul>
          </div>
          <div className={styles.cardCta}>
            <Link href="/properties" className={`${styles.cardBtn} btn btn-primary`}>
              Explore Rentals <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Service 2 */}
        <div className={styles.serviceCard}>
          <div>
            <div className={styles.serviceIconWrapper} style={{ color: '#059669', background: 'rgba(5, 150, 105, 0.1)' }}>
              <Building2 size={28} />
            </div>
            <h3 className={styles.cardTitle}>List Property (Landlords)</h3>
            <p className={styles.cardDesc}>
              List your hostels, apartments, shops, or land directly to thousands of verified students and renters searching daily.
            </p>
            <ul className={styles.cardList}>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Free listing setup &amp; instant exposure</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Direct inquiries via WhatsApp &amp; Phone</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Dedicated admin verification team</span>
              </li>
            </ul>
          </div>
          <div className={styles.cardCta}>
            <Link href="/landlord-registration" className={`${styles.cardBtn} btn btn-outline`}>
              List Your Property <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Service 3 */}
        <div className={styles.serviceCard}>
          <div>
            <div className={styles.serviceIconWrapper} style={{ color: '#2563EB', background: 'rgba(37, 99, 235, 0.1)' }}>
              <ShieldCheck size={28} />
            </div>
            <h3 className={styles.cardTitle}>Verified Agent Network</h3>
            <p className={styles.cardDesc}>
              Partner with vetted local agents in Ho to list and manage properties professionally without extortionate tenant fees.
            </p>
            <ul className={styles.cardList}>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Verified agent badge &amp; reputation rating</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>HTU &amp; UHAS campus area specialists</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Transparent inspection guidelines</span>
              </li>
            </ul>
          </div>
          <div className={styles.cardCta}>
            <Link href="/register-agent" className={`${styles.cardBtn} btn btn-outline`}>
              Become an Agent <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Service 4 */}
        <div className={styles.serviceCard}>
          <div>
            <div className={styles.serviceIconWrapper} style={{ color: '#D97706', background: 'rgba(217, 119, 6, 0.1)' }}>
              <Armchair size={28} />
            </div>
            <h3 className={styles.cardTitle}>Furniture &amp; Home Essentials</h3>
            <p className={styles.cardDesc}>
              Furnish your room effortlessly. Find quality beds, study desks, wardrobes, and room appliances in Ho.
            </p>
            <ul className={styles.cardList}>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Student-friendly prices</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>Direct delivery arrangements</span>
              </li>
              <li className={styles.cardListItem}>
                <CheckCircle2 size={16} className={styles.checkIcon} />
                <span>New &amp; gently used furniture</span>
              </li>
            </ul>
          </div>
          <div className={styles.cardCta}>
            <Link href="/?type=Furnitures" className={`${styles.cardBtn} btn btn-outline`}>
              Browse Furniture <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaText}>
          <h3>Need Help Finding a Room or Booking a Ride?</h3>
          <p>Our local team in Ho is ready to assist you right now.</p>
        </div>
        <div className={styles.ctaButtons}>
          <a 
            href={yuyuWhatsAppUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-light" 
            style={{ padding: '12px 20px', fontWeight: 800, background: '#ffffff', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Car size={18} /> Book Yuyu Ride
          </a>
          <a 
            href="https://wa.me/233204940602?text=Hi%20HO%20Rentals,%20I%20have%20an%20inquiry" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-outline" 
            style={{ padding: '12px 20px', fontWeight: 700, color: '#ffffff', borderColor: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <PhoneCall size={18} /> Contact HO Rentals
          </a>
        </div>
      </section>
    </div>
  );
}
