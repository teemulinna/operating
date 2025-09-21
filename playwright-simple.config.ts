import { defineConfig, devices } from '@playwright/test';

/**
 * Simple Playwright Config - No server startup
 */
export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: false,
  retries: 0,
  workers: 1,

  timeout: 30000,

  reporter: 'line',

  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});