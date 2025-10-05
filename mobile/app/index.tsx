import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SplashScreen from '@/components/SplashScreen';
import TestScreen from '@/components/TestScreen';

export default function IndexScreen() {
  const [showTest, setShowTest] = useState(false);

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

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={() => setShowTest(true)}
      >
        <Text style={styles.testButtonText}>🔧 Test Mode</Text>
      </TouchableOpacity>
      <SplashScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
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
});