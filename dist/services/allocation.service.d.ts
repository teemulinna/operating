import { ResourceAllocation, CreateResourceAllocationInput, UpdateResourceAllocationInput, ResourceAllocationWithDetails, ResourceAllocationFilters, PaginatedResponse } from '../types';
import { AllocationOverlap, CapacityMetrics } from '../models/allocation.model';
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
export declare class AllocationService {
    static createAllocation(input: CreateResourceAllocationInput, force?: boolean): Promise<ResourceAllocation>;
    static getAllocation(id: string): Promise<ResourceAllocation | null>;
    static getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null>;
    static getEmployeeAllocations(employeeId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static getProjectAllocations(projectId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static getAllAllocations(filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static updateAllocation(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
    static deleteAllocation(id: string): Promise<ResourceAllocation>;
    static checkAllocationConflicts(employeeId: string, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<AllocationConflictReport>;
    static validateCapacity(employeeId: string, allocatedHours: number, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<CapacityValidationResult>;
    static getUtilizationSummary(startDate?: Date, endDate?: Date): Promise<UtilizationSummary>;
    static getCapacityMetrics(employeeId?: string, startDate?: Date, endDate?: Date): Promise<CapacityMetrics[]>;
    static confirmAllocation(id: string): Promise<ResourceAllocation>;
    static completeAllocation(id: string, actualHours?: number): Promise<ResourceAllocation>;
    static cancelAllocation(id: string): Promise<ResourceAllocation>;
    private static validateAllocationInput;
    private static validateBusinessRules;
}
//# sourceMappingURL=allocation.service.d.ts.map