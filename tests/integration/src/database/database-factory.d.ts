export const __esModule: boolean;
export class DatabaseFactory {
    static getDatabaseService(): Promise<any>;
    static getDatabaseConnection(): Promise<connection_1.DatabaseConnection>;
    static getTestDatabaseService(): Promise<any>;
    static getTestDatabaseConnection(): Promise<connection_1.DatabaseConnection>;
    static reset(): Promise<void>;
    static closeAll(): Promise<void>;
}
export namespace DatabaseFactory {
    let databaseService: any;
    let databaseConnection: connection_1.DatabaseConnection | null | undefined;
}
import connection_1 = require("./connection");
//# sourceMappingURL=database-factory.d.ts.map