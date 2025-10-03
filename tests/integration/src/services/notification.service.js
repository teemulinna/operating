"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const database_service_1 = require("../database/database.service");
const websocket_service_1 = require("../websocket/websocket.service");
const email_service_1 = require("./email.service");
const slack_service_1 = require("./slack.service");
const teams_service_1 = require("./teams.service");
const push_service_1 = require("./push.service");
class NotificationService {
    constructor(options = {}) {
        this.conflictCheckInterval = null;
        this.escalationProcessorInterval = null;
        this.isDestroyed = false;
        this.databaseService = database_service_1.DatabaseService.getInstance();
        this.webSocketService = websocket_service_1.WebSocketService.getInstance();
        this.emailService = new email_service_1.EmailService();
        this.slackService = new slack_service_1.SlackService();
        this.teamsService = new teams_service_1.TeamsService();
        this.pushService = new push_service_1.PushService();
        // Determine if timers should be enabled
        // Disable in test environments or when explicitly disabled
        this.timersEnabled = options.enableTimers ?? (process.env.NODE_ENV !== 'test' &&
            process.env.DISABLE_NOTIFICATION_TIMERS !== 'true');
        if (this.timersEnabled) {
            this.startConflictDetection();
            this.startEscalationProcessor();
        }
    }
    static getInstance(options = {}) {
        if (!NotificationService.instance || NotificationService.instance.isDestroyed) {
            NotificationService.instance = new NotificationService(options);
        }
        return NotificationService.instance;
    }
    static resetInstance() {
        if (NotificationService.instance) {
            NotificationService.instance.destroy();
            NotificationService.instance = undefined;
        }
    }
    /**
     * Send a notification to a user
     */
    async sendNotification(payload) {
        try {
            // Get user preferences
            const preferences = await this.getUserPreferences(payload.recipientId);
            // Determine delivery methods based on preferences
            const deliveryMethods = this.getDeliveryMethods(payload.type, preferences);
            // Check quiet hours
            if (this.isQuietHours(preferences) && payload.priority !== 'critical') {
                payload.scheduledAt = this.getNextActiveHours(preferences);
            }
            // Create notification record
            const notificationId = await this.createNotification({
                ...payload,
                deliveryMethods
            });
            // Handle immediate delivery or scheduling
            if (!payload.scheduledAt || payload.scheduledAt <= new Date()) {
                await this.deliverNotification(notificationId, deliveryMethods);
            }
            return notificationId;
        }
        catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }
    /**
     * Send notification using template
     */
    async sendFromTemplate(templateName, recipientId, variables, options = {}) {
        const template = await this.getTemplate(templateName);
        if (!template) {
            throw new Error(`Template not found: ${templateName}`);
        }
        const title = this.renderTemplate(template.titleTemplate, variables);
        const message = this.renderTemplate(template.messageTemplate, variables);
        return this.sendNotification({
            type: template.type,
            priority: options.priority || 'medium',
            title,
            message,
            recipientId,
            senderId: options.senderId,
            context: options.context || {},
            metadata: { ...variables, templateId: template.id },
            actions: options.actions,
            expiresAt: options.expiresAt,
            scheduledAt: options.scheduledAt
        });
    }
    /**
     * Detect and handle allocation conflicts
     */
    async detectAllocationConflicts() {
        const conflicts = [];
        try {
            // Get active conflict detection rules
            const rules = await this.getActiveConflictRules();
            for (const rule of rules) {
                switch (rule.ruleType) {
                    case 'over_allocation':
                        const overAllocations = await this.detectOverAllocations(rule);
                        conflicts.push(...overAllocations);
                        break;
                    case 'skill_conflict':
                        const skillConflicts = await this.detectSkillConflicts(rule);
                        conflicts.push(...skillConflicts);
                        break;
                    case 'availability_conflict':
                        const availabilityConflicts = await this.detectAvailabilityConflicts(rule);
                        conflicts.push(...availabilityConflicts);
                        break;
                }
            }
            // Store detected conflicts and create notifications
            for (const conflict of conflicts) {
                await this.handleDetectedConflict(conflict);
            }
            return conflicts;
        }
        catch (error) {
            console.error('Error detecting conflicts:', error);
            return [];
        }
    }
    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId, options = {}) {
        const { status, limit = 50, offset = 0, unreadOnly = false } = options;
        let whereClause = 'WHERE n.recipient_id = $1 AND n.deleted_at IS NULL';
        const params = [userId];
        let paramCount = 1;
        if (status) {
            whereClause += ` AND n.status = $${++paramCount}`;
            params.push(status);
        }
        if (unreadOnly) {
            whereClause += ` AND n.read_at IS NULL`;
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
        params.push(limit, offset);
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
        return {
            notifications: notifications.rows,
            total: parseInt(counts.rows[0]?.total || '0'),
            unreadCount: parseInt(counts.rows[0]?.unread_count || '0')
        };
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        await this.databaseService.query(`
      UPDATE notifications 
      SET read_at = NOW(), status = 'read', updated_at = NOW()
      WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL
    `, [notificationId, userId]);
        // Emit real-time update
        this.webSocketService.sendNotification({
            type: 'notification_read',
            notificationId,
            timestamp: new Date().toISOString()
        }, userId);
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        const result = await this.databaseService.query(`
      UPDATE notifications 
      SET read_at = NOW(), status = 'read', updated_at = NOW()
      WHERE recipient_id = $1 AND read_at IS NULL AND deleted_at IS NULL
    `, [userId]);
        const updatedCount = result.rowCount || 0;
        // Emit real-time update
        this.webSocketService.sendNotification({
            type: 'notifications_read_all',
            count: updatedCount,
            timestamp: new Date().toISOString()
        }, userId);
        return updatedCount;
    }
    /**
     * Handle notification actions (approve, dismiss, etc.)
     */
    async handleNotificationAction(notificationId, userId, action, data) {
        // Update notification with action taken
        await this.databaseService.query(`
      UPDATE notifications 
      SET 
        action_taken = $1,
        action_taken_at = NOW(),
        status = CASE WHEN read_at IS NULL THEN 'read' ELSE status END,
        read_at = COALESCE(read_at, NOW()),
        updated_at = NOW()
      WHERE id = $2 AND recipient_id = $3
    `, [JSON.stringify({ action, data }), notificationId, userId]);
        // Handle specific actions
        switch (action) {
            case 'approve':
                await this.handleApprovalAction(notificationId, userId, data);
                break;
            case 'dismiss':
                await this.handleDismissAction(notificationId, userId);
                break;
            case 'escalate':
                await this.handleEscalationAction(notificationId, userId);
                break;
        }
        // Emit real-time update
        this.webSocketService.sendNotification({
            type: 'notification_action',
            notificationId,
            action,
            data,
            timestamp: new Date().toISOString()
        }, userId);
    }
    /**
     * Get and update notification preferences
     */
    async getNotificationPreferences(userId) {
        const result = await this.databaseService.query(`
      SELECT * FROM notification_preferences WHERE user_id = $1 AND deleted_at IS NULL
    `, [userId]);
        if (result.rows.length === 0) {
            return this.createDefaultPreferences(userId);
        }
        return this.formatPreferences(result.rows[0]);
    }
    async updateNotificationPreferences(userId, preferences) {
        const current = await this.getNotificationPreferences(userId);
        const updated = { ...current, ...preferences };
        await this.databaseService.query(`
      INSERT INTO notification_preferences (
        user_id, allocation_conflict_methods, over_allocation_methods,
        under_allocation_methods, project_deadline_methods, resource_request_methods,
        skill_gap_methods, capacity_alert_methods, user_activity_methods,
        system_alert_methods, approval_required_methods, quiet_hours_start,
        quiet_hours_end, batch_digest, batch_frequency_minutes, timezone,
        slack_channel, teams_webhook_url, email_address, push_enabled,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        allocation_conflict_methods = $2,
        over_allocation_methods = $3,
        under_allocation_methods = $4,
        project_deadline_methods = $5,
        resource_request_methods = $6,
        skill_gap_methods = $7,
        capacity_alert_methods = $8,
        user_activity_methods = $9,
        system_alert_methods = $10,
        approval_required_methods = $11,
        quiet_hours_start = $12,
        quiet_hours_end = $13,
        batch_digest = $14,
        batch_frequency_minutes = $15,
        timezone = $16,
        slack_channel = $17,
        teams_webhook_url = $18,
        email_address = $19,
        push_enabled = $20,
        updated_at = NOW()
    `, [
            userId,
            updated.allocationConflictMethods,
            updated.overAllocationMethods,
            updated.underAllocationMethods,
            updated.projectDeadlineMethods,
            updated.resourceRequestMethods,
            updated.skillGapMethods,
            updated.capacityAlertMethods,
            updated.userActivityMethods,
            updated.systemAlertMethods,
            updated.approvalRequiredMethods,
            updated.quietHoursStart,
            updated.quietHoursEnd,
            updated.batchDigest,
            updated.batchFrequencyMinutes,
            updated.timezone,
            updated.slackChannel,
            updated.teamsWebhookUrl,
            updated.emailAddress,
            updated.pushEnabled
        ]);
        return updated;
    }
    // Private helper methods
    async createNotification(payload) {
        const result = await this.databaseService.query(`
      INSERT INTO notifications (
        type, priority, title, message, recipient_id, sender_id,
        context, metadata, delivery_methods, scheduled_at, expires_at,
        actions, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id
    `, [
            payload.type,
            payload.priority,
            payload.title,
            payload.message,
            payload.recipientId,
            payload.senderId || null,
            JSON.stringify(payload.context || {}),
            JSON.stringify(payload.metadata || {}),
            payload.deliveryMethods,
            payload.scheduledAt || new Date(),
            payload.expiresAt || null,
            JSON.stringify(payload.actions || [])
        ]);
        return result.rows[0].id;
    }
    async deliverNotification(notificationId, methods) {
        const notification = await this.getNotificationById(notificationId);
        if (!notification)
            return;
        // Always deliver in-app first
        if (methods.includes('in_app')) {
            await this.deliverInApp(notification);
        }
        // Handle other delivery methods
        const deliveryPromises = methods
            .filter(method => method !== 'in_app')
            .map(method => this.deliverViaMethod(notification, method));
        await Promise.all(deliveryPromises);
        // Update status to sent
        await this.databaseService.query(`
      UPDATE notifications 
      SET status = 'sent', sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [notificationId]);
    }
    async deliverInApp(notification) {
        // Send via WebSocket for real-time delivery
        this.webSocketService.sendNotification({
            id: notification.id,
            type: notification.type,
            priority: notification.priority,
            title: notification.title,
            message: notification.message,
            context: notification.context,
            metadata: notification.metadata,
            actions: notification.actions,
            timestamp: notification.created_at,
            isRead: false
        }, notification.recipient_id);
        // Log delivery
        await this.logDelivery(notification.id, 'in_app', 'delivered');
    }
    async deliverViaMethod(notification, method) {
        try {
            switch (method) {
                case 'email':
                    await this.emailService.sendNotification(notification);
                    break;
                case 'push':
                    await this.pushService.sendNotification(notification);
                    break;
                case 'slack':
                    await this.slackService.sendNotification(notification);
                    break;
                case 'teams':
                    await this.teamsService.sendNotification(notification);
                    break;
            }
            await this.logDelivery(notification.id, method, 'delivered');
        }
        catch (error) {
            console.error(`Failed to deliver notification via ${method}:`, error);
            await this.logDelivery(notification.id, method, 'failed', error.message);
        }
    }
    async logDelivery(notificationId, method, status, errorMessage) {
        await this.databaseService.query(`
      INSERT INTO notification_delivery_log (
        notification_id, delivery_method, status, error_message, attempted_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [notificationId, method, status, errorMessage || null]);
    }
    getDeliveryMethods(type, preferences) {
        const methodKey = `${type.replace(/_/g, '')}Methods`;
        return preferences[methodKey] || ['in_app'];
    }
    async getUserPreferences(userId) {
        return this.getNotificationPreferences(userId);
    }
    isQuietHours(preferences) {
        if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
            return false;
        }
        const now = new Date();
        const currentTime = now.toTimeString().substring(0, 5);
        return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
    }
    getNextActiveHours(preferences) {
        if (!preferences.quietHoursEnd) {
            return new Date();
        }
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [hours, minutes] = preferences.quietHoursEnd.split(':').map(Number);
        tomorrow.setHours(hours, minutes, 0, 0);
        return tomorrow;
    }
    renderTemplate(template, variables) {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key]?.toString() || match;
        });
    }
    async getTemplate(name) {
        const result = await this.databaseService.query(`
      SELECT * FROM notification_templates 
      WHERE name = $1 AND is_active = true AND deleted_at IS NULL
    `, [name]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            titleTemplate: row.title_template,
            messageTemplate: row.message_template,
            htmlTemplate: row.html_template,
            variables: row.variables
        };
    }
    async getNotificationById(id) {
        const result = await this.databaseService.query(`
      SELECT * FROM notifications WHERE id = $1
    `, [id]);
        return result.rows[0] || null;
    }
    async createDefaultPreferences(userId) {
        const defaults = {
            userId,
            allocationConflictMethods: ['in_app', 'email'],
            overAllocationMethods: ['in_app', 'email'],
            underAllocationMethods: ['in_app'],
            projectDeadlineMethods: ['in_app', 'email'],
            resourceRequestMethods: ['in_app'],
            skillGapMethods: ['in_app'],
            capacityAlertMethods: ['in_app', 'email'],
            userActivityMethods: ['in_app'],
            systemAlertMethods: ['in_app', 'email'],
            approvalRequiredMethods: ['in_app', 'email'],
            batchDigest: false,
            batchFrequencyMinutes: 60,
            timezone: 'UTC',
            pushEnabled: true
        };
        await this.updateNotificationPreferences(userId, defaults);
        return defaults;
    }
    formatPreferences(row) {
        return {
            userId: row.user_id,
            allocationConflictMethods: row.allocation_conflict_methods || ['in_app'],
            overAllocationMethods: row.over_allocation_methods || ['in_app'],
            underAllocationMethods: row.under_allocation_methods || ['in_app'],
            projectDeadlineMethods: row.project_deadline_methods || ['in_app'],
            resourceRequestMethods: row.resource_request_methods || ['in_app'],
            skillGapMethods: row.skill_gap_methods || ['in_app'],
            capacityAlertMethods: row.capacity_alert_methods || ['in_app'],
            userActivityMethods: row.user_activity_methods || ['in_app'],
            systemAlertMethods: row.system_alert_methods || ['in_app'],
            approvalRequiredMethods: row.approval_required_methods || ['in_app'],
            quietHoursStart: row.quiet_hours_start,
            quietHoursEnd: row.quiet_hours_end,
            batchDigest: row.batch_digest || false,
            batchFrequencyMinutes: row.batch_frequency_minutes || 60,
            timezone: row.timezone || 'UTC',
            slackChannel: row.slack_channel,
            teamsWebhookUrl: row.teams_webhook_url,
            emailAddress: row.email_address,
            pushEnabled: row.push_enabled || true
        };
    }
    // Conflict detection methods
    async getActiveConflictRules() {
        const result = await this.databaseService.query(`
      SELECT * FROM conflict_detection_rules 
      WHERE is_active = true AND deleted_at IS NULL
    `);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            ruleType: row.rule_type,
            thresholdValue: row.threshold_value,
            conditions: row.conditions,
            notificationTemplateId: row.notification_template_id,
            priority: row.priority,
            autoEscalate: row.auto_escalate,
            isActive: row.is_active
        }));
    }
    async detectOverAllocations(rule) {
        const conflicts = [];
        // Query for employees with over-allocation
        const result = await this.databaseService.query(`
      WITH employee_allocations AS (
        SELECT 
          e.id as employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          COALESCE(SUM(ra.planned_allocation_percentage / 100.0), 0) as total_allocation
        FROM employees e
        LEFT JOIN resource_assignments ra ON e.id = ra.employee_id 
          AND ra.status IN ('planned', 'active')
          AND ra.start_date <= NOW()
          AND (ra.end_date IS NULL OR ra.end_date >= NOW())
        WHERE e.is_active = true
        GROUP BY e.id, e.first_name, e.last_name
        HAVING COALESCE(SUM(ra.planned_allocation_percentage / 100.0), 0) > $1
      )
      SELECT * FROM employee_allocations
    `, [rule.thresholdValue || 1.0]);
        for (const row of result.rows) {
            conflicts.push({
                id: '', // Will be generated when stored
                ruleId: rule.id,
                conflictType: 'over_allocation',
                severity: rule.priority,
                title: `Over-allocation detected for ${row.employee_name}`,
                description: `Employee ${row.employee_name} is allocated at ${Math.round(row.total_allocation * 100)}%, exceeding the ${Math.round((rule.thresholdValue || 1.0) * 100)}% threshold`,
                affectedEmployees: [row.employee_id],
                affectedProjects: [],
                affectedAllocations: [],
                conflictData: {
                    employeeId: row.employee_id,
                    employeeName: row.employee_name,
                    currentAllocation: row.total_allocation,
                    threshold: rule.thresholdValue
                },
                currentValue: row.total_allocation,
                thresholdValue: rule.thresholdValue,
                status: 'active'
            });
        }
        return conflicts;
    }
    async detectSkillConflicts(rule) {
        // Implementation for skill conflict detection
        // This would check for projects requiring skills that aren't available
        return [];
    }
    async detectAvailabilityConflicts(rule) {
        // Implementation for availability conflict detection
        return [];
    }
    async handleDetectedConflict(conflict) {
        // Store the conflict
        const conflictResult = await this.databaseService.query(`
      INSERT INTO detected_conflicts (
        rule_id, conflict_type, severity, title, description,
        affected_employees, affected_projects, affected_allocations,
        conflict_data, current_value, threshold_value, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
            conflict.ruleId,
            conflict.conflictType,
            conflict.severity,
            conflict.title,
            conflict.description,
            conflict.affectedEmployees,
            conflict.affectedProjects,
            conflict.affectedAllocations,
            JSON.stringify(conflict.conflictData),
            conflict.currentValue,
            conflict.thresholdValue,
            conflict.status
        ]);
        const conflictId = conflictResult.rows[0].id;
        // Create notifications for affected employees' managers
        for (const employeeId of conflict.affectedEmployees) {
            const manager = await this.getEmployeeManager(employeeId);
            if (manager) {
                await this.sendFromTemplate('allocation_conflict', manager.id, conflict.conflictData, {
                    priority: conflict.severity,
                    context: { conflictId, employeeId }
                });
            }
        }
    }
    async getEmployeeManager(employeeId) {
        const result = await this.databaseService.query(`
      SELECT manager_id as id FROM employees 
      WHERE id = $1 AND manager_id IS NOT NULL
    `, [employeeId]);
        return result.rows[0] || null;
    }
    startConflictDetection() {
        if (this.isDestroyed || !this.timersEnabled) {
            return;
        }
        // Run conflict detection every 5 minutes
        this.conflictCheckInterval = setInterval(async () => {
            try {
                if (this.isDestroyed) {
                    return;
                }
                await this.detectAllocationConflicts();
            }
            catch (error) {
                console.error('Error in conflict detection:', error);
            }
        }, 5 * 60 * 1000);
    }
    startEscalationProcessor() {
        if (this.isDestroyed || !this.timersEnabled) {
            return;
        }
        // Process escalations every minute
        this.escalationProcessorInterval = setInterval(async () => {
            try {
                if (this.isDestroyed) {
                    return;
                }
                await this.processEscalations();
            }
            catch (error) {
                console.error('Error processing escalations:', error);
            }
        }, 60 * 1000);
    }
    async processEscalations() {
        // Get notifications that need escalation
        const result = await this.databaseService.query(`
      SELECT n.*, er.escalate_after_minutes, er.max_escalation_level, er.escalation_targets
      FROM notifications n
      JOIN notification_escalation_rules er ON n.type = er.notification_type AND n.priority = er.priority
      WHERE n.status IN ('sent', 'delivered') 
        AND n.read_at IS NULL
        AND n.escalation_level < er.max_escalation_level
        AND n.created_at < NOW() - INTERVAL '1 minute' * er.escalate_after_minutes
        AND er.is_active = true
    `);
        for (const notification of result.rows) {
            await this.escalateNotification(notification);
        }
    }
    async escalateNotification(notification) {
        const escalationTargets = notification.escalation_targets || [];
        for (const target of escalationTargets) {
            if (target.type === 'role') {
                const users = await this.getUsersByRole(target.value);
                for (const user of users) {
                    await this.sendNotification({
                        type: notification.type,
                        priority: 'high',
                        title: `ESCALATED: ${notification.title}`,
                        message: `This notification was escalated due to no response. Original: ${notification.message}`,
                        recipientId: user.id,
                        context: { originalNotificationId: notification.id, escalationLevel: notification.escalation_level + 1 }
                    });
                }
            }
            else if (target.type === 'user') {
                await this.sendNotification({
                    type: notification.type,
                    priority: 'high',
                    title: `ESCALATED: ${notification.title}`,
                    message: `This notification was escalated due to no response. Original: ${notification.message}`,
                    recipientId: target.value,
                    context: { originalNotificationId: notification.id, escalationLevel: notification.escalation_level + 1 }
                });
            }
        }
        // Update original notification escalation level
        await this.databaseService.query(`
      UPDATE notifications 
      SET escalation_level = escalation_level + 1, escalated_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [notification.id]);
    }
    async getUsersByRole(role) {
        // This would query users by role - implementation depends on your role system
        const result = await this.databaseService.query(`
      SELECT id FROM employees 
      WHERE position_title ILIKE $1 AND is_active = true AND deleted_at IS NULL
    `, [`%${role}%`]);
        return result.rows;
    }
    async handleApprovalAction(notificationId, userId, data) {
        // Handle approval logic
        console.log('Handling approval action:', { notificationId, userId, data });
    }
    async handleDismissAction(notificationId, userId) {
        // Handle dismiss logic - maybe just mark as read
        await this.markAsRead(notificationId, userId);
    }
    async handleEscalationAction(notificationId, userId) {
        // Handle manual escalation
        const notification = await this.getNotificationById(notificationId);
        if (notification) {
            await this.escalateNotification(notification);
        }
    }
    async cleanup() {
        this.clearTimers();
    }
    destroy() {
        this.isDestroyed = true;
        this.clearTimers();
    }
    clearTimers() {
        if (this.conflictCheckInterval) {
            clearInterval(this.conflictCheckInterval);
            this.conflictCheckInterval = null;
        }
        if (this.escalationProcessorInterval) {
            clearInterval(this.escalationProcessorInterval);
            this.escalationProcessorInterval = null;
        }
    }
    isTimersEnabled() {
        return this.timersEnabled;
    }
    enableTimers() {
        if (!this.timersEnabled && !this.isDestroyed) {
            this.timersEnabled = true;
            this.startConflictDetection();
            this.startEscalationProcessor();
        }
    }
    disableTimers() {
        this.timersEnabled = false;
        this.clearTimers();
    }
}
exports.NotificationService = NotificationService;
