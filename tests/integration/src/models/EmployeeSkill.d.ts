export const __esModule: boolean;
export class EmployeeSkillModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByEmployee(employeeId: any): Promise<any>;
    static findBySkill(skillId: any): Promise<any>;
    static findByEmployeeAndSkill(employeeId: any, skillId: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByProficiencyLevel(proficiencyLevel: any, skillIds: any): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static deleteByEmployeeAndSkill(employeeId: any, skillId: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static bulkUpdate(employeeId: any, skillUpdates: any): Promise<{
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    static getSkillDistribution(skillId: any): Promise<any>;
    static getTopSkillsForEmployee(employeeId: any, limit?: number): Promise<any>;
    static mapRow(row: any): {
        id: any;
        employeeId: any;
        skillId: any;
        proficiencyLevel: number;
        yearsOfExperience: any;
        lastAssessed: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=EmployeeSkill.d.ts.map