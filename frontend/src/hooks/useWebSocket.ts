import { useContext, useEffect, useCallback } from 'react';

// Import the WebSocket context - we'll create a proper export
let WebSocketContext: any = null;

// Function to set context (called from WebSocketProvider)
export const setWebSocketContext = (context: any) => {
  WebSocketContext = context;
};

// Import the useWebSocket hook from the context
import { useWebSocket } from '../contexts/WebSocketContext';

// Custom hook for resource allocation real-time updates
export const useResourceAllocationUpdates = (callback: (data: any) => void) => {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (socket && isConnected) {
      const handleUpdate = (data: any) => {
        callback(data);
      };

      socket.on('resource-allocation-updated', handleUpdate);
      
      return () => {
        socket.off('resource-allocation-updated', handleUpdate);
      };
    }
  }, [socket, isConnected, callback]);
};

// Custom hook for user presence tracking
export const useUserPresence = (userId: string, location: string) => {
  const { socket, isConnected, emit } = useWebSocket();

  const updatePresence = useCallback((action: 'joined' | 'left' | 'active' | 'idle') => {
    if (isConnected) {
      emit('user-presence-update', {
        userId,
        action,
        location,
        timestamp: new Date().toISOString()
      });
    }
  }, [emit, isConnected, userId, location]);

  // Join presence on mount
  useEffect(() => {
    if (isConnected) {
      updatePresence('joined');
      
      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        updatePresence('active');
      }, 30000); // Every 30 seconds

      return () => {
        clearInterval(heartbeat);
        updatePresence('left');
      };
    }
  }, [isConnected, updatePresence]);

  return { updatePresence };
};

// Custom hook for cursor tracking
export const useCursorTracking = (userId: string) => {
  const { socket, isConnected, emit } = useWebSocket();

  const updateCursorPosition = useCallback((x: number, y: number, elementId?: string) => {
    if (isConnected) {
      emit('cursor-position-update', {
        userId,
        x,
        y,
        elementId,
        timestamp: new Date().toISOString()
      });
    }
  }, [emit, isConnected, userId]);

  return { updateCursorPosition };
};

// Custom hook for selection tracking
export const useSelectionTracking = (userId: string) => {
  const { socket, isConnected, emit } = useWebSocket();

  const updateSelection = useCallback((
    elementId: string, 
    action: 'select' | 'deselect' | 'highlight',
    metadata?: any
  ) => {
    if (isConnected) {
      emit('selection-update', {
        userId,
        elementId,
        action,
        metadata,
        timestamp: new Date().toISOString()
      });
    }
  }, [emit, isConnected, userId]);

  return { updateSelection };
};

// Custom hook for real-time notifications
export const useRealTimeNotifications = (callback: (notification: any) => void) => {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (socket && isConnected) {
      const handleNotification = (data: any) => {
        callback(data);
      };

      socket.on('notification', handleNotification);
      
      return () => {
        socket.off('notification', handleNotification);
      };
    }
  }, [socket, isConnected, callback]);
};

// Export the custom hooks only - useWebSocket is exported from WebSocketContext
// Remove the circular dependency