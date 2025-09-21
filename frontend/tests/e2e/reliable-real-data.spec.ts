import { test, expect } from '@playwright/test';
import TestDataManager, { DatabaseStateDetector } from '../utils/test-data-manager';

test.describe('Reliable Real Data Integration - Fixed Selectors', () => {
  
  test('Dashboard loads with proper test IDs', async ({ page }) => {
    await page.goto('/');
    
    // Use specific test IDs instead of generic selectors
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="app-title"]')).toContainText('ResourceForge');
    
    // Verify navigation exists
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
  });

  test('Employee page displays real backend data with specific selectors', async ({ page }) => {
    await page.goto('/employees');
    
    // Wait for page to load with specific test ID
    await expect(page.locator('[data-testid="employees-title"]')).toBeVisible();
    
    // Wait for API call to complete
    await page.waitForLoadState('networkidle');
    
    // Check for employees list container
    await expect(page.locator('[data-testid="employees-list"]')).toBeVisible();
    
    // Check employees summary shows dynamic count
    const summary = page.locator('[data-testid="employees-summary"]');
    await expect(summary).toBeVisible();
    // Flexible count validation - works with any number of employees
    await expect(summary).toContainText(/Total: \d+ employee/);
  });

  test('Project page displays real backend data', async ({ page }) => {
    await page.goto('/projects');
    
    // Wait for page to load
    await expect(page.locator('[data-testid="projects-title"]')).toBeVisible();
    
    // Wait for API call
    await page.waitForLoadState('networkidle');
    
    // Check projects grid exists
    await expect(page.locator('[data-testid="projects-grid"]')).toBeVisible();
    
    // Check projects summary
    await expect(page.locator('[data-testid="projects-summary"]')).toContainText('projects');
  });

  test('Navigation works between all pages', async ({ page }) => {
    await page.goto('/');
    
    // Navigate using test IDs
    await page.click('[data-testid="nav-employees"]');
    await expect(page.locator('[data-testid="employees-page"]')).toBeVisible();
    
    await page.click('[data-testid="nav-projects"]');
    await expect(page.locator('[data-testid="projects-page"]')).toBeVisible();
    
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
  });

  test('Backend API integration with dynamic data validation', async ({ page }) => {
    // Detect database state first
    const employeeState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/employees');
    const projectState = await DatabaseStateDetector.detectState(page, 'http://localhost:3001/api/projects');
    
    console.log(`🔍 Employee state: ${employeeState.count} employees`);
    console.log(`🔍 Project state: ${projectState.count} projects`);
    
    // Test employees API with dynamic validation
    const employeeResponse = await page.request.get('http://localhost:3001/api/employees');
    const employeeData = await employeeResponse.json();
    
    await TestDataManager.validateEmployeeData(employeeData.data || [], {
      allowEmpty: true,
      minCount: 0,
      maxCount: 1000
    });
    
    // Test projects API with dynamic validation
    const projectResponse = await page.request.get('http://localhost:3001/api/projects');
    const projectData = await projectResponse.json();
    
    await TestDataManager.validateProjectData(projectData.data || [], {
      allowEmpty: true,
      minCount: 0,
      maxCount: 1000
    });
    
    console.log('✅ Both employee and project APIs validated successfully');
  });
});