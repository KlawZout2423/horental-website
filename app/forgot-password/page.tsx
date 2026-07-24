'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  KeyRound, 
  CheckCircle2, 
  ArrowLeft, 
  Loader, 
  Eye, 
  EyeOff, 
  Lock, 
  MessageSquare,
  Copy,
  Check,
  Smartphone,
  Mail,
  RefreshCw
} from 'lucide-react';
import { graphqlRequest, REQUEST_PASSWORD_RESET, RESET_PASSWORD_WITH_OTP } from '../../lib/graphql';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // Step state: 1 = Account Identifier, 2 = 6-Digit OTP & Password, 3 = Reset Success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy OTP code to clipboard
  const handleCopyCode = () => {
    if (!generatedOtp) return;
    navigator.clipboard.writeText(generatedOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

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
          setOtpCode(data.requestPasswordReset.otpCode);
        }
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code. Please check your connection.');
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
      setError('Passwords do not match. Please re-enter your new password.');
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
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page} style={{ background: 'radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08) 0%, var(--bg) 70%)' }}>
      {/* Top Left Navigation Pill */}
      <Link href="/login" className={styles.backBtn}>
        <ArrowLeft size={16} /> Back to Sign In
      </Link>

      <div className={styles.card} style={{ maxWidth: '460px', padding: '36px 32px', position: 'relative' }}>
        
        {/* Step Wizard Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
          
          {/* Background Track Line */}
          <div style={{ position: 'absolute', top: '16px', left: '16%', right: '16%', height: '3px', backgroundColor: 'var(--border)', zIndex: 0 }} />
          <div 
            style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16%', 
              width: step === 1 ? '0%' : step === 2 ? '50%' : '68%', 
              height: '3px', 
              backgroundColor: 'var(--primary)', 
              transition: 'width 0.4s ease', 
              zIndex: 0 
            }} 
          />

          {/* Step 1 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: step >= 1 ? 'var(--primary)' : 'var(--bg-surface-secondary)',
              color: step >= 1 ? '#FFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step >= 1 ? '0 0 12px rgba(37, 99, 235, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step >= 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Account
            </span>
          </div>

          {/* Step 2 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: step >= 2 ? 'var(--primary)' : 'var(--bg-surface-secondary)',
              color: step >= 2 ? '#FFF' : 'var(--text-muted)',
              border: step === 2 ? '2px solid var(--primary)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step >= 2 ? '0 0 12px rgba(37, 99, 235, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step > 2 ? <Check size={16} /> : '2'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step >= 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              Verify & Reset
            </span>
          </div>

          {/* Step 3 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: step === 3 ? '#10B981' : 'var(--bg-surface-secondary)',
              color: step === 3 ? '#FFF' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step === 3 ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step === 3 ? <Check size={16} /> : '3'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step === 3 ? '#10B981' : 'var(--text-muted)' }}>
              Done
            </span>
          </div>
        </div>

        {/* Header Hero Icon */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: step === 3 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))' 
              : 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(79, 70, 229, 0.25))',
            color: step === 3 ? '#10B981' : 'var(--primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            border: step === 3 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
          }}>
            {step === 1 && <Shield size={30} />}
            {step === 2 && <KeyRound size={30} />}
            {step === 3 && <CheckCircle2 size={32} />}
          </div>
          <h1 className={styles.title} style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {step === 1 && 'Reset Your Password'}
            {step === 2 && 'Verification & New Password'}
            {step === 3 && 'Password Reset Complete!'}
          </h1>
          <p className={styles.subtitle} style={{ fontSize: '0.85rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
            {step === 1 && 'Enter your registered email or phone number to receive a 6-digit verification code.'}
            {step === 2 && `Enter the 6-digit code sent for ${emailOrPhone} along with your new password.`}
            {step === 3 && 'Your account security credentials have been updated successfully.'}
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className={styles.errorBanner} style={{ margin: '8px 0 16px 0', borderRadius: 'var(--radius-sm)' }}>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: ACCOUNT IDENTIFIER FORM */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="emailOrPhone" className={styles.label}>
                Email Address or Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="emailOrPhone"
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. 0557922593 or tenant@gmail.com"
                  className={styles.input}
                  style={{ paddingLeft: '42px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.button}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #3B82F6 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px'
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>
                  Get 6-Digit Code &rarr;
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP & NEW PASSWORD FORM */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            
            {/* Generated Code Highlight Card */}
            {generatedOtp && (
              <div style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.12) 100%)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    🔑 6-Digit Verification Code
                  </span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '4px', fontFamily: 'monospace' }}>
                    {generatedOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', height: 'auto', gap: '4px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  {copiedOtp ? <Check size={14} /> : <Copy size={14} />}
                  {copiedOtp ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            )}

            {/* 6-Digit Code Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="otpCode" className={styles.label}>
                Enter 6-Digit Code
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                <input
                  id="otpCode"
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 482915"
                  className={styles.input}
                  style={{
                    paddingLeft: '42px',
                    letterSpacing: '6px',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            {/* New Password */}
            <div className={styles.inputGroup}>
              <label htmlFor="newPassword" className={styles.label}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={styles.input}
                  style={{ paddingLeft: '42px', paddingRight: '42px', fontSize: '0.92rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={styles.input}
                  style={{ paddingLeft: '42px', fontSize: '0.92rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.button}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #3B82F6 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Confirm & Save New Password'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} /> Change email / phone number
            </button>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.15) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#065F46',
              fontSize: '0.92rem',
              fontWeight: 600,
              lineHeight: 1.5
            }}>
              🎉 <strong>Success!</strong> Your password has been reset. You can now sign in with your new security credentials.
            </div>

            <button
              type="button"
              onClick={() => router.push('/login')}
              className={styles.button}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                fontWeight: 700
              }}
            >
              Sign In to Your Account &rarr;
            </button>
          </div>
        )}

        {/* WhatsApp Support Direct Button */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <a
            href={`https://wa.me/233557922593?text=Hi%20HO%20Rentals,%20I%20need%20assistance%20resetting%20my%20account%20password.`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(37, 211, 102, 0.1)',
              border: '1px solid rgba(37, 211, 102, 0.3)',
              borderRadius: '20px',
              color: '#15803D',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none'
            }}
          >
            <MessageSquare size={14} style={{ color: '#25D366' }} /> Contact WhatsApp Support (0557922593)
          </a>
        </div>

      </div>
    </div>
  );
}
