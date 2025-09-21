#!/usr/bin/env node

/**
 * Script to run database migrations
 * Run with: npx ts-node scripts/run-migration.ts
 */

import { Pool } from 'pg';
import { DatabaseMigrator } from '../src/database/migrator';
import { config } from 'dotenv';

// Load environment variables
config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'employee_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Database connected');
    client.release();

    const migrator = new DatabaseMigrator(pool, 'migrations');
    
    console.log('📊 Migration status:');
    await migrator.getStatus();
    
    console.log('\n🔄 Running migrations...');
    await migrator.migrate();
    
    console.log('\n📊 Final migration status:');
    await migrator.getStatus();

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };