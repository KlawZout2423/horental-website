'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, CREATE_PROPERTY, UPDATE_AGENT_PROFILE, GET_AGENT_PROPERTIES } from '../../lib/graphql';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader } from 'lucide-react';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput, User } from '../../lib/types';
import VerifiedAgentModal from '../../components/VerifiedAgentModal';
import styles from './upload.module.css';

export default function UploadPage({
  isEmbedded = false,
  onSuccess
}: {
  isEmbedded?: boolean;
  onSuccess?: () => void;
}) {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [pricePeriod, setPricePeriod] = useState('semester');
  const [type, setType] = useState('Student Hostel');
  const [status, setStatus] = useState('available');
  const [contact, setContact] = useState('');
  const [description, setDescription] = useState('');
  const [digitalAddress, setDigitalAddress] = useState('');
  const [landmarks, setLandmarks] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [landlordName, setLandlordName] = useState('');
  const [rooms, setRooms] = useState('');
  const [advance, setAdvance] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  
  // Amenities checkboxes state (all default to false - chosen explicitly by user)
  const [hasWifi, setHasWifi] = useState(false);
  const [hasAc, setHasAc] = useState(false);
  const [hasCctv, setHasCctv] = useState(false);
  const [hasFurnished, setHasFurnished] = useState(false);
  const [hasGatedFenced, setHasGatedFenced] = useState(false);
  const [isNewlyBuilt, setIsNewlyBuilt] = useState(false);
  const [hasBed, setHasBed] = useState(false);
  const [hasStudyDesk, setHasStudyDesk] = useState(false);
  const [hasPrivateKitchen, setHasPrivateKitchen] = useState(false);
  const [hasSharedKitchen, setHasSharedKitchen] = useState(false);
  const [hasPrivateBathroom, setHasPrivateBathroom] = useState(false);
  const [hasSharedBathroom, setHasSharedBathroom] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [ghanaWaterShared, setGhanaWaterShared] = useState(false);
  const [ghanaWaterSeparate, setGhanaWaterSeparate] = useState(false);
  const [polytank, setPolytank] = useState(false);
  const [borehole, setBorehole] = useState(false);
  const [well, setWell] = useState(false);
  const [ecgSharedMeter, setEcgSharedMeter] = useState(false);
  const [ecgSeparateMeter, setEcgSeparateMeter] = useState(false);
  const [ecgPostPaid, setEcgPostPaid] = useState(false);
  const [ecgPrepaid, setEcgPrepaid] = useState(false);

  // Lands Specific States
  const [landPlotSize, setLandPlotSize] = useState('');
  const [landDocType, setLandDocType] = useState('Site Plan');
  const [landZoning, setLandZoning] = useState('Residential');

  // Furnitures Specific States
  const [furnitureCondition, setFurnitureCondition] = useState('Brand New');
  const [furnitureCategory, setFurnitureCategory] = useState('Bed & Mattress');
  const [furnitureDelivery, setFurnitureDelivery] = useState('Buyer Pick-Up');

  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessNotice, setShowSuccessNotice] = useState(false);

  // Quick Locations State (Ghana Cities & Regions)
  const [quickLocations, setQuickLocations] = useState<string[]>([
    'HTU / Ho Poly Area, Ho, Volta Region',
    'Sokode (UHAS Main Campus), Volta Region',
    'Dave (UHAS Dave Campus), Volta Region',
    'Bankoe, Ho, Volta Region',
    'East Legon, Accra, Greater Accra',
    'Madina / Osu / Cantoments, Accra',
    'KNUST Campus Area, Kumasi, Ashanti Region',
    'UCC Campus Area, Cape Coast, Central Region',
    'Takoradi Town / Market Circle, Western Region',
    'Tamale Central, Northern Region',
    'Sunyani City, Bono Region',
    'Koforidua, Eastern Region',
    'Civic Center, Ho, Volta Region',
    'Ahoe, Ho, Volta Region',
    'Hohoe, Volta Region',
    'Kpando, Volta Region',
    'Denu / Aflao, Volta Region',
    'Sogakope, Volta Region',
  ]);
  const [showAddCustomLocation, setShowAddCustomLocation] = useState(false);
  const [customAreaInput, setCustomAreaInput] = useState('');
  const [showVerifyInfoModal, setShowVerifyInfoModal] = useState(false);

  const handleAddCustomQuickLocation = () => {
    if (!customAreaInput.trim()) return;
    let formatted = customAreaInput.trim();
    if (!formatted.toLowerCase().includes('volta region')) {
      formatted = `${formatted}, Volta Region`;
    }
    if (!quickLocations.includes(formatted)) {
      setQuickLocations((prev) => [formatted, ...prev]);
    }
    setLocation(formatted);
    setCustomAreaInput('');
    setShowAddCustomLocation(false);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === 'Lands') {
      setPricePeriod('plot');
    } else if (newType === 'Furnitures') {
      setPricePeriod('outright sale');
    } else {
      if (pricePeriod === 'plot' || pricePeriod === 'acre' || pricePeriod === 'outright sale') {
        setPricePeriod('semester');
      }
    }
  };

  // Check login status and role privileges
  useEffect(() => {
    if (isEmbedded) return;
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/upload');
      } else if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'landlord') {
        router.push('/');
      }
    }
  }, [user, authLoading, router, isEmbedded]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setImageFiles((prev) => [...prev, ...filesArray]);
      
      const previewsArray = filesArray.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...previewsArray]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (imageFiles.length === 0) {
      setError('Please upload at least one image of your property.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload images via REST Multipart request
      const formData = new FormData();
      imageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const uploadRes = await fetch('/api/upload-multiple', {
        method: 'POST',
        credentials: 'same-origin', // HttpOnly cookie sent automatically
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload failed: ${errText || uploadRes.statusText}`);
      }

      const uploadBody = await uploadRes.json();
      const urls: string[] = uploadBody.imageUrls || uploadBody.images || [];

      if (urls.length === 0) {
        throw new Error('No image URLs returned from the file hosting service.');
      }

      const formattedContact = formatGhanaPhone(contact);
      if (!isValidGhanaPhone(formattedContact)) {
        throw new Error('Please enter a valid 10-digit Ghanaian phone number for landlord contact (e.g. 0241234567).');
      }

      // 2. Perform the GraphQL property creation mutation
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        throw new Error('Invalid price value.');
      }

      let finalDescription = sanitizeInput(description);
      const amenitiesList: string[] = [];

      if (type === 'Lands') {
        const landSpecs: string[] = [];
        if (landPlotSize.trim()) landSpecs.push(`Plot Size: ${landPlotSize.trim()}`);
        if (landDocType) landSpecs.push(`Title/Docs: ${landDocType}`);
        if (landZoning) landSpecs.push(`Zoning: ${landZoning}`);
        if (landSpecs.length > 0) {
          amenitiesList.push(`Land Specs: ${landSpecs.join(', ')}`);
        }
      } else if (type === 'Furnitures') {
        const furnSpecs: string[] = [];
        if (furnitureCondition) furnSpecs.push(`Condition: ${furnitureCondition}`);
        if (furnitureCategory) furnSpecs.push(`Category: ${furnitureCategory}`);
        if (furnitureDelivery) furnSpecs.push(`Delivery: ${furnitureDelivery}`);
        if (furnSpecs.length > 0) {
          amenitiesList.push(`Furniture Specs: ${furnSpecs.join(', ')}`);
        }
      } else {
        const otherOptions: string[] = [];
        if (hasWifi) otherOptions.push('WiFi');
        if (hasAc) otherOptions.push('AC');
        if (hasCctv) otherOptions.push('CCTV Camera');
        if (hasFurnished) otherOptions.push('Furnished');
        if (hasGatedFenced) otherOptions.push('Gated & Fenced');
        if (isNewlyBuilt) otherOptions.push('Newly Built');
        if (hasBed) otherOptions.push('Bed');
        if (hasStudyDesk) otherOptions.push('Study Desk');
        if (hasPrivateKitchen) otherOptions.push('Kitchen (Private)');
        if (hasSharedKitchen) otherOptions.push('Kitchen (Shared)');
        if (hasPrivateBathroom) otherOptions.push('Bathroom (Private)');
        if (hasSharedBathroom) otherOptions.push('Bathroom (Shared)');
        if (hasBalcony) otherOptions.push('Balcony / Veranda');
        if (otherOptions.length > 0) {
          amenitiesList.push(`Amenities: ${otherOptions.join(', ')}`);
        }

        // Compile detailed water options
        const waterOptions: string[] = [];
        if (ghanaWaterShared) waterOptions.push('Ghana Water (Shared)');
        if (ghanaWaterSeparate) waterOptions.push('Ghana Water (Separate)');
        if (polytank) waterOptions.push('Polytank');
        if (borehole) waterOptions.push('Borehole');
        if (well) waterOptions.push('Well');
        if (waterOptions.length > 0) {
          amenitiesList.push(`Water: ${waterOptions.join(', ')}`);
        }

        // Compile detailed meter options
        const meterOptions: string[] = [];
        if (ecgSharedMeter) meterOptions.push('ECG Shared Meter');
        if (ecgSeparateMeter) meterOptions.push('ECG Separate Meter');
        if (ecgPostPaid) meterOptions.push('ECG Post-paid');
        if (ecgPrepaid) meterOptions.push('ECG Prepaid');
        if (meterOptions.length > 0) {
          amenitiesList.push(`Electricity: ${meterOptions.join(', ')}`);
        }
      }

      if (amenitiesList.length > 0) {
        finalDescription += `\n\nFeatures: ${amenitiesList.join(' | ')}`;
      }

      // Append extra fields to description
      if (rooms) finalDescription += `\n\nRooms Available: ${rooms}`;
      if (advance) finalDescription += `\nAdvance Required: ${advance}`;
      if (availableFrom) finalDescription += `\nAvailable From: ${availableFrom}`;

      finalDescription += `\n\nPricePeriod: per ${pricePeriod}`;

      const input = {
        title,
        location,
        digitalAddress: digitalAddress.trim() || undefined,
        landmarks: landmarks.trim() || undefined,
        latitude: latitude !== null ? latitude : undefined,
        longitude: longitude !== null ? longitude : undefined,
        price: parsedPrice,
        type,
        status,
        description: finalDescription,
        contact,
        imageUrl: urls[0], // First image is the thumbnail
        gallery: urls.map((url, index) => ({
          url,
          caption: `${title} - Image ${index + 1}`,
          order: index + 1,
        })),
        landlordName: landlordName.trim() || undefined,
      };

      await graphqlRequest(CREATE_PROPERTY, { input });
      
      if (user?.role === 'agent' || user?.role === 'landlord') {
        setShowSuccessNotice(true);
        if (onSuccess) onSuccess();
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/properties');
        }
      }
    } catch (err: any) {
      console.error('Submit property error:', err);
      setError(err.message || 'An error occurred while uploading your property.');
    } finally {
      setSubmitting(false);
    }
  };

  // Agent Profile setup modal states
  const [showAgentSetupModal, setShowAgentSetupModal] = useState(false);
  const [agentBioInput, setAgentBioInput] = useState('');
  const [agentLocationInput, setAgentLocationInput] = useState('');
  const [agentWhatsappInput, setAgentWhatsappInput] = useState('');
  const [agentPhotoFile, setAgentPhotoFile] = useState<File | null>(null);
  const [agentPhotoPreview, setAgentPhotoPreview] = useState<string | null>(null);
  const [savingAgentProfile, setSavingAgentProfile] = useState(false);
  const [agentModalError, setAgentModalError] = useState<string | null>(null);

  const [agentPropertyCount, setAgentPropertyCount] = useState<number | null>(null);

  // Sync agent inputs from user session & load property count
  useEffect(() => {
    if (user?.role === 'agent') {
      setAgentBioInput(user.bio || '');
      setAgentLocationInput(user.agentLocation || 'Ho, Volta Region');
      setAgentWhatsappInput(user.agentWhatsapp || user.phone || '');
      setAgentPhotoPreview(user.profileImage || null);

      if (user.id) {
        graphqlRequest<{ agentProperties: any[] }>(GET_AGENT_PROPERTIES, {
          userId: user.id,
          includePrivate: true,
        })
          .then((res) => {
            if (res?.agentProperties) {
              setAgentPropertyCount(res.agentProperties.length);
            }
          })
          .catch(() => {});
      }
    }
  }, [user?.id, user?.bio, user?.profileImage, user?.role]);

  const handleSaveFullAgentProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAgentModalError(null);

    if (!agentBioInput.trim()) {
      setAgentModalError('Please enter a short bio or description for your agent profile.');
      return;
    }

    if (!user?.profileImage && !agentPhotoFile && !agentPhotoPreview) {
      setAgentModalError('Please select a profile photo for your agent profile card.');
      return;
    }

    setSavingAgentProfile(true);
    try {
      let photoUrl = user?.profileImage || '';
      if (agentPhotoFile) {
        const formData = new FormData();
        formData.append('image', agentPhotoFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload profile photo. Please try again.');
        }

        const uploadData = await uploadRes.json();
        photoUrl = uploadData.imageUrl || uploadData.url || photoUrl;
      }

      const formattedWa = formatGhanaPhone(agentWhatsappInput);

      const updatedProfile = await graphqlRequest<{ updateAgentProfile: User }>(
        UPDATE_AGENT_PROFILE,
        {
          bio: sanitizeInput(agentBioInput.trim()),
          profileImage: photoUrl || null,
          agentLocation: sanitizeInput(agentLocationInput.trim()),
          agentWhatsapp: formattedWa,
        }
      );

      if (updatedProfile?.updateAgentProfile) {
        updateUser(updatedProfile.updateAgentProfile);
        setShowAgentSetupModal(false);
      }
    } catch (err: any) {
      console.error('Save agent profile error:', err);
      setAgentModalError(err.message || 'Failed to save agent details.');
    } finally {
      setSavingAgentProfile(false);
    }
  };

  if (authLoading || !user) {
    if (isEmbedded) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Checking credentials...</p>
      </div>
    );
  }

  // Block unverified agents from uploading — they must be verified by admin first
  // Admins and landlords bypass this check
  if ((user.role === 'agent') && user.verificationStatus !== 'verified') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
            border: '2px solid rgba(245,158,11,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.4rem',
          }}>
            🕐
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '999px',
            padding: '5px 14px',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#B45309',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            ⏳ Pending Verification
          </div>

          {/* Heading */}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Account Under Review
            </h1>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>! Your agent account has been created and is currently being reviewed by the HO Rentals team.
            </p>
          </div>

          {/* Info steps */}
          <div style={{
            width: '100%',
            background: 'var(--bg-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {[
              { icon: '✅', title: 'Account Created', desc: 'Your agent account is successfully set up.', done: true },
              { icon: '🔍', title: 'Identity Verification', desc: 'Our team is reviewing your registration details.', done: false },
              { icon: '📋', title: 'Admin Approval', desc: 'You will be approved once your information is verified.', done: false },
              { icon: '🏠', title: 'Upload Properties', desc: 'After approval, you can list properties on HO Rentals.', done: false },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step.done ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                  border: `1.5px solid ${step.done ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: step.done ? '#047857' : 'var(--text-primary)' }}>{step.title}</div>
                  <div style={{ fontSize: '0.80rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            This usually takes <strong>24–48 hours</strong>. If you have questions, contact us via WhatsApp or email.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/')}
              className="btn btn-outline"
              style={{ flex: 1, padding: '12px 16px', fontSize: '0.88rem', fontWeight: 600 }}
            >
              ← Back to Home
            </button>
            <a
              href="https://wa.me/233571542612?text=Hello%2C%20I%20registered%20as%20an%20agent%20on%20HO%20Rentals%20and%20am%20awaiting%20verification."
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ flex: 1, padding: '12px 16px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              💬 Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccessNotice) {
    return (
      <div className={styles.container} style={{ maxWidth: '640px', padding: '60px 20px', textAlign: 'center' }}>
        <div className="card glass animate-slide-up" style={{ padding: '40px 28px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Property Submitted for Verification!
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '480px', margin: 0 }}>
            Your property listing has been successfully uploaded and is currently pending review by our verification team. It will officially go live on HO Rentals once approved by the admin.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px', width: '100%' }}>
            <button
              onClick={() => {
                setShowSuccessNotice(false);
                setTitle('');
                setLocation('');
                setPrice('');
                setDescription('');
                setImageFiles([]);
                setImagePreviews([]);
              }}
              className="btn btn-outline"
              style={{ padding: '12px 20px', fontSize: '0.88rem', flex: '1 1 180px' }}
            >
              Upload Another Property
            </button>
            <button
              onClick={() => router.push(`/agents/${user.id}`)}
              className="btn btn-primary"
              style={{ padding: '12px 20px', fontSize: '0.88rem', flex: '1 1 180px' }}
            >
              View My Agent Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formContent = (
    <>
      {/* Agent Setup Prompt Modal */}
      {showAgentSetupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <div className="card glass animate-fade-in" style={{
            maxWidth: '540px',
            width: '100%',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0 }}>
                🏢
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Agent Details & Photo Required
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Please confirm your profile details before posting listings
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Your profile photo, bio, location, and WhatsApp line will be displayed on property cards and agent cards so tenants can verify your identity and contact you directly.
            </p>

            {agentModalError && (
              <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '0.88rem' }}>
                {agentModalError}
              </div>
            )}

            <form onSubmit={handleSaveFullAgentProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Photo Uploader */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', border: '2px solid var(--primary)' }}>
                  {agentPhotoPreview ? (
                    <img src={agentPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '👤'
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    Agent Profile Photo *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    id="modalAgentPhotoInput"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setAgentPhotoFile(file);
                        setAgentPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="modalAgentPhotoInput" className="btn btn-secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={14} /> {agentPhotoPreview ? 'Change Photo' : 'Select Photo File'}
                  </label>
                </div>
              </div>

              {/* Bio Input */}
              <div className="form-group">
                <label htmlFor="agentBioInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Agent Bio / Description *
                </label>
                <textarea
                  id="agentBioInput"
                  rows={3}
                  placeholder="e.g. Independent verified rental agent in Ho. Specializing in student hostels near UHAS, HTU, and commercial apartments across Volta Region."
                  value={agentBioInput}
                  onChange={(e) => setAgentBioInput(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.88rem' }}
                  required
                />
              </div>

              {/* Location Input */}
              <div className="form-group">
                <label htmlFor="agentLocationInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Primary Operating Location / City
                </label>
                <input
                  id="agentLocationInput"
                  type="text"
                  placeholder="e.g. Ho, Sokode, Volta Region"
                  value={agentLocationInput}
                  onChange={(e) => setAgentLocationInput(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.88rem' }}
                />
              </div>

              {/* WhatsApp Line Input */}
              <div className="form-group">
                <label htmlFor="agentWhatsappInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  WhatsApp Phone Number for Inquiries
                </label>
                <input
                  id="agentWhatsappInput"
                  type="text"
                  placeholder="e.g. 0241234567"
                  value={agentWhatsappInput}
                  onChange={(e) => setAgentWhatsappInput(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                {(user?.bio || user?.profileImage) && (
                  <button
                    type="button"
                    onClick={() => setShowAgentSetupModal(false)}
                    className="btn btn-outline"
                    style={{ padding: '12px 18px', fontSize: '0.88rem' }}
                  >
                    Keep Current Profile
                  </button>
                )}
                <button
                  type="submit"
                  disabled={savingAgentProfile}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '0.92rem', fontWeight: 700 }}
                >
                  {savingAgentProfile ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Loader className="animate-spin" size={16} /> Saving Details...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Sparkles size={16} /> Save Profile & Continue
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agent Verified Profile Badge Card Header */}
      {user?.role === 'agent' && (
        <div style={{
          backgroundColor: 'var(--bg-surface-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              border: '2px solid var(--primary)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem'
            }}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '👤'
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Agent: {user.name}
                </h3>
                <span
                  onClick={() => setShowVerifyInfoModal(true)}
                  style={{ fontSize: '0.72rem', backgroundColor: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                  title="Click for Agent Verification Guarantee"
                >
                  Verified Agent
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                {user.bio || 'Verified Rental Agent on HO Rentals'}
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', padding: '3px 10px', backgroundColor: agentPropertyCount !== null && agentPropertyCount >= 2 ? '#FEF3C7' : '#ECFDF5', border: `1px solid ${agentPropertyCount !== null && agentPropertyCount >= 2 ? '#F59E0B' : '#10B981'}`, borderRadius: '12px', fontSize: '0.76rem', fontWeight: 700, color: agentPropertyCount !== null && agentPropertyCount >= 2 ? '#92400E' : '#065F46' }}>
                <span>🏷️ Agent Listing Rate:</span>
                {agentPropertyCount !== null ? (
                  agentPropertyCount < 2 ? (
                    <span>First 2 FREE ({agentPropertyCount} of 2 used) — Next listing is FREE</span>
                  ) : (
                    <span>GH₵10.00 per property listed (Free tier limit reached)</span>
                  )
                ) : (
                  <span>First 2 properties FREE, subsequent listings GH₵10.00 each</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAgentSetupModal(true)}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600 }}
          >
            ✏️ Edit Agent Profile
          </button>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '0.95rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main info inputs */}
          <div className={styles.formGrid}>
            <div className={styles.fullWidth}>
              <div className="form-group">
                <label htmlFor="title">Property Title</label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Premium Single Room Self-Contain near UCC"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label htmlFor="location" style={{ marginBottom: 0 }}>Location / Area Name</label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomLocation(!showAddCustomLocation)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0
                  }}
                >
                  {showAddCustomLocation ? '✕ Cancel' : '+ Add Quick Location'}
                </button>
              </div>

              {/* Quick Area Preset Dropdown */}
              <select
                className="form-control"
                style={{ marginBottom: '8px', backgroundColor: 'var(--bg-surface)', fontSize: '0.85rem' }}
                value={quickLocations.includes(location) ? location : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setLocation(e.target.value);
                  }
                }}
              >
                <option value="">-- Choose Quick Location (Volta Region) --</option>
                {quickLocations.map((locOption) => (
                  <option key={locOption} value={locOption}>
                    📍 {locOption}
                  </option>
                ))}
              </select>

              {/* Custom Location Adder Row */}
              {showAddCustomLocation && (
                <div style={{ padding: '10px 12px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                    Type Custom Area Name (automatically appended with ", Volta Region"):
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. Titrinu, Klefe, Abutia, Ziavi"
                      value={customAreaInput}
                      onChange={(e) => setCustomAreaInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomQuickLocation(); } }}
                      className="form-control"
                      style={{ fontSize: '0.85rem', flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomQuickLocation}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      + Add Location
                    </button>
                  </div>
                </div>
              )}

              <input
                id="location"
                type="text"
                placeholder="e.g. Sokode (UHAS Main Campus), Volta Region"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="digitalAddress">Ghana Post Digital Address (Optional)</label>
              <input
                id="digitalAddress"
                type="text"
                placeholder="e.g. VH-0123-4567"
                value={digitalAddress}
                onChange={(e) => setDigitalAddress(e.target.value)}
                className="form-control"
              />
            </div>

            <div className={styles.fullWidth}>
              <div className="form-group">
                <label htmlFor="landmarks">Landmark & Directions Guide (Optional)</label>
                <input
                  id="landmarks"
                  type="text"
                  placeholder="e.g. 150m behind UHAS Sokode Gate, opposite Bright Pharmacy"
                  value={landmarks}
                  onChange={(e) => setLandmarks(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            <div className={styles.fullWidth}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface-secondary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {latitude && longitude
                    ? `📍 GPS Coordinates Saved: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
                    : '📍 No custom GPS set (defaults to selected Ho area)'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if ('geolocation' in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setLatitude(pos.coords.latitude);
                          setLongitude(pos.coords.longitude);
                          alert(`On-Site GPS Detected! Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
                        },
                        (err) => {
                          console.error(err);
                          alert('Could not detect GPS location. Please check your phone GPS settings or select an Area Preset.');
                        }
                      );
                    } else {
                      alert('Geolocation is not supported by your browser.');
                    }
                  }}
                  className="btn btn-outline"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  📍 Use Live On-Site GPS
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="price">Price & Duration</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="price"
                  type="number"
                  placeholder="e.g. 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="form-control"
                  style={{ flex: 1 }}
                />
                <select
                  value={pricePeriod}
                  onChange={(e) => setPricePeriod(e.target.value)}
                  className="form-control"
                  style={{ width: '180px', backgroundColor: 'var(--bg-surface)' }}
                >
                  <option value="plot">per plot</option>
                  <option value="acre">per acre</option>
                  <option value="semester">per semester</option>
                  <option value="academic year">per academic year</option>
                  <option value="outright sale">Outright Sale (Total)</option>
                  <option value="year">per year</option>
                  <option value="month">per month</option>
                  <option value="day">per day</option>
                  <option value="item">per item</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="type">Property Type / Category</label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setType(newType);
                  if (newType === 'Lands' && pricePeriod !== 'acre') {
                    setPricePeriod('plot');
                  } else if (newType === 'Furnitures') {
                    setPricePeriod('outright sale');
                  }
                }}
                required
                className="form-control"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <option value="Student Hostel">Student Hostel</option>
                <option value="Single Room">Single Room</option>
                <option value="Chamber & Hall">Chamber & Hall</option>
                <option value="Single Room SC">Single Room SC (Self-Contained)</option>
                <option value="Chamber and Hall SC">Chamber & Hall SC (Self-Contained)</option>
                <option value="Two Bedroom SC">Two Bedroom SC (Self-Contained)</option>
                <option value="Three Bedroom SC">Three Bedroom SC (Self-Contained)</option>
                <option value="Four Bedroom SC">Four Bedroom SC (Self-Contained)</option>
                <option value="Furnitures">Furnitures</option>
                <option value="Lands">Lands</option>
                <option value="Shops">Shops</option>
                <option value="Short Stay">Short Stay</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Availability Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="form-control"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <option value="available">Available</option>
                <option value="rented">Occupied / Sold / Taken</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contact">Contact Phone Number (10 Digits)</label>
              <input
                id="contact"
                type="tel"
                placeholder="e.g. 0241234567"
                value={contact}
                onChange={(e) => setContact(formatGhanaPhone(e.target.value))}
                required
                maxLength={10}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordName">Landlord Name (Optional)</label>
              <input
                id="landlordName"
                type="text"
                placeholder="e.g. Mr. John Doe"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className="form-control"
              />
            </div>

            {/* Rooms, Advance, Available From — only for room/accommodation types */}
            {type !== 'Lands' && type !== 'Furnitures' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="rooms">Rooms Available</label>
                  <input
                    id="rooms"
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="advance">Advance Required</label>
                  <input
                    id="advance"
                    type="text"
                    placeholder="e.g. 6 months, 1 year"
                    value={advance}
                    onChange={(e) => setAdvance(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="availableFrom">Available From</label>
                  <input
                    id="availableFrom"
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>
            )}

            <div className={styles.fullWidth}>
              <div className="form-group">
                <label htmlFor="description">Listing Description</label>
                <textarea
                  id="description"
                  placeholder={
                    type === 'Lands'
                      ? 'Describe land details (e.g. road access, soil type, site plan, nearby landmarks, etc.)'
                      : type === 'Furnitures'
                      ? 'Describe furniture details (e.g. materials, dimensions, usage history, seller notes, etc.)'
                      : 'Describe your property (e.g. water availability, electricity meter, furnished state, etc.)'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Dynamic Features Section based on Category */}
            <div className={styles.fullWidth} style={{ marginBottom: '8px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>
                  {type === 'Lands'
                    ? 'Land Specifications'
                    : type === 'Furnitures'
                    ? 'Furniture Specifications'
                    : 'Key Features & Amenities'}
                </label>

                {type === 'Lands' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>📐 Plot Size / Dimensions</label>
                      <input
                        type="text"
                        placeholder="e.g. 70 x 100 ft, 2 Acres, 1 Plot"
                        value={landPlotSize}
                        onChange={(e) => setLandPlotSize(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>📜 Title / Documentation</label>
                      <select
                        value={landDocType}
                        onChange={(e) => setLandDocType(e.target.value)}
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <option value="Site Plan">Site Plan</option>
                        <option value="Indenture / Lease">Indenture / Lease</option>
                        <option value="Registered Title">Registered Title</option>
                        <option value="Freehold">Freehold</option>
                        <option value="Customary / Unregistered">Customary / Unregistered</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>🏗️ Zoning / Intended Purpose</label>
                      <select
                        value={landZoning}
                        onChange={(e) => setLandZoning(e.target.value)}
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Mixed Use">Mixed Use</option>
                      </select>
                    </div>
                  </div>
                ) : type === 'Furnitures' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>✨ Condition</label>
                      <select
                        value={furnitureCondition}
                        onChange={(e) => setFurnitureCondition(e.target.value)}
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <option value="Brand New">Brand New</option>
                        <option value="Slightly Used (Like New)">Slightly Used (Like New)</option>
                        <option value="Fairly Used">Fairly Used</option>
                        <option value="Refurbished">Refurbished</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>🛋️ Item Category</label>
                      <select
                        value={furnitureCategory}
                        onChange={(e) => setFurnitureCategory(e.target.value)}
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <option value="Bed & Mattress">Bed & Mattress</option>
                        <option value="Sofa & Seating">Sofa & Seating</option>
                        <option value="Dining Set">Dining Set</option>
                        <option value="Desk & Chair">Desk & Chair</option>
                        <option value="Kitchen Appliance">Kitchen Appliance</option>
                        <option value="Wardrobe / Cabinet">Wardrobe / Cabinet</option>
                        <option value="Home Electronics / Decor">Home Electronics / Decor</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>🚚 Delivery Options</label>
                      <select
                        value={furnitureDelivery}
                        onChange={(e) => setFurnitureDelivery(e.target.value)}
                        className="form-control"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <option value="Buyer Pick-Up">Buyer Pick-Up</option>
                        <option value="Free Delivery">Free Delivery</option>
                        <option value="Paid Delivery Available">Paid Delivery Available</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    
                    {/* Water section */}
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>💧 Water Supply</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ghanaWaterShared} onChange={(e) => setGhanaWaterShared(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Ghana Water (Shared)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ghanaWaterSeparate} onChange={(e) => setGhanaWaterSeparate(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Ghana Water (Separate)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={polytank} onChange={(e) => setPolytank(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Polytank</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={borehole} onChange={(e) => setBorehole(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Borehole</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={well} onChange={(e) => setWell(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Well</span>
                        </label>
                      </div>
                    </div>

                    {/* Meter section */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>⚡ Electricity Meter</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ecgSharedMeter} onChange={(e) => setEcgSharedMeter(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>ECG Shared Meter</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ecgSeparateMeter} onChange={(e) => setEcgSeparateMeter(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>ECG Separate Meter</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ecgPostPaid} onChange={(e) => setEcgPostPaid(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>ECG Post-paid</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={ecgPrepaid} onChange={(e) => setEcgPrepaid(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>ECG Prepaid</span>
                        </label>
                      </div>
                    </div>

                    {/* Other Amenities */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>📶 Other Amenities</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasWifi} onChange={(e) => setHasWifi(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>High-Speed WiFi</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasAc} onChange={(e) => setHasAc(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Air Conditioning (AC)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasPrivateKitchen} onChange={(e) => setHasPrivateKitchen(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Kitchen (Private)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasSharedKitchen} onChange={(e) => setHasSharedKitchen(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Kitchen (Shared)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasPrivateBathroom} onChange={(e) => setHasPrivateBathroom(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Bathroom (Private)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasSharedBathroom} onChange={(e) => setHasSharedBathroom(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Bathroom (Shared)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Balcony / Veranda</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasCctv} onChange={(e) => setHasCctv(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>CCTV Camera</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasFurnished} onChange={(e) => setHasFurnished(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Furnished</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasGatedFenced} onChange={(e) => setHasGatedFenced(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Gated & Fenced</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={isNewlyBuilt} onChange={(e) => setIsNewlyBuilt(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Newly Built</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasBed} onChange={(e) => setHasBed(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Bed</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                          <input type="checkbox" checked={hasStudyDesk} onChange={(e) => setHasStudyDesk(e.target.checked)} style={{ cursor: 'pointer', width: '15px', height: '15px' }} />
                          <span>Study Desk</span>
                        </label>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>

            {/* Images upload wrapper */}
            <div className={styles.fullWidth}>
              <div className="form-group">
                <label>Property Images</label>
                <label className={styles.fileUploader}>
                  <UploadCloud size={36} className={styles.uploadIcon} />
                  <span style={{ fontWeight: 600 }}>Click to browse or upload images</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supports JPEG, PNG, WEBP</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className={styles.fileInput}
                  />
                </label>

                {imagePreviews.length > 0 && (
                  <div className={styles.previews}>
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className={styles.previewCard}>
                        <img src={preview} alt="preview" className={styles.previewImage} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className={styles.removePreview}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '16px' }}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader className="animate-spin" size={18} /> Uploading files & creating listing...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={18} /> List Property
              </span>
            )}
          </button>
        </form>
      </>
    );

    if (isEmbedded) {
      return (
        <div className="card glass" style={{ padding: '28px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', backgroundColor: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)' }}>List a New Property</h2>
          {formContent}
        </div>
      );
    }

    return (
      <div className={`${styles.container} animate-fade-in`}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 className={styles.title}>List Your Property</h1>
              <p className={styles.subtitle}>Upload hostels, rooms, or self-contained flats to HO Rentals</p>
            </div>
            <span style={{ fontSize: '2rem' }} className="animate-bounce">🏠</span>
          </div>
          {formContent}
        </div>

        <VerifiedAgentModal
          isOpen={showVerifyInfoModal}
          onClose={() => setShowVerifyInfoModal(false)}
          agentName={user?.name}
        />
      </div>
    );
}
