import { Pool, PoolClient } from 'pg';
import { DatabaseConfig } from '../types';
export declare class DatabaseConnection {
    private pool;
    private config;
    constructor(config: DatabaseConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getPool(): Pool;
    isConnected(): Promise<boolean>;
    executeTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    query(text: string, params?: any[]): Promise<any>;
    getClient(): Promise<PoolClient>;
}
//# sourceMappingURL=connection.d.ts.map