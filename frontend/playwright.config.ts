import { defineConfig, devices } from '@playwright/test';

/**
 * Simplified Frontend Playwright Configuration - Single Browser
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
  
  reporter: [
    ['html', { outputDir: 'playwright-report' }],
    ['line'],
    ['json', { outputFile: 'test-results/.last-run.json' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  },
  
  expect: {
    timeout: 10000,
  },
  
  // Single browser project - Chrome only
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      VITE_NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true'
    },
  },
});