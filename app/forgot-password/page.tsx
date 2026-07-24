'use client';

import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { graphqlRequest, REQUEST_PASSWORD_RESET, RESET_PASSWORD_WITH_OTP } from '../../lib/graphql';
import styles from '../login/login.module.css';

// 6-Digit Interactive OTP Box Component
const OtpDigitBoxes = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleDigitChange = (index: number, char: string) => {
    const clean = char.replace(/[^0-9]/g, '');
    
    if (clean.length > 1) {
      // Pasted full 6-digit code
      onChange(clean.slice(0, 6));
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean;
    const combined = newDigits.join('');
    onChange(combined);

    // Auto-focus next box
    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '16px 0' }}>
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <input
          key={idx}
          id={`otp-digit-${idx}`}
          type="text"
          maxLength={1}
          inputMode="numeric"
          value={digits[idx]?.trim() || ''}
          onChange={(e) => handleDigitChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
            if (pasted) onChange(pasted);
          }}
          style={{
            width: '46px',
            height: '54px',
            borderRadius: '12px',
            border: digits[idx]?.trim() ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
            backgroundColor: digits[idx]?.trim() ? '#EFF6FF' : '#F8FAFC',
            color: '#0F172A',
            fontSize: '1.35rem',
            fontWeight: 800,
            textAlign: 'center',
            boxShadow: digits[idx]?.trim() ? '0 0 0 4px rgba(37, 99, 235, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none'
          }}
        />
      ))}
    </div>
  );
};

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
      setError(err.message || 'Failed to request verification code. Please check your network connection.');
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
      setError('Passwords do not match. Please verify your password entry.');
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
      setError(err.message || 'Failed to reset password. Please check your 6-digit verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={styles.page} 
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'radial-gradient(ellipse at 50% -20%, #1E1B4B 0%, #0F172A 45%, #020617 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Floating Light Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

      {/* Top Left Navigation Pill */}
      <Link 
        href="/login" 
        className={styles.backBtn}
        style={{
          color: '#E2E8F0',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        <ArrowLeft size={16} /> Back to Sign In
      </Link>

      {/* Main Glassmorphic Card */}
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '460px', 
          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
          backdropFilter: 'blur(24px)', 
          WebkitBackdropFilter: 'blur(24px)', 
          borderRadius: '24px', 
          border: '1px solid rgba(255, 255, 255, 0.8)', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2)', 
          padding: '40px 32px', 
          position: 'relative', 
          zIndex: 10 
        }}
      >
        {/* Step Progress Indicator Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', position: 'relative' }}>
          {/* Progress Track Line */}
          <div style={{ position: 'absolute', top: '16px', left: '16%', right: '16%', height: '3px', backgroundColor: '#E2E8F0', zIndex: 0 }} />
          <div 
            style={{ 
              position: 'absolute', 
              top: '16px', 
              left: '16%', 
              width: step === 1 ? '0%' : step === 2 ? '50%' : '68%', 
              height: '3px', 
              background: 'linear-gradient(90deg, #2563EB, #4F46E5)', 
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)', 
              zIndex: 0 
            }} 
          />

          {/* Step 1 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: step >= 1 ? 'linear-gradient(135deg, #2563EB, #4F46E5)' : '#F1F5F9',
              color: step >= 1 ? '#FFFFFF' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step >= 1 ? '0 0 12px rgba(37, 99, 235, 0.35)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step > 1 ? <Check size={16} /> : '1'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step >= 1 ? '#0F172A' : '#94A3B8' }}>
              Account
            </span>
          </div>

          {/* Step 2 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: step >= 2 ? 'linear-gradient(135deg, #2563EB, #4F46E5)' : '#F1F5F9',
              color: step >= 2 ? '#FFFFFF' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step >= 2 ? '0 0 12px rgba(37, 99, 235, 0.35)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step > 2 ? <Check size={16} /> : '2'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step >= 2 ? '#0F172A' : '#94A3B8' }}>
              Verify Code
            </span>
          </div>

          {/* Step 3 Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 1 }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: step === 3 ? 'linear-gradient(135deg, #10B981, #059669)' : '#F1F5F9',
              color: step === 3 ? '#FFFFFF' : '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: step === 3 ? '0 0 12px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.3s ease'
            }}>
              {step === 3 ? <Check size={16} /> : '3'}
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: step === 3 ? '#10B981' : '#94A3B8' }}>
              Complete
            </span>
          </div>
        </div>

        {/* Hero Badge Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            background: step === 3 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.2))' 
              : 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(79, 70, 229, 0.2))',
            color: step === 3 ? '#10B981' : '#2563EB',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            border: step === 3 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(37, 99, 235, 0.3)',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.04)'
          }}>
            {step === 1 && <Shield size={32} />}
            {step === 2 && <KeyRound size={32} />}
            {step === 3 && <CheckCircle2 size={36} />}
          </div>
          <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            {step === 1 && 'Reset Your Password'}
            {step === 2 && 'Security Verification'}
            {step === 3 && 'Password Updated!'}
          </h1>
          <p style={{ fontSize: '0.86rem', marginTop: '6px', color: '#64748B', lineHeight: 1.5 }}>
            {step === 1 && 'Enter your account email or phone number to receive a 6-digit verification code.'}
            {step === 2 && `Enter the 6-digit verification code sent for ${emailOrPhone} and set your new password.`}
            {step === 3 && 'Your account security credentials have been updated successfully.'}
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#DC2626',
            borderRadius: '12px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            fontWeight: 600,
            lineHeight: 1.5
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: ACCOUNT IDENTIFIER FORM */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email Address or Phone Number
              </label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="e.g. 0557922593 or user@gmail.com"
                  style={{
                    width: '100%',
                    height: '52px',
                    paddingLeft: '46px',
                    paddingRight: '16px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.backgroundColor = '#F8FAFC';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.4)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                marginTop: '4px'
              }}
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Generating Code...
                </>
              ) : (
                <>
                  Get 6-Digit Code <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP & NEW PASSWORD FORM */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Generated Code Highlight Card */}
            {generatedOtp && (
              <div style={{
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)',
                border: '1px solid #BFDBFE',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                    🔑 Verification Code
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1E3A8A', letterSpacing: '4px', fontFamily: 'monospace' }}>
                    {generatedOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #2563EB',
                    backgroundColor: '#FFFFFF',
                    color: '#2563EB',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)'
                  }}
                >
                  {copiedOtp ? <Check size={14} /> : <Copy size={14} />}
                  {copiedOtp ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            )}

            {/* Interactive 6-Digit OTP Box Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                Enter 6-Digit Verification Code
              </label>
              <OtpDigitBoxes value={otpCode} onChange={setOtpCode} />
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  style={{
                    width: '100%',
                    height: '50px',
                    paddingLeft: '46px',
                    paddingRight: '46px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{
                    width: '100%',
                    height: '50px',
                    paddingLeft: '46px',
                    paddingRight: '16px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#0F172A',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(37, 99, 235, 0.4)',
                marginTop: '6px'
              }}
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Confirm & Save New Password'
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setError(null); }}
              style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}
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
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              border: '1px solid #A7F3D0',
              borderRadius: '16px',
              color: '#065F46',
              fontSize: '0.92rem',
              fontWeight: 600,
              lineHeight: 1.5
            }}>
              🎉 <strong>Password Updated Successfully!</strong> You can now sign into your account using your new credentials.
            </div>

            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.4)'
              }}
            >
              Sign In to Your Account <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* WhatsApp Support Direct Button */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
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
              fontSize: '0.82rem',
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
