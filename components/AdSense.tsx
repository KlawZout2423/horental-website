'use client';

import React, { useEffect } from 'react';

interface AdSenseProps {
  adSlot: string;
  adFormat?: string;
  responsive?: string;
  style?: React.CSSProperties;
  adLayoutKey?: string;
}

export default function AdSense({
  adSlot,
  adFormat = 'auto',
  responsive = 'true',
  style = { display: 'block' },
  adLayoutKey,
}: AdSenseProps) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8918210886432706";

  useEffect(() => {
    try {
      // Safely initialize AdSense pushes on client-side mount
      if (typeof window !== 'undefined') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense initialization error:', err);
    }
  }, []);

  // In development or if the publisher ID is placeholder, render a mock advertisement box
  if (!adsenseClientId || adsenseClientId === 'ca-pub-placeholder') {
    return (
      <div 
        style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px dashed var(--border)', 
          padding: '20px', 
          textAlign: 'center', 
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          margin: '20px 0',
          borderRadius: '8px',
          fontWeight: 500
        }}
      >
        📢 Google AdSense Slot (Slot ID: {adSlot})
      </div>
    );
  }

  return (
    <div style={{ margin: '20px 0', overflow: 'hidden', width: '100%' }}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={adsenseClientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive}
        data-ad-layout-key={adLayoutKey}
      />
    </div>
  );
}
