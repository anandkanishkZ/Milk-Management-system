import { useEffect, useState, useRef, useCallback } from 'react';
import { userSocket, UserSocketState, RealtimeStats, RealtimeNotification } from '@/services/socket';
import { Alert } from 'react-native';

/**
 * Hook for managing Socket.IO connection state and real-time data
 */
export const useUserSocket = () => {
  const [socketState, setSocketState] = useState<UserSocketState>({
    isConnected: false,
    socketId: null,
    lastError: null,
    connectionStatus: 'disconnected',
  });

  useEffect(() => {
    // Listen for connection state changes
    const cleanup = userSocket.onConnectionStateChange((state) => {
      setSocketState(state);
    });

    // Initial connection check
    setSocketState({
      isConnected: userSocket.isConnected,
      socketId: userSocket.socketId || null,
      lastError: null,
      connectionStatus: userSocket.isConnected ? 'connected' : 'disconnected',
    });

    return cleanup;
  }, []);

  const requestStats = useCallback(() => {
    userSocket.requestStats();
  }, []);

  const requestActivity = useCallback((limit = 10) => {
    userSocket.requestActivity(limit);
  }, []);

  const requestSync = useCallback(() => {
    userSocket.requestSync();
  }, []);

  const ping = useCallback(() => {
    userSocket.ping();
  }, []);

  const reconnect = useCallback(async () => {
    await userSocket.reconnect();
  }, []);

  return {
    ...socketState,
    requestStats,
    requestActivity,
    requestSync,
    ping,
    reconnect,
    socket: userSocket,
  };
};

/**
 * Hook for listening to specific real-time events
 */
export const useSocketEvent = (event: string, callback: (data: any) => void) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const wrappedCallback = (data: any) => {
      callbackRef.current(data);
    };

    userSocket.on(event, wrappedCallback);

    return () => {
      userSocket.off(event, wrappedCallback);
    };
  }, [event]);
};

/**
 * Hook for real-time dashboard stats
 */
export const useRealtimeStats = () => {
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useSocketEvent('stats:updated', (newStats) => {
    setStats(newStats);
    setLastUpdate(new Date());
  });

  // Request initial stats
  useEffect(() => {
    userSocket.requestStats();
  }, []);

  return {
    stats,
    lastUpdate,
    requestUpdate: () => userSocket.requestStats(),
  };
};

/**
 * Hook for real-time delivery updates
 */
export const useRealtimeDeliveries = () => {
  const [lastDelivery, setLastDelivery] = useState<any>(null);
  const [deliveryUpdates, setDeliveryUpdates] = useState<any[]>([]);

  useSocketEvent('delivery:updated', (delivery) => {
    setLastDelivery(delivery);
    setDeliveryUpdates(prev => [delivery, ...prev.slice(0, 9)]); // Keep last 10
  });

  const updateDelivery = useCallback((deliveryData: any) => {
    userSocket.updateDelivery(deliveryData);
  }, []);

  return {
    lastDelivery,
    deliveryUpdates,
    updateDelivery,
  };
};

/**
 * Hook for real-time payment updates
 */
export const useRealtimePayments = () => {
  const [lastPayment, setLastPayment] = useState<any>(null);
  const [paymentUpdates, setPaymentUpdates] = useState<any[]>([]);

  useSocketEvent('payment:added', (payment) => {
    setLastPayment(payment);
    setPaymentUpdates(prev => [payment, ...prev.slice(0, 9)]); // Keep last 10
  });

  const addPayment = useCallback((paymentData: any) => {
    userSocket.addPayment(paymentData);
  }, []);

  return {
    lastPayment,
    paymentUpdates,
    addPayment,
  };
};

/**
 * Hook for real-time customer updates
 */
export const useRealtimeCustomers = () => {
  const [lastCustomerUpdate, setLastCustomerUpdate] = useState<any>(null);
  const [customerUpdates, setCustomerUpdates] = useState<any[]>([]);

  useSocketEvent('customer:updated', (customer) => {
    setLastCustomerUpdate(customer);
    setCustomerUpdates(prev => [customer, ...prev.slice(0, 9)]); // Keep last 10
  });

  const updateCustomer = useCallback((customerData: any) => {
    userSocket.updateCustomer(customerData);
  }, []);

  return {
    lastCustomerUpdate,
    customerUpdates,
    updateCustomer,
  };
};

