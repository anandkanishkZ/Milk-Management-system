import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/config/environment';

// Type definitions for socket events
interface ServerToClientEvents {
  'stats:updated': (stats: RealtimeStats) => void;
  'delivery:updated': (delivery: any) => void;
  'payment:added': (payment: any) => void;
  'customer:updated': (customer: any) => void;
  'balance:updated': (balance: any) => void;
  'activity:updated': (activity: any) => void;
  'sync:required': (data?: any) => void;
  'notification': (notification: RealtimeNotification) => void;
  'notification:user': (data: any) => void;
  'pong': () => void;
  'error': (error: string) => void;
  'auth:error': (error: string) => void;
}

interface ClientToServerEvents {
  'stats:request': () => void;
  'activity:request': (limit?: number) => void;
  'sync:request': () => void;
  'delivery:update': (data: any) => void;
  'payment:add': (data: any) => void;
  'customer:update': (data: any) => void;
  'ping': () => void;
}

type SocketType = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketEvents {
  // Server to Client
  'delivery:updated': (data: any) => void;
  'payment:added': (data: any) => void;
  'customer:updated': (data: any) => void;
  'stats:updated': (data: any) => void;
  'balance:updated': (data: any) => void;
  'activity:updated': (data: any) => void;
  'notification:user': (data: any) => void;
  'sync:required': (data: any) => void;
  'error': (data: { message: string; code?: string }) => void;
  'pong': () => void;
  
  // Client to Server
  'delivery:update': (data: any) => void;
  'payment:add': (data: any) => void;
  'customer:update': (data: any) => void;
  'stats:request': () => void;
  'activity:request': (limit: number) => void;
  'sync:request': () => void;
  'ping': () => void;
}

export interface UserSocketState {
  isConnected: boolean;
  socketId: string | null;
  lastError: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface RealtimeStats {
  totalCustomers: number;
  activeCustomers: number;
  todayDeliveries: number;
  todayRevenue: number;
  pendingPayments: number;
  totalBalance: number;
  lastUpdate: Date;
}

export interface RealtimeNotification {
  id: string;
  type: 'delivery' | 'payment' | 'customer' | 'system' | 'sync';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  isRead: boolean;
}

class UserSocketService {
  private socket: SocketType | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners = new Map<string, Function[]>();
  private connectionStateCallbacks: ((state: UserSocketState) => void)[] = [];
  private notificationCallbacks: ((notification: RealtimeNotification) => void)[] = [];

  constructor() {
    // Auto-connect when service is initialized
    this.connect();
  }

  /**
   * Connect to Socket.IO server with user authentication
   */
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    try {
      this.isConnecting = true;
      const tokens = await AsyncStorage.getItem('auth_tokens');
      
      if (!tokens) {
        console.warn('No auth tokens available for Socket.IO connection');
        return;
      }

      const { accessToken } = JSON.parse(tokens);
      
      this.socket = io(ENV.apiBaseUrl, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
      });

      this.setupEventHandlers();
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error('Socket connection error:', error);
      this.notifyConnectionState({
        isConnected: false,
        socketId: null,
        lastError: error instanceof Error ? error.message : 'Connection failed',
        connectionStatus: 'error'
      });
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ User Socket.IO connected');
      this.reconnectAttempts = 0;
      
      this.notifyConnectionState({
        isConnected: true,
        socketId: this.socket?.id || null,
        lastError: null,
        connectionStatus: 'connected'
      });

      // Request initial data
      this.emit('stats:request');
      this.emit('activity:request', 10);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ User Socket.IO disconnected:', reason);
      this.notifyConnectionState({
        isConnected: false,
        socketId: null,
        lastError: null,
        connectionStatus: 'disconnected'
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }

      this.notifyConnectionState({
        isConnected: false,
        socketId: null,
        lastError: error.message,
        connectionStatus: 'error'
      });
    });

    // Handle real-time business events
    this.socket.on('stats:updated', (data) => {
      this.notifyListeners('stats:updated', data);
    });

