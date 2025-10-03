export const __esModule: boolean;
export class PushService {
    initializeWebPush(): void;
    sendNotification(notification: any): Promise<boolean>;
    sendToSubscription(subscription: any, payload: any): Promise<void>;
    formatPushPayload(notification: any): string;
    formatActions(notification: any): {
        action: any;
        title: any;
        icon: any;
    }[];
    getPriorityIcon(priority: any): "🔴" | "🟠" | "🟡" | "🟢" | "ℹ️";
    getNotificationImage(type: any): any;
    getActionIcon(action: any): any;
    truncateText(text: any, maxLength: any): any;
    getUserPushSubscriptions(userId: any): Promise<never[]>;
    cleanupFailedSubscriptions(subscriptions: any, results: any): Promise<void>;
    markSubscriptionInactive(userId: any, subscription: any): Promise<void>;
    subscribeToPush(userId: any, subscription: any, deviceInfo: any): Promise<boolean>;
    unsubscribeFromPush(userId: any, endpoint: any): Promise<boolean>;
    storePushSubscription(pushSub: any): Promise<void>;
    removePushSubscription(userId: any, endpoint: any): Promise<void>;
    sendBulkNotifications(notifications: any): Promise<{
        sent: number;
        failed: number;
    }>;
    testPushNotification(userId: any): Promise<boolean>;
    getVapidPublicKey(): string | null;
    getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        subscriptionsByPlatform: {};
    }>;
}
//# sourceMappingURL=push.service.d.ts.map