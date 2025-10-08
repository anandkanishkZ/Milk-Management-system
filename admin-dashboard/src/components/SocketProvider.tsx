'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminSocket } from '@/lib/socket';
import { Toast } from '@/lib/toast';

interface SocketContextType {
  isConnected: boolean;
  socketId: string | null;
  lastError: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  socketId: null,
  lastError: null,
  connectionStatus: 'disconnected',
});

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socketState, setSocketState] = useState<SocketContextType>({
    isConnected: false,
    socketId: null,
    lastError: null,
    connectionStatus: 'disconnected',
  });

  useEffect(() => {
    // Initialize connection state
    setSocketState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    
    // Setup event listeners
    const handleConnect = () => {
      console.log('📡 SocketProvider: Connection established');
      setSocketState(prev => ({
        ...prev,
        isConnected: true,
        socketId: adminSocket.socketId || null,
        connectionStatus: 'connected',
        lastError: null,
      }));
    };

    const handleDisconnect = () => {
      console.log('📡 SocketProvider: Connection lost');
      setSocketState(prev => ({
        ...prev,
        isConnected: false,
        socketId: null,
        connectionStatus: 'disconnected',
      }));
    };

    const handleError = (error: { message: string; code?: string }) => {
      console.log('📡 SocketProvider: Connection error:', error);
      setSocketState(prev => ({
        ...prev,
        lastError: error.message,
        connectionStatus: 'error',
      }));
    };

    // Add event listeners
    adminSocket.on('connect', handleConnect);
    adminSocket.on('disconnect', handleDisconnect);
    adminSocket.on('error', handleError);

    // Don't auto-connect here - let AuthContext handle it
    console.log('📡 SocketProvider: Event handlers registered, waiting for authentication...');

    // Cleanup
    return () => {
      adminSocket.off('connect', handleConnect);
      adminSocket.off('disconnect', handleDisconnect);
      adminSocket.off('error', handleError);
    };
  }, []);

  // Monitor connection state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = {
        isConnected: adminSocket.isConnected,
        socketId: adminSocket.socketId || null,
      };

      setSocketState(prev => {
        if (prev.isConnected !== currentState.isConnected) {
          return {
            ...prev,
            ...currentState,
            connectionStatus: currentState.isConnected ? 'connected' : 'disconnected',
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SocketContext.Provider value={socketState}>
      {children}
    </SocketContext.Provider>
  );
};