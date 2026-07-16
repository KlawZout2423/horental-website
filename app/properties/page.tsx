import React, { Suspense } from 'react';
import PropertiesClient from './properties-client';

export const metadata = {
  title: 'Search Rentals | HO Rentals',
  description: 'Search and filter student hostels, apartments, and single rooms near your campus.',
};

export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Loading rental listings...</p>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    }>
      <PropertiesClient />
    </Suspense>
  );
}
