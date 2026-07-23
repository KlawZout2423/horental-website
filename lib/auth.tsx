'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlRequest, LOGIN_MUTATION, REGISTER_MUTATION } from './graphql';

import { User, RegisterInput } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours timeout

/** Read user data from the non-HttpOnly user_data cookie and validate session age. */
function readUserFromCookie(): User | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user_data='));
    if (!match) return null;
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    const parsed = JSON.parse(raw) as User & { loggedInAt?: number };

    // Check if session has expired (exceeded 12 hours)
    if (parsed.loggedInAt && Date.now() - parsed.loggedInAt > SESSION_MAX_AGE_MS) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const verifySession = () => {
      const cookieUser = readUserFromCookie();
      if (!cookieUser && user) {
        logout();
      } else if (cookieUser) {
        setUser(cookieUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    verifySession();

    // Recheck session expiration whenever the user comes back to the window or tab
    window.addEventListener('focus', verifySession);
    document.addEventListener('visibilitychange', verifySession);

    return () => {
      window.removeEventListener('focus', verifySession);
      document.removeEventListener('visibilitychange', verifySession);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await graphqlRequest<{ login: { token: string; user: User } }>(
        LOGIN_MUTATION,
        { email, password }
      );

      const { token, user: loggedUser } = data.login;

      // Store token in HttpOnly cookie via server-side API route.
      // This keeps the JWT out of JavaScript's reach entirely.
      const res = await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, user: loggedUser }),
      });

      if (!res.ok) {
        throw new Error('Failed to establish secure session. Please try again.');
      }

      setUser(loggedUser);

      if (loggedUser.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setLoading(true);
    try {
      const data = await graphqlRequest<{ register: { token: string; user: User } }>(
        REGISTER_MUTATION,
        { input }
      );

      const { token, user: registeredUser } = data.register;

      const res = await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, user: registeredUser }),
      });

      if (!res.ok) {
        throw new Error('Failed to establish secure session. Please try again.');
      }

      setUser(registeredUser);
      router.push('/');
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    // Must call the server-side route to clear the HttpOnly cookie.
    // JS cannot delete HttpOnly cookies directly.
    await fetch('/api/auth/clear-cookie', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
