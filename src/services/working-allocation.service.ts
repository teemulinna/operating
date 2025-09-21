import { 
  ResourceAllocation, 
  CreateResourceAllocationInput, 
  UpdateResourceAllocationInput,
  ResourceAllocationWithDetails,
  ResourceAllocationFilters,
  PaginatedResponse,
  ValidationError,
  DatabaseError
} from '../types';
import { WorkingAllocationModel as AllocationModel, AllocationOverlap, CapacityMetrics, AllocationStatus } from '../models/working-allocation.model';
import { DatabaseService } from '../database/database.service';

export interface AllocationConflictReport {
  hasConflicts: boolean;
  conflicts: AllocationOverlap[];
  suggestions: string[];
}

export interface CapacityValidationResult {
  isValid: boolean;
  warnings: string[];
  maxCapacityPercentage: number;
  currentAllocatedPercentage: number;
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

export class WorkingAllocationService {
  private static db = DatabaseService.getInstance();
  
  static async createAllocation(input: CreateResourceAllocationInput, force: boolean = false): Promise<ResourceAllocation> {
    // Initialize the model
    await AllocationModel.initialize();
    
    // Validate input data
    const validationErrors = this.validateAllocationInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Validate that employee and project exist
    await this.validateEmployeeExists(input.employeeId);
    await this.validateProjectExists(input.projectId);

    // Check business rules
    await this.validateBusinessRules(input);

    if (force) {
      return AllocationModel.createForced(input);
    }

    return AllocationModel.create(input);
  }

  static async getAllocation(id: string): Promise<ResourceAllocation | null> {
    await AllocationModel.initialize();
    return AllocationModel.findById(id);
  }

  static async getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    await AllocationModel.initialize();
    return AllocationModel.findByIdWithDetails(id);
  }

  static async getEmployeeAllocations(
    employeeId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    await AllocationModel.initialize();
    
    // Validate employee exists
    await this.validateEmployeeExists(employeeId);

    return AllocationModel.findByEmployeeId(employeeId, filters, page, limit);
  }

  static async getProjectAllocations(
    projectId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    await AllocationModel.initialize();
    
    // Validate project exists
    await this.validateProjectExists(projectId);

    return AllocationModel.findByProjectId(projectId, filters, page, limit);
  }

  static async getAllAllocations(
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    await AllocationModel.initialize();
    return AllocationModel.findAll(filters, page, limit);
  }

  static async updateAllocation(
    id: string, 
    updates: UpdateResourceAllocationInput
  ): Promise<ResourceAllocation> {
    await AllocationModel.initialize();
    
    // Get current allocation
    const currentAllocation = await AllocationModel.findById(id);
    if (!currentAllocation) {
      throw new DatabaseError('Allocation not found');
    }

    // Validate date changes don't create conflicts
    if (updates.startDate || updates.endDate) {
      const startDate = updates.startDate || currentAllocation.startDate;
      const endDate = updates.endDate || currentAllocation.endDate;

      const conflicts = await AllocationModel.checkOverlaps(
        currentAllocation.employeeId,
        startDate,
        endDate,
        id // Exclude current allocation
      );

      if (conflicts.length > 0) {
        const totalPercentage = conflicts.reduce((sum, c) => sum + c.allocatedPercentage, 0);
        if (totalPercentage > 100) {
          throw new DatabaseError(
            `Date update would create conflicts with ${conflicts.length} existing allocation(s). Total allocation would be ${totalPercentage.toFixed(1)}%`
          );
        }
      }
    }

    return AllocationModel.update(id, updates);
  }

  static async deleteAllocation(id: string): Promise<ResourceAllocation> {
    await AllocationModel.initialize();
    
    const allocation = await AllocationModel.findById(id);
    if (!allocation) {
      throw new DatabaseError('Allocation not found');
    }

    return AllocationModel.delete(id);
  }

