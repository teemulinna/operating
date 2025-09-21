#!/usr/bin/env node

/**
 * Script to seed built-in project templates
 * Run with: npx ts-node scripts/seed-templates.ts
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import { BuiltInTemplateSeeder } from '../src/database/seed-built-in-templates';

// Load environment variables
config();

async function seedTemplates() {
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
    await pool.connect();
    console.log('✅ Database connected');

    const seeder = new BuiltInTemplateSeeder(pool);
    await seeder.seedBuiltInTemplates();

    console.log('🎉 Template seeding completed successfully!');
  } catch (error) {
    console.error('❌ Template seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeder
if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTemplates };