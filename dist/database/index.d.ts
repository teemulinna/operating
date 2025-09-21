import { Pool } from 'pg';
import { DatabaseService } from './database.service';
declare const dbService: DatabaseService;
export declare function initializeDatabase(): Promise<void>;
export declare function getPool(): Pool;
export { getPool as pool };
export { DatabaseService } from './database.service';
export { dbService as database };
//# sourceMappingURL=index.d.ts.map