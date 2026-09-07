'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import { useAuth } from '../../lib/auth';
import { graphqlRequest, GET_AGENT_PROPERTIES, GET_CONTACT_LOGS, UPDATE_AGENT_PROFILE } from '../../lib/graphql';
import { Property, getPricePeriodLabel, getStatusLabel, getOptimizedImageUrl } from '../../lib/types';
import { Building, MessageCircle, CheckCircle, Clock, XCircle, Upload, ShieldCheck, User, Phone, MapPin, RefreshCw, Loader, Lock } from 'lucide-react';

interface ContactLogItem {
  id: number;
  customerName: string;
  customerPhone: string;
  actionType: string;
  landlordPhone: string;
  createdAt: string;
  property?: { id: string; title: string; location: string };
}

export default function DashboardPage() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<ContactLogItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'leads' | 'profile'>('overview');
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Profile edit states
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Role guard: only agents, landlords, and admins can access this page
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/dashboard');
        return;
      }
      if (user.role !== 'agent' && user.role !== 'landlord' && user.role !== 'admin') {
        router.push('/');
        return;
      }
    }
  }, [user, authLoading, router]);

  // Pre-fill profile edit fields
  useEffect(() => {
    if (user) {
      setEditBio(user.bio || '');
      setEditLocation(user.agentLocation || '');
      setEditWhatsapp(user.agentWhatsapp || '');
    }
  }, [user]);

  // Load real data
  useEffect(() => {
    if (!authLoading && user && (user.role === 'agent' || user.role === 'landlord' || user.role === 'admin')) {
      loadData();
    }
  }, [user, authLoading]);

  async function loadData() {
    setLoadingData(true);
    try {
      const userId = typeof user!.id === 'string' ? parseInt(user!.id, 10) : user!.id;
      const [propsData, leadsData] = await Promise.all([
        graphqlRequest<{ agentProperties: Property[] }>(GET_AGENT_PROPERTIES, {
          userId,
          includePrivate: true,
        }),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS).catch(() => ({ contactLogs: [] })),
      ]);
      if (propsData?.agentProperties) setProperties(propsData.agentProperties);
      if (leadsData?.contactLogs) setLeads(leadsData.contactLogs);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load dashboard data.', isError: true });
    } finally {
      setLoadingData(false);
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBio.trim()) {
      setMessage({ text: 'Bio cannot be empty (minimum 10 characters recommended).', isError: true });
      return;
    }
    if (!editLocation.trim()) {
      setMessage({ text: 'Service area / location is required.', isError: true });
      return;
    }
    if (!editWhatsapp.trim()) {
      setMessage({ text: 'WhatsApp contact number is required.', isError: true });
      return;
    }
    const cleanPhone = editWhatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setMessage({ text: 'Please enter a valid WhatsApp phone number (at least 9 digits).', isError: true });
      return;
    }
    setSavingProfile(true);
    setMessage(null);
    try {
      const data = await graphqlRequest<{ updateAgentProfile: any }>(UPDATE_AGENT_PROFILE, {
        bio: editBio.trim(),
        agentLocation: editLocation.trim(),
        agentWhatsapp: editWhatsapp.trim(),
        profileImage: user?.profileImage || null,
      });
      if (data?.updateAgentProfile) {
        updateUser({ ...user!, ...data.updateAgentProfile });
        setMessage({ text: '✅ Profile updated successfully.', isError: false });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to save profile.', isError: true });
    } finally {
      setSavingProfile(false);
    }
  };

  // Derived stats
  const totalProperties = properties.length;
  const availableCount = properties.filter(p => p.status === 'available').length;
  const pendingCount = properties.filter(p => p.status === 'pending_approval').length;
  const rentedCount = properties.filter(p => p.status === 'rented' || p.status === 'occupied').length;

  const filteredProperties = filterStatus === 'all'
    ? properties
    : properties.filter(p => p.status === filterStatus);

  const isVerified = user?.verificationStatus === 'verified';
  const isPending = user?.verificationStatus === 'pending';

  if (authLoading || (!user && !authLoading)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader size={36} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard…</p>
      </div>
    );
  }

  if (!user || (user.role !== 'agent' && user.role !== 'landlord' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandGroup}>
            <h1 className={styles.title}>My Dashboard</h1>
            <span className={styles.badgeSaaS} style={{ textTransform: 'capitalize' }}>
              {user.name} · {user.role}
            </span>
            {isVerified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#166534', color: '#86efac', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                <CheckCircle size={12} /> Verified
              </span>
            )}
            {isPending && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#92400e', color: '#fde68a', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                <Clock size={12} /> Verification Pending
              </span>
            )}
            {!isVerified && !isPending && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface-secondary)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', border: '1px solid var(--border)' }}>
                <XCircle size={12} /> Unverified
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              href="/upload"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary)', color: '#fff', padding: '0.55rem 1.1rem', borderRadius: '0.6rem', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', boxShadow: '0 2px 8px rgba(193, 18, 31, 0.25)' }}
            >
              <Upload size={16} /> Upload Property
            </Link>
            <button
              onClick={loadData}
              style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0.55rem 0.85rem', borderRadius: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
              title="Refresh data"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div style={{
          margin: '0 1.5rem 1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '0.65rem',
          background: message.isError ? '#450a0a' : '#052e16',
          color: message.isError ? '#fca5a5' : '#86efac',
          border: `1px solid ${message.isError ? '#991b1b' : '#166534'}`,
          fontSize: '0.88rem',
          fontWeight: 500,
        }}>
          {message.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <main className={styles.mainContent}>
        {/* Incomplete Agent Profile Banner */}
        {user.role === 'agent' && !user.isProfileComplete && (
          <div style={{
            margin: '0 0 1.25rem',
            padding: '1rem 1.25rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(193, 18, 31, 0.08))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Complete Your Agent Profile Setup
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Your agent profile is missing a bio, photo, or contact details. Complete your profile setup to appear on the agent directory and build trust with renters.
                </div>
              </div>
            </div>
            <Link
              href="/agent/setup"
              style={{
                background: 'var(--primary)',
                color: '#fff',
                padding: '0.55rem 1.1rem',
                borderRadius: '0.5rem',
                fontWeight: 700,
                fontSize: '0.84rem',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(193, 18, 31, 0.25)'
              }}
            >
              Complete Setup &rarr;
            </Link>
          </div>
        )}

        <div className={styles.tabBar}>
          {([
            { key: 'overview', label: '📊 Overview', icon: null },
            { key: 'properties', label: `🏡 My Listings (${totalProperties})`, icon: null },
            { key: 'leads', label: '⭐ Premium Features', icon: null },
            { key: 'profile', label: '👤 My Profile', icon: null },
          ] as const).map(tab => (
            <button
              key={tab.key}
              className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Verification Banner (if unverified) */}
        {!isVerified && !isPending && activeTab === 'overview' && (
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid #f59e0b55',
            borderRadius: '0.85rem',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={28} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#fde68a', marginBottom: '2px' }}>Your account is not yet verified</div>
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                  Submit your Ghana Card ID for verification. Verified agents get a trust badge and higher listing visibility.
                </div>
              </div>
            </div>
            <Link
              href="/upload"
              style={{ background: '#f59e0b', color: '#000', fontWeight: 700, padding: '0.6rem 1.2rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              Get Verified →
            </Link>
          </div>
        )}

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Total Listings</span>
                  <Building size={20} style={{ color: '#6366f1' }} />
                </div>
                <div className={styles.metricValue}>{loadingData ? '—' : totalProperties}</div>
                <div className={styles.metricSubtext}>Properties you've submitted</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Live / Available</span>
                  <CheckCircle size={20} style={{ color: '#22c55e' }} />
                </div>
                <div className={styles.metricValue} style={{ color: '#22c55e' }}>{loadingData ? '—' : availableCount}</div>
                <div className={styles.metricSubtext}>Currently visible to tenants</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Pending Approval</span>
                  <Clock size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div className={styles.metricValue} style={{ color: '#f59e0b' }}>{loadingData ? '—' : pendingCount}</div>
                <div className={styles.metricSubtext}>Awaiting admin review</div>
              </div>

              <div className={styles.metricCard} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(234,88,12,0.08) 100%)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel} style={{ color: '#f59e0b' }}>Premium Package</span>
                  <Lock size={18} style={{ color: '#f59e0b' }} />
                </div>
                <div style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 800, margin: '6px 0 4px' }}>🔒 Locked</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Leads · Analytics · Priority · Badge
                </div>
                <button
                  onClick={() => setActiveTab('leads')}
                  style={{ marginTop: '10px', fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer' }}
                >
                  View Package →
                </button>
              </div>
            </div>

            {/* Listing Quota & Monthly Billing Card */}
            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ minWidth: '240px', flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    🏷️ Listing Quota &amp; Direct Billing
                  </span>
                  <span style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: totalProperties > 2 ? '#FEF3C7' : '#ECFDF5',
                    color: totalProperties > 2 ? '#92400E' : '#047857'
                  }}>
                    {totalProperties <= 2 ? `Free Tier (${totalProperties}/2 used)` : `${totalProperties - 2} Extra Billable (${(totalProperties - 2) * 10} GH₵/mo)`}
                  </span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: '600px' }}>
                  • <strong>First 2 Listings:</strong> 100% Free Forever<br />
                  • <strong>3rd+ Listings:</strong> GH₵ 10.00 / property / month • Direct MoMo: <strong>0204940602</strong> (Ref: <em>{user.name}</em>)
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: 'auto' }}>
                <a
                  href={`https://wa.me/233204940602?text=${encodeURIComponent(`Hello HO Rentals, I am agent ${user.name} (${user.phone || ''}). I would like to confirm my monthly listing subscription / activate extra properties.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#25D366', borderColor: '#25D366', flex: '1 1 auto' }}
                >
                  💬 WhatsApp Support
                </a>
                <Link
                  href="/upload"
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: '1 1 auto' }}
                >
                  ➕ Post New Listing
                </Link>
              </div>
            </div>

            {/* Recent Listings Preview */}
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Listings</h2>
              <button className={styles.actionBtnPrimary} onClick={() => setActiveTab('properties')}>
                View All →
              </button>
            </div>

            {loadingData ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <Loader size={28} style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                Loading your listings…
              </div>
            ) : properties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <Building size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>No properties yet. <Link href="/upload" style={{ color: 'var(--primary)' }}>Upload your first listing →</Link></p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className={styles.propertyCell}>
                            <img
                              src={getOptimizedImageUrl(p.imageUrl, 120)}
                              alt={p.title}
                              className={styles.propertyThumb}
                            />
                            <div>
                              <div className={styles.propertyTitle}>{p.title}</div>
                              <div className={styles.propertyLoc}>{p.location}</div>
                            </div>
                          </div>
                        </td>
                        <td><strong>GH₵ {p.price.toLocaleString()}</strong> {getPricePeriodLabel(p.description)}</td>
                        <td>{p.type}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '99px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background:
                              p.status === 'available' ? 'rgba(16, 185, 129, 0.15)' :
                              p.status === 'pending_approval' ? 'rgba(245, 158, 11, 0.15)' :
                              p.status === 'rented' || p.status === 'occupied' ? 'var(--bg-surface-secondary)' : 'var(--bg-surface-secondary)',
                            color:
                              p.status === 'available' ? '#059669' :
                              p.status === 'pending_approval' ? '#d97706' :
                              p.status === 'rented' || p.status === 'occupied' ? 'var(--text-secondary)' : 'var(--text-muted)',
                            border: `1px solid ${
                              p.status === 'available' ? 'rgba(16, 185, 129, 0.3)' :
                              p.status === 'pending_approval' ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'
                            }`
                          }}>
                            {p.status === 'pending_approval' ? 'Pending Approval' : getStatusLabel(p.status, p.type)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: MY LISTINGS ─── */}
        {activeTab === 'properties' && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>My Property Listings</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  All listings you have submitted. Pending listings are invisible to the public until approved by admin.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ background: 'var(--bg-surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '0.65rem 1rem', borderRadius: '0.65rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="rented">Rented</option>
                  <option value="occupied">Occupied</option>
                </select>
                <Link
                  href="/upload"
                  className={styles.actionBtnPrimary}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={14} /> Add Listing
                </Link>
              </div>
            </div>

            {loadingData ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading…</div>
            ) : filteredProperties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <p>No listings found for this filter.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Property</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className={styles.propertyCell}>
                            <img src={getOptimizedImageUrl(p.imageUrl, 120)} alt={p.title} className={styles.propertyThumb} />
                            <div>
                              <div className={styles.propertyTitle}>{p.title}</div>
                              <div className={styles.propertyLoc}>{p.location}</div>
                            </div>
                          </div>
                        </td>
                        <td><strong>GH₵ {p.price.toLocaleString()}</strong></td>
                        <td>{p.type}</td>
                        <td>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '99px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background:
                              p.status === 'available' ? '#14532d' :
                              p.status === 'pending_approval' ? '#92400e' :
                              p.status === 'rented' || p.status === 'occupied' ? '#1e3a5f' : '#1e293b',
                            color:
                              p.status === 'available' ? '#86efac' :
                              p.status === 'pending_approval' ? '#fde68a' :
                              p.status === 'rented' || p.status === 'occupied' ? '#93c5fd' : '#94a3b8',
                          }}>
                            {p.status === 'pending_approval' ? '⏳ Pending Approval' : getStatusLabel(p.status, p.type)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td>
                          <Link
                            href={`/properties/${p.id}`}
                            style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 0.85rem', borderRadius: '0.4rem', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: PREMIUM FEATURES ─── */}
        {activeTab === 'leads' && (
          <div>
            {/* Hero Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1c1133 50%, #0f172a 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '1rem',
              padding: '2rem 2rem 1.5rem',
              marginBottom: '1.5rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>&#11088;</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fde68a', lineHeight: 1.2 }}>HO Rentals Premium</div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>Everything you need to grow your rental business</div>
                  </div>
                </div>
                <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, margin: '0 0 1.25rem', maxWidth: '620px' }}>
                  Upgrade to the <strong style={{ color: '#fbbf24' }}>Premium Package</strong> to unlock a complete suite of tools &mdash; from direct tenant leads to per-property analytics &mdash; designed to help you close more rentals, faster.
                </p>
                <a
                  href={`https://wa.me/233204940602?text=${encodeURIComponent(`Hello HO Rentals, I am agent ${user?.name || ''} and I'd like to learn about upgrading to the Premium Package.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', color: '#fff', fontWeight: 800, padding: '0.7rem 1.5rem', borderRadius: '0.6rem', textDecoration: 'none', fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
                >
                  &#128172; Contact Us to Upgrade
                </a>
              </div>
            </div>

            {/* Feature Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#128203;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Direct Tenant Leads</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>See every tenant who clicked Call or WhatsApp on your listings &mdash; with their name and phone number. Never miss a serious inquiry.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#128202;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Property Analytics</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>Track views, WhatsApp clicks, and call conversions per property. Understand which listings perform best and optimise your portfolio.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#11088;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Priority Listing</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>Your properties appear at the top of search results and get a Featured badge, giving you significantly more visibility over free-tier listings.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#128737;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Verified Agent Badge</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>A green Verified badge on your profile and all your listings builds trust with tenants and increases the likelihood they contact you directly.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#128276;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Instant Lead Alerts</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>Get notified immediately via WhatsApp or SMS whenever a tenant makes an inquiry on any of your properties &mdash; respond first, close faster.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
              <div style={{ background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', borderRadius: '0.85rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(193,18,31,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>&#127960;</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Unlimited Listings</div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>List as many properties as you manage, with no per-listing monthly fees. One flat Premium rate covers your entire portfolio.</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={12} /> Premium Feature</div>
              </div>
            </div>

            {/* Upgrade CTA Footer */}
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.06))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '0.85rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#fde68a', fontSize: '0.95rem', marginBottom: '4px' }}>Ready to grow your business?</div>
                <div style={{ color: '#94a3b8', fontSize: '0.83rem' }}>Contact us on WhatsApp to activate your Premium Package today.</div>
              </div>
              <a
                href={`https://wa.me/233204940602?text=${encodeURIComponent(`Hello HO Rentals, I am agent ${user?.name || ''} and I'd like to activate the Premium Package.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#25D366', color: '#fff', fontWeight: 700, padding: '0.65rem 1.25rem', borderRadius: '0.55rem', textDecoration: 'none', fontSize: '0.88rem', whiteSpace: 'nowrap' }}
              >
                &#128172; WhatsApp Us Now
              </a>
            </div>
          </div>
        )}

        {/* ─── TAB 4: MY PROFILE ─── */}
        {activeTab === 'profile' && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>My Agent Profile</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Your public profile visible to tenants on your agent page.
                </p>
              </div>
              {user && (
                <Link
                  href={`/agents/${user.id}`}
                  style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}
                  target="_blank"
                >
                  View Public Profile →
                </Link>
              )}
            </div>

            <div className={styles.metricCard} style={{ maxWidth: '600px' }}>
              {/* Current info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt={user.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{user?.email}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Phone size={12} /> {user?.phone || 'No phone set'}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>Bio / Introduction *</label>
                  <textarea
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    placeholder="Write a short bio about yourself as an agent…"
                    rows={4}
                    required
                    style={{ width: '100%', background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    Service Area / Location *
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    placeholder="e.g. Ho, Volta Region"
                    required
                    style={{ width: '100%', background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '6px', fontWeight: 600 }}>
                    <Phone size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    value={editWhatsapp}
                    onChange={e => setEditWhatsapp(e.target.value)}
                    placeholder="e.g. 0241234567"
                    required
                    style={{ width: '100%', background: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '0.5rem', padding: '0.75rem', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className={styles.actionBtnPrimary}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '0.5rem' }}
                >
                  {savingProfile ? <><Loader size={14} /> Saving…</> : '💾 Save Profile'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}