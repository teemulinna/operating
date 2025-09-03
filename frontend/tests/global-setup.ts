import { chromium, FullConfig } from '@playwright/test';
import { Pool } from 'pg';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Setup test database
  const pool = new Pool({
    user: process.env.TEST_DB_USER || 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    database: process.env.TEST_DB_NAME || 'test_person_manager',
    password: process.env.TEST_DB_PASSWORD || 'password',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
  });

  try {
    // Create test database tables
    await pool.query(`
      DROP TABLE IF EXISTS persons;
      CREATE TABLE persons (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        age INTEGER NOT NULL CHECK (age >= 0),
        occupation VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for performance
      CREATE INDEX idx_persons_name ON persons(name);
      CREATE INDEX idx_persons_occupation ON persons(occupation);
      CREATE INDEX idx_persons_age ON persons(age);
      CREATE INDEX idx_persons_email ON persons(email);
    `);

    console.log('✅ Test database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await pool.end();
  }

  // Start the application server for testing
  console.log('✅ Global setup completed');
}

export default globalSetup;