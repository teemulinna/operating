"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseMigrator = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
class DatabaseMigrator {
    pool;
    migrationsDir;
    constructor(pool, migrationsDir = 'migrations') {
        this.pool = pool;
        this.migrationsDir = migrationsDir;
    }
    async migrate() {
        try {
            // Ensure migrations table exists
            await this.createMigrationsTable();
            // Get executed migrations
            const executedMigrations = await this.getExecutedMigrations();
            // Get all migration files
            const migrationFiles = this.getMigrationFiles();
            // Filter out already executed migrations
            const pendingMigrations = migrationFiles.filter(file => !executedMigrations.includes(this.getMigrationName(file)));
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
        }
        catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
    async createMigrationsTable() {
        const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
        await this.pool.query(query);
    }
    async getExecutedMigrations() {
        const result = await this.pool.query('SELECT name FROM migrations ORDER BY executed_at');
        return result.rows.map(row => row.name);
    }
    getMigrationFiles() {
        const fs = require('fs');
        const path = require('path');
        try {
            const files = fs.readdirSync(this.migrationsDir);
            return files
                .filter((file) => file.endsWith('.sql'))
                .sort(); // Ensure migrations run in order
        }
        catch (error) {
            console.error(`Error reading migrations directory: ${this.migrationsDir}`, error);
            return [];
        }
    }
    getMigrationName(filename) {
        return filename.replace('.sql', '');
    }
    async executeMigration(filename) {
        const migrationName = this.getMigrationName(filename);
        const migrationPath = (0, path_1.join)(this.migrationsDir, filename);
        try {
            console.log(`Executing migration: ${migrationName}`);
            // Read migration file
            const migrationSQL = (0, fs_1.readFileSync)(migrationPath, 'utf8');
            // Execute migration in a transaction
            const client = await this.pool.connect();
            try {
                await client.query('BEGIN');
                // Execute the migration SQL
                await client.query(migrationSQL);
                // Record the migration as executed
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
                await client.query('COMMIT');
                console.log(`Migration ${migrationName} completed successfully`);
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error(`Failed to execute migration ${migrationName}:`, error);
            throw error;
        }
    }
    async rollback(targetMigration) {
        console.warn('Rollback functionality not implemented yet');
        console.warn('Please create rollback migrations manually if needed');
    }
    async getStatus() {
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
exports.DatabaseMigrator = DatabaseMigrator;
//# sourceMappingURL=migrator.js.map