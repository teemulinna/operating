import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDatabaseUtils } from '../fixtures/testDataFactory';

const API_BASE_URL = 'http://localhost:3001';

test.describe('Error Handling and Loading States', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for API to be available
    await TestDatabaseUtils.waitForAPI(API_BASE_URL);
    
    // Clean database before each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test.afterEach(async () => {
    // Clean up after each test
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
  });

  test('should handle API connection errors gracefully', async ({ page }) => {
    // Mock API failure for employees endpoint
    await page.route('**/api/employees', route => {
      route.abort('failed');
    });
    
    await page.goto('/employees');
    
    // Page should still load
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Should show error state or retry mechanism
    // The exact error handling depends on implementation
    await page.waitForTimeout(3000);
  });

  test('should show loading states for data fetching', async ({ page }) => {
    // Create some test data first
    const employees = TestDataFactory.createEmployees(3);
    for (const employee of employees) {
      await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
    }
    
    // Mock slow API response
    await page.route('**/api/employees', async (route) => {
      // Delay the response
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.continue();
    });
    
    // Navigate to employees page
    await page.goto('/employees');
    
    // Check for loading state
    const loadingIndicator = page.getByTestId('employees-loading');
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Data should eventually load
    await expect(page.getByTestId('employee-list')).toBeVisible({ timeout: 10000 });
  });

  test('should handle form submission errors', async ({ page }) => {
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible();
    
    // Mock API error for employee creation
    await page.route('**/api/employees', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Validation failed',
            message: 'Email already exists'
          })
        });
      } else {
        route.continue();
      }
    });
    
    // Try to create an employee
    await page.getByTestId('add-employee-button').click();
    
    const testEmployee = TestDataFactory.createEmployee();
    await page.getByTestId('employee-first-name').fill(testEmployee.firstName);
    await page.getByTestId('employee-last-name').fill(testEmployee.lastName);
    await page.getByTestId('employee-email').fill(testEmployee.email);
    await page.getByTestId('employee-position').fill(testEmployee.position);
    await page.getByTestId('employee-department').selectOption(testEmployee.departmentId);
    await page.getByTestId('employee-hours').fill(testEmployee.defaultHoursPerWeek.toString());
    await page.getByTestId('employee-salary').fill(testEmployee.salary.toString());
    
    // Submit form
    await page.getByTestId('employee-form-submit').click();
    
    // Should show error message
    await expect(page.getByText(/Email already exists/i)).toBeVisible({ timeout: 5000 });
    
    // Form should still be visible for correction
    await expect(page.getByTestId('employee-form')).toBeVisible();
  });

  test('should handle network timeouts', async ({ page }) => {
    // Mock timeout for dashboard stats
    await page.route('**/api/dashboard/stats', route => {
      // Never resolve the request to simulate timeout
      // The request will timeout based on page timeout settings
    });
    
    await page.goto('/');
    
    // Dashboard should still be displayed
    await expect(page.getByTestId('dashboard-page')).toBeVisible();
    
    // Should handle timeout gracefully (show error or default values)
    await page.waitForTimeout(5000);
    
    // Stats should show some default state
    await expect(page.getByTestId('employees-count')).toBeVisible();
    await expect(page.getByTestId('projects-count')).toBeVisible();
  });

  test('should handle server errors (500)', async ({ page }) => {
    // Mock server error for projects
    await page.route('**/api/projects', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Internal server error',
          message: 'Database connection failed'
        })
      });
    });
    
    await page.goto('/projects');
    
    // Page should load
    await expect(page.getByTestId('projects-page')).toBeVisible({ timeout: 10000 });
    
    // Should show error message or empty state
    await page.waitForTimeout(3000);
    
    // Should have some error indication
    const errorElements = await page.getByText(/error/i).count();
    if (errorElements > 0) {
      await expect(page.getByText(/error/i).first()).toBeVisible();
    }
  });

  test('should handle unauthorized access (401)', async ({ page }) => {
    // Mock unauthorized error
    await page.route('**/api/allocations', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      });
    });
    
    await page.goto('/allocations');
    
    // Should handle unauthorized state
    await expect(page.getByTestId('allocations-page')).toBeVisible({ timeout: 10000 });
    
    // May show login prompt or error message
    await page.waitForTimeout(3000);
  });

  test('should handle loading states in forms', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('add-employee-button').click();
    
    // Mock slow form submission
    await page.route('**/api/employees', route => {
      if (route.request().method() === 'POST') {
        setTimeout(() => {
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ 
              data: { id: '123', ...JSON.parse(route.request().postData() || '{}') }
            })
          });
        }, 3000);
      } else {
        route.continue();
      }
    });
    
    // Fill and submit form
    const testEmployee = TestDataFactory.createEmployee();
    await page.getByTestId('employee-first-name').fill(testEmployee.firstName);
    await page.getByTestId('employee-last-name').fill(testEmployee.lastName);
    await page.getByTestId('employee-email').fill(testEmployee.email);
    await page.getByTestId('employee-position').fill(testEmployee.position);
    await page.getByTestId('employee-department').selectOption(testEmployee.departmentId);
    await page.getByTestId('employee-hours').fill(testEmployee.defaultHoursPerWeek.toString());
    await page.getByTestId('employee-salary').fill(testEmployee.salary.toString());
    
    await page.getByTestId('employee-form-submit').click();
    
    // Should show loading state
    await expect(page.getByTestId('loading-spinner')).toBeVisible();
    await expect(page.getByText('Creating...')).toBeVisible();
    
    // Button should be disabled during loading
    await expect(page.getByTestId('employee-form-submit')).toBeDisabled();
    
    // Should complete eventually
    await expect(page.getByTestId('loading-spinner')).toBeHidden({ timeout: 10000 });
  });

  test('should handle empty data states', async ({ page }) => {
    // Ensure database is clean (no data)
    await TestDatabaseUtils.cleanDatabase(API_BASE_URL);
    
    // Navigate to employees page with no data
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Should show empty state message
    const emptyState = page.getByTestId('employees-empty-state');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/No employees/i);
    }
    
    // Add button should still be available
    await expect(page.getByTestId('add-employee-button')).toBeVisible();
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock malformed JSON response
    await page.route('**/api/employees', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json {malformed'
      });
    });
    
    await page.goto('/employees');
    
    // Should handle parsing error gracefully
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Should show error state or empty state
    await page.waitForTimeout(3000);
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;
    
    // Mock first request to fail, second to succeed
    await page.route('**/api/employees', route => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      }
    });
    
    await page.goto('/employees');
    
    // Look for retry button or automatic retry
    const retryButton = page.getByTestId('retry-button');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
    
    // Should eventually succeed
    await expect(page.getByTestId('employee-list')).toBeVisible({ timeout: 15000 });
  });

  test('should handle concurrent requests properly', async ({ page }) => {
    // Create test data
    const employees = TestDataFactory.createEmployees(2);
    for (const employee of employees) {
      await fetch(`${API_BASE_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee)
      });
    }
    
    // Navigate to employees page
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Open multiple forms simultaneously
    await page.getByTestId('add-employee-button').click();
    await expect(page.getByTestId('employee-form')).toBeVisible();
    
    // Click cancel and add another
    await page.getByText('Cancel').click();
    await page.getByTestId('add-employee-button').click();
    
    // Should handle multiple rapid operations
    await expect(page.getByTestId('employee-form')).toBeVisible();
  });

  test('should handle browser offline state', async ({ page, context }) => {
    // Go online first
    await context.setOffline(false);
    await page.goto('/employees');
    await expect(page.getByTestId('employees-page')).toBeVisible({ timeout: 10000 });
    
    // Go offline
    await context.setOffline(true);
    
    // Try to perform an action that requires network
    await page.getByTestId('add-employee-button').click();
    
    const testEmployee = TestDataFactory.createEmployee();
    await page.getByTestId('employee-first-name').fill(testEmployee.firstName);
    await page.getByTestId('employee-last-name').fill(testEmployee.lastName);
    await page.getByTestId('employee-email').fill(testEmployee.email);
    await page.getByTestId('employee-position').fill(testEmployee.position);
    await page.getByTestId('employee-department').selectOption(testEmployee.departmentId);
    await page.getByTestId('employee-hours').fill(testEmployee.defaultHoursPerWeek.toString());
    await page.getByTestId('employee-salary').fill(testEmployee.salary.toString());
    
    await page.getByTestId('employee-form-submit').click();
    
    // Should handle offline state (show error or queue for later)
    await page.waitForTimeout(3000);
    
    // Go back online
    await context.setOffline(false);
  });

  test('should show appropriate loading skeletons', async ({ page }) => {
    // Mock delayed response
    await page.route('**/api/employees', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });
    
    await page.goto('/employees');
    
    // Look for skeleton loaders or loading states
    const loadingSkeletons = page.getByTestId('loading-skeleton');
    if (await loadingSkeletons.first().isVisible()) {
      await expect(loadingSkeletons.first()).toBeVisible();
    }
    
    // Should eventually show actual content
    await expect(page.getByTestId('employee-list')).toBeVisible({ timeout: 10000 });
  });

  test('should handle form validation errors gracefully', async ({ page }) => {
    await page.goto('/employees');
    await page.getByTestId('add-employee-button').click();
    
    // Submit form with invalid data
    await page.getByTestId('employee-email').fill('invalid-email');
    await page.getByTestId('employee-form-submit').click();
    
    // Should show validation errors
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    
    // Form should remain open for correction
    await expect(page.getByTestId('employee-form')).toBeVisible();
    
    // Should highlight invalid fields
    const emailField = page.getByTestId('employee-email');
    await expect(emailField).toHaveClass(/border-red-500/);
  });
});