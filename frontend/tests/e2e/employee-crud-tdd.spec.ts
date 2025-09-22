import { test, expect } from '@playwright/test';

test.describe('PRD Story 1.1 - Employee CRUD with TDD', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to employees page
    await page.goto('/employees');
    await page.waitForLoadState('networkidle');
  });

  test.describe('RED Phase - Failing Tests', () => {
    test('should display Add Employee button on employees page', async ({ page }) => {
      // This should fail initially as button doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await expect(addButton).toBeVisible();
      await expect(addButton).toHaveText('Add Employee');
    });

    test('should open employee form modal when Add Employee button is clicked', async ({ page }) => {
      // This should fail as modal doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      const modal = page.getByTestId('employee-form-modal');
      await expect(modal).toBeVisible();
      
      const modalTitle = page.getByTestId('modal-title');
      await expect(modalTitle).toHaveText('Add New Employee');
    });

    test('should have required form fields in employee form modal', async ({ page }) => {
      // This should fail as form doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();

      // Check required fields as per PRD
      await expect(page.getByTestId('employee-first-name')).toBeVisible();
      await expect(page.getByTestId('employee-last-name')).toBeVisible();
      await expect(page.getByTestId('employee-email')).toBeVisible();
      await expect(page.getByTestId('employee-position')).toBeVisible();
      await expect(page.getByTestId('employee-department')).toBeVisible();
      await expect(page.getByTestId('employee-default-hours')).toBeVisible();
      
      // Default hours per week should have default value (PRD requirement)
      const weeklyCapacityField = page.getByTestId('employee-default-hours');
      await expect(weeklyCapacityField).toHaveValue('40');
    });

    test('should validate form fields when submitting empty form', async ({ page }) => {
      // This should fail as validation doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Should show validation errors
      await expect(page.getByTestId('first-name-error')).toBeVisible();
      await expect(page.getByTestId('last-name-error')).toBeVisible();
      await expect(page.getByTestId('email-error')).toBeVisible();
      await expect(page.getByTestId('position-error')).toBeVisible();
      await expect(page.getByTestId('department-error')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      // This should fail as email validation doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      await page.getByTestId('employee-email').fill('invalid-email');
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      await expect(page.getByTestId('email-format-error')).toBeVisible();
      await expect(page.getByTestId('email-format-error')).toHaveText('Please enter a valid email address');
    });

    test('should create employee via API call', async ({ page, request }) => {
      // This should fail as API integration doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      // Fill form with valid data
      await page.getByTestId('employee-first-name').fill('John');
      await page.getByTestId('employee-last-name').fill('Doe');
      await page.getByTestId('employee-email').fill('john.doe@example.com');
      await page.getByTestId('employee-position').fill('Software Engineer');
      await page.getByTestId('employee-department').selectOption('Engineering');
      await page.getByTestId('employee-default-hours').fill('40');
      
      // Mock API response
      await page.route('**/api/employees', async route => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: '1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              position: 'Software Engineer',
              departmentId: '1',
              departmentName: 'Engineering',
              weeklyCapacity: 40,
              createdAt: new Date().toISOString()
            }
          })
        });
      });
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Should show success message
      await expect(page.getByTestId('success-message')).toBeVisible();
      await expect(page.getByTestId('success-message')).toHaveText('Employee created successfully');
    });

    test('should display new employee in list after creation', async ({ page }) => {
      // This should fail as optimistic updates don't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      // Fill and submit form
      await page.getByTestId('employee-first-name').fill('Jane');
      await page.getByTestId('employee-last-name').fill('Smith');
      await page.getByTestId('employee-email').fill('jane.smith@example.com');
      await page.getByTestId('employee-position').fill('Product Manager');
      await page.getByTestId('employee-department').selectOption('Product');
      
      await page.route('**/api/employees', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: '2',
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com',
                position: 'Product Manager',
                departmentId: '2',
                departmentName: 'Product',
                weeklyCapacity: 40
              }
            })
          });
        }
      });
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Modal should close and new employee should appear in list
      await expect(page.getByTestId('employee-form-modal')).not.toBeVisible();
      await expect(page.getByTestId('employee-2')).toBeVisible();
      await expect(page.getByTestId('employee-name-2')).toHaveText('Jane Smith');
    });

    test('should display edit button for each employee in list', async ({ page }) => {
      // This should fail as edit buttons don't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const editButtons = page.getByTestId(/^edit-employee-\d+$/);
      await expect(editButtons.first()).toBeVisible();
    });

    test('should open edit form modal when edit button is clicked', async ({ page }) => {
      // This should fail as edit modal doesn't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const editButton = page.getByTestId(/^edit-employee-\d+$/).first();
      await editButton.click();
      
      const modal = page.getByTestId('employee-form-modal');
      await expect(modal).toBeVisible();
      
      const modalTitle = page.getByTestId('modal-title');
      await expect(modalTitle).toHaveText('Edit Employee');
    });

    test('should populate edit form with existing employee data', async ({ page }) => {
      // This should fail as edit functionality doesn't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const editButton = page.getByTestId(/^edit-employee-\d+$/).first();
      await editButton.click();
      
      // Form should be pre-populated with existing data
      const firstNameField = page.getByTestId('employee-first-name');
      await expect(firstNameField).not.toHaveValue('');
      
      const emailField = page.getByTestId('employee-email');
      await expect(emailField).not.toHaveValue('');
    });

    test('should update employee via API call', async ({ page }) => {
      // This should fail as update API doesn't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const editButton = page.getByTestId(/^edit-employee-\d+$/).first();
      await editButton.click();
      
      // Update employee data
      await page.getByTestId('employee-first-name').fill('Updated John');
      await page.getByTestId('employee-position').fill('Senior Software Engineer');
      
      await page.route('**/api/employees/*', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: '1',
                firstName: 'Updated John',
                lastName: 'Doe',
                position: 'Senior Software Engineer'
              }
            })
          });
        }
      });
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Should show success message
      await expect(page.getByTestId('success-message')).toBeVisible();
      await expect(page.getByTestId('success-message')).toHaveText('Employee updated successfully');
    });

    test('should display delete button for each employee', async ({ page }) => {
      // This should fail as delete buttons don't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const deleteButtons = page.getByTestId(/^delete-employee-\d+$/);
      await expect(deleteButtons.first()).toBeVisible();
    });

    test('should show confirmation dialog when delete button is clicked', async ({ page }) => {
      // This should fail as delete confirmation doesn't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const deleteButton = page.getByTestId(/^delete-employee-\d+$/).first();
      await deleteButton.click();
      
      const confirmDialog = page.getByTestId('delete-confirmation-dialog');
      await expect(confirmDialog).toBeVisible();
      
      const confirmMessage = page.getByTestId('delete-confirmation-message');
      await expect(confirmMessage).toContainText('Are you sure you want to delete this employee?');
      
      await expect(page.getByTestId('confirm-delete-button')).toBeVisible();
      await expect(page.getByTestId('cancel-delete-button')).toBeVisible();
    });

    test('should delete employee via API call when confirmed', async ({ page }) => {
      // This should fail as delete API doesn't exist
      await page.waitForSelector('[data-testid^="employee-"]');
      
      const employeeCount = await page.getByTestId(/^employee-\d+$/).count();
      
      const deleteButton = page.getByTestId(/^delete-employee-\d+$/).first();
      await deleteButton.click();
      
      await page.route('**/api/employees/*', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Employee deleted successfully'
            })
          });
        }
      });
      
      const confirmButton = page.getByTestId('confirm-delete-button');
      await confirmButton.click();
      
      // Employee should be removed from list
      await expect(page.getByTestId(/^employee-\d+$/)).toHaveCount(employeeCount - 1);
      
      // Should show success message
      await expect(page.getByTestId('success-message')).toBeVisible();
      await expect(page.getByTestId('success-message')).toHaveText('Employee deleted successfully');
    });

    test('should show loading states during API operations', async ({ page }) => {
      // This should fail as loading states don't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      // Fill form
      await page.getByTestId('employee-first-name').fill('Test');
      await page.getByTestId('employee-last-name').fill('User');
      await page.getByTestId('employee-email').fill('test@example.com');
      await page.getByTestId('employee-position').fill('Tester');
      await page.getByTestId('employee-department').selectOption('QA');
      
      // Mock slow API response
      await page.route('**/api/employees', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} })
        });
      });
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Should show loading state
      await expect(page.getByTestId('submit-loading')).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // This should fail as error handling doesn't exist
      const addButton = page.getByTestId('add-employee-button');
      await addButton.click();
      
      // Fill form
      await page.getByTestId('employee-first-name').fill('Error');
      await page.getByTestId('employee-last-name').fill('Test');
      await page.getByTestId('employee-email').fill('error@example.com');
      await page.getByTestId('employee-position').fill('Tester');
      await page.getByTestId('employee-department').selectOption('QA');
      
      // Mock API error
      await page.route('**/api/employees', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Email already exists'
          })
        });
      });
      
      const submitButton = page.getByTestId('submit-employee');
      await submitButton.click();
      
      // Should show error message
      await expect(page.getByTestId('error-message')).toBeVisible();
      await expect(page.getByTestId('error-message')).toHaveText('Email already exists');
    });
  });
});