'use client';

import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function ForgotPasswordPage() {
  const waMsg = encodeURIComponent(
    `Hi HO Rentals, I need help resetting my account password. Please assist me.`
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #780B13 0%, #C1121F 50%, #9E0E18 100%)',
      padding: '24px 16px',
      fontFamily: "var(--font-family, 'Inter', sans-serif)"
    }}>
      <div style={{
        width: '100%', maxWidth: '360px',
        background: '#FFFFFF',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        padding: '36px 28px',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Back */}
        <Link href="/login" style={{
          position: 'absolute', top: '18px', left: '18px',
          display: 'flex', alignItems: 'center', gap: '4px',
          color: '#94A3B8', fontSize: '0.78rem', fontWeight: 600,
          textDecoration: 'none'
        }}>
          <ArrowLeft size={13} /> Sign In
        </Link>

        {/* Icon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366, #128C7E)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px', boxShadow: '0 8px 20px rgba(37,211,102,0.35)'
        }}>
          <MessageSquare size={28} style={{ color: '#fff' }} />
        </div>

        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          Reset Password
        </h1>
        <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 24px', lineHeight: 1.6 }}>
          Message our admin on WhatsApp and we'll reset your password for you.
        </p>

        <a
          href={`https://wa.me/233557922593?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', height: '50px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', fontSize: '0.95rem', fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(37,211,102,0.4)'
          }}
        >
          <MessageSquare size={18} /> Message Admin on WhatsApp
        </a>

        <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '14px 0 0' }}>
          0557922593 · Mon–Sun 8am–8pm
        </p>
      </div>
    </div>
  );
}
