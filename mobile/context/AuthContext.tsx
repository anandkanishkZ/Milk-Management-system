import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing auth token on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      // Check if we have a stored token
      const token = await AsyncStorage.getItem('auth_tokens');
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await apiService.getCurrentUser();
      if (response && response.user) {
        setUser(response.user);
        setError(null);
      } else {
        // Token is invalid, clear it
        await AsyncStorage.removeItem('auth_tokens');
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auth check error:', error);
      setError(error.message);
      // Clear invalid token
      await AsyncStorage.removeItem('auth_tokens');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.login(email, password);
      if (response && response.user) {
        setUser(response.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; phone?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.register(userData);
      if (response && response.user) {
        setUser(response.user);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await apiService.logout();
      setUser(null);
      setError(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}