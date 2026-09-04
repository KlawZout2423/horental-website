'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { Eye, EyeOff, Loader, ArrowLeft, ShieldCheck, CheckCircle2, Building2 } from 'lucide-react';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput } from '../../lib/types';
import { graphqlRequest, UPDATE_AGENT_PROFILE } from '../../lib/graphql';
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

export default function AgentRegisterForm() {
  const { register, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [location, setLocation] = useState('Ho, Volta Region');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);
  const redirectUrl = searchParams.get('redirect') || '/upload';

  // Redirect if already logged in as an agent
  useEffect(() => {
    if (user && user.role === 'agent') {
      setSuccess(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sanitizedName = sanitizeInput(name);
    const formattedPhone = formatGhanaPhone(phone);
    const formattedWhatsapp = whatsapp ? formatGhanaPhone(whatsapp) : formattedPhone;

    if (!sanitizedName) {
      setError('Please enter your full name.');
      return;
    }

    if (!isValidGhanaPhone(formattedPhone)) {
      setError('Please enter a valid 10-digit Ghanaian phone number (e.g. 0241234567).');
      return;
    }

    if (strength.score < 2) {
      setError('Password is too weak. Please add uppercase letters, numbers, or special characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (!acceptTerms) {
      setError('You must accept the Agent Terms & Conditions to register as an agent.');
      return;
    }

    setLoading(true);

    try {
      const generatedEmail = `${formattedPhone}@horentals.com`;

      await register({
        name: sanitizedName,
        email: generatedEmail,
        phone: formattedPhone,
        password,
      });

      // Update agent details if GraphQL endpoint available
      try {
        await graphqlRequest(UPDATE_AGENT_PROFILE, {
          bio: agencyName ? `Agent at ${agencyName}` : 'Registered HO Rentals Agent',
          profileImage: '',
          agentLocation: location,
          agentWhatsapp: formattedWhatsapp
        });
      } catch {
        // Optional profile metadata update fallback
      }

      setSuccess(true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to register as an agent. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.container} style={{ maxWidth: '440px' }}>
          <Link href="/" className={styles.simpleBackLink}>
            <ArrowLeft size={16} />
            <span>Back to HO Rentals</span>
          </Link>

          <div className={`${styles.card} animate-fade-in`} style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ margin: '0 auto 12px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={32} />
            </div>

            <h1 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '6px' }}>Agent Account Created!</h1>
            <p className={styles.subtitle} style={{ marginBottom: '20px', lineHeight: 1.5 }}>
              Welcome to HO Rentals! Your agent registration is active. You can now post property listings and connect directly with tenants.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/upload" className="btn btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-md)', fontWeight: 700 }}>
                List Your First Property &rarr;
              </Link>

              <Link href="/" className="btn btn-outline" style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                Return to Home Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ maxWidth: '420px' }}>
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
          <div style={{ display: 'inline-flex', alignItems: 'center', justifySelf: 'center', gap: '6px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, margin: '0 auto 4px' }}>
            <ShieldCheck size={14} /> Agent Registration
          </div>
          <h1 className={styles.title}>Register as an Agent</h1>
          <p className={styles.subtitle}>Join HO Rentals to list properties, manage inquiries, and connect with verified tenants.</p>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone number</label>
            <div className={styles.phoneInputContainer}>
              <div className={styles.phonePrefix}>🇬🇭 +233</div>
              <input
                id="phone"
                type="tel"
                placeholder="24 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                required
                maxLength={10}
                autoComplete="tel"
                className={`form-control ${styles.phoneInput}`}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agencyName">Agency or Business name (Optional)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="agencyName"
                type="text"
                placeholder="e.g. Independent Agent or Prime Properties"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Operating Region / City</label>
            <select
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="form-control"
              style={{ cursor: 'pointer' }}
            >
              <option value="Ho, Volta Region">Ho, Volta Region</option>
              <option value="Hohoe, Volta Region">Hohoe, Volta Region</option>
              <option value="Aflao, Volta Region">Aflao, Volta Region</option>
              <option value="Accra, Greater Accra">Accra, Greater Accra</option>
              <option value="Kumasi, Ashanti">Kumasi, Ashanti</option>
              <option value="Takoradi, Western Region">Takoradi, Western Region</option>
              <option value="Other Region in Ghana">Other Region in Ghana</option>
            </select>
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
            <span className={styles.passwordHelper}>At least 8 characters</span>
            {password && (
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    Strength: <strong style={{ color: strength.color }}>{strength.label}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                  {[0, 1, 2, 3].map((index) => {
                    const filledSegmentsCount = strength.score + 1;
                    const isFilled = index < filledSegmentsCount;
                    return (
                      <div
                        key={index}
                        style={{
                          height: '3px',
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
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
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
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '2px' }}>
            <input
              id="terms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
            />
            <label htmlFor="terms" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: 1.35 }}>
              I agree to the{' '}
              <Link href="/terms" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                Agent Terms &amp; Conditions
              </Link>{' '}
              and confirm I am authorized to represent listings.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn btn-primary ${styles.submitBtn}`}
            style={{ marginTop: '6px' }}
          >
            {loading ? (
              <>
                <Loader size={16} className={styles.spin} /> Registering as Agent...
              </>
            ) : (
              <>
                <Building2 size={16} /> Register as Agent
              </>
            )}
          </button>
        </form>

        <p className={styles.footer} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          Already registered?{' '}
          <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className={styles.toggleLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  </div>
  );
}
