export const __esModule: boolean;
export class ProjectModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByIdWithDetails(id: any): Promise<{
        manager: any;
        allocations: any;
        skillRequirements: any;
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}, page?: number, limit?: number): Promise<{
        data: any;
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    static update(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getProjectStatistics(): Promise<{
        totalProjects: number;
        activeProjects: number;
        projectsByStatus: any;
        averageEstimatedHours: number;
        averageCompletionRate: number;
    }>;
    static getResourceAllocationSummary(projectId: any): Promise<any>;
    static getProjectTimeline(projectId: any): Promise<any>;
    static mapRow(row: any): {
        id: any;
        name: any;
        description: any;
        status: any;
        priority: any;
        clientId: any;
        startDate: any;
        endDate: any;
        estimatedHours: number;
        managerId: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    };
}
export namespace ProjectModel {
    let pool: any;
    let db: any;
}
//# sourceMappingURL=Project.d.ts.map