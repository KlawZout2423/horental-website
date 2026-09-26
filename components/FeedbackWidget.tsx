'use client';
import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Send, MessageSquare } from 'lucide-react';
import { graphqlRequest } from '../lib/graphql';

const SUBMIT_FEEDBACK = `
  mutation SubmitFeedback($rating: Int!, $message: String, $path: String) {
    submitFeedback(rating: $rating, message: $message, path: $path)
  }
`;

export default function FeedbackWidget() {
  const [mode, setMode] = useState<'bar' | 'expanded' | 'hidden'>('bar');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rating === 0) return;
    setStatus('submitting');
    try {
      await graphqlRequest(SUBMIT_FEEDBACK, {
        rating,
        message,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      });
      setStatus('success');
      setTimeout(() => {
        setMode('hidden');
        setTimeout(() => { setStatus('idle'); setRating(0); setMessage(''); }, 400);
      }, 2500);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleQuickRate = async (star: number) => {
    setRating(star);
    if (star <= 3) {
      setMode('expanded');
    } else {
      setStatus('submitting');
      try {
        await graphqlRequest(SUBMIT_FEEDBACK, {
          rating: star,
          message: '',
          path: typeof window !== 'undefined' ? window.location.pathname : '',
        });
        setStatus('success');
        setTimeout(() => setMode('hidden'), 2500);
      } catch {
        setMode('expanded');
      }
    }
  };

  if (mode === 'hidden') return null;

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '90px',
    right: '24px',
    zIndex: 9998,
    fontFamily: 'var(--font-inter, sans-serif)',
  };

  if (status === 'success') {
    return (
      <div style={{ ...baseStyle, backgroundColor: 'white', border: '1px solid var(--border, #e5e7eb)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', textAlign: 'center', minWidth: '240px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🎉</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>Thank you!</div>
        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>Your feedback helps us improve.</div>
      </div>
    );
  }

  if (mode === 'bar') {
    return (
      <div style={{ ...baseStyle, backgroundColor: 'white', border: '1px solid var(--border, #e5e7eb)', borderRadius: '50px', padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Rate us</span>
        <div style={{ display: 'flex', gap: '1px' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleQuickRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: star <= (hoverRating || rating) ? '#F59E0B' : '#D1D5DB', transition: 'color 0.15s, transform 0.15s', transform: star <= hoverRating ? 'scale(1.2)' : 'scale(1)', display: 'flex' }}
            >
              <Star size={20} fill={star <= (hoverRating || rating) ? '#F59E0B' : 'transparent'} strokeWidth={1.5} />
            </button>
          ))}
        </div>
        <button onClick={() => setMode('expanded')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', display: 'flex' }} title="Leave a comment">
          <MessageSquare size={15} />
        </button>
        <button onClick={() => setMode('hidden')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', display: 'flex' }} aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, width: '310px', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border, #e5e7eb)' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border, #e5e7eb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #C1121F 0%, #DC2626 100%)' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>Share Your Feedback</h3>
        <button onClick={() => setMode('bar')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: 'white', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: '16px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>How was your experience?</label>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: star <= (hoverRating || rating) ? '#F59E0B' : '#E5E7EB', transition: 'color 0.15s, transform 0.15s', transform: star <= hoverRating ? 'scale(1.2)' : 'scale(1)', display: 'flex' }}>
                  <Star size={30} fill={star <= (hoverRating || rating) ? '#F59E0B' : 'transparent'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>Tell us more <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What did you like? What can we improve?" rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border, #e5e7eb)', resize: 'none', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', backgroundColor: '#f9fafb' }} />
          </div>
          {status === 'error' && <div style={{ color: '#DC2626', fontSize: '0.82rem' }}>Failed to submit. Please try again.</div>}
          <button type="submit" disabled={rating === 0 || status === 'submitting'}
            style={{ backgroundColor: rating === 0 ? '#d1d5db' : '#C1121F', color: 'white', border: 'none', padding: '11px', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: rating === 0 || status === 'submitting' ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s' }}>
            <Send size={16} />
            {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
