export const __esModule: boolean;
export class DatabaseConnection {
    constructor(config: any);
    pool: pg_1.Pool | null;
    config: any;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getPool(): pg_1.Pool;
    isConnected(): Promise<boolean>;
    executeTransaction(callback: any): Promise<any>;
    query(text: any, params: any): Promise<pg_1.QueryArrayResult<any[]>>;
    getClient(): Promise<pg_1.PoolClient>;
}
import pg_1 = require("pg");
//# sourceMappingURL=connection.d.ts.map