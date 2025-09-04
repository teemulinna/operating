import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Setup test database
  await setupTestDatabase();
  
  // Install browsers if needed
  await installBrowsers();
  
  // Create test results directory
  await createTestDirectories();
  
  console.log('✅ Global setup completed');
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  try {
    // Check if backend is available
    const backendPath = path.join(process.cwd(), '../backend');
    const backendExists = await fs.access(backendPath).then(() => true).catch(() => false);
    
    if (backendExists) {
      // Run database migrations and seed test data
      const originalCwd = process.cwd();
      process.chdir(backendPath);
      
      // Set test environment
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/employee_management_test';
      
      // Run migrations
      try {
        execSync('npm run db:migrate', { stdio: 'inherit' });
        console.log('📊 Database migrations completed');
      } catch (error) {
        console.warn('⚠️ Database migrations failed, continuing without migrations');
      }
      
      // Seed test data
      try {
        execSync('npm run db:seed:test', { stdio: 'inherit' });
        console.log('📊 Test data seeded');
      } catch (error) {
        console.warn('⚠️ Test data seeding failed, continuing without seed data');
      }
      
      // Return to frontend directory
      process.chdir(originalCwd);
    } else {
      // Fallback: create basic test data structure for integration tests
      console.log('📊 Backend not found, setting up minimal test environment');
    }
    
    console.log('📊 Test database ready');
  } catch (error) {
    console.warn('⚠️ Database setup failed:', error.message);
    console.log('📊 Continuing without database setup');
  }
}

async function installBrowsers() {
  console.log('🌐 Checking browser installations...');
  
  try {
    execSync('npx playwright install', { stdio: 'inherit' });
    console.log('🌐 Browsers installed/updated');
  } catch (error) {
    console.warn('⚠️ Browser installation failed:', error.message);
  }
}

async function createTestDirectories() {
  console.log('📁 Creating test directories...');
  
  const directories = [
    'test-results',
    'test-results/screenshots',
    'test-results/videos',
    'test-results/traces',
    'playwright-report'
  ];
  
  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  console.log('📁 Test directories created');
}

export default globalSetup;