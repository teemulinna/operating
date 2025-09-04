import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Employee Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Employee CRUD Operations', () => {
    test('should create a new employee through the UI', async ({ page }) => {
      // Click on Add Employee button
      await page.click('[data-testid="add-employee-button"]');
      
      // Fill out the employee form
      await page.fill('[data-testid="first-name-input"]', 'John');
      await page.fill('[data-testid="last-name-input"]', 'Doe');
      await page.fill('[data-testid="email-input"]', 'john.doe.e2e@example.com');
      await page.fill('[data-testid="phone-input"]', '+1-555-0101');
      await page.fill('[data-testid="position-input"]', 'Software Engineer');
      
      // Select department from dropdown
      await page.click('[data-testid="department-select"]');
      await page.click('[data-testid="department-option-engineering"]');
      
      await page.fill('[data-testid="salary-input"]', '75000');
      await page.fill('[data-testid="hire-date-input"]', '2023-01-15');
      
      // Select status
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-active"]');
      
      // Submit the form
      await page.click('[data-testid="submit-employee-form"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify employee appears in the list
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'John Doe' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-email"]').filter({ hasText: 'john.doe.e2e@example.com' })).toBeVisible();
    });

    test('should edit an existing employee', async ({ page }) => {
      // First create an employee (could also be done in beforeEach)
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="first-name-input"]', 'Jane');
      await page.fill('[data-testid="last-name-input"]', 'Smith');
      await page.fill('[data-testid="email-input"]', 'jane.smith.e2e@example.com');
      await page.fill('[data-testid="phone-input"]', '+1-555-0102');
      await page.fill('[data-testid="position-input"]', 'Developer');
      await page.click('[data-testid="department-select"]');
      await page.click('[data-testid="department-option-engineering"]');
      await page.fill('[data-testid="salary-input"]', '70000');
      await page.fill('[data-testid="hire-date-input"]', '2023-02-15');
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-active"]');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Wait for employee to be created
      await page.waitForTimeout(1000);
      
      // Click edit button for the employee
      await page.click('[data-testid="edit-employee-button"]');
      
      // Modify employee data
      await page.fill('[data-testid="position-input"]', 'Senior Developer');
      await page.fill('[data-testid="salary-input"]', '85000');
      
      // Submit the form
      await page.click('[data-testid="submit-employee-form"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify changes are reflected
      await expect(page.locator('[data-testid="employee-position"]').filter({ hasText: 'Senior Developer' })).toBeVisible();
    });

    test('should delete an employee', async ({ page }) => {
      // First create an employee
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="first-name-input"]', 'Mike');
      await page.fill('[data-testid="last-name-input"]', 'Johnson');
      await page.fill('[data-testid="email-input"]', 'mike.johnson.e2e@example.com');
      await page.fill('[data-testid="phone-input"]', '+1-555-0103');
      await page.fill('[data-testid="position-input"]', 'Product Manager');
      await page.click('[data-testid="department-select"]');
      await page.click('[data-testid="department-option-product"]');
      await page.fill('[data-testid="salary-input"]', '90000');
      await page.fill('[data-testid="hire-date-input"]', '2023-03-15');
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-active"]');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Wait for employee to be created
      await page.waitForTimeout(1000);
      
      // Click delete button
      await page.click('[data-testid="delete-employee-button"]');
      
      // Confirm deletion in modal
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Verify employee is removed from list
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Mike Johnson' })).not.toBeVisible();
    });
  });

  test.describe('Search and Filtering', () => {
    test.beforeEach(async ({ page }) => {
      // Create test employees for search tests
      const employees = [
        { firstName: 'Alice', lastName: 'Engineer', email: 'alice.engineer.e2e@example.com', position: 'Software Engineer', department: 'engineering' },
        { firstName: 'Bob', lastName: 'Designer', email: 'bob.designer.e2e@example.com', position: 'UI Designer', department: 'design' },
        { firstName: 'Charlie', lastName: 'Manager', email: 'charlie.manager.e2e@example.com', position: 'Product Manager', department: 'product' },
      ];

      for (const employee of employees) {
        await page.click('[data-testid="add-employee-button"]');
        await page.fill('[data-testid="first-name-input"]', employee.firstName);
        await page.fill('[data-testid="last-name-input"]', employee.lastName);
        await page.fill('[data-testid="email-input"]', employee.email);
        await page.fill('[data-testid="phone-input"]', '+1-555-0000');
        await page.fill('[data-testid="position-input"]', employee.position);
        await page.click('[data-testid="department-select"]');
        await page.click(`[data-testid="department-option-${employee.department}"]`);
        await page.fill('[data-testid="salary-input"]', '75000');
        await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
        await page.click('[data-testid="status-select"]');
        await page.click('[data-testid="status-option-active"]');
        await page.click('[data-testid="submit-employee-form"]');
        await page.waitForTimeout(500);
      }
    });

    test('should search employees by name', async ({ page }) => {
      // Type in search box
      await page.fill('[data-testid="search-input"]', 'Alice');
      
      // Wait for search results
      await page.waitForTimeout(500);
      
      // Verify only Alice is visible
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Alice Engineer' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Bob Designer' })).not.toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Charlie Manager' })).not.toBeVisible();
    });

    test('should filter employees by department', async ({ page }) => {
      // Click department filter
      await page.click('[data-testid="department-filter"]');
      await page.click('[data-testid="filter-engineering"]');
      
      // Wait for filter results
      await page.waitForTimeout(500);
      
      // Verify only Engineering employees are visible
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Alice Engineer' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Bob Designer' })).not.toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Charlie Manager' })).not.toBeVisible();
    });

    test('should clear search and show all employees', async ({ page }) => {
      // Search for specific employee
      await page.fill('[data-testid="search-input"]', 'Alice');
      await page.waitForTimeout(500);
      
      // Clear search
      await page.click('[data-testid="clear-search-button"]');
      
      // Verify all employees are visible again
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Alice Engineer' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Bob Designer' })).toBeVisible();
      await expect(page.locator('[data-testid="employee-row"]').filter({ hasText: 'Charlie Manager' })).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty required fields', async ({ page }) => {
      // Click Add Employee
      await page.click('[data-testid="add-employee-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-employee-form"]');
      
      // Check for validation error messages
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Fill with invalid email
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.blur('[data-testid="email-input"]');
      
      // Check for email validation error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');
    });

    test('should show validation error for duplicate email', async ({ page }) => {
      const email = 'duplicate.email.e2e@example.com';
      
      // Create first employee
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="first-name-input"]', 'First');
      await page.fill('[data-testid="last-name-input"]', 'Employee');
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="phone-input"]', '+1-555-0001');
      await page.fill('[data-testid="position-input"]', 'Developer');
      await page.click('[data-testid="department-select"]');
      await page.click('[data-testid="department-option-engineering"]');
      await page.fill('[data-testid="salary-input"]', '70000');
      await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-active"]');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Wait for success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      
      // Try to create second employee with same email
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="first-name-input"]', 'Second');
      await page.fill('[data-testid="last-name-input"]', 'Employee');
      await page.fill('[data-testid="email-input"]', email);
      await page.fill('[data-testid="phone-input"]', '+1-555-0002');
      await page.fill('[data-testid="position-input"]', 'Developer');
      await page.click('[data-testid="department-select"]');
      await page.click('[data-testid="department-option-engineering"]');
      await page.fill('[data-testid="salary-input"]', '70000');
      await page.fill('[data-testid="hire-date-input"]', '2023-01-01');
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-active"]');
      await page.click('[data-testid="submit-employee-form"]');
      
      // Check for duplicate email error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('email already exists');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to page
      await page.goto('/');
      
      // Check if mobile navigation works
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      
      // Check if menu items are accessible
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Test employee creation on mobile
      await page.click('[data-testid="add-employee-button"]');
      await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/');
      
      // Check if layout adapts to tablet size
      await expect(page.locator('[data-testid="employee-grid"]')).toBeVisible();
      
      // Test that all functionality works on tablet
      await page.click('[data-testid="add-employee-button"]');
      await page.fill('[data-testid="first-name-input"]', 'Tablet');
      await page.fill('[data-testid="last-name-input"]', 'Test');
      await page.fill('[data-testid="email-input"]', 'tablet.test.e2e@example.com');
      
      await expect(page.locator('[data-testid="employee-form"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load employee list within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large employee lists efficiently', async ({ page }) => {
      // This test would ideally have a large dataset pre-loaded
      await page.goto('/');
      
      // Measure time to search through large dataset
      const startTime = Date.now();
      
      await page.fill('[data-testid="search-input"]', 'test search');
      await page.waitForTimeout(500); // Wait for search to complete
      
      const searchTime = Date.now() - startTime;
      
      // Search should complete within 1 second
      expect(searchTime).toBeLessThan(1000);
    });
  });
});