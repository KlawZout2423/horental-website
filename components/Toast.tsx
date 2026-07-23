'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'error' ? 'var(--danger-light)' : type === 'info' ? 'var(--primary-light)' : '#ECFDF5';
  const borderColor = type === 'error' ? 'var(--danger)' : type === 'info' ? 'var(--primary)' : '#A7F3D0';
  const textColor = type === 'error' ? 'var(--danger)' : type === 'info' ? 'var(--primary)' : '#047857';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 2000,
      backgroundColor: bgColor,
      border: `1px solid ${borderColor}`,
      color: textColor,
      padding: '12px 20px',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.9rem',
      fontWeight: 700,
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      maxWidth: '380px'
    }}>
      {type === 'error' ? (
        <AlertCircle size={18} />
      ) : type === 'info' ? (
        <Info size={18} />
      ) : (
        <CheckCircle2 size={18} />
      )}
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center' }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}
