'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  CheckCircle2, 
  ArrowLeft, 
  Loader, 
  MessageSquare,
  Smartphone,
  User,
  FileText,
  ArrowRight,
  Phone
} from 'lucide-react';
import { graphqlRequest, SUBMIT_PASSWORD_RESET_REQUEST } from '../../lib/graphql';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await graphqlRequest<{ submitPasswordResetRequest: { success: boolean; message: string } }>(
        SUBMIT_PASSWORD_RESET_REQUEST,
        { name: name.trim(), identifier: identifier.trim(), message: message.trim() || null }
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ADMIN_WHATSAPP = '233557922593';
  const whatsappMsg = encodeURIComponent(
    `Hi HO Rentals Admin, I need help resetting my account password.\n\nName: ${name || 'N/A'}\nContact: ${identifier || 'N/A'}\n\nPlease assist me. Thank you.`
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        background: 'radial-gradient(ellipse at 50% -20%, #1E1B4B 0%, #0F172A 45%, #020617 100%)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Inter', 'Outfit', sans-serif"
      }}
    >
      {/* Decorative Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

      {/* Back Link */}
      <Link
        href="/login"
        style={{
          position: 'absolute', top: '24px', left: '24px',
          color: '#E2E8F0',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '0.82rem',
          fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '6px',
          textDecoration: 'none',
          zIndex: 20
        }}
      >
        <ArrowLeft size={14} /> Back to Sign In
      </Link>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.2)',
        padding: '40px 32px',
        position: 'relative',
        zIndex: 10
      }}>

        {!submitted ? (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '68px', height: '68px', borderRadius: '22px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.2))',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
                border: '1px solid rgba(37,99,235,0.25)',
              }}>
                <Shield size={32} style={{ color: '#2563EB' }} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Reset Your Password
              </h1>
              <p style={{ fontSize: '0.87rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                Fill in your details below. Our admin team will contact you via <strong>WhatsApp or phone</strong> and reset your account password securely.
              </p>
            </div>

            {/* How it works banner */}
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #EFF6FF, #EEF2FF)',
              border: '1px solid #BFDBFE',
              borderRadius: '14px',
              marginBottom: '22px',
              fontSize: '0.82rem',
              color: '#1E3A8A',
              lineHeight: 1.5
            }}>
              <strong>🔐 How it works:</strong><br />
              1. Submit your request below<br />
              2. Admin contacts you via WhatsApp / phone call<br />
              3. You receive a new temporary password
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5', color: '#DC2626',
                borderRadius: '12px', marginBottom: '20px',
                fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.5
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    style={{
                      width: '100%', height: '50px',
                      paddingLeft: '42px', paddingRight: '14px',
                      borderRadius: '14px', border: '1.5px solid #CBD5E1',
                      backgroundColor: '#F8FAFC', color: '#0F172A',
                      fontSize: '0.92rem', fontWeight: 600, outline: 'none',
                      boxSizing: 'border-box', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#F8FAFC'; }}
                  />
                </div>
              </div>

              {/* Phone or Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phone Number or Email *
                </label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. 0557922593 or you@email.com"
                    style={{
                      width: '100%', height: '50px',
                      paddingLeft: '42px', paddingRight: '14px',
                      borderRadius: '14px', border: '1.5px solid #CBD5E1',
                      backgroundColor: '#F8FAFC', color: '#0F172A',
                      fontSize: '0.92rem', fontWeight: 600, outline: 'none',
                      boxSizing: 'border-box', transition: 'all 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.1)'; e.target.style.backgroundColor = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none'; e.target.style.backgroundColor = '#F8FAFC'; }}
                  />
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Additional Info <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={17} style={{ position: 'absolute', left: '14px', top: '14px', color: '#94A3B8' }} />
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="e.g. I registered with email X, now can't access it…"
                    rows={3}
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px',
                      borderRadius: '14px', border: '1.5px solid #CBD5E1',
                      backgroundColor: '#F8FAFC', color: '#0F172A',
                      fontSize: '0.88rem', fontWeight: 500, outline: 'none',
                      resize: 'none', boxSizing: 'border-box', lineHeight: 1.5
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: '52px', borderRadius: '14px', border: 'none',
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 20px -4px rgba(37,99,235,0.4)',
                  transition: 'all 0.25s', marginTop: '4px'
                }}
              >
                {loading ? (
                  <><Loader size={20} className="animate-spin" /> Sending Request...</>
                ) : (
                  <>Submit Reset Request <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.25))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px', border: '1px solid rgba(16,185,129,0.3)'
            }}>
              <CheckCircle2 size={38} style={{ color: '#10B981' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>
              Request Submitted! ✅
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
              Your password reset request has been received. Our admin team will contact <strong>{identifier}</strong> via WhatsApp or phone call shortly.
            </p>

            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
              border: '1px solid #A7F3D0', borderRadius: '16px',
              marginBottom: '24px', fontSize: '0.85rem', color: '#065F46', lineHeight: 1.6
            }}>
              <strong>⏱️ Response time:</strong> Usually within a few hours during business hours (8am – 8pm).
            </div>

            {/* Direct WhatsApp Button */}
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                width: '100%', height: '50px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                textDecoration: 'none', marginBottom: '12px',
                boxShadow: '0 6px 16px -4px rgba(37,211,102,0.5)'
              }}
            >
              <MessageSquare size={18} /> Message Admin on WhatsApp Now
            </a>

            <Link
              href="/login"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                color: '#64748B', fontSize: '0.83rem', fontWeight: 600, textDecoration: 'none'
              }}
            >
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        )}

        {/* Footer WhatsApp pill */}
        {!submitted && (
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '10px' }}>
              Prefer to contact directly?
            </p>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(37,211,102,0.1)',
                border: '1px solid rgba(37,211,102,0.3)',
                borderRadius: '20px', color: '#15803D',
                fontSize: '0.82rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                textDecoration: 'none'
              }}
            >
              <MessageSquare size={13} style={{ color: '#25D366' }} />
              WhatsApp Admin: 0557922593
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
