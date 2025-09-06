import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  connectionError: string | null;
  retryCount: number;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
  options?: any;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url = process.env.VITE_API_URL || 'http://localhost:3001',
  options = {}
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxRetries = 10;
  const baseDelay = 1000; // 1 second

  // Exponential backoff calculation
  const calculateDelay = useCallback((attempt: number) => {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
  }, [baseDelay]);

  // Initialize WebSocket connection
  useEffect(() => {
    let currentSocket: Socket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;

    const initializeSocket = () => {
      try {
        currentSocket = io(url, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: false, // We'll handle reconnection manually
          timeout: 20000,
          ...options
        });

        currentSocket.on('connect', () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setConnectionStatus('connected');
          setConnectionError(null);
          setRetryCount(0);
          reconnectAttempts = 0;
          
          // Join the resource allocation room for real-time updates
          currentSocket?.emit('join-resource-room', { userId: 'current-user' });
        });

        currentSocket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          setIsConnected(false);
          setConnectionStatus('disconnected');
          
          // Attempt reconnection if not a manual disconnect
          if (reason !== 'io client disconnect' && reconnectAttempts < maxRetries) {
            attemptReconnection();
          }
        });

        currentSocket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          setIsConnected(false);
          setConnectionStatus('error');
          setConnectionError(error.message);
          
          // Attempt reconnection with exponential backoff
          if (reconnectAttempts < maxRetries) {
            attemptReconnection();
          }
        });

        // Resource allocation real-time events
        currentSocket.on('resource-allocation-updated', (data) => {
          console.log('Resource allocation updated:', data);
          window.dispatchEvent(new CustomEvent('resource-allocation-changed', { detail: data }));
        });

        // User presence events
        currentSocket.on('user-presence-updated', (data) => {
          console.log('User presence updated:', data);
          window.dispatchEvent(new CustomEvent('user-presence-changed', { detail: data }));
        });

        // Cursor tracking events
        currentSocket.on('cursor-position-updated', (data) => {
          window.dispatchEvent(new CustomEvent('cursor-position-changed', { detail: data }));
        });

        // Selection highlighting events
        currentSocket.on('selection-updated', (data) => {
          window.dispatchEvent(new CustomEvent('selection-changed', { detail: data }));
        });

        // Notification events
        currentSocket.on('notification', (data) => {
          window.dispatchEvent(new CustomEvent('realtime-notification', { detail: data }));
        });

        setSocket(currentSocket);
        return currentSocket;
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        setConnectionStatus('error');
        setConnectionError(error instanceof Error ? error.message : 'Unknown error');
        return null;
      }
    };

    const attemptReconnection = () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      const delay = calculateDelay(reconnectAttempts);
      console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxRetries})`);
      
      reconnectTimeout = setTimeout(() => {
        reconnectAttempts++;
        setRetryCount(reconnectAttempts);
        setConnectionStatus('connecting');
        
        // Clean up existing socket
        if (currentSocket) {
          currentSocket.removeAllListeners();
          currentSocket.disconnect();
        }
        
        // Create new socket
        initializeSocket();
      }, delay);
    };

    // Initialize the socket
    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (currentSocket) {
        currentSocket.removeAllListeners();
        currentSocket.disconnect();
      }
    };
  }, [url]);

  // Emit function wrapper
  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Cannot emit event:', event);
    }
  }, [socket, isConnected]);

  // Event listener wrapper
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  // Remove event listener wrapper
  const off = useCallback((event: string, handler?: (data: any) => void) => {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    connectionStatus,
    emit,
    on,
    off,
    connectionError,
    retryCount
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;