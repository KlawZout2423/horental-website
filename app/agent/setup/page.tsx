'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { graphqlRequest, UPDATE_AGENT_PROFILE, SUBMIT_VERIFICATION_REQUEST } from '../../../lib/graphql';
import { formatGhanaPhone, formatGhanaCard, isValidGhanaCard } from '../../../lib/types';
import { 
  ShieldCheck, 
  User, 
  MapPin, 
  Phone, 
  Camera, 
  Loader, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Building2, 
  Briefcase, 
  FileText, 
  Zap, 
  Check, 
  Star,
  Award,
  FileCheck
} from 'lucide-react';

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Free Starter Plan',
    price: 'GH₵ 0',
    period: 'forever',
    popular: false,
    isDefaultLocked: true,
    badge: '✓ ALWAYS INCLUDED (DEFAULT)',
    description: 'Active for all verified agents by default. Your first 2 property listings are 100% free forever.',
    features: [
      'First 2 property listings 100% Free',
      'Verified Agent Badge & Directory Profile',
      'Direct WhatsApp & Phone Contact',
      'Standard Search Visibility in Ho',
      'Basic Listing Performance Stats'
    ]
  },
  {
    id: 'pay_per_property',
    name: 'Pay-Per-Property (3+ Listings)',
    price: 'GH₵ 10',
    period: '/ extra listing',
    popular: true,
    isDefaultLocked: false,
    badge: '⭐ EXPANSION TIER (3+ PROPERTIES)',
    description: 'Opt-in plan for agents who want to list 3 or more properties with priority search placement.',
    features: [
      'Applies only when listing 3 or more properties',
      'GH₵ 10.00 per additional property beyond 2 free',
      'Priority Search Placement in Ho',
      'Verified Agent Badge & Trust Seal',
      'Unlock Direct Tenant Inquiry Leads',
      'Dedicated Agent Support'
    ]
  }
];

