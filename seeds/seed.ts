#!/usr/bin/env ts-node

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseConnection } from '../src/database/connection';
import { DatabaseSeeder } from '../src/database/seeder';
import { getDatabaseConfig } from '../config/database';

async function runSeeding() {
  const config = getDatabaseConfig();
  const connection = new DatabaseConnection(config);
  
  try {
    console.log('Connecting to database...');
    await connection.connect();
    
    const seeder = new DatabaseSeeder(connection.getPool());
    
    const command = process.argv[2];
    
    switch (command) {
      case 'clear':
        await seeder.clearData();
        break;
      case 'departments':
        await seeder.seedDepartments();
        break;
      case 'skills':
        await seeder.seedSkills();
        break;
      case 'all':
      default:
        await seeder.seedAll();
        break;
    }
    
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    await connection.disconnect();
  }
}

if (require.main === module) {
  runSeeding();
}