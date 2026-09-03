'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, X, ShieldAlert, Award, FileText, ArrowRight } from 'lucide-react';
import styles from './VerifiedAgentModal.module.css';

interface VerifiedAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  agentName?: string;
  requireAgreement?: boolean;
}

export default function VerifiedAgentModal({
  isOpen,
  onClose,
  onAccept,
  agentName,
  requireAgreement = true
}: VerifiedAgentModalProps) {
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      const isAlreadyAgreed = sessionStorage.getItem('agreed_agent_disclaimer') === 'true';
      setHasAgreed(isAlreadyAgreed);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('agreed_agent_disclaimer', 'true');
    }
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <ShieldCheck size={28} />
        </div>

        <div className={styles.badgeHeader}>
          <Award size={13} /> Platform Notice
        </div>

        <h2 className={styles.title}>
          Independent Platform Disclaimer
        </h2>

        <p className={styles.subtitle}>
          HO Rentals connects you with third-party verified agents in Ghana. We are an independent listing portal.
        </p>

        {/* Streamlined Disclaimer Box */}
        <div className={styles.disclaimerBox}>
          <div className={styles.disclaimerHeader}>
            <ShieldAlert size={16} /> Important Notice
          </div>
          <div className={styles.disclaimerText}>
            Payments, viewings, and rental agreements are directly between you and the agent. <strong>HO Rentals holds zero liability for third-party agent interactions or transactions.</strong>
          </div>
        </div>

        {/* Verification Standards */}
        <div className={styles.pointsList}>
          <div className={styles.pointItem}>
            <CheckCircle2 size={15} className={styles.pointIcon} />
            <div>
              <span className={styles.pointTextTitle}>Ghana Card ID Screened</span>
              <span className={styles.pointTextDesc}>Agent identity and contacts are validated by HO Rentals.</span>
            </div>
          </div>
        </div>

        {/* User Agreement Checkbox */}
        <label className={styles.checkboxContainer}>
          <input
            type="checkbox"
            checked={hasAgreed}
            onChange={(e) => setHasAgreed(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxLabel}>
            I understand and accept HO Rentals independent platform terms.
          </span>
        </label>

        {/* Action Button */}
        <button
          className={styles.confirmBtn}
          disabled={!hasAgreed}
          onClick={handleConfirm}
        >
          <span>Accept &amp; Continue</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
