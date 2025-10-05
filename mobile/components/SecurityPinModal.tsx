import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
  subtitle?: string;
  mode?: string;
}

const SECURITY_PIN_KEY = 'security_pin';
const DEFAULT_PIN = '1234'; // Default PIN - should be changeable

export default function SecurityPinModal({
  visible,
  onClose,
  onSuccess,
  title = 'Security PIN Required',
  message = 'Please enter your security PIN to continue',
}: SecurityPinModalProps) {
  const [pin, setPin] = useState('');
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPinExists = async () => {
    try {
      const storedPin = await AsyncStorage.getItem(SECURITY_PIN_KEY);
      return !!storedPin;
    } catch (error) {
      console.error('Error checking PIN:', error);
      return false;
    }
  };

  const validatePin = async () => {
    try {
      setLoading(true);
      
      const storedPin = await AsyncStorage.getItem(SECURITY_PIN_KEY);
      const validPin = storedPin || DEFAULT_PIN;
      
      if (pin === validPin) {
        onSuccess();
        setPin('');
        onClose();
      } else {
        Alert.alert('Invalid PIN', 'The PIN you entered is incorrect.');
        setPin('');
      }
    } catch (error) {
      console.error('Error validating PIN:', error);
      Alert.alert('Error', 'Failed to validate PIN');
    } finally {
      setLoading(false);
    }
  };

  const createPin = async () => {
    try {
      if (pin.length < 4) {
        Alert.alert('Invalid PIN', 'PIN must be at least 4 digits long.');
        return;
      }

      setLoading(true);
      await AsyncStorage.setItem(SECURITY_PIN_KEY, pin);
      
      Alert.alert('Success', 'Security PIN created successfully!');
      onSuccess();
      setPin('');
      setIsCreatingPin(false);
      onClose();
    } catch (error) {
      console.error('Error creating PIN:', error);
      Alert.alert('Error', 'Failed to create PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!pin) {
      Alert.alert('PIN Required', 'Please enter a PIN.');
      return;
    }

    if (isCreatingPin) {
      await createPin();
    } else {
      await validatePin();
    }
  };

  const handleClose = () => {
    setPin('');
    setIsCreatingPin(false);
    onClose();
  };

  React.useEffect(() => {
    if (visible) {
      checkPinExists().then(exists => {
        setIsCreatingPin(!exists);
      });
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {isCreatingPin ? 'Create Security PIN' : title}
          </Text>
          
          <Text style={styles.message}>
            {isCreatingPin 
              ? 'Create a 4-digit PIN to secure your data'
              : message
            }
          </Text>

          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={setPin}
            placeholder="Enter PIN"
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Processing...' : (isCreatingPin ? 'Create' : 'Verify')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 25,
    borderRadius: 15,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
    letterSpacing: 3,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  submitButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});