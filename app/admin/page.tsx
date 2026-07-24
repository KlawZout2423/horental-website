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
  TOGGLE_FEATURED,
  GET_REPORTS,
  UPDATE_REPORT_STATUS,
  DELETE_REPORT,
  ADMIN_RESET_USER_PASSWORD
} from '../../lib/graphql';
import { Trash2, KeyRound, Users, Building, Loader, PieChart, BarChart3, MapPin, LogOut, Home, RefreshCw, CheckCircle, Activity, Plus, Edit, Star, Menu, X, Flag, AlertTriangle, UploadCloud, Image as ImageIcon } from 'lucide-react';
import styles from './admin.module.css';
import { getFriendlyErrorMessage } from '../../lib/types';

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

interface ReportItem {
  id: number;
  propertyId: number;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    location: string;
    price: number;
    imageUrl?: string;
  };
  reporter?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  
  // Navigation & loaders
  const [activeTab, setActiveTab] = useState<'analytics' | 'properties' | 'users' | 'moderation' | 'audits' | 'reports' | 'upload'>('analytics');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [contactLogs, setContactLogs] = useState<ContactLogItem[]>([]);
  const [auditFilter, setAuditFilter] = useState<'all' | 'call' | 'whatsapp' | 'book_viewing' | 'sms'>('all');
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Property States
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDigitalAddress, setEditDigitalAddress] = useState('');
  const [editLandmarks, setEditLandmarks] = useState('');
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
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

  // Lands Specific Edit States
  const [editLandPlotSize, setEditLandPlotSize] = useState('');
  const [editLandDocType, setEditLandDocType] = useState('Site Plan');
  const [editLandZoning, setEditLandZoning] = useState('Residential');

  // Furnitures Specific Edit States
  const [editFurnitureCondition, setEditFurnitureCondition] = useState('Brand New');
  const [editFurnitureCategory, setEditFurnitureCategory] = useState('Bed & Mattress');
  const [editFurnitureDelivery, setEditFurnitureDelivery] = useState('Buyer Pick-Up');

  const [isCleaningMedia, setIsCleaningMedia] = useState(false);

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingEditImage(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const res = await fetch('/api/upload-multiple', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Image upload failed');
      const data = await res.json();
      const urls: string[] = data.imageUrls || data.images || [];
      if (urls.length > 0) {
        setEditImageUrl(urls[0]);
        setMessage({ text: '📷 New property photo uploaded successfully.', isError: false });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to upload image.', isError: true });
    } finally {
      setIsUploadingEditImage(false);
    }
  };

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

  async function loadAdminDashboardData(showSpinner = true) {
    if (showSpinner && properties.length === 0) {
      setLoadingData(true);
    }
    try {
      const [statsData, usersData, propertiesData, logsData, reportsData] = await Promise.all([
        graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS),
        graphqlRequest<{ users: User[] }>(GET_USERS),
        graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS),
        graphqlRequest<{ reports: ReportItem[] }>(GET_REPORTS).catch(() => ({ reports: [] }))
      ]);

      if (statsData) setStats(statsData.dashboardStats);
      if (usersData) setUsers(usersData.users);
      if (propertiesData) setProperties(propertiesData.properties);
      if (logsData && logsData.contactLogs) setContactLogs(logsData.contactLogs);
      if (reportsData && reportsData.reports) setReports(reportsData.reports);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setMessage({ text: getFriendlyErrorMessage(err, 'Failed to fetch dashboard data.'), isError: true });
    } finally {
      setLoadingData(false);
    }
  }

  const handleUpdateReportStatus = async (reportId: number, newStatus: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      await graphqlRequest(UPDATE_REPORT_STATUS, { id: reportId, status: newStatus });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setMessage({ text: `Report marked as ${newStatus}.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update report status.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Remove this report log permanently?')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await graphqlRequest(DELETE_REPORT, { id: reportId });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setMessage({ text: 'Report record deleted.', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete report.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

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

  const DEFAULT_PASSWORD = 'HoRentals2025';
  const handleResetUserPassword = async (userId: string, userName: string, userIdentifier: string) => {
    if (!confirm(`Reset password for ${userName}?\n\nDefault password will be set to:\n"${DEFAULT_PASSWORD}"\n\nTell the user their new password after confirming.`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await graphqlRequest(ADMIN_RESET_USER_PASSWORD, {
        identifier: userIdentifier,
        newPassword: DEFAULT_PASSWORD,
      });
      setMessage({ text: `✅ Password for ${userName} reset to "${DEFAULT_PASSWORD}". Tell them to log in and change it.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to reset password.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (p: Property) => {
    setEditingProperty(p);
    setEditTitle(p.title);
    setEditLocation(p.location);
    setEditDigitalAddress(p.digitalAddress || '');
    setEditLandmarks(p.landmarks || '');
    setEditLatitude(p.latitude ?? null);
    setEditLongitude(p.longitude ?? null);
    setEditPrice(p.price.toString());
    setEditType(p.type || 'Student Hostel');
    setEditStatus(p.status || 'available');
    setEditContact(p.contact || '');
    setEditImageUrl(p.imageUrl || '');
    setEditIsFeatured(p.isFeatured || false);
    
    const desc = p.description || '';
    const descLower = desc.toLowerCase();
    
    setEditHasWifi(descLower.includes('wi-fi') || descLower.includes('wifi'));
    setEditHasCctv(descLower.includes('cctv') || descLower.includes('camera'));
    setEditHasFurnished(descLower.includes('furnished'));
    setEditHasGatedFenced(descLower.includes('gated') || descLower.includes('fenced'));
    setEditIsNewlyBuilt(descLower.includes('newly built') || descLower.includes('newly-built'));
    setEditHasBed(descLower.includes('bed'));
    setEditHasStudyDesk(descLower.includes('desk') || descLower.includes('study desk'));
    
    // Parse detailed water supply options
    setEditGhanaWaterShared(descLower.includes('ghana water (shared)'));
    setEditGhanaWaterSeparate(descLower.includes('ghana water (separate)'));
    setEditPolytank(descLower.includes('polytank'));
    setEditBorehole(descLower.includes('borehole'));
    setEditWell(descLower.includes('well'));
    
    // Parse detailed meter options
    setEditEcgSharedMeter(descLower.includes('ecg shared meter') || descLower.includes('shared meter'));
    setEditEcgSeparateMeter(descLower.includes('ecg separate meter') || descLower.includes('separate meter') || descLower.includes('seprate meter'));
    setEditEcgPostPaid(descLower.includes('ecg post-paid') || descLower.includes('post-paid') || descLower.includes('postpaid'));
    setEditEcgPrepaid(descLower.includes('ecg prepaid') || descLower.includes('prepaid'));

    // Parse category specs
    const plotMatch = desc.match(/Plot Size:\s*([^,|\n]+)/i);
    setEditLandPlotSize(plotMatch ? plotMatch[1].trim() : '');
    
    const docMatch = desc.match(/Title\/Docs:\s*([^,|\n]+)/i);
    setEditLandDocType(docMatch ? docMatch[1].trim() : 'Site Plan');

    const zoningMatch = desc.match(/Zoning:\s*([^,|\n]+)/i);
    setEditLandZoning(zoningMatch ? zoningMatch[1].trim() : 'Residential');

    const condMatch = desc.match(/Condition:\s*([^,|\n]+)/i);
    setEditFurnitureCondition(condMatch ? condMatch[1].trim() : 'Brand New');

    const catMatch = desc.match(/Category:\s*([^,|\n]+)/i);
    setEditFurnitureCategory(catMatch ? catMatch[1].trim() : 'Bed & Mattress');

    const delivMatch = desc.match(/Delivery:\s*([^,|\n]+)/i);
    setEditFurnitureDelivery(delivMatch ? delivMatch[1].trim() : 'Buyer Pick-Up');

    // Parse price period
    if (descLower.includes('priceperiod: per month') || descLower.includes('priceperiod: month') || descLower.includes('per month')) {
      setEditPricePeriod('month');
    } else if (descLower.includes('priceperiod: per year') || descLower.includes('priceperiod: year') || descLower.includes('per year')) {
      setEditPricePeriod('year');
    } else if (descLower.includes('priceperiod: per plot') || descLower.includes('priceperiod: plot') || descLower.includes('per plot')) {
      setEditPricePeriod('plot');
    } else if (descLower.includes('priceperiod: per acre') || descLower.includes('priceperiod: acre') || descLower.includes('per acre')) {
      setEditPricePeriod('acre');
    } else if (descLower.includes('outright sale')) {
      setEditPricePeriod('outright sale');
    } else {
      setEditPricePeriod('semester');
    }

    const featuresIndex = desc.indexOf('\n\nFeatures:');
    if (featuresIndex !== -1) {
      setEditDescription(desc.substring(0, featuresIndex).trim());
    } else {
      setEditDescription(desc);
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
      
      if (editType === 'Lands') {
        const landSpecs: string[] = [];
        if (editLandPlotSize.trim()) landSpecs.push(`Plot Size: ${editLandPlotSize.trim()}`);
        if (editLandDocType) landSpecs.push(`Title/Docs: ${editLandDocType}`);
        if (editLandZoning) landSpecs.push(`Zoning: ${editLandZoning}`);
        if (landSpecs.length > 0) {
          amenitiesList.push(`Land Specs: ${landSpecs.join(', ')}`);
        }
      } else if (editType === 'Furnitures') {
        const furnSpecs: string[] = [];
        if (editFurnitureCondition) furnSpecs.push(`Condition: ${editFurnitureCondition}`);
        if (editFurnitureCategory) furnSpecs.push(`Category: ${editFurnitureCategory}`);
        if (editFurnitureDelivery) furnSpecs.push(`Delivery: ${editFurnitureDelivery}`);
        if (furnSpecs.length > 0) {
          amenitiesList.push(`Furniture Specs: ${furnSpecs.join(', ')}`);
        }
      } else {
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
      }

      if (amenitiesList.length > 0) {
        finalDescription += `\n\nFeatures: ${amenitiesList.join(' | ')}`;
      }

      finalDescription += `\n\nPricePeriod: per ${editPricePeriod}`;

      const input = {
        title: editTitle,
        location: editLocation,
        digitalAddress: editDigitalAddress.trim() || undefined,
        landmarks: editLandmarks.trim() || undefined,
        latitude: editLatitude !== null ? editLatitude : undefined,
        longitude: editLongitude !== null ? editLongitude : undefined,
        price: parsedPrice,
        type: editType,
        status: editStatus,
        description: finalDescription,
        contact: editContact,
        imageUrl: editImageUrl.trim() || editingProperty.imageUrl || '',
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
                digitalAddress: editDigitalAddress.trim() || undefined,
                landmarks: editLandmarks.trim() || undefined,
                latitude: editLatitude !== null ? editLatitude : undefined,
                longitude: editLongitude !== null ? editLongitude : undefined,
                price: parsedPrice, 
                type: editType, 
                status: editStatus, 
                description: finalDescription, 
                contact: editContact,
                imageUrl: editImageUrl.trim() || editingProperty.imageUrl || '',
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
          <img src="/logo.png" alt="HO Rentals Logo" style={{ height: '30px', width: 'auto', objectFit: 'contain' }} />
          <span className={styles.brandName}>HO<span style={{ color: 'var(--primary)' }}>Rentals</span></span>
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

            <button
              onClick={() => setActiveTab('reports')}
              className={`${styles.navItem} ${activeTab === 'reports' ? styles.activeNavItem : ''}`}
              style={{
                borderLeft: reports.some((r) => r.status === 'pending') ? '3px solid #EF4444' : undefined,
                backgroundColor: activeTab === 'reports' ? undefined : (reports.some((r) => r.status === 'pending') ? 'rgba(239, 68, 68, 0.08)' : undefined)
              }}
            >
              <Flag size={16} style={{ color: reports.some((r) => r.status === 'pending') ? '#EF4444' : undefined }} />
              <span style={{ fontWeight: reports.some((r) => r.status === 'pending') ? 700 : 500 }}>Property Reports</span>
              <span 
                className={styles.navCountBadge} 
                style={{ 
                  backgroundColor: reports.some((r) => r.status === 'pending') ? '#EF4444' : undefined, 
                  color: reports.some((r) => r.status === 'pending') ? '#FFFFFF' : undefined 
                }}
              >
                {reports.filter((r) => r.status === 'pending').length}
              </span>
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
        
        {/* Top Header bar with Breadcrumbs & Mobile Hamburger */}
        <header className={styles.topHeader}>
          <div className={styles.breadcrumbs} style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="HO Rentals Logo" style={{ height: '24px', width: 'auto', objectFit: 'contain', marginRight: '8px' }} />
            <span className={styles.breadcrumbRoot}>HO Rentals</span>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbActive}>
              {activeTab === 'analytics' && 'Analytics'}
              {activeTab === 'properties' && 'Properties'}
              {activeTab === 'users' && 'Users'}
              {activeTab === 'audits' && 'Audit Logs'}
              {activeTab === 'reports' && 'Flagged Reports'}
              {activeTab === 'upload' && 'Upload Property'}
            </span>
          </div>

          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className={styles.mobileHamburgerBtn}
            aria-label="Open Admin Menu"
          >
            <Menu size={16} /> Admin Menu
          </button>
          
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
              onClick={() => loadAdminDashboardData()} 
              disabled={loadingData}
              className="btn btn-outline" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', height: '36px', gap: '6px' }}
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        {/* Mobile Slide-Over Admin Drawer Navigation */}
        {isMobileDrawerOpen && (
          <>
            <div className={styles.mobileDrawerOverlay} onClick={() => setIsMobileDrawerOpen(false)} />
            <div className={styles.mobileDrawerContent}>
              <div className={styles.sidebarBrand} style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src="/logo.png" alt="HO Rentals Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
                  <span className={styles.brandName}>HO<span style={{ color: 'var(--primary)' }}>Rentals</span></span>
                </div>
                <button 
                  onClick={() => setIsMobileDrawerOpen(false)} 
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                  aria-label="Close Admin Menu"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.sidebarSection}>
                <span className={styles.sidebarSectionTitle}>Navigation</span>
                <nav className={styles.sidebarNav}>
                  <button
                    onClick={() => { setActiveTab('analytics'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'analytics' ? styles.activeNavItem : ''}`}
                  >
                    <PieChart size={16} /> Overview Analytics
                  </button>
                  <button
                    onClick={() => { setActiveTab('properties'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'properties' ? styles.activeNavItem : ''}`}
                  >
                    <Building size={16} /> Active Listings ({approvedProperties.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('users'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'users' ? styles.activeNavItem : ''}`}
                  >
                    <Users size={16} /> User Directory ({users.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('audits'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'audits' ? styles.activeNavItem : ''}`}
                  >
                    <Activity size={16} /> Contact Audit Logs ({contactLogs.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('reports'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'reports' ? styles.activeNavItem : ''}`}
                  >
                    <Flag size={16} /> Flagged Reports ({reports.filter((r) => r.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('upload'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'upload' ? styles.activeNavItem : ''}`}
                    style={{ marginTop: '12px', borderTop: '1px solid #1E293B', paddingTop: '16px' }}
                  >
                    <Plus size={16} /> Upload Property
                  </button>
                </nav>

                <div style={{ marginTop: '20px', borderTop: '1px solid #1E293B', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    onClick={() => { handleRunStorageCleanup(); setIsMobileDrawerOpen(false); }} 
                    disabled={isCleaningMedia}
                    className={styles.sidebarHomeBtn}
                    style={{ color: '#F59E0B', borderColor: '#F59E0B', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Trash2 size={14} className={isCleaningMedia ? 'animate-spin' : ''} />
                    {isCleaningMedia ? 'Cleaning Storage...' : 'Clean Unused Media'}
                  </button>
                  <button 
                    onClick={() => { loadAdminDashboardData(); setIsMobileDrawerOpen(false); }} 
                    disabled={loadingData}
                    className={styles.sidebarHomeBtn}
                    style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} />
                    Refresh Data
                  </button>
                </div>
              </div>

              <div className={styles.sidebarFooter} style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <button onClick={() => { router.push('/'); setIsMobileDrawerOpen(false); }} className={styles.sidebarHomeBtn}>
                  <Home size={14} style={{ marginRight: '8px', display: 'inline' }} /> Customer Site
                </button>
                <button onClick={logout} className={styles.sidebarLogoutBtn} style={{ marginTop: '8px' }}>
                  <LogOut size={14} style={{ marginRight: '8px', display: 'inline' }} /> Logout
                </button>
              </div>
            </div>
          </>
        )}

        {/* Content Body Container */}
        <div className={styles.contentBody}>

          {activeTab !== 'upload' && (
            <>
              <h1 className={styles.pageTitle}>
                {activeTab === 'analytics' && 'Overview Analytics'}
                {activeTab === 'properties' && 'Property Listings'}
                {activeTab === 'users' && 'Account Manager'}
                {activeTab === 'audits' && 'Contact Inquiry Audits'}
                {activeTab === 'reports' && 'Property Reports & Flagged Listings'}
              </h1>
              <p className={styles.pageSubtitle}>
                {activeTab === 'analytics' && 'Overview statistics, inventory performance, and user-submitted listing flags.'}
                {activeTab === 'properties' && 'View, search, edit availability, and delete published property listings.'}
                {activeTab === 'users' && 'Manage registered accounts and adjust credentials and system roles.'}
                {activeTab === 'audits' && 'Real-time record of customer call and WhatsApp inquiries to landlords.'}
                {activeTab === 'reports' && 'Review user-flagged listings, reported scams, inaccurate photos, and manage property reports.'}
              </p>
            </>
          )}

          {/* Pending Reports Quick Banner Alert */}
          {reports.some((r) => r.status === 'pending') && activeTab !== 'reports' && (
            <div 
              onClick={() => setActiveTab('reports')}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                color: '#DC2626',
                padding: '12px 18px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '20px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <span>🚨 Attention Admin: You have <strong>{reports.filter((r) => r.status === 'pending').length} pending property report(s)</strong> requiring review.</span>
              <span style={{ textDecoration: 'underline', fontSize: '0.82rem' }}>Review Reports &rarr;</span>
            </div>
          )}

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

          {/* Render Stats Grid ONLY on Overview Analytics tab */}
          {activeTab === 'analytics' && (
            loadingData ? (
              <div className={styles.statsGrid}>
                {[1, 2, 3, 4, 5].map((n) => (
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

                <div 
                  className={styles.statCard} 
                  onClick={() => setActiveTab('reports')}
                  style={{ 
                    borderLeft: '4px solid #EF4444', 
                    cursor: 'pointer',
                    backgroundColor: reports.some((r) => r.status === 'pending') ? 'rgba(239, 68, 68, 0.05)' : undefined 
                  }}
                  title="Click to view all reported property listings"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={styles.statLabel} style={{ color: '#EF4444', fontWeight: 700 }}>🚩 Property Reports</span>
                    <span className="badge" style={{ backgroundColor: reports.some((r) => r.status === 'pending') ? '#EF4444' : 'var(--text-muted)', color: '#fff', fontSize: '0.7rem' }}>
                      {reports.filter((r) => r.status === 'pending').length} Pending
                    </span>
                  </div>
                  <span className={styles.statValue} style={{ color: '#EF4444', marginTop: '4px' }}>
                    {reports.length}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: 700, textDecoration: 'underline', marginTop: '2px', display: 'inline-block' }}>
                    Manage Reports &rarr;
                  </span>
                </div>
                
              </div>
            ) : null
          )}

          {/* Render Tab Contents */}
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
              <Loader className="animate-spin" size={36} style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
              <p style={{ fontWeight: 600 }}>Syncing records from database...</p>
            </div>
          ) : activeTab === 'analytics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* Distribution & Regional Analytics Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%', maxWidth: '100%' }}>
                
                {/* Property Types mix grid list */}
                <div className="card glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <PieChart size={20} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Property Types Distribution</h3>
                    </div>
                    {Object.keys(typeCounts).length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No inventory listings to compute.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                        {Object.entries(typeCounts).map(([type, count], index) => {
                          const percentage = Math.round((count / properties.length) * 100);
                          const color = colorsList[index % colorsList.length];
                          return (
                            <div 
                              key={type} 
                              style={{ 
                                padding: '14px 12px', 
                                backgroundColor: 'var(--bg-surface-secondary)', 
                                border: '1px solid var(--border)', 
                                borderRadius: 'var(--radius-sm)', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                justifyContent: 'space-between', 
                                gap: '10px', 
                                minHeight: '90px',
                                boxShadow: 'var(--shadow-xs)',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.2 }}>
                                  {type}
                                </span>
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', border: `1px solid ${color}`, color: color, flexShrink: 0 }}>
                                  {percentage}%
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>listings</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Availability occupancy ratios circular ring card */}
                <div className="card glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', minHeight: '140px', flexWrap: 'wrap' }}>
                          {/* SVG Donut Chart */}
                          <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                            <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                              {/* Background ring */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="var(--border)"
                                strokeWidth="3"
                              />
                              {/* Rented slice */}
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="3.2"
                                strokeDasharray={`${occupancyRate}, 100`}
                              />
                              {/* Available slice */}
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
                              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{occupancyRate}%</span>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>Rented</span>
                            </div>
                          </div>
                          
                          {/* Legend details */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1, minWidth: '140px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--primary)', flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Occupied / Rented</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rented} listings ({occupancyRate}%)</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: 'var(--accent)', flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Available Space</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{available} listings ({availableRate}%)</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '2px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Capacity</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>{total} published properties</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Regional metrics map pin locations */}
                <div className="card glass" style={{ padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', overflow: 'hidden' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <MapPin size={20} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Top Regional Hubs</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {sortedLocations.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No regional location data available.</p>
                      ) : (
                        sortedLocations.map(([loc, count], index) => {
                          const percentage = properties.length ? Math.round((count / properties.length) * 100) : 0;
                          return (
                            <div key={loc} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
                                  #{index + 1}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexGrow: 1 }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{loc}</span>
                                  <div style={{ width: '100%', maxWidth: '180px', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>{count} Properties</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === 'properties' ? (
            <>
              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
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

              {/* Mobile Card List View */}
              <div className={styles.mobileCardList}>
                {approvedProperties.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No listings found in the database.</p>
                ) : (
                  approvedProperties.map((p) => (
                    <div key={p.id} className={styles.adminCardItem}>
                      <div className={styles.adminCardHeader}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=60&q=80'}
                            alt={p.title}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 }}
                          />
                          <div>
                            <div className={styles.adminCardTitle}>{p.title}</div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>{p.type} • {p.location}</span>
                          </div>
                        </div>
                        <span className={`badge badge-${p.status === 'available' ? 'available' : 'rented'}`}>
                          {p.status}
                        </span>
                      </div>

                      <div className={styles.adminCardMeta}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>GH₵ {p.price.toLocaleString()}</span>
                        {p.isFeatured && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, color: '#F59E0B' }}>
                            <Star size={12} fill="#F59E0B" /> Featured
                          </span>
                        )}
                      </div>

                      <div className={styles.adminCardActions}>
                        <button
                          onClick={() => handleTogglePropertyStatus(p.id, p.status)}
                          disabled={actionLoading}
                          className={`btn ${p.status === 'available' ? 'btn-secondary' : 'btn-outline'}`}
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          {p.status === 'available' ? 'Mark Rented' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleToggleFeatured(p.id, p.isFeatured ?? false)}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: '8px 12px', fontSize: '0.8rem', color: p.isFeatured ? '#F59E0B' : 'var(--text-secondary)' }}
                        >
                          <Star size={14} fill={p.isFeatured ? '#F59E0B' : 'none'} /> {p.isFeatured ? 'Featured' : 'Feature'}
                        </button>
                        <button
                          onClick={() => handleStartEdit(p)}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: '8px', minWidth: '40px', flex: '0 0 auto' }}
                          title="Edit Property"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteProperty(p.id)}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: '8px', minWidth: '40px', flex: '0 0 auto', color: 'var(--danger)' }}
                          title="Delete Property"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeTab === 'users' ? (
            <>
              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
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
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleResetUserPassword(u.id, u.name, u.email || u.phone || '')}
                                disabled={actionLoading}
                                className="btn btn-outline"
                                title="Reset to default password"
                                style={{ padding: '6px', height: '32px', width: '32px', color: '#F59E0B', borderColor: 'var(--border)' }}
                              >
                                <KeyRound size={15} />
                              </button>
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

              {/* Mobile Card List View */}
              <div className={styles.mobileCardList}>
                {users.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No users found in the database.</p>
                ) : (
                  users.map((u) => (
                    <div key={u.id} className={styles.adminCardItem}>
                      <div className={styles.adminCardHeader}>
                        <div>
                          <div className={styles.adminCardTitle}>{u.name}</div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.phone || u.email}</span>
                        </div>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-available'}`} style={{ fontSize: '0.68rem' }}>
                          {u.role}
                        </span>
                      </div>

                      <div className={styles.adminCardActions}>
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          disabled={actionLoading || u.id === user.id}
                          className={styles.selectRole}
                          style={{ flex: 1 }}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={actionLoading || u.id === user.id}
                          className="btn btn-outline"
                          style={{ padding: '8px 12px', flex: '0 0 auto', color: 'var(--danger)' }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : activeTab === 'audits' ? (
            <>
              {/* Audit & Lead Category Filters */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setAuditFilter('all')}
                  className={`btn ${auditFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
                >
                  All Logs ({contactLogs.length})
                </button>
                <button
                  onClick={() => setAuditFilter('call')}
                  className={`btn ${auditFilter === 'call' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
                >
                  📞 Direct Phone Calls ({contactLogs.filter((l) => l.actionType === 'call').length})
                </button>
                <button
                  onClick={() => setAuditFilter('whatsapp')}
                  className={`btn ${auditFilter === 'whatsapp' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
                >
                  💬 WhatsApp Inquiries ({contactLogs.filter((l) => l.actionType === 'whatsapp').length})
                </button>
                <button
                  onClick={() => setAuditFilter('book_viewing')}
                  className={`btn ${auditFilter === 'book_viewing' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
                >
                  📅 Physical Viewings ({contactLogs.filter((l) => l.actionType === 'book_viewing').length})
                </button>
                <button
                  onClick={() => setAuditFilter('sms')}
                  className={`btn ${auditFilter === 'sms' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px' }}
                >
                  📱 SMS Leads ({contactLogs.filter((l) => l.actionType === 'sms').length})
                </button>
              </div>

              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Customer Name</th>
                      <th>Customer Phone</th>
                      <th>Action Type</th>
                      <th>Landlord Number</th>
                      <th>Property Title</th>
                      <th>Property Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactLogs.filter((l) => auditFilter === 'all' || l.actionType === auditFilter).length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No matching audit or SMS lead records found in database.
                        </td>
                      </tr>
                    ) : (
                      contactLogs
                        .filter((l) => auditFilter === 'all' || l.actionType === auditFilter)
                        .map((log) => (
                          <tr key={log.id}>
                            <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                              {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.customerName}</td>
                            <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{log.customerPhone}</td>
                            <td>
                              <span className={`badge ${
                                log.actionType === 'call'
                                  ? 'badge-available'
                                  : log.actionType === 'whatsapp'
                                  ? 'badge-primary'
                                  : log.actionType === 'book_viewing'
                                  ? 'badge-primary'
                                  : 'badge-available'
                              }`} style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'capitalize' }}>
                                {log.actionType === 'call' && '📞 Phone Call'}
                                {log.actionType === 'whatsapp' && '💬 WhatsApp'}
                                {log.actionType === 'book_viewing' && '📅 Physical Viewing'}
                                {log.actionType === 'sms' && '📱 SMS Lead'}
                                {!['call', 'whatsapp', 'book_viewing', 'sms'].includes(log.actionType) && log.actionType}
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

              {/* Mobile Card List View */}
              <div className={styles.mobileCardList}>
                {contactLogs.filter((l) => auditFilter === 'all' || l.actionType === auditFilter).length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No matching audit records found.</p>
                ) : (
                  contactLogs
                    .filter((l) => auditFilter === 'all' || l.actionType === auditFilter)
                    .map((log) => (
                      <div key={log.id} className={styles.adminCardItem}>
                        <div className={styles.adminCardHeader}>
                          <div>
                            <div className={styles.adminCardTitle}>{log.customerName} ({log.customerPhone})</div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                            </span>
                          </div>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                            {log.actionType === 'call' && '📞 Phone Call'}
                            {log.actionType === 'whatsapp' && '💬 WhatsApp'}
                            {log.actionType === 'book_viewing' && '📅 Physical Viewing'}
                            {log.actionType === 'sms' && '📱 SMS Lead'}
                            {!['call', 'whatsapp', 'book_viewing', 'sms'].includes(log.actionType) && log.actionType}
                          </span>
                        </div>
                        <div className={styles.adminCardMeta}>
                          <span><strong>Property:</strong> {log.property ? log.property.title : 'N/A'}</span>
                          <span><strong>Landlord Contact:</strong> {log.landlordPhone}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </>
          ) : activeTab === 'reports' ? (
            <>
              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Report Reason</th>
                      <th>Flagged Property</th>
                      <th>Details</th>
                      <th>Status</th>
                      <th>Reporter</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No property reports submitted yet.
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => (
                        <tr key={report.id}>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                            {new Date(isNaN(Number(report.createdAt)) ? report.createdAt : Number(report.createdAt)).toLocaleDateString()}
                          </td>
                          <td>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              padding: '4px 10px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              backgroundColor: report.reason.includes('Scam') || report.reason.includes('Fake') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', 
                              color: report.reason.includes('Scam') || report.reason.includes('Fake') ? 'var(--danger)' : '#D97706' 
                            }}>
                              <AlertTriangle size={12} /> {report.reason}
                            </span>
                          </td>
                          <td>
                            {report.property ? (
                              <div>
                                <a 
                                  href={`/properties/${report.property.id}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  style={{ fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                                >
                                  {report.property.title} (#{report.property.id})
                                </a>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{report.property.location}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Property ID #{report.propertyId} (Deleted)</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '240px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {report.details || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No additional details</span>}
                          </td>
                          <td>
                            <span className={`badge ${
                              report.status === 'resolved' ? 'badge-available' : report.status === 'dismissed' ? 'badge-rented' : 'badge-primary'
                            }`} style={{ fontSize: '0.7rem', padding: '4px 8px', textTransform: 'capitalize' }}>
                              {report.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {report.reporter ? (
                              <div>
                                <strong>{report.reporter.name}</strong>
                                <div style={{ fontSize: '0.75rem' }}>{report.reporter.phone || report.reporter.email}</div>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Guest User</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionsCell} style={{ justifyContent: 'flex-end', gap: '6px' }}>
                              {report.status !== 'resolved' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                                  disabled={actionLoading}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                                >
                                  Resolve
                                </button>
                              )}
                              {report.status !== 'dismissed' && (
                                <button
                                  onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                                  disabled={actionLoading}
                                  className="btn btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px' }}
                                >
                                  Dismiss
                                </button>
                              )}
                              {report.property && (
                                <button
                                  onClick={() => handleDeleteProperty(report.property!.id)}
                                  disabled={actionLoading}
                                  className="btn btn-outline"
                                  title="Delete flagged property listing from platform"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                  Delete Listing
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                disabled={actionLoading}
                                className="btn btn-outline"
                                title="Remove report log"
                                style={{ padding: '4px 8px', height: '28px', width: '28px', color: 'var(--text-muted)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className={styles.mobileCardList}>
                {reports.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>No property reports.</p>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className={styles.adminCardItem}>
                      <div className={styles.adminCardHeader}>
                        <div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: report.reason.includes('Scam') || report.reason.includes('Fake') ? 'var(--danger)' : '#D97706',
                            display: 'block' 
                          }}>
                            🚨 {report.reason}
                          </span>
                          <div className={styles.adminCardTitle} style={{ fontSize: '0.9rem', marginTop: '2px' }}>
                            {report.property ? report.property.title : `Property #${report.propertyId}`}
                          </div>
                        </div>
                        <span className={`badge ${
                          report.status === 'resolved' ? 'badge-available' : report.status === 'dismissed' ? 'badge-rented' : 'badge-primary'
                        }`} style={{ fontSize: '0.68rem' }}>
                          {report.status}
                        </span>
                      </div>

                      {report.details && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '8px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: '4px', margin: '8px 0' }}>
                          "{report.details}"
                        </div>
                      )}

                      <div className={styles.adminCardMeta} style={{ fontSize: '0.78rem' }}>
                        <span><strong>Reporter:</strong> {report.reporter ? report.reporter.name : 'Guest User'}</span>
                        <span><strong>Date:</strong> {new Date(isNaN(Number(report.createdAt)) ? report.createdAt : Number(report.createdAt)).toLocaleDateString()}</span>
                      </div>

                      <div className={styles.adminCardActions} style={{ marginTop: '10px', flexWrap: 'wrap' }}>
                        {report.status !== 'resolved' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                            disabled={actionLoading}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            Resolve
                          </button>
                        )}
                        {report.status !== 'dismissed' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'dismissed')}
                            disabled={actionLoading}
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={actionLoading}
                          className="btn btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)' }}
                        >
                          <Trash2 size={13} /> Delete Log
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
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

                {/* Main Image Upload & Preview Section */}
                <div className="form-group" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImageIcon size={16} style={{ color: 'var(--primary)' }} /> Main Property Image & Cover Photo
                  </label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {editImageUrl ? (
                      <img 
                        src={editImageUrl} 
                        alt="Property Thumbnail" 
                        style={{ width: '88px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} 
                      />
                    ) : (
                      <div style={{ width: '88px', height: '64px', borderRadius: '8px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                        No image
                      </div>
                    )}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '220px' }}>
                      <label className="btn btn-outline" style={{ cursor: 'pointer', padding: '8px 14px', fontSize: '0.82rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                        <UploadCloud size={14} />
                        {isUploadingEditImage ? 'Uploading new photo...' : 'Change / Upload New Photo File'}
                        <input type="file" accept="image/*" onChange={handleEditImageUpload} disabled={isUploadingEditImage} style={{ display: 'none' }} />
                      </label>
                      <input 
                        type="text" 
                        placeholder="Or paste image URL (e.g. https://...)" 
                        value={editImageUrl} 
                        onChange={(e) => setEditImageUrl(e.target.value)} 
                        className="form-control" 
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="form-control" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Location / Area</label>
                    <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required className="form-control" placeholder="e.g. Bankoe, Ho" />
                  </div>
                  
                  <div className="form-group">
                    <label>Price & Duration</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required className="form-control" style={{ flex: 1 }} />
                      <select value={editPricePeriod} onChange={(e) => setEditPricePeriod(e.target.value)} className="form-control" style={{ width: '160px', backgroundColor: 'var(--bg-surface)' }}>
                        <option value="plot">per plot</option>
                        <option value="acre">per acre</option>
                        <option value="semester">per semester</option>
                        <option value="academic year">per academic year</option>
                        <option value="outright sale">Outright Sale (Total)</option>
                        <option value="year">per year</option>
                        <option value="month">per month</option>
                        <option value="item">per item</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Digital Address & Landmarks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Ghana Digital Address (GhanaPostGPS)</label>
                    <input type="text" value={editDigitalAddress} onChange={(e) => setEditDigitalAddress(e.target.value)} className="form-control" placeholder="e.g. VH-0123-4567" />
                  </div>
                  <div className="form-group">
                    <label>Nearby Landmarks / Directions</label>
                    <input type="text" value={editLandmarks} onChange={(e) => setEditLandmarks(e.target.value)} className="form-control" placeholder="e.g. 3 mins from UHAS gate" />
                  </div>
                </div>

                {/* GPS Location Coordinates Picker */}
                <div className="form-group" style={{ padding: '14px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)' }} /> GPS Map Location Coordinates
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if ('geolocation' in navigator) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setEditLatitude(pos.coords.latitude);
                              setEditLongitude(pos.coords.longitude);
                              setMessage({ text: `🎯 GPS location detected! (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})`, isError: false });
                            },
                            (err) => {
                              setMessage({ text: `GPS error: ${err.message}. Please allow location access or type coordinates manually.`, isError: true });
                            },
                            { enableHighAccuracy: true }
                          );
                        } else {
                          setMessage({ text: 'Geolocation is not supported by your browser.', isError: true });
                        }
                      }}
                      className="btn btn-outline"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    >
                      <MapPin size={12} /> Detect Current GPS Location
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Latitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 6.6080"
                        value={editLatitude !== null ? editLatitude : ''}
                        onChange={(e) => setEditLatitude(e.target.value ? parseFloat(e.target.value) : null)}
                        className="form-control"
                        style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Longitude</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 0.4700"
                        value={editLongitude !== null ? editLongitude : ''}
                        onChange={(e) => setEditLongitude(e.target.value ? parseFloat(e.target.value) : null)}
                        className="form-control"
                        style={{ fontSize: '0.82rem', padding: '6px 10px' }}
                      />
                    </div>
                  </div>

                  {editLatitude !== null && editLongitude !== null && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📍 Pin Coordinates: ({editLatitude.toFixed(4)}, {editLongitude.toFixed(4)})</span>
                      <a
                        href={`https://www.google.com/maps?q=${editLatitude},${editLongitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Preview on Google Maps ↗
                      </a>
                    </div>
                  )}
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

                {/* Category-Specific Specifications */}
                {editType === 'Lands' && (
                  <div style={{ padding: '14px', backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.3)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Plot Size</label>
                      <input type="text" value={editLandPlotSize} onChange={(e) => setEditLandPlotSize(e.target.value)} placeholder="e.g. 70 x 100 ft" className="form-control" style={{ fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Documents / Title</label>
                      <select value={editLandDocType} onChange={(e) => setEditLandDocType(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="Site Plan">Site Plan</option>
                        <option value="Indenture">Indenture</option>
                        <option value="Land Title Certificate">Land Title Certificate</option>
                        <option value="Leasehold Document">Leasehold Document</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Zoning</label>
                      <select value={editLandZoning} onChange={(e) => setEditLandZoning(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Agricultural">Agricultural</option>
                        <option value="Mixed-Use">Mixed-Use</option>
                        <option value="Industrial">Industrial</option>
                      </select>
                    </div>
                  </div>
                )}

                {editType === 'Furnitures' && (
                  <div style={{ padding: '14px', backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59,130,246,0.3)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Condition</label>
                      <select value={editFurnitureCondition} onChange={(e) => setEditFurnitureCondition(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="Brand New">Brand New</option>
                        <option value="Fairly Used / Like New">Fairly Used / Like New</option>
                        <option value="Used - Good">Used - Good</option>
                        <option value="Needs Minor Repair">Needs Minor Repair</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Category</label>
                      <select value={editFurnitureCategory} onChange={(e) => setEditFurnitureCategory(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="Bed & Mattress">Bed & Mattress</option>
                        <option value="Sofa / Couch">Sofa / Couch</option>
                        <option value="Study Desk & Chair">Study Desk & Chair</option>
                        <option value="Wardrobe / Storage">Wardrobe / Storage</option>
                        <option value="TV & Electronics">TV & Electronics</option>
                        <option value="Kitchen Appliances">Kitchen Appliances</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Delivery Option</label>
                      <select value={editFurnitureDelivery} onChange={(e) => setEditFurnitureDelivery(e.target.value)} className="form-control" style={{ fontSize: '0.85rem' }}>
                        <option value="Buyer Pick-Up">Buyer Pick-Up</option>
                        <option value="Free Local Delivery">Free Local Delivery</option>
                        <option value="Paid Delivery Available">Paid Delivery Available</option>
                      </select>
                    </div>
                  </div>
                )}

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
