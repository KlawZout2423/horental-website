import { redirect } from 'next/navigation';

// /agent/dashboard is a legacy/alternate route — redirect to the main agent dashboard
export default function AgentDashboardRedirect() {
  redirect('/dashboard');
}
