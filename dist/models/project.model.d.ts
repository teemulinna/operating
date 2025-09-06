import { Pool } from 'pg';
import { Project, CreateProjectInput, UpdateProjectInput, ProjectFilters, PaginatedResponse, ProjectStatistics } from '../types';
export declare class ProjectModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateProjectInput): Promise<Project>;
    static findById(id: string): Promise<Project | null>;
    static findByName(name: string): Promise<Project | null>;
    static findAll(filters?: ProjectFilters, page?: number, limit?: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<PaginatedResponse<Project>>;
    static update(id: string, updates: UpdateProjectInput): Promise<Project>;
    static delete(id: string): Promise<Project>;
    static getProjectStatistics(): Promise<ProjectStatistics>;
    private static mapRow;
    static searchByName(searchTerm: string, limit?: number): Promise<Project[]>;
    static getProjectsInDateRange(startDate: Date, endDate: Date): Promise<Project[]>;
    static getProjectsGroupedByStatus(): Promise<Record<string, Project[]>>;
}
//# sourceMappingURL=project.model.d.ts.map