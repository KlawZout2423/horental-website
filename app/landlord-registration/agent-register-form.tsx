'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { 
  Eye, 
  EyeOff, 
  Loader, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  User, 
  FileText, 
  Briefcase, 
  Check, 
  MapPin, 
  Phone
} from 'lucide-react';
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

  const [currentStep, setCurrentStep] = useState(1);

  // --- Step 1: Personal & Contact Details ---
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailInput, setEmailInput] = useState('');

  // --- Step 2: Identification & Verification ---
  const [idType, setIdType] = useState('Ghana Card');
  const [idNumber, setIdNumber] = useState('');
  const [digitalAddress, setDigitalAddress] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [city, setCity] = useState('Ho');
  const [region, setRegion] = useState('Volta');

  // --- Step 3: Agency & Experience Profile ---
  const [agencyName, setAgencyName] = useState('');
  const [experience, setExperience] = useState('1-2 Years');
  const [operatingLocations, setOperatingLocations] = useState('');
  const [propertyTypesManaged, setPropertyTypesManaged] = useState<string[]>([
    'Single Room Self Contain', 'Apartments'
  ]);

  // --- Step 4: Account Password & Agreement ---
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [agreements, setAgreements] = useState<boolean[]>([
    false, false, false, false
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(password);
  const redirectUrl = searchParams.get('redirect') || '/upload';

  const regionOptions = [
    'Volta', 'Greater Accra', 'Ashanti', 'Northern', 'Eastern', 
    'Western', 'Central', 'Bono', 'Upper East', 'Upper West', 
    'Oti', 'Savannah', 'North East', 'Ahafo', 'Bono East', 'Western North'
  ];

  const propertyTypeOptions = [
    'Single Room', 'Single Room Self Contain', 'Chamber & Hall',
    'Chamber & Hall Self Contain', '2-Bedroom Apartment', 
    '3-Bedroom Apartment+', 'Student Hostels', 'Shops / Commercial', 'Land / Plots'
  ];

  const agreementPoints = [
    'I confirm that all personal and identification details provided are true, valid, and legally accurate.',
    'I agree to uphold the HO Rentals verified agent standards and respond promptly to tenant inquiries.',
    'I agree to the HO Rentals commission and service agreement policy on confirmed tenant transactions.',
    'I enter into this agent agreement voluntarily without pressure or misrepresentation.'
  ];

  // Redirect if already logged in as an agent
  useEffect(() => {
    if (user && user.role === 'agent') {
      setSuccess(true);
    }
  }, [user]);

  const togglePropertyType = (type: string) => {
    setPropertyTypesManaged(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleAgreement = (index: number) => {
    setAgreements(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  // --- Step Validation Handlers ---
  const validateStep1 = () => {
    setError(null);
    const sanitizedName = sanitizeInput(name);
    if (!sanitizedName) return setError('Please enter your full name.');
    if (!phone.trim()) return setError('Please enter your primary phone number.');

    const formattedPhone = formatGhanaPhone(phone);
    if (!isValidGhanaPhone(formattedPhone)) {
      return setError('Please enter a valid 10-digit primary phone number (e.g. 0241234567).');
    }

    if (whatsapp.trim()) {
      const formattedWa = formatGhanaPhone(whatsapp);
      if (!isValidGhanaPhone(formattedWa)) {
        return setError('Please enter a valid 10-digit WhatsApp phone number.');
      }
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep2 = () => {
    setError(null);
    if (!idNumber.trim()) return setError('Please enter your National ID / Ghana Card Number.');
    if (!city.trim()) return setError('Please enter your city or town.');
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep3 = () => {
    setError(null);
    if (propertyTypesManaged.length === 0) {
      return setError('Please select at least one property type you manage or list.');
    }
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sanitizedName = sanitizeInput(name);
    const formattedPhone = formatGhanaPhone(phone);
    const formattedWhatsapp = whatsapp ? formatGhanaPhone(whatsapp) : formattedPhone;

    if (strength.score < 2) {
      setError('Password is too weak. Please add uppercase letters, numbers, or special characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (agreements.some(a => !a)) {
      setError('Please review and check all code of conduct points to proceed.');
      return;
    }

    setLoading(true);

    try {
      const generatedEmail = emailInput.trim() || `${formattedPhone}@horentals.com`;

      await register({
        name: sanitizedName,
        email: generatedEmail,
        phone: formattedPhone,
        password,
      });

      // Update Agent Profile with detailed credentials
      try {
        const fullBio = `${agencyName ? `Agent at ${agencyName}.` : 'Registered Agent.'} Experience: ${experience}. Operating Area: ${operatingLocations || city}. Managed Types: ${propertyTypesManaged.join(', ')}. ID: ${idType} (${idNumber}). Address: ${digitalAddress || homeAddress || city}.`;
        
        await graphqlRequest(UPDATE_AGENT_PROFILE, {
          bio: fullBio,
          profileImage: '',
          agentLocation: `${city}, ${region} Region`,
          agentWhatsapp: formattedWhatsapp
        });
      } catch {
        // Fallback for metadata profile update
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
        <div className={styles.container} style={{ maxWidth: '460px' }}>
          <Link href="/" className={styles.simpleBackLink}>
            <ArrowLeft size={16} />
            <span>Back to HO Rentals</span>
          </Link>

          <div className={`${styles.card} animate-fade-in`} style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ margin: '0 auto 12px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={36} />
            </div>

            <h1 className={styles.title} style={{ fontSize: '1.55rem', marginBottom: '6px' }}>Agent Verification Submitted!</h1>
            <p className={styles.subtitle} style={{ marginBottom: '20px', lineHeight: 1.5 }}>
              Welcome to HO Rentals! Your agent account for <strong>{name}</strong> is active. You can now post property listings and connect directly with tenants.
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
      <div className={styles.container} style={{ maxWidth: '520px' }}>
        {/* Back to home link */}
        <Link href="/" className={styles.simpleBackLink}>
          <ArrowLeft size={16} />
          <span>Back to HO Rentals</span>
        </Link>

        <div className={`${styles.card} animate-fade-in`} style={{ maxWidth: '520px' }}>

        {/* Brand mark */}
        <div className={styles.brand}>
          <img src="/logo.png" alt="HO Rentals" className={styles.brandLogo} />
          <span className={styles.brandName}>HO<span className={styles.brandSpan}>Rentals</span></span>
        </div>

        <div className={styles.header}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifySelf: 'center', gap: '6px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700, margin: '0 auto 4px' }}>
            <ShieldCheck size={14} /> Agent Registration Portal
          </div>
          <h1 className={styles.title}>Register as an Agent</h1>
          <p className={styles.subtitle}>Complete your agent verification profile to list properties and manage inquiries.</p>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 12px', padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          {[
            { num: 1, label: 'Contact', icon: User },
            { num: 2, label: 'Verification', icon: FileText },
            { num: 3, label: 'Agency', icon: Briefcase },
            { num: 4, label: 'Security', icon: ShieldCheck }
          ].map((s, idx, arr) => {
            const isActive = currentStep === s.num;
            const isDone = currentStep > s.num;
            return (
              <React.Fragment key={s.num}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justify-content: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: isDone ? 'var(--primary)' : isActive ? 'var(--primary-light)' : '#FFFFFF',
                    color: isDone ? '#FFFFFF' : isActive ? 'var(--primary)' : 'var(--text-muted)',
                    border: `2px solid ${isDone || isActive ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.2s ease'
                  }}>
                    {isDone ? <Check size={14} /> : s.num}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: isActive || isDone ? 700 : 500, color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{ height: '2px', flex: 1, backgroundColor: currentStep > s.num ? 'var(--primary)' : 'var(--border)', marginBottom: '14px', transition: 'background-color 0.2s ease' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* STEP 1: Personal & Contact Information */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="var(--primary)" /> 1. Personal &amp; Contact Details
              </div>

              <div className="form-group">
                <label htmlFor="name">Full name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Full Legal Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">Gender</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Primary phone number *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label htmlFor="whatsapp">WhatsApp number</label>
                  <div className={styles.phoneInputContainer}>
                    <div className={styles.phonePrefix} style={{ fontSize: '0.78rem' }}>+233</div>
                    <input
                      id="whatsapp"
                      type="tel"
                      placeholder="20 494 0602"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                      maxLength={10}
                      className={`form-control ${styles.phoneInput}`}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="altPhone">Secondary Phone</label>
                  <input
                    id="altPhone"
                    type="tel"
                    placeholder="Optional Phone"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    maxLength={10}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="emailInput">Email address (Optional)</label>
                <input
                  id="emailInput"
                  type="email"
                  placeholder="e.g. agent@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoComplete="email"
                  className="form-control"
                />
              </div>

              <button
                type="button"
                onClick={validateStep1}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', borderRadius: 'var(--radius-md)', marginTop: '6px' }}
              >
                Next: Identification Details &rarr;
              </button>
            </div>
          )}

          {/* STEP 2: Identification & Address Verification */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} color="var(--primary)" /> 2. Identification &amp; Residential Verification
              </div>

              <div className="form-group">
                <label htmlFor="idType">National ID Type *</label>
                <select
                  id="idType"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="form-control"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="Ghana Card">Ghana Card (National ID)</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="Passport">Passport</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="idNumber">National ID / Ghana Card Number *</label>
                <input
                  id="idNumber"
                  type="text"
                  placeholder="e.g. GHA-000000000-0"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                  required
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label htmlFor="digitalAddress">Ghana Digital Address (GPS)</label>
                <input
                  id="digitalAddress"
                  type="text"
                  placeholder="e.g. VH-0002-1234"
                  value={digitalAddress}
                  onChange={(e) => setDigitalAddress(e.target.value.toUpperCase())}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label htmlFor="city">City / Town *</label>
                  <input
                    id="city"
                    type="text"
                    placeholder="e.g. Ho"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="region">Region *</label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    {regionOptions.map(r => (
                      <option key={r} value={r}>{r} Region</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="homeAddress">Residential Address</label>
                <input
                  id="homeAddress"
                  type="text"
                  placeholder="e.g. Near Ho Stadium, Bankoe"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-md)' }}
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={validateStep2}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '11px', borderRadius: 'var(--radius-md)' }}
                >
                  Next: Agency Profile &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Agency & Property Experience */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={16} color="var(--primary)" /> 3. Agency &amp; Professional Experience Profile
              </div>

              <div className="form-group">
                <label htmlFor="agencyName">Agency or Business Name (Optional)</label>
                <input
                  id="agencyName"
                  type="text"
                  placeholder="e.g. Independent Registered Agent or Prime Properties"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label htmlFor="experience">Years of Experience</label>
                  <select
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="form-control"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="Below 1 Year">Below 1 Year</option>
                    <option value="1-2 Years">1-2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="operatingLocations">Primary Markets</label>
                  <input
                    id="operatingLocations"
                    type="text"
                    placeholder="e.g. Ho Central, UHAS"
                    value={operatingLocations}
                    onChange={(e) => setOperatingLocations(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Types of Properties You Manage / List *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  {propertyTypeOptions.map((type) => {
                    const isChecked = propertyTypesManaged.includes(type);
                    return (
                      <label
                        key={type}
                        onClick={() => togglePropertyType(type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: isChecked ? 'var(--primary-light)' : '#FFFFFF',
                          color: isChecked ? 'var(--primary)' : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: isChecked ? 700 : 500,
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {type}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-md)' }}
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={validateStep3}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '11px', borderRadius: 'var(--radius-md)' }}
                >
                  Next: Account Security &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Password & Agent Agreement */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color="var(--primary)" /> 4. Account Security &amp; Code of Conduct
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
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
                <label htmlFor="confirmPassword">Confirm password *</label>
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

              {/* Agent Code of Conduct Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px', backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Agent Verification Agreement:</span>
                {agreementPoints.map((pt, idx) => (
                  <label
                    key={idx}
                    onClick={() => toggleAgreement(idx)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', lineHeight: 1.35 }}
                  >
                    <input
                      type="checkbox"
                      checked={agreements[idx]}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--primary)', flexShrink: 0, marginTop: '2px' }}
                    />
                    <span>{pt}</span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '11px', borderRadius: 'var(--radius-md)' }}
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn btn-primary ${styles.submitBtn}`}
                  style={{ flex: 2, padding: '11px', marginTop: 0 }}
                >
                  {loading ? (
                    <>
                      <Loader size={16} className={styles.spin} /> Registering...
                    </>
                  ) : (
                    <>
                      <Building2 size={16} /> Submit Agent Verification
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
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
