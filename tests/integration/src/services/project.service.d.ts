export const __esModule: boolean;
export class ProjectService {
    static create(): Promise<ProjectService>;
    constructor(db: any);
    db: any;
    createProject(projectData: any): Promise<any>;
    getAllProjects(): Promise<any>;
    getProjects(filters: {} | undefined, pagination: any): Promise<{
        data: any;
        projects: any;
        pagination: {
            currentPage: any;
            totalPages: number;
            totalItems: number;
            limit: any;
            hasNext: boolean;
            hasPrev: boolean;
        };
        total: number;
    }>;
    getProjectById(projectId: any): Promise<any>;
    updateProject(projectId: any, updateData: any): Promise<any>;
    deleteProject(projectId: any): Promise<void>;
    validateStatusTransition(currentStatus: any, newStatus: any): void;
    addProjectRole(roleData: any): Promise<any>;
    getProjectRoles(projectId: any): Promise<any>;
    getSkillRequirements(projectId: any): Promise<{
        totalRequirements: number;
        skillBreakdown: any[];
        overallStatus: {
            fulfillmentRate: number;
            criticalGaps: number;
            readinessScore: number;
        };
    }>;
    determineSkillPriority(minimumLevel: any, roleName: any): "low" | "medium" | "high" | "critical";
    getResourceRecommendations(projectId: any, options?: {}): Promise<{
        recommendationId: string;
        projectId: any;
        overallScore: number;
        confidence: string;
        recommendedTeam: {
            members: any;
            totalCost: any;
            teamChemistry: any;
        };
        alternatives: any;
        reasoning: {
            keyStrengths: string[];
            potentialConcerns: string[];
            tradeoffs: string[];
            riskAssessment: {
                level: string;
                factors: any;
                mitigation: any;
            };
        };
        optimizations: {
            type: string;
            description: string;
            impact: number;
            cost: number;
            timeline: string;
        }[];
        manualOverrides: {
            allowedSubstitutions: {
                originalEmployeeId: any;
                substitutes: {
                    employeeId: any;
                    matchScore: number;
                    reasoning: string;
                }[];
            }[];
            roleFlexibility: any;
        };
    }[]>;
    findRoleMatches(projectId: any, roleId: any, options?: {}): Promise<{
        employeeId: any;
        employee: {
            id: any;
            firstName: any;
            lastName: any;
            email: any;
            position: any;
            departmentId: any;
            departmentName: any;
        };
        overallMatchScore: number;
        skillMatches: {
            skillId: any;
            skillName: any;
            category: any;
            required: any;
            weight: any;
            hasSkill: boolean;
            employeeProficiency: any;
            requiredProficiency: any;
            proficiencyGap: number;
            matchScore: number;
            yearsOfExperience: any;
            lastUsed: any;
        }[];
        strengthAreas: any[];
        gapAreas: any[];
        availabilityScore: number;
        teamFitScore: number;
        overallRecommendation: string;
        reasoningNotes: string[];
    }[]>;
    getProjectSkillGaps(projectId: any): Promise<{
        overallGaps: {
            skillName: any;
            category: string;
            requiredLevel: number;
            availableLevel: number;
            gap: any;
            priority: string;
        }[];
        roleGaps: {
            roleTitle: any;
            gapsCount: number;
            criticalGaps: any[];
            recommendations: string[];
        }[];
        summary: {
            totalGaps: number;
            criticalGaps: number;
            coveragePercentage: number;
            riskLevel: string;
        };
    }>;
}
//# sourceMappingURL=project.service.d.ts.map