export const __esModule: boolean;
export class SkillService {
    static initialize(pool: any): void;
    static ensureInitialized(): void;
    constructor(db: any);
    db: any;
    getSkills(search: any, category: any): Promise<any>;
    createSkill(skillData: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    updateSkill(id: any, skillData: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    deleteSkill(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    getSkillById(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    getPopularSkills(limit?: number): Promise<any>;
    getEmployeesBySkill(skillId: any, page?: number, limit?: number): Promise<{
        data: any;
        pagination: {
            currentPage: number;
            totalPages: number;
            totalItems: number;
            limit: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    getSkillRecommendations(employeeId: any): Promise<any>;
    getSkillAnalytics(): Promise<{
        totalSkills: number;
        skillsByCategory: {};
        mostUsedSkills: any;
        skillsByDepartment: any;
        emergingSkills: any;
        skillDiversityByDepartment: any;
    }>;
}
export namespace SkillService {
    let pool: any;
    let initialized: boolean | undefined;
}
//# sourceMappingURL=skill.service.d.ts.map