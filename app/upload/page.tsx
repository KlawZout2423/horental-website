'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, CREATE_PROPERTY } from '../../lib/graphql';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader } from 'lucide-react';
import { formatGhanaPhone, isValidGhanaPhone, sanitizeInput } from '../../lib/types';
import styles from './upload.module.css';

export default function UploadPage({
  isEmbedded = false,
  onSuccess
}: {
  isEmbedded?: boolean;
  onSuccess?: () => void;
}) {
  const { user, loading: authLoading } = useAuth();
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
  
  // Amenities checkboxes state (all default to false - chosen explicitly by user)
  const [hasWifi, setHasWifi] = useState(false);
  const [hasCctv, setHasCctv] = useState(false);
  const [hasFurnished, setHasFurnished] = useState(false);
  const [hasGatedFenced, setHasGatedFenced] = useState(false);
  const [isNewlyBuilt, setIsNewlyBuilt] = useState(false);
  const [hasBed, setHasBed] = useState(false);
  const [hasStudyDesk, setHasStudyDesk] = useState(false);
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
      } else if (user.role !== 'admin' && user.role !== 'partner') {
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
        if (hasCctv) otherOptions.push('CCTV Camera');
        if (hasFurnished) otherOptions.push('Furnished');
        if (hasGatedFenced) otherOptions.push('Gated & Fenced');
        if (isNewlyBuilt) otherOptions.push('Newly Built');
        if (hasBed) otherOptions.push('Bed');
        if (hasStudyDesk) otherOptions.push('Study Desk');
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
      };

      await graphqlRequest(CREATE_PROPERTY, { input });
      
      // On success, go back to properties listing
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/properties');
      }
    } catch (err: any) {
      console.error('Submit property error:', err);
      setError(err.message || 'An error occurred while uploading your property.');
    } finally {
      setSubmitting(false);
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

  const formContent = (
    <>
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
              <label htmlFor="location">Location / Area</label>
              <select
                className="form-control"
                style={{ marginBottom: '8px', backgroundColor: 'var(--bg-surface)', fontSize: '0.85rem' }}
                onChange={(e) => {
                  if (e.target.value) {
                    setLocation(e.target.value);
                    const HO_PRESET_LOCATIONS: Record<string, { lat: number; lng: number }> = {
                      'Sokode (UHAS Main Campus)': { lat: 6.6080, lng: 0.4700 },
                      'Dave (UHAS Dave Campus)': { lat: 6.6000, lng: 0.4680 },
                      'HTU / Ho Poly Area': { lat: 6.6120, lng: 0.4750 },
                      'Bankoe, Ho': { lat: 6.6100, lng: 0.4710 },
                      'Civic Center, Ho': { lat: 6.6150, lng: 0.4730 },
                      'Ahoe, Ho': { lat: 6.6135, lng: 0.4720 },
                      'Kpaguri, Ho': { lat: 6.6050, lng: 0.4690 },
                      'Heve, Ho': { lat: 6.6170, lng: 0.4740 },
                      'Adaklu Road': { lat: 6.5800, lng: 0.4500 },
                      'Kpotame': { lat: 6.6030, lng: 0.4650 },
                    };
                    if (HO_PRESET_LOCATIONS[e.target.value]) {
                      setLatitude(HO_PRESET_LOCATIONS[e.target.value].lat);
                      setLongitude(HO_PRESET_LOCATIONS[e.target.value].lng);
                    }
                  }
                }}
              >
                <option value="">-- Quick Area Preset (Optional) --</option>
                <option value="Sokode (UHAS Main Campus)">Sokode (UHAS Main Campus)</option>
                <option value="Dave (UHAS Dave Campus)">Dave (UHAS Dave Campus)</option>
                <option value="HTU / Ho Poly Area">HTU / Ho Poly Area</option>
                <option value="Bankoe, Ho">Bankoe, Ho</option>
                <option value="Civic Center, Ho">Civic Center, Ho</option>
                <option value="Ahoe, Ho">Ahoe, Ho</option>
                <option value="Kpaguri, Ho">Kpaguri, Ho</option>
                <option value="Heve, Ho">Heve, Ho</option>
                <option value="Adaklu Road">Adaklu Road</option>
                <option value="Kpotame">Kpotame</option>
              </select>
              <input
                id="location"
                type="text"
                placeholder="e.g. Sokode (UHAS Main Campus)"
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
                <option value="rented">Rented / Occupied / Sold</option>
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
      </div>
    );
}