export default function AgentSetupPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Form States - Profile & Agency
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [experience, setExperience] = useState('1-2 Years');
  const [location, setLocation] = useState('Ho, Volta Region');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form States - Contact & Verification
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [idType, setIdType] = useState('Ghana Card');
  const [idNumber, setIdNumber] = useState('');
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [idDocPreview, setIdDocPreview] = useState<string | null>(null);
  const [digitalAddress, setDigitalAddress] = useState('');
  const [bio, setBio] = useState('');

  // Subscription Selection (Free Starter is permanently active for all agents; optional expansion tier can be selected)
  const [selectedPlan, setSelectedPlan] = useState('starter');

  // Terms Checkboxes
  const [agreements, setAgreements] = useState<boolean[]>([false, false, false, false]);

  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill existing user details on mount
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/agent/setup');
        return;
      }
      setName(user.name || '');
      setPhone(user.phone || '');
      setWhatsapp(user.agentWhatsapp || user.phone || '');
      setBio(user.bio || '');
      setLocation(user.agentLocation || 'Ho, Volta Region');
      setAgencyName(user.agencyName || '');
      setExperience(user.experienceYears || '1-2 Years');
      setPhotoPreview(user.profileImage || null);

      if (user.subscriptionPlan) {
        setSelectedPlan(user.subscriptionPlan);
      }

      if (user.isProfileComplete || (user.bio && user.profileImage && user.agentWhatsapp)) {
        setIsEditingExisting(true);
      }
    }
  }, [user, authLoading, router]);

  // Clean up Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      if (idDocPreview && idDocPreview.startsWith('blob:')) {
        URL.revokeObjectURL(idDocPreview);
      }
    };
  }, [photoPreview, idDocPreview]);

  const toggleAgreement = (index: number) => {
    setAgreements(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Profile image file must be less than 10MB.');
      return;
    }
    setPhotoFile(file);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleIdDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('ID Document file must be less than 10MB.');
      return;
    }
    setIdDocFile(file);
    if (idDocPreview && idDocPreview.startsWith('blob:')) {
      URL.revokeObjectURL(idDocPreview);
    }
    setIdDocPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!photoPreview && !photoFile && !user?.profileImage) {
      setError('Please upload a profile photo for your agent profile.');
      setStep(1);
      return;
    }
    if (!name.trim()) {
      setError('Please enter your full display name.');
      setStep(1);
      return;
    }
    if (!location.trim()) {
      setError('Please enter your service area (e.g. Ho, Volta Region).');
      setStep(1);
      return;
    }
    if (!whatsapp.trim()) {
      setError('Please enter your active WhatsApp contact number.');
      setStep(2);
      return;
    }
    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setError('Please enter a valid phone/WhatsApp number (at least 9 digits).');
      setStep(2);
      return;
    }
    if (!bio.trim() || bio.trim().length < 20) {
      setError('Please write a bio of at least 20 characters describing your agent services.');
      setStep(2);
      return;
    }
    let formattedIdNumber = idNumber.trim();
    if (formattedIdNumber) {
      if (idType === 'Ghana Card' || formattedIdNumber.toUpperCase().startsWith('GHA')) {
        formattedIdNumber = formatGhanaCard(formattedIdNumber);
        if (!isValidGhanaCard(formattedIdNumber)) {
          setError('Please enter a valid 15-character Ghana Card ID in format GHA-XXXXXXXXX-X.');
          setStep(2);
          return;
        }
      }
    }

    if (!isEditingExisting && !agreements.every(Boolean)) {
      setError('Please agree to all agent terms and conditions to activate your profile.');
      setStep(4);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      let photoUrl = user?.profileImage || '';
      let idDocUrl = '';

      if (photoFile) {
        const formData = new FormData();
        formData.append('image', photoFile);
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload profile photo. Please try again.');
        const data = await res.json();
        photoUrl = data.imageUrl || data.url || photoUrl;
      }

      if (idDocFile) {
        const docFormData = new FormData();
        docFormData.append('image', idDocFile);
        const docRes = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: docFormData,
        });
        if (docRes.ok) {
          const docData = await docRes.json();
          idDocUrl = docData.imageUrl || docData.url || '';
        }
      }

      const result = await graphqlRequest<{ updateAgentProfile: any }>(UPDATE_AGENT_PROFILE, {
        bio: bio.trim(),
        profileImage: photoUrl || null,
        agentLocation: location.trim() || null,
        agentWhatsapp: whatsapp.trim() ? formatGhanaPhone(whatsapp.trim()) : null,
        agencyName: agencyName.trim() || null,
        experienceYears: experience || '1-2 Years',
        licenseNumber: formattedIdNumber || null,
        subscriptionPlan: selectedPlan,
        isProfileComplete: true,
      });

      if (idDocUrl || formattedIdNumber) {
        try {
          await graphqlRequest(SUBMIT_VERIFICATION_REQUEST, {
            idType: idType || 'Ghana Card',
            idNumber: formattedIdNumber || 'N/A',
            documentUrls: idDocUrl ? [idDocUrl] : [],
          });
        } catch (verr) {
          console.warn('Verification document submission warning:', verr);
        }
      }

      if (result?.updateAgentProfile) {
        updateUser({ 
          ...user!, 
          ...result.updateAgentProfile,
          verificationStatus: idDocUrl ? 'pending' : (user?.verificationStatus || 'unverified')
        });
        setStep(5); // Done step
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column', gap: '16px' }}>
        <Loader size={36} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem 3rem', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>

        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            <Award size={14} /> Official Agent Registration
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
            Complete Your Agent Setup
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
            Set up your professional profile, choose your subscription plan, and start receiving verified tenant leads.
          </p>
        </div>

        {/* Multi-Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2.5rem', justifyContent: 'center' }}>
          {[
            { num: 1, label: 'Profile' },
            { num: 2, label: 'Contact' },
            { num: 3, label: 'Subscription' },
            { num: 4, label: 'Agreement' },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: step >= s.num ? 'var(--primary)' : 'var(--bg-surface-secondary)',
                color: step >= s.num ? '#fff' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.88rem',
                border: step >= s.num ? '2px solid var(--primary)' : '2px solid var(--border)',
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}>
                {step > s.num ? <CheckCircle2 size={18} /> : s.num}
              </div>
              {i < 3 && (
                <div style={{ flex: 1, height: '2px', backgroundColor: step > s.num ? 'var(--primary)' : 'var(--border)', transition: 'background 0.3s ease' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Existing Complete Profile Notice */}
        {isEditingExisting && step === 1 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '1.75rem', textAlign: 'center', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px' }}>Your Agent Profile is Already Active!</h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              You have already set up your agent details. You can update your bio, photo, location, or subscription below anytime.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} className="btn btn-outline" style={{ flex: 1, fontSize: '0.85rem' }}>
                ✏️ Edit Profile Info
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '12px 16px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1: Personal & Agency Profile ── */}
        {step === 1 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: 'clamp(1.2rem, 3vw, 2rem)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Step 1: Agency & Profile Details
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              This information will be displayed on your verified agent profile page.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Photo */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px' }}>
                  <Camera size={13} style={{ display: 'inline', marginRight: '4px' }} /> Profile Photo *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'var(--bg-surface-secondary)', flexShrink: 0 }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  <div>
                    <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.85rem', fontWeight: 600, display: 'inline-block' }}>
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>PNG, JPG or WEBP under 10MB</div>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Full Name / Display Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Eugene Mensah"
                  style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Agency Name */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Agency / Business Name
                </label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={e => setAgencyName(e.target.value)}
                  placeholder="e.g. Ho City Realtors Ltd (leave blank if independent)"
                  style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              {/* Experience & Location Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Briefcase size={13} style={{ display: 'inline', marginRight: '4px' }} /> Experience
                  </label>
                  <select
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="Under 1 Year">Under 1 Year</option>
                    <option value="1-2 Years">1-2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Service Area *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Ho, Volta Region"
                    style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!photoPreview && !photoFile && !user?.profileImage) {
                    setError('Please upload a profile photo for your agent profile.');
                    return;
                  }
                  if (!name.trim()) {
                    setError('Please enter your full / display name.');
                    return;
                  }
                  if (!location.trim()) {
                    setError('Please enter your primary service area (e.g. Ho, Volta Region).');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem' }}
              >
                Continue to Step 2 <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Contact, Verification & Bio ── */}
        {step === 2 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: 'clamp(1.2rem, 3vw, 2rem)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Step 2: Contact & Identification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Add your contact channels and write a compelling bio for tenants.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* WhatsApp & Phone Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    <Phone size={13} style={{ display: 'inline', marginRight: '4px' }} /> WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="e.g. 0241234567"
                    style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                    <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px' }} /> Ghana Card / ID Number
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    maxLength={idType === 'Ghana Card' ? 15 : 30}
                    onChange={e => {
                      const raw = e.target.value;
                      setIdNumber(idType === 'Ghana Card' ? formatGhanaCard(raw) : raw.toUpperCase());
                    }}
                    placeholder={idType === 'Ghana Card' ? 'GHA-123456789-1' : 'e.g. ID Number'}
                    style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              </div>

              {/* ID Document Upload Box */}
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px dashed var(--border)', borderRadius: '0.75rem', padding: '1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Identity Document (For Verified Badge)</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  Upload a clear photo/scan of your Ghana Card, Passport, or License for admin verification.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.85rem', alignItems: 'center' }}>
                  <div>
                    <select
                      value={idType}
                      onChange={e => setIdType(e.target.value)}
                      style={{ width: '100%', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.6rem', fontSize: '0.84rem', outline: 'none', fontWeight: 600 }}
                    >
                      <option value="Ghana Card">Ghana Card</option>
                      <option value="Driver's License">Driver's License</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {idDocPreview ? (
                      <div style={{ width: 56, height: 40, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={idDocPreview} alt="ID Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: 56, height: 40, borderRadius: '6px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-surface)' }}>
                        <FileCheck size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <label style={{ cursor: 'pointer', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.5rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block' }}>
                      {idDocPreview ? 'Change Document' : 'Upload Document'}
                      <input type="file" accept="image/*,.pdf" onChange={handleIdDocChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>
                  <FileText size={13} style={{ display: 'inline', marginRight: '4px' }} /> Bio / Agent Overview *
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={4}
                  placeholder="e.g. I am a licensed property agent operating in Ho and surrounding campus areas. I specialize in hostel rentals, self-contained rooms, and short stays…"
                  style={{ width: '100%', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setStep(1)} className="btn btn-outline" style={{ flex: 1, fontSize: '0.9rem' }}>
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!whatsapp.trim()) {
                      setError('Please enter your WhatsApp contact number.');
                      return;
                    }
                    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
                    if (cleanPhone.length < 9) {
                      setError('Please enter a valid phone/WhatsApp number (at least 9 digits).');
                      return;
                    }
                    if (!bio.trim() || bio.trim().length < 20) {
                      setError('Please write a bio of at least 20 characters so tenants understand your agent experience.');
                      return;
                    }
                    setError(null);
                    setStep(3);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}
                >
                  Continue to Subscription <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Choose Agent Subscription Plan ── */}
        {step === 3 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: 'clamp(1.2rem, 3vw, 2rem)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Step 3: Select Your Agent Subscription Plan
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Choose a subscription tier to maximize your property listing visibility and tenant leads.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isLocked = plan.isDefaultLocked;
                const isSelected = isLocked || selectedPlan === plan.id;
                
                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!isLocked) {
                        setSelectedPlan(selectedPlan === plan.id ? 'starter' : plan.id);
                      }
                    }}
                    style={{
                      backgroundColor: isLocked ? 'rgba(16, 185, 129, 0.06)' : (isSelected ? 'var(--primary-light)' : 'var(--bg-surface-secondary)'),
                      border: `2px solid ${isLocked ? '#10B981' : (isSelected ? 'var(--primary)' : 'var(--border)')}`,
                      borderRadius: '0.9rem',
                      padding: '1.25rem',
                      cursor: isLocked ? 'default' : 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <span style={{ 
                      position: 'absolute', 
                      top: '-10px', 
                      right: '16px', 
                      background: isLocked ? '#10B981' : (isSelected ? 'var(--primary)' : 'var(--text-muted)'), 
                      color: '#fff', 
                      fontSize: '0.68rem', 
                      fontWeight: 800, 
                      padding: '2px 10px', 
                      borderRadius: '10px', 
                      textTransform: 'uppercase' 
                    }}>
                      {isLocked ? '✓ PERMANENTLY INCLUDED (DEFAULT)' : (isSelected ? '✓ OPTED IN (SELECTED)' : 'OPTIONAL EXPANSION TIER')}
                    </span>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: 22, 
                          height: 22, 
                          borderRadius: '50%', 
                          border: `2px solid ${isLocked ? '#10B981' : (isSelected ? 'var(--primary)' : 'var(--text-muted)')}`, 
                          backgroundColor: isLocked ? '#10B981' : (isSelected ? 'var(--primary)' : 'transparent'), 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {(isLocked || isSelected) && <Check size={14} color="#fff" />}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{plan.name}</h4>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isLocked ? '#10B981' : 'var(--primary)' }}>
                        {plan.price} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{plan.period}</span>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: isLocked ? '#059669' : 'var(--text-secondary)', margin: '4px 0 10px 32px', fontWeight: isLocked ? 600 : 400 }}>
                      {plan.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', paddingLeft: '32px' }}>
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-outline" style={{ flex: 1, fontSize: '0.9rem' }}>
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="btn btn-primary"
                style={{ flex: 2, padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}
              >
                Proceed to Agreement <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Terms & Code of Conduct Agreement ── */}
        {step === 4 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: 'clamp(1.2rem, 3vw, 2rem)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Step 4: Agent Agreement & Code of Conduct
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Review and accept the HO Rentals Verified Agent Policies to finalize your registration.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem' }}>
              {[
                'I confirm that all agent and agency details provided are accurate and legally valid.',
                'I agree to respond promptly and professionally to all tenant inquiry calls and WhatsApp leads.',
                'I agree to adhere to HO Rentals listing verification policies and zero-fraud standards.',
                'I agree to the HO Rentals listing policy (First 2 property listings for FREE, subsequent listings according to selected subscription tier).'
              ].map((text, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleAgreement(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '0.65rem',
                    backgroundColor: agreements[idx] ? 'var(--primary-light)' : 'var(--bg-surface-secondary)',
                    border: `1px solid ${agreements[idx] ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={agreements[idx]}
                    onChange={() => {}}
                    style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setStep(3)} className="btn btn-outline" style={{ flex: 1, fontSize: '0.9rem' }}>
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 2, padding: '0.85rem', fontSize: '0.95rem', fontWeight: 700 }}
              >
                {saving ? <><Loader size={16} /> Activating Profile…</> : <>Complete & Activate Agent Profile 🎉</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Success & Confirmation ── */}
        {step === 5 && (
          <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '1.25rem', padding: '2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
              🎉
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
              Agent Profile Successfully Activated!
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.92rem' }}>
              Your agent profile and <strong>{SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name}</strong> subscription are now active. Tenants can find your profile and contact you on property listings.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: 700 }}
              >
                Go to My Agent Dashboard →
              </button>
              <button
                onClick={() => user && router.push(`/agents/${user.id}`)}
                className="btn btn-outline"
                style={{ width: '100%', padding: '0.9rem', fontSize: '0.9rem', fontWeight: 600 }}
              >
                View My Public Agent Profile →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
