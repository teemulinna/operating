#!/usr/bin/env node
export = NotificationConflictTest;
declare class NotificationConflictTest {
    db: Client | null;
    socket: SocketIOClient.Socket | null;
    testUserId: any;
    testManagerId: any;
    testProjectId: any;
    notifications: any[];
    conflicts: any[];
    setup(): Promise<void>;
    runMigration(): Promise<void>;
    createTestUsers(): Promise<void>;
    setupWebSocket(): Promise<any>;
    createOverAllocation(): Promise<boolean>;
    triggerConflictDetection(): Promise<boolean>;
    checkNotifications(): Promise<{
        database: any[];
        websocket: any[];
    }>;
    testNotificationPreferences(): Promise<boolean>;
    cleanup(): Promise<void>;
    wait(ms: any): Promise<any>;
    run(): Promise<void>;
}
import { Client } from "pg";
//# sourceMappingURL=notification-conflict-test.d.ts.map