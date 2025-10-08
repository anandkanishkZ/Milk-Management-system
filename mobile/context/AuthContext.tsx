import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { userSocket } from '@/services/socket';
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
    const startTime = Date.now();
    console.log('🔍 Starting auth status check...');
    
    try {
      setLoading(true);
      
      // Add timeout to prevent infinite loading (10 seconds max)
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Auth check timeout - setting loading to false');
        setLoading(false);
      }, 10000);
      
      // Check if we have stored tokens
      const tokenData = await AsyncStorage.getItem('auth_tokens');
      if (!tokenData) {
        console.log('❌ No stored tokens found');
        clearTimeout(timeoutId);
        setLoading(false);
        return;
      }
      
      console.log('✅ Stored tokens found');

      // Check if user data exists in storage (faster than API call)
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setError(null);
          
          // Connect to Socket.IO when user is restored
          await userSocket.connect();
          
          clearTimeout(timeoutId);
          setLoading(false);
          
          console.log(`✅ Auth check completed in ${Date.now() - startTime}ms (cached)`);
          
          // Validate tokens in background (non-blocking)
          setTimeout(async () => {
            try {
              // Make a lightweight API call to validate session
              await apiService.getCurrentUser();
            } catch (error: any) {
              console.warn('Background token validation failed:', error);
              // Token will be refreshed automatically on next API call
            }
          }, 1000);
          
          return;
        } catch (parseError) {
          console.error('Error parsing stored user data:', parseError);
        }
      }

      // If no valid user data, try to get current user (this will refresh tokens if needed)
      try {
        const response = await apiService.getCurrentUser();
        if (response && response.user) {
          setUser(response.user);
          setError(null);
          
          // Connect to Socket.IO when user is authenticated
          await userSocket.connect();
          
          console.log(`✅ Auth check completed in ${Date.now() - startTime}ms (API)`);
        } else {
          // Clear invalid tokens
          await AsyncStorage.removeItem('auth_tokens');
          await AsyncStorage.removeItem('user_data');
          setUser(null);
          console.log('❌ Invalid user response from API');
        }
      } catch (apiError: any) {
        console.warn('API call failed during auth check:', apiError.message);
        // If API fails, don't clear tokens - they might work later
        setUser(null);
      }
      
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error: any) {
      console.error('Auth check error:', error);
      
      // If error contains session expired, clear everything
      if (error.message && error.message.includes('Session expired')) {
        await AsyncStorage.removeItem('auth_tokens');
        await AsyncStorage.removeItem('user_data');
        setUser(null);
        setError(null); // Don't show error for expired sessions
      } else {
        setError(error.message);
      }
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
        
        // Connect to Socket.IO after successful login
        await userSocket.connect();
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
        
        // Connect to Socket.IO after successful registration
        await userSocket.connect();
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
      
      // Disconnect Socket.IO before logout
      userSocket.disconnect();
      
      await apiService.logout();
      setUser(null);
      setError(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local state and disconnect socket
      userSocket.disconnect();
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