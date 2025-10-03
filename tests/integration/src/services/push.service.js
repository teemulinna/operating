"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const webpush = require("web-push");
class PushService {
    constructor() {
        this.initializeWebPush();
    }
    initializeWebPush() {
        const vapidKeys = {
            publicKey: process.env.VAPID_PUBLIC_KEY,
            privateKey: process.env.VAPID_PRIVATE_KEY
        };
        if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
            console.warn('VAPID keys not configured. Push notifications will be logged only.');
            return;
        }
        webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@company.com', vapidKeys.publicKey, vapidKeys.privateKey);
    }
    async sendNotification(notification) {
        try {
            if (!process.env.VAPID_PUBLIC_KEY) {
                console.log('Push notification (not sent - no VAPID keys):', {
                    title: notification.title,
                    message: notification.message
                });
                return true;
            }
            // Get user's push subscriptions
            const subscriptions = await this.getUserPushSubscriptions(notification.recipient_id);
            if (subscriptions.length === 0) {
                console.log(`No push subscriptions found for user ${notification.recipient_id}`);
                return true;
            }
            const pushPayload = this.formatPushPayload(notification);
            const promises = subscriptions.map(sub => this.sendToSubscription(sub.subscription, pushPayload));
            const results = await Promise.allSettled(promises);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            console.log(`Push notification sent to ${successCount}/${subscriptions.length} devices`);
            // Clean up invalid subscriptions
            await this.cleanupFailedSubscriptions(subscriptions, results);
            return successCount > 0;
        }
        catch (error) {
            console.error('Failed to send push notification:', error);
            return false;
        }
    }
    async sendToSubscription(subscription, payload) {
        const options = {
            TTL: 24 * 60 * 60, // 24 hours
            urgency: 'normal',
            headers: {
                'Topic': 'resource-notifications'
            }
        };
        await webpush.sendNotification(subscription, payload, options);
    }
    formatPushPayload(notification) {
        const priorityIcon = this.getPriorityIcon(notification.priority);
        const actions = this.formatActions(notification);
        const payload = {
            title: `${priorityIcon} ${notification.title}`,
            body: notification.message,
            icon: '/icons/notification-icon-192.png',
            badge: '/icons/notification-badge-72.png',
            image: this.getNotificationImage(notification.type),
            tag: `notification-${notification.id}`,
            renotify: notification.priority === 'critical',
            requireInteraction: notification.priority === 'critical',
            silent: notification.priority === 'low',
            timestamp: new Date(notification.created_at).getTime(),
            data: {
                notificationId: notification.id,
                type: notification.type,
                priority: notification.priority,
                context: notification.context,
                url: `/notifications/${notification.id}`
            },
            actions
        };
        return JSON.stringify(payload);
    }
    formatActions(notification) {
        const actions = [];
        // Always add view action
        actions.push({
            action: 'view',
            title: '👁️ View',
            icon: '/icons/view-icon.png'
        });
        // Add notification-specific actions
        const notificationActions = notification.metadata?.actions || [];
        for (const action of notificationActions.slice(0, 2)) { // Limit to 2 additional actions
            actions.push({
                action: action.action,
                title: this.truncateText(action.label, 20),
                icon: this.getActionIcon(action.action)
            });
        }
        // Always add dismiss action
        if (actions.length < 3) {
            actions.push({
                action: 'dismiss',
                title: '✖️ Dismiss',
                icon: '/icons/dismiss-icon.png'
            });
        }
        return actions;
    }
    getPriorityIcon(priority) {
        switch (priority) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return 'ℹ️';
        }
    }
    getNotificationImage(type) {
        const imageMap = {
            'allocation_conflict': '/images/conflict-alert.png',
            'over_allocation': '/images/over-allocation.png',
            'project_deadline': '/images/deadline-alert.png',
            'skill_gap': '/images/skill-gap.png'
        };
        return imageMap[type];
    }
    getActionIcon(action) {
        const iconMap = {
            'approve': '/icons/approve-icon.png',
            'reject': '/icons/reject-icon.png',
            'escalate': '/icons/escalate-icon.png',
            'view': '/icons/view-icon.png',
            'dismiss': '/icons/dismiss-icon.png'
        };
        return iconMap[action] || '/icons/default-action-icon.png';
    }
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
    }
    async getUserPushSubscriptions(userId) {
        // This would typically query your database for user's push subscriptions
        // For now, return an empty array
        return [];
    }
    async cleanupFailedSubscriptions(subscriptions, results) {
        const failedIndices = results
            .map((result, index) => result.status === 'rejected' ? index : -1)
            .filter(index => index !== -1);
        if (failedIndices.length > 0) {
            console.log(`Cleaning up ${failedIndices.length} failed push subscriptions`);
            // Remove failed subscriptions from database
            // This would typically update your database to mark subscriptions as inactive
            for (const index of failedIndices) {
                const failedSub = subscriptions[index];
                await this.markSubscriptionInactive(failedSub.userId, failedSub.subscription);
            }
        }
    }
    async markSubscriptionInactive(userId, subscription) {
        // Implementation would update database to mark subscription as inactive
        console.log(`Marking push subscription inactive for user ${userId}`);
    }
    // Methods for managing push subscriptions
    async subscribeToPush(userId, subscription, deviceInfo) {
        try {
            // Store subscription in database
            await this.storePushSubscription({
                userId,
                subscription,
                deviceInfo
            });
            console.log(`Push subscription stored for user ${userId}`);
            return true;
        }
        catch (error) {
            console.error('Failed to store push subscription:', error);
            return false;
        }
    }
    async unsubscribeFromPush(userId, endpoint) {
        try {
            // Remove subscription from database
            await this.removePushSubscription(userId, endpoint);
            console.log(`Push subscription removed for user ${userId}`);
            return true;
        }
        catch (error) {
            console.error('Failed to remove push subscription:', error);
            return false;
        }
    }
    async storePushSubscription(pushSub) {
        // This would typically store the subscription in your database
        console.log('Storing push subscription:', {
            userId: pushSub.userId,
            endpoint: pushSub.subscription.endpoint
        });
    }
    async removePushSubscription(userId, endpoint) {
        // This would typically remove the subscription from your database
        console.log('Removing push subscription:', { userId, endpoint });
    }
    async sendBulkNotifications(notifications) {
        let sent = 0;
        let failed = 0;
        const batchSize = 100; // Send in batches to avoid overwhelming the system
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const promises = batch.map(notif => this.sendNotification(notif));
            const results = await Promise.allSettled(promises);
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    sent++;
                }
                else {
                    failed++;
                }
            });
            // Small delay between batches
            if (i + batchSize < notifications.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        console.log(`Bulk push notifications complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }
    async testPushNotification(userId) {
        const testNotification = {
            id: 'test-' + Date.now(),
            type: 'system_alert',
            priority: 'low',
            title: 'Push Notification Test',
            message: 'This is a test notification to verify push functionality.',
            recipient_id: userId,
            context: {},
            metadata: {},
            created_at: new Date().toISOString()
        };
        return this.sendNotification(testNotification);
    }
    getVapidPublicKey() {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
    async getSubscriptionStats() {
        // This would typically query your database for subscription statistics
        return {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            subscriptionsByPlatform: {}
        };
    }
}
exports.PushService = PushService;
