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
import { AllocationModel, AllocationOverlap, CapacityMetrics, AllocationStatus } from '../models/allocation.model';
import { EmployeeModel } from '../models/Employee';
import { ProjectModel } from '../models/Project';

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
  
  static async createAllocation(input: CreateResourceAllocationInput, force: boolean = false): Promise<ResourceAllocation> {
    // Validate input data
    const validationErrors = this.validateAllocationInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Validate that employee and project exist
    const employee = await EmployeeModel.findById(input.employeeId);
    if (!employee) {
      throw new DatabaseError('Employee not found');
    }

    const project = await ProjectModel.findById(input.projectId);
    if (!project) {
      throw new DatabaseError('Project not found');
    }

    // Check business rules
    await this.validateBusinessRules(input);

    if (force) {
      return AllocationModel.createForced(input);
    }

    return AllocationModel.create(input);
  }

  static async getAllocation(id: string): Promise<ResourceAllocation | null> {
    return AllocationModel.findById(id);
  }

  static async getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    return AllocationModel.findByIdWithDetails(id);
  }

  static async getEmployeeAllocations(
    employeeId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    // Validate employee exists
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      throw new DatabaseError('Employee not found');
    }

    return AllocationModel.findByEmployeeId(employeeId, filters, page, limit);
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

  static async updateAllocation(
    id: string, 
    updates: UpdateResourceAllocationInput
  ): Promise<ResourceAllocation> {
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
        throw new DatabaseError(
          `Date update would create conflicts with ${conflicts.length} existing allocation(s)`
        );
      }
    }

    return AllocationModel.update(id, updates);
  }

  static async deleteAllocation(id: string): Promise<ResourceAllocation> {
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
    return AllocationModel.updateStatus(id, AllocationStatus.CONFIRMED);
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

  private static async validateBusinessRules(input: CreateResourceAllocationInput): Promise<void> {
    // Check if project dates are valid
    const project = await ProjectModel.findById(input.projectId);
    if (project) {
      if (input.startDate < project.startDate) {
        throw new DatabaseError('Allocation start date cannot be before project start date');
      }
      if (input.endDate > project.endDate) {
        throw new DatabaseError('Allocation end date cannot be after project end date');
      }
    }

    // Check if employee is active
    const employee = await EmployeeModel.findById(input.employeeId);
    if (employee && !employee.isActive) {
      throw new DatabaseError('Cannot allocate to inactive employee');
    }
  }
}