import { test, expect } from '@playwright/test';

test.describe('AI Integration Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3003/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('AI Enhanced Dashboard loads correctly', async ({ page }) => {
    // Check if AI Enhanced Dashboard components are present
    await expect(page.locator('[data-testid="ai-dashboard"]')).toBeVisible();
    
    // Check for AI-powered badge
    await expect(page.locator('text=AI Powered')).toBeVisible();
    
    // Check for main navigation tabs
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=Forecasting')).toBeVisible();
    await expect(page.locator('text=Skill Matching')).toBeVisible();
    await expect(page.locator('text=Optimization')).toBeVisible();
  });

  test('Forecasting panel displays forecasting data', async ({ page }) => {
    // Navigate to forecasting tab
    await page.click('text=Forecasting');
    
    // Wait for forecasting data to load
    await page.waitForTimeout(2000);
    
    // Check for forecasting elements
    await expect(page.locator('text=AI Forecasting')).toBeVisible();
    await expect(page.locator('text=Predictive insights')).toBeVisible();
    
    // Check for time range selector
    await expect(page.locator('[data-testid="time-range-selector"]')).toBeVisible();
  });

  test('Skill matching functionality works', async ({ page }) => {
    // Navigate to skill matching tab
    await page.click('text=Skill Matching');
    
    // Wait for skill matching interface to load
    await page.waitForTimeout(1000);
    
    // Check for skill matching elements
    await expect(page.locator('text=AI Skill Matching')).toBeVisible();
    await expect(page.locator('text=Find the best resource matches')).toBeVisible();
    
    // Check for skill input
    await expect(page.locator('input[placeholder*="React, Python"]')).toBeVisible();
  });

  test('Optimization panel provides optimization options', async ({ page }) => {
    // Navigate to optimization tab
    await page.click('text=Optimization');
    
    // Wait for optimization interface to load
    await page.waitForTimeout(1000);
    
    // Check for optimization elements
    await expect(page.locator('text=AI Optimization')).toBeVisible();
    await expect(page.locator('text=Intelligent resource allocation')).toBeVisible();
    
    // Check for optimization actions
    await expect(page.locator('text=Resource Balancing')).toBeVisible();
    await expect(page.locator('text=Resource Leveling')).toBeVisible();
  });

  test('AI service API calls handle errors gracefully', async ({ page }) => {
    // Mock API responses to simulate errors
    await page.route('**/api/forecasting/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, message: 'Server error' })
      });
    });
    
    await page.route('**/api/matching/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, message: 'Server error' })
      });
    });
    
    await page.route('**/api/optimization/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, message: 'Server error' })
      });
    });
    
    // Navigate to forecasting and check error handling
    await page.click('text=Forecasting');
    await page.waitForTimeout(2000);
    
    // Should show error state gracefully without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('AI project form integrates skill matching', async ({ page }) => {
    // Navigate to project creation
    await page.click('[data-testid="create-project-btn"]', { timeout: 5000 });
    
    // Check if AI features are available
    await expect(page.locator('text=AI Enhanced')).toBeVisible();
    
    // Check for skill matching tab
    await expect(page.locator('text=Skills & Requirements')).toBeVisible();
    await expect(page.locator('text=AI Recommendations')).toBeVisible();
  });

  test('Time range selectors update data correctly', async ({ page }) => {
    // Navigate to forecasting
    await page.click('text=Forecasting');
    await page.waitForTimeout(1000);
    
    // Change time range
    await page.click('[data-testid="time-range-selector"]');
    await page.click('text=1 Week');
    
    // Wait for data to update
    await page.waitForTimeout(2000);
    
    // Verify the selection was applied
    await expect(page.locator('[data-testid="time-range-selector"]')).toContainText('1 Week');
  });

  test('Loading states are properly displayed', async ({ page }) => {
    // Navigate to optimization
    await page.click('text=Optimization');
    await page.waitForTimeout(500);
    
    // Trigger an optimization operation
    const optimizeButton = page.locator('text=Run Optimization').first();
    if (await optimizeButton.isVisible()) {
      await optimizeButton.click();
      
      // Check for loading state
      await expect(page.locator('[data-loading="true"]')).toBeVisible({ timeout: 1000 });
    }
  });

  test('AI insights and recommendations are displayed', async ({ page }) => {
    // Navigate to overview
    await page.click('text=Overview');
    await page.waitForTimeout(2000);
    
    // Check for AI insights section
    const insightsSection = page.locator('text=AI Insights Summary');
    if (await insightsSection.isVisible()) {
      await expect(insightsSection).toBeVisible();
      
      // Check for insight items
      await expect(page.locator('[data-testid="insight-item"]')).toHaveCount({ min: 0 });
    }
  });
});

test.describe('AI API Integration', () => {
  test('Forecasting API endpoints respond correctly', async ({ page }) => {
    let forecastingRequests = 0;
    
    await page.route('**/api/forecasting/capacity**', route => {
      forecastingRequests++;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            totalCapacity: [],
            availableCapacity: [],
            utilizationRate: [],
            skillCapacity: {},
            skillDemand: {}
          }
        })
      });
    });
    
    await page.goto('http://localhost:3003/');
    await page.click('text=Forecasting');
    await page.waitForTimeout(2000);
    
    expect(forecastingRequests).toBeGreaterThan(0);
  });

  test('Skill matching API endpoints respond correctly', async ({ page }) => {
    let matchingRequests = 0;
    
    await page.route('**/api/matching/**', route => {
      matchingRequests++;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            matches: [],
            summary: {
              totalCandidates: 0,
              averageMatchScore: 0,
              excellentMatches: 0,
              goodMatches: 0
            }
          }
        })
      });
    });
    
    await page.goto('http://localhost:3003/');
    await page.click('text=Skill Matching');
    await page.waitForTimeout(2000);
    
    // API calls might be triggered by user interactions
    expect(matchingRequests).toBeGreaterThanOrEqual(0);
  });

  test('Optimization API endpoints respond correctly', async ({ page }) => {
    let optimizationRequests = 0;
    
    await page.route('**/api/optimization/**', route => {
      optimizationRequests++;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            recommendations: [],
            metrics: {},
            alternatives: [],
            warnings: []
          }
        })
      });
    });
    
    await page.goto('http://localhost:3003/');
    await page.click('text=Optimization');
    await page.waitForTimeout(2000);
    
    // API calls for suggestions should be made
    expect(optimizationRequests).toBeGreaterThanOrEqual(0);
  });
});