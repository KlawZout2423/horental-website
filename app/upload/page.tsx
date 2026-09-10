'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, CREATE_PROPERTY, UPDATE_PROPERTY, UPDATE_AGENT_PROFILE, GET_AGENT_PROPERTIES, GET_VERIFICATION_REQUESTS } from '../../lib/graphql';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput, parsePropertyDescription, Property, User, stripIdFromBio } from '../../lib/types';
import VerifiedAgentModal from '../../components/VerifiedAgentModal';
import styles from './upload.module.css';

// ── Inline sub-component: show admin rejection notes to rejected agents ──────
function RejectionNotesBox({ userId }: { userId: number }) {
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    graphqlRequest<{ verificationRequests: Array<{ status: string; reviewerNotes?: string; createdAt: string }> }>(GET_VERIFICATION_REQUESTS)
      .then(data => {
        const myRequests = (data?.verificationRequests || [])
          .filter(r => r.status === 'rejected' && r.reviewerNotes)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotes(myRequests[0]?.reviewerNotes || null);
      })
      .catch(() => setNotes(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return null;
  if (!notes) return (
    <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: '0.6rem', padding: '14px 18px', width: '100%', textAlign: 'left' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#fca5a5', fontWeight: 700, marginBottom: '4px' }}>
        <AlertTriangle size={16} /> Reason for Rejection
      </div>
      <p style={{ color: '#fca5a5', fontSize: '0.84rem', margin: 0 }}>No specific reason was provided. Please contact support for clarification.</p>
    </div>
  );
  return (
    <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: '0.6rem', padding: '14px 18px', width: '100%', textAlign: 'left' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#fca5a5', fontWeight: 700, marginBottom: '6px' }}>
        <AlertTriangle size={16} /> Reason for Rejection
      </div>
      <p style={{ color: '#fca5a5', fontSize: '0.84rem', margin: 0, lineHeight: 1.6 }}>{notes}</p>
    </div>
  );
}


export default function UploadPage({
  isEmbedded = false,
  initialData,
  onSuccess
}: {
  isEmbedded?: boolean;
  initialData?: Property | null;
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
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState<string | null>(null);
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

  // Pre-fill state when editing an existing property via initialData
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setLocation(initialData.location || '');
      setPrice(initialData.price !== undefined ? String(initialData.price) : '');
      setType(initialData.type || 'Student Hostel');
      setStatus(initialData.status || 'available');
      setContact(initialData.contact || '');
      setDigitalAddress(initialData.digitalAddress || '');
      setLandmarks(initialData.landmarks || '');
      setLatitude(initialData.latitude ?? null);
      setLongitude(initialData.longitude ?? null);
      setLandlordName(initialData.landlordName || '');

      if (initialData.gallery && initialData.gallery.length > 0) {
        setImagePreviews(initialData.gallery.map((g) => g.url));
      } else if (initialData.imageUrl) {
        setImagePreviews([initialData.imageUrl]);
      } else {
        setImagePreviews([]);
      }
      setImageFiles([]);

      let desc = initialData.description || '';

      const pricePeriodMatch = desc.match(/PricePeriod:\s*per\s*([^\n]+)/i);
      if (pricePeriodMatch) {
        setPricePeriod(pricePeriodMatch[1].trim());
        desc = desc.replace(/PricePeriod:\s*per\s*[^\n]+/i, '').trim();
      }

      const roomsMatch = desc.match(/Rooms Available:\s*([^\n]+)/i);
      if (roomsMatch) {
        setRooms(roomsMatch[1].trim());
        desc = desc.replace(/Rooms Available:\s*[^\n]+/i, '').trim();
      }

      const advanceMatch = desc.match(/Advance Required:\s*([^\n]+)/i);
      if (advanceMatch) {
        setAdvance(advanceMatch[1].trim());
        desc = desc.replace(/Advance Required:\s*[^\n]+/i, '').trim();
      }

      const availableFromMatch = desc.match(/Available From:\s*([^\n]+)/i);
      if (availableFromMatch) {
        setAvailableFrom(availableFromMatch[1].trim());
        desc = desc.replace(/Available From:\s*[^\n]+/i, '').trim();
      }

      const featuresIdx = desc.indexOf('Features:');
      if (featuresIdx !== -1) {
        const featuresPart = desc.substring(featuresIdx + 9).trim();
        desc = desc.substring(0, featuresIdx).trim();

        const lowerFeatures = featuresPart.toLowerCase();
        setHasWifi(lowerFeatures.includes('wifi'));
        setHasAc(lowerFeatures.includes('ac'));
        setHasCctv(lowerFeatures.includes('cctv'));
        setHasFurnished(lowerFeatures.includes('furnished'));
        setHasGatedFenced(lowerFeatures.includes('gated'));
        setIsNewlyBuilt(lowerFeatures.includes('newly built'));
        setHasBed(lowerFeatures.includes('bed'));
        setHasStudyDesk(lowerFeatures.includes('study desk'));
        setHasPrivateKitchen(lowerFeatures.includes('kitchen (private)'));
        setHasSharedKitchen(lowerFeatures.includes('kitchen (shared)'));
        setHasPrivateBathroom(lowerFeatures.includes('bathroom (private)'));
        setHasSharedBathroom(lowerFeatures.includes('bathroom (shared)'));
        setHasBalcony(lowerFeatures.includes('balcony'));

        setGhanaWaterShared(lowerFeatures.includes('ghana water (shared)'));
        setGhanaWaterSeparate(lowerFeatures.includes('ghana water (separate)'));
        setPolytank(lowerFeatures.includes('polytank'));
        setBorehole(lowerFeatures.includes('borehole'));
        setWell(lowerFeatures.includes('well'));

        setEcgSharedMeter(lowerFeatures.includes('ecg shared meter'));
        setEcgSeparateMeter(lowerFeatures.includes('ecg separate meter'));
        setEcgPostPaid(lowerFeatures.includes('ecg post-paid'));
        setEcgPrepaid(lowerFeatures.includes('ecg prepaid'));

        const plotMatch = featuresPart.match(/Plot Size:\s*([^,|]+)/i);
        if (plotMatch) setLandPlotSize(plotMatch[1].trim());
        const docMatch = featuresPart.match(/Title\/Docs:\s*([^,|]+)/i);
        if (docMatch) setLandDocType(docMatch[1].trim());
        const zoningMatch = featuresPart.match(/Zoning:\s*([^,|]+)/i);
        if (zoningMatch) setLandZoning(zoningMatch[1].trim());

        const condMatch = featuresPart.match(/Condition:\s*([^,|]+)/i);
        if (condMatch) setFurnitureCondition(condMatch[1].trim());
        const catMatch = featuresPart.match(/Category:\s*([^,|]+)/i);
        if (catMatch) setFurnitureCategory(catMatch[1].trim());
        const delMatch = featuresPart.match(/Delivery:\s*([^,|]+)/i);
        if (delMatch) setFurnitureDelivery(delMatch[1].trim());
      }

      setDescription(desc.trim());
    } else if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const lName = sp.get('landlordName');
      const lContact = sp.get('contact');
      const lLoc = sp.get('location') || sp.get('city');
      const lGps = sp.get('gps') || sp.get('digitalAddress');
      const lLandmark = sp.get('landmark') || sp.get('landmarks');
      
      if (lName) setLandlordName(lName);
      if (lContact) setContact(formatGhanaPhone(lContact));
      if (lLoc) setLocation(lLoc);
      if (lGps) setDigitalAddress(lGps);
      if (lLandmark) setLandmarks(lLandmark);
    }
  }, [initialData]);

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

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => {
      if (prev[index] && prev[index].startsWith('blob:')) {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGetGpsLocation = () => {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      alert('⚠️ GPS location requires a secure HTTPS connection. Mobile browsers block location access on unencrypted HTTP.');
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('⚠️ Geolocation is not supported by your mobile browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusMsg('📡 Connecting to phone GPS satellite...');

    const handleSuccess = (pos: GeolocationPosition, providerLabel: string) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      setIsDetectingGps(false);
      setGpsStatusMsg(`✅ GPS Acquired via ${providerLabel}: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    };

    const handleError = (err: GeolocationPositionError) => {
      setIsDetectingGps(false);
      console.error('GPS Detection Error:', err);
      
      let errorDetail = '';
      switch (err.code) {
        case err.PERMISSION_DENIED:
          errorDetail = 'Location permission was denied. Please allow location access in your browser settings (tap the lock icon next to the website URL).';
          break;
        case err.POSITION_UNAVAILABLE:
          errorDetail = 'GPS location unavailable. Please ensure Location/GPS is turned ON in your phone settings.';
          break;
        case err.TIMEOUT:
          errorDetail = 'GPS request timed out. Please step outdoors or near a window for satellite reception.';
          break;
        default:
          errorDetail = err.message || 'Unknown GPS error occurred.';
          break;
      }
      setGpsStatusMsg(`⚠️ GPS Error: ${errorDetail}`);
      alert(`Could not detect GPS location:\n\n${errorDetail}`);
    };

    // Attempt 1: High Accuracy Satellite GPS
    navigator.geolocation.getCurrentPosition(
      (pos) => handleSuccess(pos, 'High-Accuracy Satellite GPS'),
      (err) => {
        console.warn('High accuracy GPS failed, trying network fallback...', err);
        setGpsStatusMsg('📡 High-accuracy GPS timed out, trying cellular/network location...');
        // Attempt 2: Low Accuracy Network/Cellular fallback
        navigator.geolocation.getCurrentPosition(
          (pos) => handleSuccess(pos, 'Cellular/Network Location'),
          (finalErr) => handleError(finalErr),
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);

    try {
      let urls: string[] = [];

      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => {
          formData.append('images', file);
        });

        const uploadRes = await fetch('/api/upload-multiple', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Upload failed: ${errText || uploadRes.statusText}`);
        }

        const uploadBody = await uploadRes.json();
        const uploadedUrls: string[] = uploadBody.imageUrls || uploadBody.images || [];

        const existingUrls = imagePreviews.filter((p) => !p.startsWith('blob:'));
        urls = [...existingUrls, ...uploadedUrls];
      } else {
        urls = imagePreviews.filter((p) => !p.startsWith('blob:'));
      }

      if (urls.length === 0) {
        throw new Error('Please upload at least one image of your property.');
      }

      const formattedContact = formatGhanaPhone(contact);
      if (!isValidGhanaPhone(formattedContact)) {
        throw new Error('Please enter a valid 10-digit Ghanaian phone number for landlord contact (e.g. 0241234567).');
      }

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

        const waterOptions: string[] = [];
        if (ghanaWaterShared) waterOptions.push('Ghana Water (Shared)');
        if (ghanaWaterSeparate) waterOptions.push('Ghana Water (Separate)');
        if (polytank) waterOptions.push('Polytank');
        if (borehole) waterOptions.push('Borehole');
        if (well) waterOptions.push('Well');
        if (waterOptions.length > 0) {
          amenitiesList.push(`Water: ${waterOptions.join(', ')}`);
        }

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
        imageUrl: urls[0],
        gallery: urls.map((url, index) => ({
          url,
          caption: `${title} - Image ${index + 1}`,
          order: index + 1,
        })),
        landlordName: landlordName.trim() || undefined,
      };

      if (initialData && initialData.id) {
        const idInt = typeof initialData.id === 'number' ? initialData.id : parseInt(String(initialData.id), 10);
        await graphqlRequest(UPDATE_PROPERTY, { id: idInt, input });
      } else {
        await graphqlRequest(CREATE_PROPERTY, { input });
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }
      
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
      setError(err.message || 'An error occurred while saving your property.');
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

    if (!agentWhatsappInput.trim()) {
      setAgentModalError('Please enter your WhatsApp contact number.');
      return;
    }

    if (!agentLocationInput.trim()) {
      setAgentModalError('Please enter your primary service area / location.');
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
    const isRejected = user.verificationStatus === 'rejected';
    const isPendingVerif = user.verificationStatus === 'pending' || user.verificationStatus === 'unverified';

    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '20px' }}>
        <div style={{
          maxWidth: '520px',
          width: '100%',
          background: 'var(--bg-surface)',
          border: `1px solid ${isRejected ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
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
            background: isRejected
              ? 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)'
              : 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
            border: isRejected ? '2px solid rgba(239,68,68,0.3)' : '2px solid rgba(245,158,11,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.4rem',
          }}>
            {isRejected ? '❌' : '🕐'}
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isRejected ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: isRejected ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.3)',
            borderRadius: '999px',
            padding: '5px 14px',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: isRejected ? '#DC2626' : '#B45309',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {isRejected ? '🚫 Verification Rejected' : '⏳ Pending Verification'}
          </div>

          {/* Heading */}
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              {isRejected ? 'Verification Declined' : 'Account Under Review'}
            </h1>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {isRejected
                ? <>Your verification request was not approved. Please review the reason below and re-submit with correct documents.</>
                : <>Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>! Your agent account is currently being reviewed by the HO Rentals team.</>}
            </p>
          </div>

          {/* Rejection reason box */}
          {isRejected && (
            <RejectionNotesBox userId={typeof user.id === 'string' ? parseInt(user.id, 10) : user.id} />
          )}

          {/* Info steps */}
          {!isRejected && (
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
          )}

          {/* Contact info */}
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {isRejected
              ? 'Please contact support if you believe this was a mistake, or re-register with correct documents.'
              : <>This usually takes <strong>24–48 hours</strong>. If you have questions, contact us via WhatsApp or email.</>}
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
            {isRejected ? (
              <button
                onClick={() => router.push('/register-agent')}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 16px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                🔄 Re-register as Agent
              </button>
            ) : (
              <a
                href="https://wa.me/233204940602?text=Hello%2C%20I%20registered%20as%20an%20agent%20on%20HO%20Rentals%20and%20am%20awaiting%20verification."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px 16px', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                💬 Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showSuccessNotice) {
    const isBillableListing = agentPropertyCount !== null && agentPropertyCount >= 2;
    return (
      <div className={styles.container} style={{ maxWidth: '640px', padding: '40px 20px', textAlign: 'center' }}>
        <div className="card glass animate-slide-up" style={{ padding: '36px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: isBillableListing ? '#FEF3C7' : '#ECFDF5', color: isBillableListing ? '#D97706' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
            {isBillableListing ? '⚡' : '🎉'}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {isBillableListing ? 'Listing Submitted — Direct MoMo Payment Required' : 'Property Submitted for Verification!'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '500px', margin: 0 }}>
            {isBillableListing ? (
              <>
                You have used your <strong>2 Free Listings</strong>. Extra listings are <strong>GH₵ 10.00 / month</strong> to cover storage, hosting, and priority tenant search ranking.
              </>
            ) : (
              <>
                Your property listing has been successfully uploaded (Free Listing Quota: {agentPropertyCount !== null ? agentPropertyCount + 1 : 1}/2 used) and is currently pending review.
              </>
            )}
          </p>

          {isBillableListing && (
            <div style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid #F59E0B',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 800, color: '#D97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💳 Direct Mobile Money Payment Details:
              </div>
              <div>• <strong>Amount Due:</strong> <span style={{ color: 'var(--primary)', fontWeight: 800 }}>GH₵ 10.00 / month</span></div>
              <div>• <strong>MTN MoMo / Telecel Cash:</strong> <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>0204940602</span> (HO Rentals)</div>
              <div>• <strong>Payment Reference:</strong> <span style={{ fontWeight: 700 }}>{user?.name || user?.phone || 'Agent Name'}</span></div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Once sent, tap the WhatsApp button below or call us to activate your listing immediately!
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px', width: '100%' }}>
            {isBillableListing && (
              <a
                href={`https://wa.me/233204940602?text=${encodeURIComponent(`Hello HO Rentals, I just uploaded my 3rd+ property listing "${title}" and sent GH₵ 10.00 via MoMo (Reference: ${user?.name || ''}). Please activate my listing.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 20px', fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                💬 WhatsApp Admin to Confirm MoMo Payment
              </a>
            )}
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
              onClick={() => router.push(`/dashboard`)}
              className="btn btn-outline"
              style={{ padding: '12px 20px', fontSize: '0.88rem', flex: '1 1 180px' }}
            >
              Go to Agent Dashboard
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

            <form onSubmit={handleSaveFullAgentProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {agentModalError && (
                <div style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  {agentModalError}
                </div>
              )}

              {/* Photo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid var(--primary)',
                  backgroundColor: 'var(--bg-surface-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  flexShrink: 0
                }}>
                  {agentPhotoPreview ? (
                    <img src={agentPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '👤'
                  )}
                </div>
                <div>
                  <label htmlFor="agentPhotoUpload" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '6px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={14} /> Upload Profile Photo
                  </label>
                  <input
                    id="agentPhotoUpload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setAgentPhotoFile(file);
                        setAgentPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Clear professional headshot for trust badge
                  </div>
                </div>
              </div>

              {/* Bio Input */}
              <div className="form-group">
                <label htmlFor="agentBioInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Short Professional Bio
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
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Top Row: Avatar + Name/Badge + Edit Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid var(--primary)',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '👤'
                )}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Agent: {user.name}
                  </h3>
                  <span
                    onClick={() => setShowVerifyInfoModal(true)}
                    style={{ fontSize: '0.72rem', backgroundColor: '#10B981', color: '#fff', padding: '3px 9px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Click for Agent Verification Guarantee"
                  >
                    <ShieldCheck size={12} /> Verified Agent
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                  {stripIdFromBio(user.bio) || 'Verified Rental Agent on HO Rentals'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAgentSetupModal(true)}
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.80rem', fontWeight: 600, borderRadius: '20px' }}
            >
              ✏️ Edit Agent Profile
            </button>
          </div>

          {/* Full-width Quota & MoMo Payment Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: agentPropertyCount !== null && agentPropertyCount >= 2 ? '#FEF3C7' : '#ECFDF5',
              border: `1px solid ${agentPropertyCount !== null && agentPropertyCount >= 2 ? '#F59E0B' : '#10B981'}`,
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: agentPropertyCount !== null && agentPropertyCount >= 2 ? '#92400E' : '#065F46',
              lineHeight: 1.4
            }}>
              <span>🏷️ Listing Quota:</span>
              {agentPropertyCount !== null ? (
                agentPropertyCount < 2 ? (
                  <span>Free Tier ({agentPropertyCount} of 2 used) — This upload is 100% FREE</span>
                ) : (
                  <span>3rd+ Property (Free limit filled) — GH₵ 10.00 / month</span>
                )
              ) : (
                <span>First 2 properties FREE, subsequent listings GH₵ 10.00/mo</span>
              )}
            </div>

            {agentPropertyCount !== null && agentPropertyCount >= 2 && (
              <div style={{
                fontSize: '0.82rem',
                color: '#B45309',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                lineHeight: 1.5
              }}>
                💡 <strong>Direct Payment:</strong> Send <strong>GH₵ 10.00</strong> via MoMo to <strong>0204940602</strong> after uploading so admin can activate this listing.
              </div>
            )}
          </div>
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
              <div style={{
                backgroundColor: latitude && longitude ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-secondary)',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: latitude && longitude ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📍 Property On-Site GPS Location
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {latitude && longitude
                        ? `Coordinates: Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`
                        : 'No GPS coordinates saved yet (defaults to selected area centroid)'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {latitude && longitude && (
                      <>
                        <a
                          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '4px', borderColor: '#10B981', color: '#10B981', fontWeight: 700 }}
                        >
                          🗺️ Open in Google Maps
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setLatitude(null);
                            setLongitude(null);
                            setGpsStatusMsg(null);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Clear
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isDetectingGps}
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 800, gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {isDetectingGps ? (
                        <>
                          <Loader size={14} className="animate-spin" /> Detecting GPS...
                        </>
                      ) : (
                        '📍 Detect Live On-Site GPS'
                      )}
                    </button>
                  </div>
                </div>

                {gpsStatusMsg && (
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: gpsStatusMsg.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : gpsStatusMsg.includes('⚠️') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                    color: gpsStatusMsg.includes('✅') ? '#047857' : gpsStatusMsg.includes('⚠️') ? '#DC2626' : '#1D4ED8',
                  }}>
                    {gpsStatusMsg}
                  </div>
                )}
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
              <div className={styles.fullWidth} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '14px' }}>
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
                <Loader className="animate-spin" size={18} /> {initialData ? 'Saving changes...' : 'Uploading files & creating listing...'}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Sparkles size={18} /> {initialData ? 'Save Changes' : 'List Property'}
              </span>
            )}
          </button>
        </form>
      </>
    );

    if (isEmbedded) {
      return (
        <div className="card glass" style={{ padding: '28px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', backgroundColor: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-primary)' }}>{initialData ? 'Edit Property Details' : 'List a New Property'}</h2>
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
