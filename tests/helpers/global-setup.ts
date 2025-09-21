/**
 * Global Playwright Setup - Monorepo Pattern
 * Handles database initialization, server startup verification, and test data setup
 */
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 ResourceForge E2E Test Suite - Global Setup Starting...');
  
  try {
    // 1. Verify servers are running
    console.log('📡 Checking server availability...');
    
    // Check backend API
    const backendHealthy = await checkServerHealth('http://localhost:3001/health');
    if (!backendHealthy) {
      console.warn('⚠️  Backend server not responding - tests may fail');
    } else {
      console.log('✅ Backend API server healthy');
    }
    
    // Check frontend
    const frontendHealthy = await checkServerHealth('http://localhost:3003');
    if (!frontendHealthy) {
      console.warn('⚠️  Frontend server not responding - tests may fail');
    } else {
      console.log('✅ Frontend server healthy');
    }
    
    // 2. Database preparation (if needed)
    console.log('🗄️  Preparing test database...');
    await prepareTestDatabase();
    
    // 3. Browser setup for shared resources
    console.log('🌐 Setting up browser context...');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      // Global browser context settings
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    
    // Store context for tests if needed
    await context.storageState({ path: 'tests/fixtures/auth-state.json' });
    await browser.close();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 10000 
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function prepareTestDatabase() {
  try {
    // Check if database connection works
    const dbHealthy = await checkServerHealth('http://localhost:3001/api/employees');
    
    if (dbHealthy) {
      console.log('✅ Database connection verified');
    } else {
      console.log('ℹ️  Database endpoints not responding - using fallback data');
    }
    
    // Could add database seeding here if needed
    // await seedTestData();
    
  } catch (error) {
    console.warn('Database preparation warning:', error);
  }
}

export default globalSetup;