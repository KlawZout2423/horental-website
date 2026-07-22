'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, CREATE_PROPERTY } from '../../lib/graphql';
import { UploadCloud, Image as ImageIcon, Sparkles, Loader } from 'lucide-react';
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Amenities checkboxes state
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
  
  // Status states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // 2. Perform the GraphQL property creation mutation
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice)) {
        throw new Error('Invalid price value.');
      }

      let finalDescription = description.trim();
      const amenitiesList: string[] = [];
      
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

      if (amenitiesList.length > 0) {
        finalDescription += `\n\nFeatures: ${amenitiesList.join(' | ')}`;
      }

      finalDescription += `\n\nPricePeriod: per ${pricePeriod}`;

      const input = {
        title,
        location,
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
              <input
                id="location"
                type="text"
                placeholder="e.g. Kwaprow, Cape Coast"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="form-control"
              />
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
                  style={{ width: '150px', backgroundColor: 'var(--bg-surface)' }}
                >
                  <option value="semester">per semester</option>
                  <option value="month">per month</option>
                  <option value="year">per year</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="type">Property Type / Category</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
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
                <option value="rented">Rented / Occupied</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contact">Landlord Phone Number</label>
              <input
                id="contact"
                type="tel"
                placeholder="e.g. +233 24 123 4567"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                className="form-control"
              />
            </div>

            <div className={styles.fullWidth}>
              <div className="form-group">
                <label htmlFor="description">Property Description & Amenities</label>
                <textarea
                  id="description"
                  placeholder="Describe your property (e.g., water availability, electricity meter, furnished, fenced yard, parking, etc.)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  className="form-control"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Amenities Select Checkboxes */}
            <div className={styles.fullWidth} style={{ marginBottom: '8px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '12px', display: 'block' }}>Key Features Included</label>
                
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
