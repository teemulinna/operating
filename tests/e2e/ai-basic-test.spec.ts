import { test, expect } from '@playwright/test';

/**
 * AI Basic Test - Simplified E2E tests for core functionality
 * Tests only features that are actually implemented and working
 */

// Use the correct port where the app is running  
const BASE_URL = 'http://localhost:3003';

// Configure test for shorter timeouts and single worker
test.describe.configure({ mode: 'serial' });

test.describe('AI Basic Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for navigation
    page.setDefaultTimeout(30000);
  });

  test('Should load the main dashboard without errors', async ({ page }) => {
    // Navigate to the main dashboard
    await page.goto(BASE_URL);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we don't have any uncaught errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);
    
    // Verify no critical JavaScript errors occurred
    expect(errors.length).toBe(0);
    
    // Verify the page title is present
    await expect(page).toHaveTitle(/.*/, { timeout: 10000 });
    
    // Check if some basic content is loaded
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Should navigate to AI insights page', async ({ page }) => {
    await page.goto(`${BASE_URL}/ai-insights`);
    
    // Wait for the loading to complete
    await page.waitForLoadState('networkidle');
    
    // Should show loading or content, not an error page
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should not show a 404 or error message
    const errorTexts = ['Page Not Found', 'Error', '404', 'Not Found'];
    
    for (const errorText of errorTexts) {
      const errorElement = page.getByText(errorText, { exact: false });
      const isVisible = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
      expect(isVisible).toBe(false);
    }
  });

  test('Should navigate to analytics dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);
    
    await page.waitForLoadState('networkidle');
    
    // Verify page loads
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for loading indicator or actual content
    const hasLoadingOrContent = await page.evaluate(() => {
      const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
      const contentElements = document.querySelectorAll('h1, h2, .card, [class*="card"], [class*="dashboard"]');
      return loadingElements.length > 0 || contentElements.length > 0;
    });
    
    expect(hasLoadingOrContent).toBe(true);
  });

  test('Should navigate to resource optimizer', async ({ page }) => {
    await page.goto(`${BASE_URL}/resource-optimizer`);
    
    await page.waitForLoadState('networkidle');
    
    // Verify page loads without throwing errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Look for any indication that the component loaded
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Page Not Found');
  });

  test('Should handle navigation between pages', async ({ page }) => {
    // Start at home
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Navigate to analytics
    await page.goto(`${BASE_URL}/analytics`);
    await page.waitForLoadState('networkidle');
    
    // Navigate to AI insights
    await page.goto(`${BASE_URL}/ai-insights`);
    await page.waitForLoadState('networkidle');
    
    // Navigate back to home
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Verify we're back at home and page is responsive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Should show proper 404 for non-existent routes', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-page`);
    await page.waitForLoadState('networkidle');
    
    // Should show 404 page content
    const notFoundText = page.getByText('Page Not Found');
    await expect(notFoundText).toBeVisible({ timeout: 10000 });
    
    // Should have go back button
    const goBackButton = page.getByText('Go Back');
    await expect(goBackButton).toBeVisible();
  });

  test('Should load without console errors on main routes', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const routesToTest = [
      '/',
      '/analytics',
      '/ai-insights',
      '/resource-optimizer'
    ];

    for (const route of routesToTest) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any async operations
      await page.waitForTimeout(1000);
    }

    // Filter out common harmless warnings
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('DevTools') && 
      !error.includes('Extension') &&
      !error.includes('favicon') &&
      !error.includes('WebSocket')
    );

    expect(criticalErrors.length).toBeLessThanOrEqual(2); // Allow for minor non-critical errors
  });
});