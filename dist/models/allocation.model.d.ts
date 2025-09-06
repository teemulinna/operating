import { Pool } from 'pg';
import { ResourceAllocation, CreateResourceAllocationInput, UpdateResourceAllocationInput, ResourceAllocationWithDetails, ResourceAllocationFilters, PaginatedResponse } from '../types';
export interface AllocationOverlap {
    allocationId: number;
    projectName: string;
    startDate: Date;
    endDate: Date;
    allocatedHours: number;
}
export interface CapacityMetrics {
    employeeId: string;
    totalAllocatedHours: number;
    utilizationRate: number;
    conflictCount: number;
    activeAllocations: number;
}
export declare enum AllocationStatus {
    TENTATIVE = "tentative",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare class AllocationModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateResourceAllocationInput): Promise<ResourceAllocation>;
    static createForced(input: CreateResourceAllocationInput): Promise<ResourceAllocation>;
    static findById(id: string): Promise<ResourceAllocation | null>;
    static findByIdWithDetails(id: string): Promise<ResourceAllocationWithDetails | null>;
    static findByEmployeeId(employeeId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static findByProjectId(projectId: string, filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static findAll(filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static update(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
    static delete(id: string): Promise<ResourceAllocation>;
    static checkOverlaps(employeeId: string, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<AllocationOverlap[]>;
    static getUtilizationMetrics(employeeId?: string, startDate?: Date, endDate?: Date): Promise<CapacityMetrics[]>;
    static updateStatus(id: string, status: AllocationStatus): Promise<ResourceAllocation>;
    private static mapRow;
}
//# sourceMappingURL=allocation.model.d.ts.map