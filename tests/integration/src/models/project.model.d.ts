export const __esModule: boolean;
export class ProjectModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        name: any;
        description: any;
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByName(name: any): Promise<{
        id: any;
        name: any;
        description: any;
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}, page?: number, limit?: number, sortBy?: string, sortOrder?: string): Promise<{
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
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getProjectStatistics(): Promise<{
        totalProjects: number;
        projectsByStatus: {
            planning: number;
            active: number;
            completed: number;
            'on-hold': number;
        };
        totalBudget: number;
        averageBudget: number;
        averageHourlyRate: number;
    }>;
    static mapRow(row: any): {
        id: any;
        name: any;
        description: any;
        clientName: any;
        status: any;
        startDate: any;
        endDate: any;
        createdBy: any;
        createdAt: any;
        updatedAt: any;
    };
    static searchByName(searchTerm: any, limit?: number): Promise<any>;
    static getProjectsInDateRange(startDate: any, endDate: any): Promise<any>;
    static getProjectsGroupedByStatus(): Promise<any>;
}
//# sourceMappingURL=project.model.d.ts.map