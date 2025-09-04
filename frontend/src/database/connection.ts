import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

export interface DatabaseConfig extends PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'employee_management',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    };
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool(this.config);
      
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database disconnected');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool();
    try {
      const result = await pool.query(text, params);
      return result.rows;
    } catch (error) {
      logger.error('Query error:', { text, params, error });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: Date; latency: number }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      return {
        status: 'healthy',
        timestamp: new Date(),
        latency: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        latency: Date.now() - start
      };
    }
  }
}

export const db = new DatabaseConnection();
export default db;