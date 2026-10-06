'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { useSystemStatus } from '../lib/useSystemStatus';
import styles from './AdminMaintenanceBanner.module.css';

export default function AdminMaintenanceBanner() {
  const { isUnderMaintenance, isAdmin } = useSystemStatus();

  if (!isAdmin || !isUnderMaintenance) {
    return null;
  }

  return (
    <div id="admin-maintenance-pill" className={styles.bannerContainer}>
      <div className={styles.statusIndicator}>
        <span className={styles.amberDot} />
        <span className={styles.statusTextDesktop}>
          <strong className={styles.highlightLabel}>Admin Preview:</strong> Visitors see Update Page. You see live site.
        </span>
        <span className={styles.statusTextMobile}>
          <strong className={styles.highlightLabel}>Admin Mode:</strong> Live View (Visitors see Update Page)
        </span>
      </div>

      <div className={styles.actionWrapper}>
        <Link href="/admin" className={styles.adminBtn}>
          <LayoutDashboard size={13} />
          <span>Admin</span>
        </Link>
      </div>
    </div>
  );
}
