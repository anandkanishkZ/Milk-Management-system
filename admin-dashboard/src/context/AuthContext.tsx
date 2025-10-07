'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi, handleApiError } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipAuthCheck, setSkipAuthCheck] = useState(false);

  const isAuthenticated = !!user;

  useEffect(() => {
    // Skip auth check if we just logged in
    if (skipAuthCheck) {
      setLoading(false);
      setSkipAuthCheck(false);
      return;
    }

    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (token) {
          console.log('🔐 Checking auth with token...');
          const response = await authApi.getCurrentUser();
          console.log('🔐 Auth response:', response);
          if (response.success) {
            setUser(response.data);
            console.log('✅ User authenticated:', response.data);
          } else {
            console.log('❌ Auth failed, clearing tokens');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
          }
        } else {
          console.log('🔐 No token found');
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [skipAuthCheck]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authApi.login(email, password);
      
      if (response.success) {
        const { user: userData, tokens } = response.data;
        
        console.log('🔐 Login successful, storing tokens...', userData);
        
        // Store token and user data
        localStorage.setItem('adminToken', tokens.accessToken);
        localStorage.setItem('adminUser', JSON.stringify(userData));
        
        setUser(userData);
        setSkipAuthCheck(true); // Skip the next auth check since we just logged in
        
        console.log('✅ User set in context:', userData);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      setUser(null);
      window.location.href = '/auth/login';
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}