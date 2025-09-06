import { DatabaseConnection } from './connection';
import { DatabaseMigrator } from './migrator';
import { DatabaseSeeder } from './seeder';
export declare function initializeDatabase(): Promise<DatabaseConnection>;
export declare function runMigrations(): Promise<void>;
export declare function seedDatabase(): Promise<void>;
export declare function closeDatabase(): Promise<void>;
export declare function getDatabase(): DatabaseConnection;
export { DatabaseConnection, DatabaseMigrator, DatabaseSeeder };
export * from '../models';
export * from '../types';
//# sourceMappingURL=index.d.ts.map