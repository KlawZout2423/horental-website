'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Phone, MessageCircle, ShieldCheck, MapPin, Building, PlusCircle } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { graphqlRequest, GET_AGENT, GET_AGENT_PROPERTIES } from '../../../lib/graphql';
import { Property, getPricePeriodLabel, getOptimizedImageUrl } from '../../../lib/types';
import styles from './agent.module.css';

interface AgentData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  bio?: string;
  profileImage?: string;
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const { user } = useAuth();
  const isOwnProfile = Boolean(user && String(user.id) === String(agentId));

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgentData() {
      try {
        setLoading(true);
        const parsedId = parseInt(agentId, 10);
        if (isNaN(parsedId)) {
          setError('Invalid agent identifier.');
          return;
        }

        const [agentRes, propsRes] = await Promise.all([
          graphqlRequest<{ user: AgentData | null }>(GET_AGENT, { id: parsedId }),
          graphqlRequest<{ agentProperties: Property[] }>(GET_AGENT_PROPERTIES, {
            userId: parsedId,
            includePrivate: Boolean(user && String(user.id) === String(agentId)),
          })
        ]);

        if (!agentRes || !agentRes.user) {
          setError('Agent profile not found.');
          return;
        }

        setAgent(agentRes.user);
        setProperties(propsRes?.agentProperties || []);
      } catch (err: any) {
        console.error('Error fetching agent data:', err);
        setError(err.message || 'Failed to load agent profile.');
      } finally {
        setLoading(false);
      }
    }

    if (agentId) {
      loadAgentData();
    }
  }, [agentId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading agent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to Browse
        </Link>
        <div className={styles.emptyState}>
          <h2>Agent Not Found</h2>
          <p style={{ marginTop: '8px' }}>{error || 'This agent profile does not exist or has been deactivated.'}</p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = agent.phone ? agent.phone.replace(/[^0-9+]/g, '') : '';
  const waPhone = cleanPhone.startsWith('0') ? `233${cleanPhone.slice(1)}` : cleanPhone.replace('+', '');

  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Browse
      </Link>

      {/* Agent Info Banner */}
      <div className={styles.profileCard}>
        <div className={styles.avatarContainer}>
          {agent.profileImage ? (
            <img src={agent.profileImage} alt={agent.name} className={styles.avatarImage} />
          ) : (
            agent.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.agentBadge}>
            <ShieldCheck size={14} />
            Verified Rental Agent
          </div>

          <h1 className={styles.agentName}>{agent.name}</h1>

          <p className={styles.agentBio}>
            {agent.bio ||
              `Independent rental agent on HO Rentals. Contact directly to arrange viewings and inquiries for the listings below.`}
          </p>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: '16px', margin: '14px 0', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Listed</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{properties.length}</strong>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Available</span>
              <strong style={{ fontSize: '0.95rem', color: '#10B981' }}>
                {properties.filter((p) => p.status === 'available').length}
              </strong>
            </div>
            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Rented / Occupied</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                {properties.filter((p) => p.status === 'rented' || p.status === 'occupied').length}
              </strong>
            </div>
          </div>

          <div className={styles.contactRow}>
            {isOwnProfile ? (
              <Link
                href="/upload"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '30px', fontWeight: 700, textDecoration: 'none' }}
              >
                <PlusCircle size={18} /> + Add New Listing to My Portfolio
              </Link>
            ) : (
              agent.phone && (
                <>
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${agent.name}, I am contacting you regarding your property listings on HO Rentals.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.contactBtn} ${styles.whatsappBtn}`}
                  >
                    <MessageCircle size={16} /> WhatsApp Agent
                  </a>
                  <a
                    href={`tel:${agent.phone}`}
                    className={`${styles.contactBtn} ${styles.callBtn}`}
                  >
                    <Phone size={16} /> Call {agent.phone}
                  </a>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Properties Listed Section Header */}
      <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className={styles.sectionTitle}>
          Properties listed by {isOwnProfile ? 'You' : agent.name} ({properties.length})
        </h2>
        {isOwnProfile && (
          <Link
            href="/upload"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '20px', textDecoration: 'none', fontWeight: 700 }}
          >
            <PlusCircle size={15} /> + Add Listing
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <div className={styles.emptyState}>
          <Building size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <h3>No Active Listings</h3>
          <p>{isOwnProfile ? "You haven't posted any property listings yet. Click '+ Add Listing' above to get started." : 'This agent currently does not have any active approved listings.'}</p>
        </div>
      ) : (
        <div className={styles.propertiesGrid}>
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card" style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '65%', backgroundColor: 'var(--bg-surface-secondary)' }}>
                  <img
                    src={getOptimizedImageUrl(p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80', 600)}
                    alt={p.title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Status badge — pending shown only to owner */}
                  {p.status === 'pending_approval' ? (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(245, 158, 11, 0.92)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
                      ⏳ Pending Approval
                    </div>
                  ) : (
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} /> Verified Property
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {p.type}
                  </div>
                </div>

                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.title}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '12px' }}>
                    <MapPin size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.location}</span>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                      GH₵ {p.price.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {getPricePeriodLabel(p.type)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
