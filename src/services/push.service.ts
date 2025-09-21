import * as webpush from 'web-push';

export interface PushNotification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  recipient_id: string;
  context: any;
  metadata: any;
  created_at: string;
}

export interface PushSubscription {
  userId: string;
  subscription: webpush.PushSubscription;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    deviceName: string;
  };
}

export class PushService {
  constructor() {
    this.initializeWebPush();
  }

  private initializeWebPush(): void {
    const vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };

    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn('VAPID keys not configured. Push notifications will be logged only.');
      return;
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@company.com',
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  }

  public async sendNotification(notification: PushNotification): Promise<boolean> {
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

    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  private async sendToSubscription(subscription: webpush.PushSubscription, payload: string): Promise<void> {
    const options = {
      TTL: 24 * 60 * 60, // 24 hours
      urgency: 'normal' as webpush.Urgency,
      headers: {
        'Topic': 'resource-notifications'
      }
    };

    await webpush.sendNotification(subscription, payload, options);
  }

  private formatPushPayload(notification: PushNotification): string {
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

  private formatActions(notification: PushNotification): any[] {
    const actions: any[] = [];
    
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

  private getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return 'ℹ️';
    }
  }

  private getNotificationImage(type: string): string | undefined {
    const imageMap: Record<string, string> = {
      'allocation_conflict': '/images/conflict-alert.png',
      'over_allocation': '/images/over-allocation.png',
      'project_deadline': '/images/deadline-alert.png',
      'skill_gap': '/images/skill-gap.png'
    };

    return imageMap[type];
  }

  private getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      'approve': '/icons/approve-icon.png',
      'reject': '/icons/reject-icon.png',
      'escalate': '/icons/escalate-icon.png',
      'view': '/icons/view-icon.png',
      'dismiss': '/icons/dismiss-icon.png'
    };

    return iconMap[action] || '/icons/default-action-icon.png';
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 1) + '…' : text;
  }

  private async getUserPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    // This would typically query your database for user's push subscriptions
    // For now, return an empty array
    return [];
  }

  private async cleanupFailedSubscriptions(
    subscriptions: PushSubscription[], 
    results: PromiseSettledResult<void>[]
  ): Promise<void> {
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

  private async markSubscriptionInactive(userId: string, subscription: webpush.PushSubscription): Promise<void> {
    // Implementation would update database to mark subscription as inactive
    console.log(`Marking push subscription inactive for user ${userId}`);
  }

  // Methods for managing push subscriptions

  public async subscribeToPush(
    userId: string, 
    subscription: webpush.PushSubscription,
    deviceInfo?: any
  ): Promise<boolean> {
    try {
      // Store subscription in database
      await this.storePushSubscription({
        userId,
        subscription,
        deviceInfo
      });
      
      console.log(`Push subscription stored for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to store push subscription:', error);
      return false;
    }
  }

  public async unsubscribeFromPush(userId: string, endpoint: string): Promise<boolean> {
    try {
      // Remove subscription from database
      await this.removePushSubscription(userId, endpoint);
      
      console.log(`Push subscription removed for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error('Failed to remove push subscription:', error);
      return false;
    }
  }

  private async storePushSubscription(pushSub: PushSubscription): Promise<void> {
    // This would typically store the subscription in your database
    console.log('Storing push subscription:', {
      userId: pushSub.userId,
      endpoint: pushSub.subscription.endpoint
    });
  }

  private async removePushSubscription(userId: string, endpoint: string): Promise<void> {
    // This would typically remove the subscription from your database
    console.log('Removing push subscription:', { userId, endpoint });
  }

  public async sendBulkNotifications(notifications: PushNotification[]): Promise<{sent: number, failed: number}> {
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
        } else {
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

  public async testPushNotification(userId: string): Promise<boolean> {
    const testNotification: PushNotification = {
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

  public getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  public async getSubscriptionStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    subscriptionsByPlatform: Record<string, number>;
  }> {
    // This would typically query your database for subscription statistics
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      subscriptionsByPlatform: {}
    };
  }
}