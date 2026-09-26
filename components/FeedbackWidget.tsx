'use client';
import React, { useState } from 'react';
import { MessageSquare, X, Star, Send } from 'lucide-react';
import { graphqlRequest } from '../lib/graphql';

const SUBMIT_FEEDBACK = `
  mutation SubmitFeedback($rating: Int!, $message: String, $path: String) {
    submitFeedback(rating: $rating, message: $message, path: $path)
  }
`;

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setIsOpen(false);
        setTimeout(() => {
          setStatus('idle');
          setRating(0);
          setMessage('');
        }, 300);
      }, 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
        aria-label="Give Feedback"
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '96px',
          right: '24px',
          width: '320px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border)',
          fontFamily: 'var(--font-inter)',
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--background)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Share Feedback</h3>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--success)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Thank you!</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Your feedback helps us improve HO Rentals.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    How would you rate your experience?
                  </label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: star <= (hoverRating || rating) ? '#F59E0B' : '#E5E7EB',
                          transition: 'color 0.2s'
                        }}
                      >
                        <Star size={32} fill={star <= (hoverRating || rating) ? '#F59E0B' : 'transparent'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Tell us more (Optional)
                  </label>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What did you like? What can we improve?"
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      resize: 'vertical',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      outline: 'none',
                      backgroundColor: 'var(--background)'
                    }}
                  />
                </div>

                {status === 'error' && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>Failed to submit. Please try again.</div>
                )}

                <button 
                  type="submit"
                  disabled={rating === 0 || status === 'submitting'}
                  style={{
                    backgroundColor: rating === 0 ? 'var(--text-muted)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: rating === 0 || status === 'submitting' ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {status === 'submitting' ? 'Sending...' : (
                    <>
                      <Send size={18} />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
