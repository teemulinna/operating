import { DatabaseService } from '../database/database.service';
import { 
  ResourceAllocation,
  CreateResourceAllocationInput, 
  UpdateResourceAllocationInput,
  ResourceAllocationWithDetails,
  ResourceAllocationFilters,
  PaginatedResponse,
  DatabaseError
} from '../types';

export interface AllocationOverlap {
  allocationId: string;
  projectName: string;
  startDate: Date;
  endDate: Date;
  allocatedPercentage: number;
}

export interface CapacityMetrics {
  employeeId: string;
  totalAllocatedPercentage: number;
  totalAllocatedHours: number;
  utilizationRate: number;
  conflictCount: number;
  activeAllocations: number;
}

export enum AllocationStatus {
  PLANNED = 'planned',
  ACTIVE = 'active', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export class WorkingAllocationModel {
  private static db = DatabaseService.getInstance();

  static async initialize(): Promise<void> {
    await this.db.connect();
  }

  static async create(input: CreateResourceAllocationInput): Promise<ResourceAllocation> {
    try {
      // Convert hours to percentage (assuming 40 hour work week)
      const allocationPercentage = ((input.allocatedHours || 40) / 40) * 100;
      
      // First check for overlaps
      const overlaps = await this.checkOverlaps(
        input.employeeId,
        input.startDate,
        input.endDate
      );

      if (overlaps.length > 0) {
        // Calculate total allocation for conflict checking
        const totalPercentage = overlaps.reduce((sum, overlap) => sum + overlap.allocatedPercentage, 0) + allocationPercentage;
        if (totalPercentage > 100) {
          throw new DatabaseError(
            `Allocation conflicts detected. Total allocation would be ${totalPercentage.toFixed(1)}% (over 100%). Use force parameter to override.`
          );
        }
      }

      const query = `
        INSERT INTO resource_assignments (
          employee_id, project_id, start_date, end_date, 
          planned_allocation_percentage, hourly_rate, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'planned', $7)
        RETURNING *
      `;

      const values = [
        input.employeeId,
        input.projectId, // project_id is already integer
        input.startDate,
        input.endDate,
        allocationPercentage,
        input.hourlyRate || null,
        input.notes || null
      ];

      const result = await this.db.query(query, values);
      return this.mapRowFromAssignment(result.rows[0], input.roleOnProject);
    } catch (error: any) {
      if (error.code === '23503') { // Foreign key constraint violation
        throw new DatabaseError('Invalid employee ID or project ID');
      }
      if (error.code === '23514') { // Check constraint violation
        throw new DatabaseError('Invalid allocation data - check dates and percentage');
      }
      throw error;
    }
  }

  static async createForced(input: CreateResourceAllocationInput): Promise<ResourceAllocation> {
    try {
      // Convert hours to percentage (assuming 40 hour work week)
      const allocationPercentage = ((input.allocatedHours || 40) / 40) * 100;
      
      const query = `
        INSERT INTO resource_assignments (
          employee_id, project_id, start_date, end_date, 
          planned_allocation_percentage, hourly_rate, status, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'planned', $7)
        RETURNING *
      `;

      const values = [
        input.employeeId,
        input.projectId, // project_id is already integer
        input.startDate,
        input.endDate,
        allocationPercentage,
        input.hourlyRate || null,
        input.notes || null
      ];

      const result = await this.db.query(query, values);
      return this.mapRowFromAssignment(result.rows[0], input.roleOnProject);
    } catch (error: any) {
      if (error.code === '23503') {
        throw new DatabaseError('Invalid employee ID or project ID');
      }
      if (error.code === '23514') {
        throw new DatabaseError('Invalid allocation data - check dates and percentage');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<ResourceAllocation | null> {
    const query = `
      SELECT * FROM resource_assignments 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowFromAssignment(result.rows[0], 'Team Member') : null;
  }

  static async findByIdWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    const query = `
      SELECT 
        ra.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'status', p.status,
          'priority', p.priority,
          'startDate', p.start_date,
          'endDate', p.end_date
        ) AS project,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name,
          'email', e.email,
          'position', e.position,
          'departmentId', e.department_id
        ) AS employee
      FROM resource_assignments ra
      JOIN projects p ON ra.project_id = p.id
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const allocation = this.mapRowFromAssignment(row, 'Team Member');

    return {
      ...allocation,
      employee: row.employee,
      project: row.project
    } as ResourceAllocationWithDetails;
  }

  static async findByEmployeeId(
    employeeId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    let whereConditions = ['ra.employee_id = $1'];
    const values: any[] = [employeeId];

    if (filters.startDateFrom) {
      values.push(filters.startDateFrom);
      whereConditions.push(`ra.start_date >= $${values.length}`);
    }

    if (filters.startDateTo) {
      values.push(filters.startDateTo);
      whereConditions.push(`ra.start_date <= $${values.length}`);
    }

    if (filters.isActive !== undefined) {
      const status = filters.isActive ? 'active' : 'cancelled';
      values.push(status);
      whereConditions.push(`ra.status = $${values.length}`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resource_assignments ra
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT ra.*
      FROM resource_assignments ra
      WHERE ${whereClause}
      ORDER BY ra.start_date DESC, ra.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataResult = await this.db.query(dataQuery, values);
    const allocations = dataResult.rows.map(row => this.mapRowFromAssignment(row, 'Team Member'));

    const totalPages = Math.ceil(total / limit);

    return {
      data: allocations,
      total,
      page,
      limit,
      totalPages
    };
  }

  static async findByProjectId(
    projectId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    let whereConditions = ['ra.project_id = $1'];
    const values: any[] = [parseInt(projectId)];

    if (filters.isActive !== undefined) {
      const status = filters.isActive ? 'active' : 'cancelled';
      values.push(status);
      whereConditions.push(`ra.status = $${values.length}`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resource_assignments ra
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT ra.*
      FROM resource_assignments ra
      WHERE ${whereClause}
      ORDER BY ra.start_date ASC, ra.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataResult = await this.db.query(dataQuery, values);
    const allocations = dataResult.rows.map(row => this.mapRowFromAssignment(row, 'Team Member'));

    const totalPages = Math.ceil(total / limit);

    return {
      data: allocations,
      total,
      page,
      limit,
      totalPages
    };
  }

  static async findAll(
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    let whereConditions: string[] = [];
    const values: any[] = [];

    if (filters.employeeId) {
      values.push(filters.employeeId);
      whereConditions.push(`ra.employee_id = $${values.length}`);
    }

    if (filters.projectId) {
      values.push(parseInt(filters.projectId));
      whereConditions.push(`ra.project_id = $${values.length}`);
    }

    if (filters.startDateFrom) {
      values.push(filters.startDateFrom);
      whereConditions.push(`ra.start_date >= $${values.length}`);
    }

    if (filters.startDateTo) {
      values.push(filters.startDateTo);
      whereConditions.push(`ra.start_date <= $${values.length}`);
    }

    if (filters.endDateFrom) {
      values.push(filters.endDateFrom);
      whereConditions.push(`ra.end_date >= $${values.length}`);
    }

    if (filters.endDateTo) {
      values.push(filters.endDateTo);
      whereConditions.push(`ra.end_date <= $${values.length}`);
    }

    if (filters.isActive !== undefined) {
      const status = filters.isActive ? 'active' : 'cancelled';
      values.push(status);
      whereConditions.push(`ra.status = $${values.length}`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM resource_assignments ra
      ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT ra.*
      FROM resource_assignments ra
      ${whereClause}
      ORDER BY ra.start_date DESC, ra.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataResult = await this.db.query(dataQuery, values);
    const allocations = dataResult.rows.map(row => this.mapRowFromAssignment(row, 'Team Member'));

    const totalPages = Math.ceil(total / limit);

    return {
      data: allocations,
      total,
      page,
      limit,
      totalPages
    };
  }

  static async update(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.allocatedHours !== undefined) {
      const allocationPercentage = (updates.allocatedHours / 40) * 100;
      values.push(allocationPercentage);
      updateFields.push(`planned_allocation_percentage = $${values.length}`);
    }

    if (updates.actualHours !== undefined) {
      const actualPercentage = (updates.actualHours / 40) * 100;
      values.push(actualPercentage);
      updateFields.push(`actual_allocation_percentage = $${values.length}`);
    }

    if (updates.startDate !== undefined) {
      values.push(updates.startDate);
      updateFields.push(`start_date = $${values.length}`);
    }

    if (updates.endDate !== undefined) {
      values.push(updates.endDate);
      updateFields.push(`end_date = $${values.length}`);
    }

    if (updates.notes !== undefined) {
      values.push(updates.notes);
      updateFields.push(`notes = $${values.length}`);
    }

    if (updates.isActive !== undefined) {
      values.push(updates.isActive ? 'active' : 'cancelled');
      updateFields.push(`status = $${values.length}`);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE resource_assignments 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Allocation not found');
      }

      return this.mapRowFromAssignment(result.rows[0], 'Team Member');
    } catch (error: any) {
      if (error.code === '23514') {
        throw new DatabaseError('Invalid allocation data - check dates and percentage');
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<ResourceAllocation> {
    const query = `
      UPDATE resource_assignments 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Allocation not found');
    }

    return this.mapRowFromAssignment(result.rows[0], 'Team Member');
  }

  static async checkOverlaps(
    employeeId: string, 
    startDate: Date, 
    endDate: Date, 
    excludeAllocationId?: string
  ): Promise<AllocationOverlap[]> {
    let query = `
      SELECT 
        ra.id as allocation_id,
        p.name as project_name,
        ra.start_date,
        ra.end_date,
        ra.planned_allocation_percentage
      FROM resource_assignments ra
      JOIN projects p ON ra.project_id = p.id
      WHERE ra.employee_id = $1
        AND ra.status IN ('planned', 'active')
        AND (
          (ra.start_date <= $2 AND ra.end_date >= $2) OR
          (ra.start_date <= $3 AND ra.end_date >= $3) OR
          (ra.start_date >= $2 AND ra.end_date <= $3)
        )
    `;
    
    const values = [employeeId, startDate, endDate];
    
    if (excludeAllocationId) {
      query += ` AND ra.id != $4`;
      values.push(excludeAllocationId);
    }

    const result = await this.db.query(query, values);

    return result.rows.map(row => ({
      allocationId: row.allocation_id,
      projectName: row.project_name,
      startDate: row.start_date,
      endDate: row.end_date,
      allocatedPercentage: parseFloat(row.planned_allocation_percentage)
    }));
  }

  static async getUtilizationMetrics(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CapacityMetrics[]> {
    let whereConditions = [`ra.status IN ('planned', 'active')`];
    const values: any[] = [];

    if (employeeId) {
      values.push(employeeId);
      whereConditions.push(`ra.employee_id = $${values.length}`);
    }

    if (startDate && endDate) {
      values.push(startDate, endDate);
      whereConditions.push(`(ra.start_date <= $${values.length} AND ra.end_date >= $${values.length - 1})`);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT 
        e.id as employee_id,
        COALESCE(SUM(ra.planned_allocation_percentage), 0) as total_allocated_percentage,
        COALESCE(SUM(ra.planned_hours_per_week), 0) as total_allocated_hours,
        COUNT(DISTINCT ra.id) as active_allocations,
        COALESCE(SUM(ra.planned_allocation_percentage), 0) as utilization_rate,
        COUNT(CASE 
          WHEN EXISTS (
            SELECT 1 FROM resource_assignments ra2 
            WHERE ra2.employee_id = ra.employee_id 
            AND ra2.id != ra.id
            AND ra2.status IN ('planned', 'active')
            AND ((ra2.start_date <= ra.start_date AND ra2.end_date >= ra.start_date) 
                 OR (ra2.start_date <= ra.end_date AND ra2.end_date >= ra.end_date)
                 OR (ra2.start_date >= ra.start_date AND ra2.end_date <= ra.end_date))
          ) THEN 1 
        END) as conflict_count
      FROM employees e
      LEFT JOIN resource_assignments ra ON e.id = ra.employee_id AND ${whereClause}
      WHERE e.is_active = true
      GROUP BY e.id
      ORDER BY utilization_rate DESC
    `;

    const result = await this.db.query(query, values);

    return result.rows.map(row => ({
      employeeId: row.employee_id,
      totalAllocatedPercentage: parseFloat(row.total_allocated_percentage) || 0,
      totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
      utilizationRate: parseFloat(row.utilization_rate) || 0,
      conflictCount: parseInt(row.conflict_count) || 0,
      activeAllocations: parseInt(row.active_allocations) || 0
    }));
  }

  static async updateStatus(id: string, status: AllocationStatus): Promise<ResourceAllocation> {
    const query = `
      UPDATE resource_assignments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [status, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Allocation not found');
    }

    return this.mapRowFromAssignment(result.rows[0], 'Team Member');
  }

  private static mapRowFromAssignment(row: any, roleOnProject: string = 'Team Member'): ResourceAllocation {
    // Convert percentage back to hours (assuming 40 hour work week)
    const allocatedHours = (parseFloat(row.planned_allocation_percentage) / 100) * 40;

    const allocation: ResourceAllocation = {
      id: row.id,
      projectId: row.project_id.toString(),
      employeeId: row.employee_id,
      allocatedHours: allocatedHours || 0,
      roleOnProject: roleOnProject,
      startDate: row.start_date,
      endDate: row.end_date,
      isActive: row.status === 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    // Only set optional properties if they have values
    if (row.actual_allocation_percentage !== null && row.actual_allocation_percentage !== undefined) {
      allocation.actualHours = (parseFloat(row.actual_allocation_percentage) / 100) * 40;
    }
    if (row.hourly_rate !== null && row.hourly_rate !== undefined) {
      allocation.hourlyRate = parseFloat(row.hourly_rate);
    }
    if (row.notes !== null && row.notes !== undefined) {
      allocation.notes = row.notes;
    }

    return allocation;
  }
}