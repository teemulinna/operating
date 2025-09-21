#!/usr/bin/env npx tsx

import { DatabaseService } from '../src/database/database.service';
import { DatabaseMigrator } from '../src/database/migrator';

async function runMigrations(): Promise<void> {
  console.log('🚀 Starting Database Migration Process...\n');
  
  const db = DatabaseService.getInstance();
  let migrator: DatabaseMigrator;
  
  try {
    // Connect to database
    await db.connect();
    console.log('✅ Connected to database');
    
    // Create migrator instance
    migrator = new DatabaseMigrator(db.getPool(), 'migrations');
    
    // Check current status
    console.log('\n📊 Current Migration Status:');
    await migrator.getStatus();
    
    // Run migrations
    console.log('\n⚙️ Running Migrations:');
    await migrator.migrate();
    
    console.log('\n✅ Migration process completed successfully');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    // Clean up
    await DatabaseService.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch(console.error);
}

export { runMigrations };