/**
 * Heat Map WebSocket Event Handler
 * Broadcasts capacity and allocation updates for real-time heat map updates
 */

import { WebSocketService } from './websocket.service';
import { DatabaseService } from '../database/database.service';

export interface HeatMapUpdateEvent {
  type: 'capacity_update' | 'allocation_change' | 'heat_map_refresh';
  data?: {
    employeeId?: string;
    date?: string;
    updatedData?: any;
    affectedEmployees?: string[];
  };
}

export class HeatMapWebSocketHandler {
  constructor(
    private wsService: WebSocketService,
    private dbService: DatabaseService
  ) {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for database changes
   */
  private setupEventListeners() {
    // Note: Database event listeners would be implemented here
    // For now, these methods can be called directly by services that make changes

    // Example implementation would use EventEmitter or similar pattern:
    // this.dbService.on('allocation_created', this.handleAllocationChange.bind(this));
    // this.dbService.on('allocation_updated', this.handleAllocationChange.bind(this));
    // this.dbService.on('allocation_deleted', this.handleAllocationChange.bind(this));
    // this.dbService.on('capacity_updated', this.handleCapacityUpdate.bind(this));
    // this.dbService.on('availability_changed', this.handleAvailabilityChange.bind(this));
  }

  /**
   * Handle allocation changes and broadcast updates
   */
  private async handleAllocationChange(data: any) {
    try {
      const { employeeId, projectId, date } = data;

      // Get affected employees
      const affectedEmployees = [employeeId];

      // Fetch updated capacity data for the affected employee and date
      const updatedCapacity = await this.fetchUpdatedCapacity(employeeId, date);

      const event: HeatMapUpdateEvent = {
        type: 'allocation_change',
        data: {
          affectedEmployees,
          date,
          updatedData: updatedCapacity,
        },
      };

      // Broadcast to all connected clients
      this.broadcastToChannel('capacity_updates', event);

      // Broadcast to specific employee channels
      affectedEmployees.forEach(empId => {
        this.broadcastToChannel(`employee_${empId}`, event);
      });
    } catch (error) {
      console.error('Error handling allocation change:', error);
    }
  }

  /**
   * Handle capacity updates
   */
  private handleCapacityUpdate(data: any) {
    const { employeeId, date, utilization } = data;

    const event: HeatMapUpdateEvent = {
      type: 'capacity_update',
      data: {
        employeeId,
        date,
        updatedData: {
          utilizationPercentage: utilization,
          utilizationCategory: this.getUtilizationCategory(utilization),
        },
      },
    };

    this.broadcastToChannel('capacity_updates', event);
    this.broadcastToChannel(`employee_${employeeId}`, event);
  }

  /**
   * Handle availability changes that affect capacity
   */
  private handleAvailabilityChange(data: any) {
    const event: HeatMapUpdateEvent = {
      type: 'heat_map_refresh',
      data: {},
    };

    // Trigger a full refresh when availability patterns change
    this.broadcastToChannel('capacity_updates', event);
  }

  /**
   * Fetch updated capacity data for an employee on a specific date
   */
  private async fetchUpdatedCapacity(employeeId: string, date: string) {
    const db = this.dbService.getPool();

    const query = `
      SELECT
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        e.department_id,
        d.name as department_name,
        $2::date as date,
        COALESCE(SUM(ra.hours), 0) as total_allocated,
        8 as daily_capacity,
        ROUND(COALESCE(SUM(ra.hours), 0) / 8.0 * 100, 2) as utilization_percentage,
        COUNT(DISTINCT ra.project_id) as project_count
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN resource_allocations ra ON
        e.id = ra.employee_id AND
        ra.date = $2::date AND
        ra.status = 'active'
      WHERE e.id = $1
      GROUP BY e.id, e.first_name, e.last_name, e.department_id, d.name
    `;

    const result = await db.query(query, [employeeId, date]);

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        departmentId: row.department_id,
        departmentName: row.department_name,
        date: row.date,
        totalAllocated: parseFloat(row.total_allocated),
        dailyCapacity: row.daily_capacity,
        utilizationPercentage: parseFloat(row.utilization_percentage),
        utilizationCategory: this.getUtilizationCategory(parseFloat(row.utilization_percentage)),
        projectCount: parseInt(row.project_count),
      };
    }

    return null;
  }

  /**
   * Get utilization category based on percentage
   */
  private getUtilizationCategory(percentage: number): 'green' | 'blue' | 'yellow' | 'red' {
    if (percentage <= 70) return 'green';
    if (percentage <= 85) return 'blue';
    if (percentage <= 100) return 'yellow';
    return 'red';
  }

  /**
   * Broadcast event to a specific channel
   */
  private broadcastToChannel(channel: string, event: HeatMapUpdateEvent) {
    this.wsService.broadcast(channel, JSON.stringify(event));
  }

  /**
   * Handle client subscription to heat map updates
   */
  public handleSubscription(clientId: string, filters: any) {
    const channels = ['capacity_updates'];

    if (filters.employeeId) {
      channels.push(`employee_${filters.employeeId}`);
    }

    if (filters.departmentId) {
      channels.push(`department_${filters.departmentId}`);
    }

    // Note: Channel subscription would be implemented in WebSocketService
    // For now, we track the channels internally
    // channels.forEach(channel => {
    //   this.wsService.subscribe(clientId, channel);
    // });
  }

  /**
   * Handle client unsubscription
   */
  public handleUnsubscription(clientId: string) {
    // Note: Unsubscription would be implemented in WebSocketService
    // this.wsService.unsubscribe(clientId);
  }

  /**
   * Trigger a manual heat map refresh
   */
  public triggerRefresh() {
    const event: HeatMapUpdateEvent = {
      type: 'heat_map_refresh',
      data: {},
    };

    this.broadcastToChannel('capacity_updates', event);
  }
}