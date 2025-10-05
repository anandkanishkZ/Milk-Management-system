import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { ENV, isDevelopment } from '@/config/environment';

export default function SyncStatusComponent() {
  const { isAuthenticated, user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    checkConnection();
  }, [isAuthenticated]);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      
      if (!isAuthenticated) {
        setConnectionStatus('disconnected');
        return;
      }

      // Simple connection test with AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${ENV.apiBaseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#28a745';
      case 'disconnected': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'API Connected';
      case 'disconnected': return 'API Disconnected';
      default: return 'Checking Connection';
    }
  };

  if (!isDevelopment()) {
    return null; // Hide in production
  }

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]} />
      <Text style={styles.text}>
        {getStatusText()}
        {user && ` • ${user.email}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 15,
    margin: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});