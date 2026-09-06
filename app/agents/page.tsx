import React, { Suspense } from 'react';
import AgentsClient from './agents-client';

export const metadata = {
  title: 'Our Verified Agents | HO Rentals Ghana',
  description: 'Browse verified property agents and landlords on HO Rentals Ghana. Connect with trusted agents across Ho, Volta Region and beyond.',
};

export default function AgentsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading agents…</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    }>
      <AgentsClient />
    </Suspense>
  );
}
