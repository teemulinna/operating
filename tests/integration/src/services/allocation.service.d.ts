export const __esModule: boolean;
export class AllocationService {
    static getProjectAllocations(projectId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static getAllAllocations(filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static checkAllocationConflicts(employeeId: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<{
        hasConflicts: boolean;
        conflicts: any;
        suggestions: string[];
    }>;
    static validateCapacity(employeeId: any, allocatedHours: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<{
        isValid: boolean;
        warnings: string[];
        maxCapacityHours: number;
        currentAllocatedHours: any;
        utilizationRate: number;
    }>;
    static getUtilizationSummary(startDate: any, endDate: any): Promise<{
        totalEmployees: any;
        averageUtilization: number;
        overutilizedCount: any;
        underutilizedCount: any;
        totalAllocations: any;
        conflictsCount: any;
    }>;
    static getCapacityMetrics(employeeId: any, startDate: any, endDate: any): Promise<any>;
    static confirmAllocation(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static completeAllocation(id: any, actualHours: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static cancelAllocation(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static checkOverAllocationWarnings(employeeId: any, startDate: any, endDate: any, allocatedHours: any): Promise<{
        employeeId: any;
        employeeName: string;
        weekStartDate: any;
        weekEndDate: any;
        weeklyCapacity: any;
        allocatedHours: any;
        overAllocationHours: number;
        utilizationRate: number;
        severity: any;
        message: string;
        suggestions: string[];
        affectedAllocations: any;
    }[]>;
    static getOverAllocationSummary(startDate: any, endDate: any): Promise<{
        hasOverAllocations: boolean;
        totalWarnings: number;
        totalCritical: number;
        warnings: {
            employeeId: any;
            employeeName: string;
            weekStartDate: any;
            weekEndDate: any;
            weeklyCapacity: any;
            allocatedHours: any;
            overAllocationHours: number;
            utilizationRate: number;
            severity: any;
            message: string;
            suggestions: string[];
            affectedAllocations: any;
        }[];
        weeklyBreakdown: {
            weekStartDate: Date;
            weekEndDate: any;
            warningCount: number;
            criticalCount: number;
        }[];
    }>;
    static getWeeksBetween(startDate: any, endDate: any): {
        weekStartDate: Date;
        weekEndDate: Date;
    }[];
    static exportAllocationsToCSV(options?: {}): Promise<string>;
    static getEmployeeAllocations(employeeId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static getAllocation(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static getAllocationWithDetails(id: any): Promise<{
        employee: any;
        project: any;
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static createAllocation(input: any, force?: boolean): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static updateAllocation(id: any, updates: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static deleteAllocation(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    constructor(db: any);
    db: any;
    createAllocation(input: any, force?: boolean): Promise<any>;
    getAllocationById(id: any): Promise<any>;
    getAllocationWithDetails(id: any): Promise<{
        employee: any;
        project: any;
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    } | null>;
    getAllocations(filters?: {}): Promise<{
        data: any;
        total: any;
        page: any;
        limit: any;
    }>;
    updateAllocation(id: any, updates: any): Promise<any>;
    deleteAllocation(id: any): Promise<any>;
    validateAllocationInput(input: any): {
        field: string;
        message: string;
        value: any;
    }[];
    validateBusinessRules(input: any): Promise<void>;
}
export namespace AllocationService {
    let overAllocationService: over_allocation_warning_service_1.OverAllocationWarningService;
}
import over_allocation_warning_service_1 = require("./over-allocation-warning.service");
//# sourceMappingURL=allocation.service.d.ts.map