"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const database_service_1 = require("../database/database.service");
class WebSocketService {
    constructor() {
        this.io = null;
        this.activeUsers = new Map();
        this.userSockets = new Map();
        this.databaseService = database_service_1.DatabaseService.getInstance();
    }
    static getInstance() {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }
    initialize(server) {
        this.io = new socket_io_1.Server(server, {
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
    handleConnection(socket) {
        console.log(`🔌 Client connected: ${socket.id}`);
        socket.on('join-resource-room', this.handleJoinResourceRoom.bind(this, socket));
        socket.on('user-presence-update', this.handlePresenceUpdate.bind(this, socket));
        socket.on('cursor-position-update', this.handleCursorUpdate.bind(this, socket));
        socket.on('selection-update', this.handleSelectionUpdate.bind(this, socket));
        socket.on('resource-allocation-update', this.handleResourceAllocationUpdate.bind(this, socket));
        socket.on('disconnect', this.handleDisconnect.bind(this, socket));
        socket.on('error', (error) => {
            console.error(`WebSocket error from ${socket.id}:`, error);
        });
    }
    async handleJoinResourceRoom(socket, data) {
        try {
            const { userId } = data;
            const user = await this.databaseService.query('SELECT name, email FROM employees WHERE id = $1', [userId]);
            if (!user.rows.length) {
                socket.emit('error', { message: 'User not found' });
                return;
            }
            const userInfo = user.rows[0];
            socket.join('resource-allocation');
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socket.id);
            const presence = {
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
        }
        catch (error) {
            console.error('Error handling join resource room:', error);
            socket.emit('error', { message: 'Failed to join resource room' });
        }
    }
    handlePresenceUpdate(socket, data) {
        const presence = this.activeUsers.get(socket.id);
        if (!presence)
            return;
        const { action, location } = data;
        presence.lastActivity = new Date();
        presence.isActive = action === 'active' || action === 'joined';
        if (location) {
            presence.location = location;
        }
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
    handleCursorUpdate(socket, data) {
        const presence = this.activeUsers.get(socket.id);
        if (!presence)
            return;
        const { x, y, elementId } = data;
        presence.lastActivity = new Date();
        socket.to('resource-allocation').emit('cursor-position-updated', {
            userId: presence.userId,
            userName: presence.userName,
            x,
            y,
            elementId,
            timestamp: new Date().toISOString()
        });
    }
    handleSelectionUpdate(socket, data) {
        const presence = this.activeUsers.get(socket.id);
        if (!presence)
            return;
        const { elementId, action, metadata } = data;
        presence.lastActivity = new Date();
        socket.to('resource-allocation').emit('selection-updated', {
            userId: presence.userId,
            userName: presence.userName,
            elementId,
            action,
            metadata,
            timestamp: new Date().toISOString()
        });
        if (action === 'select') {
            this.checkForSelectionConflicts(elementId, presence);
        }
    }
    checkForSelectionConflicts(elementId, currentUser) {
        const conflictingUsers = [];
        this.activeUsers.forEach(user => {
        });
        if (conflictingUsers.length > 0) {
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
    async handleResourceAllocationUpdate(socket, data) {
        try {
            const presence = this.activeUsers.get(socket.id);
            if (!presence)
                return;
            const { employeeId, utilizationRate, reason } = data;
            const employee = await this.databaseService.query('SELECT name FROM employees WHERE id = $1', [employeeId]);
            if (!employee.rows.length) {
                socket.emit('error', { message: 'Employee not found' });
                return;
            }
            const employeeName = employee.rows[0].name;
            await this.databaseService.query(`
        INSERT INTO capacity (employee_id, utilization_rate, week_start_date, updated_at, updated_by)
        VALUES ($1, $2, date_trunc('week', CURRENT_DATE), NOW(), $3)
        ON CONFLICT (employee_id, week_start_date)
        DO UPDATE SET 
          utilization_rate = $2,
          updated_at = NOW(),
          updated_by = $3
      `, [employeeId, utilizationRate, presence.userId]);
            this.io?.to('resource-allocation').emit('resource-allocation-updated', {
                employeeId,
                employeeName,
                utilizationRate,
                updatedBy: presence.userName,
                reason,
                timestamp: new Date().toISOString()
            });
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
        }
        catch (error) {
            console.error('Error handling resource allocation update:', error);
            socket.emit('error', { message: 'Failed to update resource allocation' });
        }
    }
    handleDisconnect(socket) {
        const presence = this.activeUsers.get(socket.id);
        if (presence) {
            const userSocketSet = this.userSockets.get(presence.userId);
            if (userSocketSet) {
                userSocketSet.delete(socket.id);
                if (userSocketSet.size === 0) {
                    this.userSockets.delete(presence.userId);
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
    broadcastResourceUpdate(data) {
        this.io?.to('resource-allocation').emit('resource-allocation-updated', data);
    }
    sendNotification(notification, targetUserId) {
        if (targetUserId) {
            const userSockets = this.userSockets.get(targetUserId);
            if (userSockets) {
                userSockets.forEach(socketId => {
                    this.io?.to(socketId).emit('notification', notification);
                });
            }
        }
        else {
            this.io?.to('resource-allocation').emit('notification', notification);
        }
    }
    getActiveUsers() {
        return Array.from(this.activeUsers.values());
    }
    getUserCount() {
        return this.userSockets.size;
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=websocket.service.js.map