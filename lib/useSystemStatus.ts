'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { SITE_CONFIG } from './siteConfig';

export function useSystemStatus() {
  const { user } = useAuth();
  const [isUnderMaintenance, setIsUnderMaintenance] = useState(SITE_CONFIG.isUnderMaintenance);
  const [isBypassed, setIsBypassed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  const isAdmin = user?.role === 'admin' || (typeof document !== 'undefined' && document.cookie.includes('"role":"admin"'));

  // Regular visitors and non-admin users will see the update info page when maintenance is on
  const shouldShowMaintenance = isUnderMaintenance && !isBypassed && !isAdmin;

  return {
    isUnderMaintenance,
    shouldShowMaintenance,
    isAdmin,
    bypass,
    loadingStatus: loading,
  };
}
