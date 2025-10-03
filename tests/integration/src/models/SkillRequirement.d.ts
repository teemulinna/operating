export const __esModule: boolean;
export class SkillRequirementModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByIdWithSkill(id: any): Promise<{
        skill: any;
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findByProject(projectId: any): Promise<any>;
    static findBySkill(skillId: any): Promise<any>;
    static findAll(filters?: {}): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getSkillGapAnalysis(projectId: any): Promise<any>;
    static updateFulfillmentStatus(projectId: any): Promise<void>;
    static getSkillDemandAnalysis(): Promise<any>;
    static mapRow(row: any): {
        id: any;
        projectId: any;
        skillId: any;
        minimumProficiency: any;
        requiredCount: any;
        fulfilled: any;
        priority: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=SkillRequirement.d.ts.map