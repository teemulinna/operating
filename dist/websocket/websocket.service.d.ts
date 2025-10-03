import { Server as HttpServer } from 'http';
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
export declare class WebSocketService {
    private static instance;
    private io;
    private activeUsers;
    private userSockets;
    private databaseService;
    constructor();
    static getInstance(): WebSocketService;
    initialize(server: HttpServer): void;
    private handleConnection;
    private handleJoinResourceRoom;
    private handlePresenceUpdate;
    private handleCursorUpdate;
    private handleSelectionUpdate;
    private checkForSelectionConflicts;
    private handleResourceAllocationUpdate;
    private handleDisconnect;
    broadcast(event: string, data: any): void;
    broadcastResourceUpdate(data: ResourceAllocationUpdate): void;
    sendNotification(notification: any, targetUserId?: string): void;
    getActiveUsers(): UserPresence[];
    getUserCount(): number;
    on(event: string, callback: (data: any) => void): void;
    off(event: string, callback?: (data: any) => void): void;
}
//# sourceMappingURL=websocket.service.d.ts.map