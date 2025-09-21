import { Pool } from 'pg';
import { Project, CreateProjectInput, UpdateProjectInput, ProjectWithDetails, ProjectStatus, ProjectFilters, PaginatedResponse } from '../types';
export declare class ProjectModel {
    private static pool;
    private static db;
    static initialize(pool: Pool): void;
    static create(input: CreateProjectInput): Promise<Project>;
    static findById(id: string): Promise<Project | null>;
    static findByIdWithDetails(id: string): Promise<ProjectWithDetails | null>;
    static findAll(filters?: ProjectFilters, page?: number, limit?: number): Promise<PaginatedResponse<Project>>;
    static update(id: string, updates: UpdateProjectInput): Promise<Project>;
    static delete(id: string): Promise<Project>;
    static getProjectStatistics(): Promise<{
        totalProjects: number;
        activeProjects: number;
        projectsByStatus: Record<ProjectStatus, number>;
        averageEstimatedHours: number;
        averageCompletionRate: number;
    }>;
    static getResourceAllocationSummary(projectId: string): Promise<Array<{
        employeeId: string;
        employeeName: string;
        allocatedHours: number;
        actualHours: number;
        hourlyRate: number;
        totalCost: number;
    }>>;
    static getProjectTimeline(projectId: string): Promise<Array<{
        date: Date;
        milestone: string;
        description: string;
        completed: boolean;
    }>>;
    private static mapRow;
}
//# sourceMappingURL=Project.d.ts.map