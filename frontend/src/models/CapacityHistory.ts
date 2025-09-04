import { BaseModel, BaseEntity, QueryOptions, WhereClause } from './BaseModel';
import { Employee } from './Employee';

export interface CapacityHistory extends BaseEntity {
  employee_id: string;
  effective_date: Date;
  weekly_capacity_hours: number;
  reason?: string;
  notes?: string;
  is_temporary: boolean;
  end_date?: Date;
}

export interface CapacityHistoryWithEmployee extends CapacityHistory {
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number' | 'position_title'>;
}

export interface CreateCapacityHistoryData {
  employee_id: string;
  effective_date: Date;
  weekly_capacity_hours: number;
  reason?: string;
  notes?: string;
  is_temporary?: boolean;
  end_date?: Date;
}

export interface UpdateCapacityHistoryData {
  effective_date?: Date;
  weekly_capacity_hours?: number;
  reason?: string;
  notes?: string;
  is_temporary?: boolean;
  end_date?: Date;
}

export interface CapacityTrend {
  employee_id: string;
  employee_name: string;
  date: Date;
  capacity_hours: number;
  change_from_previous: number;
  reason?: string;
}

export class CapacityHistoryModel extends BaseModel<CapacityHistory> {
  constructor() {
    super('capacity_history');
  }

  async findByEmployee(employeeId: string, options: QueryOptions = {}): Promise<CapacityHistory[]> {
    return await this.findWhere({ employee_id: employeeId }, {
      ...options,
      orderBy: options.orderBy || 'effective_date DESC'
    });
  }

  async findByEmployeeWithDetails(employeeId: string, options: QueryOptions = {}): Promise<CapacityHistoryWithEmployee[]> {
    try {
      let query = `
        SELECT 
          ch.*,
          json_build_object(
            'id', e.id,
            'first_name', e.first_name,
            'last_name', e.last_name,
            'employee_number', e.employee_number,
            'position_title', e.position_title
          ) as employee
        FROM capacity_history ch
        JOIN employees e ON ch.employee_id = e.id AND e.deleted_at IS NULL
        WHERE ch.employee_id = $1
      `;
      
      if (!options.includeDeleted) {
        query += ' AND ch.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY ch.effective_date DESC';
      }
      
      return await this.db.query<CapacityHistoryWithEmployee>(query, [employeeId]);
    } catch (error) {
      this.logger.error('Error finding capacity history with employee details:', error);
      throw error;
    }
  }

  async findCurrentCapacity(employeeId: string, asOfDate: Date = new Date()): Promise<CapacityHistory | null> {
    try {
      const query = `
        SELECT *
        FROM capacity_history
        WHERE employee_id = $1
          AND effective_date <= $2
          AND (end_date IS NULL OR end_date >= $2)
          AND deleted_at IS NULL
        ORDER BY effective_date DESC
        LIMIT 1
      `;
      
      const rows = await this.db.query<CapacityHistory>(query, [employeeId, asOfDate]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding current capacity:', error);
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, options: QueryOptions = {}): Promise<CapacityHistory[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const dateCondition = `(
        effective_date BETWEEN $${params.length + 1} AND $${params.length + 2} OR
        (effective_date <= $${params.length + 1} AND (end_date IS NULL OR end_date >= $${params.length + 1}))
      )`;
      params.push(startDate, endDate);
      
      if (whereClause) {
        whereClause += ` AND ${dateCondition}`;
      } else {
        whereClause = ` WHERE ${dateCondition}`;
      }
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY effective_date DESC';
      }
      
      return await this.db.query<CapacityHistory>(query, params);
    } catch (error) {
      this.logger.error('Error finding capacity history by date range:', error);
      throw error;
    }
  }

  async findTemporaryChanges(options: QueryOptions = {}): Promise<CapacityHistory[]> {
    return await this.findWhere({ is_temporary: true }, {
      ...options,
      orderBy: options.orderBy || 'effective_date DESC'
    });
  }

  async findActiveTemporaryChanges(asOfDate: Date = new Date()): Promise<CapacityHistory[]> {
    try {
      const query = `
        SELECT *
        FROM capacity_history
        WHERE is_temporary = true
          AND effective_date <= $1
          AND end_date >= $1
          AND deleted_at IS NULL
        ORDER BY effective_date DESC
      `;
      
      return await this.db.query<CapacityHistory>(query, [asOfDate]);
    } catch (error) {
      this.logger.error('Error finding active temporary capacity changes:', error);
      throw error;
    }
  }

