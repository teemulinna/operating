import { Pool, PoolClient, QueryResult } from 'pg';
export declare class DatabaseService {
    private static instance;
    private pool;
    private connecting;
    constructor();
    static getInstance(): DatabaseService;
    static resetInstance(): void;
    static disconnect(): Promise<void>;
    connect(): Promise<void>;
    private createConnection;
    private createPool;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getPool(): Pool;
    closePool(): Promise<void>;
    checkHealth(): Promise<boolean>;
    reconnect(): Promise<void>;
    queryWithReconnect(text: string, params?: any[], maxRetries?: number): Promise<QueryResult>;
    private isConnectionError;
    query(text: string, params?: any[]): Promise<QueryResult>;
    getClient(): Promise<PoolClient>;
    runMigrations(): Promise<void>;
    clearTestData(): Promise<void>;
    seedTestData(data: any): Promise<void>;
}
//# sourceMappingURL=database.service.d.ts.map