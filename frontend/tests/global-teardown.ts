import { FullConfig } from '@playwright/test';
import { Pool } from 'pg';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Clean up test database
  const pool = new Pool({
    user: process.env.TEST_DB_USER || 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    database: process.env.TEST_DB_NAME || 'test_person_manager',
    password: process.env.TEST_DB_PASSWORD || 'password',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
  });

  try {
    // Clean up test data
    await pool.query('DROP TABLE IF EXISTS persons;');
    console.log('✅ Test database cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    await pool.end();
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;