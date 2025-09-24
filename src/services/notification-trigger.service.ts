import { DatabaseService } from '../database/database.service';

// Simplified notification trigger service
// TODO: Full implementation with PostgreSQL

export class NotificationTriggerService {
  private db: DatabaseService;
  private static instance: NotificationTriggerService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  private static getInstance(): NotificationTriggerService {
    if (!NotificationTriggerService.instance) {
      NotificationTriggerService.instance = new NotificationTriggerService();
    }
    return NotificationTriggerService.instance;
  }

  // Static methods for scheduler
  static async checkProjectDeadlines(): Promise<void> {
    const instance = NotificationTriggerService.getInstance();
    return instance.checkProjectDeadlines();
  }

  static async checkCapacityWarnings(): Promise<void> {
    const instance = NotificationTriggerService.getInstance();
    return instance.checkCapacityChanges();
  }

  static async checkBudgetWarnings(): Promise<void> {
    const instance = NotificationTriggerService.getInstance();
    // TODO: Implement budget warning checks
    return Promise.resolve();
  }

  static async runPeriodicChecks(): Promise<void> {
    const instance = NotificationTriggerService.getInstance();
    await instance.checkResourceUtilization();
    await instance.checkProjectDeadlines();
    await instance.checkCapacityChanges();
    await instance.checkSkillGaps();
  }

  async checkResourceUtilization(): Promise<void> {
    try {
      const query = `
        WITH employee_utilization AS (
          SELECT
            e.id,
            e.first_name || ' ' || e.last_name as name,
            e.email,
            d.name as department,
            COALESCE(SUM(ra.allocated_hours), 0) as total_allocated,
            e.weekly_capacity,
            COALESCE(SUM(ra.allocated_hours), 0)::numeric / NULLIF(e.weekly_capacity, 0) as utilization_rate
          FROM employees e
          JOIN departments d ON e.department_id = d.id
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.is_active = true
            AND ra.start_date <= CURRENT_DATE + INTERVAL '7 days'
            AND ra.end_date >= CURRENT_DATE
          WHERE e.is_active = true
          GROUP BY e.id, e.first_name, e.last_name, e.email, d.name, e.weekly_capacity
        )
        SELECT * FROM employee_utilization
        WHERE utilization_rate > 1.0 OR utilization_rate < 0.5
      `;

      const result = await this.db.query(query);

      for (const employee of result.rows) {
        const utilizationRate = parseFloat(employee.utilization_rate);
        const isOverUtilized = utilizationRate > 1.0;
        const isUnderUtilized = utilizationRate < 0.5;

        if (isOverUtilized) {
          await this.createNotification({
            type: 'over_utilization',
            title: 'Resource Over-utilization Alert',
            message: `${employee.name} is over-allocated at ${Math.round(utilizationRate * 100)}% capacity`,
            recipientId: null, // System notification
            metadata: {
              employeeId: employee.id,
              utilizationRate: utilizationRate,
              department: employee.department
            },
            priority: utilizationRate > 1.2 ? 'high' : 'medium',
            category: 'resource_management'
          });
        } else if (isUnderUtilized) {
          await this.createNotification({
            type: 'under_utilization',
            title: 'Resource Under-utilization Alert',
            message: `${employee.name} has low utilization at ${Math.round(utilizationRate * 100)}% capacity`,
            recipientId: null,
            metadata: {
              employeeId: employee.id,
              utilizationRate: utilizationRate,
              department: employee.department
            },
            priority: 'low',
            category: 'resource_optimization'
          });
        }
      }
    } catch (error) {
      console.error('Error checking resource utilization:', error);
    }
  }

