'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageSquare, ArrowLeft, CheckCircle2, Shield } from 'lucide-react';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Shield size={28} />
          </div>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your account email or phone number to receive reset instructions
          </p>
        </div>

        {submitted ? (
          <div style={{
            padding: '24px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <CheckCircle2 size={32} style={{ color: '#047857' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#065F46' }}>Request Received</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              If an account matches <strong>{emailOrPhone}</strong>, we have sent instructions. You can also contact support directly via WhatsApp for instant account recovery.
            </p>
            
            <a
              href={`https://wa.me/233557922593?text=Hi%20HO%20Rentals,%20I%20need%20help%20resetting%20my%20account%20password%20for%20${encodeURIComponent(emailOrPhone)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '8px', gap: '8px', fontWeight: 700 }}
            >
              <MessageSquare size={16} /> Contact Support on WhatsApp (0557922593)
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="emailOrPhone" className={styles.label}>
                Email or Phone Number
              </label>
              <input
                id="emailOrPhone"
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="e.g. 0557922593 or user@gmail.com"
                className={styles.input}
              />
            </div>

            <button type="submit" className={styles.button}>
              Send Reset Request
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
