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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const data = await authAPI.getCurrentUser();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to get current user:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (error: any) {
      // Handle both old and new error formats
      const errorData = error.response?.data;
      let errorMessage = 'Login failed';
      
      if (errorData) {
        if (errorData.error) {
          // Old format
          errorMessage = errorData.error;
        } else if (errorData.message) {
          // New format with structured errors
          errorMessage = errorData.message;
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].message || errorMessage;
          }
        }
      }
      
      throw new Error(errorMessage);
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
      localStorage.setItem('token', data.token);
      setUser(data.user);
    } catch (error: any) {
      // Handle both old and new error formats
      const errorData = error.response?.data;
      let errorMessage = 'Registration failed';
      
      if (errorData) {
        if (errorData.error) {
          // Old format
          errorMessage = errorData.error;
        } else if (errorData.message) {
          // New format with structured errors
          errorMessage = errorData.message;
          if (errorData.errors && errorData.errors.length > 0) {
            errorMessage = errorData.errors[0].message || errorMessage;
          }
        }
      }
      
      throw new Error(errorMessage);
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