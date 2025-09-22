import { Pool } from 'pg';
import { EmployeeSkill, CreateEmployeeSkillInput, UpdateEmployeeSkillInput, ProficiencyLevel, Skill } from '../types';
export declare class EmployeeSkillModel {
    private static pool;
    static initialize(pool: Pool): void;
    static create(input: CreateEmployeeSkillInput): Promise<EmployeeSkill>;
    static findById(id: string): Promise<EmployeeSkill | null>;
    static findByEmployee(employeeId: string): Promise<Array<EmployeeSkill & {
        skill: Skill;
    }>>;
    static findBySkill(skillId: string): Promise<Array<EmployeeSkill & {
        employee: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            position: string;
        };
    }>>;
    static findByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null>;
    static findByProficiencyLevel(proficiencyLevel: ProficiencyLevel, skillIds?: string[]): Promise<Array<EmployeeSkill & {
        skill: Skill;
        employee: {
            id: string;
            firstName: string;
            lastName: string;
        };
    }>>;
    static update(id: string, updates: UpdateEmployeeSkillInput): Promise<EmployeeSkill>;
    static delete(id: string): Promise<EmployeeSkill>;
    static deleteByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null>;
    static bulkUpdate(employeeId: string, skillUpdates: Array<{
        skillId: string;
        proficiencyLevel: ProficiencyLevel;
        yearsOfExperience: number;
        lastAssessed?: Date;
    }>): Promise<EmployeeSkill[]>;
    static getSkillDistribution(skillId?: string): Promise<Array<{
        proficiencyLevel: ProficiencyLevel;
        count: number;
        averageExperience: number;
    }>>;
    static getTopSkillsForEmployee(employeeId?: string): Promise<Array<{
        skill: Skill;
        proficiencyLevel: ProficiencyLevel;
        yearsOfExperience: number;
    }>>;
    private static mapRow;
}
//# sourceMappingURL=EmployeeSkill.d.ts.map