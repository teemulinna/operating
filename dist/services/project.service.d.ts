import { Project, CreateProjectInput, UpdateProjectInput, ProjectFilters, PaginatedResponse, ProjectStatus, ProjectStatistics } from '../types';
export declare class ProjectService {
    createProject(input: CreateProjectInput): Promise<Project>;
    getProjectById(id: string): Promise<Project | null>;
    updateProject(id: string, input: UpdateProjectInput): Promise<Project>;
    deleteProject(id: string): Promise<Project>;
    getProjects(filters?: ProjectFilters, page?: number, limit?: number, sortBy?: string, sortOrder?: 'ASC' | 'DESC'): Promise<PaginatedResponse<Project>>;
    getProjectStatistics(): Promise<ProjectStatistics>;
    private validateProjectInput;
    private validateProjectUpdate;
    private validateStatusTransition;
    calculateBudgetUtilization(projectId: string): Promise<number>;
    getProjectsByStatus(status: ProjectStatus): Promise<Project[]>;
    getProjectsByClient(clientName: string): Promise<Project[]>;
    getActiveProjects(): Promise<Project[]>;
    calculateProjectDuration(startDate: Date, endDate: Date): number;
    isProjectOverdue(project: Project): boolean;
    getOverdueProjects(): Promise<Project[]>;
}
//# sourceMappingURL=project.service.d.ts.map