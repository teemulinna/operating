import { Pool } from 'pg';
export declare class CreateProjectsTableMigration {
    up(pool: Pool): Promise<void>;
    down(pool: Pool): Promise<void>;
}
export declare const migration: CreateProjectsTableMigration;
export declare const name = "CreateProjectsTable";
export declare const timestamp = "20250905235109";
//# sourceMappingURL=20250905235109_create_projects_table.d.ts.map