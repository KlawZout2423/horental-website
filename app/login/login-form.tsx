'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff, Loader, LogIn, ArrowLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import styles from './login.module.css';

export default function LoginForm() {
  const { login, googleLogin, user } = useAuth();
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
      const rawInput = phone.trim();
      let emailOrPhone = rawInput;
      
      if (rawInput.toLowerCase() === 'admin') {
        emailOrPhone = 'admin@horentals.com';
      } else if (rawInput.includes('@')) {
        emailOrPhone = rawInput;
      } else {
        const cleanedPhone = rawInput.replace(/[^0-9]/g, '');
        if (cleanedPhone.length !== 10) {
          throw new Error('Please enter a valid 10-digit phone number (e.g. 0241234567).');
        }
        emailOrPhone = `${cleanedPhone}@horentals.com`;
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
      <div className={styles.container}>
        {/* Back to home link */}
        <Link href="/" className={styles.simpleBackLink}>
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
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to manage your rentals &amp; bookings.</p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <div className={styles.phoneInputContainer}>
              <div className={styles.phonePrefix}>🇬🇭 +233</div>
              <input
                id="phone"
                type="tel"
                placeholder="24 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="username"
                className={`form-control ${styles.phoneInput}`}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
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
            <div className={styles.forgotPasswordContainer}>
              <Link href="/forgot-password" className={styles.forgotPasswordLink}>
                Forgot password?
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

        <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', opacity: 0.6 }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
          <span style={{ padding: '0 8px', fontSize: '0.78rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={(credentialResponse) => {
              if (credentialResponse.credential) {
                googleLogin(credentialResponse.credential).catch((err) => {
                  setError(err.message || 'Google login failed');
                });
              }
            }}
            onError={() => {
              setError('Google login failed. Please try again.');
            }}
            shape="rectangular"
            theme="outline"
            text="continue_with"
            width="320"
          />
        </div>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className={styles.toggleLink}>
            Sign Up
          </Link>
        </p>

        {/* Agent Registration Section */}
        <div className={styles.agentSection}>
          <span className={styles.agentText}>Are you an agent?</span>
          <Link href="/register-agent" className={styles.agentOutlineBtn}>
            Register as an Agent &rarr;
          </Link>
        </div>
      </div>
    </div>
  </div>
);
}
