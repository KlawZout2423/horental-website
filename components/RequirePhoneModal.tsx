'use client';

import React, { useState } from 'react';
import { Phone, ShieldCheck, Loader, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { graphqlRequest, UPDATE_USER_PROFILE_MUTATION } from '../lib/graphql';
import { formatGhanaPhone, isValidGhanaPhone } from '../lib/types';

export default function RequirePhoneModal() {
  const { user, updateUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show modal only if user is logged in AND does not have a registered phone number
  if (!user || (user.phone && user.phone.trim().length >= 9)) {
    return null;
  }

  // Agents and Landlords use the dedicated agent registration / setup form
  if (user.role === 'agent' || user.role === 'landlord') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedPhone = formatGhanaPhone(phone.trim());
    if (!isValidGhanaPhone(formattedPhone)) {
      setError('Please enter a valid Ghanaian phone number (e.g. 024 123 4567).');
      return;
    }

    setLoading(true);
    try {
      const data = await graphqlRequest<{ updateUserProfile: any }>(
        UPDATE_USER_PROFILE_MUTATION,
        { phone: formattedPhone, isProfileComplete: true }
      );

      if (data && data.updateUserProfile) {
        updateUser(data.updateUserProfile);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "var(--font-family, 'Inter', sans-serif)"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        padding: '36px 28px',
        position: 'relative',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #DBEAFE',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px'
          }}>
            <Phone size={30} style={{ color: '#2563EB' }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
            Complete Your Contact Number
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            Welcome, <strong>{user.name}</strong>! Please enter your phone number so landlords &amp; agents can reach you regarding your inquiries.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '12px 14px',
            borderRadius: '12px',
            fontSize: '0.84rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Ghanaian Phone Number
            </label>
            <div style={{ display: 'flex', alignItems: 'center', borderRadius: '12px', border: '1px solid #CBD5E1', overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
              <div style={{ padding: '0 14px', fontSize: '0.88rem', fontWeight: 700, color: '#475569', borderRight: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', gap: '6px', height: '48px', backgroundColor: '#F1F5F9' }}>
                🇬🇭 +233
              </div>
              <input
                type="tel"
                placeholder="24 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '0 14px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  backgroundColor: 'transparent',
                  height: '48px'
                }}
              />
            </div>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', marginTop: '6px' }}>
              Format: 0241234567 or 241234567
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '50px',
              backgroundColor: '#C1121F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              fontSize: '0.98rem',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(193, 18, 31, 0.25)'
            }}
          >
            {loading ? (
              <>
                <Loader size={18} className="spin" /> Saving Contact Info...
              </>
            ) : (
              <>
                Save &amp; Continue <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#64748B', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} style={{ color: '#10B981' }} /> Your phone number is kept secure and private on HO Rentals.
        </div>
      </div>
    </div>
  );
}
