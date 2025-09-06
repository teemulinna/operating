import { Pool } from 'pg';
import { ResourceAllocation, CreateResourceAllocationInput, UpdateResourceAllocationInput, ResourceAllocationWithDetails, ResourceAllocationFilters, PaginatedResponse, Employee, Project } from '../types';
export declare class ResourceAllocationModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateResourceAllocationInput): Promise<ResourceAllocation>;
    static findById(id: string): Promise<ResourceAllocation | null>;
    static findByIdWithDetails(id: string): Promise<ResourceAllocationWithDetails | null>;
    static findByProject(projectId: string): Promise<Array<ResourceAllocation & {
        employee: Employee;
    }>>;
    static findByEmployee(employeeId: string): Promise<Array<ResourceAllocation & {
        project: Project;
    }>>;
    static findOverlapping(employeeId: string, startDate: Date, endDate: Date, excludeAllocationId?: string): Promise<ResourceAllocation[]>;
    static findAll(filters?: ResourceAllocationFilters, page?: number, limit?: number): Promise<PaginatedResponse<ResourceAllocation>>;
    static update(id: string, updates: UpdateResourceAllocationInput): Promise<ResourceAllocation>;
    static delete(id: string): Promise<ResourceAllocation>;
    static getUtilizationByEmployee(dateFrom: Date, dateTo: Date, departmentId?: string): Promise<Array<{
        employeeId: string;
        employeeName: string;
        totalAllocatedHours: number;
        totalActualHours: number;
        activeProjects: number;
        utilizationRate: number;
    }>>;
    static getCapacityConflicts(dateFrom: Date, dateTo: Date): Promise<Array<{
        employeeId: string;
        employeeName: string;
        conflictDate: Date;
        totalAllocatedHours: number;
        maxCapacityHours: number;
        overAllocation: number;
    }>>;
    static getBillableHoursSummary(dateFrom: Date, dateTo: Date): Promise<Array<{
        projectId: string;
        projectName: string;
        totalAllocatedHours: number;
        totalActualHours: number;
        totalBillableAmount: number;
        completionRate: number;
    }>>;
    private static mapRow;
}
//# sourceMappingURL=ResourceAllocation.d.ts.map