import { PaginatedResponse } from '../types/employee.types';
export interface RoleTemplate {
    id?: number;
    name: string;
    description?: string;
    department?: string;
    level: 'Entry' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Executive';
    standardHourlyRate?: number;
    estimatedSalaryMin?: number;
    estimatedSalaryMax?: number;
    responsibilities?: string[];
    requirements?: string[];
    preferredQualifications?: string[];
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: number;
}
export interface RoleTemplateSkill {
    id?: number;
    templateId: number;
    skillId: number;
    minProficiency: number;
    isRequired: boolean;
    weight?: number;
    skillName?: string;
    skillCategory?: string;
}
export interface PlaceholderResource {
    id?: number;
    projectId: number;
    templateId: number;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
    allocationPercentage: number;
    customHourlyRate?: number;
    isPlaceholder: boolean;
    status: 'planned' | 'recruiting' | 'filled' | 'cancelled';
    notes?: string;
    template?: RoleTemplate;
}
export interface EmployeeTemplateMatch {
    employee: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        position: string;
        department: string;
    };
    matchScore: number;
    skillMatches: Array<{
        skillName: string;
        required: boolean;
        hasSkill: boolean;
        currentProficiency?: number;
        requiredProficiency: number;
        gap: number;
    }>;
    strengths: string[];
    gaps: string[];
    overallAssessment: string;
}
export interface TemplateLibrary {
    categories: Array<{
        id: number;
        name: string;
        description: string;
        templateCount: number;
    }>;
    popularTemplates: RoleTemplate[];
    recentTemplates: RoleTemplate[];
    totalTemplates: number;
}
export declare class RoleTemplatesService {
    private db;
    constructor();
    createTemplate(templateData: RoleTemplate): Promise<RoleTemplate>;
    getTemplates(filters?: {
        department?: string;
        level?: string;
        isActive?: boolean;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<RoleTemplate>>;
    getTemplateById(id: number): Promise<RoleTemplate | null>;
    updateTemplate(id: number, updates: Partial<RoleTemplate>): Promise<RoleTemplate>;
    cloneTemplate(templateId: number, cloneData: {
        name: string;
        modifications?: Partial<RoleTemplate>;
    }): Promise<RoleTemplate>;
    applyTemplateToProject(projectId: number, application: {
        templateId: number;
        quantity: number;
        startDate?: Date;
        endDate?: Date;
        allocation: number;
        customizations?: {
            hourlyRate?: number;
            specificRequirements?: string;
        };
    }): Promise<{
        placeholderResources: PlaceholderResource[];
    }>;
    findMatchingEmployees(templateId: number, options?: {
        minMatchScore?: number;
        limit?: number;
        includeUnavailable?: boolean;
    }): Promise<{
        matches: EmployeeTemplateMatch[];
    }>;
    getTemplateLibrary(): Promise<TemplateLibrary>;
    addSkillToTemplate(templateId: number, skillData: {
        skillId: number;
        minProficiency: number;
        isRequired: boolean;
        weight?: number;
    }): Promise<RoleTemplateSkill>;
    updateTemplateSkill(templateId: number, skillId: number, updates: {
        minProficiency?: number;
        isRequired?: boolean;
        weight?: number;
    }): Promise<RoleTemplateSkill>;
    private mapTemplateRow;
    private mapPlaceholderResourceRow;
    private mapTemplateSkillRow;
    private generateAssessment;
}
//# sourceMappingURL=role-templates.service.d.ts.map