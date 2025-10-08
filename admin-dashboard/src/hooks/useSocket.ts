import { useEffect, useState, useCallback, useRef } from 'react';
import { adminSocket } from '@/lib/socket';
import { useQueryClient } from '@tanstack/react-query';
import { Toast } from '@/lib/toast';

interface SocketState {
  isConnected: boolean;
  socketId: string | null;
  lastError: string | null;
}

/**
 * Hook for managing Socket.IO connection state and real-time data
 */
export const useAdminSocket = () => {
  const [socketState, setSocketState] = useState<SocketState>({
    isConnected: false,
    socketId: null,
    lastError: null,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return;
    }

    // Update connection state
    const updateConnectionState = () => {
      setSocketState({
        isConnected: adminSocket.isConnected,
        socketId: adminSocket.socketId || null,
        lastError: null,
      });
    };

    // Setup error handler
    const handleError = (error: { message: string; code?: string }) => {
      setSocketState(prev => ({
        ...prev,
        lastError: error.message,
      }));
      Toast.error(`Real-time update failed: ${error.message}`);
    };

    // Connect and setup listeners
    adminSocket.connect();
    adminSocket.on('error', handleError);

    // Monitor connection state
    const connectionCheckInterval = setInterval(updateConnectionState, 1000);
    
    // Initial connection state update
    updateConnectionState();

    return () => {
      clearInterval(connectionCheckInterval);
      adminSocket.off('error', handleError);
    };
  }, []);

  const requestStats = useCallback(() => {
    adminSocket.requestStats();
  }, []);

  const requestActivity = useCallback((limit = 10) => {
    adminSocket.requestActivity(limit);
  }, []);

  const ping = useCallback(() => {
    adminSocket.ping();
  }, []);

  return {
    ...socketState,
    requestStats,
    requestActivity,
    ping,
    socket: adminSocket,
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

    adminSocket.on(event, wrappedCallback);

    return () => {
      adminSocket.off(event, wrappedCallback);
    };
  }, [event]);
};

/**
 * Hook for real-time dashboard stats
 */
export const useRealtimeStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  useSocketEvent('stats:updated', (newStats) => {
    setStats(newStats);
    setLastUpdate(new Date());
    
    // Update React Query cache
    queryClient.setQueryData(['quick-stats'], newStats);
    queryClient.setQueryData(['reports-summary'], (oldData: any) => ({
      ...oldData,
      ...newStats,
    }));
  });

  // Request initial stats
  useEffect(() => {
    adminSocket.requestStats();
  }, []);

  return {
    stats,
    lastUpdate,
    requestUpdate: () => adminSocket.requestStats(),
  };
};

/**
 * Hook for real-time delivery updates
 */
export const useRealtimeDeliveries = () => {
  const [lastDelivery, setLastDelivery] = useState<any>(null);
  const queryClient = useQueryClient();

  useSocketEvent('delivery:updated', (delivery) => {
    setLastDelivery(delivery);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
    queryClient.invalidateQueries({ queryKey: ['quick-stats'] });
    
    Toast.success(`Delivery updated: ${delivery.customer?.name} - ${delivery.quantity}L`);
  });

  return {
    lastDelivery,
  };
};

/**
 * Hook for real-time payment updates
 */
export const useRealtimePayments = () => {
  const [lastPayment, setLastPayment] = useState<any>(null);
  const queryClient = useQueryClient();

  useSocketEvent('payment:added', (payment) => {
    setLastPayment(payment);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
    queryClient.invalidateQueries({ queryKey: ['quick-stats'] });
    
    Toast.success(`Payment received: ₹${payment.amount} from ${payment.customer?.name}`);
  });

  return {
    lastPayment,
  };
};

/**
 * Hook for real-time customer updates
 */
export const useRealtimeCustomers = () => {
  const [lastCustomerUpdate, setLastCustomerUpdate] = useState<any>(null);
  const queryClient = useQueryClient();

  useSocketEvent('customer:updated', (customer) => {
    setLastCustomerUpdate(customer);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    queryClient.invalidateQueries({ queryKey: ['quick-stats'] });
    
    Toast.info(`Customer updated: ${customer.name}`);
  });

  return {
    lastCustomerUpdate,
  };
};

/**
 * Hook for real-time activity feed
 */
export const useRealtimeActivity = (limit = 10) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useSocketEvent('activity:updated', (newActivities) => {
    setActivities(Array.isArray(newActivities) ? newActivities : [newActivities]);
    setLastUpdate(new Date());
  });

  // Request initial activity data
  useEffect(() => {
    adminSocket.requestActivity(limit);
  }, [limit]);

  return {
    activities,
    lastUpdate,
    requestUpdate: () => adminSocket.requestActivity(limit),
  };
};

/**
 * Hook for connection health monitoring
 */
export const useSocketHealth = () => {
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useSocketEvent('pong', () => {
    setLastPing(new Date());
  });

  const startHealthCheck = useCallback((intervalMs = 30000) => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    const interval = setInterval(() => {
      adminSocket.ping();
    }, intervalMs);

    pingIntervalRef.current = interval;

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const stopHealthCheck = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  return {
    lastPing,
    isHealthy: lastPing ? (Date.now() - lastPing.getTime()) < 60000 : false, // Healthy if pinged within last minute
    startHealthCheck,
    stopHealthCheck,
  };
};