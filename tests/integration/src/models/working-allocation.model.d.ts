export const __esModule: boolean;
export const AllocationStatus: {};
export class WorkingAllocationModel {
    static initialize(): Promise<void>;
    static create(input: any): Promise<{
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
    static createForced(input: any): Promise<{
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
    static findById(id: any): Promise<{
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
    static findByIdWithDetails(id: any): Promise<{
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
    static findByEmployeeId(employeeId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static findByProjectId(projectId: any, filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
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
        roleOnProject: string;
        startDate: any;
        endDate: any;
        isActive: boolean;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
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
    static checkOverlaps(employeeId: any, startDate: any, endDate: any, excludeAllocationId: any): Promise<any>;
    static getUtilizationMetrics(employeeId: any, startDate: any, endDate: any): Promise<any>;
    static updateStatus(id: any, status: any): Promise<{
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
    static mapRowFromAssignment(row: any, roleOnProject?: string): {
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
    };
}
export namespace WorkingAllocationModel {
    let db: any;
}
//# sourceMappingURL=working-allocation.model.d.ts.map