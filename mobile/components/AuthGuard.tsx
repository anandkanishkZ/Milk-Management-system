import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import SplashScreen from './SplashScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for 3 seconds only on app start
    if (pathname === '/') {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSplash(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!loading && !showSplash) {
      const isAuthRoute = pathname.startsWith('/auth');
      const isTabRoute = pathname.startsWith('/(tabs)');
      
      if (!user && !isAuthRoute) {
        // User not authenticated and not on auth route, redirect to signin
        router.replace('/auth/signin' as any);
      } else if (user && isAuthRoute) {
        // User authenticated but on auth route, redirect to tabs
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, loading, pathname, showSplash]);

  // Show splash screen on app start
  if (showSplash && pathname === '/') {
    return <SplashScreen />;
  }

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
});