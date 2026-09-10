'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Home, Search, PlusCircle, Shield, LogOut, Menu, X, User, Heart, Sun, Moon, Info } from 'lucide-react';
import styles from './Navbar.module.css';

import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Expandable Header Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLFormElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearchQuery.trim()) {
      router.push(`/properties?search=${encodeURIComponent(headerSearchQuery.trim())}`);
      setIsSearchOpen(false);
    } else {
      router.push('/properties');
      setIsSearchOpen(false);
    }
  };

  const toggleHeaderSearch = () => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      return next;
    });
  };

  // Close search & mobile menu automatically when navigating to another page
  useEffect(() => {
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close search bar when clicking outside
  useEffect(() => {
    function handleClickOutsideSearch(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutsideSearch);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, [isSearchOpen]);

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

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

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
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/landlord-registration') ||
    pathname?.startsWith('/forgot-password')
  ) {
    return null;
  }

  return (
    <nav className={`${styles.navbar} glass ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {isSearchOpen ? (
          <form ref={searchContainerRef} onSubmit={handleHeaderSearchSubmit} className={styles.headerSearchExpandForm}>
            <Search size={18} className={styles.headerSearchExpandIcon} />
            <input
              ref={searchInputRef}
              id="header-search-input"
              name="headerSearchQuery"
              type="text"
              placeholder="Search location, hostel, campus (UHAS, HTU)..."
              value={headerSearchQuery}
              onChange={(e) => setHeaderSearchQuery(e.target.value)}
              className={styles.headerSearchExpandInput}
              aria-label="Search properties input"
            />
            <button
              type="button"
              onClick={() => { setIsSearchOpen(false); setHeaderSearchQuery(''); }}
              className={styles.headerSearchCloseBtn}
              aria-label="Close Search"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <>
            {/* Logo */}
            <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
              <Image src="/logo.png" alt="HO Rentals Logo" width={36} height={36} style={{ objectFit: 'contain' }} />
              <span className={styles.logoText}>HO<span className={styles.logoTextSpan}>Rentals</span></span>
            </Link>

            {/* Desktop Nav Links */}
            <div className={styles.navLinks}>
              <Link href="/" className={isActive('/')}>Home</Link>
              <Link href="/properties" className={isActive('/properties')}>Search Rentals</Link>
              <Link href="/#yuyu-rides" className={styles.yuyuNavLink} style={{ color: '#10B981', fontWeight: 700 }}>🚗 Yuyu Rides</Link>
              <Link href="/about" className={isActive('/about')}>About Us</Link>
              <Link href="/favorites" className={isActive('/favorites')}>Favorites</Link>
              {user && (user.role === 'admin' || user.role === 'agent' || user.role === 'landlord') && (
                <Link href="/upload" className={isActive('/upload')}>Upload Property</Link>
              )}
              {user && user.role === 'admin' && (
                <Link href="/admin" className={isActive('/admin')}>Admin Dashboard</Link>
              )}
            </div>

            {/* Desktop Actions */}
            <div className={styles.actions}>
              {/* Notification Bell for New Listings — Logged in users only */}
              {user && <NotificationBell userId={user.id} />}

              {/* Dark / Light theme toggle — Desktop Navbar */}
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
                <div className={styles.userInfo} onClick={toggleDropdown} ref={dropdownRef}>
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
                      {(user.role === 'agent' || user.role === 'landlord') && (
                        <Link href="/dashboard" className={styles.userMenuItem}>
                          <User size={16} /> My Dashboard
                        </Link>
                      )}
                      {(user.role === 'admin' || user.role === 'agent' || user.role === 'landlord') && (
                        <Link href="/upload" className={styles.userMenuItem}>
                          <PlusCircle size={16} /> Post a Listing
                        </Link>
                      )}
                      <Link href="/favorites" className={styles.userMenuItem}>
                        <Heart size={16} /> Favorite Rentals
                      </Link>
                      <Link href="/properties" className={styles.userMenuItem}>
                        <Search size={16} /> Browse Properties
                      </Link>
                      <div className={styles.userMenuDivider}></div>
                      {/* Theme Toggle in User Dropdown Menu */}
                      <div className={styles.userMenuItem} onClick={toggleTheme}>
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        <span>App Theme ({theme === 'light' ? 'Dark' : 'Light'})</span>
                      </div>
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
              {user && (
                <div className={styles.mobileHeaderThemeBtn}>
                  <NotificationBell userId={user.id} />
                </div>
              )}

              {/* Expandable Search Button — Mobile Header */}
              <button
                onClick={toggleHeaderSearch}
                className={`${styles.mobileHeaderThemeBtn} btn btn-icon`}
                style={{ color: 'var(--text-primary)', padding: '8px', cursor: 'pointer' }}
                title="Search Rentals"
                aria-label="Search Rentals"
              >
                <Search size={20} />
              </button>

              {/* Hamburger Menu Icon */}
              <button className={styles.menuButton} onClick={toggleMobileMenu} aria-label="Toggle Navigation Menu">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </>
        )}
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
          <Link href="/#yuyu-rides" onClick={toggleMobileMenu} style={{ color: '#10B981', fontWeight: 700, display: 'block', padding: '8px 0' }}>
            🚗 Book Keke Ride (Yuyu Rides)
          </Link>
          <Link href="/about" className={isActive('/about')} onClick={toggleMobileMenu}>
            <Info size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> About Us
          </Link>
          <Link href="/favorites" className={isActive('/favorites')} onClick={toggleMobileMenu}>
            <Heart size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> Favorites
          </Link>
          {user && (user.role === 'agent' || user.role === 'landlord') && (
            <Link href="/dashboard" className={isActive('/dashboard')} onClick={toggleMobileMenu}>
              <User size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> My Dashboard
            </Link>
          )}
          {user && (user.role === 'admin' || user.role === 'agent' || user.role === 'landlord') && (
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
