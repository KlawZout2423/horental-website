'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle2, ArrowLeft, Loader, MessageSquare, ArrowRight } from 'lucide-react';
import { graphqlRequest, SUBMIT_PASSWORD_RESET_REQUEST } from '../../lib/graphql';

export default function ForgotPasswordPage() {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ADMIN_WA = '233557922593';
  const waMsg = encodeURIComponent(`Hi HO Rentals Admin, I need help resetting my account password.\n\nName: ${name}\nContact: ${identifier}\n\nPlease assist me. Thank you!`);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(SUBMIT_PASSWORD_RESET_REQUEST, {
        name: name.trim(),
        identifier: identifier.trim(),
        message: null,
      });
      setSubmitted(true);
      // Auto-open WhatsApp so admin gets notified instantly
      setTimeout(() => {
        window.open(`https://wa.me/${ADMIN_WA}?text=${waMsg}`, '_blank');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #780B13 0%, #C1121F 50%, #9E0E18 100%)',
      padding: '24px 16px',
      fontFamily: "var(--font-family, 'Inter', sans-serif)"
    }}>
      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#FFFFFF',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        padding: '36px 28px',
        position: 'relative'
      }}>

        {/* Back link */}
        <Link href="/login" style={{
          position: 'absolute', top: '20px', left: '20px',
          display: 'flex', alignItems: 'center', gap: '5px',
          color: '#64748B', fontSize: '0.78rem', fontWeight: 600,
          textDecoration: 'none'
        }}>
          <ArrowLeft size={13} /> Sign In
        </Link>

        {!submitted ? (
          <>
            {/* Icon + Title */}
            <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '8px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: '#FFF3F3', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: '12px'
              }}>
                <Shield size={28} style={{ color: '#C1121F' }} />
              </div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Reset Password
              </h1>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                Submit your details — admin will contact you.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5',
                borderRadius: '10px', color: '#DC2626', fontSize: '0.82rem',
                fontWeight: 600, marginBottom: '16px'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text" required
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  style={{
                    width: '100%', height: '46px', borderRadius: '12px',
                    border: '1.5px solid #E2E8F0', padding: '0 14px',
                    fontSize: '0.9rem', fontWeight: 600, color: '#0F172A',
                    background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C1121F'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Phone or Email
                </label>
                <input
                  type="text" required
                  value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="0557922593 or email@example.com"
                  style={{
                    width: '100%', height: '46px', borderRadius: '12px',
                    border: '1.5px solid #E2E8F0', padding: '0 14px',
                    fontSize: '0.9rem', fontWeight: 600, color: '#0F172A',
                    background: '#F8FAFC', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C1121F'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>

              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', height: '48px', borderRadius: '12px', border: 'none',
                  background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #C1121F, #9E0E18)',
                  color: loading ? '#94A3B8' : '#FFFFFF',
                  fontSize: '0.92rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 6px 16px rgba(193,18,31,0.35)',
                  transition: 'all 0.2s', marginTop: '2px'
                }}
              >
                {loading ? <><Loader size={18} className="animate-spin" /> Sending...</> : <>Send Request <ArrowRight size={16} /></>}
              </button>
            </form>

            {/* WhatsApp direct */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
              <a
                href={`https://wa.me/${ADMIN_WA}?text=${waMsg}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '20px',
                  background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)',
                  color: '#15803D', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none'
                }}
              >
                <MessageSquare size={13} style={{ color: '#25D366' }} />
                Message Admin on WhatsApp
              </a>
            </div>
          </>
        ) : (
          /* Success */
          <div style={{ textAlign: 'center', paddingTop: '8px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#F0FDF4', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', marginBottom: '14px'
            }}>
              <CheckCircle2 size={36} style={{ color: '#10B981' }} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Request Sent!
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748B', marginBottom: '20px', lineHeight: 1.5 }}>
              We'll contact <strong>{identifier}</strong> via WhatsApp or call to reset your password.
            </p>

            <a
              href={`https://wa.me/${ADMIN_WA}?text=${waMsg}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', height: '46px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                textDecoration: 'none', marginBottom: '12px',
                boxShadow: '0 4px 14px rgba(37,211,102,0.35)'
              }}
            >
              <MessageSquare size={16} /> Chat on WhatsApp
            </a>

            <Link href="/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              color: '#64748B', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none'
            }}>
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
