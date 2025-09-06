import { Pool } from 'pg';
import { Skill, CreateSkillInput, UpdateSkillInput, SkillCategory, SkillFilters } from '../types';
export declare class SkillModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateSkillInput): Promise<Skill>;
    static findById(id: string): Promise<Skill | null>;
    static findAll(filters?: SkillFilters): Promise<Skill[]>;
    static findByCategory(category: SkillCategory): Promise<Skill[]>;
    static findByName(name: string): Promise<Skill | null>;
    static search(searchTerm: string, category?: SkillCategory): Promise<Skill[]>;
    static update(id: string, updates: UpdateSkillInput): Promise<Skill>;
    static delete(id: string): Promise<Skill>;
    static getStatistics(): Promise<{
        totalSkills: number;
        skillsByCategory: Record<SkillCategory, number>;
        mostUsedSkills: Array<{
            skill: Skill;
            employeeCount: number;
        }>;
    }>;
    static getEmployeeSkillGaps(requiredSkillIds: string[]): Promise<{
        skillId: string;
        skill: Skill;
        employeeCount: number;
        proficiencyDistribution: Record<number, number>;
    }[]>;
    private static mapRow;
}
//# sourceMappingURL=Skill.d.ts.map