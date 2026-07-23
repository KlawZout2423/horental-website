'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import UploadPage from '../upload/page';
import { 
  graphqlRequest, 
  GET_DASHBOARD_STATS, 
  GET_USERS, 
  GET_PROPERTIES, 
  DELETE_PROPERTY, 
  DELETE_USER, 
  UPDATE_USER_ROLE, 
  UPDATE_PROPERTY,
  GET_CONTACT_LOGS,
  TOGGLE_FEATURED
} from '../../lib/graphql';
import { Trash2, Users, Building, Loader, PieChart, BarChart3, MapPin, LogOut, Home, RefreshCw, CheckCircle, Activity, Plus, Edit, Star } from 'lucide-react';
import styles from './admin.module.css';

interface DashboardStats {
  totalProperties: number;
  totalUsers: number;
  availableProperties: number;
  rentedProperties: number;
  totalPageVisits: number;
  todayPageVisits: number;
}

import { User, Property } from '../../lib/types';

interface ContactLogItem {
  id: number;
  customerName: string;
  customerPhone: string;
  actionType: string;
  landlordPhone: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    location: string;
  };
}

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Navigation & loaders
  const [activeTab, setActiveTab] = useState<'analytics' | 'properties' | 'users' | 'moderation' | 'audits' | 'upload'>('analytics');
  const [contactLogs, setContactLogs] = useState<ContactLogItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Property States
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editHasWifi, setEditHasWifi] = useState(false);
  const [editHasCctv, setEditHasCctv] = useState(false);
  const [editHasFurnished, setEditHasFurnished] = useState(false);
  const [editHasGatedFenced, setEditHasGatedFenced] = useState(false);
  const [editIsNewlyBuilt, setEditIsNewlyBuilt] = useState(false);
  const [editHasBed, setEditHasBed] = useState(false);
  const [editHasStudyDesk, setEditHasStudyDesk] = useState(false);
  const [editGhanaWaterShared, setEditGhanaWaterShared] = useState(false);
  const [editGhanaWaterSeparate, setEditGhanaWaterSeparate] = useState(false);
  const [editPolytank, setEditPolytank] = useState(false);
  const [editBorehole, setEditBorehole] = useState(false);
  const [editWell, setEditWell] = useState(false);
  const [editEcgSharedMeter, setEditEcgSharedMeter] = useState(false);
  const [editEcgSeparateMeter, setEditEcgSeparateMeter] = useState(false);
  const [editEcgPostPaid, setEditEcgPostPaid] = useState(false);
  const [editEcgPrepaid, setEditEcgPrepaid] = useState(false);
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editPricePeriod, setEditPricePeriod] = useState('semester');
  const [isCleaningMedia, setIsCleaningMedia] = useState(false);

  const handleRunStorageCleanup = async () => {
    if (!confirm('Scan and delete all orphaned/unused images from Cloudinary storage and database?')) {
      return;
    }
    setIsCleaningMedia(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/cleanup-orphaned-images', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cleanup failed');
      
      setMessage({
        text: `🧹 ${data.message} (${data.stats?.reclaimedSpaceMB || '0 MB'} reclaimed)`,
        isError: false,
      });
      loadAdminDashboardData();
    } catch (err: any) {
      setMessage({
        text: err.message || 'Storage cleanup failed.',
        isError: true,
      });
    } finally {
      setIsCleaningMedia(false);
    }
  };

  // Filter Helper lists
  const approvedProperties = properties;

  // Security Redirect: Only allow Admin role
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load Admin Data on Mount
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminDashboardData();
    }
  }, [user]);

  async function loadAdminDashboardData() {
    setLoadingData(true);
    try {
      const [statsData, usersData, propertiesData, logsData] = await Promise.all([
        graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS),
        graphqlRequest<{ users: User[] }>(GET_USERS),
        graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS)
      ]);

      if (statsData) setStats(statsData.dashboardStats);
      if (usersData) setUsers(usersData.users);
      if (propertiesData) setProperties(propertiesData.properties);
      if (logsData && logsData.contactLogs) setContactLogs(logsData.contactLogs);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setMessage({ text: err.message || 'Failed to fetch dashboard data.', isError: true });
    } finally {
      setLoadingData(false);
    }
  }

  // Analytics helper variables
  const typeCounts = properties.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {});

  const locationCounts = properties.reduce<Record<string, number>>((acc, p) => {
    const loc = p.location.split(',')[0].trim();
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});

  const sortedLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const colorsList = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

  // Actions
  const handleTogglePropertyStatus = async (id: string, currentStatus: string) => {
    setActionLoading(true);
    setMessage(null);
    const newStatus = currentStatus === 'available' ? 'rented' : 'available';
    try {
      const prop = properties.find((p) => p.id === id);
      if (!prop) throw new Error('Property not found');

      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) throw new Error('Invalid property ID format');

      const input = {
        title: prop.title,
        location: prop.location,
        price: prop.price,
        type: prop.type,
        status: newStatus,
        description: prop.description || '',
        contact: prop.contact || '',
        imageUrl: prop.imageUrl || '',
      };

      await graphqlRequest(UPDATE_PROPERTY, { id: parsedId, input });
      
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);
      setMessage({ text: `Property status updated to ${newStatus}.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update property status.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing permanently?')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(id);
      await graphqlRequest(DELETE_PROPERTY, { id: isNaN(parsedId) ? id : parsedId });
      setProperties((prev) => prev.filter((p) => p.id !== id));
      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);
      setMessage({ text: 'Listing deleted successfully.', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete property.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) throw new Error('Invalid property ID.');
      const result = await graphqlRequest<{ togglePropertyFeatured: { id: string; isFeatured: boolean } }>(
        TOGGLE_FEATURED,
        { id: parsedId }
      );
      const newFeatured = result.togglePropertyFeatured.isFeatured;
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: newFeatured } : p))
      );
      setMessage({
        text: newFeatured
          ? '⭐ Property is now featured on the landing page.'
          : 'Property removed from featured listings.',
        isError: false,
      });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to toggle featured status.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(userId);
      await graphqlRequest(UPDATE_USER_ROLE, { 
        id: isNaN(parsedId) ? userId : parsedId, 
        role: newRole 
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setMessage({ text: `User role updated to ${newRole}.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update user role.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user account permanently?')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(userId);
      await graphqlRequest(DELETE_USER, { id: isNaN(parsedId) ? userId : parsedId });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);
      setMessage({ text: 'User account deleted successfully.', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete user.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (p: Property) => {
    setEditingProperty(p);
    setEditTitle(p.title);
    setEditLocation(p.location);
    setEditPrice(p.price.toString());
    setEditType(p.type || 'Student Hostel');
    setEditStatus(p.status || 'available');
    setEditContact(p.contact || '');
    setEditIsFeatured(p.isFeatured || false);
    
    const desc = p.description?.toLowerCase() || '';
    setEditHasWifi(desc.includes('wi-fi') || desc.includes('wifi'));
    setEditHasCctv(desc.includes('cctv') || desc.includes('camera'));
    setEditHasFurnished(desc.includes('furnished'));
    setEditHasGatedFenced(desc.includes('gated') || desc.includes('fenced'));
    setEditIsNewlyBuilt(desc.includes('newly built') || desc.includes('newly-built'));
    setEditHasBed(desc.includes('bed'));
    setEditHasStudyDesk(desc.includes('desk') || desc.includes('study desk'));
    
    // Parse detailed water supply options
    setEditGhanaWaterShared(desc.includes('ghana water (shared)'));
    setEditGhanaWaterSeparate(desc.includes('ghana water (separate)'));
    setEditPolytank(desc.includes('polytank'));
    setEditBorehole(desc.includes('borehole'));
    setEditWell(desc.includes('well'));
    
    // Parse detailed meter options
    setEditEcgSharedMeter(desc.includes('ecg shared meter') || desc.includes('shared meter'));
    setEditEcgSeparateMeter(desc.includes('ecg separate meter') || desc.includes('separate meter') || desc.includes('seprate meter'));
    setEditEcgPostPaid(desc.includes('ecg post-paid') || desc.includes('post-paid') || desc.includes('postpaid'));
    setEditEcgPrepaid(desc.includes('ecg prepaid') || desc.includes('prepaid'));

    // Parse price period
    if (desc.includes('priceperiod: per month') || desc.includes('priceperiod: month') || desc.includes('per month')) {
      setEditPricePeriod('month');
    } else if (desc.includes('priceperiod: per year') || desc.includes('priceperiod: year') || desc.includes('per year')) {
      setEditPricePeriod('year');
    } else {
      setEditPricePeriod('semester');
    }

    const featuresIndex = p.description ? p.description.indexOf('\n\nFeatures:') : -1;
    if (featuresIndex !== -1 && p.description) {
      setEditDescription(p.description.substring(0, featuresIndex).trim());
    } else {
      setEditDescription(p.description || '');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const parsedPrice = parseFloat(editPrice);
      if (isNaN(parsedPrice)) throw new Error('Invalid price value.');

      let finalDescription = editDescription.trim();
      const amenitiesList: string[] = [];
      
      const otherOptions: string[] = [];
      if (editHasWifi) otherOptions.push('WiFi');
      if (editHasCctv) otherOptions.push('CCTV Camera');
      if (editHasFurnished) otherOptions.push('Furnished');
      if (editHasGatedFenced) otherOptions.push('Gated & Fenced');
      if (editIsNewlyBuilt) otherOptions.push('Newly Built');
      if (editHasBed) otherOptions.push('Bed');
      if (editHasStudyDesk) otherOptions.push('Study Desk');
      if (otherOptions.length > 0) {
        amenitiesList.push(`Amenities: ${otherOptions.join(', ')}`);
      }

      // Compile detailed water options
      const waterOptions: string[] = [];
      if (editGhanaWaterShared) waterOptions.push('Ghana Water (Shared)');
      if (editGhanaWaterSeparate) waterOptions.push('Ghana Water (Separate)');
      if (editPolytank) waterOptions.push('Polytank');
      if (editBorehole) waterOptions.push('Borehole');
      if (editWell) waterOptions.push('Well');
      if (waterOptions.length > 0) {
        amenitiesList.push(`Water: ${waterOptions.join(', ')}`);
      }

      // Compile detailed meter options
      const meterOptions: string[] = [];
      if (editEcgSharedMeter) meterOptions.push('ECG Shared Meter');
      if (editEcgSeparateMeter) meterOptions.push('ECG Separate Meter');
      if (editEcgPostPaid) meterOptions.push('ECG Post-paid');
      if (editEcgPrepaid) meterOptions.push('ECG Prepaid');
      if (meterOptions.length > 0) {
        amenitiesList.push(`Electricity: ${meterOptions.join(', ')}`);
      }

      if (amenitiesList.length > 0) {
        finalDescription += `\n\nFeatures: ${amenitiesList.join(' | ')}`;
      }

      finalDescription += `\n\nPricePeriod: per ${editPricePeriod}`;

      const input = {
        title: editTitle,
        location: editLocation,
        price: parsedPrice,
        type: editType,
        status: editStatus,
        description: finalDescription,
        contact: editContact,
        imageUrl: editingProperty.imageUrl || '',
        isFeatured: editIsFeatured,
      };

      const parsedId = parseInt(editingProperty.id, 10);
      await graphqlRequest(UPDATE_PROPERTY, { 
        id: isNaN(parsedId) ? editingProperty.id : parsedId, 
        input 
      });

      setProperties((prev) =>
        prev.map((p) =>
          p.id === editingProperty.id
            ? { 
                ...p, 
                title: editTitle, 
                location: editLocation, 
                price: parsedPrice, 
                type: editType, 
                status: editStatus, 
                description: finalDescription, 
                contact: editContact,
                isFeatured: editIsFeatured,
              }
            : p
        )
      );

      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);

      setMessage({ text: 'Listing updated successfully.', isError: false });
      setEditingProperty(null);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update property details.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Checking administration privileges...</p>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      
      {/* Side Navigation panel */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandIcon}>
            <Building size={18} />
          </div>
          <span className={styles.brandName}>HO Rentals</span>
        </div>

        <div className={styles.sidebarSection}>
          <span className={styles.sidebarSectionTitle}>System Management</span>
          <nav className={styles.sidebarNav}>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`${styles.navItem} ${activeTab === 'analytics' ? styles.activeNavItem : ''}`}
            >
              <PieChart size={16} />
              <span>Overview Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`${styles.navItem} ${activeTab === 'properties' ? styles.activeNavItem : ''}`}
            >
              <Building size={16} />
              <span>Active Listings</span>
              <span className={styles.navCountBadge}>{approvedProperties.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`${styles.navItem} ${activeTab === 'users' ? styles.activeNavItem : ''}`}
            >
              <Users size={16} />
              <span>User Directory</span>
              <span className={styles.navCountBadge}>{users.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('audits')}
              className={`${styles.navItem} ${activeTab === 'audits' ? styles.activeNavItem : ''}`}
            >
              <Activity size={16} />
              <span>Contact Audit Logs</span>
              <span className={styles.navCountBadge}>{contactLogs.length}</span>
            </button>

            {/* Standard Nav Item for Upload Action */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`${styles.navItem} ${activeTab === 'upload' ? styles.activeNavItem : ''}`}
              style={{ marginTop: '12px', borderTop: '1px solid #1E293B', paddingTop: '16px', borderRadius: '0' }}
            >
              <Plus size={16} />
              <span>Upload Property</span>
            </button>
          </nav>
        </div>

        {/* Footer Admin info inside Sidebar */}
        <div className={styles.sidebarFooter}>
          <div className={styles.profileBrief}>
            <div className={styles.profileAvatar}>
              {user.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className={styles.profileText}>
              <span className={styles.profileName}>{user.name || 'Administrator'}</span>
              <span className={styles.profileRole}>{user.role.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => router.push('/')} className={styles.sidebarHomeBtn}>
              <Home size={14} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
              Customer Site
            </button>
            <button onClick={logout} className={styles.sidebarLogoutBtn}>
              <LogOut size={14} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace content area */}
      <main className={styles.mainContent}>
        
        {/* Top Header bar with Breadcrumbs */}
        <header className={styles.topHeader}>
          <div className={styles.breadcrumbs}>
            <span className={styles.breadcrumbRoot}>HO Rentals</span>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbActive}>
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'properties' && 'Properties'}
              {activeTab === 'users' && 'Users'}
              {activeTab === 'audits' && 'Audit Logs'}
              {activeTab === 'upload' && 'Upload Property'}
            </span>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              onClick={handleRunStorageCleanup} 
              disabled={isCleaningMedia}
              className="btn btn-outline" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', height: '36px', gap: '6px', color: '#F59E0B', borderColor: '#F59E0B' }}
              title="Scan and delete unreferenced/orphaned images from Cloudinary storage"
            >
              <Trash2 size={14} className={isCleaningMedia ? 'animate-spin' : ''} />
              {isCleaningMedia ? 'Cleaning Storage...' : 'Clean Unused Media'}
            </button>
            <button 
              onClick={loadAdminDashboardData} 
              disabled={loadingData}
              className="btn btn-outline" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', height: '36px', gap: '6px' }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {/* Content Body Container */}
        <div className={styles.contentBody}>
          <h1 className={styles.pageTitle}>
            {activeTab === 'analytics' && 'Overview Analytics'}
            {activeTab === 'properties' && 'Property Listings'}
            {activeTab === 'users' && 'Account Manager'}
            {activeTab === 'audits' && 'Contact Inquiry Audits'}
            {activeTab === 'upload' && 'List a New Property'}
          </h1>
          <p className={styles.pageSubtitle}>
            {activeTab === 'analytics' && 'Overview statistics and performance distribution metrics.'}
            {activeTab === 'properties' && 'View, search, edit availability, and delete published property listings.'}
            {activeTab === 'users' && 'Manage registered accounts and adjust credentials and system roles.'}
            {activeTab === 'audits' && 'Real-time record of customer call and WhatsApp inquiries to landlords.'}
            {activeTab === 'upload' && 'Upload hostels, rooms, or self-contained flats directly into the system database.'}
          </p>

          {/* Action Alerts / Messages */}
          {message && (
            <div style={{
              backgroundColor: message.isError ? 'var(--danger-light)' : 'var(--accent-light)',
              border: `1px solid ${message.isError ? 'var(--danger)' : 'var(--accent)'}`,
              color: message.isError ? 'var(--danger)' : 'var(--accent)',
              padding: '14px 20px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '28px',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span>{message.text}</span>
              <button 
                onClick={() => setMessage(null)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Render Stats Grid */}
          {loadingData ? (
            <div className={styles.statsGrid}>
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className={styles.statCard} style={{ opacity: 0.6, height: '112px' }}>
                  <div style={{ width: '40%', height: '14px', background: 'var(--border)', borderRadius: '4px' }}></div>
                  <div style={{ width: '60%', height: '32px', background: 'var(--border)', borderRadius: '4px', marginTop: '12px' }}></div>
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className={styles.statsGrid}>
              
              <div className={styles.statCard} style={{ borderLeft: '4px solid #3B82F6' }}>
                <span className={styles.statLabel}>User Registry</span>
                <span className={styles.statValue}>{stats.totalUsers}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Registered accounts</span>
              </div>
              
              <div className={styles.statCard} style={{ borderLeft: '4px solid #8B5CF6' }}>
                <span className={styles.statLabel}>Inventory Listings</span>
                <span className={styles.statValue} style={{ color: '#8B5CF6' }}>{stats.totalProperties}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active & pending properties</span>
              </div>
              
              <div className={styles.statCard} style={{ borderLeft: '4px solid var(--primary)' }}>
                <span className={styles.statLabel}>Space Occupancy</span>
                <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
                  {stats.rentedProperties} / {stats.totalProperties}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {stats.availableProperties} available space(s)
                </span>
              </div>
              
              <div className={styles.statCard} style={{ borderLeft: '4px solid #06B6D4' }}>
                <span className={styles.statLabel}>Traffic Views</span>
                <span className={styles.statValue} style={{ color: '#06B6D4' }}>
                  {stats.todayPageVisits || 0}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {stats.totalPageVisits || 0} total cumulative views
                </span>
              </div>
              
            </div>
          ) : null}

          {/* Render Tab Contents */}
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
              <Loader className="animate-spin" size={36} style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600 }}>Syncing records from database...</p>
            </div>
          ) : activeTab === 'analytics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Distribution Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
                
                {/* Property Types mix grid list */}
                <div className="card glass" style={{ padding: '28px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <PieChart size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Property Types Distribution</h3>
                  </div>
                  {Object.keys(typeCounts).length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No inventory listings to compute.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                      {Object.entries(typeCounts).map(([type, count], index) => {
                        const percentage = Math.round((count / properties.length) * 100);
                        const color = colorsList[index % colorsList.length];
                        return (
                          <div 
                            key={type} 
                            style={{ 
                              padding: '16px', 
                              backgroundColor: 'var(--bg-surface-secondary)', 
                              border: '1px solid var(--border)', 
                              borderRadius: 'var(--radius-sm)', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              justifyContent: 'space-between', 
                              gap: '12px', 
                              minHeight: '100px',
                              boxShadow: 'var(--shadow-xs)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.2 }}>
                                {type}
                              </span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: `1px solid ${color}`, color: color, flexShrink: 0 }}>
                                {percentage}%
                              </span>
                            </div>
                            <div>
                              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>listings</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Availability occupancy ratios circular ring card */}
                <div className="card glass" style={{ padding: '28px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Occupancy & Ratios</h3>
                  </div>
                  {stats && (() => {
                    const total = stats.totalProperties || 0;
                    const available = stats.availableProperties || 0;
                    const rented = stats.rentedProperties || 0;
                    const occupancyRate = total ? Math.round((rented / total) * 100) : 0;
                    const availableRate = total ? Math.round((available / total) * 100) : 0;

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '28px', justifyContent: 'center', minHeight: '180px', flexWrap: 'wrap' }}>
                        {/* SVG Donut Chart */}
                        <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                          <svg width="130" height="130" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                            {/* Background ring */}
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--border)"
                              strokeWidth="3"
                            />
                            {/* Rented slice (Primary color) */}
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--primary)"
                              strokeWidth="3.2"
                              strokeDasharray={`${occupancyRate}, 100`}
                            />
                            {/* Available slice (Accent color) */}
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="var(--accent)"
                              strokeWidth="3.2"
                              strokeDasharray={`${availableRate}, 100`}
                              strokeDashoffset={`-${occupancyRate}`}
                            />
                          </svg>
                          {/* Center text showing percentage */}
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{occupancyRate}%</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Rented</span>
                          </div>
                        </div>
                        
                        {/* Legend details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1, minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--primary)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Occupied / Rented</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rented} listings ({occupancyRate}%)</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--accent)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Available Space</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{available} listings ({availableRate}%)</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Capacity</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{total} published properties</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Regional metrics map pin locations */}
              <div className="card glass" style={{ padding: '28px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <MapPin size={20} style={{ color: 'var(--primary)' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Top Regional Hubs</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sortedLocations.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No regional location data available.</p>
                  ) : (
                    sortedLocations.map(([loc, count], index) => {
                      const percentage = properties.length ? Math.round((count / properties.length) * 100) : 0;
                      return (
                        <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)', alignItems: 'center', gap: '20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>
                              #{index + 1}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{loc}</span>
                              <div style={{ width: '100%', maxWidth: '240px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count} Properties</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          ) : activeTab === 'properties' ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Listing Info</th>
                    <th>Type</th>
                    <th>Price (GH₵)</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No listings found in the database.
                      </td>
                    </tr>
                  ) : (
                    approvedProperties.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img 
                              src={p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=60&q=80'} 
                              alt={p.title} 
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)', flexShrink: 0 }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</span>
                              {p.isFeatured && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#F59E0B' }}>
                                  <Star size={10} fill="#F59E0B" /> Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>{p.type}</td>
                        <td style={{ fontWeight: 700 }}>{p.price.toLocaleString()}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{p.location}</td>
                        <td>
                          <span className={`badge badge-${p.status === 'available' ? 'available' : 'rented'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleTogglePropertyStatus(p.id, p.status)}
                              disabled={actionLoading}
                              className={`btn ${p.status === 'available' ? 'btn-secondary' : 'btn-outline'}`}
                              style={{ padding: '6px 14px', fontSize: '0.8rem', height: '32px' }}
                            >
                              {p.status === 'available' ? 'Mark Rented' : 'Mark Available'}
                            </button>

                            <button
                              onClick={() => handleToggleFeatured(p.id, p.isFeatured ?? false)}
                              disabled={actionLoading}
                              title={p.isFeatured ? 'Remove from featured' : 'Feature on landing page'}
                              className="btn btn-outline"
                              style={{
                                padding: '6px',
                                height: '32px',
                                width: '32px',
                                color: p.isFeatured ? '#F59E0B' : 'var(--text-muted)',
                                borderColor: p.isFeatured ? '#F59E0B' : 'var(--border)',
                                backgroundColor: p.isFeatured ? 'rgba(245,158,11,0.08)' : 'transparent',
                              }}
                            >
                              <Star size={14} fill={p.isFeatured ? '#F59E0B' : 'none'} />
                            </button>

                            <button
                              onClick={() => handleStartEdit(p)}
                              disabled={actionLoading}
                              className="btn btn-outline"
                              style={{ padding: '6px', height: '32px', width: '32px', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
                            >
                              <Edit size={14} />
                            </button>
                            
                            <button
                              onClick={() => handleDeleteProperty(p.id)}
                              disabled={actionLoading}
                              className="btn btn-outline"
                              style={{ padding: '6px', height: '32px', width: '32px', color: 'var(--danger)', borderColor: 'var(--border)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'users' ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email Address</th>
                    <th>Phone Number</th>
                    <th>System Role</th>
                    <th>Modify Role</th>
                    <th style={{ textAlign: 'right' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No users found in the database.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{u.email}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{u.phone || 'N/A'}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-available'}`} style={{ fontSize: '0.65rem' }}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            disabled={actionLoading || u.id === user.id}
                            className={styles.selectRole}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={actionLoading || u.id === user.id}
                              className="btn btn-outline"
                              style={{ padding: '6px', height: '32px', width: '32px', color: 'var(--danger)', borderColor: 'var(--border)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'audits' ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Customer Name</th>
                    <th>Customer Phone</th>
                    <th>Action</th>
                    <th>Landlord Number</th>
                    <th>Property Title</th>
                    <th>Property Location</th>
                  </tr>
                </thead>
                <tbody>
                  {contactLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No contact inquiry audit records found in the database.
                      </td>
                    </tr>
                  ) : (
                    contactLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                          {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.customerName}</td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{log.customerPhone}</td>
                        <td>
                          <span className={`badge badge-${log.actionType === 'call' ? 'available' : 'primary'}`} style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'uppercase' }}>
                            {log.actionType === 'call' ? '📞 Call' : '💬 WhatsApp'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{log.landlordPhone}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.property ? log.property.title : 'N/A (Deleted)'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {log.property ? log.property.location : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'upload' ? (
            <UploadPage isEmbedded={true} onSuccess={() => { setActiveTab('properties'); loadAdminDashboardData(); }} />
          ) : null}
        </div>
      </main>

      {editingProperty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Edit Property Details</h2>
              <button onClick={() => setEditingProperty(null)} className={styles.modalCloseBtn}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className={styles.editForm}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="form-control" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required className="form-control" />
                  </div>
                  
                  <div className="form-group">
                    <label>Price & Duration</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required className="form-control" style={{ flex: 1 }} />
                      <select value={editPricePeriod} onChange={(e) => setEditPricePeriod(e.target.value)} className="form-control" style={{ width: '130px', backgroundColor: 'var(--bg-surface)' }}>
                        <option value="semester">per semester</option>
                        <option value="month">per month</option>
                        <option value="year">per year</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Type / Category</label>
                    <select value={editType} onChange={(e) => setEditType(e.target.value)} required className="form-control" style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <option value="Student Hostel">Student Hostel</option>
                      <option value="Single Room">Single Room</option>
                      <option value="Chamber & Hall">Chamber & Hall</option>
                      <option value="Single Room SC">Single Room SC (Self-Contained)</option>
                      <option value="Chamber and Hall SC">Chamber & Hall SC (Self-Contained)</option>
                      <option value="Two Bedroom SC">Two Bedroom SC (Self-Contained)</option>
                      <option value="Three Bedroom SC">Three Bedroom SC (Self-Contained)</option>
                      <option value="Four Bedroom SC">Four Bedroom SC (Self-Contained)</option>
                      <option value="Furnitures">Furnitures</option>
                      <option value="Lands">Lands</option>
                      <option value="Shops">Shops</option>
                      <option value="Short Stay">Short Stay</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} required className="form-control" style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <option value="available">Available</option>
                      <option value="rented">Rented / Occupied</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Landlord Contact Number</label>
                  <input type="tel" value={editContact} onChange={(e) => setEditContact(e.target.value)} required className="form-control" />
                </div>

                <div className="form-group">
                  <label>Description & Details</label>
                  <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} required rows={4} className="form-control" style={{ resize: 'vertical' }} />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Key Features Included</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    
                    {/* Water source */}
                    <div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>💧 Water Supply</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editGhanaWaterShared} onChange={(e) => setEditGhanaWaterShared(e.target.checked)} />
                          <span>Ghana Water (Shared)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editGhanaWaterSeparate} onChange={(e) => setEditGhanaWaterSeparate(e.target.checked)} />
                          <span>Ghana Water (Separate)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editPolytank} onChange={(e) => setEditPolytank(e.target.checked)} />
                          <span>Polytank</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editBorehole} onChange={(e) => setEditBorehole(e.target.checked)} />
                          <span>Borehole</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editWell} onChange={(e) => setEditWell(e.target.checked)} />
                          <span>Well</span>
                        </label>
                      </div>
                    </div>

                    {/* Meter source */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>⚡ Electricity Meter</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editEcgSharedMeter} onChange={(e) => setEditEcgSharedMeter(e.target.checked)} />
                          <span>ECG Shared Meter</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editEcgSeparateMeter} onChange={(e) => setEditEcgSeparateMeter(e.target.checked)} />
                          <span>ECG Separate Meter</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editEcgPostPaid} onChange={(e) => setEditEcgPostPaid(e.target.checked)} />
                          <span>ECG Post-paid</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editEcgPrepaid} onChange={(e) => setEditEcgPrepaid(e.target.checked)} />
                          <span>ECG Prepaid</span>
                        </label>
                      </div>
                    </div>

                    {/* Other Amenities */}
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>📶 Other Amenities</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasWifi} onChange={(e) => setEditHasWifi(e.target.checked)} />
                          <span>WiFi</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasCctv} onChange={(e) => setEditHasCctv(e.target.checked)} />
                          <span>CCTV Camera</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasFurnished} onChange={(e) => setEditHasFurnished(e.target.checked)} />
                          <span>Furnished</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasGatedFenced} onChange={(e) => setEditHasGatedFenced(e.target.checked)} />
                          <span>Gated & Fenced</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editIsNewlyBuilt} onChange={(e) => setEditIsNewlyBuilt(e.target.checked)} />
                          <span>Newly Built</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasBed} onChange={(e) => setEditHasBed(e.target.checked)} />
                          <span>Bed</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
                          <input type="checkbox" checked={editHasStudyDesk} onChange={(e) => setEditHasStudyDesk(e.target.checked)} />
                          <span>Study Desk</span>
                        </label>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 700 }}>
                    <input type="checkbox" checked={editIsFeatured} onChange={(e) => setEditIsFeatured(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    <span>⭐ Promote / Feature on Landing Page (Paid Subscriber)</span>
                  </label>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setEditingProperty(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
