import React, { Suspense } from 'react';
import AgentRegisterForm from '../../landlord-registration/agent-register-form';

export const metadata = {
  title: 'Register as an Agent | HO Rentals Ghana',
  description: 'Join HO Rentals as a verified agent or property manager to list rooms, hostels, apartments, and commercial spaces across Ho & Ghana.',
};

export default function RegisterAgentPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center' }}>Loading Agent Registration...</div>}>
      <AgentRegisterForm />
    </Suspense>
  );
}
