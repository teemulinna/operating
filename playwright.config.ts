import { defineConfig, devices } from '@playwright/test';

/**
 * Simplified Playwright Configuration - Single Browser Setup
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 4,

  // Timeout configuration  
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // Reporting
  reporter: [
    ['html', { outputDir: 'test-results/playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
  ],

  // Global settings
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure', 
    video: 'retain-on-failure',
    headless: !!process.env.CI,
    actionTimeout: 15000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
  },

  // Single browser configuration - Chrome only
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: ['--disable-web-security', '--disable-dev-shm-usage', '--no-sandbox']
        }
      },
    },
  ],

  // Development servers
  webServer: [
    {
      command: 'npm run dev',
      port: 3003,
      directory: 'frontend',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
        VITE_API_BASE_URL: 'http://localhost:3001',
      },
    },
    {
      command: 'npm run start', 
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        NODE_ENV: 'test',
        PORT: '3001',
      },
    }
  ],

  // Output configuration
  outputDir: 'test-results/artifacts',
});