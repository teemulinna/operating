import { Pool } from 'pg';
export declare enum SkillCategory {
    TECHNICAL = "technical",
    SOFT = "soft",
    LANGUAGE = "language",
    CERTIFICATION = "certification",
    DOMAIN = "domain"
}
export declare class DatabaseSeeder {
    private pool;
    constructor(pool: Pool);
    seedAll(): Promise<void>;
    seedDepartments(): Promise<void>;
    seedSkills(): Promise<void>;
    clearData(): Promise<void>;
}
//# sourceMappingURL=seeder.d.ts.map