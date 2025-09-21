import { 
  ResourceAllocation, 
  CreateResourceAllocationInput, 
  UpdateResourceAllocationInput,
  ResourceAllocationWithDetails,
  ResourceAllocationFilters,
  PaginatedResponse,
  ValidationError,
  DatabaseError,
  OverAllocationWarning
} from '../types';
import { WorkingAllocationModel as AllocationModel, AllocationOverlap, CapacityMetrics, AllocationStatus } from '../models/working-allocation.model';
import { EmployeeModel } from '../models/Employee';
import { ProjectModel } from '../models/Project';
import { OverAllocationWarningService } from './over-allocation-warning.service';

export interface AllocationConflictReport {
  hasConflicts: boolean;
  conflicts: AllocationOverlap[];
  suggestions: string[];
}

export interface CapacityValidationResult {
  isValid: boolean;
  warnings: string[];
  maxCapacityHours: number;
  currentAllocatedHours: number;
  utilizationRate: number;
}

export interface UtilizationSummary {
  totalEmployees: number;
  averageUtilization: number;
  overutilizedCount: number;
  underutilizedCount: number;
  totalAllocations: number;
  conflictsCount: number;
}

export class AllocationService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  async createAllocation(input: CreateResourceAllocationInput, force: boolean = false): Promise<ResourceAllocation> {
    // Validate input data
    const validationErrors = this.validateAllocationInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Validate that employee and project exist
    const employeeResult = await this.db.query('SELECT id FROM employees WHERE id = $1', [input.employeeId]);
    if (employeeResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const projectResult = await this.db.query('SELECT id FROM projects WHERE id = $1', [input.projectId]);
    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    // Check for overlapping allocations unless forced
    if (!force) {
      await this.validateBusinessRules(input);
    }

    // Insert allocation into database
    const query = `
      INSERT INTO resource_allocations (
        employee_id, project_id, start_date, end_date,
        allocation_percentage, role, billable_rate, status,
        notes, utilization_target, allocated_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      input.employeeId,
      input.projectId,
      input.startDate,
      input.endDate,
      input.allocationPercentage || 100,
      input.role || input.roleOnProject || 'Team Member',
      input.billableRate || input.hourlyRate,
      input.status || 'active',
      input.notes,
      input.utilizationTarget,
      input.allocatedHours || 40
    ];

    const result = await this.db.query(query, values);

    if (!result.rows.length) {
      throw new Error('Failed to create allocation');
    }

    return result.rows[0];
  }

  async getAllocationById(id: string | number): Promise<ResourceAllocation | null> {
    const result = await this.db.query(
      'SELECT * FROM resource_allocations WHERE id = $1',
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    return AllocationModel.findByIdWithDetails(id);
  }

  async getAllocations(filters: any = {}): Promise<any> {
    const { employeeId, page = 1, limit = 50 } = filters;

    if (employeeId) {
      // Get allocations for specific employee
      const result = await this.db.query(
        'SELECT * FROM resource_allocations WHERE employee_id = $1 ORDER BY start_date',
        [employeeId]
      );
      return {
        data: result.rows,
        total: result.rows.length,
        page,
        limit
      };
    }

    // Get all allocations
    const result = await this.db.query(
      'SELECT * FROM resource_allocations ORDER BY start_date LIMIT $1 OFFSET $2',
      [limit, (page - 1) * limit]
    );

    return {
      data: result.rows,
      total: result.rows.length,
      page,
      limit
    };
  }

  static async getProjectAllocations(
    projectId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    // Validate project exists
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      throw new DatabaseError('Project not found');
    }

    return AllocationModel.findByProjectId(projectId, filters, page, limit);
  }

  static async getAllAllocations(
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    return AllocationModel.findAll(filters, page, limit);
  }

  async updateAllocation(
    id: string | number,
    updates: UpdateResourceAllocationInput
  ): Promise<ResourceAllocation> {
    // Build update fields
    const updateFields: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Map camelCase to snake_case fields
    const fieldMapping: Record<string, string> = {
      allocationPercentage: 'allocation_percentage',
      billableRate: 'billable_rate',
      roleOnProject: 'role',
      allocatedHours: 'allocated_hours',
      actualHours: 'actual_hours',
      startDate: 'start_date',
      endDate: 'end_date',
      utilizationTarget: 'utilization_target'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const dbField = fieldMapping[key] || key;
        updateFields.push(`${dbField} = $${paramIndex}`);
        queryParams.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE resource_allocations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    queryParams.push(id);

    const result = await this.db.query(query, queryParams);

    if (!result.rows.length) {
      throw new Error('Allocation not found');
    }

    return result.rows[0];
  }

  async deleteAllocation(id: string | number): Promise<ResourceAllocation> {
    const result = await this.db.query(
      'DELETE FROM resource_allocations WHERE id = $1 RETURNING *',
      [id]
    );

    if (!result.rows.length) {
      throw new Error('Allocation not found');
    }

    return result.rows[0];
  }

  static async checkAllocationConflicts(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeAllocationId?: string
  ): Promise<AllocationConflictReport> {
    const conflicts = await AllocationModel.checkOverlaps(
      employeeId,
      startDate,
      endDate,
      excludeAllocationId
    );

    const suggestions: string[] = [];

    if (conflicts.length > 0) {
      suggestions.push(`Found ${conflicts.length} conflicting allocation(s)`);
      
      for (const conflict of conflicts) {
        const daysOverlap = Math.abs(
          Math.min(endDate.getTime(), conflict.endDate.getTime()) -
          Math.max(startDate.getTime(), conflict.startDate.getTime())
        ) / (1000 * 60 * 60 * 24);
        
        suggestions.push(
          `Conflict with "${conflict.projectName}" (${conflict.startDate.toISOString().split('T')[0]} to ${conflict.endDate.toISOString().split('T')[0]}, ${daysOverlap} days overlap)`
        );
      }

      // Suggest alternative dates
      if (conflicts.length > 0) {
        const latestEndDate = Math.max(...conflicts.map(c => c.endDate.getTime()));
        const suggestedStartDate = new Date(latestEndDate + 24 * 60 * 60 * 1000);
        suggestions.push(`Consider starting after ${suggestedStartDate.toISOString().split('T')[0]}`);
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      suggestions
    };
  }

  static async validateCapacity(
    employeeId: string,
    allocatedHours: number,
    startDate: Date,
    endDate: Date,
    excludeAllocationId?: string
  ): Promise<CapacityValidationResult> {
    const warnings: string[] = [];
    const maxCapacityHours = 40; // Standard 40-hour work week

    // Get current allocations for the employee in the date range
    const metrics = await AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
    const employeeMetrics = metrics.find(m => m.employeeId === employeeId);

    const currentAllocatedHours = employeeMetrics?.totalAllocatedHours || 0;
    const utilizationRate = ((currentAllocatedHours + allocatedHours) / maxCapacityHours) * 100;

    // Check for over-allocation
    if (utilizationRate > 100) {
      warnings.push(`Over-allocation detected: ${utilizationRate.toFixed(1)}% capacity (${currentAllocatedHours + allocatedHours}/${maxCapacityHours} hours)`);
    } else if (utilizationRate > 80) {
      warnings.push(`High utilization: ${utilizationRate.toFixed(1)}% capacity`);
    }

    // Check for conflicts
    const conflicts = await AllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
    if (conflicts.length > 0) {
      warnings.push(`${conflicts.length} scheduling conflict(s) detected`);
    }

    return {
      isValid: utilizationRate <= 100 && conflicts.length === 0,
      warnings,
      maxCapacityHours,
      currentAllocatedHours,
      utilizationRate
    };
  }

  static async getUtilizationSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<UtilizationSummary> {
    const metrics = await AllocationModel.getUtilizationMetrics(undefined, startDate, endDate);

    const totalEmployees = metrics.length;
    const averageUtilization = metrics.reduce((sum, m) => sum + m.utilizationRate, 0) / totalEmployees;
    const overutilizedCount = metrics.filter(m => m.utilizationRate > 100).length;
    const underutilizedCount = metrics.filter(m => m.utilizationRate < 70).length;
    const totalAllocations = metrics.reduce((sum, m) => sum + m.activeAllocations, 0);
    const conflictsCount = metrics.reduce((sum, m) => sum + m.conflictCount, 0);

    return {
      totalEmployees: totalEmployees || 0,
      averageUtilization: averageUtilization || 0,
      overutilizedCount,
      underutilizedCount,
      totalAllocations,
      conflictsCount
    };
  }

  static async getCapacityMetrics(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CapacityMetrics[]> {
    return AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
  }

  static async confirmAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationModel.updateStatus(id, AllocationStatus.ACTIVE);
  }

  static async completeAllocation(id: string, actualHours?: number): Promise<ResourceAllocation> {
    if (actualHours !== undefined) {
      await AllocationModel.update(id, { actualHours });
    }
    return AllocationModel.updateStatus(id, AllocationStatus.COMPLETED);
  }

  static async cancelAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationModel.updateStatus(id, AllocationStatus.CANCELLED);
  }

  private validateAllocationInput(input: CreateResourceAllocationInput): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!input.employeeId) {
      errors.push({
        field: 'employeeId',
        message: 'Employee ID is required',
        value: input.employeeId
      });
    }

    if (!input.projectId) {
      errors.push({
        field: 'projectId',
        message: 'Project ID is required',
        value: input.projectId
      });
    }

    if (!input.startDate) {
      errors.push({
        field: 'startDate',
        message: 'Start date is required',
        value: input.startDate
      });
    }

    if (!input.endDate) {
      errors.push({
        field: 'endDate',
        message: 'End date is required',
        value: input.endDate
      });
    }

    if (input.startDate && input.endDate && input.startDate >= input.endDate) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date',
        value: input.endDate
      });
    }

    if (input.allocatedHours !== undefined && input.allocatedHours <= 0) {
      errors.push({
        field: 'allocatedHours',
        message: 'Allocated hours must be greater than 0',
        value: input.allocatedHours
      });
    }

    if (input.allocatedHours !== undefined && input.allocatedHours > 1000) {
      errors.push({
        field: 'allocatedHours',
        message: 'Allocated hours seems unreasonably high (>1000)',
        value: input.allocatedHours
      });
    }

    if (!input.roleOnProject || input.roleOnProject.trim().length === 0) {
      errors.push({
        field: 'roleOnProject',
        message: 'Role on project is required',
        value: input.roleOnProject
      });
    }

    return errors;
  }

  private async validateBusinessRules(input: CreateResourceAllocationInput): Promise<void> {
    // Check if project dates are valid
    const projectResult = await this.db.query(
      'SELECT start_date, end_date FROM projects WHERE id = $1',
      [input.projectId]
    );

    if (projectResult.rows.length > 0) {
      const project = projectResult.rows[0];
      if (input.startDate < new Date(project.start_date)) {
        throw new Error('Allocation start date cannot be before project start date');
      }
      if (project.end_date && input.endDate > new Date(project.end_date)) {
        throw new Error('Allocation end date cannot be after project end date');
      }
    }

    // Check if employee is active
    const employeeResult = await this.db.query(
      'SELECT is_active FROM employees WHERE id = $1',
      [input.employeeId]
    );

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      if (!employee.is_active) {
        throw new Error('Cannot allocate to inactive employee');
      }
    }

    // Check for overlapping allocations
    if (input.startDate && input.endDate) {
      const overlapResult = await this.db.query(`
        SELECT id FROM resource_allocations
        WHERE employee_id = $1
        AND status IN ('active', 'planned')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      `, [input.employeeId, input.startDate, input.endDate]);

      if (overlapResult.rows.length > 0) {
        throw new Error('Employee has overlapping allocations in this date range');
      }
    }
  }

  /**
   * Check for over-allocation warnings when creating an allocation
   */
  static async checkOverAllocationWarnings(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    allocatedHours: number
  ): Promise<OverAllocationWarning[]> {
    // Get weeks that overlap with the allocation period
    const warnings: OverAllocationWarning[] = [];
    const weeks = OverAllocationWarningService['getWeeksBetween'](startDate, endDate);
    
    for (const week of weeks) {
      const warning = await OverAllocationWarningService.checkWeeklyOverAllocation(
        employeeId,
        week.weekStartDate,
        week.weekEndDate
      );
      
      if (warning) {
        warnings.push(warning);
      }
    }
    
    return warnings;
  }

  /**
   * Get over-allocation summary for schedule view
   */
  static async getOverAllocationSummary(
    startDate: Date,
    endDate: Date
  ) {
    return OverAllocationWarningService.getScheduleViewWarnings(startDate, endDate);
  }

  /**
   * Export allocations to CSV format using real database data
   */
  static async exportAllocationsToCSV(options: {
    startDate?: Date;
    endDate?: Date;
    includeEnhancedFields?: boolean;
    includeSummary?: boolean;
    employeeId?: string;
    projectId?: string;
  } = {}): Promise<string> {
    const { AllocationCSVExportService } = await import('./allocation-csv-export.service');
    return AllocationCSVExportService.exportAllocationsToCSV(options);
  }

  // Static method wrappers for route compatibility
  static async getEmployeeAllocations(
    employeeId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    return AllocationModel.findByEmployeeId(employeeId, filters, page, limit);
  }

  static async getAllocation(id: string): Promise<ResourceAllocation | null> {
    return AllocationModel.findById(id);
  }

  static async getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    return AllocationModel.findByIdWithDetails(id);
  }

  static async createAllocation(input: CreateResourceAllocationInput, force: boolean = false): Promise<ResourceAllocation> {
    return AllocationModel.create(input);
  }

  static async updateAllocation(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation> {
    return AllocationModel.update(id, updates);
  }

  static async deleteAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationModel.delete(id);
  }
}
