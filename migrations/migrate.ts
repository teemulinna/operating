#!/usr/bin/env ts-node

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseConnection } from '../src/database/connection';
import { DatabaseMigrator } from '../src/database/migrator';
import { getDatabaseConfig } from '../config/database';

async function runMigrations() {
  const config = getDatabaseConfig();
  const connection = new DatabaseConnection(config);
  
  try {
    console.log('Connecting to database...');
    await connection.connect();
    
    const migrator = new DatabaseMigrator(connection.getPool());
    
    const command = process.argv[2];
    
    switch (command) {
      case 'status':
        await migrator.getStatus();
        break;
      case 'up':
      case 'migrate':
      default:
        await migrator.migrate();
        break;
      case 'rollback':
        const target = process.argv[3];
        await migrator.rollback(target);
        break;
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await connection.disconnect();
  }
}

if (require.main === module) {
  runMigrations();
}