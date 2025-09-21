import { defineConfig, devices } from '@playwright/test';

/**
 * E2E Test Config - Uses existing servers
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests sequentially to see real results
  fullyParallel: false,
  retries: 0,
  workers: 1,

  timeout: 30000,

  reporter: [['line'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Set API URL for tests that need it
        contextOptions: {
          // Additional context options if needed
        }
      },
    },
  ],

  // No webServer config - we're using existing servers
});