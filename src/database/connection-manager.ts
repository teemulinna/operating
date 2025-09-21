import { Pool, PoolClient } from 'pg';
import { DatabaseFactory } from './database-factory';

/**
 * Connection Manager for handling database connections across services
 * Provides Promise-based connection management with proper error handling
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;
  private pool: Pool | null = null;

  private constructor() {}

  public static async getInstance(): Promise<ConnectionManager> {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
      await ConnectionManager.instance.initialize();
    }
    return ConnectionManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      const dbService = await DatabaseFactory.getDatabaseService();
      this.pool = dbService.getPool();
    } catch (error) {
      console.error('Failed to initialize ConnectionManager:', error);
      throw error;
    }
  }

  /**
   * Execute query with automatic connection management
   */
  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('ConnectionManager not initialized');
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error: any) {
      // Log query details for debugging
      console.error('Database query failed:', {
        query: text,
        params: params?.map(p => typeof p === 'string' && p.length > 100 ? `${p.substring(0, 100)}...` : p),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a database client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('ConnectionManager not initialized');
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      console.error('Failed to get database client:', error);
      throw error;
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('ConnectionManager not initialized');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back due to error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if the database connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Close all connections (for cleanup)
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    ConnectionManager.instance = null;
  }

  /**
   * Create a new ConnectionManager for testing (bypasses singleton)
   */
  static async createForTesting(): Promise<ConnectionManager> {
    const manager = new ConnectionManager();
    await manager.initialize();
    return manager;
  }
}