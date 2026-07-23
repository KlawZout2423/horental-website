'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

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
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '44px 32px',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AlertTriangle size={36} />
        </div>

        <div>
          <h1 style={{
            fontSize: '1.6rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Something Went Wrong
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            An unexpected error occurred while loading this page. Please try refreshing or return to the homepage.
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
          <button
            onClick={() => reset()}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '150px', padding: '12px 20px', fontWeight: 700 }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <Link
            href="/"
            className="btn btn-outline"
            style={{ flex: 1, minWidth: '150px', padding: '12px 20px', fontWeight: 600 }}
          >
            <Home size={16} /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
