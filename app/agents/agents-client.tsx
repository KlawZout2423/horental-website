'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, Phone, MessageCircle, Search, Users, ChevronRight } from 'lucide-react';
import { graphqlRequest, GET_AGENTS } from '../../lib/graphql';
import { getOptimizedImageUrl, stripIdFromBio } from '../../lib/types';

interface AgentData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  bio?: string;
  profileImage?: string;
  agentLocation?: string;
  agentWhatsapp?: string;
  verificationStatus?: string;
}

export default function AgentsClient() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    graphqlRequest<{ agents: AgentData[] }>(GET_AGENTS)
      .then(data => {
        if (data?.agents) setAgents(data.agents);
      })
      .catch(err => setError(err.message || 'Failed to load agents.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = agents.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.agentLocation || '').toLowerCase().includes(q) ||
      (a.bio || '').toLowerCase().includes(q)
    );
  });

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '3rem 1.5rem 2.5rem',
        textAlign: 'center',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#16213e', border: '1px solid #6366f133', borderRadius: '99px', padding: '5px 16px', marginBottom: '1.25rem' }}>
          <ShieldCheck size={14} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>All agents are identity-verified by HO Rentals</span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.75rem' }}>
          Our Verified Agents
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: '560px', margin: '0 auto 2rem', fontSize: '1rem', lineHeight: '1.6' }}>
          Connect directly with trusted, Ghana Card–verified property agents and landlords across Ho & beyond.
        </p>

        {/* Search */}
        <div style={{ maxWidth: '440px', margin: '0 auto', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by name, area, or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem 0.85rem 2.75rem',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '0.75rem',
              color: '#f8fafc',
              fontSize: '0.93rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.25rem' }}>
        {/* Count */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.75rem', color: '#64748b', fontSize: '0.88rem' }}>
            <Users size={16} />
            <span>{filtered.length} verified agent{filtered.length !== 1 ? 's' : ''} found</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--border)', animation: 'pulse 1.5s infinite' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#334155', marginBottom: '1rem' }} />
                <div style={{ height: '1rem', background: '#334155', borderRadius: '4px', width: '60%', marginBottom: '0.5rem' }} />
                <div style={{ height: '0.75rem', background: '#1e293b', borderRadius: '4px', width: '80%' }} />
              </div>
            ))}
            <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }` }} />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#f87171' }}>
            <p>⚠️ {error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
              {search ? 'No agents match your search' : 'No verified agents yet'}
            </h3>
            <p style={{ fontSize: '0.88rem' }}>
              {search ? 'Try a different name or location.' : 'Check back soon — more agents are being verified.'}
            </p>
          </div>
        )}

        {/* Agents Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(agent => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(99,102,241,0.15)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#6366f155';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Avatar + badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                      {agent.profileImage ? (
                        <img
                          src={getOptimizedImageUrl(agent.profileImage, 120)}
                          alt={agent.name}
                          style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f155' }}
                        />
                      ) : (
                        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                          {getInitials(agent.name)}
                        </div>
                      )}
                      {/* Verified badge overlay */}
                      <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#166534', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>
                        <ShieldCheck size={10} style={{ color: '#86efac' }} />
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      background: agent.role === 'landlord' ? '#1e3a5f' : '#1a1a3e',
                      color: agent.role === 'landlord' ? '#93c5fd' : '#a5b4fc',
                      padding: '3px 10px',
                      borderRadius: '99px',
                    }}>
                      {agent.role}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {agent.name}
                  </h3>

                  {/* Location */}
                  {agent.agentLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748b', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
                      <MapPin size={12} />
                      <span>{agent.agentLocation}</span>
                    </div>
                  )}

                  {/* Bio excerpt */}
                  {stripIdFromBio(agent.bio) && (
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.83rem',
                      lineHeight: '1.5',
                      margin: '0 0 1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {stripIdFromBio(agent.bio)}
                    </p>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#86efac', fontSize: '0.78rem', fontWeight: 600 }}>
                      <ShieldCheck size={12} />
                      <span>Verified Agent</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(agent.phone || agent.agentWhatsapp) && (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <a
                            href={`https://wa.me/${((agent.agentWhatsapp || agent.phone || '').replace(/[^0-9+]/g, '').startsWith('0') ? `233${(agent.agentWhatsapp || agent.phone || '').replace(/[^0-9+]/g, '').slice(1)}` : (agent.agentWhatsapp || agent.phone || '').replace(/[^0-9+]/g, '').replace('+', ''))}?text=${encodeURIComponent(`Hello ${agent.name}, I am contacting you regarding your property listings on HO Rentals.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: '#25D366',
                              color: '#fff',
                              textDecoration: 'none',
                              boxShadow: '0 2px 5px rgba(37,211,102,0.3)',
                            }}
                            title="Chat on WhatsApp"
                            aria-label="WhatsApp Agent"
                          >
                            <MessageCircle size={15} />
                          </a>
                          {agent.phone && (
                            <a
                              href={`tel:${agent.phone}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                color: '#fff',
                                textDecoration: 'none',
                                boxShadow: '0 2px 5px rgba(193,18,31,0.3)',
                              }}
                              title="Call Agent"
                              aria-label="Call Agent"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 700 }}>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
