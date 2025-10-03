export const __esModule: boolean;
export class NotificationController {
    getUserNotifications: (req: any, res: any) => Promise<void>;
    getNotification: (req: any, res: any) => Promise<void>;
    createNotification: (req: any, res: any) => Promise<void>;
    markAsRead: (req: any, res: any) => Promise<void>;
    markAllAsRead: (req: any, res: any) => Promise<void>;
    handleAction: (req: any, res: any) => Promise<void>;
    getPreferences: (req: any, res: any) => Promise<void>;
    updatePreferences: (req: any, res: any) => Promise<void>;
    sendTestNotification: (req: any, res: any) => Promise<void>;
    getStats: (req: any, res: any) => Promise<void>;
    detectConflicts: (req: any, res: any) => Promise<void>;
    getActiveConflicts: (req: any, res: any) => Promise<void>;
    deleteNotification: (req: any, res: any) => Promise<void>;
    notificationService: any;
    databaseService: any;
}
//# sourceMappingURL=notification.controller.d.ts.map