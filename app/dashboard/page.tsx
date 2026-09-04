'use client';

import React, { useState } from 'react';
import styles from './dashboard.module.css';
import {
  MOCK_SAAS_METRICS,
  MOCK_SAAS_PROPERTIES,
  MOCK_SAAS_LEADS,
  MOCK_SUBSCRIPTION_PLANS,
  SaaSProperty,
  SubscriptionPlan,
} from '../../lib/mockSaaSData';

import { useAuth } from '../../lib/auth';

export default function SaaSPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<'agent' | 'landlord' | 'admin'>(
    user?.role === 'landlord' ? 'landlord' : user?.role === 'admin' ? 'admin' : 'agent'
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'leads' | 'subscription' | 'verification'>('overview');
  const [properties, setProperties] = useState<SaaSProperty[]>(MOCK_SAAS_PROPERTIES);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [newProp, setNewProp] = useState({ title: '', location: '', price: '', type: 'Apartment', landlordName: '', landlordPhone: '' });

  // Add Property Handler
  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.title || !newProp.price) return;
    const added: SaaSProperty = {
      id: Date.now(),
      title: newProp.title,
      location: newProp.location || 'Ho, Volta Region',
      price: parseFloat(newProp.price),
      period: 'month',
      type: newProp.type,
      status: 'pending_verification',
      landlordName: newProp.landlordName || 'Agent Direct',
      landlordPhone: newProp.landlordPhone || '+233 24 000 0000',
      isVerified: false,
      featured: false,
      views: 1,
      leads: 0,
      imageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setProperties([added, ...properties]);
    setShowAddModal(false);
    setNewProp({ title: '', location: '', price: '', type: 'Apartment', landlordName: '', landlordPhone: '' });
  };

  const filteredProperties = properties.filter((p) => {
    if (filterType === 'all') return true;
    return p.status === filterType;
  });

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brandGroup}>
            <h1 className={styles.title}>HO Rentals SaaS</h1>
            <span className={styles.badgeSaaS}>Platform Workspace</span>
            {user && (
              <span className="badge badge-primary" style={{ fontSize: '0.72rem', textTransform: 'capitalize', marginLeft: '6px' }}>
                {user.name} ({user.role})
              </span>
            )}
          </div>

          <div className={styles.roleSwitcher}>
            <button
              className={`${styles.roleBtn} ${role === 'agent' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('agent')}
            >
              🏢 Agent Portal
            </button>
            <button
              className={`${styles.roleBtn} ${role === 'landlord' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('landlord')}
            >
              🔑 Landlord View
            </button>
            <button
              className={`${styles.roleBtn} ${role === 'admin' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('admin')}
            >
              🛡️ Admin SaaS
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className={styles.mainContent}>
        {/* Navigation Tabs */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview & Metrics
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'properties' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            🏡 Managed Properties ({properties.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'leads' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            💬 Tenant Leads & Inquiries
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'subscription' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            💳 SaaS Subscription Tiers
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'verification' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            ✅ Verification & Anti-Fraud
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Total Managed Properties</span>
                  <span className={styles.metricIcon}>🏘️</span>
                </div>
                <div className={styles.metricValue}>{MOCK_SAAS_METRICS.totalProperties}</div>
                <div className={styles.metricSubtext}>+3 added this week</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Active Tenant Leads</span>
                  <span className={styles.metricIcon}>📈</span>
                </div>
                <div className={styles.metricValue}>{MOCK_SAAS_METRICS.totalLeads}</div>
                <div className={styles.metricSubtext}>Conv. Rate {MOCK_SAAS_METRICS.conversionRate}</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Current SaaS Plan</span>
                  <span className={styles.metricIcon}>💎</span>
                </div>
                <div className={styles.metricValue} style={{ fontSize: '1.35rem', color: '#6366f1' }}>
                  {MOCK_SAAS_METRICS.currentPlan}
                </div>
                <div className={styles.metricSubtext}>Active until {MOCK_SAAS_METRICS.planExpiry}</div>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                  <span className={styles.metricLabel}>Commission Earned (GH₵)</span>
                  <span className={styles.metricIcon}>💰</span>
                </div>
                <div className={styles.metricValue}>GH₵ {MOCK_SAAS_METRICS.revenueGenerated.toLocaleString()}</div>
                <div className={styles.metricSubtext}>+18% vs last month</div>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Property Submissions</h2>
              <button className={styles.actionBtnPrimary} onClick={() => setShowAddModal(true)}>
                + Register New Property
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Property Info</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Views / Leads</th>
                    <th>Landlord</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.slice(0, 3).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.propertyCell}>
                          <img src={p.imageUrl} alt={p.title} className={styles.propertyThumb} />
                          <div>
                            <div className={styles.propertyTitle}>{p.title}</div>
                            <div className={styles.propertyLoc}>{p.location}</div>
                          </div>
                        </div>
                      </td>
                      <td><strong>GH₵ {p.price.toLocaleString()}</strong> /{p.period}</td>
                      <td>{p.type}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          p.status === 'available' ? styles.statusAvailable :
                          p.status === 'pending_verification' ? styles.statusPending :
                          p.status === 'rented' ? styles.statusRented : styles.statusFlagged
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>👁️ {p.views} | 💬 {p.leads}</td>
                      <td>{p.landlordName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Properties */}
        {activeTab === 'properties' && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Property Portfolio Management</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Filter and inspect properties managed under your SaaS profile.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '0.65rem 1rem',
                    borderRadius: '0.65rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="rented">Rented</option>
                  <option value="flagged">Flagged</option>
                </select>

                <button className={styles.actionBtnPrimary} onClick={() => setShowAddModal(true)}>
                  + Add Property
                </button>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Property</th>
                    <th>Price</th>
                    <th>Verification</th>
                    <th>Status</th>
                    <th>Leads</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProperties.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.propertyCell}>
                          <img src={p.imageUrl} alt={p.title} className={styles.propertyThumb} />
                          <div>
                            <div className={styles.propertyTitle}>{p.title}</div>
                            <div className={styles.propertyLoc}>{p.location}</div>
                          </div>
                        </div>
                      </td>
                      <td><strong>GH₵ {p.price.toLocaleString()}</strong></td>
                      <td>
                        {p.isVerified ? (
                          <span className={styles.verifiedBadge}>Verified Landlord</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>Unverified</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${
                          p.status === 'available' ? styles.statusAvailable :
                          p.status === 'pending_verification' ? styles.statusPending :
                          p.status === 'rented' ? styles.statusRented : styles.statusFlagged
                        }`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>💬 {p.leads} inquiries</td>
                      <td>
                        <button
                          style={{
                            background: '#334155',
                            border: 'none',
                            color: '#f8fafc',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => alert(`Managing property: ${p.title}`)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Leads */}
        {activeTab === 'leads' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Tenant Inquiries & Lead Conversion Inbox</h2>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tenant Name</th>
                    <th>Phone Contact</th>
                    <th>Property Interested</th>
                    <th>Channel</th>
                    <th>Lead Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SAAS_LEADS.map((lead) => (
                    <tr key={lead.id}>
                      <td><strong>{lead.customerName}</strong></td>
                      <td>{lead.customerPhone}</td>
                      <td>{lead.propertyTitle}</td>
                      <td>
                        <span style={{
                          color: lead.actionType === 'whatsapp' ? '#22c55e' : '#38bdf8',
                          fontWeight: 'bold',
                          fontSize: '0.85rem'
                        }}>
                          {lead.actionType.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusBadge} style={{ background: '#334155', color: '#cbd5e1' }}>
                          {lead.status}
                        </span>
                      </td>
                      <td>
                        <a
                          href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#22c55e',
                            color: '#ffffff',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            fontWeight: '600'
                          }}
                        >
                          WhatsApp Chat
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Subscriptions */}
        {activeTab === 'subscription' && (
          <div>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>SaaS Pricing & Subscription Plans</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Select a subscription plan tailored for independent landlords, verified agents, and property management agencies.
                </p>
              </div>
            </div>

            <div className={styles.planGrid}>
              {MOCK_SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`${styles.planCard} ${plan.popular ? styles.planCardPopular : ''}`}
                >
                  {plan.popular && <span className={styles.popularTag}>Most Popular</span>}
                  <div>
                    <div className={styles.planName}>{plan.name}</div>
                    <div className={styles.planPrice}>
                      GH₵ {plan.price} <span>/ month</span>
                    </div>
                    <ul className={styles.planFeatures}>
                      <li>
                        <span className={styles.featureCheck}>✓</span>
                        {plan.propertyLimit === -1 ? 'Unlimited Property Listings' : `Up to ${plan.propertyLimit} Active Listings`}
                      </li>
                      <li>
                        <span className={styles.featureCheck}>✓</span>
                        {plan.featuredLimit} Featured Listing Boosts
                      </li>
                      <li>
                        <span className={styles.featureCheck}>✓</span>
                        {plan.verificationIncluded ? 'Priority Landlord Verification Badge' : 'Standard Unverified Profile'}
                      </li>
                      <li>
                        <span className={styles.featureCheck}>✓</span>
                        {plan.whatsappBoost ? 'Direct WhatsApp Lead Redirection' : 'Basic Contact Log Only'}
                      </li>
                    </ul>
                  </div>

                  <button
                    className={styles.actionBtnPrimary}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      width: '100%',
                      background: plan.popular ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : '#334155'
                    }}
                  >
                    {plan.price === 0 ? 'Current Free Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Verification */}
        {activeTab === 'verification' && (
          <div>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Verification & Anti-Fraud Center</h2>
            </div>
            <div className={styles.metricCard} style={{ marginBottom: '1.5rem', background: '#1e293b' }}>
              <h3 style={{ color: '#38bdf8', marginTop: 0 }}>🛡️ How Landlord Verification Protects Tenants</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>
                Every verified landlord or agent submits a valid National ID (Ghana Card) and property ownership documentation.
                Verified listings display a blue trust badge on HO Rentals, increasing lead conversion by up to <strong>350%</strong>.
              </p>
              <button
                className={styles.actionBtnPrimary}
                onClick={() => alert('Verification Document Upload Requested!')}
              >
                Upload Ghana Card & Ownership Documents
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Upgrade Plan Modal */}
      {selectedPlan && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <button className={styles.closeBtn} onClick={() => setSelectedPlan(null)}>×</button>
            <h2 style={{ marginTop: 0, color: '#ffffff' }}>Subscribe to {selectedPlan.name}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Total Billing: <strong style={{ color: '#38bdf8' }}>GH₵ {selectedPlan.price} / month</strong>
            </p>

            <div style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                style={{
                  background: '#00c3f8',
                  color: '#000',
                  padding: '0.85rem',
                  borderRadius: '0.65rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
                onClick={() => {
                  alert(`Simulating Paystack Checkout for GH₵ ${selectedPlan.price}... Success!`);
                  setSelectedPlan(null);
                }}
              >
                💳 Pay with Paystack (Card / MoMo)
              </button>

              <button
                style={{
                  background: '#ffcc00',
                  color: '#000',
                  padding: '0.85rem',
                  borderRadius: '0.65rem',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
                onClick={() => {
                  alert(`Simulating Mobile Money Prompt (MTN / Telecel / AT)... Payment Completed!`);
                  setSelectedPlan(null);
                }}
              >
                📱 Instant MoMo Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalBox}>
            <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
            <h2 style={{ marginTop: 0, color: '#ffffff' }}>Register New Property (SaaS Form)</h2>
            <form onSubmit={handleAddProperty} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Property Title (e.g. 2-Bedroom Apartment)"
                value={newProp.title}
                onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                required
                style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem' }}
              />
              <input
                type="text"
                placeholder="Location (e.g. Ho Bankoe, Volta Region)"
                value={newProp.location}
                onChange={(e) => setNewProp({ ...newProp, location: e.target.value })}
                style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem' }}
              />
              <input
                type="number"
                placeholder="Price (GH₵ per month)"
                value={newProp.price}
                onChange={(e) => setNewProp({ ...newProp, price: e.target.value })}
                required
                style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem' }}
              />
              <select
                value={newProp.type}
                onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem' }}
              >
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Commercial">Commercial</option>
                <option value="Short Stay">Short Stay</option>
              </select>

              <button type="submit" className={styles.actionBtnPrimary} style={{ marginTop: '0.5rem' }}>
                Save & Register Property
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
