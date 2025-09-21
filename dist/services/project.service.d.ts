import { DatabaseService } from '../database/database.service';
import { EmployeeSkillMatch, ResourceRecommendation } from '../types';
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
    constructor(db?: DatabaseService);
    static create(): Promise<ProjectService>;
    createProject(projectData: any): Promise<any>;
    getAllProjects(): Promise<any[]>;
    getProjects(filters?: ProjectFilters, pagination?: PaginationParams): Promise<any>;
    getProjectById(projectId: number): Promise<any>;
    updateProject(projectId: number, updateData: Partial<ProjectData>): Promise<any>;
    deleteProject(projectId: number): Promise<void>;
    private validateStatusTransition;
    addProjectRole(roleData: ProjectRoleData): Promise<any>;
    getProjectRoles(projectId: number): Promise<any[]>;
    getSkillRequirements(projectId: number): Promise<{
        totalRequirements: number;
        skillBreakdown: Array<{
            skillId: string;
            skillName: string;
            category: string;
            minimumLevel: string;
            requiredCount: number;
            currentlyFilled: number;
            roles: string[];
            priority: 'low' | 'medium' | 'high' | 'critical';
        }>;
        overallStatus: {
            fulfillmentRate: number;
            criticalGaps: number;
            readinessScore: number;
        };
    }>;
    private determineSkillPriority;
    getResourceRecommendations(projectId: number, options?: {
        includeTeamChemistry?: boolean;
        maxRecommendations?: number;
        preferredDepartments?: string[];
        budgetConstraints?: number;
    }): Promise<ResourceRecommendation[]>;
    findRoleMatches(projectId: number, roleId: number, options?: {
        maxResults?: number;
        minimumMatchScore?: number;
        includeBenchWarming?: boolean;
    }): Promise<EmployeeSkillMatch[]>;
    getProjectSkillGaps(projectId: number): Promise<{
        overallGaps: Array<{
            skillName: string;
            category: string;
            requiredLevel: number;
            availableLevel: number;
            gap: number;
            priority: 'low' | 'medium' | 'high' | 'critical';
        }>;
        roleGaps: Array<{
            roleTitle: string;
            gapsCount: number;
            criticalGaps: string[];
            recommendations: string[];
        }>;
        summary: {
            totalGaps: number;
            criticalGaps: number;
            coveragePercentage: number;
            riskLevel: 'low' | 'medium' | 'high';
        };
    }>;
}
export {};
//# sourceMappingURL=project.service.d.ts.map