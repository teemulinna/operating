import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DatabaseMigrator {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir: string = 'migrations') {
    this.pool = pool;
    this.migrationsDir = migrationsDir;
  }

  async migrate(): Promise<void> {
    try {
      // Ensure migrations table exists
      await this.createMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Get all migration files
      const migrationFiles = this.getMigrationFiles();

      // Filter out already executed migrations
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(this.getMigrationName(file))
      );

      if (pendingMigrations.length === 0) {
        console.log('No pending migrations to run');
        return;
      }

      console.log(`Running ${pendingMigrations.length} migration(s)...`);

      // Execute each pending migration
      for (const migrationFile of pendingMigrations) {
        await this.executeMigration(migrationFile);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.pool.query(query);
  }

  private async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT name FROM migrations ORDER BY executed_at'
    );

    return result.rows.map(row => row.name);
  }

  private getMigrationFiles(): string[] {
    const fs = require('fs');

    try {
      const files = fs.readdirSync(this.migrationsDir);
      return files
        .filter((file: string) => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in order
    } catch (error) {
      console.error(`Error reading migrations directory: ${this.migrationsDir}`, error);
      return [];
    }
  }

  private getMigrationName(filename: string): string {
    return filename.replace('.sql', '');
  }

  private async executeMigration(filename: string): Promise<void> {
    const migrationName = this.getMigrationName(filename);
    const migrationPath = join(this.migrationsDir, filename);

    try {
      console.log(`Executing migration: ${migrationName}`);

      // Read migration file
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      // Execute migration in a transaction
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Execute the migration SQL
        await client.query(migrationSQL);
        
        // Record the migration as executed
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );
        
        await client.query('COMMIT');
        console.log(`Migration ${migrationName} completed successfully`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error(`Failed to execute migration ${migrationName}:`, error);
      throw error;
    }
  }

  async rollback(_targetMigration?: string): Promise<void> {
    console.warn('Rollback functionality not implemented yet');
    console.warn('Please create rollback migrations manually if needed');
  }

  async getStatus(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = this.getMigrationFiles().map(f => this.getMigrationName(f));
    
    console.log('\nMigration Status:');
    console.log('================');
    
    for (const migration of allMigrations) {
      const status = executedMigrations.includes(migration) ? '✓ EXECUTED' : '✗ PENDING';
      console.log(`${status} ${migration}`);
    }
    
    const pendingCount = allMigrations.length - executedMigrations.length;
    console.log(`\nTotal migrations: ${allMigrations.length}`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);
  }
}