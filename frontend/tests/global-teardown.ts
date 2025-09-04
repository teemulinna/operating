import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Clean up test database
  await cleanupTestDatabase();
  
  // Generate test reports
  await generateTestReports();
  
  // Clean up temporary files
  await cleanupTempFiles();

  console.log('✅ Global teardown completed');
}

async function cleanupTestDatabase() {
  console.log('📊 Cleaning up test database...');
  
  try {
    // Check if backend is available
    const backendPath = path.join(process.cwd(), '../backend');
    const backendExists = await fs.access(backendPath).then(() => true).catch(() => false);
    
    if (backendExists) {
      const originalCwd = process.cwd();
      process.chdir(backendPath);
      
      // Set test environment
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/employee_management_test';
      
      // Clean up test database
      try {
        execSync('npm run db:reset:test', { stdio: 'inherit' });
        console.log('📊 Test database cleaned up');
      } catch (error) {
        console.warn('⚠️ Test database cleanup failed:', error.message);
      }
      
      // Return to frontend directory
      process.chdir(originalCwd);
    }
  } catch (error) {
    console.warn('⚠️ Database cleanup failed:', error.message);
  }
}

async function generateTestReports() {
  console.log('📋 Generating test reports...');
  
  try {
    // Generate HTML report if test results exist
    const testResultsPath = path.join(process.cwd(), 'test-results');
    const exists = await fs.access(testResultsPath).then(() => true).catch(() => false);
    
    if (exists) {
      execSync('npx playwright show-report --reporter=html', { stdio: 'inherit' });
      console.log('📋 HTML report generated');
    }
  } catch (error) {
    console.warn('⚠️ Report generation failed:', error.message);
  }
}

async function cleanupTempFiles() {
  console.log('🗑️ Cleaning up temporary files...');
  
  const tempDirs = [
    '.tmp',
    '.cache',
  ];
  
  for (const dir of tempDirs) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  }
  
  console.log('🗑️ Temporary files cleaned up');
}

export default globalTeardown;