  async getCapacityTrends(
    employeeIds?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<CapacityTrend[]> {
    try {
      let whereConditions = ['ch.deleted_at IS NULL', 'e.deleted_at IS NULL'];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (employeeIds && employeeIds.length > 0) {
        const placeholders = employeeIds.map(() => `$${paramIndex++}`).join(', ');
        whereConditions.push(`ch.employee_id IN (${placeholders})`);
        params.push(...employeeIds);
      }
      
      if (startDate) {
        whereConditions.push(`ch.effective_date >= $${paramIndex++}`);
        params.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push(`ch.effective_date <= $${paramIndex++}`);
        params.push(endDate);
      }
      
      const query = `
        WITH capacity_with_lag AS (
          SELECT 
            ch.*,
            e.first_name || ' ' || e.last_name as employee_name,
            LAG(ch.weekly_capacity_hours) OVER (
              PARTITION BY ch.employee_id 
              ORDER BY ch.effective_date
            ) as previous_capacity
          FROM capacity_history ch
          JOIN employees e ON ch.employee_id = e.id
          WHERE ${whereConditions.join(' AND ')}
        )
        SELECT 
          employee_id,
          employee_name,
          effective_date as date,
          weekly_capacity_hours as capacity_hours,
          COALESCE(weekly_capacity_hours - previous_capacity, 0) as change_from_previous,
          reason
        FROM capacity_with_lag
        ORDER BY employee_id, effective_date DESC
      `;
      
      const rows = await this.db.query<{
        employee_id: string;
        employee_name: string;
        date: Date;
        capacity_hours: string;
        change_from_previous: string;
        reason?: string;
      }>(query, params);
      
      return rows.map(row => ({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        date: row.date,
        capacity_hours: parseFloat(row.capacity_hours),
        change_from_previous: parseFloat(row.change_from_previous),
        reason: row.reason
      }));
    } catch (error) {
      this.logger.error('Error getting capacity trends:', error);
      throw error;
    }
  }

  async createCapacityChange(
    employeeId: string,
    effectiveDate: Date,
    weeklyCapacityHours: number,
    reason?: string,
    notes?: string,
    isTemporary: boolean = false,
    endDate?: Date,
    userId?: string
  ): Promise<CapacityHistory> {
    const data: CreateCapacityHistoryData = {
      employee_id: employeeId,
      effective_date: effectiveDate,
      weekly_capacity_hours: weeklyCapacityHours,
      reason,
      notes,
      is_temporary: isTemporary,
      end_date: endDate
    };
    
    return await this.create(data, userId);
  }

  async endTemporaryChange(id: string, endDate: Date = new Date(), userId?: string): Promise<CapacityHistory | null> {
    return await this.update(id, { end_date: endDate }, userId);
  }

  async getEmployeeCapacityStats(employeeId: string): Promise<{
    current_capacity: number;
    average_capacity: number;
    min_capacity: number;
    max_capacity: number;
    total_changes: number;
    temporary_changes: number;
    last_change_date?: Date;
  }> {
    try {
      const currentCapacity = await this.findCurrentCapacity(employeeId);
      
      const statsQuery = `
        SELECT 
          AVG(weekly_capacity_hours) as average_capacity,
          MIN(weekly_capacity_hours) as min_capacity,
          MAX(weekly_capacity_hours) as max_capacity,
          COUNT(*) as total_changes,
          COUNT(CASE WHEN is_temporary = true THEN 1 END) as temporary_changes,
          MAX(effective_date) as last_change_date
        FROM capacity_history
        WHERE employee_id = $1 AND deleted_at IS NULL
      `;
      
      const rows = await this.db.query<{
        average_capacity: string;
        min_capacity: string;
        max_capacity: string;
        total_changes: string;
        temporary_changes: string;
        last_change_date?: Date;
      }>(statsQuery, [employeeId]);
      
      const stats = rows[0];
      return {
        current_capacity: currentCapacity?.weekly_capacity_hours || 0,
        average_capacity: Math.round(parseFloat(stats.average_capacity || '0') * 100) / 100,
        min_capacity: parseFloat(stats.min_capacity || '0'),
        max_capacity: parseFloat(stats.max_capacity || '0'),
        total_changes: parseInt(stats.total_changes, 10),
        temporary_changes: parseInt(stats.temporary_changes, 10),
        last_change_date: stats.last_change_date
      };
    } catch (error) {
      this.logger.error('Error getting employee capacity stats:', error);
      throw error;
    }
  }

  async getDepartmentCapacityUtilization(departmentId?: string, asOfDate: Date = new Date()): Promise<Array<{
    employee_id: string;
    employee_name: string;
    position_title: string;
    current_capacity: number;
    department_name: string;
  }>> {
    try {
      let departmentFilter = '';
      const params = [asOfDate];
      
      if (departmentId) {
        departmentFilter = 'AND e.department_id = $2';
        params.push(departmentId);
      }
      
      const query = `
        WITH current_capacities AS (
          SELECT DISTINCT ON (ch.employee_id)
            ch.employee_id,
            ch.weekly_capacity_hours
          FROM capacity_history ch
          WHERE ch.effective_date <= $1
            AND (ch.end_date IS NULL OR ch.end_date >= $1)
            AND ch.deleted_at IS NULL
          ORDER BY ch.employee_id, ch.effective_date DESC
        )
        SELECT 
          e.id as employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          e.position_title,
          COALESCE(cc.weekly_capacity_hours, e.weekly_capacity_hours) as current_capacity,
          COALESCE(d.name, 'Unassigned') as department_name
        FROM employees e
        LEFT JOIN current_capacities cc ON e.id = cc.employee_id
        LEFT JOIN departments d ON e.department_id = d.id AND d.deleted_at IS NULL
        WHERE e.deleted_at IS NULL AND e.is_active = true
        ${departmentFilter}
        ORDER BY department_name, employee_name
      `;
      
      const rows = await this.db.query<{
        employee_id: string;
        employee_name: string;
        position_title: string;
        current_capacity: string;
        department_name: string;
      }>(query, params);
      
      return rows.map(row => ({
        employee_id: row.employee_id,
        employee_name: row.employee_name,
        position_title: row.position_title,
        current_capacity: parseFloat(row.current_capacity),
        department_name: row.department_name
      }));
    } catch (error) {
      this.logger.error('Error getting department capacity utilization:', error);
      throw error;
    }
  }

  async cleanupExpiredTemporaryChanges(): Promise<number> {
    try {
      const query = `
        UPDATE capacity_history
        SET deleted_at = NOW(), deleted_by = 'system'
        WHERE is_temporary = true
          AND end_date < CURRENT_DATE
          AND deleted_at IS NULL
        RETURNING id
      `;
      
      const rows = await this.db.query(query);
      return rows.length;
    } catch (error) {
      this.logger.error('Error cleaning up expired temporary changes:', error);
      throw error;
    }
  }
}

export const capacityHistoryModel = new CapacityHistoryModel();