'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  UserPlus, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  FileText, 
  ShieldCheck, 
  CheckSquare, 
  AlertCircle, 
  Loader,
  BadgeDollarSign,
  QrCode,
  Download,
  Copy
} from 'lucide-react';
import { graphqlRequest, CREATE_LANDLORD_REGISTRATION } from '../../lib/graphql';
import { formatGhanaPhone, isValidGhanaPhone } from '../../lib/types';
import styles from './landlord-registration.module.css';

interface PhotoItem {
  file: File;
  previewUrl: string;
}

export default function LandlordRegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // --- Form States ---
  // Personal Details
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');

  // Property Details
  const [propAddress, setPropAddress] = useState('');
  const [propCity, setPropCity] = useState('');
  const [propLandmark, setPropLandmark] = useState('');
  const [propRegion, setPropRegion] = useState('');
  const [propGps, setPropGps] = useState('');
  const [rent, setRent] = useState('');
  const [advance, setAdvance] = useState('');
  const [rooms, setRooms] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [propType, setPropType] = useState('Single Room Self Contain');
  const [plan, setPlan] = useState('Basic');

  // Amenities
  const [amenities, setAmenities] = useState<string[]>([]);

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isResizing, setIsResizing] = useState(false);

  // Agreement Checklist
  const [agreements, setAgreements] = useState<boolean[]>([
    false, false, false, false, false, false, false, false
  ]);
  const [socialMediaBoost, setSocialMediaBoost] = useState(false);

  // Submission Status
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Constant lists
  const regionOptions = [
    'Volta', 'Greater Accra', 'Ashanti', 'Northern', 'Eastern', 
    'Western', 'Central', 'Bono', 'Upper East', 'Upper West', 
    'Oti', 'Savannah', 'North East', 'Ahafo', 'Bono East', 'Western North'
  ];

  const propertyTypes = [
    'Single Room', 'Single Room Self Contain', 'Chamber & Hall', 
    'Chamber & Hall Self Contain', '2-Bedroom Apartment', 
    '3-Bedroom Apartment or more', '4 Bedroom Self Contain', 'Shop'
  ];

  const amenityOptions = [
    'ECG Prepaid', 'ECG Post-paid', 'ECG Shared Meter', 'ECG Separate Meter',
    'Ghana Water (Shared)', 'Ghana Water (Separate)', 'Bathroom (Shared)',
    'Kitchen (Private)', 'Kitchen (Shared)', 'Polytank', 'Fenced/Gated',
    'Furnished', 'Borehole', 'Well', 'Balcony/Veranda', 'Internet/Wi-Fi',
    'CCTV Camera', 'Newly Built', 'Bed', 'Study Desk'
  ];

  const agreementPoints = [
    'I confirm that all information provided is true and accurate to the best of my knowledge.',
    'I am the rightful owner or authorised representative of the property listed above.',
    'I have read and understood all the rules and obligations set out in this agreement.',
    'I agree to the agent-free commitment — I will not involve any third-party agents in transactions made through Ho Rentals.',
    'I consent to Ho Rentals conducting a physical verification visit of my property before it goes live.',
    'I agree to the fee structure above and understand that a 5% success fee applies on confirmed tenancies.',
    'I agree to hand over the commission on the rent amount to Ho Rentals after payment is made.',
    'I enter into this agreement voluntarily, without any pressure or misrepresentation.'
  ];

  // --- Helper Functions ---
  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const toggleAgreement = (index: number) => {
    setAgreements(prev => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  // Image canvas resizing helper
  const resizeImageFile = (file: File, maxDim = 1000, quality = 0.72): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
          } else if (h >= w && h > maxDim) {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(resizedFile);
              } else {
                reject(new Error('Blob generation failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files) return;
    setIsResizing(true);
    setError(null);
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const resizedList: PhotoItem[] = [];

    for (const f of arr) {
      try {
        const resized = await resizeImageFile(f);
        resizedList.push({
          file: resized,
          previewUrl: URL.createObjectURL(resized)
        });
      } catch (err) {
        console.error('Image resize error:', err);
        setError('Could not process one of the selected photos.');
      }
    }
    setPhotos(prev => [...prev, ...resizedList]);
    setIsResizing(false);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // --- Step Navigation & Validation ---
  const validateStep1 = () => {
    setError(null);
    if (!fullName.trim()) return setError("Please enter the landlord's full name.");
    if (!phone1.trim()) return setError("Please enter a primary phone number.");
    
    const formattedPhone = formatGhanaPhone(phone1);
    if (!isValidGhanaPhone(formattedPhone)) {
      return setError("Please enter a valid 10-digit primary phone number.");
    }
    if (phone2.trim()) {
      const formattedPhone2 = formatGhanaPhone(phone2);
      if (!isValidGhanaPhone(formattedPhone2)) {
        return setError("Please enter a valid 10-digit secondary phone number.");
      }
    }

    if (!city.trim()) return setError("Please enter the landlord's city / town.");
    if (!propAddress.trim()) return setError("Please enter the property address.");
    if (!rent.trim() || isNaN(parseFloat(rent)) || parseFloat(rent) <= 0) {
      return setError("Please enter a valid monthly rent amount.");
    }
    if (photos.length === 0) return setError("Please add at least one property photo.");
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep2 = () => {
    setError(null);
    const allAgreed = agreements.every(a => a);
    if (!allAgreed) {
      return setError(`The landlord must agree to all ${agreements.length} points to proceed.`);
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Final Submit ---
  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      // 1. Upload resized images to backend Cloudinary proxy
      const formData = new FormData();
      photos.forEach(p => {
        formData.append('images', p.file);
      });

      const uploadRes = await fetch('/api/upload-multiple', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload failed: ${errText || uploadRes.statusText}`);
      }

      const uploadBody = await uploadRes.json();
      const urls: string[] = uploadBody.imageUrls || uploadBody.images || [];
      if (urls.length === 0) {
        throw new Error('Image server did not return any photo URLs.');
      }

      // 2. Submit GraphQL Landlord Registration Mutation
      const input = {
        name: fullName,
        dob: dob || undefined,
        gender: gender || undefined,
        nationalId: nationalId || undefined,
        homeAddress: homeAddress || undefined,
        city,
        region: region || undefined,
        phone1: formatGhanaPhone(phone1),
        phone2: phone2 ? formatGhanaPhone(phone2) : undefined,
        email: email || undefined,
        occupation: occupation || undefined,
        propAddress,
        propCity: propCity || undefined,
        propLandmark: propLandmark || undefined,
        propRegion: propRegion || undefined,
        propGps: propGps || undefined,
        rent: parseFloat(rent),
        advance: advance || undefined,
        rooms: rooms ? parseInt(rooms, 10) : undefined,
        availableFrom: availableFrom || undefined,
        propType,
        amenities,
        plan,
        photos: urls,
        socialMediaBoost,
      };

      await graphqlRequest(CREATE_LANDLORD_REGISTRATION, { input });
      setSuccess(true);
      setFullName('');
      setDob('');
      setGender('');
      setNationalId('');
      setHomeAddress('');
      setCity('');
      setRegion('');
      setPhone1('');
      setPhone2('');
      setEmail('');
      setOccupation('');
      setPropAddress('');
      setPropCity('');
      setPropLandmark('');
      setPropRegion('');
      setPropGps('');
      setRent('');
      setAdvance('');
      setRooms('');
      setAvailableFrom('');
      setAmenities([]);
      setPhotos([]);
      setSocialMediaBoost(false);
      setAgreements(new Array(agreementPoints.length).fill(false));
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.topBar}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={20} /> Ho Rentals — Landlord Registration
        </h1>
        <span className={styles.regionBadge}>Ho, Volta Region</span>
      </div>
      <div className={styles.supportLine}>
        Ho Rentals • Ho, Volta Region, Ghana • Tel: 0557922593
      </div>

      {/* Steps indicators */}
      <div className={styles.steps}>
        <div className={styles.step}>
          <div className={`${styles.stepNum} ${currentStep === 1 ? styles.stepActive : ''} ${currentStep > 1 ? styles.stepDone : ''}`}>
            {currentStep > 1 ? <Check size={14} /> : '1'}
          </div>
          <div className={`${styles.stepLabel} ${currentStep === 1 ? styles.labelActive : ''}`}>Details</div>
        </div>
        <div className={`${styles.stepLine} ${currentStep > 1 ? styles.lineDone : ''}`}></div>
        <div className={styles.step}>
          <div className={`${styles.stepNum} ${currentStep === 2 ? styles.stepActive : ''} ${currentStep > 2 ? styles.stepDone : ''}`}>
            {currentStep > 2 ? <Check size={14} /> : '2'}
          </div>
          <div className={`${styles.stepLabel} ${currentStep === 2 ? styles.labelActive : ''}`}>Agreement</div>
        </div>
        <div className={`${styles.stepLine} ${currentStep > 2 ? styles.lineDone : ''}`}></div>
        <div className={styles.step}>
          <div className={`${styles.stepNum} ${currentStep === 3 ? styles.stepActive : ''}`}>3</div>
          <div className={`${styles.stepLabel} ${currentStep === 3 ? styles.labelActive : ''}`}>Confirm</div>
        </div>
      </div>

      {success && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <div className={styles.successBanner} style={{ marginBottom: 0 }}>
            <Check size={20} />
            <span>Landlord registered and property details submitted successfully! We will contact you soon for verification.</span>
          </div>
          
          <div style={{
            padding: '24px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={24} />
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                Help Other Landlords in Ho!
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0', maxWidth: '400px', lineHeight: '1.5' }}>
                Recommend HO Rentals to other landlords. Let them scan this QR code or share the link to list their properties directly.
              </p>
            </div>

            <div style={{
              position: 'relative',
              backgroundColor: '#ffffff',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/landlord-registration` : 'https://horentals.com/landlord-registration')}&color=c1121f&ecc=H`}
                alt="Landlord Registration QR Code"
                width={160}
                height={160}
                style={{ display: 'block' }}
              />

              {/* Branded Logo Overlay */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '32px',
                height: '32px',
                backgroundColor: '#FFFFFF',
                border: '2px solid #FFFFFF',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/logo.png" 
                  alt="Ho Rentals Logo" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px' }}>
              <button
                onClick={async () => {
                  try {
                    const link = window.location.origin + '/landlord-registration';
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}&color=c1121f&ecc=H`;
                    
                    const qrImage = new Image();
                    qrImage.crossOrigin = 'anonymous';
                    qrImage.src = qrUrl;
                    
                    await new Promise((resolve, reject) => {
                      qrImage.onload = resolve;
                      qrImage.onerror = reject;
                    });

                    const logoImage = new Image();
                    logoImage.src = '/logo.png';
                    await new Promise((resolve, reject) => {
                      logoImage.onload = resolve;
                      logoImage.onerror = reject;
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = 300;
                    canvas.height = 300;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('Could not get canvas context');

                    ctx.drawImage(qrImage, 0, 0, 300, 300);

                    const logoSize = 60;
                    const logoX = (300 - logoSize) / 2;
                    const logoY = (300 - logoSize) / 2;
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    if (typeof ctx.roundRect === 'function') {
                      ctx.roundRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 8);
                    } else {
                      ctx.rect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
                    }
                    ctx.fill();

                    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

                    const dataUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'ho-rentals-landlord-registration-qr.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  } catch (e) {
                    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/landlord-registration')}&color=c1121f&ecc=H`, '_blank');
                  }
                }}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={14} /> Download QR
              </button>
              
              <button
                onClick={() => {
                  const link = window.location.origin + '/landlord-registration';
                  navigator.clipboard.writeText(link);
                  alert('Copied link: ' + link);
                }}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
              >
                <Copy size={14} /> Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* --- STEP 1: DETAILS --- */}
      {currentStep === 1 && (
        <div>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Personal details</div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Full name *</label>
                <input type="text" placeholder="e.g. Kwame Asante" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Date of birth</label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Ghana Card / National ID</label>
                <input type="text" placeholder="GHA-XXXXXXXXX-X" value={nationalId} onChange={e => setNationalId(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldGridFull}>
              <div className={styles.field}>
                <label>Home address</label>
                <input type="text" placeholder="Street, area name" value={homeAddress} onChange={e => setHomeAddress(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>City / Town *</label>
                <input type="text" placeholder="e.g. Ho" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)}>
                  <option value="">Select</option>
                  {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Phone (Primary) *</label>
                <input type="tel" placeholder="024 123 4567" value={phone1} onChange={e => setPhone1(formatGhanaPhone(e.target.value))} maxLength={10} />
              </div>
              <div className={styles.field}>
                <label>Phone (Secondary)</label>
                <input type="tel" placeholder="055 123 4567" value={phone2} onChange={e => setPhone2(formatGhanaPhone(e.target.value))} maxLength={10} />
              </div>
              <div className={styles.field}>
                <label>Email address</label>
                <input type="email" placeholder="name@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Occupation</label>
                <input type="text" placeholder="e.g. Teacher" value={occupation} onChange={e => setOccupation(e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Property details</div>
            <div className={styles.fieldGridFull}>
              <div className={styles.field}>
                <label>Property address *</label>
                <input type="text" placeholder="Full address of the property location" value={propAddress} onChange={e => setPropAddress(e.target.value)} />
              </div>
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>City / Town</label>
                <input type="text" placeholder="e.g. Ho" value={propCity} onChange={e => setPropCity(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Landmark / Directions</label>
                <input type="text" placeholder="e.g. Behind HTU Campus" value={propLandmark} onChange={e => setPropLandmark(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Region</label>
                <select value={propRegion} onChange={e => setPropRegion(e.target.value)}>
                  <option value="">Select</option>
                  {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>GPS / Digital Address</label>
                <input type="text" placeholder="VH-0012-3456" value={propGps} onChange={e => setPropGps(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Monthly rent (GHS) *</label>
                <input type="number" placeholder="800" min="0" value={rent} onChange={e => setRent(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Advance payment required</label>
                <input type="text" placeholder="e.g. 6 months" value={advance} onChange={e => setAdvance(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Rooms available</label>
                <input type="number" placeholder="1" min="1" value={rooms} onChange={e => setRooms(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Available from</label>
                <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Property type</div>
            <div className={styles.radioRow}>
              {propertyTypes.map(t => (
                <label key={t} className={`${styles.radio} ${propType === t ? styles.selectedRadio : ''}`}>
                  <input type="radio" name="ptype" value={t} checked={propType === t} onChange={() => setPropType(t)} style={{ display: 'none' }} />
                  <span>{t}</span>
                </label>
              ))}
            </div>

            <div className={styles.sectionTitle}>Amenities</div>
            <div className={styles.checkboxGrid}>
              {amenityOptions.map(opt => {
                const checked = amenities.includes(opt);
                return (
                  <label key={opt} className={`${styles.chk} ${checked ? styles.checkedChk : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleAmenity(opt)} style={{ display: 'none' }} />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>

            <div className={styles.sectionTitle}>Subscription plan</div>
            <div className={styles.planRow}>
              <label className={`${styles.planCard} ${plan === 'Basic' ? styles.planSelected : ''}`}>
                <input type="radio" name="plan" value="Basic" checked={plan === 'Basic'} onChange={() => setPlan('Basic')} style={{ display: 'none' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Basic Plan</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '2px' }}>GHS 50 (per property)</div>
                </div>
              </label>
              <label className={`${styles.planCard} ${plan === 'Premium' ? styles.planSelected : ''}`}>
                <input type="radio" name="plan" value="Premium" checked={plan === 'Premium'} onChange={() => setPlan('Premium')} style={{ display: 'none' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Premium Plan</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.8, marginTop: '2px' }}>GHS 100 (per property)</div>
                </div>
              </label>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Property photos</div>
            <label className={styles.photoDrop} htmlFor="photos-input">
              <Camera size={28} style={{ color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                {isResizing ? 'Processing selected images...' : 'Tap / click to add photos'}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                You can select multiple images (JPG, PNG). Images are optimized locally before upload.
              </span>
              <input 
                id="photos-input" 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={e => handlePhotoFiles(e.target.files)} 
                disabled={isResizing}
                style={{ display: 'none' }} 
              />
            </label>

            {photos.length > 0 && (
              <div className={styles.photoGrid}>
                {photos.map((ph, idx) => (
                  <div key={idx} className={styles.photoThumb}>
                    <img src={ph.previewUrl} alt={`preview-${idx}`} />
                    <button type="button" className={styles.photoRmBtn} onClick={() => removePhoto(idx)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.photoCount}>
              {photos.length > 0 ? `${photos.length} photo(s) selected` : ''}
            </div>
          </div>

          <div className={styles.btnRow}>
            <button className="btn btn-primary" onClick={validateStep1} style={{ width: '100%', padding: '14px', fontWeight: 'bold' }}>
              Next — Read Agreement <ArrowRight size={16} style={{ marginLeft: '6px', display: 'inline' }} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: AGREEMENT --- */}
      {currentStep === 2 && (
        <div>
          <div className={styles.agreementBox}>
            <div className={styles.agreementHeader}>
              <h2>Ho Rentals — Landlord Platform Agreement</h2>
              <p>Please read all sections carefully before proceeding</p>
            </div>

            <div className={styles.ruleSection}>
              <h3>1. Accuracy of Information</h3>
              <ul className={styles.ruleList}>
                <li>All information provided in this form — including property details, photos, rent price, and amenities — must be true, accurate, and up to date.</li>
                <li>You agree to notify Ho Rentals immediately of any changes to your property details, availability, or rental price.</li>
                <li>Ho Rentals will conduct a physical verification visit to your property before it is listed. You agree to grant our team reasonable access to carry out this visit.</li>
              </ul>
            </div>

            <div className={styles.ruleSection}>
              <h3>2. Transparency & Fair Dealing</h3>
              <ul className={styles.ruleList}>
                <li>You agree to deal honestly and fairly with all prospective tenants who contact you through Ho Rentals.</li>
                <li>You must not collect any fee, deposit, or advance payment from a tenant before showing them the physical property in person.</li>
                <li>You must receive the Ho Rentals commission on the rent amount from the tenant and hand it over to Ho Rentals once the property has been rented out successfully.</li>
              </ul>
            </div>

            <div className={styles.ruleSection}>
              <h3>3. Agent-Free Commitment</h3>
              <ul className={styles.ruleList}>
                <li>Ho Rentals is a direct platform. You agree not to refer tenants to a third-party agent or charge agent fees to tenants who found you through Ho Rentals.</li>
                <li>All rental transactions arranged through Ho Rentals must be conducted directly between you (the landlord) and the tenant.</li>
              </ul>
            </div>

            <div className={styles.ruleSection}>
              <h3>4. Property Maintenance & Standards</h3>
              <ul className={styles.ruleList}>
                <li>You agree to maintain your property in a clean, safe, and habitable condition at the time of the tenant's viewing and occupancy.</li>
              </ul>
            </div>

            <div className={styles.ruleSection}>
              <h3>5. Platform Conduct</h3>
              <ul className={styles.ruleList}>
                <li>Ho Rentals may suspend or permanently remove your listing if you are found to have violated any of these rules.</li>
                <li>Ho Rentals is not liable for disputes that arise directly between a landlord and tenant.</li>
              </ul>
            </div>

            <div className={styles.ruleSection}>
              <h3>6. Fees & Subscription</h3>
              <table className={styles.feeTable}>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Fee</th>
                    <th>Includes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Basic Plan</b></td>
                    <td>GHS 50 (one-time, per property)</td>
                    <td>Standard listing, photos, tenant connections</td>
                  </tr>
                  <tr>
                    <td><b>Premium Plan</b></td>
                    <td>GHS 100 (one-time, per property)</td>
                    <td>Featured placement, priority support</td>
                  </tr>
                  <tr>
                    <td><b>Success Fee</b></td>
                    <td>5% of first month's rent</td>
                    <td>Charged when a tenancy is confirmed</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Checklist */}
            <div className={styles.agreeChecks}>
              <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>Please confirm each point below:</p>
              {agreementPoints.map((pt, idx) => (
                <label key={idx} className={`${styles.agreeItem} ${agreements[idx] ? styles.checkedAgree : ''}`}>
                  <input type="checkbox" checked={agreements[idx]} onChange={() => toggleAgreement(idx)} />
                  <span>{pt}</span>
                </label>
              ))}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1.5px dashed var(--primary)' }}>
                <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', fontSize: '0.85rem' }}>Optional Social Media Boosting:</p>
                <label className={`${styles.agreeItem} ${socialMediaBoost ? styles.checkedAgree : ''}`} style={{ borderBottom: 'none', padding: '4px 0' }}>
                  <input type="checkbox" checked={socialMediaBoost} onChange={(e) => setSocialMediaBoost(e.target.checked)} />
                  <span style={{ fontSize: '0.85rem' }}>
                    I agree to pay <b style={{ color: 'var(--primary)' }}>GHS 30</b> to boost my property listing on Ho Rentals social media pages (Optional).
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.btnRow}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={validateStep2} style={{ flex: 1 }}>
              Proceed to Confirm <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3: CONFIRM --- */}
      {currentStep === 3 && (
        <div>
          <div className={styles.card}>
            <div className={styles.sectionTitle}>Review & confirm</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Please review your registration details below before saving.
            </p>

            <div className={styles.reviewList}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Full Name</span>
                <span className={styles.reviewValue}>{fullName}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Phone Contact</span>
                <span className={styles.reviewValue}>{phone1}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Town / City</span>
                <span className={styles.reviewValue}>{city}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Property Address</span>
                <span className={styles.reviewValue}>{propAddress}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Monthly Rent</span>
                <span className={styles.reviewValue}>GHS {parseFloat(rent).toLocaleString()} / month</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Property Type</span>
                <span className={styles.reviewValue}>{propType}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Subscription Plan</span>
                <span className={styles.reviewValue}>{plan} Plan</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Social Media Boost</span>
                <span className={styles.reviewValue}>{socialMediaBoost ? 'Yes (GHS 30)' : 'No'}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewKey}>Amenities</span>
                <span className={styles.reviewValue}>{amenities.join(', ') || 'None selected'}</span>
              </div>
              <div className={styles.reviewRow} style={{ borderBottom: 'none' }}>
                <span className={styles.reviewKey}>Photos Selected</span>
                <span className={styles.reviewValue}>{photos.length} image(s)</span>
              </div>
            </div>
          </div>

          <div className={styles.card} style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
              <FileText size={16} /> Landlord Agreement Confirmed
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              By saving your details, you agree that you have read all Sections 1–5, and digitally signed the declaration.
            </p>
          </div>

          <div className={styles.btnRow}>
            <button className="btn btn-outline" onClick={() => setCurrentStep(2)} disabled={submitting}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting} style={{ flex: 1 }}>
              {submitting ? (
                <>
                  <Loader className="animate-spin" size={16} /> Saving to Database...
                </>
              ) : (
                <>
                  Save to Database
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