  static async checkAllocationConflicts(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeAllocationId?: string
  ): Promise<AllocationConflictReport> {
    await AllocationModel.initialize();
    
    const conflicts = await AllocationModel.checkOverlaps(
      employeeId,
      startDate,
      endDate,
      excludeAllocationId
    );

    const suggestions: string[] = [];

    if (conflicts.length > 0) {
      const totalPercentage = conflicts.reduce((sum, c) => sum + c.allocatedPercentage, 0);
      
      suggestions.push(`Found ${conflicts.length} conflicting allocation(s) totaling ${totalPercentage.toFixed(1)}% allocation`);
      
      for (const conflict of conflicts) {
        const daysOverlap = Math.abs(
          Math.min(endDate.getTime(), conflict.endDate.getTime()) -
          Math.max(startDate.getTime(), conflict.startDate.getTime())
        ) / (1000 * 60 * 60 * 24);
        
        suggestions.push(
          `Conflict with "${conflict.projectName}" (${conflict.startDate.toISOString().split('T')[0]} to ${conflict.endDate.toISOString().split('T')[0]}, ${daysOverlap} days overlap, ${conflict.allocatedPercentage.toFixed(1)}% allocation)`
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
    await AllocationModel.initialize();
    
    const warnings: string[] = [];
    const maxCapacityPercentage = 100; // 100% capacity
    const requestedPercentage = (allocatedHours / 40) * 100;

    // Get current allocations for the employee in the date range
    const metrics = await AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
    const employeeMetrics = metrics.find(m => m.employeeId === employeeId);

    const currentAllocatedPercentage = employeeMetrics?.totalAllocatedPercentage || 0;
    const totalPercentage = currentAllocatedPercentage + requestedPercentage;

    // Check for over-allocation
    if (totalPercentage > 100) {
      warnings.push(`Over-allocation detected: ${totalPercentage.toFixed(1)}% capacity (max 100%)`);
    } else if (totalPercentage > 80) {
      warnings.push(`High utilization: ${totalPercentage.toFixed(1)}% capacity`);
    }

    // Check for conflicts
    const conflicts = await AllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
    if (conflicts.length > 0) {
      warnings.push(`${conflicts.length} scheduling conflict(s) detected`);
    }

    return {
      isValid: totalPercentage <= 100 && conflicts.length === 0,
      warnings,
      maxCapacityPercentage,
      currentAllocatedPercentage,
      utilizationRate: totalPercentage
    };
  }

  static async getUtilizationSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<UtilizationSummary> {
    await AllocationModel.initialize();
    
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
    await AllocationModel.initialize();
    return AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
  }

  static async confirmAllocation(id: string): Promise<ResourceAllocation> {
    await AllocationModel.initialize();
    return AllocationModel.updateStatus(id, AllocationStatus.ACTIVE);
  }

  static async completeAllocation(id: string, actualHours?: number): Promise<ResourceAllocation> {
    await AllocationModel.initialize();
    
    if (actualHours !== undefined) {
      await AllocationModel.update(id, { actualHours });
    }
    return AllocationModel.updateStatus(id, AllocationStatus.COMPLETED);
  }

  static async cancelAllocation(id: string): Promise<ResourceAllocation> {
    await AllocationModel.initialize();
    return AllocationModel.updateStatus(id, AllocationStatus.CANCELLED);
  }

  private static validateAllocationInput(input: CreateResourceAllocationInput): ValidationError[] {
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

    if (input.allocatedHours <= 0) {
      errors.push({
        field: 'allocatedHours',
        message: 'Allocated hours must be greater than 0',
        value: input.allocatedHours
      });
    }

    if (input.allocatedHours > 1000) {
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

  private static async validateEmployeeExists(employeeId: string): Promise<void> {
    await this.db.connect();
    const result = await this.db.query('SELECT id FROM employees WHERE id = $1 AND is_active = true', [employeeId]);
    if (result.rows.length === 0) {
      throw new DatabaseError('Employee not found or inactive');
    }
  }

  private static async validateProjectExists(projectId: string): Promise<void> {
    await this.db.connect();
    const result = await this.db.query('SELECT id FROM projects WHERE id = $1', [parseInt(projectId)]);
    if (result.rows.length === 0) {
      throw new DatabaseError('Project not found');
    }
  }

  private static async validateBusinessRules(input: CreateResourceAllocationInput): Promise<void> {
    await this.db.connect();
    
    // Check if project dates are valid
    const projectResult = await this.db.query('SELECT start_date, end_date FROM projects WHERE id = $1', [parseInt(input.projectId)]);
    if (projectResult.rows.length > 0) {
      const project = projectResult.rows[0];
      if (input.startDate < project.start_date) {
        throw new DatabaseError('Allocation start date cannot be before project start date');
      }
      if (input.endDate > project.end_date) {
        throw new DatabaseError('Allocation end date cannot be after project end date');
      }
    }

    // Check if employee is active
    const employeeResult = await this.db.query('SELECT is_active FROM employees WHERE id = $1', [input.employeeId]);
    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];
      if (!employee.is_active) {
        throw new DatabaseError('Cannot allocate to inactive employee');
      }
    }
  }
}