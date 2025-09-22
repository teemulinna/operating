"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseConfig = getDatabaseConfig;
exports.getTestDatabaseConfig = getTestDatabaseConfig;
function getDatabaseConfig() {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'operating_system',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        ssl: process.env.NODE_ENV === 'production',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
}
function getTestDatabaseConfig() {
    const config = getDatabaseConfig();
    return {
        ...config,
        database: process.env.TEST_DB_NAME || `${config.database}_test`,
        max: 5
    };
}
//# sourceMappingURL=database.js.map