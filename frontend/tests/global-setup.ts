import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { TestDatabaseUtils } from './fixtures/testDataFactory';

const API_BASE_URL = 'http://localhost:3001';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Setup test environment
  await setupTestEnvironment();
  
  // Install browsers if needed
  await installBrowsers();
  
  // Create test results directory
  await createTestDirectories();
  
  console.log('✅ Global setup completed');
}

async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  try {
    // Wait for API to be available
    console.log('⏳ Waiting for API to be available...');
    await TestDatabaseUtils.waitForAPI(API_BASE_URL, 60); // Wait up to 60 seconds
    console.log('✅ API is available');
    
    // Clean database to start with a fresh state
    console.log('🧹 Cleaning database for test setup...');
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
    console.log('✅ Database cleaned');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.PLAYWRIGHT_TEST = 'true';
    process.env.VITE_NODE_ENV = 'test';
    
    console.log('🔧 Test environment ready');
  } catch (error) {
    console.warn('⚠️ Test environment setup failed:', error.message);
    console.log('🔧 Continuing with limited functionality');
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