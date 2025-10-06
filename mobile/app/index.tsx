import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SplashScreen from '@/components/SplashScreen';
import TestScreen from '@/components/TestScreen';

export default function IndexScreen() {
  const [showTest, setShowTest] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    console.log('🎬 Splash screen completed, hiding...');
    setShowSplash(false);
  };

  // Show test screen if requested
  if (showTest) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setShowTest(false)}
        >
          <Text style={styles.backButtonText}>← Back to Splash</Text>
        </TouchableOpacity>
        <TestScreen />
      </View>
    );
  }

  // Show splash screen on first load
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // After splash completes, show a simple loading state
  // AuthGuard will handle the navigation to appropriate screens
  return (
    <View style={[styles.container, styles.loadingContainer]}>
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={() => setShowTest(true)}
      >
        <Text style={styles.testButtonText}>🔧 Test</Text>
      </TouchableOpacity>
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  testButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 1000,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '500',
    marginTop: 20,
  },
});