// Database service with singleton pattern for shared connection pool
// Ensures single connection pool instance across the entire application

import { Pool, PoolClient, QueryResult } from 'pg';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private pool: Pool | null = null;
  private connecting: Promise<void> | null = null;

  constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Reset singleton instance (for testing purposes)
   */
  public static resetInstance(): void {
    if (DatabaseService.instance && DatabaseService.instance.pool) {
      DatabaseService.instance.pool.end().catch(() => {});
      DatabaseService.instance.pool = null;
    }
    DatabaseService.instance = null;
  }

  /**
   * Disconnect the current instance (for testing/cleanup)
   */
  public static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.disconnect();
      DatabaseService.instance = null;
    }
  }

  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.pool) return;

    // If connection is in progress, wait for it
    if (this.connecting) {
      return this.connecting;
    }

    // Start connection process
    this.connecting = this.createConnection();
    
    try {
      await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async createConnection(): Promise<void> {
    // Use test database configuration in test environment
    const isTestEnv = process.env.NODE_ENV === 'test';
    const defaultDatabase = isTestEnv ? 'employee_test' : 'employee_management';

    const config = process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
      max: isTestEnv ? 5 : 20, // Fewer connections for tests
      idleTimeoutMillis: isTestEnv ? 1000 : 30000, // Shorter timeout for tests
      connectionTimeoutMillis: isTestEnv ? 5000 : 2000, // Longer connection timeout for tests
      ssl: false // Disable SSL for local test databases
    } : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || defaultDatabase,
      user: process.env.DB_USER || 'teemulinna',
      password: process.env.DB_PASSWORD || '',
      max: isTestEnv ? 5 : 20, // Fewer connections for tests
      idleTimeoutMillis: isTestEnv ? 1000 : 30000, // Shorter timeout for tests
      connectionTimeoutMillis: isTestEnv ? 5000 : 2000, // Longer connection timeout for tests
      ssl: false // Disable SSL for local databases
    };

    console.log(`🔗 Connecting to database: ${config.database || 'from URL'} (${process.env.NODE_ENV} environment)`);
    console.log(`🔗 Database config:`, {
      host: config.host,
      port: config.port,
      database: config.database || 'from_url',
      user: config.user
    });

    this.pool = this.createPool(config);

    // Test connection
    try {
      const client = await this.pool.connect();

      // In test environment, check what user and database we're connected to
      if (process.env.NODE_ENV === 'test') {
        const userResult = await client.query('SELECT current_user, session_user');
        const dbResult = await client.query('SELECT current_database()');
        console.log('🔗 Connected as user:', userResult.rows[0]);
        console.log('🔗 Connected to database:', dbResult.rows[0]);
      }

      client.release();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      // Clean up failed connection attempt
      if (this.pool) {
        await this.pool.end().catch(() => {}); // Ignore cleanup errors
        this.pool = null;
      }
      throw error;
    }
  }

  private createPool(config: any): Pool {
    return new Pool(config);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('Database disconnected');
    }
  }

  /**
   * Check if the database is connected
   */
  public isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Get the connection pool (for testing and services)
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Close the connection pool (alias for disconnect)
   */
  public async closePool(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Check connection health
   */
  public async checkHealth(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Attempt to reconnect to the database
   */
  public async reconnect(): Promise<void> {
    console.log('Attempting to reconnect to database...');
    
    // Close existing connection
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error) {
        console.error('Error closing existing connection:', error);
      }
      this.pool = null;
    }
    
    // Reset connecting state
    this.connecting = null;
    
    // Attempt to reconnect
    await this.connect();
  }

  /**
   * Execute query with automatic reconnection on connection failure
   */
  public async queryWithReconnect(text: string, params?: any[], maxRetries: number = 1): Promise<QueryResult> {
    try {
      return await this.query(text, params);
    } catch (error: any) {
      // Check if it's a connection error
      if (maxRetries > 0 && this.isConnectionError(error)) {
        console.warn('Connection error detected, attempting reconnection...');
        try {
          await this.reconnect();
          return await this.query(text, params);
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
          throw error; // Throw original error
        }
      }
      throw error;
    }
  }

  /**
   * Check if an error is a connection-related error
   */
  private isConnectionError(error: any): boolean {
    if (!error) return false;
    
    const connectionErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
      'ETIMEDOUT'
    ];
    
    const pgConnectionErrorCodes = [
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
      '08001', // sqlclient_unable_to_establish_sqlconnection
      '08004', // sqlserver_rejected_establishment_of_sqlconnection
    ];
    
    return connectionErrorCodes.includes(error.code) || 
           pgConnectionErrorCodes.includes(error.code) ||
           error.message?.includes('Connection terminated') ||
           error.message?.includes('Client has encountered a connection error');
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return await this.pool.connect();
  }

  async runMigrations(): Promise<void> {
    console.warn('runMigrations() is deprecated. Use DatabaseMigrator class instead.');
    console.log('Basic table creation skipped - use proper migrations.');
  }

  async clearTestData(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('clearTestData can only be called in test environment');
    }

    await this.query('DELETE FROM employees');
    await this.query('DELETE FROM departments');
    await this.query('ALTER SEQUENCE IF EXISTS employees_id_seq RESTART WITH 1');
    await this.query('ALTER SEQUENCE IF EXISTS departments_id_seq RESTART WITH 1');
  }

  async seedTestData(data: any): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('seedTestData can only be called in test environment');
    }

    // Insert departments
    for (const dept of data.departments) {
      await this.query(
        'INSERT INTO departments (id, name, description) VALUES ($1, $2, $3)',
        [dept.id, dept.name, dept.description]
      );
    }

    // Insert employees
    for (const emp of data.employees) {
      await this.query(
        `INSERT INTO employees (id, first_name, last_name, email, position, department_id, salary, hire_date, skills) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          emp.id,
          emp.firstName,
          emp.lastName,
          emp.email,
          emp.position,
          emp.departmentId,
          emp.salary,
          emp.hireDate,
          emp.skills
        ]
      );
    }
  }
}