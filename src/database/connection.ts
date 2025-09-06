import { Pool, PoolClient, PoolConfig } from 'pg';
import { DatabaseConfig, DatabaseError } from '../types';

export class DatabaseConnection {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.poolSize || 20,
        idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,
        statement_timeout: 30000,
        query_timeout: 30000
      };

      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('Database connection established successfully');
    } catch (error: any) {
      const dbError: DatabaseError = new Error(`Database connection failed: ${error.message}`);
      dbError.code = error.code;
      dbError.detail = error.detail;
      throw dbError;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database connection closed');
    }
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async isConnected(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  async executeTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
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

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      return await this.pool.query(text, params);
    } catch (error: any) {
      const dbError: DatabaseError = new Error(`Query failed: ${error.message}`);
      dbError.code = error.code;
      dbError.constraint = error.constraint;
      dbError.table = error.table;
      dbError.detail = error.detail;
      throw dbError;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool.connect();
  }
}