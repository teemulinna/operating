/**
 * Database connection exports
 * Provides shared database connection pool for the application
 */

import { Pool } from 'pg';
import { DatabaseService } from './database.service';

// Create database service instance
const dbService = DatabaseService.getInstance();

// Export database pool for direct usage
let pool: Pool;

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  await dbService.connect();
  pool = dbService.getPool();
}

// Get database pool - initialize if not already done
export function getPool(): Pool {
  if (!pool) {
    try {
      pool = dbService.getPool();
    } catch (error) {
      console.warn('Database not connected, attempting to connect...');
      // This will be handled by the initialization in server startup
      throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
  }
  return pool;
}

// Export the pool directly 
export { getPool as pool };

// Re-export database service
export { DatabaseService } from './database.service';
export { dbService as database };