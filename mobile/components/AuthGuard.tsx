import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '../context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('🛡️ AuthGuard effect triggered:', { 
      user: !!user, 
      loading, 
      pathname
    });
    
    // Handle navigation after loading is complete
    if (!loading) {
      const isAuthRoute = pathname.startsWith('/auth');
      const isTabRoute = pathname.startsWith('/(tabs)');
      const isIndexRoute = pathname === '/';
      
      console.log('🛡️ AuthGuard navigation check:', { 
        user: !!user, 
        pathname, 
        isAuthRoute, 
        isTabRoute, 
        isIndexRoute 
      });
      
      if (!user && !isAuthRoute) {
        // User not authenticated - go to signin
        console.log('🔐 AuthGuard: Redirecting to signin (no user)');
        router.replace('/auth/signin' as any);
      } else if (user && (isAuthRoute || isIndexRoute)) {
        // User authenticated but on wrong route - go to tabs
        console.log('👤 AuthGuard: Redirecting to tabs (user authenticated)');
        router.replace('/(tabs)' as any);
      } else {
        console.log('✅ AuthGuard: User on correct route, no navigation needed');
      }
    }
  }, [user, loading, pathname]);

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