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
      const isAlreadyAgreed = localStorage.getItem('agreed_agent_disclaimer') === 'true';
      setHasAgreed(isAlreadyAgreed);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agreed_agent_disclaimer', 'true');
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
          <ShieldCheck size={34} />
        </div>

        <div className={styles.badgeHeader}>
          <Award size={14} /> Independent Agent Platform Notice
        </div>

        <h2 className={styles.title}>
          {agentName ? `Agent Profile: ${agentName}` : 'Independent Agent Disclaimer'}
        </h2>
        <p className={styles.subtitle}>
          HO Rentals connects you with third-party verified agents to offer a wide variety of accommodation choices across Ghana.
        </p>

        {/* Platform Disclaimer Box */}
        <div className={styles.disclaimerBox}>
          <div className={styles.disclaimerHeader}>
            <ShieldAlert size={18} /> Important Platform Disclaimer
          </div>
          <div className={styles.disclaimerText}>
            <strong>HO Rentals is an independent listing platform:</strong> We are separate from third-party agents. Any transaction, financial payment, viewings, or agreements made between you and an agent are purely your direct responsibility. <strong>HO Rentals holds zero liability for agent-handled agreements or transactions.</strong>
          </div>
        </div>

        {/* Verification Standards */}
        <div className={styles.pointsList}>
          <div className={styles.pointItem}>
            <CheckCircle2 size={16} className={styles.pointIcon} />
            <div>
              <span className={styles.pointTextTitle}>Ghana Card ID Screened</span>
              <span className={styles.pointTextDesc}>
                Agent government photo ID and phone contact have been validated by HO Rentals.
              </span>
            </div>
          </div>

          <div className={styles.pointItem}>
            <CheckCircle2 size={16} className={styles.pointIcon} />
            <div>
              <span className={styles.pointTextTitle}>No Illegal Registration Fees</span>
              <span className={styles.pointTextDesc}>
                Agents agree to display real prices and refrain from charging unauthorized markups.
              </span>
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
            I understand & agree that HO Rentals is an independent platform and is not liable for third-party agent interactions or transactions.
          </span>
        </label>

        {/* Action Button */}
        <button
          className={styles.confirmBtn}
          disabled={!hasAgreed}
          onClick={handleConfirm}
        >
          <span>I Accept & Proceed to Agent</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
