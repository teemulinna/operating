import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration for Phase 3 Project Resource Integration Testing
 * Comprehensive cross-browser, mobile, and accessibility testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !process.env.DEBUG, // Parallel in CI, sequential for debugging
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? '50%' : 2,
  timeout: 60000, // Increased timeout for complex interactions
  expect: {
    timeout: 10000, // Assertion timeout
  },
  reporter: [
    ['html', { outputDir: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ...(process.env.CI ? [['github']] : []),
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: !!process.env.CI,
    // Real browser context for testing
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop Safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
    },
    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable reduced motion for accessibility testing
        reducedMotion: 'reduce',
      },
      testMatch: '**/accessibility.spec.ts',
    },
    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Network throttling for performance testing
        launchOptions: {
          args: ['--disable-web-security', '--disable-dev-shm-usage'],
        },
      },
      testMatch: '**/performance.spec.ts',
    },
    // Visual regression testing
    {
      name: 'visual-regression',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: '**/visual-regression.spec.ts',
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3001',
      VITE_WS_URL: 'ws://localhost:3001',
    },
  },
});