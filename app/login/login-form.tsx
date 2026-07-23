'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff, Loader, LogIn, ArrowLeft } from 'lucide-react';
import styles from './login.module.css';

export default function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get('redirect') || '/';

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push(redirectUrl);
      }
    }
  }, [user, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let phoneInput = phone.trim().replace(/[^0-9]/g, '');
      let emailOrPhone = phoneInput;
      
      // If it doesn't look like an email, convert it to phone-email format
      if (!emailOrPhone.includes('@')) {
        if (emailOrPhone.toLowerCase() === 'admin') {
          emailOrPhone = 'admin@horentals.com';
        } else {
          if (phoneInput.length !== 10) {
            throw new Error('Please enter a valid 10-digit Ghanaian phone number (e.g. 0241234567).');
          }
          emailOrPhone = `${phoneInput}@horentals.com`;
        }
      }
      await login(emailOrPhone, password);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to authenticate. Please check your credentials.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Back to home */}
      <Link href="/" className={styles.backBtn} aria-label="Back to home">
        <ArrowLeft size={16} />
        <span>Back to HO Rentals</span>
      </Link>
      <div className={`${styles.card} animate-fade-in`}>

        {/* Brand mark */}
        <div className={styles.brand}>
          <img src="/logo.png" alt="HO Rentals" className={styles.brandLogo} />
          <span className={styles.brandName}>HO<span className={styles.brandSpan}>Rentals</span></span>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Welcome back! Enter your details to continue.</p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group">
            <label htmlFor="phone">Phone Number (10 Digits)</label>
            <input
              id="phone"
              type="tel"
              placeholder="e.g. 0241234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              required
              maxLength={10}
              autoComplete="tel"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={`form-control ${styles.passwordInput}`}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: '6px' }}>
              <Link href="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            {loading ? (
              <>
                <Loader size={16} className={styles.spin} /> Signing in...
              </>
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className={styles.toggleLink}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
