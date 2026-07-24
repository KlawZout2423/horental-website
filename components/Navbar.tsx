'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Home, Search, PlusCircle, Shield, LogOut, Menu, X, User, Heart, Sun, Moon, Info } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('app_theme') as 'light' | 'dark' | null;
    const initial = storedTheme ?? 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

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
          <Link href="/about" className={isActive('/about')}>About Us</Link>
          <Link href="/favorites" className={isActive('/favorites')}>Favorites</Link>
          {user && (user.role === 'admin' || user.role === 'partner') && (
            <Link href="/upload" className={isActive('/upload')}>Upload Property</Link>
          )}
          {user && user.role === 'admin' && (
            <Link href="/admin" className={isActive('/admin')}>Admin Dashboard</Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className={styles.actions}>
          {/* Dark / Light theme toggle */}
          <button
            onClick={toggleTheme}
            className={`${styles.themeToggleBtn} btn btn-icon`}
            style={{ color: 'var(--text-primary)', padding: '8px', cursor: 'pointer' }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

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
                  <Link href="/favorites" className={styles.userMenuItem}>
                    <Heart size={16} /> Favorite Rentals
                  </Link>
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

        {/* Mobile & Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Dark / Light theme toggle button — mobile header only */}
          <button
            onClick={toggleTheme}
            className={`${styles.mobileHeaderThemeBtn} ${styles.themeToggleBtn} btn btn-icon`}
            style={{ color: 'var(--text-primary)', padding: '8px', cursor: 'pointer' }}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Hamburger Menu Icon */}
          <button className={styles.menuButton} onClick={toggleMobileMenu} aria-label="Toggle Navigation Menu">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <Link href="/" className={isActive('/')} onClick={toggleMobileMenu}>
            <Home size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Home
          </Link>
          <Link href="/properties" className={isActive('/properties')} onClick={toggleMobileMenu}>
            <Search size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Search Rentals
          </Link>
          <Link href="/about" className={isActive('/about')} onClick={toggleMobileMenu}>
            <Info size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> About Us
          </Link>
          <Link href="/favorites" className={isActive('/favorites')} onClick={toggleMobileMenu}>
            <Heart size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Favorites
          </Link>
          {user && (user.role === 'admin' || user.role === 'partner') && (
            <Link href="/upload" className={isActive('/upload')} onClick={toggleMobileMenu}>
              <PlusCircle size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Upload Property
            </Link>
          )}
          {user && user.role === 'admin' && (
            <Link href="/admin" className={isActive('/admin')} onClick={toggleMobileMenu}>
              <Shield size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Admin Dashboard
            </Link>
          )}

          <div className={styles.userMenuDivider}></div>

          {/* Mobile Theme Toggle Row */}
          <div 
            onClick={toggleTheme} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              <span>App Theme</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'capitalize', fontWeight: 700 }}>
              {theme} Mode
            </span>
          </div>

          <div className={styles.userMenuDivider}></div>

          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
                <div className={styles.avatar}>{getInitials(user.name)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                  <span className={styles.userMenuRole} style={{ marginTop: '4px', display: 'inline-block' }}>{user.role}</span>
                </div>
              </div>
              <button onClick={() => { logout(); toggleMobileMenu(); }} className="btn btn-danger" style={{ width: '100%', marginTop: '4px' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/login" className="btn btn-outline" onClick={toggleMobileMenu} style={{ width: '100%', textAlign: 'center' }}>
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary" onClick={toggleMobileMenu} style={{ width: '100%', textAlign: 'center' }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
