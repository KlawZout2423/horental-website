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

/** Read user data from the non-HttpOnly user_data cookie (safe — no secrets). */
function readUserFromCookie(): User | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith('user_data='));
    if (!match) return null;
    const raw = decodeURIComponent(match.split('=').slice(1).join('='));
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Hydrate user from the non-HttpOnly user_data cookie on mount.
    // The auth_token is HttpOnly — the browser sends it automatically on
    // every request, but JS cannot read it (that's the point).
    const cookieUser = readUserFromCookie();
    setUser(cookieUser);
    setLoading(false);
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
