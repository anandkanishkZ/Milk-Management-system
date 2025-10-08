import { io, Socket } from 'socket.io-client';

interface SocketEvents {
  // Server to Client
  'delivery:updated': (data: any) => void;
  'payment:added': (data: any) => void;
  'customer:updated': (data: any) => void;
  'stats:updated': (data: any) => void;
  'balance:updated': (data: any) => void;
  'activity:updated': (data: any) => void;
  'error': (data: { message: string; code?: string }) => void;
  'pong': () => void;
  
  // Client to Server
  'delivery:update': (data: any) => void;
  'payment:add': (data: any) => void;
  'customer:update': (data: any) => void;
  'stats:request': () => void;
  'activity:request': (limit: number) => void;
  'ping': () => void;
}

class AdminSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners = new Map<string, Function[]>();

  constructor() {
    // Only connect on client-side
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  /**
   * Connect to Socket.IO server with admin authentication
   */
  async connect(): Promise<void> {
    // Only connect on client-side
    if (typeof window === 'undefined') {
      return;
    }

    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    try {
      this.isConnecting = true;
      
      let token: string | null = null;
      try {
        token = localStorage.getItem('adminToken');
      } catch (storageError) {
        console.warn('localStorage not available, cannot get admin token');
        this.isConnecting = false;
        return;
      }
      
      if (!token) {
        console.warn('No admin token available for Socket.IO connection');
        this.isConnecting = false;
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      
      this.socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupEventHandlers();
      this.reconnectAttempts = 0;

    } catch (error) {
      console.error('Socket connection error:', error);
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
      console.log('✅ Admin Socket.IO connected');
      this.reconnectAttempts = 0;
      
      // Request initial stats
      this.emit('stats:request');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Admin Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Handle real-time business events
    this.socket.on('stats:updated', (data) => {
      this.notifyListeners('stats:updated', data);
    });

    this.socket.on('delivery:updated', (data) => {
      this.notifyListeners('delivery:updated', data);
    });

    this.socket.on('payment:added', (data) => {
      this.notifyListeners('payment:added', data);
    });

    this.socket.on('customer:updated', (data) => {
      this.notifyListeners('customer:updated', data);
    });

    this.socket.on('activity:updated', (data) => {
      this.notifyListeners('activity:updated', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error received:', error);
      this.notifyListeners('error', error);
    });

    // Health check
    this.socket.on('pong', () => {
      this.notifyListeners('pong', null);
    });
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (typeof window === 'undefined') {
      console.warn('Socket emit called on server-side, ignoring:', event);
      return;
    }

    if (this.socket?.connected) {
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
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting admin socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  /**
   * Check connection status
   */
  get isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  get socketId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return this.socket?.id;
  }

  /**
   * Request real-time stats update
   */
  requestStats(): void {
    if (typeof window !== 'undefined') {
      this.emit('stats:request');
    }
  }

  /**
   * Request activity logs
   */
  requestActivity(limit = 10): void {
    if (typeof window !== 'undefined') {
      this.emit('activity:request', limit);
    }
  }

  /**
   * Send health check ping
   */
  ping(): void {
    if (typeof window !== 'undefined') {
      this.emit('ping');
    }
  }
}

// Export singleton instance
export const adminSocket = new AdminSocketService();

// Export Socket service class for testing
export { AdminSocketService };

export default adminSocket;