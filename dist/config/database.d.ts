export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export declare function getDatabaseConfig(): DatabaseConfig;
export declare function getTestDatabaseConfig(): DatabaseConfig;
//# sourceMappingURL=database.d.ts.map