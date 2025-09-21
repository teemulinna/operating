/**
 * REFACTOR Phase: Real-time Allocation WebSocket Service
 * 
 * This service provides real-time updates for allocation data:
 * - WebSocket connection to backend
 * - Real-time notifications for allocation changes
 * - Optimistic updates and conflict resolution
 * - Data consistency validation
 */

import { QueryClient } from '@tanstack/react-query';
import { allocationKeys } from '../hooks/useRealAllocationData';
import type { Allocation, AllocationConflict } from '../types/allocation';

export interface AllocationUpdateEvent {
  type: 'allocation_created' | 'allocation_updated' | 'allocation_deleted' | 'conflict_detected';
  allocation?: Allocation;
  allocationId?: string;
  employeeId?: string;
  projectId?: string;
  conflicts?: AllocationConflict[];
  timestamp: string;
}

export class RealTimeAllocationService {
  private ws: WebSocket | null = null;
  private queryClient: QueryClient;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, (event: AllocationUpdateEvent) => void> = new Map();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.connect();
  }

  private connect() {
    try {
      // Connect to backend WebSocket (adjust URL as needed)
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://your-backend.com/ws/allocations'
        : 'ws://localhost:3001/ws/allocations';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to real-time allocation service');
        this.reconnectAttempts = 0;
        
        // Send authentication if needed
        this.send({
          type: 'authenticate',
          token: localStorage.getItem('auth_token') // Adjust as needed
        });
        
        // Subscribe to allocation updates
        this.send({
          type: 'subscribe',
          channels: ['allocations', 'capacity', 'conflicts']
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data: AllocationUpdateEvent = JSON.parse(event.data);
          this.handleAllocationUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleAllocationUpdate(event: AllocationUpdateEvent) {
    console.log('Received real-time allocation update:', event);

    switch (event.type) {
      case 'allocation_created':
        this.handleAllocationCreated(event);
        break;
      case 'allocation_updated':
        this.handleAllocationUpdated(event);
        break;
      case 'allocation_deleted':
        this.handleAllocationDeleted(event);
        break;
      case 'conflict_detected':
        this.handleConflictDetected(event);
        break;
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(event));
  }

  private handleAllocationCreated(event: AllocationUpdateEvent) {
    if (!event.allocation) return;

    const allocation = event.allocation;

    // Add to allocation list cache
    this.queryClient.setQueryData(
      allocationKeys.detail(allocation.id),
      allocation
    );

    // Invalidate related queries to refetch with new data
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.lists() });
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.employee(allocation.employeeId) });
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.project(allocation.projectId) });
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.utilization(allocation.employeeId) });
  }

  private handleAllocationUpdated(event: AllocationUpdateEvent) {
    if (!event.allocation) return;

    const allocation = event.allocation;

    // Update cache
    this.queryClient.setQueryData(
      allocationKeys.detail(allocation.id),
      allocation
    );

    // Update in list caches
    const updateAllocationInList = (queryData: any) => {
      if (!queryData) return queryData;
      
      if (queryData.allocations) {
        // Handle paginated response
        return {
          ...queryData,
          allocations: queryData.allocations.map((a: Allocation) =>
            a.id === allocation.id ? allocation : a
          )
        };
      }
      
      if (Array.isArray(queryData)) {
        // Handle array response
        return queryData.map((a: Allocation) =>
          a.id === allocation.id ? allocation : a
        );
      }
      
      return queryData;
    };

    // Update in all relevant list caches
    this.queryClient.setQueriesData(
      { queryKey: allocationKeys.lists() },
      updateAllocationInList
    );

    this.queryClient.setQueriesData(
      { queryKey: allocationKeys.employee(allocation.employeeId) },
      updateAllocationInList
    );

    this.queryClient.setQueriesData(
      { queryKey: allocationKeys.project(allocation.projectId) },
      updateAllocationInList
    );

    // Invalidate utilization data
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.utilization(allocation.employeeId) });
  }

  private handleAllocationDeleted(event: AllocationUpdateEvent) {
    if (!event.allocationId) return;

    const allocationId = event.allocationId;

    // Remove from cache
    this.queryClient.removeQueries({ queryKey: allocationKeys.detail(allocationId) });

    // Remove from list caches
    const removeAllocationFromList = (queryData: any) => {
      if (!queryData) return queryData;
      
      if (queryData.allocations) {
        // Handle paginated response
        return {
          ...queryData,
          allocations: queryData.allocations.filter((a: Allocation) => a.id !== allocationId),
          total: queryData.total - 1
        };
      }
      
      if (Array.isArray(queryData)) {
        // Handle array response
        return queryData.filter((a: Allocation) => a.id !== allocationId);
      }
      
      return queryData;
    };

    this.queryClient.setQueriesData(
      { queryKey: allocationKeys.lists() },
      removeAllocationFromList
    );

    if (event.employeeId) {
      this.queryClient.setQueriesData(
        { queryKey: allocationKeys.employee(event.employeeId) },
        removeAllocationFromList
      );
      
      // Invalidate utilization
      this.queryClient.invalidateQueries({ queryKey: allocationKeys.utilization(event.employeeId) });
    }

    if (event.projectId) {
      this.queryClient.setQueriesData(
        { queryKey: allocationKeys.project(event.projectId) },
        removeAllocationFromList
      );
    }
  }

  private handleConflictDetected(event: AllocationUpdateEvent) {
    if (!event.conflicts) return;

    // Update conflicts cache
    this.queryClient.setQueryData(
      allocationKeys.conflicts(),
      event.conflicts
    );

    // If specific to an employee or project, update those too
    if (event.employeeId) {
      this.queryClient.setQueryData(
        allocationKeys.conflicts({ employeeId: event.employeeId }),
        event.conflicts
      );
    }

    if (event.projectId) {
      this.queryClient.setQueryData(
        allocationKeys.conflicts({ projectId: event.projectId }),
        event.conflicts
      );
    }

    // You could also trigger notifications here
    this.notifyConflicts(event.conflicts);
  }

  private notifyConflicts(conflicts: AllocationConflict[]) {
    // Implement user notifications for conflicts
    if (conflicts.length > 0) {
      console.warn(`${conflicts.length} allocation conflicts detected:`, conflicts);
      
      // You could integrate with a toast notification system here
      // Example: toast.error(`${conflicts.length} allocation conflicts detected`);
    }
  }

  // Public methods for component integration

  /**
   * Subscribe to real-time allocation updates
   */
  public subscribe(listenerId: string, callback: (event: AllocationUpdateEvent) => void) {
    this.listeners.set(listenerId, callback);
    
    return () => {
      this.listeners.delete(listenerId);
    };
  }

  /**
   * Subscribe to specific employee's allocation updates
   */
  public subscribeToEmployee(employeeId: string, callback: (event: AllocationUpdateEvent) => void) {
    const wrappedCallback = (event: AllocationUpdateEvent) => {
      if (event.employeeId === employeeId || event.allocation?.employeeId === employeeId) {
        callback(event);
      }
    };

    return this.subscribe(`employee-${employeeId}`, wrappedCallback);
  }

  /**
   * Subscribe to specific project's allocation updates
   */
  public subscribeToProject(projectId: string, callback: (event: AllocationUpdateEvent) => void) {
    const wrappedCallback = (event: AllocationUpdateEvent) => {
      if (event.projectId === projectId || event.allocation?.projectId === projectId) {
        callback(event);
      }
    };

    return this.subscribe(`project-${projectId}`, wrappedCallback);
  }

  /**
   * Manually refresh all allocation data
   */
  public refreshAllData() {
    this.queryClient.invalidateQueries({ queryKey: allocationKeys.all });
  }

  /**
   * Send optimistic update to improve UX
   */
  public sendOptimisticUpdate(allocation: Partial<Allocation>) {
    this.send({
      type: 'optimistic_update',
      allocation,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check connection status
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect the WebSocket
   */
  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      activeListeners: this.listeners.size
    };
  }
}

// Singleton instance for app-wide usage
let realTimeService: RealTimeAllocationService | null = null;

export const createRealTimeAllocationService = (queryClient: QueryClient) => {
  if (!realTimeService) {
    realTimeService = new RealTimeAllocationService(queryClient);
  }
  return realTimeService;
};

export const getRealTimeAllocationService = () => realTimeService;