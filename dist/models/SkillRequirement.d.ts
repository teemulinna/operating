import { Pool } from 'pg';
import { SkillRequirement, CreateSkillRequirementInput, UpdateSkillRequirementInput, SkillRequirementFilters, ProficiencyLevel, Skill } from '../types';
export declare class SkillRequirementModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateSkillRequirementInput): Promise<SkillRequirement>;
    static findById(id: string): Promise<SkillRequirement | null>;
    static findByIdWithSkill(id: string): Promise<SkillRequirement & {
        skill: Skill;
    } | null>;
    static findByProject(projectId: string): Promise<Array<SkillRequirement & {
        skill: Skill;
    }>>;
    static findBySkill(skillId: string): Promise<Array<SkillRequirement & {
        project: {
            id: string;
            name: string;
            status: string;
            priority: string;
        };
    }>>;
    static findAll(filters?: SkillRequirementFilters): Promise<SkillRequirement[]>;
    static update(id: string, updates: UpdateSkillRequirementInput): Promise<SkillRequirement>;
    static delete(id: string): Promise<SkillRequirement>;
    static getSkillGapAnalysis(projectId: string): Promise<Array<{
        requirement: SkillRequirement & {
            skill: Skill;
        };
        availableEmployees: number;
        qualifiedEmployees: number;
        gap: number;
        recommendedEmployees: Array<{
            employeeId: string;
            employeeName: string;
            proficiencyLevel: ProficiencyLevel;
            yearsOfExperience: number;
            isAvailable: boolean;
        }>;
    }>>;
    static updateFulfillmentStatus(projectId: string): Promise<void>;
    static getSkillDemandAnalysis(): Promise<Array<{
        skill: Skill;
        totalDemand: number;
        availableSupply: number;
        criticalProjects: number;
        avgRequiredProficiency: number;
        shortageRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }>>;
    private static mapRow;
}
//# sourceMappingURL=SkillRequirement.d.ts.map