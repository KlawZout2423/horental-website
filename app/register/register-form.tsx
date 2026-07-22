'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff, Loader, UserPlus, ArrowLeft } from 'lucide-react';
import styles from '../login/login.module.css';

const getPasswordStrength = (pwd: string) => {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  let label = 'Weak';
  let color = '#EF4444';
  if (score >= 3) {
    label = 'Strong';
    color = '#10B981';
  } else if (score >= 2) {
    label = 'Medium';
    color = '#F59E0B';
  }

  return { score, label, color };
};

export default function RegisterForm() {
  const { register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);

  const redirectUrl = searchParams.get('redirect') || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (strength.score < 2) {
      setError('Password is too weak. Please make it stronger by adding uppercase letters, numbers, or special characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the Terms & Conditions to create an account.');
      return;
    }

    setLoading(true);

    try {
      const cleanedPhone = phone.trim().replace(/[^0-9a-zA-Z]/g, '');
      const generatedEmail = `${cleanedPhone}@horentals.com`;

      await register({
        name: name.trim(),
        email: generatedEmail,
        phone: phone.trim(),
        password,
      });

      router.push(redirectUrl);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create your account. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Back to home */}
      <Link href="/" className={styles.backBtn} aria-label="Back to home">
        <ArrowLeft size={18} />
        <span>Home</span>
      </Link>
      <div className={`${styles.card} animate-fade-in`}>

        {/* Brand mark */}
        <div className={styles.brand}>
          <img src="/logo.png" alt="HO Rentals" className={styles.brandLogo} />
          <span className={styles.brandName}>HO<span className={styles.brandSpan}>Rentals</span></span>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join HO Rentals to find or list student accommodation.</p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              placeholder="e.g. +233 24 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min. 6 characters)</span></label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={`form-control ${styles.passwordInput}`}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Password Strength: <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  {[0, 1, 2, 3].map((index) => {
                    const filledSegmentsCount = strength.score + 1;
                    const isFilled = index < filledSegmentsCount;
                    return (
                      <div
                        key={index}
                        style={{
                          height: '4px',
                          flex: 1,
                          backgroundColor: isFilled ? strength.color : 'var(--bg-surface-secondary)',
                          borderRadius: '2px',
                          transition: 'background-color 0.3s ease'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`form-control ${styles.passwordInput}`}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Terms checkbox */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input
              id="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
            />
            <label htmlFor="terms" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: 1.5 }}>
              I agree to the{' '}
              <Link href="/terms" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                Terms &amp; Conditions
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            {loading ? (
              <>
                <Loader size={16} className={styles.spin} /> Creating account...
              </>
            ) : (
              <>
                <UserPlus size={16} /> Sign Up
              </>
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className={styles.toggleLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
