import { Pool } from 'pg';
import { Skill, CreateSkillInput, UpdateSkillInput, SkillCategory } from '../types';
import { PaginatedResponse } from '../types/employee.types';
export declare class SkillService {
    private static pool;
    private static initialized;
    static initialize(pool: Pool): void;
    constructor();
    private static ensureInitialized;
    getSkills(search?: string, category?: SkillCategory): Promise<Skill[]>;
    createSkill(skillData: CreateSkillInput): Promise<Skill>;
    updateSkill(id: string, skillData: UpdateSkillInput): Promise<Skill>;
    deleteSkill(id: string): Promise<Skill>;
    getSkillById(id: string): Promise<Skill | null>;
    getPopularSkills(limit?: number): Promise<Array<{
        skill: Skill;
        employeeCount: number;
    }>>;
    getEmployeesBySkill(skillId: string, page?: number, limit?: number): Promise<PaginatedResponse<any>>;
    getSkillRecommendations(employeeId: string, limit?: number): Promise<Array<{
        skill: Skill;
        relevanceScore: number;
    }>>;
    getSkillAnalytics(): Promise<{
        totalSkills: number;
        skillsByCategory: Record<SkillCategory, number>;
        mostUsedSkills: {
            skill: Skill;
            employeeCount: number;
        }[];
        skillsByDepartment: any[];
        emergingSkills: any[];
        skillDiversityByDepartment: any[];
    }>;
}
//# sourceMappingURL=skill.service.d.ts.map