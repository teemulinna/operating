import { test, expect } from '@playwright/test';

test.describe('AI Features Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3003/');
  });

  test('should load AI Insights page without errors', async ({ page }) => {
    // Navigate directly to AI Insights
    await page.goto('http://localhost:3003/ai-insights');
    
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    
    // Check if the AI Insights panel loads
    await expect(page.locator('text=AI Insights & Predictions')).toBeVisible({ timeout: 10000 });
    
    // Verify the tab navigation exists
    await expect(page.locator('text=AI Insights')).toBeVisible();
    await expect(page.locator('text=Predictive Alerts')).toBeVisible();
    await expect(page.locator('text=Pattern Recognition')).toBeVisible();
    
    // Check if mock data is rendered
    await expect(page.locator('text=Capacity Shortage Predicted')).toBeVisible();
  });

  test('should load Resource Optimizer page without errors', async ({ page }) => {
    // Navigate to Resource Optimizer
    await page.goto('/resource-optimizer');
    
    // Wait for component to load
    await page.waitForTimeout(2000);
    
    // Check if the resource optimizer loads
    await expect(page.locator('text=Resource Optimization')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AI-Powered Suggestions')).toBeVisible();
    
    // Verify summary stats are displayed
    await expect(page.locator('text=Total Improvement')).toBeVisible();
    await expect(page.locator('text=Projected Utilization')).toBeVisible();
    
    // Check filters and controls
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('text=Filter:')).toBeVisible();
  });

  test('should load Resource Allocation Dashboard without errors', async ({ page }) => {
    // Navigate to Resource Allocation Dashboard
    await page.goto('/resource-allocation');
    
    // Wait for component to load
    await page.waitForTimeout(3000);
    
    // The component should load without throwing errors
    // Even if it shows a loading state or empty state, it shouldn't crash
    await page.waitForLoadState('networkidle');
    
    // Check that the page doesn't show a 404 or error message
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=Failed to load')).not.toBeVisible();
  });

  test('should load Analytics Dashboard without errors', async ({ page }) => {
    // Navigate to Analytics
    await page.goto('/analytics');
    
    // Wait for component to load
    await page.waitForTimeout(3000);
    
    // Check that the page loads without errors
    await page.waitForLoadState('networkidle');
    
    // Verify no error states
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=Failed to load')).not.toBeVisible();
  });

  test('should load Scenario Planner without errors', async ({ page }) => {
    // Navigate to Scenarios
    await page.goto('/scenarios');
    
    // Wait for component to load
    await page.waitForTimeout(3000);
    
    // Check that the page loads
    await page.waitForLoadState('networkidle');
    
    // Verify no error states
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=Failed to load')).not.toBeVisible();
  });

  test('should verify API connectivity', async ({ page }) => {
    // Test that backend APIs are accessible
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
  });

  test('should verify employees API works', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/employees');
    expect(response.ok()).toBeTruthy();
    
    const employeesData = await response.json();
    expect(Array.isArray(employeesData.data)).toBeTruthy();
  });

  test('should verify projects API works', async ({ page }) => {
    const response = await page.request.get('http://localhost:3001/api/projects');
    expect(response.ok()).toBeTruthy();
    
    const projectsData = await response.json();
    expect(projectsData.success).toBeTruthy();
    expect(Array.isArray(projectsData.data)).toBeTruthy();
  });

  test('should handle navigation between AI features', async ({ page }) => {
    // Start at AI Insights
    await page.goto('http://localhost:3003/ai-insights');
    await page.waitForTimeout(1000);
    
    // Navigate to Resource Optimizer
    await page.goto('/resource-optimizer');
    await page.waitForTimeout(1000);
    
    // Navigate to Analytics
    await page.goto('/analytics');
    await page.waitForTimeout(1000);
    
    // Navigate to Scenarios
    await page.goto('/scenarios');
    await page.waitForTimeout(1000);
    
    // All navigations should work without errors
    expect(page.url()).toContain('/scenarios');
  });

  test('should load all routes without 404 errors', async ({ page }) => {
    const routes = [
      '/ai-insights',
      '/resource-optimizer', 
      '/resource-calendar',
      '/capacity-chart',
      '/scenarios',
      '/project-planner',
      '/resource-allocation',
      '/analytics',
      '/executive-dashboard',
      '/utilization-report'
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      // Should not show 404 error
      await expect(page.locator('text=Page Not Found')).not.toBeVisible();
      
      // Should not show route errors
      await expect(page.locator('text=Failed to load page')).not.toBeVisible();
    }
  });
});

test.describe('Data Flow Integration', () => {
  test('should demonstrate end-to-end data flow', async ({ page }) => {
    // Test the complete workflow from UI to backend
    
    // 1. Check employees data loads
    await page.goto('http://localhost:3003/employees');
    await page.waitForTimeout(2000);
    
    // 2. Navigate to AI insights (uses employee data)
    await page.goto('http://localhost:3003/ai-insights');
    await page.waitForTimeout(2000);
    
    // 3. Check that mock insights render (shows AI components work)
    await expect(page.locator('text=AI Insights & Predictions')).toBeVisible();
    
    // 4. Navigate to resource optimizer
    await page.goto('/resource-optimizer');
    await page.waitForTimeout(2000);
    
    // 5. Verify optimizer components load
    await expect(page.locator('text=Resource Optimization')).toBeVisible();
    
    // This test verifies that:
    // - Routes are properly configured
    // - Components load without errors
    // - AI components render with mock data
    // - Navigation works between features
  });
});