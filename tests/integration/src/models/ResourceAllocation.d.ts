export const __esModule: boolean;
export class ResourceAllocationModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByIdWithDetails(id: any): Promise<{
        project: any;
        employee: any;
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByProject(projectId: any): Promise<any>;
    static findByEmployee(employeeId: any): Promise<any>;
    static findOverlapping(employeeId: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<any>;
    static findAll(filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static update(id: any, updates: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getUtilizationByEmployee(dateFrom: any, dateTo: any, departmentId: any): Promise<any>;
    static getCapacityConflicts(dateFrom: any, dateTo: any): Promise<any>;
    static getBillableHoursSummary(dateFrom: any, dateTo: any): Promise<any>;
    static mapRow(row: any): {
        id: any;
        projectId: any;
        employeeId: any;
        allocatedHours: number;
        roleOnProject: any;
        startDate: any;
        endDate: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=ResourceAllocation.d.ts.map