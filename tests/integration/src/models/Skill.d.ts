export const __esModule: boolean;
export class SkillModel {
    static initialize(pool: any): void;
    static create(input: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static findById(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static findAll(filters?: {}): Promise<any>;
    static findByCategory(category: any): Promise<any>;
    static findByName(name: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    static search(searchTerm: any, category: any): Promise<any>;
    static update(id: any, updates: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static delete(id: any): Promise<{
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    }>;
    static getStatistics(): Promise<{
        totalSkills: number;
        skillsByCategory: {};
        mostUsedSkills: any;
    }>;
    static getEmployeeSkillGaps(requiredSkillIds: any): Promise<any>;
    static mapRow(row: any): {
        id: any;
        name: any;
        description: any;
        category: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
    };
}
//# sourceMappingURL=Skill.d.ts.map