    this.socket.on('delivery:updated', (data) => {
      this.notifyListeners('delivery:updated', data);
      this.createNotification({
        id: `delivery_${Date.now()}`,
        type: 'delivery',
        title: 'Delivery Updated',
        message: `${data.customer?.name}: ${data.quantity}L delivery recorded`,
        data,
        timestamp: new Date(),
        isRead: false
      });
    });

    this.socket.on('payment:added', (data) => {
      this.notifyListeners('payment:added', data);
      this.createNotification({
        id: `payment_${Date.now()}`,
        type: 'payment',
        title: 'Payment Received',
        message: `₹${data.amount} received from ${data.customer?.name}`,
        data,
        timestamp: new Date(),
        isRead: false
      });
    });

    this.socket.on('customer:updated', (data) => {
      this.notifyListeners('customer:updated', data);
      this.createNotification({
        id: `customer_${Date.now()}`,
        type: 'customer',
        title: 'Customer Updated',
        message: `${data.name} profile has been updated`,
        data,
        timestamp: new Date(),
        isRead: false
      });
    });

    this.socket.on('balance:updated', (data) => {
      this.notifyListeners('balance:updated', data);
    });

    this.socket.on('activity:updated', (data) => {
      this.notifyListeners('activity:updated', data);
    });

    this.socket.on('notification:user', (data) => {
      this.createNotification({
        id: `notification_${Date.now()}`,
        type: data.type || 'system',
        title: data.title,
        message: data.message,
        data: data.data,
        timestamp: new Date(),
        isRead: false
      });
    });

    this.socket.on('sync:required', (data) => {
      this.notifyListeners('sync:required', data);
      this.createNotification({
        id: `sync_${Date.now()}`,
        type: 'sync',
        title: 'Sync Required',
        message: 'Your data needs to be synchronized',
        data,
        timestamp: new Date(),
        isRead: false
      });
    });

    this.socket.on('error', (error) => {
      console.error('Socket server error:', error);
      this.notifyConnectionState({
        isConnected: this.socket?.connected || false,
        socketId: this.socket?.id || null,
        lastError: typeof error === 'string' ? error : (error as Error)?.message || 'Unknown error',
        connectionStatus: 'error'
      });
    });
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      // @ts-ignore - Allow dynamic event emission for now
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Add connection state callback
   */
  onConnectionStateChange(callback: (state: UserSocketState) => void): () => void {
    this.connectionStateCallbacks.push(callback);
    
    // Return cleanup function
    return () => {
      const index = this.connectionStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Add notification callback
   */
  onNotification(callback: (notification: RealtimeNotification) => void): () => void {
    this.notificationCallbacks.push(callback);
    
    // Return cleanup function
    return () => {
      const index = this.notificationCallbacks.indexOf(callback);
      if (index > -1) {
        this.notificationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in socket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Notify connection state callbacks
   */
  private notifyConnectionState(state: UserSocketState): void {
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  /**
   * Create and notify about new notification
   */
  private createNotification(notification: RealtimeNotification): void {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting user socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
    this.notifyConnectionState({
      isConnected: false,
      socketId: null,
      lastError: null,
      connectionStatus: 'disconnected'
    });
  }

  /**
   * Check connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  get socketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Request real-time stats update
   */
  requestStats(): void {
    this.emit('stats:request');
  }

  /**
   * Request activity logs
   */
  requestActivity(limit = 10): void {
    this.emit('activity:request', limit);
  }

  /**
   * Request data synchronization
   */
  requestSync(): void {
    this.emit('sync:request');
  }

  /**
   * Send delivery update
   */
  updateDelivery(deliveryData: any): void {
    this.emit('delivery:update', deliveryData);
  }

  /**
   * Send payment addition
   */
  addPayment(paymentData: any): void {
    this.emit('payment:add', paymentData);
  }

  /**
   * Send customer update
   */
  updateCustomer(customerData: any): void {
    this.emit('customer:update', customerData);
  }

  /**
   * Send health check ping
   */
  ping(): void {
    this.emit('ping');
  }

  /**
   * Reconnect manually
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.connect();
  }
}

// Export singleton instance
export const userSocket = new UserSocketService();

// Export Socket service class for testing
export { UserSocketService };

export default userSocket;