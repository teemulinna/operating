"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTestDatabaseConfig = exports.getDatabaseConfig = void 0;
const getDatabaseConfig = () => {
    const defaultConfig = {
        host: 'localhost',
        port: 5432,
        database: 'employee_management',
        user: 'postgres',
        password: 'password',
        ssl: false,
        poolSize: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    };
    return {
        host: process.env.DB_HOST || defaultConfig.host,
        port: parseInt(process.env.DB_PORT || String(defaultConfig.port)),
        database: process.env.DB_NAME || defaultConfig.database,
        user: process.env.DB_USER || defaultConfig.user,
        password: process.env.DB_PASSWORD || defaultConfig.password,
        ssl: process.env.DB_SSL === 'true',
        poolSize: parseInt(process.env.DB_POOL_SIZE || String(defaultConfig.poolSize)),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || String(defaultConfig.idleTimeoutMillis)),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(defaultConfig.connectionTimeoutMillis))
    };
};
exports.getDatabaseConfig = getDatabaseConfig;
const getTestDatabaseConfig = () => {
    const config = (0, exports.getDatabaseConfig)();
    return {
        ...config,
        database: process.env.TEST_DB_NAME || 'employee_management_test',
        poolSize: 5,
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 5000
    };
};
exports.getTestDatabaseConfig = getTestDatabaseConfig;
//# sourceMappingURL=database.js.map