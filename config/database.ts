import { DatabaseConfig } from '../src/types';

export const getDatabaseConfig = (): DatabaseConfig => {
  // Default development configuration
  const defaultConfig: DatabaseConfig = {
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

  // Override with environment variables if available
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

export const getTestDatabaseConfig = (): DatabaseConfig => {
  const config = getDatabaseConfig();
  
  return {
    ...config,
    database: process.env.TEST_DB_NAME || 'employee_management_test',
    poolSize: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000
  };
};