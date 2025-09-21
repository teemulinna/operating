import { test, expect, Page } from '@playwright/test';
import { TestUtils, customExpect, testData } from '../helpers/test-utils';

/**
 * Employee Management E2E Tests with Improved Configuration
 * 
 * This test demonstrates the improved Playwright configuration for:
 * - Proper timeout handling for real API calls
 * - Network idle waiting for dynamic content
 * - Retry logic for flaky operations
 * - Better error handling and debugging
 */

test.describe('Employee Management with Real API', () => {
  let testUtils: TestUtils;

  test.beforeEach(async ({ page }) => {
    testUtils = new TestUtils(page);
    
    // Wait for API to be healthy before starting tests
    await testUtils.waitForApiHealth(['/api/health', '/api/employees']);
    
    // Navigate to the application with network idle wait
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for the main navigation to be stable
    await testUtils.waitForStableElement('[data-testid="main-nav"]');
  });

  test('should load employee list with proper API handling', async ({ page }) => {
    test.setTimeout(60000); // Extend timeout for this specific test
    
    try {
      // Navigate to employees page with API wait
      await testUtils.safeClick('[data-testid="employees-nav"]');
      
      // Wait for the API call to complete
      const employeesResponse = await testUtils.waitForApiResponse('/api/employees');
      await customExpected.toBeSuccessfulResponse(employeesResponse);
      
      // Wait for loading to complete
      await testUtils.waitForLoadingComplete();
      
      // Wait for employee table to be stable
      const employeeTable = await testUtils.waitForStableElement('[data-testid="employee-table"]');
      
      // Verify table is visible
      await expect(employeeTable).toBeVisible();
      
      // Verify we have employee data
      const employeeRows = page.locator('[data-testid="employee-row"]');
      await expect(employeeRows).toHaveCountGreaterThan(0);
      
    } catch (error) {
      await testUtils.takeScreenshotOnError('employee-list-load', error);
      throw error;
    }
  });

  test('should create new employee with retry logic', async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for create operation
    
    try {
      // Navigate to employees page
      await testUtils.safeClick('[data-testid="employees-nav"]');
      await testUtils.waitForNetworkIdle();
      
      // Click create employee button with retry
      await testUtils.safeClick('[data-testid="create-employee-btn"]', { retries: 3 });
      
      // Wait for modal to appear and be stable
      const modal = await testUtils.waitForStableElement('[data-testid="employee-modal"]');
      await expect(modal).toBeVisible();
      
      // Fill form with validation
      await testUtils.safeFill('[data-testid="employee-name"]', testData.employee.valid.name);
      await testUtils.safeFill('[data-testid="employee-email"]', testData.employee.valid.email);
      await testUtils.safeFill('[data-testid="employee-department"]', testData.employee.valid.department);
      await testUtils.safeFill('[data-testid="employee-role"]', testData.employee.valid.role);
      
      // Submit form and wait for API response with retry
      await testUtils.retryWithBackoff(async () => {
        await testUtils.safeClick('[data-testid="save-employee-btn"]');
        
        // Wait for the create API call
        const createResponse = await testUtils.waitForApiResponse('/api/employees', {
          method: 'POST',
          timeout: 20000
        });
        
        await customExpected.toHaveValidApiData(createResponse);
      });
      
      // Wait for modal to close
      await expect(modal).toBeHidden({ timeout: 10000 });
      
      // Wait for table to update
      await testUtils.waitForNetworkIdle();
      
      // Verify new employee appears in the list
      const newEmployeeRow = page.locator(
        `[data-testid="employee-row"]:has-text("${testData.employee.valid.name}")`
      );
      await expect(newEmployeeRow).toBeVisible();
      
    } catch (error) {
      await testUtils.takeScreenshotOnError('employee-create', error);
      throw error;
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    test.setTimeout(60000);
    
    try {
      // Navigate to employees page
      await testUtils.safeClick('[data-testid="employees-nav"]');
      
      // Try to create employee with invalid data
      await testUtils.safeClick('[data-testid="create-employee-btn"]');
      
      const modal = await testUtils.waitForStableElement('[data-testid="employee-modal"]');
      
      // Fill with invalid data
      await testUtils.safeFill('[data-testid="employee-name"]', ''); // Empty name
      await testUtils.safeFill('[data-testid="employee-email"]', testData.employee.invalid.invalidEmail.email);
      
      // Submit and expect error
      await testUtils.safeClick('[data-testid="save-employee-btn"]');
      
      // Wait for error message to appear
      const errorMessage = await testUtils.waitForStableElement('[data-testid="error-message"]', {
        timeout: 15000
      });
      
      await expect(errorMessage).toBeVisible();
      
      // Verify modal is still open (form not submitted)
      await expect(modal).toBeVisible();
      
    } catch (error) {
      await testUtils.takeScreenshotOnError('employee-error-handling', error);
      throw error;
    }
  });

  test('should handle slow API responses', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for slow API test
    
    try {
      // Navigate to a potentially slow endpoint
      await testUtils.safeClick('[data-testid="analytics-nav"]');
      
      // Wait for potentially slow analytics API
      const analyticsResponse = await testUtils.waitForApiResponse('/api/analytics', {
        timeout: 30000 // Extended timeout for analytics
      });
      
      await customExpected.toBeSuccessfulResponse(analyticsResponse);
      
      // Wait for complex data visualization to load
      await testUtils.waitForLoadingComplete('[data-testid="chart-loading"]');
      
      // Wait for charts to be stable
      const charts = await testUtils.waitForStableElement('[data-testid="analytics-charts"]', {
        stable: 2000 // Wait longer for charts to render
      });
      
      await expect(charts).toBeVisible();
      
    } catch (error) {
      await testUtils.takeScreenshotOnError('slow-api-response', error);
      throw error;
    }
  });

  test('should handle network instability', async ({ page }) => {
    test.setTimeout(90000);
    
    try {
      // Simulate network conditions by adding delays
      await page.route('**/api/**', async (route) => {
        // Add random delay to simulate network instability
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        route.continue();
      });
      
      // Navigate to employees page
      await testUtils.retryWithBackoff(async () => {
        await testUtils.safeClick('[data-testid="employees-nav"]');
        await testUtils.waitForApiResponse('/api/employees', { timeout: 25000 });
      });
      
      // Perform operations with retry logic
      await testUtils.retryWithBackoff(async () => {
        const table = await testUtils.waitForStableElement('[data-testid="employee-table"]');
        await expect(table).toBeVisible();
      });
      
    } catch (error) {
      await testUtils.takeScreenshotOnError('network-instability', error);
      throw error;
    }
  });
});

// Custom expect extension for this file
const customExpected = {
  async toBeSuccessfulResponse(response: any) {
    expect(response.status()).toBeLessThan(400);
    expect(response.status()).toBeGreaterThanOrEqual(200);
  },

  async toHaveValidApiData(response: any) {
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
  }
};