/**
 * Hook for real-time balance updates
 */
export const useRealtimeBalances = () => {
  const [balanceUpdates, setBalanceUpdates] = useState<any[]>([]);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<any>(null);

  useSocketEvent('balance:updated', (balance) => {
    setLastBalanceUpdate(balance);
    setBalanceUpdates(prev => {
      const existingIndex = prev.findIndex(b => b.customerId === balance.customerId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = balance;
        return updated;
      }
      return [balance, ...prev];
    });
  });

  return {
    balanceUpdates,
    lastBalanceUpdate,
  };
};

/**
 * Hook for real-time activity updates
 */
export const useRealtimeActivity = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [lastActivity, setLastActivity] = useState<any>(null);

  useSocketEvent('activity:updated', (newActivities) => {
    if (Array.isArray(newActivities)) {
      setActivities(newActivities);
      setLastActivity(newActivities[0]);
    } else {
      setLastActivity(newActivities);
      setActivities(prev => [newActivities, ...prev.slice(0, 19)]); // Keep last 20
    }
  });

  return {
    activities,
    lastActivity,
  };
};

/**
 * Hook for real-time notifications
 */
export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const cleanup = userSocket.onNotification((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show native alert for important notifications
      if (notification.type === 'payment' || notification.type === 'delivery') {
        Alert.alert(
          notification.title,
          notification.message,
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
      }
    });

    return cleanup;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
};

/**
 * Hook for sync management
 */
export const useDataSync = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useSocketEvent('sync:required', () => {
    setSyncStatus('syncing');
    // Trigger data synchronization logic here
    userSocket.requestSync();
  });

  const requestSync = useCallback(() => {
    setSyncStatus('syncing');
    userSocket.requestSync();
    
    // Simulate sync completion (replace with actual sync logic)
    setTimeout(() => {
      setSyncStatus('success');
      setLastSync(new Date());
    }, 2000);
  }, []);

  return {
    syncStatus,
    lastSync,
    requestSync,
  };
};

/**
 * Hook for connection health monitoring
 */
export const useSocketHealth = () => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [latency, setLatency] = useState<number | null>(null);

  const startHealthCheck = useCallback((interval = 30000) => {
    const healthInterval = setInterval(() => {
      const startTime = Date.now();
      
      userSocket.ping();
      
      const pongHandler = () => {
        const endTime = Date.now();
        setLatency(endTime - startTime);
        setIsHealthy(true);
        userSocket.off('pong', pongHandler);
      };

      userSocket.on('pong', pongHandler);
      
      // Timeout if no pong received
      setTimeout(() => {
        userSocket.off('pong', pongHandler);
        setIsHealthy(false);
        setLatency(null);
      }, 5000);
    }, interval);

    return () => clearInterval(healthInterval);
  }, []);

  return {
    isHealthy,
    latency,
    startHealthCheck,
  };
};

/**
 * Hook for offline/online status with Socket.IO integration
 */
export const useOfflineSync = () => {
  const { isConnected } = useUserSocket();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);

  // Monitor online status
  useEffect(() => {
    setIsOnline(isConnected);
  }, [isConnected]);

  const addPendingOperation = useCallback((operation: any) => {
    setPendingOperations(prev => [...prev, operation]);
  }, []);

  const processPendingOperations = useCallback(() => {
    if (isConnected && pendingOperations.length > 0) {
      pendingOperations.forEach(operation => {
        switch (operation.type) {
          case 'delivery':
            userSocket.updateDelivery(operation.data);
            break;
          case 'payment':
            userSocket.addPayment(operation.data);
            break;
          case 'customer':
            userSocket.updateCustomer(operation.data);
            break;
        }
      });
      setPendingOperations([]);
    }
  }, [isConnected, pendingOperations]);

  // Auto-process pending operations when coming online
  useEffect(() => {
    if (isConnected) {
      processPendingOperations();
    }
  }, [isConnected, processPendingOperations]);

  return {
    isOnline,
    pendingOperations,
    addPendingOperation,
    processPendingOperations,
  };
};