'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Home, Search, PlusCircle, Shield, LogOut, Menu, X, User } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' ? `${styles.navLink} ${styles.activeNavLink}` : styles.navLink;
    }
    return pathname?.startsWith(path) ? `${styles.navLink} ${styles.activeNavLink}` : styles.navLink;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Hide navbar entirely on auth pages — showing "Sign In/Sign Up" buttons
  // while the user is already on those pages is redundant and distracting.
  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register')
  ) {
    return null;
  }

  return (
    <nav className={`${styles.navbar} glass ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
          <Image src="/logo.png" alt="HO Rentals Logo" width={36} height={36} style={{ objectFit: 'contain' }} />
          <span className={styles.logoText}>HO<span className={styles.logoTextSpan}>Rentals</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <div className={styles.navLinks}>
          <Link href="/" className={isActive('/')}>Home</Link>
          <Link href="/properties" className={isActive('/properties')}>Search Rentals</Link>
          {user && (user.role === 'admin' || user.role === 'partner') && (
            <Link href="/upload" className={isActive('/upload')}>Upload Property</Link>
          )}
          {user && user.role === 'admin' && (
            <Link href="/admin" className={isActive('/admin')}>Admin Dashboard</Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className={styles.actions}>
          {user ? (
            <div className={styles.userInfo} onClick={toggleDropdown}>
              <div className={styles.avatar}>{getInitials(user.name)}</div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
              
              {isDropdownOpen && (
                <div className={styles.userMenu}>
                  <div className={styles.userMenuHeader}>
                    <span>Account Privilege</span>
                    <span className={styles.userMenuRole}>{user.role}</span>
                  </div>
                  <div className={styles.userMenuDivider}></div>
                  {user.role === 'admin' && (
                    <Link href="/admin" className={styles.userMenuItem}>
                      <Shield size={16} /> Admin Panel
                    </Link>
                  )}
                  <Link href="/properties" className={styles.userMenuItem}>
                    <Search size={16} /> Browse Properties
                  </Link>
                  <div className={styles.userMenuDivider}></div>
                  <div className={styles.userMenuItem} onClick={() => logout()}>
                    <LogOut size={16} /> Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline" style={{ padding: '8px 16px' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Hamburger Menu Icon */}
        <button className={styles.menuButton} onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/" className={isActive('/')} onClick={toggleMobileMenu}>
            Home
          </Link>
          <Link href="/properties" className={isActive('/properties')} onClick={toggleMobileMenu}>
            Search Rentals
          </Link>
          {user && (user.role === 'admin' || user.role === 'partner') && (
            <Link href="/upload" className={isActive('/upload')} onClick={toggleMobileMenu}>
              Upload Property
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link href="/admin" className={isActive('/admin')} onClick={toggleMobileMenu}>
              Admin Dashboard
            </Link>
          )}
          <div className={styles.userMenuDivider}></div>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px' }}>
                <div className={styles.avatar}>{getInitials(user.name)}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                </div>
              </div>
              <button onClick={() => { logout(); toggleMobileMenu(); }} className="btn btn-danger" style={{ width: '100%' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/login" className="btn btn-outline" onClick={toggleMobileMenu} style={{ width: '100%' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary" onClick={toggleMobileMenu} style={{ width: '100%' }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
