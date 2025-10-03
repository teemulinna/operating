export const __esModule: boolean;
export class AllocationServiceWrapper {
    createAllocation(input: any, force?: boolean): Promise<{
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
    getAllocation(id: any): Promise<{
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
    getEmployeeAllocations(employeeId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getProjectAllocations(projectId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getAllAllocations(filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateAllocation(id: any, updates: any): Promise<{
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
    deleteAllocation(id: any): Promise<{
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
    checkAllocationConflicts(employeeId: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<{
        hasConflicts: boolean;
        conflicts: any;
        suggestions: string[];
    }>;
    validateCapacity(employeeId: any, allocatedHours: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<{
        isValid: boolean;
        warnings: string[];
        maxCapacityHours: number;
        currentAllocatedHours: any;
        utilizationRate: number;
    }>;
    getUtilizationSummary(startDate: any, endDate: any): Promise<{
        totalEmployees: any;
        averageUtilization: number;
        overutilizedCount: any;
        underutilizedCount: any;
        totalAllocations: any;
        conflictsCount: any;
    }>;
    getCapacityMetrics(employeeId: any, startDate: any, endDate: any): Promise<any>;
    confirmAllocation(id: any): Promise<{
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
    completeAllocation(id: any, actualHours: any): Promise<{
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
    cancelAllocation(id: any): Promise<{
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
    checkOverAllocationWarnings(employeeId: any, startDate: any, endDate: any, allocatedHours: any): Promise<{
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
    getOverAllocationSummary(startDate: any, endDate: any): Promise<{
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
    exportAllocationsToCSV(options?: {}): Promise<string>;
}
//# sourceMappingURL=allocation-service-wrapper.d.ts.map