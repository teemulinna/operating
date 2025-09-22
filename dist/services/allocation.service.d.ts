import { ResourceAllocation, CreateResourceAllocationInput, UpdateResourceAllocationInput, ResourceAllocationWithDetails, ResourceAllocationFilters, PaginatedResponse, OverAllocationWarning } from '../types';
import { AllocationOverlap, CapacityMetrics } from '../models/working-allocation.model';
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
    private db;
    constructor(db: any);
    createAllocation(input: CreateResourceAllocationInput, force?: boolean): Promise<ResourceAllocation>;
    getAllocationById(id: string | number): Promise<ResourceAllocation | null>;
    getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null>;
    getAllocations(filters?: any): Promise<any>;
    static getProjectAllocations(projectId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static getAllAllocations(filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    updateAllocation(id: string | number, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
    deleteAllocation(id: string | number): Promise<ResourceAllocation>;
    static checkAllocationConflicts(employeeId: string, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<AllocationConflictReport>;
    static validateCapacity(employeeId: string, allocatedHours: number, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<CapacityValidationResult>;
    static getUtilizationSummary(startDate?: Date, endDate?: Date): Promise<UtilizationSummary>;
    static getCapacityMetrics(employeeId?: string, startDate?: Date, endDate?: Date): Promise<CapacityMetrics[]>;
    static confirmAllocation(id: string): Promise<ResourceAllocation>;
    static completeAllocation(id: string, actualHours?: number): Promise<ResourceAllocation>;
    static cancelAllocation(id: string): Promise<ResourceAllocation>;
    private validateAllocationInput;
    private validateBusinessRules;
    static checkOverAllocationWarnings(employeeId: string, startDate: Date, endDate: Date, allocatedHours: number): Promise<OverAllocationWarning[]>;
    static getOverAllocationSummary(startDate: Date, endDate: Date): Promise<any>;
    static exportAllocationsToCSV(options?: {
        startDate?: Date;
        endDate?: Date;
        includeEnhancedFields?: boolean;
        includeSummary?: boolean;
        employeeId?: string;
        projectId?: string;
    }): Promise<string>;
    static getEmployeeAllocations(employeeId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static getAllocation(id: string): Promise<ResourceAllocation | null>;
    static getAllocationWithDetails(id: string): Promise<ResourceAllocationWithDetails | null>;
    static createAllocation(input: CreateResourceAllocationInput, force?: boolean): Promise<ResourceAllocation>;
    static updateAllocation(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
    static deleteAllocation(id: string): Promise<ResourceAllocation>;
}
//# sourceMappingURL=allocation.service.d.ts.map