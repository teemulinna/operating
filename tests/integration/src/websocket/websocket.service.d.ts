export const __esModule: boolean;
export class WebSocketService {
    static getInstance(): any;
    io: socket_io_1.Server<socket_io_1.DefaultEventsMap, socket_io_1.DefaultEventsMap, socket_io_1.DefaultEventsMap, any> | null;
    activeUsers: Map<any, any>;
    userSockets: Map<any, any>;
    databaseService: any;
    initialize(server: any): void;
    handleConnection(socket: any): void;
    handleJoinResourceRoom(socket: any, data: any): Promise<void>;
    handlePresenceUpdate(socket: any, data: any): void;
    handleCursorUpdate(socket: any, data: any): void;
    handleSelectionUpdate(socket: any, data: any): void;
    checkForSelectionConflicts(elementId: any, currentUser: any): void;
    handleResourceAllocationUpdate(socket: any, data: any): Promise<void>;
    handleDisconnect(socket: any): void;
    broadcast(event: any, data: any, room: any): void;
    broadcastResourceUpdate(data: any): void;
    sendNotification(notification: any, targetUserId: any): void;
    getActiveUsers(): any[];
    getUserCount(): number;
}
import socket_io_1 = require("socket.io");
//# sourceMappingURL=websocket.service.d.ts.map