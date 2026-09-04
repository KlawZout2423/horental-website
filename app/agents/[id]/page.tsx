'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MessageCircle, ShieldCheck, MapPin, Building, PlusCircle, ChevronDown, ChevronUp, Heart, Check } from 'lucide-react';
import { useAuth } from '../../../lib/auth';
import { graphqlRequest, GET_AGENT, GET_AGENT_PROPERTIES } from '../../../lib/graphql';
import { Property, getPricePeriodLabel, getOptimizedImageUrl, getStatusLabel } from '../../../lib/types';
import VerifiedAgentModal from '../../../components/VerifiedAgentModal';
import styles from './agent.module.css';
import propStyles from '../../properties/properties.module.css';

interface AgentData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  bio?: string;
  profileImage?: string;
  agentLocation?: string;
  verificationStatus?: string;
}

export default function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const agentId = resolvedParams.id;
  const { user } = useAuth();
  const isOwnProfile = Boolean(user && String(user.id) === String(agentId));

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Load saved bookmarks from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('saved_properties');
      if (stored) {
        try {
          setSavedIds(JSON.parse(stored));
        } catch (err) {
          console.error('Error parsing saved properties from localStorage:', err);
        }
      }
    }
  }, []);

  const handleCloseVerifyModal = () => {
    setShowVerifyModal(false);
  };

  const handleAcceptVerifyModal = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agreed_agent_disclaimer', 'true');
    }
    setShowVerifyModal(false);
  };

  const handleToggleSave = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please log in to save properties.');
      return;
    }
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((savedId) => savedId !== id) : [...prev, id];
      if (typeof window !== 'undefined') {
        localStorage.setItem('saved_properties', JSON.stringify(next));
      }
      return next;
    });
  };

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

        const isAuthorizedViewer = user && (user.role === 'admin' || String(user.id) === String(agentId));
        if (agentRes.user.verificationStatus !== 'verified' && !isAuthorizedViewer) {
          setError('This agent account is currently pending verification and is not publicly visible.');
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

      <div className={styles.pageLayout}>
        {/* Sidebar Column */}
        <aside className={styles.sidebar}>
          {/* Agent Info Banner — collapse/expand on mobile */}
          <div className={styles.profileCard}>
            {/* High-fidelity abstract gradient cover banner (desktop only) */}
            <div className={styles.coverBanner} />

            {/* ── Always-visible collapsed strip ── */}
            <div
              className={styles.collapsedStrip}
              onClick={() => setProfileExpanded(v => !v)}
              role="button"
              aria-expanded={profileExpanded}
              aria-label="Toggle agent profile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div className={styles.avatarContainer}>
                  {agent.profileImage ? (
                    <img src={agent.profileImage} alt={agent.name} className={styles.avatarImage} />
                  ) : (
                    agent.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <h1 className={styles.agentName}>{agent.name}</h1>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVerifyModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '0.74rem', fontWeight: 700, marginTop: '3px', cursor: 'pointer' }}
                    title="Click for Agent Verification Guarantee"
                  >
                    <ShieldCheck size={12} /> Verified Agent
                  </div>
                  {agent.agentLocation && (
                    <div className={styles.desktopLocationRow}>
                      <MapPin size={13} style={{ color: 'var(--primary)', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', verticalAlign: 'middle' }}>{agent.agentLocation}</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Toggle icon — only visible on mobile */}
              <span className={styles.toggleIcon}>
                {profileExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </div>

            {/* ── Expandable detail section ── */}
            <div className={`${styles.expandableSection} ${profileExpanded ? styles.expandableOpen : ''}`}>
              <div className={styles.profileInfo}>
                {agent.bio && (
                  <p className={styles.agentBio}>
                    {agent.bio}
                  </p>
                )}

                {/* Stats Row */}
                <div className={styles.statsRow}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Listed</span>
                    <strong className={styles.statVal}>{properties.length}</strong>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Available</span>
                    <strong className={styles.statVal} style={{ color: '#10B981' }}>
                      {properties.filter((p) => p.status === 'available').length}
                    </strong>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Occupied</span>
                    <strong className={styles.statVal}>
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
                      <PlusCircle size={18} /> Add New Listing
                    </Link>
                  ) : (
                    agent.phone && (
                      <>
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ${agent.name}, I am contacting you regarding your property listings on HO Rentals to arrange a viewing.`)}`}
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
                          <Phone size={16} /> Call Agent
                        </a>
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

      {/* Listings Column */}
      <main className={styles.mainContent}>

      {/* Properties Listed Section Header */}
      <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className={styles.sectionTitle}>
            {isOwnProfile ? `Welcome ${user?.name || 'Agent'}! Your Listed Properties` : `Properties Listed by ${agent.name}`} ({properties.length})
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {isOwnProfile ? 'Manage your active listings and track inquiries.' : `Explore verified rentals managed by ${agent.name}.`}
          </p>
        </div>
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
        <div className={propStyles.grid}>
          {properties.map((p, index) => {
            const isSaved = savedIds.includes(p.id);
            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className={`${propStyles.propertyCard} animate-slide-up`}
                style={{ animationDelay: `${index * 50}ms`, textDecoration: 'none', color: 'inherit' }}
              >
                <div className={propStyles.imageWrapper}>
                  <img
                    src={getOptimizedImageUrl(p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80', 500)}
                    alt={p.title}
                    className={propStyles.propertyImage}
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
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

                  {/* Heart save button */}
                  <button
                    onClick={(e) => handleToggleSave(e, p.id)}
                    className={propStyles.saveButton}
                    aria-label="Save listing"
                  >
                    <Heart size={16} fill={isSaved ? 'var(--primary)' : 'none'} color={isSaved ? 'var(--primary)' : 'currentColor'} />
                  </button>
                </div>

                <div className={propStyles.cardContent}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge badge-${p.status === 'available' ? 'available' : p.status === 'rented' || p.status === 'occupied' ? 'rented' : 'pending'}`} style={{ padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px', fontWeight: 700 }}>
                      {getStatusLabel(p.status, p.type)}
                    </span>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-secondary)', textTransform: 'none', fontWeight: 600, padding: '3px 9px', fontSize: '0.72rem', borderRadius: '12px' }}>
                      {p.type}
                    </span>
                  </div>

                  <h3 className={propStyles.cardTitle} style={{ marginTop: '2px', marginBottom: '6px', fontSize: '1.05rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    {p.title}
                  </h3>

                  <div className={propStyles.cardMetaRow} style={{ marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div className={propStyles.cardLocation} style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ color: 'var(--primary)' }} />
                      <span>{p.location.toLowerCase().includes('ho') ? p.location : `${p.location}, Ho`}</span>
                    </div>
                    {p.digitalAddress && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary-dark)', backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px' }}>
                        🇬🇭 {p.digitalAddress}
                      </span>
                    )}
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
              </Link>
            );
          })}
        </div>
      )}
      </main>
      </div>

      <VerifiedAgentModal
        isOpen={showVerifyModal}
        onClose={handleCloseVerifyModal}
        onAccept={handleAcceptVerifyModal}
        agentName={agent?.name}
        requireAgreement={true}
      />
    </div>
  );
}
