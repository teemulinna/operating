import { useEffect, useCallback, useState } from 'react';
import { HeatMapData } from '../services/heat-map.service';

interface WebSocketMessage {
  type: 'capacity_update' | 'allocation_change' | 'heat_map_refresh';
  data?: {
    employeeId?: string;
    date?: string;
    updatedData?: Partial<HeatMapData>;
    affectedEmployees?: string[];
  };
}

interface UseHeatMapWebSocketProps {
  onDataUpdate?: (data: HeatMapData[]) => void;
  onPartialUpdate?: (update: Partial<HeatMapData>) => void;
  employeeId?: string;
  departmentId?: string;
  enabled?: boolean;
}

export const useHeatMapWebSocket = ({
  onDataUpdate,
  onPartialUpdate,
  employeeId,
  departmentId,
  enabled = true,
}: UseHeatMapWebSocketProps) => {
  void onDataUpdate;
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for heat map updates');
      setIsConnected(true);

      // Subscribe to relevant channels
      const subscription = {
        type: 'subscribe',
        channels: ['capacity_updates'],
        filters: {
          employeeId,
          departmentId,
        },
      };
      ws.send(JSON.stringify(subscription));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);

      // Attempt to reconnect after 5 seconds
      if (enabled) {
        setTimeout(() => {
          connect();
        }, 5000);
      }
    };

    setSocket(ws);

    return ws;
  }, [enabled, employeeId, departmentId]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    setLastUpdate(new Date());

    switch (message.type) {
      case 'capacity_update':
        if (message.data?.updatedData && onPartialUpdate) {
          onPartialUpdate(message.data.updatedData);
        }
        break;

      case 'allocation_change':
        // Allocation changes affect capacity, trigger a refresh
        if (message.data?.affectedEmployees) {
          // Check if our filtered employee is affected
          if (!employeeId || message.data.affectedEmployees.includes(employeeId)) {
            // Request updated data from the server
            requestRefresh();
          }
        }
        break;

      case 'heat_map_refresh':
        // Full refresh of heat map data
        requestRefresh();
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [employeeId, onPartialUpdate]);

  const requestRefresh = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'request_heat_map_data',
        filters: {
          employeeId,
          departmentId,
        },
      }));
    }
  }, [socket, employeeId, departmentId]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  // Connect on mount and disconnect on unmount
  useEffect(() => {
    const ws = connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  // Send heartbeat to keep connection alive
  useEffect(() => {
    if (!socket || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [socket, isConnected]);

  return {
    isConnected,
    lastUpdate,
    requestRefresh,
    disconnect,
  };
};