import { test, expect } from '@playwright/test';
import { TestDataFactory, TestDataSetup } from '../fixtures/testDataFactory';

test.describe('Employee CRUD - Improved with Data Management', () => {
  test.beforeAll(async () => {
    // Clean database before starting tests
    await TestDataSetup.cleanDatabase();
  });

  test.afterAll(async () => {
    // Clean up after all tests
    await TestDataSetup.cleanDatabase();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Employee List and Navigation', () => {
    test('should display employees page with correct elements', async ({ page }) => {
      // Check page title
      await expect(page.locator('[data-testid="employees-title"]')).toHaveText('Employees');
      
      // Check Add Employee button exists
      const addButton = page.locator('[data-testid="add-employee-button"]');
      await expect(addButton).toBeVisible();
      await expect(addButton).toHaveText('Add Employee');
      
      // Check employees list container exists
      await expect(page.locator('[data-testid="employees-list"]')).toBeVisible();
    });

    test('should show employees summary', async ({ page }) => {
      const summary = page.locator('[data-testid="employees-summary"]');
      await expect(summary).toBeVisible();
      await expect(summary).toContainText('Total:');
      await expect(summary).toContainText('employees');
    });
  });

  test.describe('Add Employee', () => {
    test('should open employee form modal when clicking Add Employee', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Modal should be visible
      const modal = page.locator('[data-testid="employee-form-modal"]');
      await expect(modal).toBeVisible();
      
      // Modal title should be correct
      const modalTitle = page.locator('[data-testid="modal-title"]');
      await expect(modalTitle).toHaveText('Add New Employee');
    });

    test('should display all required form fields', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Check all required fields are present
      await expect(page.locator('[data-testid="employee-first-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-last-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-email"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-position"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-department"]')).toBeVisible();
      await expect(page.locator('[data-testid="employee-default-hours"]')).toBeVisible();
      
      // Default hours should have default value
      const weeklyCapacity = page.locator('[data-testid="employee-default-hours"]');
      await expect(weeklyCapacity).toHaveValue('40');
      
      // Submit button should be present
      await expect(page.locator('[data-testid="submit-employee"]')).toBeVisible();
    });

    test('should successfully create a new employee', async ({ page }) => {
      const employeeData = TestDataFactory.createEmployee({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        position: 'Software Engineer'
      });

      // Open modal and fill form
      await page.click('[data-testid="add-employee-button"]');
      
      await page.fill('[data-testid="employee-first-name"]', employeeData.firstName);
      await page.fill('[data-testid="employee-last-name"]', employeeData.lastName);
      await page.fill('[data-testid="employee-email"]', employeeData.email);
      await page.fill('[data-testid="employee-position"]', employeeData.position);
      await page.selectOption('[data-testid="employee-department"]', employeeData.departmentId);
      
      // Submit form
      await page.click('[data-testid="submit-employee"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Employee created successfully');
      
      // Modal should close
      await expect(page.locator('[data-testid="employee-form-modal"]')).not.toBeVisible();
      
      // Employee should appear in list
      await page.waitForTimeout(500); // Allow time for list to update
      const employeeElements = page.locator('[data-testid^="employee-"]');
      await expect(employeeElements).not.toHaveCount(0);
    });

    test('should show loading state during creation', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/employees', async route => {
        if (route.request().method() === 'POST') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { id: '1', firstName: 'Test', lastName: 'User' }
            })
          });
        } else {
          await route.continue();
        }
      });

      const employeeData = TestDataFactory.createEmployee();
      
      await page.click('[data-testid="add-employee-button"]');
      
      // Fill form quickly
      await page.fill('[data-testid="employee-first-name"]', employeeData.firstName);
      await page.fill('[data-testid="employee-last-name"]', employeeData.lastName);
      await page.fill('[data-testid="employee-email"]', employeeData.email);
      await page.fill('[data-testid="employee-position"]', employeeData.position);
      await page.selectOption('[data-testid="employee-department"]', employeeData.departmentId);
      
      // Click submit and check loading state
      await page.click('[data-testid="submit-employee"]');
      
      // Should show loading state
      await expect(page.locator('[data-testid="submit-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="submit-employee"]')).toBeDisabled();
    });

    test('should validate required fields', async ({ page }) => {
      await page.click('[data-testid="add-employee-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="submit-employee"]');
      
      // Should not close modal and should show validation (browser validation)
      await expect(page.locator('[data-testid="employee-form-modal"]')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/employees', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Email already exists'
            })
          });
        } else {
          route.continue();
        }
      });

      const employeeData = TestDataFactory.createEmployee();
      
      await page.click('[data-testid="add-employee-button"]');
      
      await page.fill('[data-testid="employee-first-name"]', employeeData.firstName);
      await page.fill('[data-testid="employee-last-name"]', employeeData.lastName);
      await page.fill('[data-testid="employee-email"]', employeeData.email);
      await page.fill('[data-testid="employee-position"]', employeeData.position);
      await page.selectOption('[data-testid="employee-department"]', employeeData.departmentId);
      
      await page.click('[data-testid="submit-employee"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
    });
  });

  test.describe('Edit and Delete Employee', () => {
    let createdEmployee: any;

    test.beforeEach(async ({ page }) => {
      // Create an employee for testing edit/delete
      const testData = TestDataFactory.createCompleteDataSet(1, 0);
      const seededData = await TestDataSetup.seedDatabase(testData);
      createdEmployee = seededData.employees[0];
      
      // Refresh page to show new employee
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should display edit and delete buttons for employees', async ({ page }) => {
      if (createdEmployee) {
        const editButton = page.locator(`[data-testid="edit-employee-${createdEmployee.id}"]`);
        const deleteButton = page.locator(`[data-testid="delete-employee-${createdEmployee.id}"]`);
        
        await expect(editButton).toBeVisible();
        await expect(deleteButton).toBeVisible();
      }
    });

    test('should open edit form with pre-filled data', async ({ page }) => {
      if (createdEmployee) {
        await page.click(`[data-testid="edit-employee-${createdEmployee.id}"]`);
        
        // Modal should open with correct title
        await expect(page.locator('[data-testid="employee-form-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="modal-title"]')).toHaveText('Edit Employee');
        
        // Form should be pre-filled
        const firstNameField = page.locator('[data-testid="employee-first-name"]');
        await expect(firstNameField).toHaveValue(createdEmployee.firstName);
        
        const emailField = page.locator('[data-testid="employee-email"]');
        await expect(emailField).toHaveValue(createdEmployee.email);
      }
    });

    test('should successfully update an employee', async ({ page }) => {
      if (createdEmployee) {
        await page.click(`[data-testid="edit-employee-${createdEmployee.id}"]`);
        
        // Update the name
        await page.fill('[data-testid="employee-first-name"]', 'Updated Name');
        await page.fill('[data-testid="employee-position"]', 'Senior Developer');
        
        await page.click('[data-testid="submit-employee"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Employee updated successfully');
      }
    });

    test('should show delete confirmation dialog', async ({ page }) => {
      if (createdEmployee) {
        await page.click(`[data-testid="delete-employee-${createdEmployee.id}"]`);
        
        // Confirmation dialog should appear
        const confirmDialog = page.locator('[data-testid="delete-confirmation-dialog"]');
        await expect(confirmDialog).toBeVisible();
        
        const confirmMessage = page.locator('[data-testid="delete-confirmation-message"]');
        await expect(confirmMessage).toContainText('Are you sure you want to delete');
        
        await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="cancel-delete-button"]')).toBeVisible();
      }
    });

    test('should successfully delete an employee', async ({ page }) => {
      if (createdEmployee) {
        // Count employees before deletion
        const employeesBefore = await page.locator('[data-testid^="employee-"]').count();
        
        await page.click(`[data-testid="delete-employee-${createdEmployee.id}"]`);
        await page.click('[data-testid="confirm-delete-button"]');
        
        // Should show success message
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Employee deleted successfully');
        
        // Employee count should decrease
        await page.waitForTimeout(500);
        const employeesAfter = await page.locator('[data-testid^="employee-"]').count();
        expect(employeesAfter).toBeLessThan(employeesBefore);
      }
    });

    test('should cancel delete when clicking cancel', async ({ page }) => {
      if (createdEmployee) {
        await page.click(`[data-testid="delete-employee-${createdEmployee.id}"]`);
        await page.click('[data-testid="cancel-delete-button"]');
        
        // Dialog should close
        await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
        
        // Employee should still be visible
        await expect(page.locator(`[data-testid="employee-${createdEmployee.id}"]`)).toBeVisible();
      }
    });
  });
});