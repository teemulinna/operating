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

export function getDatabaseConfig(): DatabaseConfig {
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

export function getTestDatabaseConfig(): DatabaseConfig {
  const config = getDatabaseConfig();
  return {
    ...config,
    database: process.env.TEST_DB_NAME || `${config.database}_test`,
    max: 5
  };
}