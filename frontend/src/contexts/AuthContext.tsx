'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface ApiErrorPayload {
  error?: string;
  message?: string;
  errors?: Array<{ message?: string }>;
}

interface ApiErrorShape {
  response?: { data?: ApiErrorPayload };
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as ApiErrorShape;
  const errorData = err?.response?.data;
  if (!errorData) return fallback;

  if (errorData.error) {
    // Old format
    return errorData.error;
  }
  if (errorData.message) {
    // New format with structured errors
    if (errorData.errors && errorData.errors.length > 0) {
      return errorData.errors[0].message || errorData.message;
    }
    return errorData.message;
  }
  return fallback;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // After a Google OAuth callback the backend now sets an HttpOnly cookie
    // and redirects to `/?login=success`. Detect that, fetch the user via
    // /api/auth/me (the cookie rides along thanks to withCredentials), and
    // strip the query string so refreshes do not re-trigger.
    let bootstrappedFromOAuth = false;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === 'success') {
        bootstrappedFromOAuth = true;
        getCurrentUser();
        params.delete('login');
        const newSearch = params.toString();
        const newUrl =
          window.location.pathname +
          (newSearch ? `?${newSearch}` : '') +
          window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    }

    if (!bootstrappedFromOAuth) {
      // Auth lives in an HttpOnly cookie now — we can't see it from JS. Always
      // ask the backend who we are; an unauthenticated visitor gets a 401 from
      // /api/auth/me, which the catch in getCurrentUser handles cleanly.
      getCurrentUser();
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const data = await authAPI.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to get current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login({ email, password });
      setUser(data.user);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Login failed'));
    }
  };

  const register = async (registerData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => {
    try {
      const data = await authAPI.register(registerData);
      setUser(data.user);
    } catch (error: unknown) {
      throw new Error(extractErrorMessage(error, 'Registration failed'));
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