  async checkProjectDeadlines(): Promise<void> {
    try {
      const query = `
        SELECT
          p.id,
          p.name,
          p.planned_end_date,
          p.manager_id,
          EXTRACT(days FROM (p.planned_end_date - CURRENT_DATE)) as days_remaining,
          CASE
            WHEN p.planned_end_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
            WHEN p.planned_end_date <= CURRENT_DATE + INTERVAL '14 days' THEN 'warning'
            ELSE 'normal'
          END as urgency_level
        FROM projects p
        WHERE p.is_active = true
        AND p.status IN ('active', 'planning')
        AND p.planned_end_date IS NOT NULL
        AND p.planned_end_date <= CURRENT_DATE + INTERVAL '14 days'
        AND p.planned_end_date >= CURRENT_DATE
      `;

      const result = await this.db.query(query);

      for (const project of result.rows) {
        const daysRemaining = parseInt(project.days_remaining);
        const urgencyLevel = project.urgency_level;

        await this.createNotification({
          type: 'project_deadline',
          title: `Project Deadline ${urgencyLevel === 'urgent' ? 'URGENT' : 'Approaching'}`,
          message: `Project "${project.name}" deadline is in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
          recipientId: project.manager_id,
          metadata: {
            projectId: project.id,
            daysRemaining: daysRemaining,
            urgencyLevel: urgencyLevel
          },
          priority: urgencyLevel === 'urgent' ? 'critical' : urgencyLevel === 'warning' ? 'high' : 'medium',
          category: 'project_management'
        });
      }
    } catch (error) {
      console.error('Error checking project deadlines:', error);
    }
  }

  async notifyNewAssignments(): Promise<void> {
    try {
      const query = `
        SELECT
          ra.id,
          ra.employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          e.email,
          p.name as project_name,
          p.id as project_id,
          ra.allocated_hours,
          ra.start_date,
          ra.end_date,
          pr.role_name
        FROM resource_allocations ra
        JOIN employees e ON ra.employee_id = e.id
        JOIN projects p ON ra.project_id = p.id
        LEFT JOIN project_roles pr ON ra.project_role_id = pr.id
        WHERE ra.created_at >= CURRENT_DATE - INTERVAL '24 hours'
        AND ra.is_active = true
      `;

      const result = await this.db.query(query);

      for (const assignment of result.rows) {
        await this.createNotification({
          type: 'new_assignment',
          title: 'New Project Assignment',
          message: `You have been assigned to project "${assignment.project_name}" as ${assignment.role_name || 'team member'}`,
          recipientId: assignment.employee_id,
          metadata: {
            projectId: assignment.project_id,
            allocationId: assignment.id,
            allocatedHours: parseFloat(assignment.allocated_hours),
            startDate: assignment.start_date,
            endDate: assignment.end_date
          },
          priority: 'medium',
          category: 'assignments'
        });
      }
    } catch (error) {
      console.error('Error notifying new assignments:', error);
    }
  }

  async checkSkillGaps(): Promise<void> {
    try {
      const query = `
        WITH required_skills AS (
          SELECT
            pr.skill_ids,
            p.id as project_id,
            p.name as project_name,
            p.manager_id
          FROM projects p
          JOIN project_roles pr ON p.id = ANY(pr.project_ids)
          WHERE p.is_active = true
          AND p.status IN ('active', 'planning')
        ),
        available_skills AS (
          SELECT
            es.skill_id,
            COUNT(DISTINCT es.employee_id) as available_count
          FROM employee_skills es
          JOIN employees e ON es.employee_id = e.id
          WHERE es.is_active = true
          AND e.is_active = true
          GROUP BY es.skill_id
        )
        SELECT
          rs.project_id,
          rs.project_name,
          rs.manager_id,
          s.name as skill_name,
          COALESCE(ava.available_count, 0) as available_count
        FROM required_skills rs
        CROSS JOIN LATERAL unnest(rs.skill_ids) as skill_id
        JOIN skills s ON s.id = skill_id
        LEFT JOIN available_skills ava ON ava.skill_id = skill_id
        WHERE COALESCE(ava.available_count, 0) < 2
      `;

      const result = await this.db.query(query);

      // Group by project to avoid duplicate notifications
      const projectSkillGaps = new Map<string, {
        projectName: string;
        managerId: string;
        skills: string[];
      }>();

      for (const gap of result.rows) {
        if (!projectSkillGaps.has(gap.project_id)) {
          projectSkillGaps.set(gap.project_id, {
            projectName: gap.project_name,
            managerId: gap.manager_id,
            skills: []
          });
        }

        projectSkillGaps.get(gap.project_id)!.skills.push(gap.skill_name);
      }

      for (const [projectId, gapData] of projectSkillGaps) {
        await this.createNotification({
          type: 'skill_gap',
          title: 'Skill Gap Alert',
          message: `Project "${gapData.projectName}" has insufficient resources for skills: ${gapData.skills.join(', ')}`,
          recipientId: gapData.managerId,
          metadata: {
            projectId: projectId,
            missingSkills: gapData.skills
          },
          priority: 'high',
          category: 'skill_management'
        });
      }
    } catch (error) {
      console.error('Error checking skill gaps:', error);
    }
  }

  async checkCapacityChanges(): Promise<void> {
    try {
      const query = `
        WITH current_capacity AS (
          SELECT
            d.name as department,
            COUNT(e.id) as current_count,
            SUM(e.weekly_capacity) as total_capacity,
            COALESCE(SUM(ra.allocated_hours), 0) as total_allocated
          FROM departments d
          JOIN employees e ON d.id = e.department_id AND e.is_active = true
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.is_active = true
            AND ra.start_date <= CURRENT_DATE
            AND ra.end_date >= CURRENT_DATE
          GROUP BY d.id, d.name
        ),
        historical_capacity AS (
          SELECT
            d.name as department,
            COUNT(e.id) as historical_count,
            SUM(e.weekly_capacity) as historical_total_capacity
          FROM departments d
          JOIN employees e ON d.id = e.department_id
            AND e.created_at <= CURRENT_DATE - INTERVAL '30 days'
            AND (e.updated_at IS NULL OR e.updated_at <= CURRENT_DATE - INTERVAL '30 days')
          GROUP BY d.id, d.name
        )
        SELECT
          cc.department,
          cc.current_count,
          cc.total_capacity,
          cc.total_allocated,
          COALESCE(hc.historical_count, cc.current_count) as historical_count,
          cc.current_count - COALESCE(hc.historical_count, cc.current_count) as capacity_change,
          (cc.total_allocated / NULLIF(cc.total_capacity, 0)) as utilization_rate
        FROM current_capacity cc
        LEFT JOIN historical_capacity hc ON cc.department = hc.department
        WHERE ABS(cc.current_count - COALESCE(hc.historical_count, cc.current_count)) > 0
        OR (cc.total_allocated / NULLIF(cc.total_capacity, 0)) > 0.9
      `;

      const result = await this.db.query(query);

      for (const dept of result.rows) {
        const capacityChange = parseInt(dept.capacity_change);
        const utilizationRate = parseFloat(dept.utilization_rate) || 0;

        if (Math.abs(capacityChange) > 0) {
          const changeType = capacityChange > 0 ? 'increased' : 'decreased';
          await this.createNotification({
            type: 'capacity_change',
            title: 'Department Capacity Change',
            message: `${dept.department} capacity has ${changeType} by ${Math.abs(capacityChange)} employee${Math.abs(capacityChange) !== 1 ? 's' : ''}`,
            recipientId: null, // Department managers would need to be identified
            metadata: {
              department: dept.department,
              capacityChange: capacityChange,
              currentCount: parseInt(dept.current_count),
              utilizationRate: utilizationRate
            },
            priority: Math.abs(capacityChange) > 2 ? 'high' : 'medium',
            category: 'capacity_management'
          });
        }

        if (utilizationRate > 0.9) {
          await this.createNotification({
            type: 'high_utilization',
            title: 'High Department Utilization',
            message: `${dept.department} is at ${Math.round(utilizationRate * 100)}% utilization`,
            recipientId: null,
            metadata: {
              department: dept.department,
              utilizationRate: utilizationRate
            },
            priority: utilizationRate > 0.95 ? 'critical' : 'high',
            category: 'capacity_management'
          });
        }
      }
    } catch (error) {
      console.error('Error checking capacity changes:', error);
    }
  }

  async processScheduledNotifications(): Promise<void> {
    try {
      const query = `
        SELECT id, type, title, message, recipient_id, metadata, priority, category
        FROM notifications
        WHERE status = 'scheduled'
        AND scheduled_for <= NOW()
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT 100
      `;

      const result = await this.db.query(query);

      for (const notification of result.rows) {
        try {
          // Process the notification (send email, push notification, etc.)
          await this.sendNotification(notification);

          // Mark as processed
          await this.db.query(
            'UPDATE notifications SET status = $1, processed_at = NOW() WHERE id = $2',
            ['sent', notification.id]
          );
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
          await this.db.query(
            'UPDATE notifications SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message, notification.id]
          );
        }
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }

  private async createNotification(notification: {
    type: string;
    title: string;
    message: string;
    recipientId: string | null;
    metadata: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO notifications
        (type, title, message, recipient_id, metadata, priority, category, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `;

      const values = [
        notification.type,
        notification.title,
        notification.message,
        notification.recipientId,
        JSON.stringify(notification.metadata),
        notification.priority,
        notification.category,
        'pending'
      ];

      const result = await this.db.query(query, values);

      // For high and critical priority notifications, try to send immediately
      if (notification.priority === 'high' || notification.priority === 'critical') {
        await this.sendImmediateNotification({
          id: result.rows[0].id,
          ...notification
        });
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    // Placeholder for actual notification sending logic
    // This would integrate with email service, push notifications, etc.
    console.log(`Sending notification: ${notification.title} to ${notification.recipient_id}`);
  }

  private async sendImmediateNotification(notification: any): Promise<void> {
    // Placeholder for immediate notification sending (e.g., Slack, Teams, etc.)
    console.log(`IMMEDIATE: ${notification.title}`);
  }

  // Export the class and make static methods available
  static checkResourceUtilization = async () => {
    const instance = NotificationTriggerService.getInstance();
    return instance.checkResourceUtilization();
  };

  static checkSkillGaps = async () => {
    const instance = NotificationTriggerService.getInstance();
    return instance.checkSkillGaps();
  };
}