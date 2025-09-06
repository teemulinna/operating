import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { DatabaseService } from '../database/database.service';

export interface UserPresence {
  userId: string;
  socketId: string;
  userName: string;
  userEmail: string;
  location: string;
  joinedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  elementId?: string;
  timestamp: Date;
}

export interface ResourceSelection {
  userId: string;
  userName: string;
  elementId: string;
  action: 'select' | 'deselect' | 'highlight';
  metadata?: any;
  timestamp: Date;
}

export interface ResourceAllocationUpdate {
  employeeId: string;
  employeeName: string;
  utilizationRate: number;
  updatedBy: string;
  timestamp: Date;
  reason?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer | null = null;
  private activeUsers: Map<string, UserPresence> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = DatabaseService.getInstance();
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000', 
          'http://localhost:3002', 
          'http://localhost:3003'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', this.handleConnection.bind(this));
    console.log('✅ WebSocket server initialized');
  }

  private handleConnection(socket: Socket): void {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle user joining resource room
    socket.on('join-resource-room', this.handleJoinResourceRoom.bind(this, socket));

    // Handle user presence updates
    socket.on('user-presence-update', this.handlePresenceUpdate.bind(this, socket));

    // Handle cursor position updates
    socket.on('cursor-position-update', this.handleCursorUpdate.bind(this, socket));

    // Handle resource selection updates
    socket.on('selection-update', this.handleSelectionUpdate.bind(this, socket));

    // Handle resource allocation updates
    socket.on('resource-allocation-update', this.handleResourceAllocationUpdate.bind(this, socket));

    // Handle disconnection
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error from ${socket.id}:`, error);
    });
  }

  private async handleJoinResourceRoom(socket: Socket, data: { userId: string }): Promise<void> {
    try {
      const { userId } = data;
      
      // Get user information from database
      const user = await this.databaseService.executeQuery(
        'SELECT name, email FROM employees WHERE id = $1',
        [userId]
      );

      if (!user.rows.length) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      const userInfo = user.rows[0];
      
      // Join the resource allocation room
      socket.join('resource-allocation');
      
      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Create presence record
      const presence: UserPresence = {
        userId,
        socketId: socket.id,
        userName: userInfo.name,
        userEmail: userInfo.email,
        location: '/dashboard/allocation',
        joinedAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      this.activeUsers.set(socket.id, presence);

      // Notify other users about new presence
      socket.to('resource-allocation').emit('user-presence-updated', {
        type: 'user_joined',
        user: {
          id: userId,
          name: userInfo.name,
          email: userInfo.email,
          isActive: true,
          cursor: null,
          selection: null
        },
        timestamp: new Date().toISOString()
      });

      // Send current active users to the new user
      const activeUsersArray = Array.from(this.activeUsers.values())
        .filter(user => user.userId !== userId)
        .map(user => ({
          id: user.userId,
          name: user.userName,
          email: user.userEmail,
          isActive: user.isActive,
          lastActivity: user.lastActivity.toISOString()
        }));

      socket.emit('active-users', activeUsersArray);
      
      console.log(`👤 User ${userInfo.name} joined resource room`);

    } catch (error) {
      console.error('Error handling join resource room:', error);
      socket.emit('error', { message: 'Failed to join resource room' });
    }
  }

  private handlePresenceUpdate(socket: Socket, data: any): void {
    const presence = this.activeUsers.get(socket.id);
    if (!presence) return;

    const { action, location } = data;
    
    presence.lastActivity = new Date();
    presence.isActive = action === 'active' || action === 'joined';
    
    if (location) {
      presence.location = location;
    }

    // Broadcast presence update
    socket.to('resource-allocation').emit('user-presence-updated', {
      type: 'presence_update',
      user: {
        id: presence.userId,
        name: presence.userName,
        email: presence.userEmail,
        isActive: presence.isActive,
        location: presence.location,
        lastActivity: presence.lastActivity.toISOString()
      },
      action,
      timestamp: new Date().toISOString()
    });
  }

  private handleCursorUpdate(socket: Socket, data: any): void {
    const presence = this.activeUsers.get(socket.id);
    if (!presence) return;

    const { x, y, elementId } = data;
    
    presence.lastActivity = new Date();

    // Broadcast cursor position to other users
    socket.to('resource-allocation').emit('cursor-position-updated', {
      userId: presence.userId,
      userName: presence.userName,
      x,
      y,
      elementId,
      timestamp: new Date().toISOString()
    });
  }

  private handleSelectionUpdate(socket: Socket, data: any): void {
    const presence = this.activeUsers.get(socket.id);
    if (!presence) return;

    const { elementId, action, metadata } = data;
    
    presence.lastActivity = new Date();

    // Broadcast selection update to other users
    socket.to('resource-allocation').emit('selection-updated', {
      userId: presence.userId,
      userName: presence.userName,
      elementId,
      action,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Check for conflicts (multiple users selecting same element)
    if (action === 'select') {
      this.checkForSelectionConflicts(elementId, presence);
    }
  }

  private checkForSelectionConflicts(elementId: string, currentUser: UserPresence): void {
    const conflictingUsers: UserPresence[] = [];
    
    // Check all active users for conflicts
    this.activeUsers.forEach(user => {
      // Note: In a real implementation, you'd track current selections per user
      // This is a simplified version for demonstration
    });

    if (conflictingUsers.length > 0) {
      // Notify about conflict
      this.io?.to('resource-allocation').emit('selection-conflict', {
        elementId,
        users: conflictingUsers.map(u => ({
          id: u.userId,
          name: u.userName,
          email: u.userEmail
        })),
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleResourceAllocationUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const presence = this.activeUsers.get(socket.id);
      if (!presence) return;

      const { employeeId, utilizationRate, reason } = data;

      // Get employee information
      const employee = await this.databaseService.executeQuery(
        'SELECT name FROM employees WHERE id = $1',
        [employeeId]
      );

      if (!employee.rows.length) {
        socket.emit('error', { message: 'Employee not found' });
        return;
      }

      const employeeName = employee.rows[0].name;

      // Update capacity in database
      await this.databaseService.executeQuery(`
        INSERT INTO capacity (employee_id, utilization_rate, week_start_date, updated_at, updated_by)
        VALUES ($1, $2, date_trunc('week', CURRENT_DATE), NOW(), $3)
        ON CONFLICT (employee_id, week_start_date)
        DO UPDATE SET 
          utilization_rate = $2,
          updated_at = NOW(),
          updated_by = $3
      `, [employeeId, utilizationRate, presence.userId]);

      // Broadcast the update to all connected clients
      this.io?.to('resource-allocation').emit('resource-allocation-updated', {
        employeeId,
        employeeName,
        utilizationRate,
        updatedBy: presence.userName,
        reason,
        timestamp: new Date().toISOString()
      });

      // Send notification about the update
      this.io?.to('resource-allocation').emit('notification', {
        id: `allocation-${employeeId}-${Date.now()}`,
        type: 'resource_allocation',
        title: 'Resource Allocation Updated',
        message: `${employeeName}'s utilization has been updated to ${Math.round(utilizationRate * 100)}% by ${presence.userName}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'medium',
        userId: presence.userId,
        actions: [
          {
            label: 'View Details',
            action: 'view',
            data: { employeeId }
          }
        ]
      });

      console.log(`📊 Resource allocation updated: ${employeeName} -> ${utilizationRate * 100}% by ${presence.userName}`);

    } catch (error) {
      console.error('Error handling resource allocation update:', error);
      socket.emit('error', { message: 'Failed to update resource allocation' });
    }
  }

  private handleDisconnect(socket: Socket): void {
    const presence = this.activeUsers.get(socket.id);
    
    if (presence) {
      // Remove from user sockets tracking
      const userSocketSet = this.userSockets.get(presence.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(presence.userId);
          
          // Notify others that user left (only if they have no other active sockets)
          socket.to('resource-allocation').emit('user-presence-updated', {
            type: 'user_left',
            user: {
              id: presence.userId,
              name: presence.userName,
              email: presence.userEmail,
              isActive: false
            },
            timestamp: new Date().toISOString()
          });

          // Send notification
          socket.to('resource-allocation').emit('notification', {
            id: `user-left-${presence.userId}-${Date.now()}`,
            type: 'user_left',
            title: 'User Left',
            message: `${presence.userName} left the collaboration session`,
            timestamp: new Date().toISOString(),
            isRead: false,
            priority: 'low'
          });
        }
      }
      
      this.activeUsers.delete(socket.id);
      console.log(`👤 User ${presence.userName} disconnected`);
    }
  }

  // Public methods for other services to emit events
  public broadcastResourceUpdate(data: ResourceAllocationUpdate): void {
    this.io?.to('resource-allocation').emit('resource-allocation-updated', data);
  }

  public sendNotification(notification: any, targetUserId?: string): void {
    if (targetUserId) {
      const userSockets = this.userSockets.get(targetUserId);
      if (userSockets) {
        userSockets.forEach(socketId => {
          this.io?.to(socketId).emit('notification', notification);
        });
      }
    } else {
      this.io?.to('resource-allocation').emit('notification', notification);
    }
  }

  public getActiveUsers(): UserPresence[] {
    return Array.from(this.activeUsers.values());
  }

  public getUserCount(): number {
    return this.userSockets.size;
  }
}