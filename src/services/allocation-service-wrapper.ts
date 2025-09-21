/**
 * Wrapper for AllocationService to make it compatible with dependency injection
 * Since AllocationService uses static methods, this wrapper provides instance methods
 */

import { AllocationService } from './allocation.service';
import {
  ResourceAllocation,
  CreateResourceAllocationInput,
  UpdateResourceAllocationInput,
  ResourceAllocationWithDetails,
  ResourceAllocationFilters,
  PaginatedResponse,
  OverAllocationWarning
} from '../types';
import { AllocationConflictReport, CapacityValidationResult, UtilizationSummary } from './allocation.service';
import { CapacityMetrics } from '../models/working-allocation.model';

export class AllocationServiceWrapper {

  constructor() {
    // No database dependency needed since AllocationService manages its own dependencies
  }

  async createAllocation(input: CreateResourceAllocationInput, force: boolean = false): Promise<ResourceAllocation> {
    return AllocationService.createAllocation(input, force);
  }

  async getAllocation(id: string): Promise<ResourceAllocation | null> {
    return AllocationService.getAllocation(id);
  }

  async getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null> {
    return AllocationService.getAllocationWithDetails(id);
  }

  async getEmployeeAllocations(
    employeeId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    return AllocationService.getEmployeeAllocations(employeeId, filters, page, limit);
  }

  async getProjectAllocations(
    projectId: string,
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    return AllocationService.getProjectAllocations(projectId, filters, page, limit);
  }

  async getAllAllocations(
    filters: ResourceAllocationFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<ResourceAllocation>> {
    return AllocationService.getAllAllocations(filters, page, limit);
  }

  async updateAllocation(
    id: string,
    updates: UpdateResourceAllocationInput
  ): Promise<ResourceAllocation> {
    return AllocationService.updateAllocation(id, updates);
  }

  async deleteAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationService.deleteAllocation(id);
  }

  async checkAllocationConflicts(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeAllocationId?: string
  ): Promise<AllocationConflictReport> {
    return AllocationService.checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId);
  }

  async validateCapacity(
    employeeId: string,
    allocatedHours: number,
    startDate: Date,
    endDate: Date,
    excludeAllocationId?: string
  ): Promise<CapacityValidationResult> {
    return AllocationService.validateCapacity(employeeId, allocatedHours, startDate, endDate, excludeAllocationId);
  }

  async getUtilizationSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<UtilizationSummary> {
    return AllocationService.getUtilizationSummary(startDate, endDate);
  }

  async getCapacityMetrics(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CapacityMetrics[]> {
    return AllocationService.getCapacityMetrics(employeeId, startDate, endDate);
  }

  async confirmAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationService.confirmAllocation(id);
  }

  async completeAllocation(id: string, actualHours?: number): Promise<ResourceAllocation> {
    return AllocationService.completeAllocation(id, actualHours);
  }

  async cancelAllocation(id: string): Promise<ResourceAllocation> {
    return AllocationService.cancelAllocation(id);
  }

  async checkOverAllocationWarnings(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    allocatedHours: number
  ): Promise<OverAllocationWarning[]> {
    return AllocationService.checkOverAllocationWarnings(employeeId, startDate, endDate, allocatedHours);
  }

  async getOverAllocationSummary(
    startDate: Date,
    endDate: Date
  ) {
    return AllocationService.getOverAllocationSummary(startDate, endDate);
  }

  async exportAllocationsToCSV(options: {
    startDate?: Date;
    endDate?: Date;
    includeEnhancedFields?: boolean;
    includeSummary?: boolean;
    employeeId?: string;
    projectId?: string;
  } = {}): Promise<string> {
    return AllocationService.exportAllocationsToCSV(options);
  }
}