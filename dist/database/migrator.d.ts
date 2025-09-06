import { Pool } from 'pg';
export declare class DatabaseMigrator {
    private pool;
    private migrationsDir;
    constructor(pool: Pool, migrationsDir?: string);
    migrate(): Promise<void>;
    private createMigrationsTable;
    private getExecutedMigrations;
    private getMigrationFiles;
    private getMigrationName;
    private executeMigration;
    rollback(_targetMigration?: string): Promise<void>;
    getStatus(): Promise<void>;
}
//# sourceMappingURL=migrator.d.ts.map