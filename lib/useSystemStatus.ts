'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { SITE_CONFIG } from './siteConfig';

export function useSystemStatus() {
  const { user } = useAuth();
  const [isUnderMaintenance, setIsUnderMaintenance] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('horentals_maintenance_mode');
        if (cached !== null) return cached === 'true';
      } catch {}
    }
    return SITE_CONFIG.isUnderMaintenance;
  });
  const [isBypassed, setIsBypassed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('preview') === 'admin' || sessionStorage.getItem('admin_preview_bypass') === 'true') {
          return true;
        }
      } catch {}
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('preview') === 'admin' || sessionStorage.getItem('admin_preview_bypass') === 'true') {
        sessionStorage.setItem('admin_preview_bypass', 'true');
        setIsBypassed(true);
      }
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/system-status?_t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data && typeof data.isUnderMaintenance === 'boolean') {
          setIsUnderMaintenance(data.isUnderMaintenance);
          try {
            localStorage.setItem('horentals_maintenance_mode', String(data.isUnderMaintenance));
          } catch {}
        }
      } catch (err) {
        console.error('Error checking system status:', err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  const bypass = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_preview_bypass', 'true');
    }
    setIsBypassed(true);
  };

  // Immediate check if logged in user is admin (via Auth state or user_data cookie)
  const isAdmin = Boolean(
    user?.role === 'admin' || 
    (typeof document !== 'undefined' && document.cookie.includes('"role":"admin"'))
  );

  // Regular visitors and non-admin users will see the update info page when maintenance is on
  const shouldShowMaintenance = isUnderMaintenance && !isBypassed && !isAdmin;

  return {
    isUnderMaintenance,
    shouldShowMaintenance,
    isAdmin,
    bypass,
    loadingStatus: loading,
    mounted,
  };
}
