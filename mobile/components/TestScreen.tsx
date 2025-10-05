import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { apiService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

export default function TestScreen() {
  const { user } = useAuth();
  const { customers, refreshData } = useData();

  const testApiConnection = async () => {
    try {
      const response = await apiService.getCurrentUser();
      if (response && response.user) {
        Alert.alert('Success', 'API connection working! User authenticated.');
      } else {
        Alert.alert('API Error', 'Failed to get user data');
      }
    } catch (error: any) {
      Alert.alert('API Error', error.message);
      console.error('API test error:', error);
    }
  };

  const testDataLoading = async () => {
    try {
      await refreshData();
      Alert.alert('Success', `Data loading working! Found ${customers.length} customers`);
    } catch (error: any) {
      Alert.alert('Data Loading Error', error.message);
      console.error('Data loading test error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API & Data Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testApiConnection}>
        <View style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Test API Connection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testDataLoading}>
        <View style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Test Data Loading</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Test Components:</Text>
        <Text style={styles.infoItem}>• API connection</Text>
        <Text style={styles.infoItem}>• Data loading</Text>
        <Text style={styles.infoItem}>• Authentication status</Text>
        <Text style={styles.infoItem}>• Backend integration</Text>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Current Status:</Text>
        <Text style={styles.statusItem}>User: {user?.email || 'Not authenticated'}</Text>
        <Text style={styles.statusItem}>Customers: {customers.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonIcon: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    marginRight: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginTop: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});