"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, X, DownloadCloud } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('ServiceWorker registered with scope:', registration.scope);
        })
        .catch((err) => {
          console.error('ServiceWorker registration failed:', err);
        });
    }

    // 1. Check if the app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissedLocal = localStorage.getItem('pwa_prompt_dismissed') === 'true';
    
    if (isStandalone || dismissedLocal) {
      return;
    }

    // 2. Listen for the browser's install prompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the browser's default prompt from appearing automatically
      e.preventDefault();
      // Save the event so it can be triggered later
      deferredPromptRef.current = e;
    };

    // 3. Listen for the custom trigger event (e.g. login/signup success)
    const handleTriggerPrompt = () => {
      const currentStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const currentDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true';

      if (!currentStandalone && !currentDismissed && deferredPromptRef.current) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('trigger-pwa-prompt', handleTriggerPrompt);

    // 4. Listen for appinstalled event to clean up
    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setShowPrompt(false);
      console.log('HO Rentals PWA was installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('trigger-pwa-prompt', handleTriggerPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;

    // Show the browser's native install prompt dialog
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // We no longer need the prompt
    deferredPromptRef.current = null;
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    // Remember dismissal persistently so we don't annoy the user
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isDismissed) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      right: '24px',
      maxWidth: '460px',
      backgroundColor: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(var(--glass-blur))',
      padding: '20px',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      animation: 'pwaSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      margin: '0 auto'
    }}>
      {/* Keyframe animation injected inline */}
      <style>{`
        @keyframes pwaSlideIn {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header and Close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="HO Rentals Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Install HO Rentals App
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Add to Home Screen
            </span>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X size={16} />
        </button>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
        Add our app as an icon on your phone or desktop. Experience faster loading, quick navigation, and search verified rooms instantly.
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={handleInstallClick}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary)',
            color: '#FFFFFF',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(193, 18, 31, 0.15)',
            transition: 'transform 0.2s ease, background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <DownloadCloud size={16} />
          <span>Add Icon Now</span>
        </button>
        <button 
          onClick={handleDismiss}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
