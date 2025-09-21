import { FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Suite Global Setup');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PLAYWRIGHT_TEST = 'true';
  
  // Log configuration
  console.log('📝 Test Configuration:');
  console.log(`  - Test Directory: ${config.configFile ? 'configured' : 'default'}`);
  console.log(`  - Workers: ${config.workers}`);
  console.log(`  - Base URL: http://localhost:3002`);
  console.log(`  - Projects: ${config.projects.length}`);
  
  // Wait for servers to be ready
  console.log('⏳ Waiting for servers to be ready...');
  
  try {
    // Check if backend is responding
    const backendHealth = await fetch('http://localhost:3001/api/health')
      .then(r => r.status === 200)
      .catch(() => false);
    
    if (backendHealth) {
      console.log('✅ Backend server is ready');
    } else {
      console.log('⚠️ Backend server not responding - tests may fail');
    }
  } catch (error) {
    console.log('⚠️ Could not verify backend server health');
  }
  
  try {
    // Check if frontend is responding
    const frontendHealth = await fetch('http://localhost:3002')
      .then(r => r.status < 400)
      .catch(() => false);
    
    if (frontendHealth) {
      console.log('✅ Frontend server is ready');
    } else {
      console.log('⚠️ Frontend server not responding - tests may fail');
    }
  } catch (error) {
    console.log('⚠️ Could not verify frontend server health');
  }
  
  console.log('🎬 Global setup complete - starting tests...\n');
}

export default globalSetup;