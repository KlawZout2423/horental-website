'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Phone, CheckCircle2, X, UserPlus, LogIn } from 'lucide-react';
import styles from './AuthPromptModal.module.css';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPropertyId?: number | string | null;
}

export default function AuthPromptModal({ isOpen, onClose, targetPropertyId }: AuthPromptModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const targetPath = targetPropertyId ? `/properties/${targetPropertyId}` : '/properties';
  const encodedRedirect = encodeURIComponent(targetPath);

  const handleSignUp = () => {
    onClose();
    router.push(`/register?redirect=${encodedRedirect}`);
  };

  const handleSignIn = () => {
    onClose();
    router.push(`/login?redirect=${encodedRedirect}`);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <Lock size={30} />
        </div>

        <h2 className={styles.title}>Account Required to Contact Landlord</h2>
        <p className={styles.subtitle}>
          Sign in or create a free account to call, WhatsApp chat, or book physical viewings directly with verified landlords.
        </p>

        <div className={styles.benefitsList}>
          <div className={styles.benefitItem}>
            <CheckCircle2 size={16} className={styles.benefitIcon} />
            <span>Direct Landlord Call & WhatsApp numbers</span>
          </div>
          <div className={styles.benefitItem}>
            <CheckCircle2 size={16} className={styles.benefitIcon} />
            <span>Verified student hostels & apartments</span>
          </div>
          <div className={styles.benefitItem}>
            <CheckCircle2 size={16} className={styles.benefitIcon} />
            <span>Save & bookmark your favorite rentals</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button onClick={handleSignUp} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
            <UserPlus size={18} /> Create Free Account
          </button>
          
          <button onClick={handleSignIn} className="btn btn-outline" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}>
            <LogIn size={18} /> Sign In to Existing Account
          </button>
        </div>

        <p className={styles.footerText}>
          Registration takes less than 30 seconds with your phone number.
        </p>
      </div>
    </div>
  );
}
