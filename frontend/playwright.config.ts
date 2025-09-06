import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Employee Management System UI Testing
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for debugging
  reporter: [
    ['html', { outputDir: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'] // Console output
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Run in headed mode for debugging
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3002',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});