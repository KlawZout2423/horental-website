'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert, Loader, CheckCircle2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { graphqlRequest, CHANGE_PASSWORD_MUTATION } from '../lib/graphql';

export default function MustChangePasswordModal() {
  const { user, updateUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!user || !Boolean(user.mustChangePassword)) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      await graphqlRequest(CHANGE_PASSWORD_MUTATION, { newPassword });
      setSuccess(true);
      setTimeout(() => {
        updateUser({ ...user, mustChangePassword: false });
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "var(--font-family, 'Inter', sans-serif)"
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        padding: '36px 28px',
        position: 'relative',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>

        {!success ? (
          <>
            {/* Header Icon */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: '#FFF3F3',
                border: '1px solid #FFE6E6',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <ShieldAlert size={32} style={{ color: '#C1121F' }} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                Change Your Password
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                An admin recently reset your password. For security reasons, please create a new personal password to continue.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '12px',
                color: '#DC2626',
                fontSize: '0.84rem',
                fontWeight: 600,
                marginBottom: '18px'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '42px',
                      paddingRight: '44px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#C1121F'; e.target.style.backgroundColor = '#FFFFFF'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.backgroundColor = '#F8FAFC'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748B'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    style={{
                      width: '100%',
                      height: '48px',
                      paddingLeft: '42px',
                      paddingRight: '44px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#C1121F'; e.target.style.backgroundColor = '#FFFFFF'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.backgroundColor = '#F8FAFC'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748B'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '12px',
                  border: 'none',
                  background: loading ? '#CBD5E1' : 'linear-gradient(135deg, #C1121F, #9E0E18)',
                  color: loading ? '#94A3B8' : '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: loading ? 'none' : '0 8px 20px -4px rgba(193, 18, 31, 0.4)',
                  transition: 'all 0.2s',
                  marginTop: '4px'
                }}
              >
                {loading ? (
                  <><Loader size={20} className="animate-spin" /> Updating Password...</>
                ) : (
                  <>Save New Password <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <CheckCircle2 size={38} style={{ color: '#10B981' }} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Password Changed!
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: 0 }}>
              Your password has been updated. Redirecting you to your account...
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
