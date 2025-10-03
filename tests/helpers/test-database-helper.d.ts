import { DatabaseService } from '../../src/database/database.service';
export declare class TestDatabaseHelper {
    private static db;
    private static initialized;
    static initialize(): Promise<void>;
    static cleanup(): Promise<void>;
    static getDatabase(): DatabaseService;
    private static ensureTestEnvironment;
    private static createTestTables;
    static cleanAllTestData(): Promise<void>;
    static resetSequences(): Promise<void>;
    static seedBasicTestData(): Promise<{
        departmentId: string;
        employeeId: string;
        projectId: string;
        skillId: string;
    }>;
    static verifyTestEnvironment(): Promise<void>;
    static getTableRowCount(tableName: string): Promise<number>;
    static getTestDataStats(): Promise<Record<string, number>>;
    static executeQuery(sql: string, params?: any[]): Promise<any>;
    static beginTransaction(): Promise<void>;
    static commitTransaction(): Promise<void>;
    static rollbackTransaction(): Promise<void>;
}
//# sourceMappingURL=test-database-helper.d.ts.map