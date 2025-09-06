interface ProjectData {
    name: string;
    description?: string;
    client_name?: string;
    start_date: string;
    end_date?: string;
    status?: string;
    priority?: string;
    budget?: number;
    estimated_hours?: number;
}
interface ProjectRoleData {
    project_id: number;
    role_name: string;
    description?: string;
    required_skills?: string[];
    minimum_experience_level?: string;
    start_date: string;
    end_date?: string;
    planned_allocation_percentage: number;
    estimated_hours?: number;
    hourly_rate?: number;
    max_assignments?: number;
}
interface ProjectFilters {
    status?: string;
    priority?: string;
    clientName?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}
interface PaginationParams {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: string;
}
export declare class ProjectService {
    private db;
    constructor();
    createProject(projectData: ProjectData): Promise<any>;
    getProjects(filters: ProjectFilters, pagination: PaginationParams): Promise<any>;
    getProjectById(projectId: number): Promise<any>;
    updateProject(projectId: number, updateData: Partial<ProjectData>): Promise<any>;
    deleteProject(projectId: number): Promise<void>;
    addProjectRole(roleData: ProjectRoleData): Promise<any>;
    getProjectRoles(projectId: number): Promise<any[]>;
}
export {};
//# sourceMappingURL=project.service.d.ts.map