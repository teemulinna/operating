export const __esModule: boolean;
export class DatabaseService {
    static getInstance(): any;
    static resetInstance(): void;
    static disconnect(): Promise<void>;
    pool: pg_1.Pool | null;
    connecting: Promise<void> | null;
    connect(): Promise<void>;
    createConnection(): Promise<void>;
    createPool(config: any): pg_1.Pool;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getPool(): pg_1.Pool;
    closePool(): Promise<void>;
    checkHealth(): Promise<boolean>;
    reconnect(): Promise<void>;
    queryWithReconnect(text: any, params: any, maxRetries?: number): Promise<pg_1.QueryArrayResult<any[]>>;
    isConnectionError(error: any): any;
    query(text: any, params: any): Promise<pg_1.QueryArrayResult<any[]>>;
    getClient(): Promise<pg_1.PoolClient>;
    runMigrations(): Promise<void>;
    clearTestData(): Promise<void>;
    seedTestData(data: any): Promise<void>;
}
export namespace DatabaseService {
    let instance: any;
}
import pg_1 = require("pg");
//# sourceMappingURL=database.service.d.ts.map