'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      backgroundColor: 'var(--bg)'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '48px 32px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          fontWeight: 800
        }}>
          404
        </div>

        <div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '-0.02em'
          }}>
            Page or Property Not Found
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            The listing or page you are looking for might have been taken down, rented out, or the URL might be incorrect.
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginTop: '8px',
          width: '100%'
        }}>
          <Link href="/properties" className="btn btn-primary" style={{ flex: 1, minWidth: '160px', padding: '12px 20px', fontWeight: 700 }}>
            <Search size={16} /> Browse Listings
          </Link>
          <Link href="/" className="btn btn-outline" style={{ flex: 1, minWidth: '160px', padding: '12px 20px', fontWeight: 600 }}>
            <Home size={16} /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
