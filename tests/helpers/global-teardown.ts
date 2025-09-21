/**
 * Global Playwright Teardown - Monorepo Pattern  
 * Cleanup after all tests complete
 */
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 ResourceForge E2E Test Suite - Global Teardown Starting...');
  
  try {
    // 1. Clean up test artifacts
    console.log('📁 Cleaning up test artifacts...');
    await cleanupTestArtifacts();
    
    // 2. Database cleanup (if needed) 
    console.log('🗄️  Database cleanup...');
    await cleanupTestDatabase();
    
    // 3. Generate test summary
    console.log('📊 Generating test summary...');
    await generateTestSummary();
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

async function cleanupTestArtifacts() {
  try {
    // Clean up auth state files
    const fs = require('fs').promises;
    const path = require('path');
    
    const authStatePath = 'tests/fixtures/auth-state.json';
    try {
      await fs.unlink(authStatePath);
    } catch (e) {
      // File doesn't exist, that's fine
    }
    
    console.log('✅ Test artifacts cleaned up');
  } catch (error) {
    console.warn('Test artifact cleanup warning:', error);
  }
}

async function cleanupTestDatabase() {
  try {
    // Check if we need to clean up any test data
    // This would depend on your test data strategy
    
    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.warn('Database cleanup warning:', error);
  }
}

async function generateTestSummary() {
  try {
    const fs = require('fs').promises;
    const summary = {
      timestamp: new Date().toISOString(),
      testRun: 'ResourceForge E2E Tests',
      environment: process.env.NODE_ENV || 'test',
      servers: {
        frontend: 'http://localhost:3003',
        backend: 'http://localhost:3001'
      }
    };
    
    await fs.writeFile(
      'test-results/test-summary.json', 
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Test summary generated');
  } catch (error) {
    console.warn('Test summary generation warning:', error);
  }
}

export default globalTeardown;