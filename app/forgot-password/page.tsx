'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, KeyRound, CheckCircle2, ArrowLeft, Loader, Eye, EyeOff, Lock, MessageSquare } from 'lucide-react';
import { graphqlRequest, REQUEST_PASSWORD_RESET, RESET_PASSWORD_WITH_OTP } from '../../lib/graphql';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // Step state: 1 = Request OTP, 2 = Verify OTP & Set New Password, 3 = Reset Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Request OTP code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<{ requestPasswordReset: { success: boolean; message: string; otpCode?: string } }>(
        REQUEST_PASSWORD_RESET,
        { identifier: emailOrPhone.trim() }
      );

      if (data?.requestPasswordReset) {
        if (data.requestPasswordReset.otpCode) {
          setGeneratedOtp(data.requestPasswordReset.otpCode);
          setOtpCode(data.requestPasswordReset.otpCode); // Pre-fill for instant seamless recovery
        }
        setSuccessMessage(data.requestPasswordReset.message);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset password using OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword) return;
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your new password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await graphqlRequest<{ resetPasswordWithOtp: { success: boolean; message: string } }>(
        RESET_PASSWORD_WITH_OTP,
        {
          identifier: emailOrPhone.trim(),
          otpCode: otpCode.trim(),
          newPassword,
        }
      );

      if (data?.resetPasswordWithOtp?.success) {
        setSuccessMessage(data.resetPasswordWithOtp.message);
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check the OTP code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ maxWidth: '440px' }}>
        <div className={styles.header}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: step === 3 ? '#ECFDF5' : 'var(--primary-light)',
            color: step === 3 ? '#047857' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            {step === 3 ? <CheckCircle2 size={28} /> : <Shield size={28} />}
          </div>
          <h1 className={styles.title}>
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Enter Verification Code'}
            {step === 3 && 'Password Reset Complete!'}
          </h1>
          <p className={styles.subtitle}>
            {step === 1 && 'Enter your account email or phone number to receive a 6-digit verification code.'}
            {step === 2 && `We generated a 6-digit code for ${emailOrPhone}. Enter it below with your new password.`}
            {step === 3 && 'Your account password has been updated. You can now sign in.'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className={styles.form}>
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

            <button type="submit" disabled={loading} className={styles.button} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Get 6-Digit Reset Code'
              )}
            </button>
          </form>
        )}

        {/* STEP 2: ENTER OTP & NEW PASSWORD */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            {generatedOtp && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3B82F6',
                color: '#1D4ED8',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                🔑 Verification Code: <span style={{ fontSize: '1.2rem', letterSpacing: '2px', textDecoration: 'underline' }}>{generatedOtp}</span>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="otpCode" className={styles.label}>
                6-Digit Verification Code
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  id="otpCode"
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 482915"
                  className={styles.input}
                  style={{ paddingLeft: '40px', letterSpacing: '2px', fontSize: '1.05rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="newPassword" className={styles.label}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={styles.input}
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={styles.input}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.button} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Confirm & Reset Password'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', marginTop: '8px' }}
            >
              &larr; Use a different email/phone
            </button>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{
              padding: '16px 20px',
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: '#065F46',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              🎉 Your password has been successfully updated! You can now log into your account.
            </div>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className={styles.button}
              style={{ width: '100%', textDecoration: 'none' }}
            >
              Sign In Now
            </button>
          </div>
        )}

        {/* Support Link */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <a
            href={`https://wa.me/233557922593?text=Hi%20HO%20Rentals,%20I%20need%20help%20with%20my%20account%20password%20recovery.`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <MessageSquare size={14} style={{ color: '#25D366' }} /> Need Help? Contact WhatsApp Support (0557922593)
          </a>
          <Link href="/login" style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
