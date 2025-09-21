import { Router, Request, Response } from 'express';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}
import { NotificationController } from '../controllers/notification.controller';
import { SlackService } from '../services/slack.service';
import { PushService } from '../services/push.service';

const router = Router();
const notificationController = new NotificationController();
const slackService = new SlackService();
const pushService = new PushService();

// Notification CRUD routes
router.get('/', notificationController.getUserNotifications);
router.get('/stats', notificationController.getStats);
router.get('/:id', notificationController.getNotification);
router.post('/', notificationController.createNotification);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.post('/:id/actions/:action', notificationController.handleAction);
router.delete('/:id', notificationController.deleteNotification);

// Notification preferences
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

// Conflict detection
router.post('/conflicts/detect', notificationController.detectConflicts);
router.get('/conflicts', notificationController.getActiveConflicts);

// Testing
router.post('/test', notificationController.sendTestNotification);

// Push notification subscription management
router.post('/push/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { subscription, deviceInfo } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid push subscription data' 
      });
    }

    const success = await pushService.subscribeToPush(userId, subscription, deviceInfo);
    
    return res.json({
      success,
      message: success ? 'Push subscription created' : 'Failed to create subscription'
    });

  } catch (error) {
    console.error('Error creating push subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create push subscription'
    });
  }
});

router.post('/push/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ 
        success: false, 
        error: 'Endpoint is required' 
      });
    }

    const success = await pushService.unsubscribeFromPush(userId, endpoint);
    
    return res.json({
      success,
      message: success ? 'Push subscription removed' : 'Failed to remove subscription'
    });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove push subscription'
    });
  }
});

router.get('/push/vapid-key', (req: Request, res: Response) => {
  const vapidPublicKey = pushService.getVapidPublicKey();
  
  if (!vapidPublicKey) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured'
    });
  }

  return res.json({
    success: true,
    data: { vapidPublicKey }
  });
});

router.post('/push/test', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const success = await pushService.testPushNotification(userId);
    
    return res.json({
      success,
      message: success ? 'Test push notification sent' : 'Failed to send test notification'
    });

  } catch (error) {
    console.error('Error sending test push notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test push notification'
    });
  }
});

// Slack integration webhooks
router.post('/slack/actions', async (req: Request, res: Response) => {
  try {
    const payload = JSON.parse(req.body.payload);
    
    if (payload.type === 'interactive_message') {
      const response = await slackService.handleSlackAction(payload);
      return res.json(response);
    } else {
      return res.status(400).json({ error: 'Unsupported payload type' });
    }

  } catch (error) {
    console.error('Error handling Slack action:', error);
    return res.status(500).json({ error: 'Failed to process Slack action' });
  }
});

router.post('/slack/events', async (req: Request, res: Response) => {
  try {
    const { type, challenge } = req.body;
    
    // Handle Slack URL verification
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Handle other Slack events
    return res.json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling Slack event:', error);
    return res.status(500).json({ error: 'Failed to process Slack event' });
  }
});

// Batch operations
router.post('/batch/mark-read', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid notification IDs' 
      });
    }

    // Mark multiple notifications as read in batch
    const promises = notificationIds.map(id => 
      notificationController.notificationService.markAsRead(id, userId)
    );
    
    await Promise.all(promises);
    
    return res.json({
      success: true,
      data: { updatedCount: notificationIds.length },
      message: `${notificationIds.length} notifications marked as read`
    });

  } catch (error) {
    console.error('Error batch marking notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notifications as read'
    });
  }
});

router.delete('/batch', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { notificationIds } = req.body;
    
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid notification IDs' 
      });
    }

    // Soft delete multiple notifications
    const query = `
      UPDATE notifications 
      SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
      WHERE id = ANY($2::uuid[]) AND recipient_id = $1 AND deleted_at IS NULL
    `;
    
    const result = await notificationController.databaseService.query(query, [userId, notificationIds]);
    
    return res.json({
      success: true,
      data: { deletedCount: result.rowCount || 0 },
      message: `${result.rowCount || 0} notifications deleted`
    });

  } catch (error) {
    console.error('Error batch deleting notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete notifications'
    });
  }
});

// Analytics endpoints
router.get('/analytics/delivery', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { days = 7 } = req.query;

    const result = await notificationController.databaseService.query(`
      SELECT 
        DATE(ndl.attempted_at) as date,
        ndl.delivery_method,
        ndl.status,
        COUNT(*) as count
      FROM notification_delivery_log ndl
      JOIN notifications n ON ndl.notification_id = n.id
      WHERE n.recipient_id = $1 
        AND ndl.attempted_at >= NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY DATE(ndl.attempted_at), ndl.delivery_method, ndl.status
      ORDER BY date DESC
    `, [userId]);

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching delivery analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery analytics'
    });
  }
});

router.get('/analytics/response-time', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await notificationController.databaseService.query(`
      SELECT 
        type,
        priority,
        AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_response_time_seconds,
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count
      FROM notifications
      WHERE recipient_id = $1 
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY type, priority
      ORDER BY avg_response_time_seconds
    `, [userId]);

    return res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        avg_response_time_minutes: row.avg_response_time_seconds ?
          Math.round(row.avg_response_time_seconds / 60 * 100) / 100 : null,
        read_rate: row.total_notifications > 0 ?
          Math.round(row.read_count / row.total_notifications * 100) : 0
      }))
    });

  } catch (error) {
    console.error('Error fetching response time analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch response time analytics'
    });
  }
});

// Export for service status checks
router.get('/health', async (req: Request, res: Response) => {
  try {
    const emailHealthy = await notificationController.emailService?.testConnection() || false;
    const slackHealthy = await slackService.testConnection();
    const teamsHealthy = await notificationController.teamsService?.testConnection() || false;
    const pushStats = await pushService.getSubscriptionStats();

    return res.json({
      success: true,
      data: {
        services: {
          email: emailHealthy,
          slack: slackHealthy,
          teams: teamsHealthy,
          push: {
            configured: !!pushService.getVapidPublicKey(),
            ...pushStats
          }
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error checking notification health:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check service health'
    });
  }
});

export default router;