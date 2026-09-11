'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  UPDATE_PROPERTY_STATUS,
  GET_CONTACT_LOGS,
  TOGGLE_FEATURED,
  GET_REPORTS,
  UPDATE_REPORT_STATUS,
  DELETE_REPORT,
  ADMIN_RESET_USER_PASSWORD,
  GET_AUDIT_LOGS,
  DELETE_OLD_AUDIT_LOGS,
  DELETE_AUDIT_LOGS,
  DELETE_CONTACT_LOGS,
  GET_LANDLORD_REGISTRATIONS,
  UPDATE_LANDLORD_REGISTRATION_STATUS,
  DELETE_LANDLORD_REGISTRATION,
  PUBLISH_LANDLORD_REGISTRATION,
  GET_PAGE_ANALYTICS,
  VERIFY_AGENT,
  SEND_ADMIN_SMS
} from '../../lib/graphql';
import { buildTrackingUrl } from '../../lib/trackVisit';
import { Trash2, KeyRound, Users, Building, Loader, PieChart, BarChart3, MapPin, LogOut, Home, RefreshCw, CheckCircle, Activity, Plus, Edit, Star, Menu, X, Flag, AlertTriangle, UploadCloud, Image as ImageIcon, Search, FileText, Check, QrCode, Download, Copy, TrendingUp, Link2, ShieldCheck, ChevronDown, ChevronUp, Send, MessageSquare, Radio, CheckCheck, Smartphone, Sparkles, Zap, PhoneCall, Car, Clock } from 'lucide-react';
import styles from './admin.module.css';
import { getFriendlyErrorMessage, LandlordRegistration, getStatusLabel, getToggleStatusLabel, formatGhanaPhone, isValidGhanaPhone, getPricePeriodLabel } from '../../lib/types';

interface DashboardStats {
  totalProperties: number;
  totalUsers: number;
  availableProperties: number;
  rentedProperties: number;
  totalPageVisits: number;
  todayPageVisits: number;
  todayUniqueVisitors?: number;
  todayLogins?: number;
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
    type?: string;
    price?: number;
    location: string;
    imageUrl?: string;
  };
}

interface AuditLogItem {
  id: number;
  action: string;
  details: string;
  userEmail?: string;
  createdAt: string;
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

interface RideReferralItem {
  id: number;
  refCode: string;
  propertyId: number;
  createdAt: string;
  status: string;
  commissionAmt?: number;
  tenantName?: string;
  tenantPhone?: string;
  property?: {
    id: number;
    title: string;
    location: string;
  };
  user?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
}

interface EditGalleryItem {
  id?: string | number;
  url: string;
  file?: File;
  previewUrl: string;
}

type AdminTab = 'analytics' | 'properties' | 'users' | 'agents' | 'moderation' | 'audits' | 'reports' | 'upload' | 'landlords' | 'traffic' | 'sms' | 'yuyu_rides';
const VALID_ADMIN_TABS: AdminTab[] = ['analytics', 'properties', 'users', 'agents', 'moderation', 'audits', 'reports', 'upload', 'landlords', 'traffic', 'sms', 'yuyu_rides'];

interface AdminSessionCache {
  stats: DashboardStats | null;
  users: User[];
  properties: Property[];
  contactLogs: ContactLogItem[];
  reports: ReportItem[];
  landlordRegistrations: LandlordRegistration[];
  rideReferrals: RideReferralItem[];
  totalRideReferralsCount: number;
  loadedTabs: Set<AdminTab>;
  lastFetchedAt: number;
}

let adminSessionCache: AdminSessionCache | null = null;

function AdminPageContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams ? (searchParams.get('tab') as AdminTab | null) : null;

