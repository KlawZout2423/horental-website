"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  Building2, 
  Compass, 
  Share2,
  ExternalLink
} from 'lucide-react';
import styles from './qr.module.css';

export default function QrPage() {
  const [activeTab, setActiveTab] = useState<'tenant' | 'landlord'>('tenant');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const landlordUrl = `${origin || 'https://horentals.com'}/landlord-registration`;
  const tenantUrl = `${origin || 'https://horentals.com'}/`;

  const activeUrl = activeTab === 'landlord' ? landlordUrl : tenantUrl;
  const activeTitle = activeTab === 'landlord' ? 'Landlord Portal' : 'Web App / Main Website';
  
  // Custom colored QR code matching Ho Rentals primary color: #C1121F (hex: c1121f)
  // ECC set to High ('H') to allow logo overlay without affecting scannability
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(activeUrl)}&color=c1121f&ecc=H`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = async () => {
    try {
      setDownloading(true);
      
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrCodeSrc;
      
      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
      });

      const logoImage = new Image();
      logoImage.src = '/logo.png';
      await new Promise((resolve, reject) => {
        logoImage.onload = resolve;
        logoImage.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      ctx.drawImage(qrImage, 0, 0, 300, 300);

      const logoSize = 60;
      const logoX = (300 - logoSize) / 2;
      const logoY = (300 - logoSize) / 2;
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 8);
      } else {
        ctx.rect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
      }
      ctx.fill();

      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ho-rentals-${activeTab}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      window.open(qrCodeSrc, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundBlob1}></div>
      <div className={styles.backgroundBlob2}></div>

      <div className={styles.headerRow}>
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className={styles.cardWrapper}>
        <div className={styles.cardHeader}>
          <div className={styles.logoIcon}>
            <QrCode size={28} />
          </div>
          <h1 className={styles.title}>Share HO Rentals</h1>
          <p className={styles.subtitle}>
            Scan the QR codes below to instantly access or share the platform with landlords and tenants.
          </p>
        </div>

        {/* Tab Controls */}
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'landlord' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('landlord')}
          >
            <Building2 size={16} />
            <span>Landlord Portal</span>
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'tenant' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('tenant')}
          >
            <Compass size={16} />
            <span>Tenant Portal</span>
          </button>
        </div>

        {/* QR Section */}
        <div className={styles.qrSection}>
          <div className={styles.qrWrapper}>
            {/* Branded framing dots in corners */}
            <div className={`${styles.cornerDot} ${styles.topLeft}`}></div>
            <div className={`${styles.cornerDot} ${styles.topRight}`}></div>
            <div className={`${styles.cornerDot} ${styles.bottomLeft}`}></div>
            <div className={`${styles.cornerDot} ${styles.bottomRight}`}></div>
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={qrCodeSrc} 
              alt={`${activeTitle} QR Code`} 
              className={styles.qrImage}
              width={220}
              height={220}
            />

            {/* Branded Logo Overlay */}
            <div className={styles.qrLogoOverlay}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/logo.png" 
                alt="Ho Rentals Logo" 
                className={styles.qrLogoImage} 
              />
            </div>
          </div>

          <div className={styles.infoWrapper}>
            <span className={styles.portalTag}>
              {activeTab === 'landlord' ? 'For Landlords & Owners' : 'For Students & Tenants'}
            </span>
            <h2 className={styles.portalTitle}>
              {activeTab === 'landlord' 
                ? 'Register & List Properties' 
                : 'Browse & Rent Rooms'}
            </h2>
            <p className={styles.portalDescription}>
              {activeTab === 'landlord'
                ? 'Share this QR code with property owners in Ho. Scanning it opens the 100% free landlord registration and verification form.'
                : 'Share this QR code with students and workers searching for verified hostels, single rooms, and apartments in Ho.'}
            </p>

            <div className={styles.urlDisplayRow}>
              <span className={styles.urlText}>{activeUrl}</span>
              <a href={activeUrl} target="_blank" rel="noopener noreferrer" className={styles.urlIconLink} title="Open link">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionsGrid}>
          <button 
            onClick={handleDownloadQr} 
            disabled={downloading}
            className={`${styles.actionButton} ${styles.primaryAction}`}
          >
            <Download size={18} />
            <span>{downloading ? 'Downloading...' : 'Download QR Code'}</span>
          </button>
          
          <button 
            onClick={handleCopyLink} 
            className={`${styles.actionButton} ${styles.secondaryAction}`}
          >
            {copied ? <Check size={18} style={{ color: '#10B981' }} /> : <Copy size={18} />}
            <span>{copied ? 'Link Copied!' : 'Copy Portal Link'}</span>
          </button>
        </div>

        {/* Footer tips */}
        <div className={styles.cardFooter}>
          <Share2 size={14} style={{ color: 'var(--primary)' }} />
          <span>Tip: You can print this QR code to place on flyers, business cards, or posters!</span>
        </div>
      </div>
    </div>
  );
}
