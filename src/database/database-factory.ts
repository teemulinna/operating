import { DatabaseService } from './database.service';
import { DatabaseConnection } from './connection';
import { getDatabaseConfig, getTestDatabaseConfig } from '../config/database';

/**
 * Database Factory to ensure consistent database service creation
 * and resolve singleton pattern conflicts
 */
export class DatabaseFactory {
  private static databaseService: DatabaseService | null = null;
  private static databaseConnection: DatabaseConnection | null = null;

  /**
   * Get the singleton DatabaseService instance
   */
  public static async getDatabaseService(): Promise<DatabaseService> {
    if (!this.databaseService) {
      this.databaseService = DatabaseService.getInstance();
      await this.databaseService.connect();
    }
    return this.databaseService;
  }

  /**
   * Get the DatabaseConnection instance (for migrations)
   */
  public static async getDatabaseConnection(): Promise<DatabaseConnection> {
    if (!this.databaseConnection) {
      const config = getDatabaseConfig();
      this.databaseConnection = new DatabaseConnection(config);
      await this.databaseConnection.connect();
    }
    return this.databaseConnection;
  }

  /**
   * Get test database service
   */
  public static async getTestDatabaseService(): Promise<DatabaseService> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Test database service can only be used in test environment');
    }

    // Reset singleton for test isolation
    DatabaseService.resetInstance();
    
    const testService = DatabaseService.getInstance();
    await testService.connect();
    return testService;
  }

  /**
   * Get test database connection
   */
  public static async getTestDatabaseConnection(): Promise<DatabaseConnection> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Test database connection can only be used in test environment');
    }

    const config = getTestDatabaseConfig();
    const testConnection = new DatabaseConnection(config);
    await testConnection.connect();
    return testConnection;
  }

  /**
   * Reset all instances (for testing)
   */
  public static async reset(): Promise<void> {
    if (this.databaseService) {
      await this.databaseService.disconnect();
      DatabaseService.resetInstance();
      this.databaseService = null;
    }

    if (this.databaseConnection) {
      await this.databaseConnection.disconnect();
      this.databaseConnection = null;
    }
  }

  /**
   * Close all connections
   */
  public static async closeAll(): Promise<void> {
    await this.reset();
  }
}