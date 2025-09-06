import { Pool } from 'pg';
export declare class DatabaseSeeder {
    private pool;
    constructor(pool: Pool);
    seedAll(): Promise<void>;
    seedDepartments(): Promise<void>;
    seedSkills(): Promise<void>;
    clearData(): Promise<void>;
}
//# sourceMappingURL=seeder.d.ts.map