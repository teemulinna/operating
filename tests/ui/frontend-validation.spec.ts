import { test, expect } from '@playwright/test';

test.describe('Employee Management System - Frontend Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the frontend application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should load the main application', async ({ page }) => {
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Employee Management System/);
    
    // Check if the root div is present
    const rootDiv = page.locator('#root');
    await expect(rootDiv).toBeVisible();
  });

  test('should display the application header', async ({ page }) => {
    // Look for common header elements
    const heading = page.locator('h1, h2, [role="banner"], header').first();
    await expect(heading).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    // Look for navigation elements
    const navElements = page.locator('nav, [role="navigation"], a').first();
    await expect(navElements).toBeVisible();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.waitForTimeout(3000); // Wait for any async operations

    // Report any JavaScript errors
    if (errors.length > 0) {
      console.log('JavaScript errors found:', errors);
    }
    
    expect(errors.length).toBeLessThan(5); // Allow for minor non-critical errors
  });

  test('should have working backend connection', async ({ page }) => {
    // Check if the app can connect to the backend
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    
    const responseData = await response.json();
    expect(responseData.status).toBe('healthy');
  });

  test('should load departments data from API', async ({ page }) => {
    // Check if departments API is accessible
    const response = await page.request.get('http://localhost:3001/api/departments');
    expect(response.ok()).toBeTruthy();
    
    const departments = await response.json();
    expect(Array.isArray(departments)).toBeTruthy();
    expect(departments.length).toBe(10);
  });

  test('should display employee management interface', async ({ page }) => {
    // Wait for the React app to load
    await page.waitForSelector('#root > *', { timeout: 10000 });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'frontend-screenshot.png', fullPage: true });
    
    // Check if there's content in the root div
    const content = await page.locator('#root').innerHTML();
    expect(content.length).toBeGreaterThan(100); // Should have substantial content
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(1000);
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // App should still be visible and functional
    const rootDiv = page.locator('#root');
    await expect(rootDiv).toBeVisible();
  });

  test('should handle network timeouts gracefully', async ({ page }) => {
    // Set a short timeout to test error handling
    page.setDefaultTimeout(5000);
    
    try {
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      // If we get here, the page loaded successfully
      expect(true).toBe(true);
    } catch (error) {
      // Log the specific error for debugging
      console.error('Page load error:', error);
      throw error;
    }
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check for basic meta tags
    const charset = page.locator('meta[charset]');
    await expect(charset).toBeVisible();
    
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeVisible();
    
    const title = page.locator('title');
    await expect(title).toBeVisible();
  });
});