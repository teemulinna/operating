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
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(64),
          execution_time_ms INTEGER
        )
      `;

      await client.query(query);
      
      // Ensure proper permissions
      await client.query(`
        GRANT ALL PRIVILEGES ON TABLE migrations TO CURRENT_USER;
      `);
      
      await client.query(`
        GRANT USAGE, SELECT ON SEQUENCE migrations_id_seq TO CURRENT_USER;
      `);
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create migrations table:', error);
      throw error;
    } finally {
      client.release();
    }
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

  async rollback(targetMigration?: string): Promise<void> {
    if (!targetMigration) {
      console.warn('No target migration specified. Rolling back last migration.');
      
      const executedMigrations = await this.getExecutedMigrations();
      if (executedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      targetMigration = executedMigrations[executedMigrations.length - 1];
    }

    try {
      console.log(`Rolling back migration: ${targetMigration}`);
      
      // Execute rollback SQL if exists
      const rollbackFile = `rollback_${targetMigration}.sql`;
      const rollbackPath = join(this.migrationsDir, rollbackFile);
      
      const fs = require('fs');
      if (fs.existsSync(rollbackPath)) {
        const rollbackSQL = readFileSync(rollbackPath, 'utf8');
        
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(rollbackSQL);
          
          // Remove from migrations table
          await client.query(
            'DELETE FROM migrations WHERE name = $1',
            [targetMigration]
          );
          
          await client.query('COMMIT');
          console.log(`Migration ${targetMigration} rolled back successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.warn(`Rollback file not found: ${rollbackFile}`);
        console.warn('Manual rollback required');
        
        // Just remove from migrations table as fallback
        await this.pool.query(
          'DELETE FROM migrations WHERE name = $1',
          [targetMigration]
        );
        console.log(`Removed ${targetMigration} from migrations table`);
      }
    } catch (error) {
      console.error(`Failed to rollback migration ${targetMigration}:`, error);
      throw error;
    }
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