"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const notification_service_1 = require("../services/notification.service");
const database_service_1 = require("../database/database.service");
class NotificationController {
    constructor() {
        /**
         * GET /api/notifications
         * Get notifications for the current user
         */
        this.getUserNotifications = async (req, res) => {
            try {
                const userId = req.user?.id; // Assuming user is attached to request by auth middleware
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const { status, limit = 50, offset = 0, unreadOnly = false, type, priority, search } = req.query;
                let whereClause = 'WHERE n.recipient_id = $1 AND n.deleted_at IS NULL';
                const params = [userId];
                let paramCount = 1;
                if (status) {
                    whereClause += ` AND n.status = $${++paramCount}`;
                    params.push(status);
                }
                if (type) {
                    whereClause += ` AND n.type = $${++paramCount}`;
                    params.push(type);
                }
                if (priority) {
                    whereClause += ` AND n.priority = $${++paramCount}`;
                    params.push(priority);
                }
                if (unreadOnly === 'true') {
                    whereClause += ` AND n.read_at IS NULL`;
                }
                if (search) {
                    whereClause += ` AND (n.title ILIKE $${++paramCount} OR n.message ILIKE $${++paramCount})`;
                    params.push(`%${search}%`, `%${search}%`);
                    paramCount++;
                }
                const query = `
        SELECT 
          n.*,
          s.first_name || ' ' || s.last_name as sender_name,
          s.email as sender_email
        FROM notifications n
        LEFT JOIN employees s ON n.sender_id = s.id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
                params.push(parseInt(limit), parseInt(offset));
                const countQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread_count
        FROM notifications n
        ${whereClause.replace(/\$\d+/g, match => {
                    const num = parseInt(match.substring(1));
                    return num <= params.length - 2 ? match : '';
                })}
      `;
                const [notifications, counts] = await Promise.all([
                    this.databaseService.query(query, params),
                    this.databaseService.query(countQuery, params.slice(0, -2))
                ]);
                res.json({
                    success: true,
                    data: {
                        notifications: notifications.rows,
                        pagination: {
                            total: parseInt(counts.rows[0]?.total || '0'),
                            limit: parseInt(limit),
                            offset: parseInt(offset),
                            unreadCount: parseInt(counts.rows[0]?.unread_count || '0')
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error fetching notifications:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch notifications'
                });
            }
        };
        /**
         * GET /api/notifications/:id
         * Get a specific notification
         */
        this.getNotification = async (req, res) => {
            try {
                const userId = req.user?.id;
                const notificationId = req.params.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const result = await this.databaseService.query(`
        SELECT 
          n.*,
          s.first_name || ' ' || s.last_name as sender_name,
          s.email as sender_email
        FROM notifications n
        LEFT JOIN employees s ON n.sender_id = s.id
        WHERE n.id = $1 AND n.recipient_id = $2 AND n.deleted_at IS NULL
      `, [notificationId, userId]);
                if (result.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        error: 'Notification not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    data: result.rows[0]
                });
            }
            catch (error) {
                console.error('Error fetching notification:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch notification'
                });
            }
        };
        /**
         * POST /api/notifications
         * Send a notification (admin/system use)
         */
        this.createNotification = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const { type, priority = 'medium', title, message, recipientId, context = {}, metadata = {}, actions = [], expiresAt, scheduledAt } = req.body;
                // Validate required fields
                if (!type || !title || !message || !recipientId) {
                    res.status(400).json({
                        success: false,
                        error: 'Missing required fields: type, title, message, recipientId'
                    });
                    return;
                }
                const notificationData = {
                    type,
                    priority,
                    title,
                    message,
                    recipientId,
                    senderId: userId
                };
                if (context !== undefined)
                    notificationData.context = context;
                if (metadata !== undefined)
                    notificationData.metadata = metadata;
                if (actions !== undefined)
                    notificationData.actions = actions;
                if (expiresAt)
                    notificationData.expiresAt = new Date(expiresAt);
                if (scheduledAt)
                    notificationData.scheduledAt = new Date(scheduledAt);
                const notificationId = await this.notificationService.sendNotification(notificationData);
                res.status(201).json({
                    success: true,
                    data: { notificationId }
                });
            }
            catch (error) {
                console.error('Error creating notification:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create notification'
                });
            }
        };
        /**
         * PUT /api/notifications/:id/read
         * Mark notification as read
         */
        this.markAsRead = async (req, res) => {
            try {
                const userId = req.user?.id;
                const notificationId = req.params.id;
                if (!userId || typeof userId !== 'string') {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                if (!notificationId) {
                    res.status(400).json({ error: 'Notification ID is required' });
                    return;
                }
                // Now TypeScript knows userId is definitely a string
                await this.notificationService.markAsRead(notificationId, userId);
                res.json({
                    success: true,
                    message: 'Notification marked as read'
                });
            }
            catch (error) {
                console.error('Error marking notification as read:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to mark notification as read'
                });
            }
        };
        /**
         * PUT /api/notifications/read-all
         * Mark all notifications as read
         */
        this.markAllAsRead = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const updatedCount = await this.notificationService.markAllAsRead(userId);
                res.json({
                    success: true,
                    data: { updatedCount },
                    message: `${updatedCount} notifications marked as read`
                });
            }
            catch (error) {
                console.error('Error marking all notifications as read:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to mark notifications as read'
                });
            }
        };
        /**
         * POST /api/notifications/:id/actions/:action
         * Handle notification actions
         */
        this.handleAction = async (req, res) => {
            try {
                const userId = req.user?.id;
                const notificationId = req.params.id;
                const action = req.params.action;
                const data = req.body;
                if (!userId || typeof userId !== 'string') {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                if (!notificationId || !action) {
                    res.status(400).json({ error: 'Notification ID and action are required' });
                    return;
                }
                // Now TypeScript knows userId is definitely a string
                await this.notificationService.handleNotificationAction(notificationId, userId, action, data);
                res.json({
                    success: true,
                    message: `Action '${action}' processed successfully`
                });
            }
            catch (error) {
                console.error('Error handling notification action:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process action'
                });
            }
        };
        /**
         * GET /api/notifications/preferences
         * Get user notification preferences
         */
        this.getPreferences = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const preferences = await this.notificationService.getNotificationPreferences(userId);
                res.json({
                    success: true,
                    data: preferences
                });
            }
            catch (error) {
                console.error('Error fetching notification preferences:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch preferences'
                });
            }
        };
        /**
         * PUT /api/notifications/preferences
         * Update user notification preferences
         */
        this.updatePreferences = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const preferences = await this.notificationService.updateNotificationPreferences(userId, req.body);
                res.json({
                    success: true,
                    data: preferences,
                    message: 'Preferences updated successfully'
                });
            }
            catch (error) {
                console.error('Error updating notification preferences:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to update preferences'
                });
            }
        };
        /**
         * POST /api/notifications/test
         * Send a test notification
         */
        this.sendTestNotification = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const notificationId = await this.notificationService.sendFromTemplate('allocation_conflict', userId, {
                    employeeName: 'Test Employee',
                    totalAllocation: 120
                }, {
                    priority: 'medium',
                    context: { isTest: true }
                });
                res.json({
                    success: true,
                    data: { notificationId },
                    message: 'Test notification sent successfully'
                });
            }
            catch (error) {
                console.error('Error sending test notification:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to send test notification'
                });
            }
        };
        /**
         * GET /api/notifications/stats
         * Get notification statistics
         */
        this.getStats = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const result = await this.databaseService.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
          COUNT(CASE WHEN priority = 'critical' THEN 1 END) as critical,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d
        FROM notifications
        WHERE recipient_id = $1 AND deleted_at IS NULL
      `, [userId]);
                const typeStats = await this.databaseService.query(`
        SELECT type, COUNT(*) as count
        FROM notifications
        WHERE recipient_id = $1 AND deleted_at IS NULL
        GROUP BY type
        ORDER BY count DESC
      `, [userId]);
                res.json({
                    success: true,
                    data: {
                        overview: result.rows[0],
                        byType: typeStats.rows
                    }
                });
            }
            catch (error) {
                console.error('Error fetching notification stats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch statistics'
                });
            }
        };
        /**
         * POST /api/notifications/conflicts/detect
         * Trigger manual conflict detection
         */
        this.detectConflicts = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const conflicts = await this.notificationService.detectAllocationConflicts();
                res.json({
                    success: true,
                    data: {
                        conflicts,
                        count: conflicts.length
                    },
                    message: `Detected ${conflicts.length} conflicts`
                });
            }
            catch (error) {
                console.error('Error detecting conflicts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to detect conflicts'
                });
            }
        };
        /**
         * GET /api/notifications/conflicts
         * Get active conflicts
         */
        this.getActiveConflicts = async (req, res) => {
            try {
                const userId = req.user?.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const result = await this.databaseService.query(`
        SELECT 
          dc.*,
          r.name as rule_name,
          r.rule_type,
          r.priority as rule_priority
        FROM detected_conflicts dc
        JOIN conflict_detection_rules r ON dc.rule_id = r.id
        WHERE dc.status = 'active' 
          AND dc.deleted_at IS NULL
          AND $1 = ANY(dc.affected_employees)
        ORDER BY dc.severity DESC, dc.created_at DESC
      `, [userId]);
                res.json({
                    success: true,
                    data: result.rows
                });
            }
            catch (error) {
                console.error('Error fetching active conflicts:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch conflicts'
                });
            }
        };
        /**
         * DELETE /api/notifications/:id
         * Delete a notification
         */
        this.deleteNotification = async (req, res) => {
            try {
                const userId = req.user?.id;
                const notificationId = req.params.id;
                if (!userId) {
                    res.status(401).json({ error: 'Authentication required' });
                    return;
                }
                const result = await this.databaseService.query(`
        UPDATE notifications 
        SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
        WHERE id = $2 AND recipient_id = $1 AND deleted_at IS NULL
      `, [userId, notificationId]);
                if (result.rowCount === 0) {
                    res.status(404).json({
                        success: false,
                        error: 'Notification not found'
                    });
                    return;
                }
                res.json({
                    success: true,
                    message: 'Notification deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting notification:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete notification'
                });
            }
        };
        this.notificationService = notification_service_1.NotificationService.getInstance();
        this.databaseService = database_service_1.DatabaseService.getInstance();
    }
}
exports.NotificationController = NotificationController;
