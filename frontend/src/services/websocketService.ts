import { io, Socket } from 'socket.io-client';

interface WebSocketEvents {
  // Allocation events
  'allocation:created': (allocation: any) => void;
  'allocation:updated': (allocation: any) => void;
  'allocation:deleted': (allocationId: string) => void;
  
  // Project events
  'project:created': (project: any) => void;
  'project:updated': (project: any) => void;
  'project:deleted': (projectId: string) => void;
  
  // Employee events
  'employee:created': (employee: any) => void;
  'employee:updated': (employee: any) => void;
  'employee:deleted': (employeeId: string) => void;
  
  // Conflict events
  'conflict:detected': (conflict: any) => void;
  'conflict:resolved': (conflictId: string) => void;
  
  // Utilization events
  'utilization:changed': (data: { employeeId: string }) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventListeners = new Map<string, Set<Function>>();

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.socket?.connected) {
      return;
    }

    this.isConnecting = true;
    
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    
    try {
      this.socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
        auth: {
          // Add authentication if needed
          token: localStorage.getItem('authToken')
        }
      });

      this.setupEventHandlers();
      this.isConnecting = false;
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection:established');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection:lost', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connection:error', error);
      this.scheduleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.emit('connection:restored', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.emit('reconnection:error', error);
    });

    // Re-register all existing event listeners
    this.reregisterEventListeners();
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  private reregisterEventListeners() {
    if (!this.socket) return;

    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(listener => {
        this.socket!.on(event, listener as any);
      });
    });
  }

  /**
   * Subscribe to WebSocket events
   */
  on<K extends keyof WebSocketEvents>(event: K, callback: WebSocketEvents[K]): void;
  on(event: string, callback: Function): void;
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);

    if (this.socket?.connected) {
      this.socket.on(event, callback as any);
    }
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off<K extends keyof WebSocketEvents>(event: K, callback?: WebSocketEvents[K]): void;
  off(event: string, callback?: Function): void;
  off(event: string, callback?: Function): void {
    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.eventListeners.delete(event);
        }
      }
      
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      if (this.socket) {
        this.socket.removeAllListeners(event);
      }
    }
  }

  /**
   * Emit events to server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`WebSocket not connected, cannot emit event: ${event}`);
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance
   */
  get socketInstance(): Socket | null {
    return this.socket;
  }

  /**
   * Manually reconnect
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  /**
   * Join a room (for project-specific or employee-specific updates)
   */
  joinRoom(room: string): void {
    this.emit('join:room', room);
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.emit('leave:room', room);
  }

  /**
   * Subscribe to project updates
   */
  subscribeToProject(projectId: string): void {
    this.joinRoom(`project:${projectId}`);
  }

  /**
   * Unsubscribe from project updates
   */
  unsubscribeFromProject(projectId: string): void {
    this.leaveRoom(`project:${projectId}`);
  }

  /**
   * Subscribe to employee updates
   */
  subscribeToEmployee(employeeId: string): void {
    this.joinRoom(`employee:${employeeId}`);
  }

  /**
   * Unsubscribe from employee updates
   */
  unsubscribeFromEmployee(employeeId: string): void {
    this.leaveRoom(`employee:${employeeId}`);
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
export type { WebSocketEvents };