  // Initialize activeTab directly from search params or localStorage
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search).get('tab') as AdminTab | null;
        if (p && VALID_ADMIN_TABS.includes(p)) return p;
        const stored = localStorage.getItem('ho_admin_active_tab') as AdminTab | null;
        if (stored && VALID_ADMIN_TABS.includes(stored)) return stored;
      } catch (e) { }
    }
    return 'analytics';
  });

  // Keep state synchronized whenever URL search param changes
  useEffect(() => {
    if (urlTab && VALID_ADMIN_TABS.includes(urlTab)) {
      setActiveTabState(urlTab);
      try {
        localStorage.setItem('ho_admin_active_tab', urlTab);
      } catch (e) { }
    }
  }, [urlTab]);

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('ho_admin_active_tab', tab);
    } catch (e) { }
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [contactLogs, setContactLogs] = useState<ContactLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [rideReferrals, setRideReferrals] = useState<RideReferralItem[]>([]);
  const [totalRideReferralsCount, setTotalRideReferralsCount] = useState<number>(0);

  const loadRideReferrals = async () => {
    try {
      const res = await fetch(`/api/rides/referral?limit=200&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.referrals)) {
        setRideReferrals(data.referrals);
        if (typeof data.total === 'number') {
          setTotalRideReferralsCount(data.total);
        }
      }
    } catch (err) {
      console.error('Failed to fetch Yuyu ride referrals:', err);
    }
  };

  const [deletingReferralId, setDeletingReferralId] = useState<number | null>(null);

  const handleDeleteRideReferral = async (id: number) => {
    if (!confirm('Are you sure you want to delete this Yuyu Ride referral log record?')) return;
    setDeletingReferralId(id);
    try {
      const res = await fetch(`/api/rides/referral?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRideReferrals((prev: RideReferralItem[]) => prev.filter((r: RideReferralItem) => r.id !== id));
        setTotalRideReferralsCount((prev: number) => Math.max(0, prev - 1));
      } else {
        alert(data.error || 'Failed to delete referral record.');
      }
    } catch (err) {
      console.error('Error deleting ride referral record:', err);
      alert('An error occurred while deleting the referral log.');
    } finally {
      setDeletingReferralId(null);
    }
  };


  // SMS Broadcast State
  const [smsTargetType, setSmsTargetType] = useState<'single' | 'role' | 'all'>('single');
  const [smsCustomPhone, setSmsCustomPhone] = useState('');
  const [smsTargetRole, setSmsTargetRole] = useState<'all' | 'verified_agents' | 'agents' | 'users'>('all');
  const [smsSenderId, setSmsSenderId] = useState('HORENTALS');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('custom');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Analytics state
  interface VisitSource { source: string; count: number; percentage: number; }
  interface VisitDay { date: string; count: number; }
  interface TopProp { propertyId: string; title: string; views: number; }
  interface PageAnalytics {
    totalViews: number; todayViews: number; weekViews: number; monthViews: number;
    sources: VisitSource[]; viewsOverTime: VisitDay[]; topProperties: TopProp[];
  }
  const [analytics, setAnalytics] = useState<PageAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  // Campaign link generator state
  const [campPlatform, setCampPlatform] = useState('tiktok');
  const [campCampaign, setCampCampaign] = useState('');
  const [campContent, setCampContent] = useState('');
  const [campBaseUrl, setCampBaseUrl] = useState('https://horentals.com');
  const [campGenerated, setCampGenerated] = useState('');
  const [campCopied, setCampCopied] = useState(false);
  const [auditLogView, setAuditLogView] = useState<'all' | 'system' | 'contacts'>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'call' | 'whatsapp' | 'book_viewing' | 'sms'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedAuditLogIds, setSelectedAuditLogIds] = useState<number[]>([]);
  const [selectedContactLogIds, setSelectedContactLogIds] = useState<number[]>([]);
  const [isContactsCollapsed, setIsContactsCollapsed] = useState(false);
  const [isSecurityAuditsCollapsed, setIsSecurityAuditsCollapsed] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [landlordRegistrations, setLandlordRegistrations] = useState<LandlordRegistration[]>([]);
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordRegistration | null>(null);
  const [expandedLandlordId, setExpandedLandlordId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [moderationSearch, setModerationSearch] = useState('');
  const [collapsedSubmitters, setCollapsedSubmitters] = useState<Record<string, boolean>>({});
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState('');
  const [qrModalTitle, setQrModalTitle] = useState('');
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Property States
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

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
        text: `Cleaned up ${data.cleanedCount || 0} orphaned image(s) successfully!`,
        isError: false,
      });
    } catch (err: any) {
      setMessage({
        text: err.message || 'Media storage cleanup failed.',
        isError: true,
      });
    } finally {
      setIsCleaningMedia(false);
    }
  };

  const handleSendAdminSms = async () => {
    if (!smsMessage.trim()) {
      setMessage({ text: 'Please enter an SMS message body.', isError: true });
      return;
    }
    if (smsTargetType === 'single') {
      if (!smsCustomPhone.trim()) {
        setMessage({ text: 'Please enter a recipient phone number.', isError: true });
        return;
      }
    }

    const recipientCount = smsTargetType === 'single'
      ? 1
      : (smsTargetRole === 'all'
        ? users.filter(u => u.phone).length
        : smsTargetRole === 'verified_agents'
          ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.verificationStatus === 'verified' && u.phone).length
          : smsTargetRole === 'agents'
            ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.phone).length
            : users.filter(u => u.role === 'user' && u.phone).length);

    if (recipientCount === 0) {
      setMessage({ text: 'No registered users with valid phone numbers found for the selected audience.', isError: true });
      return;
    }

    const confirmMsg = smsTargetType === 'single'
      ? `Send direct SMS to ${smsCustomPhone}?`
      : `Broadcast SMS to ${recipientCount} user(s) in "${smsTargetRole === 'all' ? 'All Users' : smsTargetRole}"?`;

    if (!confirm(confirmMsg)) return;

    setSmsSending(true);
    setSmsResult(null);
    setMessage(null);

    try {
      const res = await graphqlRequest<{ sendAdminSms: { success: boolean; sentCount: number; recipientCount: number; message: string } }>(SEND_ADMIN_SMS, {
        targetType: smsTargetType,
        customPhone: smsTargetType === 'single' ? smsCustomPhone.trim() : null,
        targetRole: smsTargetType !== 'single' ? smsTargetRole : null,
        message: smsMessage.trim(),
        senderId: smsSenderId.trim() || undefined,
      });

      if (res?.sendAdminSms?.success) {
        setSmsResult({ success: true, message: res.sendAdminSms.message });
        setMessage({ text: res.sendAdminSms.message, isError: false });
        if (smsTargetType === 'single') {
          setSmsCustomPhone('');
        }
        setSmsMessage('');
        setSmsTemplate('custom');
      } else {
        throw new Error(res?.sendAdminSms?.message || 'Failed to dispatch SMS');
      }
    } catch (err: any) {
      const errText = err.message || 'Failed to dispatch SMS via SailUp';
      setSmsResult({ success: false, message: errText });
      setMessage({ text: errText, isError: true });
    } finally {
      setSmsSending(false);
    }
  };

  // Filter Helper lists
  const approvedProperties = properties.filter((p) => p.status !== 'pending_approval');
  const pendingProperties = properties.filter((p) => p.status === 'pending_approval');
  const standardUsers = users.filter((u) => (u.role !== 'agent' && u.role !== 'landlord') || u.verificationStatus === 'verified');
  const agentUsers = users.filter((u) => u.role === 'agent' || u.role === 'landlord');

  const filteredStandardUsers = standardUsers
    .filter((u) => {
      if (!userSearch.trim()) return true;
      const term = userSearch.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.phone && u.phone.includes(term))
      );
    })
    .sort((a, b) => {
      const timeA = a.lastLoginAt ? new Date(isNaN(Number(a.lastLoginAt)) ? a.lastLoginAt : Number(a.lastLoginAt)).getTime() : 0;
      const timeB = b.lastLoginAt ? new Date(isNaN(Number(b.lastLoginAt)) ? b.lastLoginAt : Number(b.lastLoginAt)).getTime() : 0;
      return timeB - timeA;
    });

  const filteredAgentUsers = agentUsers.filter((ag) => {
    if (!agentSearch.trim()) return true;
    const term = agentSearch.toLowerCase();
    return (
      (ag.name && ag.name.toLowerCase().includes(term)) ||
      (ag.email && ag.email.toLowerCase().includes(term)) ||
      (ag.phone && ag.phone.includes(term)) ||
      (ag.agentLocation && ag.agentLocation.toLowerCase().includes(term))
    );
  });

  // Security Redirect: Only allow Admin role
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load initial data immediately on mount with Stale-While-Revalidate caching
  useEffect(() => {
    if (!authLoading && user && user.role === 'admin') {
      if (adminSessionCache) {
        // Render instantly from session cache (0ms delay, no loader spinner!)
        setStats(adminSessionCache.stats);
        setUsers(adminSessionCache.users);
        setProperties(adminSessionCache.properties);
        setContactLogs(adminSessionCache.contactLogs);
        setReports(adminSessionCache.reports);
        setLandlordRegistrations(adminSessionCache.landlordRegistrations);
        setRideReferrals(adminSessionCache.rideReferrals);
        setTotalRideReferralsCount(adminSessionCache.totalRideReferralsCount);
        setLoadedTabs(adminSessionCache.loadedTabs);
        setLoadingData(false);

        // Silent revalidation in the background if cache is older than 5 seconds
        if (Date.now() - adminSessionCache.lastFetchedAt > 5000) {
          loadInitialData({ silent: true });
        }
      } else {
        loadInitialData({ silent: false });
      }
    } else if (!authLoading) {
      setLoadingData(false);
    }
  }, [user, authLoading]);

  // Lazy-load tab-specific data when user switches tabs
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (activeTab === 'audits' && !loadedTabs.has('audits')) {
      loadAuditData();
    } else if (activeTab === 'reports' && !loadedTabs.has('reports')) {
      loadReportsData();
    } else if (activeTab === 'landlords' && !loadedTabs.has('landlords')) {
      loadLandlordsData();
    } else if (activeTab === 'yuyu_rides' && !loadedTabs.has('yuyu_rides')) {
      loadRideReferrals();
      setLoadedTabs(prev => new Set([...prev, 'yuyu_rides']));
    }
  }, [activeTab, user]);

  const handleOpenQrModal = (url: string, title: string) => {
    setQrModalUrl(url);
    setQrModalTitle(title);
    setIsQrModalOpen(true);
  };

  async function loadInitialData({ silent = false }: { silent?: boolean } = {}) {
    if (!silent) setLoadingData(true);
    try {
      loadRideReferrals();
      const [statsData, usersData, propertiesData, logsData, reportsData, landlordData] = await Promise.all([
        graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS),
        graphqlRequest<{ users: User[] }>(GET_USERS),
        graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS).catch(() => ({ contactLogs: [] })),
        graphqlRequest<{ reports: ReportItem[] }>(GET_REPORTS).catch(() => ({ reports: [] })),
        graphqlRequest<{ landlordRegistrations: LandlordRegistration[] }>(GET_LANDLORD_REGISTRATIONS).catch(() => ({ landlordRegistrations: [] }))
      ]);

      const newStats = statsData?.dashboardStats || null;
      const newUsers = usersData?.users || [];
      const newProps = propertiesData?.properties || [];
      const newLogs = logsData?.contactLogs || [];
      const newReports = reportsData?.reports || [];
      const newLandlords = landlordData?.landlordRegistrations || [];
      const newTabs = new Set([...loadedTabs, 'analytics', 'properties', 'users', 'moderation', 'reports', 'landlords', 'yuyu_rides'] as AdminTab[]);

      if (statsData) setStats(newStats);
      if (usersData) setUsers(newUsers);
      if (propertiesData) setProperties(newProps);
      if (logsData) setContactLogs(newLogs);
      if (reportsData) setReports(newReports);
      if (landlordData) setLandlordRegistrations(newLandlords);
      setLoadedTabs(newTabs);

      // Save into in-memory session cache for instant subsequent renders
      adminSessionCache = {
        stats: newStats,
        users: newUsers,
        properties: newProps,
        contactLogs: newLogs,
        reports: newReports,
        landlordRegistrations: newLandlords,
        rideReferrals,
        totalRideReferralsCount,
        loadedTabs: newTabs,
        lastFetchedAt: Date.now(),
      };
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      if (!silent) {
        setMessage({ text: getFriendlyErrorMessage(err, 'Failed to fetch dashboard data.'), isError: true });
      }
    } finally {
      if (!silent) setLoadingData(false);
    }
  }

  async function loadAuditData() {
    try {
      const [auditLogsData, logsData] = await Promise.all([
        graphqlRequest<{ auditLogs: AuditLogItem[] }>(GET_AUDIT_LOGS).catch(() => ({ auditLogs: [] })),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS).catch(() => ({ contactLogs: [] })),
      ]);
      if (auditLogsData) setAuditLogs(auditLogsData.auditLogs || []);
      if (logsData) setContactLogs(logsData.contactLogs || []);
      setLoadedTabs(prev => new Set([...prev, 'audits']));
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
    }
  }

  async function loadReportsData() {
    try {
      const reportsData = await graphqlRequest<{ reports: ReportItem[] }>(GET_REPORTS).catch(() => ({ reports: [] }));
      if (reportsData) setReports(reportsData.reports);
      setLoadedTabs(prev => new Set([...prev, 'reports']));
    } catch (err: any) {
      console.error('Error loading reports:', err);
    }
  }

  async function loadLandlordsData() {
    try {
      const landlordData = await graphqlRequest<{ landlordRegistrations: LandlordRegistration[] }>(GET_LANDLORD_REGISTRATIONS).catch(() => ({ landlordRegistrations: [] }));
      if (landlordData) setLandlordRegistrations(landlordData.landlordRegistrations || []);
      setLoadedTabs(prev => new Set([...prev, 'landlords']));
    } catch (err: any) {
      console.error('Error loading landlord registrations:', err);
    }
  }

  async function loadAdminDashboardData(showSpinner = true) {
    if (showSpinner && properties.length === 0) {
      setLoadingData(true);
    }
    try {
      const [statsData, usersData, propertiesData, logsData, reportsData, auditLogsData, landlordData] = await Promise.all([
        graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS),
        graphqlRequest<{ users: User[] }>(GET_USERS),
        graphqlRequest<{ properties: Property[] }>(GET_PROPERTIES),
        graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS),
        graphqlRequest<{ reports: ReportItem[] }>(GET_REPORTS).catch(() => ({ reports: [] })),
        graphqlRequest<{ auditLogs: AuditLogItem[] }>(GET_AUDIT_LOGS).catch(() => ({ auditLogs: [] })),
        graphqlRequest<{ landlordRegistrations: LandlordRegistration[] }>(GET_LANDLORD_REGISTRATIONS).catch(() => ({ landlordRegistrations: [] }))
      ]);

      if (statsData) setStats(statsData.dashboardStats);
      if (usersData) setUsers(usersData.users);
      if (propertiesData) setProperties(propertiesData.properties);
      if (logsData) setContactLogs(logsData.contactLogs);
      if (reportsData) setReports(reportsData.reports);
      if (auditLogsData) setAuditLogs(auditLogsData.auditLogs || []);
      if (landlordData) setLandlordRegistrations(landlordData.landlordRegistrations || []);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setMessage({ text: getFriendlyErrorMessage(err, 'Failed to fetch dashboard data.'), isError: true });
    } finally {
      setLoadingData(false);
    }
  }

  async function loadAnalytics(period = analyticsPeriod) {
    setAnalyticsLoading(true);
    try {
      const data = await graphqlRequest<{ pageVisitAnalytics: any }>(GET_PAGE_ANALYTICS, { period });
      if (data?.pageVisitAnalytics) setAnalytics(data.pageVisitAnalytics);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  // Re-fetch analytics when period changes or tab becomes active
  useEffect(() => {
    if (activeTab === 'traffic') loadAnalytics(analyticsPeriod);
  }, [activeTab, analyticsPeriod]);

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

  const handleVerifyLandlord = async (id: number | string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      await graphqlRequest(UPDATE_LANDLORD_REGISTRATION_STATUS, { id: parsedId, status: 'Verified' });
      setLandlordRegistrations(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'Verified' } : r)
      );
      setMessage({ text: 'Landlord verified successfully.', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to verify landlord.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLandlord = async (id: number | string) => {
    if (!confirm('Are you sure you want to remove this landlord? This will permanently delete the landlord profile and all related properties.')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      const targetLandlord = landlordRegistrations.find(r => String(r.id) === String(id));
      await graphqlRequest(DELETE_LANDLORD_REGISTRATION, { id: parsedId });

      setLandlordRegistrations(prev => prev.filter(r => r.id !== id));
      if (selectedLandlord?.id === id) setSelectedLandlord(null);

      // Clean up matching properties from local state
      if (targetLandlord) {
        const cleanRPhone = (targetLandlord.phone1 || '').replace(/[^0-9]/g, '');
        setProperties(prev => prev.filter(p => {
          const cleanPPhone = (p.contact || '').replace(/[^0-9]/g, '');
          const phoneMatch = cleanPPhone && cleanRPhone && cleanPPhone.endsWith(cleanRPhone.slice(-9));
          const nameMatch = p.landlordName && p.landlordName.toLowerCase().trim() === targetLandlord.name.toLowerCase().trim();
          return !phoneMatch && !nameMatch;
        }));
      }

      setMessage({ text: 'Landlord record and all related properties deleted.', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete landlord.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishLandlord = async (id: number | string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      await graphqlRequest(PUBLISH_LANDLORD_REGISTRATION, { id: parsedId });

      // Update registration status to verified locally
      setLandlordRegistrations(prev =>
        prev.map(r => r.id === id ? { ...r, status: 'Verified' } : r)
      );

      // Reload admin dashboard data to update Listings tab and stats counts
      await loadAdminDashboardData(false);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }

      setMessage({ text: '🎉 Landlord details published to property listings successfully!', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to publish listing.', isError: true });
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }

      setMessage({ text: `Property status updated to ${newStatus}.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update property status.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveProperty = async (id: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) throw new Error('Invalid property ID format');

      await graphqlRequest(UPDATE_PROPERTY_STATUS, { id: parsedId, status: 'available' });

      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'available' } : p))
      );

      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }

      setMessage({ text: '🎉 Listing approved and published successfully!', isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to approve property.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAllProperties = async (ids: string[], submitterName: string) => {
    if (!confirm(`Are you sure you want to approve all ${ids.length} pending listing(s) for ${submitterName}?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      for (const id of ids) {
        const parsedId = parseInt(id, 10);
        if (!isNaN(parsedId)) {
          await graphqlRequest(UPDATE_PROPERTY_STATUS, { id: parsedId, status: 'available' });
        }
      }
      setProperties((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'available' } : p))
      );
      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }

      setMessage({ text: `🎉 All ${ids.length} listings for ${submitterName} approved and published!`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to approve properties.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyAgent = async (userId: number | string, status: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      if (isNaN(parsedId)) throw new Error('Invalid user ID');

      await graphqlRequest(VERIFY_AGENT, { userId: parsedId, status });
      setUsers((prev) =>
        prev.map((u) => (Number(u.id) === parsedId ? { ...u, verificationStatus: status } : u))
      );
      setMessage({ text: `Agent verification status updated to ${status}.`, isError: false });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to verify agent.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing permanently?')) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const parsedId = parseInt(id, 10);
      await graphqlRequest(DELETE_PROPERTY, { id: isNaN(parsedId) ? id : parsedId });
      setProperties((prev) => prev.filter((p) => p.id !== id));
      if (!isNaN(parsedId)) {
        setReports((prev) => prev.filter((r) => r.propertyId !== parsedId && r.property?.id !== id));
      }
      const statsData = await graphqlRequest<{ dashboardStats: DashboardStats }>(GET_DASHBOARD_STATS);
      if (statsData) setStats(statsData.dashboardStats);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ho_rental_listings_updated'));
      }

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

  const handleDeleteOldAuditLogs = async (days: number) => {
    const label = days === 0 ? 'ALL system audit logs' : `logs older than ${days} days`;
    if (!confirm(`Clear ${label}? This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await graphqlRequest<{ deleteOldAuditLogs: { success: boolean; message: string } }>(
        DELETE_OLD_AUDIT_LOGS,
        { days }
      );
      setMessage({ text: res.deleteOldAuditLogs.message, isError: false });
      const freshLogs = await graphqlRequest<{ auditLogs: AuditLogItem[] }>(GET_AUDIT_LOGS);
      if (freshLogs) setAuditLogs(freshLogs.auditLogs || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to cleanup audit logs.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSelectAuditLog = (id: number) => {
    setSelectedAuditLogIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllAuditLogs = (filteredList?: AuditLogItem[]) => {
    const list = filteredList || auditLogs;
    if (list.length > 0 && list.every((l) => selectedAuditLogIds.includes(l.id))) {
      setSelectedAuditLogIds((prev) => prev.filter((id) => !list.some((l) => l.id === id)));
    } else {
      const idsToAdd = list.map((l) => l.id);
      setSelectedAuditLogIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const handleDeleteSelectedAuditLogs = async (specificIds?: number[]) => {
    const idsToDelete = specificIds || selectedAuditLogIds;
    if (idsToDelete.length === 0) return;
    if (!confirm(`Delete ${idsToDelete.length} selected security audit log(s)? This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await graphqlRequest<{ deleteAuditLogs: { success: boolean; message: string } }>(
        DELETE_AUDIT_LOGS,
        { ids: idsToDelete }
      );
      setMessage({ text: res.deleteAuditLogs.message, isError: false });
      setSelectedAuditLogIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      const freshLogs = await graphqlRequest<{ auditLogs: AuditLogItem[] }>(GET_AUDIT_LOGS);
      if (freshLogs) setAuditLogs(freshLogs.auditLogs || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete selected security logs.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSelectContactLog = (id: number) => {
    setSelectedContactLogIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllContactLogs = (filteredList: ContactLogItem[]) => {
    if (filteredList.length > 0 && filteredList.every((l) => selectedContactLogIds.includes(l.id))) {
      setSelectedContactLogIds((prev) => prev.filter((id) => !filteredList.some((l) => l.id === id)));
    } else {
      const idsToAdd = filteredList.map((l) => l.id);
      setSelectedContactLogIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    }
  };

  const handleDeleteSelectedContactLogs = async (specificIds?: number[]) => {
    const idsToDelete = specificIds || selectedContactLogIds;
    if (idsToDelete.length === 0) return;
    if (!confirm(`Delete ${idsToDelete.length} selected landlord contact inquiry log(s)? This cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await graphqlRequest<{ deleteContactLogs: { success: boolean; message: string } }>(
        DELETE_CONTACT_LOGS,
        { ids: idsToDelete }
      );
      setMessage({ text: res.deleteContactLogs.message, isError: false });
      setSelectedContactLogIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      const freshLogs = await graphqlRequest<{ contactLogs: ContactLogItem[] }>(GET_CONTACT_LOGS);
      if (freshLogs) setContactLogs(freshLogs.contactLogs || []);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete selected contact logs.', isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEdit = (p: Property) => {
    setEditingProperty(p);
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
              onClick={() => setActiveTab('moderation')}
              className={`${styles.navItem} ${activeTab === 'moderation' ? styles.activeNavItem : ''}`}
              style={{
                borderLeft: pendingProperties.length > 0 ? '3px solid #F59E0B' : undefined,
                backgroundColor: activeTab === 'moderation' ? undefined : (pendingProperties.length > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined)
              }}
            >
              <CheckCircle size={16} style={{ color: pendingProperties.length > 0 ? '#F59E0B' : undefined }} />
              <span style={{ fontWeight: pendingProperties.length > 0 ? 700 : 500 }}>Pending Approvals</span>
              <span
                className={styles.navCountBadge}
                style={{
                  backgroundColor: pendingProperties.length > 0 ? '#F59E0B' : undefined,
                  color: pendingProperties.length > 0 ? '#FFFFFF' : undefined
                }}
              >
                {pendingProperties.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`${styles.navItem} ${activeTab === 'users' ? styles.activeNavItem : ''}`}
            >
              <Users size={16} />
              <span>User Directory</span>
              <span className={styles.navCountBadge}>{standardUsers.length}</span>
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
              onClick={() => setActiveTab('traffic')}
              className={`${styles.navItem} ${activeTab === 'traffic' ? styles.activeNavItem : ''}`}
            >
              <TrendingUp size={16} />
              <span>Traffic Analytics</span>
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

            <button
              onClick={() => setActiveTab('agents')}
              className={`${styles.navItem} ${activeTab === 'agents' ? styles.activeNavItem : ''}`}
            >
              <ShieldCheck size={16} />
              <span>Verified Agents</span>
              <span className={styles.navCountBadge}>
                {agentUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('landlords')}
              className={`${styles.navItem} ${activeTab === 'landlords' ? styles.activeNavItem : ''}`}
            >
              <FileText size={16} />
              <span>Landlord Submissions</span>
              <span className={styles.navCountBadge}>
                {landlordRegistrations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('yuyu_rides')}
              className={`${styles.navItem} ${activeTab === 'yuyu_rides' ? styles.activeNavItem : ''}`}
            >
              <Car size={16} style={{ color: '#10B981' }} />
              <span>Yuyu Ride Logs</span>
              <span className={styles.navCountBadge} style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}>
                {totalRideReferralsCount || rideReferrals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sms')}
              className={`${styles.navItem} ${activeTab === 'sms' ? styles.activeNavItem : ''}`}
            >
              <Send size={16} />
              <span>SMS Broadcast</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={styles.sidebarUploadBtn}
              style={{ marginTop: '16px' }}
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
              {activeTab === 'moderation' && 'Pending Approvals'}
              {activeTab === 'users' && 'Users'}
              {activeTab === 'agents' && 'Verified Agents'}
              {activeTab === 'audits' && 'Audit Logs'}
              {activeTab === 'traffic' && 'Traffic Analytics'}
              {activeTab === 'reports' && 'Flagged Reports'}
              {activeTab === 'landlords' && 'Landlord Submissions'}
              {activeTab === 'sms' && 'SMS Broadcast'}
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
                    onClick={() => { setActiveTab('moderation'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'moderation' ? styles.activeNavItem : ''}`}
                  >
                    <CheckCircle size={16} /> Pending Approvals ({pendingProperties.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('users'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'users' ? styles.activeNavItem : ''}`}
                  >
                    <Users size={16} /> User Directory ({standardUsers.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('agents'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'agents' ? styles.activeNavItem : ''}`}
                  >
                    <ShieldCheck size={16} /> Verified Agents ({agentUsers.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('audits'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'audits' ? styles.activeNavItem : ''}`}
                  >
                    <Activity size={16} /> Contact Audit Logs ({contactLogs.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('traffic'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'traffic' ? styles.activeNavItem : ''}`}
                  >
                    <TrendingUp size={16} /> Traffic Analytics
                  </button>
                  <button
                    onClick={() => { setActiveTab('reports'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'reports' ? styles.activeNavItem : ''}`}
                  >
                    <Flag size={16} /> Flagged Reports ({reports.filter((r) => r.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('landlords'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'landlords' ? styles.activeNavItem : ''}`}
                  >
                    <FileText size={16} /> Landlord Submissions ({landlordRegistrations.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('yuyu_rides'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'yuyu_rides' ? styles.activeNavItem : ''}`}
                  >
                    <Car size={16} style={{ color: '#10B981' }} /> Yuyu Ride Logs ({totalRideReferralsCount || rideReferrals.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('sms'); setIsMobileDrawerOpen(false); }}
                    className={`${styles.navItem} ${activeTab === 'sms' ? styles.activeNavItem : ''}`}
                  >
                    <Send size={16} /> SMS Broadcast
                  </button>
                  <button
                    onClick={() => { setActiveTab('upload'); setIsMobileDrawerOpen(false); }}
                    className={styles.sidebarUploadBtn}
                    style={{ marginTop: '16px' }}
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

          {activeTab !== 'upload' && activeTab !== 'sms' && (
            <>
              <h1 className={styles.pageTitle}>
                {activeTab === 'analytics' && 'Overview Analytics'}
                {activeTab === 'properties' && 'Property Listings'}
                {activeTab === 'moderation' && 'Pending Agent Approvals'}
                {activeTab === 'users' && 'Account Manager'}
                {activeTab === 'agents' && 'Registered & Verified Agents'}
                {activeTab === 'audits' && 'Contact Inquiry Audits'}
                {activeTab === 'traffic' && 'Traffic & Campaign Analytics'}
                {activeTab === 'reports' && 'Property Reports & Flagged Listings'}
                {activeTab === 'landlords' && 'Agents & Landlords Database'}
              </h1>
              <p className={styles.pageSubtitle}>
                {activeTab === 'analytics' && 'Overview statistics, inventory performance, and user-submitted listing flags.'}
                {activeTab === 'properties' && 'View, search, edit availability, and delete published property listings.'}
                {activeTab === 'moderation' && 'Review, approve, or reject property listings posted by independent agents.'}
                {activeTab === 'users' && 'Manage registered accounts and adjust credentials and system roles.'}
                {activeTab === 'agents' && 'Manage registered independent agents, verification statuses, and billing tiers.'}
                {activeTab === 'audits' && 'Real-time record of customer call and WhatsApp inquiries to landlords.'}
                {activeTab === 'traffic' && 'View traffic sources, visit trends, top listings, and generate campaign tracking links.'}
                {activeTab === 'reports' && 'Review user-flagged listings, reported scams, inaccurate photos, and manage property reports.'}
                {activeTab === 'landlords' && 'View all registered agents, landlord submissions, verification status, and contact details.'}
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

                <div
                  className={styles.statCard}
                  style={{ borderLeft: '4px solid #06B6D4', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onClick={() => setActiveTab('traffic')}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(6,182,212,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                  title="Click to view detailed analytics"
                >
                  <span className={styles.statLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Traffic Views <TrendingUp size={13} style={{ color: '#06B6D4' }} />
                  </span>
                  <span className={styles.statValue} style={{ color: '#06B6D4' }}>
                    {stats.todayPageVisits || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {stats.totalPageVisits || 0} total cumulative views
                  </span>
                </div>

                <div
                  className={styles.statCard}
                  style={{ borderLeft: '4px solid #10B981', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onClick={() => setActiveTab('traffic')}
                  title="Unique organic visitor sessions today (30-min window)"
                >
                  <span className={styles.statLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Unique Visitors Today <Activity size={13} style={{ color: '#10B981' }} />
                  </span>
                  <span className={styles.statValue} style={{ color: '#10B981' }}>
                    {stats.todayUniqueVisitors || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Organic 30-min sessions
                  </span>
                </div>

                <div
                  className={styles.statCard}
                  style={{ borderLeft: '4px solid #F59E0B', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onClick={() => setActiveTab('users')}
                  title="User logins today"
                >
                  <span className={styles.statLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Logins Today <Users size={13} style={{ color: '#F59E0B' }} />
                  </span>
                  <span className={styles.statValue} style={{ color: '#F59E0B' }}>
                    {stats.todayLogins || 0}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Authenticated user logins
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
          {activeTab === 'upload' ? (
            <UploadPage isEmbedded={true} onSuccess={() => { setActiveTab('properties'); loadAdminDashboardData(); }} />
          ) : loadingData ? (
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
                          const percentage = properties.length > 0 ? Math.round((count / properties.length) * 100) : 0;
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
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Occupied / Sold / Taken</span>
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
                              {getStatusLabel(p.status, p.type)}
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
                                {getToggleStatusLabel(p.status, p.type)}
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
                                onClick={() => handleOpenQrModal(`${typeof window !== 'undefined' ? window.location.origin : 'https://horentals.com'}/properties/${p.id}`, p.title)}
                                title="View & Download QR Code"
                                className="btn btn-outline"
                                style={{ padding: '6px', height: '32px', width: '32px', color: 'var(--primary)', borderColor: 'var(--border)' }}
                              >
                                <QrCode size={14} />
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
                          {getStatusLabel(p.status, p.type)}
                        </span>
                      </div>

                      <div className={styles.adminCardMeta}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                          GH₵ {p.price.toLocaleString()} <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{getPricePeriodLabel(p.description, true)}</span>
                        </span>
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
                          {getToggleStatusLabel(p.status, p.type)}
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
                          onClick={() => handleOpenQrModal(`${typeof window !== 'undefined' ? window.location.origin : 'https://horentals.com'}/properties/${p.id}`, p.title)}
                          className="btn btn-outline"
                          style={{ padding: '8px', minWidth: '40px', flex: '0 0 auto', color: 'var(--primary)' }}
                          title="View & Download QR Code"
                        >
                          <QrCode size={15} />
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
          ) : activeTab === 'moderation' ? (
            (() => {
              const filteredPending = pendingProperties.filter((p) => {
                if (!moderationSearch.trim()) return true;
                const q = moderationSearch.toLowerCase();
                const sName = p.owner?.name || p.landlordName || 'Unknown';
                const sContact = p.contact || p.owner?.email || '';
                return (
                  sName.toLowerCase().includes(q) ||
                  sContact.toLowerCase().includes(q) ||
                  p.title.toLowerCase().includes(q) ||
                  p.location.toLowerCase().includes(q) ||
                  p.type.toLowerCase().includes(q)
                );
              });

              // Group filtered pending properties by submitter (Agent or Landlord)
              interface SubmitterGroup {
                key: string;
                submitterName: string;
                role: string;
                phone: string;
                email: string;
                avatar?: string | null;
                properties: Property[];
              }

              const groupedMap: Record<string, SubmitterGroup> = {};

              filteredPending.forEach((p) => {
                const name = (p.owner?.name || p.landlordName || (p.owner?.email ? p.owner.email.split('@')[0] : 'Direct Submissions')).trim();
                const key = name.toLowerCase();
                if (!groupedMap[key]) {
                  groupedMap[key] = {
                    key,
                    submitterName: name,
                    role: p.owner?.role || (p.landlordName ? 'landlord' : 'agent'),
                    phone: p.contact || '',
                    email: p.owner?.email || '',
                    avatar: null,
                    properties: []
                  };
                }
                groupedMap[key].properties.push(p);
              });

              const submitterGroups = Object.values(groupedMap);

              return (
                <>
                  {/* Moderation Search & Summary Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ position: 'relative', maxWidth: '420px', width: '100%' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search pending by agent name, phone, title..."
                        value={moderationSearch}
                        onChange={(e) => setModerationSearch(e.target.value)}
                        className="form-control"
                        style={{ paddingLeft: '38px', borderRadius: '10px', fontSize: '0.88rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '6px 12px', borderRadius: '16px', backgroundColor: 'var(--bg-surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        👥 {submitterGroups.length} Submitter{submitterGroups.length === 1 ? '' : 's'}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, padding: '6px 12px', borderRadius: '16px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                        ⏳ {filteredPending.length} Total Pending
                      </span>
                    </div>
                  </div>

                  {submitterGroups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <CheckCircle size={40} style={{ color: '#10B981', margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                        {moderationSearch ? 'No matching pending listings found' : 'All Agent Listings are Reviewed!'}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {moderationSearch ? 'Try a different search query.' : 'There are currently no listings awaiting admin approval.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {submitterGroups.map((group) => {
                        const isCollapsed = !!collapsedSubmitters[group.key];
                        const propIds = group.properties.map((p) => p.id);

                        return (
                          <div
                            key={group.key}
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '16px',
                              overflow: 'hidden',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            {/* Group Submitter Header Bar */}
                            <div
                              style={{
                                padding: '14px 18px',
                                backgroundColor: 'var(--bg-surface-secondary)',
                                borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                              }}
                            >
                              <div
                                onClick={() => setCollapsedSubmitters(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: '220px' }}
                                title="Click to collapse / expand this group"
                              >
                                <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', flexShrink: 0 }}>
                                  {group.avatar ? (
                                    <img src={group.avatar} alt={group.submitterName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    group.submitterName.slice(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                      {group.submitterName}
                                    </span>
                                    <span className={`badge badge-${group.role === 'agent' ? 'primary' : 'available'}`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                                      {group.role}
                                    </span>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}>
                                      {group.properties.length} Pending Listing{group.properties.length === 1 ? '' : 's'}
                                    </span>
                                  </div>
                                  {group.phone && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      📞 <a href={`tel:${group.phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{group.phone}</a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Batch Approve All for this Submitter */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveAllProperties(propIds, group.submitterName);
                                  }}
                                  disabled={actionLoading}
                                  className="btn"
                                  style={{
                                    backgroundColor: '#10B981',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '7px 14px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title={`Approve all ${group.properties.length} listings for ${group.submitterName}`}
                                >
                                  <CheckCircle size={14} /> Approve All ({group.properties.length})
                                </button>

                                <button
                                  onClick={() => setCollapsedSubmitters(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                  className="btn btn-outline"
                                  style={{ padding: '7px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-surface)' }}
                                  title={isCollapsed ? 'Expand group' : 'Collapse group'}
                                >
                                  {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                                </button>
                              </div>
                            </div>

                            {/* Submitter Group Content (Desktop Table & Mobile Cards) */}
                            {!isCollapsed && (
                              <>
                                {/* Desktop Table View */}
                                <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`} style={{ margin: 0, border: 'none', borderRadius: 0 }}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th>Listing Info</th>
                                        <th>Type</th>
                                        <th>Price (GH₵)</th>
                                        <th>Location</th>
                                        <th>Date Submitted</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.properties.map((p) => (
                                        <tr key={p.id}>
                                          <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                              <img
                                                src={p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=60&q=80'}
                                                alt={p.title}
                                                style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 }}
                                              />
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{p.title}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID #{p.id}</span>
                                              </div>
                                            </div>
                                          </td>
                                          <td style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{p.type}</td>
                                          <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>GH₵ {p.price.toLocaleString()}</td>
                                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.84rem' }}>{p.location}</td>
                                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {p.createdAt ? new Date(isNaN(Number(p.createdAt)) ? p.createdAt : Number(p.createdAt)).toLocaleDateString() : 'N/A'}
                                          </td>
                                          <td>
                                            <div className={styles.actionsCell} style={{ justifyContent: 'flex-end', gap: '6px' }}>
                                              <Link
                                                href={`/properties/${p.id}`}
                                                target="_blank"
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '0.78rem', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                                              >
                                                Preview
                                              </Link>
                                              <button
                                                onClick={() => handleApproveProperty(p.id)}
                                                disabled={actionLoading}
                                                className="btn"
                                                style={{ padding: '6px 12px', fontSize: '0.78rem', height: '30px', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={() => handleDeleteProperty(p.id)}
                                                disabled={actionLoading}
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '0.78rem', height: '30px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile Card List View for this Submitter */}
                                <div className={styles.mobileCardList} style={{ padding: '12px' }}>
                                  {group.properties.map((p) => (
                                    <div key={p.id} className={styles.adminCardItem} style={{ marginBottom: '10px' }}>
                                      <div className={styles.adminCardHeader}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                          <img
                                            src={p.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=60&q=80'}
                                            alt={p.title}
                                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 }}
                                          />
                                          <div>
                                            <div className={styles.adminCardTitle} style={{ fontSize: '0.92rem' }}>{p.title}</div>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>{p.type} • {p.location}</span>
                                          </div>
                                        </div>
                                        <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>Pending</span>
                                      </div>

                                      <div className={styles.adminCardMeta}>
                                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.98rem' }}>GH₵ {p.price.toLocaleString()}</span>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                          {p.createdAt ? new Date(isNaN(Number(p.createdAt)) ? p.createdAt : Number(p.createdAt)).toLocaleDateString() : 'N/A'}
                                        </span>
                                      </div>

                                      <div className={styles.adminCardActions}>
                                        <Link
                                          href={`/properties/${p.id}`}
                                          target="_blank"
                                          className="btn btn-outline"
                                          style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                        >
                                          Preview
                                        </Link>
                                        <button
                                          onClick={() => handleApproveProperty(p.id)}
                                          disabled={actionLoading}
                                          className="btn"
                                          style={{ padding: '8px 12px', fontSize: '0.8rem', backgroundColor: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700 }}
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleDeleteProperty(p.id)}
                                          disabled={actionLoading}
                                          className="btn btn-outline"
                                          style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()
          ) : activeTab === 'users' ? (
            <>
              {/* User Search Bar */}
              <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or phone..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                  />
                </div>
                {userSearch && (
                  <button onClick={() => setUserSearch('')} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    Clear
                  </button>
                )}
              </div>

              {/* Desktop Table View */}
              <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Last Active</th>
                      <th>System Role</th>
                      <th>Modify Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStandardUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          {userSearch ? 'No users matching your search.' : 'No users found. (Agents and Landlords appear here automatically once approved & verified)'}
                        </td>
                      </tr>
                    ) : (
                      filteredStandardUsers.map((u) => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{u.email}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{u.phone || 'N/A'}</td>
                          <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.82rem' }}>
                            {u.lastLoginAt ? new Date(isNaN(Number(u.lastLoginAt)) ? u.lastLoginAt : Number(u.lastLoginAt)).toLocaleString() : 'Never logged in'}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                textTransform: 'capitalize',
                                backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'agent' ? 'rgba(99, 102, 241, 0.15)' : u.role === 'landlord' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: u.role === 'admin' ? '#EF4444' : u.role === 'agent' ? '#6366F1' : u.role === 'landlord' ? '#D97706' : '#10B981',
                                border: `1px solid ${u.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : u.role === 'agent' ? 'rgba(99, 102, 241, 0.3)' : u.role === 'landlord' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                              }}
                            >
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
                              <option value="agent">Agent</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleResetUserPassword(u.id, u.name, String(u.id))}
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
                {filteredStandardUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>{userSearch ? 'No users matching your search.' : 'No standard users found in the database.'}</p>
                ) : (
                  filteredStandardUsers.map((u) => (
                    <div key={u.id} className={styles.adminCardItem}>
                      <div className={styles.adminCardHeader}>
                        <div>
                          <div className={styles.adminCardTitle}>{u.name}</div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.phone || u.email}</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                            Last Active: {u.lastLoginAt ? new Date(isNaN(Number(u.lastLoginAt)) ? u.lastLoginAt : Number(u.lastLoginAt)).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'capitalize',
                            backgroundColor: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'agent' ? 'rgba(99, 102, 241, 0.15)' : u.role === 'landlord' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: u.role === 'admin' ? '#EF4444' : u.role === 'agent' ? '#6366F1' : u.role === 'landlord' ? '#D97706' : '#10B981',
                            border: `1px solid ${u.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : u.role === 'agent' ? 'rgba(99, 102, 241, 0.3)' : u.role === 'landlord' ? 'rgba(217, 119, 6, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                          }}
                        >
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
                          <option value="agent">Agent</option>
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
              {/* Audit Stats Overview Banner - Desktop & Computers Only */}
              <div className={styles.desktopOnlyStats}>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Log Entries</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{auditLogs.length + contactLogs.length}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Security Audits</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{auditLogs.length}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(193, 18, 31, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Landlord Contacts</div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>{contactLogs.length}</div>
                  </div>
                </div>
              </div>

              {/* Search Bar for Audits & Contact Inquiry Leads */}
              <div style={{ position: 'relative', marginBottom: '18px', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search logs by customer name, phone number, landlord phone, action type, or property..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '38px', paddingRight: auditSearch ? '70px' : '14px', borderRadius: '10px', fontSize: '0.88rem', backgroundColor: 'var(--bg-surface)' }}
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category selector & Modern Cleanup Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px', background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: '14px', border: '1px solid var(--border)' }}>
                {/* Desktop Buttons Filter */}
                <div className={styles.desktopFilters} style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setAuditLogView('all')}
                    className={`btn ${auditLogView === 'all' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '7px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>📁 All Logs</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '8px', background: auditLogView === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-secondary)' }}>{auditLogs.length + contactLogs.length}</span>
                  </button>
                  <button
                    onClick={() => setAuditLogView('system')}
                    className={`btn ${auditLogView === 'system' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '7px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>🛡️ Security Audits</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '8px', background: auditLogView === 'system' ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-secondary)' }}>{auditLogs.length}</span>
                  </button>
                  <button
                    onClick={() => setAuditLogView('contacts')}
                    className={`btn ${auditLogView === 'contacts' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '7px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>📞 Landlord Contacts</span>
                    <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '8px', background: auditLogView === 'contacts' ? 'rgba(255,255,255,0.2)' : 'var(--bg-surface-secondary)' }}>{contactLogs.length}</span>
                  </button>
                </div>

                {/* Mobile Dropdown Select Filter */}
                <div className={styles.mobileFilters} style={{ flex: 1, minWidth: '200px' }}>
                  <select
                    value={auditLogView}
                    onChange={(e) => setAuditLogView(e.target.value as 'all' | 'system' | 'contacts')}
                    className="form-control"
                    style={{ fontSize: '0.85rem', fontWeight: 700, padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)' }}
                    aria-label="Filter Audit Logs"
                  >
                    <option value="all">📁 All Logs ({auditLogs.length + contactLogs.length})</option>
                    <option value="contacts">📞 Landlord Contacts ({contactLogs.length})</option>
                    <option value="system">🛡️ System Security Audits ({auditLogs.length})</option>
                  </select>
                </div>

                {/* Log Cleanup Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-secondary)', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '4px', borderRight: '1px solid var(--border)' }}>
                    <Trash2 size={13} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Clean:</span>
                  </div>
                  <button
                    onClick={() => handleDeleteOldAuditLogs(7)}
                    disabled={actionLoading}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    title="Delete security audit logs older than 7 days"
                  >
                    &gt; 7 Days
                  </button>
                  <button
                    onClick={() => handleDeleteOldAuditLogs(30)}
                    disabled={actionLoading}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    title="Delete security audit logs older than 30 days"
                  >
                    &gt; 30 Days
                  </button>
                  <button
                    onClick={() => handleDeleteOldAuditLogs(0)}
                    disabled={actionLoading}
                    className="btn btn-outline"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', fontWeight: 700, borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    title="Purge all security audit history"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Landlord Contacts Section (First) */}
              {(auditLogView === 'all' || auditLogView === 'contacts') && (() => {
                const filteredContactLogs = contactLogs.filter((log) => {
                  const matchesFilter = auditFilter === 'all' || log.actionType === auditFilter;
                  if (!matchesFilter) return false;
                  if (!auditSearch.trim()) return true;
                  const q = auditSearch.toLowerCase();
                  return (
                    (log.customerName || '').toLowerCase().includes(q) ||
                    (log.customerPhone || '').toLowerCase().includes(q) ||
                    (log.landlordPhone || '').toLowerCase().includes(q) ||
                    (log.actionType || '').toLowerCase().includes(q) ||
                    (log.property?.title || '').toLowerCase().includes(q)
                  );
                });

                return (
                  <div style={{ marginBottom: auditLogView === 'all' ? '24px' : '0px' }}>
                    <div
                      onClick={() => setIsContactsCollapsed(!isContactsCollapsed)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: isContactsCollapsed ? '0px' : '14px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      title={isContactsCollapsed ? 'Click to expand table' : 'Click to collapse table'}
                    >
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📞 Landlord Inquiries &amp; Contact Logs ({filteredContactLogs.length})
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        <span>{isContactsCollapsed ? 'Expand' : 'Collapse'}</span>
                        {isContactsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </div>
                    </div>

                    {!isContactsCollapsed && (
                      <>

                        {/* Batch Selection Action Bar for Contact Leads */}
                        {selectedContactLogIds.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={15} /> {selectedContactLogIds.length} contact lead(s) selected
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => handleDeleteSelectedContactLogs()}
                                disabled={actionLoading}
                                className="btn"
                                style={{ background: '#EF4444', color: '#FFFFFF', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} /> Delete Selected ({selectedContactLogIds.length})
                              </button>
                              <button
                                onClick={() => setSelectedContactLogIds([])}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Desktop Lead Buttons */}
                        <div className={styles.desktopFilters} style={{ gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setAuditFilter('all')}
                            className={`btn ${auditFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px' }}
                          >
                            All Leads ({contactLogs.length})
                          </button>
                          <button
                            onClick={() => setAuditFilter('call')}
                            className={`btn ${auditFilter === 'call' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px' }}
                          >
                            📞 Calls ({contactLogs.filter((l) => l.actionType === 'call').length})
                          </button>
                          <button
                            onClick={() => setAuditFilter('whatsapp')}
                            className={`btn ${auditFilter === 'whatsapp' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px' }}
                          >
                            💬 WhatsApp ({contactLogs.filter((l) => l.actionType === 'whatsapp').length})
                          </button>
                          <button
                            onClick={() => setAuditFilter('book_viewing')}
                            className={`btn ${auditFilter === 'book_viewing' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px' }}
                          >
                            📅 Viewings ({contactLogs.filter((l) => l.actionType === 'book_viewing').length})
                          </button>
                          <button
                            onClick={() => setAuditFilter('sms')}
                            className={`btn ${auditFilter === 'sms' ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '14px' }}
                          >
                            📱 SMS ({contactLogs.filter((l) => l.actionType === 'sms').length})
                          </button>
                        </div>

                        {/* Mobile Lead Select Dropdown */}
                        <div className={styles.mobileFilters} style={{ marginBottom: '12px' }}>
                          <select
                            value={auditFilter}
                            onChange={(e) => setAuditFilter(e.target.value as 'all' | 'call' | 'whatsapp' | 'book_viewing' | 'sms')}
                            className="form-control"
                            style={{ fontSize: '0.85rem', fontWeight: 700, padding: '8px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-surface)' }}
                            aria-label="Filter Leads"
                          >
                            <option value="all">🔍 All Inquiry Leads ({contactLogs.length})</option>
                            <option value="call">📞 Phone Calls ({contactLogs.filter((l) => l.actionType === 'call').length})</option>
                            <option value="whatsapp">💬 WhatsApp Inquiries ({contactLogs.filter((l) => l.actionType === 'whatsapp').length})</option>
                            <option value="book_viewing">📅 Viewing Bookings ({contactLogs.filter((l) => l.actionType === 'book_viewing').length})</option>
                            <option value="sms">📱 SMS Leads ({contactLogs.filter((l) => l.actionType === 'sms').length})</option>
                          </select>
                        </div>

                        <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={filteredContactLogs.length > 0 && filteredContactLogs.every((l) => selectedContactLogIds.includes(l.id))}
                                    onChange={() => handleSelectAllContactLogs(filteredContactLogs)}
                                    aria-label="Select all contact inquiry logs"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                  />
                                </th>
                                <th>Timestamp</th>
                                <th>Customer Name</th>
                                <th>Customer Phone</th>
                                <th>Action Type</th>
                                <th>Landlord Number</th>
                                <th>Property Title</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredContactLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    {auditSearch ? 'No matching contact records found.' : 'No contact lead records found.'}
                                  </td>
                                </tr>
                              ) : (
                                filteredContactLogs.map((log) => {
                                  const isSelected = selectedContactLogIds.includes(log.id);
                                  return (
                                    <tr key={log.id} style={{ backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                                      <td style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleSelectContactLog(log.id)}
                                          aria-label={`Select contact log ${log.id}`}
                                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                        />
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                        {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                                      </td>
                                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.customerName}</td>
                                      <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{log.customerPhone}</td>
                                      <td>
                                        <span className="badge badge-available" style={{ fontSize: '0.68rem', padding: '3px 8px', textTransform: 'capitalize' }}>
                                          {log.actionType === 'call' && '📞 Phone Call'}
                                          {log.actionType === 'whatsapp' && '💬 WhatsApp'}
                                          {log.actionType === 'book_viewing' && '📅 Viewing'}
                                          {log.actionType === 'sms' && '📱 SMS Lead'}
                                          {!['call', 'whatsapp', 'book_viewing', 'sms'].includes(log.actionType) && log.actionType}
                                        </span>
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{log.landlordPhone}</td>
                                      <td style={{ color: 'var(--text-primary)' }}>
                                        {log.property ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <Link
                                              href={`/properties/${log.property.id}`}
                                              target="_blank"
                                              style={{
                                                color: 'var(--text-primary)',
                                                fontWeight: 700,
                                                fontSize: '0.86rem',
                                                textDecoration: 'none',
                                                lineHeight: 1.35
                                              }}
                                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                                            >
                                              {log.property.title}
                                            </Link>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                              {log.property.price !== undefined && log.property.price !== null && (
                                                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                                  GH₵{log.property.price.toLocaleString()}
                                                </span>
                                              )}
                                              {log.property.location && (
                                                <>
                                                  <span style={{ opacity: 0.4 }}>•</span>
                                                  <span style={{ color: 'var(--text-muted)' }}>{log.property.location}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>N/A</span>
                                        )}
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <button
                                          onClick={() => handleDeleteSelectedContactLogs([log.id])}
                                          disabled={actionLoading}
                                          title="Delete this contact record"
                                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Contact Cards */}
                        <div className={styles.mobileCardList}>
                          {filteredContactLogs.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>{auditSearch ? 'No matching contact records.' : 'No contact records found.'}</p>
                          ) : (
                            filteredContactLogs.map((log) => {
                              const isSelected = selectedContactLogIds.includes(log.id);
                              return (
                                <div key={log.id} className={styles.adminCardItem} style={{ border: isSelected ? '1px solid var(--primary)' : undefined }}>
                                  <div className={styles.adminCardHeader}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectContactLog(log.id)}
                                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
                                      />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div className={styles.adminCardTitle} style={{ fontSize: '0.98rem', fontWeight: 800, wordBreak: 'break-word' }}>{log.customerName}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
                                          👤 Phone: <a href={`tel:${log.customerPhone}`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{log.customerPhone}</a>
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                      <span className={`badge ${log.actionType === 'whatsapp' ? 'badge-pending' :
                                        log.actionType === 'book_viewing' ? 'badge-primary' : 'badge-available'
                                        }`} style={{ fontSize: '0.65rem' }}>
                                        {log.actionType}
                                      </span>
                                      <button
                                        onClick={() => handleDeleteSelectedContactLogs([log.id])}
                                        disabled={actionLoading}
                                        title="Delete contact record"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '2px', cursor: 'pointer' }}
                                      >
                                        <Trash2 size={15} style={{ color: '#EF4444' }} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', paddingLeft: '28px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text-secondary)', gap: '8px' }}>
                                      <span style={{ flexShrink: 0 }}>🏢 Property:</span>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word' }}>
                                        {log.property ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <Link href={`/properties/${log.property.id}`} target="_blank" style={{ color: 'var(--text-primary)', fontWeight: 700, textDecoration: 'none' }}>
                                              {log.property.title}
                                            </Link>
                                            {log.property.price !== undefined && log.property.price !== null && (
                                              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 800 }}>
                                                GH₵{log.property.price.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        ) : 'N/A'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '6px' }}>
                                      <span style={{ flexShrink: 0 }}>📞 Landlord:</span>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <a href={`tel:${log.landlordPhone}`} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{log.landlordPhone}</a>
                                        <a href={`tel:${log.landlordPhone}`} title="Call Landlord" style={{ color: 'var(--primary)', fontSize: '0.9rem', display: 'inline-flex' }}>
                                          📞
                                        </a>
                                        {(() => {
                                          const cleanWa = (log.landlordPhone || '').replace(/[^0-9]/g, '');
                                          const waTarget = cleanWa.startsWith('233') ? cleanWa : (cleanWa.startsWith('0') ? '233' + cleanWa.substring(1) : (cleanWa.length === 9 ? '233' + cleanWa : cleanWa));
                                          return (
                                            <a href={`https://wa.me/${waTarget}`} target="_blank" rel="noopener noreferrer" title="WhatsApp Landlord" style={{ color: '#25D366', fontSize: '0.9rem', display: 'inline-flex' }}>
                                              💬
                                            </a>
                                          );
                                        })()}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                      <span>🕒 Time:</span>
                                      <span>
                                        {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* System Security Audit Logs Section (Second) */}
              {(auditLogView === 'all' || auditLogView === 'system') && (() => {
                const filteredAuditLogs = auditLogs.filter((log) => {
                  if (!auditSearch.trim()) return true;
                  const q = auditSearch.toLowerCase();
                  return (
                    (log.action || '').toLowerCase().includes(q) ||
                    (log.details || '').toLowerCase().includes(q) ||
                    (log.userEmail || '').toLowerCase().includes(q)
                  );
                });

                return (
                  <div>
                    <div
                      onClick={() => setIsSecurityAuditsCollapsed(!isSecurityAuditsCollapsed)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: isSecurityAuditsCollapsed ? '0px' : '14px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s ease'
                      }}
                      title={isSecurityAuditsCollapsed ? 'Click to expand table' : 'Click to collapse table'}
                    >
                      <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🛡️ System &amp; Account Security Audit Trail ({filteredAuditLogs.length})
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        <span>{isSecurityAuditsCollapsed ? 'Expand' : 'Collapse'}</span>
                        {isSecurityAuditsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </div>
                    </div>

                    {!isSecurityAuditsCollapsed && (
                      <>

                        {/* Batch Selection Action Bar for Security Audits */}
                        {selectedAuditLogIds.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', marginBottom: '14px', animation: 'fadeIn 0.2s ease' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CheckCircle size={15} /> {selectedAuditLogIds.length} security log(s) selected
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                onClick={() => handleDeleteSelectedAuditLogs()}
                                disabled={actionLoading}
                                className="btn"
                                style={{ background: '#EF4444', color: '#FFFFFF', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} /> Delete Selected ({selectedAuditLogIds.length})
                              </button>
                              <button
                                onClick={() => setSelectedAuditLogIds([])}
                                className="btn btn-outline"
                                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, borderRadius: '8px', backgroundColor: 'var(--bg-surface)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        <div className={`${styles.tableContainer} ${styles.desktopOnlyTable}`}>
                          <table className={styles.table}>
                            <thead>
                              <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={filteredAuditLogs.length > 0 && filteredAuditLogs.every((l) => selectedAuditLogIds.includes(l.id))}
                                    onChange={() => handleSelectAllAuditLogs(filteredAuditLogs)}
                                    aria-label="Select all security audit logs"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                  />
                                </th>
                                <th>Timestamp</th>
                                <th>Action</th>
                                <th>Details</th>
                                <th>User / Email</th>
                                <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAuditLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    {auditSearch ? 'No security logs match your search.' : 'No security audit logs recorded yet. Crucial actions (logins, password resets, role updates) will appear here.'}
                                  </td>
                                </tr>
                              ) : (
                                filteredAuditLogs.map((log) => {
                                  const isSelected = selectedAuditLogIds.includes(log.id);
                                  return (
                                    <tr key={log.id} style={{ backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                                      <td style={{ textAlign: 'center' }}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleSelectAuditLog(log.id)}
                                          aria-label={`Select log ${log.id}`}
                                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                        />
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                        {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                                      </td>
                                      <td>
                                        <span className={`badge ${log.action.includes('RESET') ? 'badge-primary' :
                                          log.action.includes('LOGIN') ? 'badge-available' :
                                            log.action.includes('ROLE') ? 'badge-primary' : 'badge-available'
                                          }`} style={{ fontSize: '0.68rem', padding: '3px 8px', fontWeight: 700 }}>
                                          {log.action}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                        {log.details}
                                      </td>
                                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                        {log.userEmail || 'System'}
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <button
                                          onClick={() => handleDeleteSelectedAuditLogs([log.id])}
                                          disabled={actionLoading}
                                          title="Delete this audit log"
                                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Security Audit Cards */}
                        <div className={styles.mobileCardList}>
                          {filteredAuditLogs.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>{auditSearch ? 'No matching security records.' : 'No security audit logs recorded yet.'}</p>
                          ) : (
                            filteredAuditLogs.map((log) => {
                              const isSelected = selectedAuditLogIds.includes(log.id);
                              return (
                                <div key={log.id} className={styles.adminCardItem} style={{ border: isSelected ? '1px solid var(--primary)' : undefined }}>
                                  <div className={styles.adminCardHeader}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleSelectAuditLog(log.id)}
                                        style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                      />
                                      <div>
                                        <div className={styles.adminCardTitle} style={{ fontSize: '0.9rem' }}>{log.details}</div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                          {new Date(isNaN(Number(log.createdAt)) ? log.createdAt : Number(log.createdAt)).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{log.action}</span>
                                      <button
                                        onClick={() => handleDeleteSelectedAuditLogs([log.id])}
                                        disabled={actionLoading}
                                        title="Delete log"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '2px', cursor: 'pointer' }}
                                      >
                                        <Trash2 size={15} style={{ color: '#EF4444' }} />
                                      </button>
                                    </div>
                                  </div>
                                  {log.userEmail && (
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', paddingLeft: '28px' }}>
                                      User: {log.userEmail}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
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
                            <span className={`badge ${report.status === 'resolved' ? 'badge-available' : report.status === 'dismissed' ? 'badge-rented' : 'badge-primary'
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
                        <span className={`badge ${report.status === 'resolved' ? 'badge-available' : report.status === 'dismissed' ? 'badge-rented' : 'badge-primary'
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
          ) : activeTab === 'agents' ? (
            <>
              {/* Shareable Links */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <a
                  href="/register-agent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', textDecoration: 'none', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  🛡️ Open Agent Registration
                </a>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const link = `${window.location.origin}/register-agent`;
                    navigator.clipboard.writeText(link);
                    alert('Copied link: ' + link);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  🔗 Copy Agent Link
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => handleOpenQrModal(`${typeof window !== 'undefined' ? window.location.origin : 'https://horentals.com'}/register-agent`, 'Agent Registration Portal')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  <QrCode size={14} /> Agent QR
                </button>
              </div>

              {/* Registered Agents Section */}
              <div className={styles.card} style={{ marginBottom: '24px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Registered Agents Directory ({agentUsers.length})
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      All registered agents with active platform accounts.
                    </p>
                  </div>
                  <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search agents by name, phone, location..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      className="form-control"
                      style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
                    />
                  </div>
                </div>

                <div className={styles.tableResponsive}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Agent Name</th>
                        <th>Contact / WhatsApp</th>
                        <th>Location</th>
                        <th>Listings &amp; Billing</th>
                        <th>Verification Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgentUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            {agentSearch ? 'No agents matching your search.' : 'No registered agents found.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAgentUsers.map((ag) => {
                          const waNumber = ag.agentWhatsapp || ag.phone || '';
                          const waClean = waNumber.replace(/[^0-9]/g, '');
                          const waLink = waClean ? `https://wa.me/${waClean.startsWith('0') ? '233' + waClean.substring(1) : waClean}` : '';
                          const agentListings = properties.filter((p) => String(p.owner?.id) === String(ag.id));
                          const count = agentListings.length;
                          const billableCount = Math.max(0, count - 2);

                          return (
                            <tr key={ag.id}>
                              <td>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ag.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ag.email || ag.phone}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{ag.phone || '—'}</div>
                                {waLink && (
                                  <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', color: '#25D366', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    💬 WhatsApp
                                  </a>
                                )}
                              </td>
                              <td style={{ fontSize: '0.82rem' }}>{ag.agentLocation || 'Ho, Ghana'}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                                    {count} {count === 1 ? 'Listing' : 'Listings'}
                                  </span>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '8px',
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    backgroundColor: billableCount > 0 ? '#FEF3C7' : '#ECFDF5',
                                    color: billableCount > 0 ? '#92400E' : '#047857'
                                  }}>
                                    {billableCount === 0 ? `Free Tier (${count}/2)` : `${billableCount} Billable (${billableCount * 10} GHS/mo)`}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="badge" style={{
                                  backgroundColor: ag.verificationStatus === 'verified' ? '#ECFDF5' : '#FEF3C7',
                                  color: ag.verificationStatus === 'verified' ? '#047857' : '#B45309',
                                  fontSize: '0.72rem'
                                }}>
                                  {ag.verificationStatus || 'unverified'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    onClick={() => setSelectedAgent(ag)}
                                    className="btn btn-outline"
                                    style={{ padding: '4px 10px', fontSize: '0.72rem', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                                    title="Preview agent registration details"
                                  >
                                    👁️ Preview Form
                                  </button>

                                  <button
                                    onClick={() => handleDeleteUser(ag.id)}
                                    disabled={actionLoading || ag.id === user?.id}
                                    className="btn btn-outline"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.72rem',
                                      color: 'var(--danger)',
                                      borderColor: 'rgba(239, 68, 68, 0.4)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Delete agent account"
                                  >
                                    <Trash2 size={13} />
                                    <span>Delete</span>
                                  </button>

                                  <select
                                    value={ag.verificationStatus === 'verified' ? 'verified' : 'unverified'}
                                    onChange={(e) => handleVerifyAgent(ag.id, e.target.value)}
                                    disabled={actionLoading}
                                    className={styles.selectRole}
                                    style={{
                                      fontSize: '0.76rem',
                                      padding: '4px 8px',
                                      fontWeight: 700,
                                      backgroundColor: ag.verificationStatus === 'verified' ? '#ECFDF5' : '#FEF3C7',
                                      color: ag.verificationStatus === 'verified' ? '#047857' : '#B45309',
                                      border: `1px solid ${ag.verificationStatus === 'verified' ? '#10B981' : '#F59E0B'}`,
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <option value="verified" style={{ backgroundColor: '#fff', color: '#047857', fontWeight: 700 }}>✓ Verify</option>
                                    <option value="unverified" style={{ backgroundColor: '#fff', color: '#B45309', fontWeight: 600 }}>Unverify</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'landlords' ? (
            <>
              {/* Landlords Stats */}
              <div className={styles.statsGrid} style={{ marginBottom: '20px' }}>
                <div className={styles.statCard} style={{ borderLeft: '4px solid #3B82F6' }}>
                  <span className={styles.statLabel}>Total Landlord Forms</span>
                  <span className={styles.statValue}>{landlordRegistrations.length}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Direct property submissions</span>
                </div>
                <div className={styles.statCard} style={{ borderLeft: '4px solid #10B981' }}>
                  <span className={styles.statLabel}>Published / Verified</span>
                  <span className={styles.statValue} style={{ color: '#10B981' }}>
                    {landlordRegistrations.filter((r) => r.status === 'Verified').length}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Live listings published</span>
                </div>
                <div className={styles.statCard} style={{ borderLeft: '4px solid #F59E0B' }}>
                  <span className={styles.statLabel}>Pending Review</span>
                  <span className={styles.statValue} style={{ color: '#F59E0B' }}>
                    {landlordRegistrations.filter((r) => r.status !== 'Verified').length}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Awaiting admin approval</span>
                </div>
              </div>

              {/* Shareable Links */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <a
                  href="/landlord-registration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', textDecoration: 'none', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  🌐 Open Landlord Form
                </a>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const link = `${window.location.origin}/landlord-registration`;
                    navigator.clipboard.writeText(link);
                    alert('Copied link: ' + link);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  🔗 Copy Landlord Link
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => handleOpenQrModal(`${typeof window !== 'undefined' ? window.location.origin : 'https://horentals.com'}/landlord-registration`, 'Landlord Property Submission Portal')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 16px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  <QrCode size={14} /> Landlord QR
                </button>
              </div>

              {/* Landlords search controls */}
              <div className={styles.tableControls} style={{ marginBottom: '20px' }}>
                <div className={styles.searchWrapper}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by landlord name, town/city, phone number, plan..."
                    value={landlordSearch}
                    onChange={(e) => setLandlordSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {/* Landlords list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {landlordRegistrations.filter((r) =>
                  (r.name + r.city + r.phone1 + (r.propAddress || '') + (r.plan || '')).toLowerCase().includes(landlordSearch.toLowerCase())
                ).length === 0 ? (
                  <div className={styles.emptyState}>
                    <AlertTriangle size={32} />
                    <p>No landlord registrations found matching your search.</p>
                  </div>
                ) : (
                  landlordRegistrations
                    .filter((r) =>
                      (r.name + r.city + r.phone1 + (r.propAddress || '') + (r.plan || '')).toLowerCase().includes(landlordSearch.toLowerCase())
                    )
                    .map((r) => {
                      const cleanRPhone = (r.phone1 || '').replace(/[^0-9]/g, '');
                      const matchingProps = properties.filter((p) => {
                        const cleanPPhone = (p.contact || '').replace(/[^0-9]/g, '');
                        return (
                          (cleanPPhone && cleanRPhone && cleanPPhone.endsWith(cleanRPhone.slice(-9))) ||
                          (p.landlordName && p.landlordName.toLowerCase().trim() === r.name.toLowerCase().trim()) ||
                          (r.propGps && p.digitalAddress && p.digitalAddress.toLowerCase().trim() === r.propGps.toLowerCase().trim())
                        );
                      });
                      const isExpanded = expandedLandlordId === r.id;

                      return (
                        <div key={r.id} className={styles.landlordCard} style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr', gap: '16px', padding: '20px' }}>
                            {/* Profile side */}
                            <div className={styles.landlordProfileSide}>
                              <div className={styles.landlordAvatarRow}>
                                <div className={styles.landlordAvatarCircle}>
                                  {r.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div>
                                  <h3 className={styles.landlordNameText}>{r.name}</h3>
                                  <div className={styles.landlordMetaText}>
                                    Ref ID: #{r.id}
                                  </div>
                                </div>
                              </div>

                              <div className={styles.landlordMetaText} style={{ marginTop: '4px', fontWeight: 600 }}>
                                Registered: {r.createdAt ? (isNaN(Number(r.createdAt)) ? new Date(r.createdAt) : new Date(Number(r.createdAt))).toLocaleDateString() : 'Unknown'}
                              </div>

                              <div className={styles.landlordBadgesRow} style={{ marginTop: '8px' }}>
                                <span
                                  className={`${styles.landlordBadge} ${r.status === 'Verified' ? styles.landlordBadgeVerified : styles.landlordBadgePending
                                    }`}
                                >
                                  {r.status}
                                </span>
                                {r.agreementSigned && (
                                  <span className={`${styles.landlordBadge} ${styles.landlordBadgeAgreement}`}>
                                    Agreement Signed
                                  </span>
                                )}
                                <span
                                  className={styles.landlordBadge}
                                  style={{
                                    backgroundColor: r.plan === 'Premium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                                    color: r.plan === 'Premium' ? '#D97706' : '#2563EB',
                                    border: `1px solid ${r.plan === 'Premium' ? '#F59E0B' : '#93C5FD'}`,
                                    fontWeight: 700
                                  }}
                                >
                                  {r.plan === 'Premium' ? '⭐ Premium Plan (GHS 100)' : 'Basic Plan (GHS 50)'}
                                </span>
                              </div>
                            </div>

                            {/* Info details grid */}
                            <div className={styles.landlordInfoGrid}>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>Primary Phone</span>
                                <span className={styles.infoValue}>{r.phone1}</span>
                              </div>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>City / Town</span>
                                <span className={styles.infoValue}>{r.city}</span>
                              </div>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>Property Address</span>
                                <span className={styles.infoValue} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                                  {r.propAddress}
                                </span>
                              </div>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>Monthly Rent</span>
                                <span className={styles.infoValue} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                  GHS {r.rent.toLocaleString()}
                                </span>
                              </div>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>Property Type(s)</span>
                                <span className={styles.infoValue}>{r.propType || '—'}</span>
                              </div>
                              <div className={styles.infoBlock}>
                                <span className={styles.infoLabel}>Rooms Available</span>
                                <span className={styles.infoValue}>{r.rooms || '—'}</span>
                              </div>
                            </div>

                            {/* Actions side */}
                            <div className={styles.landlordActionsSide} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', justifyContent: 'center' }}>
                              <a
                                href={`/upload?landlordName=${encodeURIComponent(r.name)}&contact=${encodeURIComponent(r.phone1)}&city=${encodeURIComponent(r.city || '')}&gps=${encodeURIComponent(r.propGps || '')}&landmark=${encodeURIComponent(r.propLandmark || '')}`}
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '7px 12px', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none', backgroundColor: '#3B82F6', borderColor: '#3B82F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                              >
                                <Plus size={14} /> Add New Listing
                              </a>

                              {r.status !== 'Verified' ? (
                                <button
                                  className="btn btn-primary"
                                  style={{ width: '100%', padding: '7px 12px', fontSize: '0.8rem', backgroundColor: '#10B981', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                                  onClick={() => handlePublishLandlord(r.id)}
                                  disabled={actionLoading}
                                >
                                  <UploadCloud size={14} /> Publish Listing
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline"
                                  style={{ width: '100%', padding: '7px 12px', fontSize: '0.8rem', color: '#10B981', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                                  onClick={() => handlePublishLandlord(r.id)}
                                  disabled={actionLoading}
                                  title="Republish this listing to make it active"
                                >
                                  <RefreshCw size={14} /> Republish Listing
                                </button>
                              )}

                              <button
                                className="btn btn-outline"
                                style={{ width: '100%', padding: '7px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: isExpanded ? 'var(--primary)' : 'var(--border)' }}
                                onClick={() => setExpandedLandlordId(isExpanded ? null : r.id)}
                              >
                                <Building size={14} /> {isExpanded ? 'Hide Properties' : `Properties (${matchingProps.length})`} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              <button
                                className="btn btn-outline"
                                style={{ width: '100%', padding: '7px 12px', fontSize: '0.78rem' }}
                                onClick={() => setSelectedLandlord(r)}
                              >
                                Review Details
                              </button>

                              <button
                                className="btn btn-outline"
                                style={{ width: '100%', padding: '6px 12px', fontSize: '0.75rem', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                                onClick={() => handleDeleteLandlord(r.id)}
                                disabled={actionLoading}
                              >
                                Delete Record
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Dropdown: Landlord's Properties List */}
                          {isExpanded && (
                            <div style={{ backgroundColor: 'var(--bg-surface-secondary)', borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Building size={16} color="var(--primary)" />
                                  Live Properties for {r.name} ({matchingProps.length})
                                </div>
                                <a
                                  href={`/upload?landlordName=${encodeURIComponent(r.name)}&contact=${encodeURIComponent(r.phone1)}&city=${encodeURIComponent(r.city || '')}&gps=${encodeURIComponent(r.propGps || '')}&landmark=${encodeURIComponent(r.propLandmark || '')}`}
                                  className="btn btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--border)' }}
                                >
                                  <Plus size={12} /> Add Another Listing
                                </a>
                              </div>

                              {matchingProps.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                                    No live properties currently found for this landlord.
                                  </p>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                                    <button
                                      className="btn btn-primary"
                                      style={{ padding: '6px 12px', fontSize: '0.78rem', backgroundColor: '#10B981', borderColor: '#10B981' }}
                                      onClick={() => handlePublishLandlord(r.id)}
                                      disabled={actionLoading}
                                    >
                                      <RefreshCw size={13} /> Republish Original Submission
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                                  {matchingProps.map((prop) => (
                                    <div key={prop.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                      {prop.imageUrl ? (
                                        <img src={prop.imageUrl} alt={prop.title} style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                                      ) : (
                                        <div style={{ width: '50px', height: '50px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                          <Building size={20} color="var(--text-muted)" />
                                        </div>
                                      )}
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {prop.title}
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 700, margin: '2px 0' }}>
                                          GHS {prop.price.toLocaleString()}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: prop.status === 'available' ? '#ECFDF5' : '#FEE2E2', color: prop.status === 'available' ? '#047857' : '#B91C1C', fontWeight: 600, textTransform: 'capitalize' }}>
                                            {prop.status}
                                          </span>
                                          <a
                                            href={`/properties/${prop.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                                          >
                                            View ↗
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </>
          ) : activeTab === 'traffic' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* ── Section: Key Metrics ──────────────────────────────────── */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '2px' }}>Overview</p>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Page View Metrics</h2>
                  </div>
                  {/* Period Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-secondary)', borderRadius: '24px', padding: '4px', border: '1px solid var(--border)' }}>
                    {(['today', '7d', '30d', '90d', 'all'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAnalyticsPeriod(p)}
                        style={{
                          padding: '5px 13px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: 'none',
                          backgroundColor: analyticsPeriod === p ? 'var(--primary)' : 'transparent',
                          color: analyticsPeriod === p ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '3 Mo' : 'All Time'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  {[
                    { label: 'Today', value: analytics?.todayViews ?? '—', color: '#06B6D4', icon: '☀️' },
                    { label: 'This Week', value: analytics?.weekViews ?? '—', color: '#8B5CF6', icon: '📅' },
                    { label: 'This Month', value: analytics?.monthViews ?? '—', color: '#10B981', icon: '📆' },
                    { label: 'All Time', value: analytics?.totalViews ?? '—', color: 'var(--primary)', icon: '🌐' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="card glass" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontSize: '1rem' }}>{icon}</span>
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>
                        {analyticsLoading ? <Loader size={20} className="animate-spin" /> : value?.toLocaleString?.() ?? value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section: Views Over Time ───────────────────────────────── */}
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '2px' }}>Trend</p>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Views Over Time</h2>
                </div>
                <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  {analytics?.viewsOverTime?.length ? (() => {
                    const total = analytics.viewsOverTime.reduce((s: number, d: any) => s + d.count, 0);
                    const peak = Math.max(...analytics.viewsOverTime.map((d: any) => d.count));
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Total Views</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>{total.toLocaleString()}</div>
                        </div>
                        <div style={{ width: '1px', height: '32px', background: 'var(--border)' }} />
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Peak Day</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f59e0b' }}>{peak.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })() : null}
                  {analyticsLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader size={28} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
                  ) : analytics?.viewsOverTime?.length ? (() => {
                    const visible = analytics.viewsOverTime.slice(-30);
                    const maxCount = Math.max(...visible.map((d: any) => d.count), 1);
                    const CHART_H = 180;
                    const yTicks = [1, 0.75, 0.5, 0.25, 0].map(pct => Math.round(pct * maxCount));
                    const step = visible.length > 20 ? 5 : visible.length > 10 ? 3 : 1;
                    return (
                      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
                        <div style={{ display: 'flex', minWidth: `${Math.max(visible.length * 28, 320)}px` }}>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', height: `${CHART_H}px`, minWidth: '34px', flexShrink: 0 }}>
                            {yTicks.map((val) => (
                              <span key={val} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1 }}>{val}</span>
                            ))}
                          </div>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${CHART_H}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 0 }}>
                              {yTicks.map((val, i) => (
                                <div key={val} style={{ borderTop: `1px ${i === 4 ? 'solid' : 'dashed'} var(--border)`, opacity: i === 4 ? 1 : 0.5, width: '100%' }} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: `${CHART_H}px`, position: 'relative', zIndex: 1 }}>
                              {visible.map((d: any) => {
                                const barH = d.count > 0 ? Math.max(4, Math.round((d.count / maxCount) * CHART_H)) : 0;
                                const isPeak = d.count === maxCount && d.count > 0;
                                return (
                                  <div key={d.date} title={`${d.date}: ${d.count} view${d.count !== 1 ? 's' : ''}`} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative', cursor: 'default' }}>
                                    {isPeak && (
                                      <span style={{ position: 'absolute', bottom: `${barH + 4}px`, fontSize: '0.62rem', fontWeight: 800, color: '#f59e0b', whiteSpace: 'nowrap', background: 'var(--bg-surface)', padding: '0 3px', borderRadius: '3px', zIndex: 3, border: '1px solid #f59e0b22' }}>
                                        {d.count}
                                      </span>
                                    )}
                                    <div style={{
                                      width: '100%', borderRadius: '4px 4px 0 0', height: `${barH}px`,
                                      background: isPeak ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)' : d.count > 0 ? 'linear-gradient(180deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, #000) 100%)' : 'transparent',
                                      boxShadow: isPeak ? '0 0 10px rgba(245,158,11,0.35)' : undefined,
                                      transition: 'height 0.4s cubic-bezier(.4,0,.2,1)',
                                    }} />
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '3px', marginTop: '8px', height: '36px' }}>
                              {visible.map((d: any, i: number) => (
                                <div key={d.date} style={{ flex: '1 1 0', display: 'flex', justifyContent: 'center', overflow: 'visible' }}>
                                  {(i % step === 0 || i === visible.length - 1) && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', transform: 'rotate(-40deg)', whiteSpace: 'nowrap', transformOrigin: 'top center', display: 'block', fontWeight: 600 }}>
                                      {d.date.slice(5)}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No view data for this period.</p>
                  )}
                </div>
              </div>

              {/* ── Section: Sources + Top Properties (2-col) ─────────────── */}
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '2px' }}>Breakdown</p>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Traffic Sources & Top Listings</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                  {/* Traffic Sources */}
                  <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <PieChart size={18} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Traffic Sources</h3>
                    </div>
                    {analyticsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Loader size={24} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
                    ) : analytics?.sources?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {analytics.sources.map((s: any) => {
                          const srcColors: Record<string, string> = {
                            'TikTok': '#010101', 'Instagram': '#E1306C', 'Facebook': '#1877F2',
                            'WhatsApp': '#25D366', 'Google': '#4285F4', 'X / Twitter': '#1DA1F2',
                            'Direct / Unknown': '#94A3B8',
                          };
                          const color = srcColors[s.source] || 'var(--primary)';
                          return (
                            <div key={s.source}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0, display: 'block' }} />
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.source}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.count}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.percentage}%</span>
                                </div>
                              </div>
                              <div style={{ height: '5px', borderRadius: '99px', backgroundColor: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '99px', backgroundColor: color, width: `${s.percentage}%`, transition: 'width 0.6s cubic-bezier(.4,0,.2,1)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>No source data yet. UTM tracking will populate this as visitors arrive.</p>
                    )}
                  </div>

                  {/* Top Properties */}
                  <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                      <Building size={18} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>Top Viewed Properties</h3>
                    </div>
                    {analyticsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Loader size={24} className="animate-spin" style={{ color: 'var(--primary)' }} /></div>
                    ) : analytics?.topProperties?.length ? (() => {
                      const maxViews = Math.max(...analytics.topProperties.map((p: any) => p.views), 1);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {analytics.topProperties.map((p: any, i: number) => (
                            <div key={p.propertyId}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                <span style={{
                                  minWidth: '22px', height: '22px', borderRadius: '6px',
                                  background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--bg-surface-secondary)',
                                  color: i < 3 ? '#fff' : 'var(--text-muted)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.65rem', fontWeight: 900, flexShrink: 0,
                                }}>{i + 1}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{p.title}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID #{p.propertyId}</div>
                                </div>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>{p.views.toLocaleString()} <span style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--text-muted)' }}>views</span></span>
                              </div>
                              <div style={{ height: '3px', borderRadius: '99px', backgroundColor: 'var(--border)', overflow: 'hidden', marginLeft: '32px' }}>
                                <div style={{ height: '100%', borderRadius: '99px', background: i === 0 ? '#f59e0b' : 'var(--primary)', width: `${Math.round((p.views / maxViews) * 100)}%`, transition: 'width 0.5s ease' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })() : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>No property view data yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section: Campaign Link Generator ───────────────────────── */}
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '2px' }}>Tools</p>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Campaign Link Generator</h2>
                </div>
                <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
                    Generate UTM-tagged links to track which campaign or platform is driving traffic to your listings.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Platform</label>
                      <select value={campPlatform} onChange={e => setCampPlatform(e.target.value)} className="form-control" style={{ backgroundColor: 'var(--bg-surface)', fontSize: '0.85rem' }}>
                        {['tiktok', 'instagram', 'facebook', 'whatsapp', 'google'].map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Base URL</label>
                      <input className="form-control" style={{ fontSize: '0.85rem' }} value={campBaseUrl} onChange={e => setCampBaseUrl(e.target.value)} placeholder="https://horentals.com" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Campaign Name</label>
                      <input className="form-control" style={{ fontSize: '0.85rem' }} value={campCampaign} onChange={e => setCampCampaign(e.target.value)} placeholder="e.g. august_launch" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Content / Ad Label</label>
                      <input className="form-control" style={{ fontSize: '0.85rem' }} value={campContent} onChange={e => setCampContent(e.target.value)} placeholder="e.g. video_1" />
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '10px 24px', fontWeight: 700, fontSize: '0.88rem' }}
                    onClick={() => {
                      try {
                        let base = (campBaseUrl || '').trim();
                        if (!base) base = 'https://horentals.com';
                        if (!base.startsWith('http://') && !base.startsWith('https://')) {
                          base = `https://${base}`;
                        }
                        const url = buildTrackingUrl(base, campPlatform, 'social', campCampaign, campContent);
                        setCampGenerated(url);
                        setCampCopied(false);
                      } catch {
                        setCampGenerated('Invalid base URL.');
                      }
                    }}
                  >
                    <Link2 size={15} style={{ marginRight: '6px' }} />
                    Generate Link
                  </button>
                  {campGenerated && (
                    <div style={{ marginTop: '16px', padding: '14px 16px', backgroundColor: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>Generated URL</div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <code style={{ flex: 1, fontSize: '0.78rem', wordBreak: 'break-all', color: 'var(--primary)', lineHeight: 1.5 }}>{campGenerated}</code>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0, fontWeight: 700 }}
                          onClick={() => { navigator.clipboard.writeText(campGenerated); setCampCopied(true); setTimeout(() => setCampCopied(false), 2000); }}
                        >
                          {campCopied ? <><Check size={13} style={{ marginRight: '4px' }} /> Copied!</> : <><Copy size={13} style={{ marginRight: '4px' }} /> Copy</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* SMS BROADCAST & DIRECT MESSAGING STUDIO */}
          {activeTab === 'sms' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Premium Brand Header Banner (Solid Vibrant HO Rentals Red) */}
              <div style={{
                padding: '28px 32px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #C1121F 0%, #DC2626 50%, #9E0E18 100%)',
                color: '#ffffff',
                boxShadow: '0 14px 36px -4px rgba(193, 18, 31, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                {/* Decorative background glow circles */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '15%',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '5px 14px',
                    borderRadius: '24px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '12px'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }}></span>
                    <span>SailUp Gateway Active</span>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span style={{ color: '#FEF08A' }}>Sender ID: {smsSenderId || 'HORENTALS'}</span>
                  </div>

                  <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                    SMS Broadcast &amp; Engagement Studio
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.92rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.5 }}>
                    Reach tenants, verified agents, and property owners instantly with branded SMS notifications, rental updates, and bulk announcements across Ho and Volta Region.
                  </p>
                </div>

                {/* Right Quick Info Card */}
                <div style={{
                  position: 'relative',
                  zIndex: 1,
                  background: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  minWidth: '220px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 700 }}>Approved Sender</span>
                    <span style={{ fontSize: '0.72rem', background: '#10B981', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 800 }}>LIVE</span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#FEF08A', letterSpacing: '0.05em' }}>
                    {smsSenderId || 'HORENTALS'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.75)' }}>
                    ⚡ 160 Chars / Single Segment
                  </div>
                </div>
              </div>

              {/* Status Alert Notification */}
              {smsResult && (
                <div className="animate-fade-in" style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: smsResult.success ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1.5px solid ${smsResult.success ? '#10B981' : '#EF4444'}`,
                  color: smsResult.success ? '#065F46' : '#991B1B',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {smsResult.success ? (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                      <CheckCheck size={18} />
                    </div>
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                      <AlertTriangle size={18} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.95rem' }}>{smsResult.message}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>
                      {smsResult.success ? 'Delivered via SailUp SMS gateway.' : 'Please check the error details or verify your Sender ID on sailup.io.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Row: Metric Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>

                {/* Stat 1: Total Phone Numbers */}
                <div className="card glass" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>All Contactable Users</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {users.filter(u => u.phone).length}
                    </div>
                  </div>
                </div>

                {/* Stat 2: Verified Agents */}
                <div className="card glass" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Verified Agents</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
                      {users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.verificationStatus === 'verified' && u.phone).length}
                    </div>
                  </div>
                </div>

                {/* Stat 3: All Agents & Landlords */}
                <div className="card glass" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Landlords &amp; Agents</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.phone).length}
                    </div>
                  </div>
                </div>

                {/* Stat 4: Regular Tenants */}
                <div className="card glass" style={{ padding: '18px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Tenants &amp; Seekers</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {users.filter(u => u.role === 'user' && u.phone).length}
                    </div>
                  </div>
                </div>

              </div>

              {/* Studio Workspace: 3-Column Layout (Audience / Composer / Live Phone Simulator) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>

                {/* Column 1: Audience & Targeting */}
                <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={19} color="var(--primary)" /> 1. Select Audience
                    </h2>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '10px' }}>
                      Step 1
                    </span>
                  </div>

                  {/* Mode Selector Segmented Switch */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-surface-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setSmsTargetType('single')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: smsTargetType === 'single' ? 'var(--bg-surface)' : 'transparent',
                        color: smsTargetType === 'single' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: smsTargetType === 'single' ? 800 : 600,
                        fontSize: '0.84rem',
                        boxShadow: smsTargetType === 'single' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Smartphone size={15} /> Direct Single Number
                    </button>

                    <button
                      type="button"
                      onClick={() => setSmsTargetType('role')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: smsTargetType === 'role' ? 'var(--bg-surface)' : 'transparent',
                        color: smsTargetType === 'role' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: smsTargetType === 'role' ? 800 : 600,
                        fontSize: '0.84rem',
                        boxShadow: smsTargetType === 'role' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Radio size={15} /> Group Broadcast
                    </button>
                  </div>

                  {/* Single Mode Input */}
                  {smsTargetType === 'single' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            Recipient Phone Number *
                          </label>
                          {smsCustomPhone && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isValidGhanaPhone(formatGhanaPhone(smsCustomPhone)) ? '#10B981' : '#F59E0B'
                            }}>
                              {isValidGhanaPhone(formatGhanaPhone(smsCustomPhone)) ? '✓ Valid Ghana Phone' : 'Enter 10-digit number'}
                            </span>
                          )}
                        </div>

                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🇬🇭</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="e.g. 0241234567 or 0204940602"
                            value={smsCustomPhone}
                            onChange={(e) => setSmsCustomPhone(e.target.value.replace(/[^0-9+]/g, '').slice(0, 13))}
                            className="form-control"
                            style={{ paddingLeft: '44px', fontSize: '0.94rem', fontWeight: 700, letterSpacing: '0.04em' }}
                          />
                        </div>
                      </div>

                      {/* Quick Fill Dropdown */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                          Or Pick from Contact Directory ({users.filter(u => u.phone).length}):
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) setSmsCustomPhone(e.target.value);
                          }}
                          className="form-control"
                          style={{ fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}
                          value=""
                        >
                          <option value="" disabled>-- Select a registered contact --</option>
                          {users.filter(u => u.phone).map(u => (
                            <option key={u.id} value={u.phone}>
                              {u.name} ({u.phone}) • {u.role.toUpperCase()}{u.verificationStatus === 'verified' ? ' [VERIFIED]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Telecel / Admin Quick Test Pill */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setSmsCustomPhone('0204940602')}
                          style={{
                            background: 'var(--bg-surface-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            borderRadius: '16px',
                            padding: '4px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ⚡ Quick Fill Admin Telecel (0204940602)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Broadcast Group Selection */}
                  {smsTargetType === 'role' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', display: 'block' }}>
                        Choose Target Audience Group:
                      </label>

                      {/* Option A: All Users */}
                      <div
                        onClick={() => setSmsTargetRole('all')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${smsTargetRole === 'all' ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: smsTargetRole === 'all' ? 'var(--primary-light)' : 'var(--bg-surface-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>🌐</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: smsTargetRole === 'all' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              All Registered Users
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              Every registered customer &amp; manager
                            </div>
                          </div>
                        </div>
                        <span style={{
                          background: smsTargetRole === 'all' ? 'var(--primary)' : 'var(--border)',
                          color: smsTargetRole === 'all' ? '#fff' : 'var(--text-secondary)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}>
                          {users.filter(u => u.phone).length}
                        </span>
                      </div>

                      {/* Option B: Verified Agents */}
                      <div
                        onClick={() => setSmsTargetRole('verified_agents')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${smsTargetRole === 'verified_agents' ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: smsTargetRole === 'verified_agents' ? 'var(--primary-light)' : 'var(--bg-surface-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: smsTargetRole === 'verified_agents' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              Verified Agents Only
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ID &amp; License verified managers
                            </div>
                          </div>
                        </div>
                        <span style={{
                          background: smsTargetRole === 'verified_agents' ? 'var(--primary)' : 'var(--border)',
                          color: smsTargetRole === 'verified_agents' ? '#fff' : 'var(--text-secondary)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}>
                          {users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.verificationStatus === 'verified' && u.phone).length}
                        </span>
                      </div>

                      {/* Option C: All Agents & Landlords */}
                      <div
                        onClick={() => setSmsTargetRole('agents')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${smsTargetRole === 'agents' ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: smsTargetRole === 'agents' ? 'var(--primary-light)' : 'var(--bg-surface-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>👔</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: smsTargetRole === 'agents' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              All Agents &amp; Landlords
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              All property owners and agents
                            </div>
                          </div>
                        </div>
                        <span style={{
                          background: smsTargetRole === 'agents' ? 'var(--primary)' : 'var(--border)',
                          color: smsTargetRole === 'agents' ? '#fff' : 'var(--text-secondary)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}>
                          {users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.phone).length}
                        </span>
                      </div>

                      {/* Option D: Regular Tenants */}
                      <div
                        onClick={() => setSmsTargetRole('users')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${smsTargetRole === 'users' ? 'var(--primary)' : 'var(--border)'}`,
                          backgroundColor: smsTargetRole === 'users' ? 'var(--primary-light)' : 'var(--bg-surface-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '1.2rem' }}>👤</span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: smsTargetRole === 'users' ? 'var(--primary)' : 'var(--text-primary)' }}>
                              Tenants &amp; Room Seekers
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              End users and active renters
                            </div>
                          </div>
                        </div>
                        <span style={{
                          background: smsTargetRole === 'users' ? 'var(--primary)' : 'var(--border)',
                          color: smsTargetRole === 'users' ? '#fff' : 'var(--text-secondary)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}>
                          {users.filter(u => u.role === 'user' && u.phone).length}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Variable Shortcuts Insert Bar */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Quick Text Snippets (Click to insert):
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['horentals.com', '0204940602', 'HO Rentals:', 'Ho, Volta Region'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSmsMessage(prev => prev ? `${prev} ${tag}` : tag)}
                          style={{
                            background: 'var(--bg-surface-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Column 2: Message Composer */}
                <div className="card glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MessageSquare size={19} color="var(--primary)" /> 2. Compose Message
                    </h2>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '10px' }}>
                      Step 2
                    </span>
                  </div>

                  {/* Sender ID Non-Editable Verified Display */}
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-secondary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Outgoing Sender ID
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em', marginTop: '2px' }}>
                        HORENTALS
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#065F46',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ✓ Verified &amp; Active
                    </span>
                  </div>

                  {/* Quick Preset Templates */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                      Message Template:
                    </label>
                    <select
                      value={smsTemplate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSmsTemplate(val);
                        if (val === 'announcement') {
                          setSmsMessage('HO Rentals: Browse verified single rooms, self-contains, & apartments across Ho at horentals.com. Contact landlords directly!');
                        } else if (val === 'agent_reminder') {
                          setSmsMessage('HO Rentals Agent Notice: Please update your listings and contact info on horentals.com so tenants can reach you directly.');
                        } else if (val === 'listing_promo') {
                          setSmsMessage('HO Rentals: List your rental property for FREE today! Visit horentals.com/upload or WhatsApp 0204940602 for assistance.');
                        } else if (val === 'security_notice') {
                          setSmsMessage('HO Rentals: Never make advance payments before inspecting rooms in person. Report suspicious activity to 0204940602.');
                        } else if (val === 'custom') {
                          setSmsMessage('');
                        }
                      }}
                      className="form-control"
                      style={{ fontSize: '0.86rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <option value="custom">✏️ Custom Message</option>
                      <option value="announcement">📢 General Platform Announcement (Rooms in Ho)</option>
                      <option value="agent_reminder">👔 Agent Profile &amp; Listing Update Reminder</option>
                      <option value="listing_promo">⚡ Free Property Listing Promotion</option>
                      <option value="security_notice">🛡️ Security &amp; Tenant Safety Warning</option>
                    </select>
                  </div>

                  {/* Textarea Composer */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        SMS Content *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: smsMessage.length > 160 ? '#D97706' : 'var(--primary)',
                          background: smsMessage.length > 160 ? 'rgba(217, 119, 6, 0.1)' : 'var(--primary-light)',
                          padding: '2px 8px',
                          borderRadius: '8px'
                        }}>
                          {smsMessage.length} / 160 chars ({Math.max(1, Math.ceil(smsMessage.length / 160))} SMS unit{Math.ceil(smsMessage.length / 160) > 1 ? 's' : ''})
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Type your message here... (e.g. HO Rentals: Hello, we have an important announcement...)"
                      className="form-control"
                      style={{ fontSize: '0.92rem', lineHeight: 1.5, resize: 'vertical', minHeight: '120px' }}
                    />
                  </div>

                  {/* Character progress bar */}
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (smsMessage.length / 160) * 100)}%`,
                      height: '100%',
                      backgroundColor: smsMessage.length > 160 ? '#D97706' : 'var(--primary)',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>

                  {/* Length Alert Notice */}
                  {smsMessage.length > 160 && (
                    <div style={{ fontSize: '0.76rem', color: '#92400E', backgroundColor: '#FEF3C7', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #FCD34D' }}>
                      ⚠️ Message exceeds 160 chars and will be billed as <strong>{Math.ceil(smsMessage.length / 160)} SMS units</strong> per recipient.
                    </div>
                  )}

                  {/* Summary Details & Dispatch Button */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.86rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Target Audience:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {smsTargetType === 'single'
                          ? (smsCustomPhone.trim() || '1 direct recipient')
                          : `${smsTargetRole === 'all'
                            ? users.filter(u => u.phone).length
                            : smsTargetRole === 'verified_agents'
                              ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.verificationStatus === 'verified' && u.phone).length
                              : smsTargetRole === 'agents'
                                ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.phone).length
                                : users.filter(u => u.role === 'user' && u.phone).length} recipients`}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendAdminSms}
                      disabled={smsSending || !smsMessage.trim() || (smsTargetType === 'single' && !smsCustomPhone.trim())}
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        fontSize: '0.98rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #C1121F 0%, #780B13 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        boxShadow: '0 6px 20px -2px rgba(193, 18, 31, 0.4)',
                        cursor: (smsSending || !smsMessage.trim() || (smsTargetType === 'single' && !smsCustomPhone.trim())) ? 'not-allowed' : 'pointer',
                        opacity: (smsSending || !smsMessage.trim() || (smsTargetType === 'single' && !smsCustomPhone.trim())) ? 0.6 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {smsSending ? (
                        <>
                          <Loader size={20} className="animate-spin" />
                          <span>Dispatching via SailUp...</span>
                        </>
                      ) : (
                        <>
                          <Send size={19} />
                          <span>
                            {smsTargetType === 'single' ? '🚀 Send Direct SMS' : `🚀 Broadcast Bulk SMS (${smsTargetRole === 'all'
                              ? users.filter(u => u.phone).length
                              : smsTargetRole === 'verified_agents'
                                ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.verificationStatus === 'verified' && u.phone).length
                                : smsTargetRole === 'agents'
                                  ? users.filter(u => (u.role === 'agent' || u.role === 'landlord') && u.phone).length
                                  : users.filter(u => u.role === 'user' && u.phone).length
                              } Recipients)`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {activeTab === 'yuyu_rides' && (
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h1 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem' }}>
                    <Car size={26} style={{ color: '#F59E0B' }} />
                    <span>Yuyu Rides Referral Logs</span>
                  </h1>
                  <p className={styles.sectionSubtitle} style={{ marginTop: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Track every tenant who clicked to book an inspection ride with Yuyu Rides.
                  </p>
                </div>
                <button
                  onClick={loadRideReferrals}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.88rem', borderRadius: '8px' }}
                >
                  <RefreshCw size={15} /> Refresh Logs
                </button>
              </div>

              {/* Stats Bar (Spacious Cards) */}
              <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '28px', gap: '16px' }}>
                <div className={styles.statCard} style={{ padding: '20px 24px', borderRadius: '12px', minHeight: 'auto' }}>
                  <div className={styles.statHeader}>
                    <span className={styles.statTitle} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Requests</span>
                    <Car size={20} style={{ color: '#F59E0B' }} />
                  </div>
                  <div className={styles.statValue} style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800 }}>{totalRideReferralsCount || rideReferrals.length}</div>
                </div>

                <div className={styles.statCard} style={{ padding: '20px 24px', borderRadius: '12px', minHeight: 'auto' }}>
                  <div className={styles.statHeader}>
                    <span className={styles.statTitle} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Today</span>
                    <Clock size={20} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className={styles.statValue} style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800 }}>
                    {rideReferrals.filter(r => {
                      const today = new Date().toISOString().split('T')[0];
                      return r.createdAt?.split('T')[0] === today;
                    }).length}
                  </div>
                </div>

                <div className={styles.statCard} style={{ padding: '20px 24px', borderRadius: '12px', minHeight: 'auto' }}>
                  <div className={styles.statHeader}>
                    <span className={styles.statTitle} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Properties</span>
                    <Building size={20} style={{ color: '#10B981' }} />
                  </div>
                  <div className={styles.statValue} style={{ fontSize: '1.8rem', marginTop: '6px', fontWeight: 800 }}>
                    {new Set(rideReferrals.map(r => r.propertyId)).size}
                  </div>
                </div>

                <div className={styles.statCard} style={{ padding: '20px 24px', borderRadius: '12px', minHeight: 'auto', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div className={styles.statHeader}>
                    <span className={styles.statTitle} style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 800 }}>Est. Revenue</span>
                    <TrendingUp size={20} style={{ color: '#059669' }} />
                  </div>
                  <div className={styles.statValue} style={{ fontSize: '1.7rem', marginTop: '6px', color: '#047857', fontWeight: 900 }}>
                    GH₵ {(rideReferrals.reduce((sum, r) => sum + (r.commissionAmt || 5.0), 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Referrals Table with Spacing */}
              <div className={styles.tableCard} style={{ borderRadius: '12px', padding: '16px' }}>
                {rideReferrals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                    <Car size={42} style={{ color: '#F59E0B', opacity: 0.5, marginBottom: '14px' }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>No Yuyu Ride referrals recorded yet.</p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>When tenants click &quot;Request Ride with Yuyu Rides&quot;, logs will appear here.</p>
                  </div>
                ) : (
                  <div className={styles.tableResponsive}>
                    <table className={styles.dataTable} style={{ fontSize: '0.88rem' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '14px 16px' }}>Date</th>
                          <th style={{ padding: '14px 16px' }}>Ref Code</th>
                          <th style={{ padding: '14px 16px' }}>Property</th>
                          <th style={{ padding: '14px 16px' }}>Tenant</th>
                          <th style={{ padding: '14px 16px' }}>Revenue</th>
                          <th style={{ padding: '14px 16px' }}>Status</th>
                          <th style={{ padding: '14px 16px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rideReferrals.map((item: RideReferralItem) => (
                          <tr key={item.id}>
                            <td style={{ padding: '14px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#D97706', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                                {item.refCode}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600 }}>{item.property?.title || `#${item.propertyId}`}</span>
                              {item.property?.location && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>({item.property.location})</span>}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                              {item.tenantName || item.user?.name ? (
                                <span><strong>{item.tenantName || item.user?.name}</strong> {item.tenantPhone || item.user?.phone ? <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({item.tenantPhone || item.user?.phone})</span> : ''}</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Guest</span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 800, color: '#059669', fontSize: '0.85rem' }}>
                              GH₵ {(item.commissionAmt || 5.0).toFixed(2)}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
                                {item.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Link
                                  href={`/properties/${item.propertyId}`}
                                  target="_blank"
                                  className="btn btn-outline"
                                  style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: '6px', textDecoration: 'none' }}
                                >
                                  View
                                </Link>
                                <button
                                  onClick={() => handleDeleteRideReferral(item.id)}
                                  disabled={deletingReferralId === item.id}
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: '0.78rem',
                                    borderRadius: '6px',
                                    color: '#DC2626',
                                    border: '1px solid #FCA5A5',
                                    backgroundColor: '#FEF2F2',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontWeight: 600,
                                    transition: 'all 0.15s ease'
                                  }}
                                  title="Delete Referral Record"
                                >
                                  {deletingReferralId === item.id ? (
                                    <Loader size={13} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedLandlord && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '640px' }}>
            <div className={styles.modalHeader}>
              <h2>Landlord Details: {selectedLandlord.name}</h2>
              <button onClick={() => setSelectedLandlord(null)} className={styles.modalCloseBtn}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>

              {/* Personal Details */}
              <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                  Personal Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div><strong>Full Name:</strong> {selectedLandlord.name}</div>
                  <div><strong>DOB:</strong> {selectedLandlord.dob || '—'}</div>
                  <div><strong>Gender:</strong> {selectedLandlord.gender || '—'}</div>
                  <div><strong>National ID:</strong> {selectedLandlord.nationalId || '—'}</div>
                  <div><strong>Occupation:</strong> {selectedLandlord.occupation || '—'}</div>
                  <div><strong>Email:</strong> {selectedLandlord.email || '—'}</div>
                  <div><strong>Phone 1:</strong> {selectedLandlord.phone1}</div>
                  <div><strong>Phone 2:</strong> {selectedLandlord.phone2 || '—'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Home Address:</strong> {selectedLandlord.homeAddress || '—'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>City/Region:</strong> {selectedLandlord.city} {selectedLandlord.region ? `, ${selectedLandlord.region} Region` : ''}</div>
                </div>
              </div>

              {/* Property Details */}
              <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', margin: 0 }}>
                  Property Specifications & Terms
                </h3>

                {/* Structured Visual Spec Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  {/* Rent Card */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Rent</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)', marginTop: '2px' }}>GHS {selectedLandlord.rent?.toLocaleString()}</div>
                  </div>

                  {/* Advance Card */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>⏳ Advance Payment</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedLandlord.advance || '1 Year'}</div>
                  </div>

                  {/* Rooms Card */}
                  <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>🛏️ Rooms Available</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedLandlord.rooms || '1'}</div>
                  </div>

                  {/* Available Date Card */}
                  <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>📅 Available From</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedLandlord.availableFrom || 'Immediately'}</div>
                  </div>
                </div>

                {/* Additional Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div><strong>Property Type:</strong> {selectedLandlord.propType || '—'}</div>
                  <div><strong>Selected Package:</strong> <span style={{ fontWeight: 800, color: selectedLandlord.plan === 'Premium' ? '#D97706' : 'var(--primary)' }}>{selectedLandlord.plan === 'Premium' ? '⭐ Premium Plan (GHS 100)' : 'Basic Plan (GHS 50)'}</span></div>
                  <div><strong>Social Media Boost:</strong> {selectedLandlord.socialMediaBoost ? 'Yes (GHS 30 agreed)' : 'No'}</div>
                  <div><strong>Address:</strong> {selectedLandlord.propAddress}</div>
                  <div><strong>Landmark:</strong> {selectedLandlord.propLandmark || '—'}</div>
                  <div><strong>City/Region:</strong> {selectedLandlord.propCity || '—'} {selectedLandlord.propRegion ? `, ${selectedLandlord.propRegion} Region` : ''}</div>
                  <div><strong>GPS Address:</strong> {selectedLandlord.propGps || '—'}</div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <strong>Utilities & Amenities:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedLandlord.amenities && selectedLandlord.amenities.length > 0 ? (
                        selectedLandlord.amenities.map((item, idx) => (
                          <span key={idx} style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700 }}>
                            {item}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>None specified</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos Gallery */}
              {selectedLandlord.photos && selectedLandlord.photos.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                    Property Photos ({selectedLandlord.photos.length})
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                    {selectedLandlord.photos.map((src, idx) => (
                      <a key={idx} href={src} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', aspectRatio: '4/3', display: 'block' }}>
                        <img src={src} alt={`Property view ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <a
                href={`/upload?landlordName=${encodeURIComponent(selectedLandlord.name)}&contact=${encodeURIComponent(selectedLandlord.phone1)}&city=${encodeURIComponent(selectedLandlord.city || '')}&gps=${encodeURIComponent(selectedLandlord.propGps || '')}&landmark=${encodeURIComponent(selectedLandlord.propLandmark || '')}`}
                className="btn btn-primary"
                style={{ backgroundColor: '#3B82F6', borderColor: '#3B82F6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Add Another Listing
              </a>
              {selectedLandlord.status !== 'Verified' ? (
                <button
                  type="button"
                  onClick={() => { handlePublishLandlord(selectedLandlord.id); setSelectedLandlord(null); }}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10B981', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  disabled={actionLoading}
                >
                  <UploadCloud size={15} /> Approve & Publish Listing
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { handlePublishLandlord(selectedLandlord.id); }}
                  className="btn btn-outline"
                  style={{ color: '#10B981', borderColor: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  disabled={actionLoading}
                >
                  <RefreshCw size={14} /> Republish Listing
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLandlord(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAgent && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'var(--primary-light)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedAgent.profileImage ? (
                    <img src={selectedAgent.profileImage} alt={selectedAgent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Users size={24} color="var(--primary)" />
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Agent Registration Profile: {selectedAgent.name}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Verification Status: <strong style={{ color: selectedAgent.verificationStatus === 'verified' ? '#10B981' : '#F59E0B' }}>{selectedAgent.verificationStatus || 'unverified'}</strong>
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedAgent(null)} className={styles.modalCloseBtn}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px', marginTop: '12px' }}>
              {/* Profile Photo Display */}
              {selectedAgent.profileImage && (
                <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <img src={selectedAgent.profileImage} alt={selectedAgent.name} style={{ maxWidth: '180px', maxHeight: '180px', borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '2px solid var(--primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', margin: '0 auto' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>Uploaded Agent Professional Picture</div>
                </div>
              )}

              {/* Personal & Contact Details */}
              <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                  Agent Contact Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                  <div><strong>Full Name:</strong> {selectedAgent.name}</div>
                  <div><strong>Account Role:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedAgent.role}</span></div>
                  <div><strong>Primary Phone:</strong> {selectedAgent.phone || '—'}</div>
                  <div>
                    <strong>WhatsApp Line:</strong> {selectedAgent.agentWhatsapp || selectedAgent.phone || '—'}{' '}
                    {(selectedAgent.agentWhatsapp || selectedAgent.phone) && (
                      <a
                        href={`https://wa.me/${(selectedAgent.agentWhatsapp || selectedAgent.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '233')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#25D366', fontWeight: 700, marginLeft: '4px', fontSize: '0.8rem' }}
                      >
                        💬 Chat
                      </a>
                    )}
                  </div>
                  <div><strong>Agency / Brand Name:</strong> {selectedAgent.agencyName || 'Independent Agent'}</div>
                  <div><strong>Years Experience:</strong> {selectedAgent.experienceYears || '—'}</div>
                  <div><strong>Ghana Card / License No:</strong> {selectedAgent.licenseNumber || '—'}</div>
                  <div><strong>Subscription Plan:</strong> {selectedAgent.subscriptionPlan || 'Free Plan'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Email Address:</strong> {selectedAgent.email || '—'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>Location / Operating Area:</strong> {selectedAgent.agentLocation || 'Ho, Ghana'}</div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <strong>Listings &amp; Monthly Billing:</strong>{' '}
                    {(() => {
                      const count = properties.filter(p => String(p.owner?.id) === String(selectedAgent.id)).length;
                      const billable = Math.max(0, count - 2);
                      return (
                        <span>
                          <strong>{count}</strong> total properties •{' '}
                          <span style={{ color: billable > 0 ? '#B45309' : '#047857', fontWeight: 700 }}>
                            {billable === 0 ? `Free Starter Tier (${count}/2 used)` : `${billable} Billable Listings (GH₵ ${billable * 10}.00/month due)`}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Bio & Credentials Details */}
              <div style={{ backgroundColor: 'var(--bg-surface-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                  Submitted Bio &amp; About Agent
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 }}>
                  {selectedAgent.bio || 'No bio details provided.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <select
                value={selectedAgent.verificationStatus === 'verified' ? 'verified' : 'unverified'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleVerifyAgent(selectedAgent.id, val);
                  setSelectedAgent((prev) => prev ? { ...prev, verificationStatus: val } : null);
                }}
                disabled={actionLoading}
                style={{
                  fontSize: '0.82rem',
                  padding: '8px 14px',
                  fontWeight: 700,
                  backgroundColor: selectedAgent.verificationStatus === 'verified' ? '#ECFDF5' : '#FEF3C7',
                  color: selectedAgent.verificationStatus === 'verified' ? '#047857' : '#B45309',
                  border: `1px solid ${selectedAgent.verificationStatus === 'verified' ? '#10B981' : '#F59E0B'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <option value="verified" style={{ backgroundColor: '#fff', color: '#047857', fontWeight: 700 }}>✓ Verify Agent</option>
                <option value="unverified" style={{ backgroundColor: '#fff', color: '#B45309', fontWeight: 600 }}>Unverify Agent</option>
              </select>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProperty && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <h2>Edit Property Details</h2>
              <button onClick={() => setEditingProperty(null)} className={styles.modalCloseBtn}>&times;</button>
            </div>
            <div style={{ padding: '16px 0' }}>
              <UploadPage
                isEmbedded={true}
                initialData={editingProperty}
                onSuccess={() => {
                  setEditingProperty(null);
                  setMessage({ text: 'Property updated successfully!', isError: false });
                  loadAdminDashboardData(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isQrModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} style={{ color: 'var(--primary)' }} />
                <span>View QR Code</span>
              </h2>
              <button onClick={() => setIsQrModalOpen(false)} className={styles.modalCloseBtn}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0' }}>
                Scan or download this code to share the <strong>{qrModalTitle}</strong>.
              </p>

              <div style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrModalUrl)}&color=c1121f&ecc=H`}
                  alt="QR Code"
                  style={{ display: 'block', borderRadius: 'var(--radius-sm)' }}
                  width={220}
                  height={220}
                />

                {/* Branded Logo Overlay */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#FFFFFF',
                  border: '3px solid #FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Ho Rentals Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>

              <div style={{
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface-secondary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                wordBreak: 'break-all',
                maxWidth: '100%',
                userSelect: 'all'
              }}>
                {qrModalUrl}
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                  onClick={async () => {
                    try {
                      setDownloadingQr(true);
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrModalUrl)}&color=c1121f&ecc=H`;

                      const qrImage = new Image();
                      qrImage.crossOrigin = 'anonymous';
                      qrImage.src = qrUrl;

                      await new Promise((resolve, reject) => {
                        qrImage.onload = resolve;
                        qrImage.onerror = reject;
                      });

                      const logoImage = new Image();
                      logoImage.src = '/logo.png';
                      await new Promise((resolve, reject) => {
                        logoImage.onload = resolve;
                        logoImage.onerror = reject;
                      });

                      const canvas = document.createElement('canvas');
                      canvas.width = 300;
                      canvas.height = 300;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) throw new Error('Could not get canvas context');

                      ctx.drawImage(qrImage, 0, 0, 300, 300);

                      const logoSize = 60;
                      const logoX = (300 - logoSize) / 2;
                      const logoY = (300 - logoSize) / 2;

                      ctx.fillStyle = '#ffffff';
                      ctx.beginPath();
                      if (typeof ctx.roundRect === 'function') {
                        ctx.roundRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 8);
                      } else {
                        ctx.rect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
                      }
                      ctx.fill();

                      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

                      const dataUrl = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = dataUrl;
                      a.download = `ho-rentals-${qrModalTitle.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error('Failed to download branded QR code:', error);
                      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrModalUrl)}&color=c1121f&ecc=H`, '_blank');
                    } finally {
                      setDownloadingQr(false);
                    }
                  }}
                  disabled={downloadingQr}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', padding: '10px 16px' }}
                >
                  <Download size={16} />
                  <span>{downloadingQr ? 'Downloading...' : 'Download'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrModalUrl);
                    alert('Copied link: ' + qrModalUrl);
                  }}
                  className="btn btn-outline"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', padding: '10px 16px', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                >
                  <Copy size={16} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <Loader size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading admin workspace...</p>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
