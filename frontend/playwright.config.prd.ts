import { defineConfig, devices } from '@playwright/test';

/**
 * PRD Validation Configuration
 * 
 * This configuration is specifically for validating Product Requirements Document (PRD)
 * compliance and business value delivery for the Alex the Planner persona.
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential execution for PRD validation
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Minimal retries for accurate performance measurement
  workers: 1, // Single worker for consistent performance metrics
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/prd-validation-report' }],
    ['json', { outputFile: 'test-results/prd-validation-results.json' }],
    ['junit', { outputFile: 'test-results/prd-validation-junit.xml' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3004', // Using port 3004 as shown in dev server output
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // Increased timeout for PRD validation
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'PRD-Story-Validation',
      testMatch: /prd-story-validation-comprehensive\.spec\.ts/,
      timeout: 15 * 60 * 1000, // 15 minutes for comprehensive story validation
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'Comprehensive validation of all PRD story requirements',
        businessValue: 'Validates technical implementation of user stories',
        persona: 'Alex the Planner',
        targetDuration: '10 minutes'
      }
    },
    
    {
      name: 'PRD-Business-Value',
      testMatch: /prd-business-value-verification\.spec\.ts/,
      timeout: 12 * 60 * 1000, // 12 minutes for business value assessment
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'Business value and ROI measurement for stakeholders',
        businessValue: 'Validates business impact and user satisfaction',
        persona: 'Alex the Planner + Stakeholders',
        targetDuration: '10 minutes'
      }
    },
    
    {
      name: 'PRD-Alex-Planner-Workflow',
      testMatch: /prd-story-validation-comprehensive\.spec\.ts/,
      grep: /ALEX THE PLANNER.*Complete User Journey/,
      timeout: 12 * 60 * 1000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'Complete Alex the Planner workflow validation',
        businessValue: 'End-to-end user journey with 10-minute target',
        persona: 'Alex the Planner',
        criticalPath: true,
        targetDuration: '10 minutes'
      }
    },
    
    {
      name: 'PRD-Performance-Benchmark',
      testMatch: /prd-business-value-verification\.spec\.ts/,
      grep: /BUSINESS ROI.*Complete Business Value Assessment/,
      timeout: 10 * 60 * 1000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'Performance benchmarks and efficiency measurement',
        businessValue: 'Validates performance targets and user efficiency',
        persona: 'Performance-conscious users',
        targetDuration: '5 minutes'
      }
    },
    
    {
      name: 'PRD-CSV-Export',
      testMatch: /prd-story-validation-comprehensive\.spec\.ts/,
      grep: /Story 3\.2.*CSV Export Functionality/,
      timeout: 5 * 60 * 1000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'CSV export functionality for stakeholder reporting',
        businessValue: 'Validates data export for external stakeholders',
        persona: 'Stakeholders and reporting users',
        targetDuration: '2 minutes'
      }
    },

    {
      name: 'PRD-Critical',
      testMatch: /prd-critical-functionality\.spec\.ts/,
      timeout: 8 * 60 * 1000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      metadata: {
        description: 'Critical PRD requirements validation',
        businessValue: 'Core business functionality verification',
        persona: 'All users',
        targetDuration: '5 minutes'
      }
    }
  ],

  webServer: [
    {
      command: 'cd /Users/teemulinna/code/operating && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3004',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'development'
      }
    }
  ],

  expect: {
    timeout: 10000, // Increased for PRD validation
  },
});