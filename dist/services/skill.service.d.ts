import { Skill, PaginatedResponse } from '../types/employee.types';
export declare class SkillService {
    private db;
    constructor();
    getSkills(search?: string, limit?: number): Promise<string[]>;
    getPopularSkills(limit?: number): Promise<Skill[]>;
    getEmployeesBySkill(skill: string, page?: number, limit?: number): Promise<PaginatedResponse<any>>;
    getSkillRecommendations(employeeId: number, limit?: number): Promise<Skill[]>;
    getSkillAnalytics(): Promise<{
        topSkills: any[];
        skillsByDepartment: any[];
        emergingSkills: any[];
        skillDiversityByDepartment: any[];
    }>;
}
//# sourceMappingURL=skill.service.d.ts.map