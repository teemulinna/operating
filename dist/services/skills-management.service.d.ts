import { PaginatedResponse } from '../types/employee.types';
export interface Skill {
    id?: number;
    name: string;
    category: 'Technical' | 'Soft' | 'Domain' | 'Certifications' | 'Language';
    description?: string;
    isActive?: boolean;
}
export interface EmployeeSkill {
    id?: number;
    employeeId: string;
    skillId: number;
    proficiencyLevel: number;
    certificationLevel?: string;
    yearsOfExperience?: number;
    lastUsed?: Date;
    validatedBy?: number;
    validationDate?: Date;
    notes?: string;
    skill?: Skill;
}
export interface SkillGapAnalysis {
    missingSkills: Array<{
        skillId: number;
        skillName: string;
        category: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
    }>;
    skillsToImprove: Array<{
        skillId: number;
        skillName: string;
        currentLevel: number;
        requiredLevel: number;
        gap: number;
    }>;
    recommendations: Array<{
        skillId: number;
        skillName: string;
        recommendationType: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        reason: string;
        suggestedResources: Array<{
            type: string;
            name: string;
            url?: string;
            estimatedHours?: number;
            cost?: number;
        }>;
    }>;
}
export interface SkillAnalytics {
    skillDistribution: Array<{
        category: string;
        count: number;
        percentage: number;
    }>;
    proficiencyLevels: Array<{
        level: number;
        count: number;
        percentage: number;
    }>;
    skillsByCategory: Array<{
        category: string;
        skills: Array<{
            name: string;
            count: number;
            avgProficiency: number;
        }>;
    }>;
    emergingSkills: Array<{
        name: string;
        growth: number;
        newEmployees: number;
    }>;
    skillGaps: Array<{
        skill: string;
        demand: number;
        supply: number;
        gap: number;
    }>;
}
export interface TrainingRecommendation {
    skillName: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    suggestedResources: Array<{
        type: 'online_course' | 'book' | 'certification' | 'mentoring' | 'project';
        name: string;
        provider?: string;
        url?: string;
        estimatedHours: number;
        estimatedCost?: number;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
    }>;
    estimatedTimeToComplete: number;
    expectedOutcome: string;
}
export declare class SkillsManagementService {
    private db;
    constructor();
    createSkill(skillData: Skill): Promise<Skill>;
    getSkills(filters?: {
        category?: string;
        search?: string;
        isActive?: boolean;
        page?: number;
        limit?: number;
    }): Promise<PaginatedResponse<Skill>>;
    assignSkillToEmployee(employeeId: string, skillAssignment: {
        skillId: number;
        proficiencyLevel: number;
        certificationLevel?: string;
        yearsOfExperience?: number;
        lastUsed?: Date;
        notes?: string;
    }): Promise<EmployeeSkill>;
    getEmployeeSkills(employeeId: string): Promise<EmployeeSkill[]>;
    updateEmployeeSkill(employeeId: string, updates: {
        proficiencyLevel?: number;
        certificationLevel?: string;
        yearsOfExperience?: number;
        lastUsed?: Date;
        notes?: string;
    }): Promise<EmployeeSkill>;
    performSkillGapAnalysis(employeeId: string): Promise<SkillGapAnalysis>;
    getSkillAnalytics(): Promise<SkillAnalytics>;
    getTrainingRecommendations(employeeId: string): Promise<{
        recommendations: TrainingRecommendation[];
    }>;
    private mapSkillRow;
    private mapEmployeeSkillRow;
    private mapEmployeeSkillWithSkill;
    private calculatePriority;
    private getSuggestedResources;
    private groupSkillsByCategory;
    private calculateSkillGaps;
}
//# sourceMappingURL=skills-management.service.d.ts.map