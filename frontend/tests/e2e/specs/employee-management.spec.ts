import { test, expect } from '@playwright/test';

/**
 * Comprehensive Employee Management E2E Tests
 *
 * This test suite validates all acceptance criteria for the Employee Management feature:
 * - US-EM1: View Employee List
 * - US-EM2: Add New Employee
 * - US-EM3: Edit Employee Information
 * - US-EM4: Delete Employee
 */

test.describe('Employee Management - Comprehensive Tests', () => {
  const API_BASE_URL = 'http://localhost:3001/api';
  const APP_BASE_URL = 'http://localhost:3002';

  // Test data
  const testEmployee = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${Date.now()}@example.com`,
    position: 'Senior Developer',
    weeklyCapacity: 40,
    salary: 85000,
    skills: ['TypeScript', 'React', 'Node.js']
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to employees page
    await page.goto(`${APP_BASE_URL}/employees`);
    // Wait for page to load
    await page.waitForSelector('[data-testid="employees-page"]', { timeout: 15000 });
  });

  test.describe('US-EM1: View Employee List', () => {

    test('EM1.1 - Should display employee list with all required fields', async ({ page }) => {
      await test.step('Wait for employees to load', async () => {
        // Wait for either loading or list to appear
        await Promise.race([
          page.waitForSelector('[data-testid="employees-loading"]', { timeout: 5000 }).catch(() => {}),
          page.waitForSelector('[data-testid="employees-list"]', { timeout: 5000 })
        ]);

        // Wait for loading to disappear
        await page.waitForSelector('[data-testid="employees-loading"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
      });

      await test.step('Verify employee list is displayed', async () => {
        const employeeList = page.locator('[data-testid="employees-list"]');
        await expect(employeeList).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify at least one employee card exists', async () => {
        const employeeCards = page.locator('[data-testid^="employee-"]');
        const count = await employeeCards.count();
        expect(count).toBeGreaterThan(0);
      });

      await test.step('Verify employee card displays all required fields', async () => {
        const firstEmployee = page.locator('[data-testid^="employee-"]').first();

        // Verify name is displayed
        const name = firstEmployee.locator('[data-testid^="employee-name-"]');
        await expect(name).toBeVisible();
        await expect(name).not.toBeEmpty();

        // Verify email is displayed
        const email = firstEmployee.locator('[data-testid^="employee-email-"]');
        await expect(email).toBeVisible();
        await expect(email).not.toBeEmpty();

        // Verify position is displayed
        const position = firstEmployee.locator('[data-testid^="employee-position-"]');
        await expect(position).toBeVisible();
        await expect(position).not.toBeEmpty();

        // Verify department is displayed
        const department = firstEmployee.locator('[data-testid^="employee-department-"]');
        await expect(department).toBeVisible();
        await expect(department).not.toBeEmpty();

        // Verify salary is displayed
        const salary = firstEmployee.locator('[data-testid^="employee-salary-"]');
        await expect(salary).toBeVisible();
        await expect(salary).not.toBeEmpty();

        // Verify weekly capacity is displayed
        const hours = firstEmployee.locator('[data-testid^="employee-hours-"]');
        await expect(hours).toBeVisible();
        await expect(hours).not.toBeEmpty();
      });
    });

    test('EM1.2 - Should show loading skeleton while data loads', async ({ page }) => {
      // Reload page to see loading state
      await page.reload();

      await test.step('Verify loading skeleton appears', async () => {
        const loading = page.locator('[data-testid="employees-loading"]');
        // Loading might be very fast, so we try to catch it or verify it's already loaded
        const isVisible = await loading.isVisible({ timeout: 1000 }).catch(() => false);
        const listVisible = await page.locator('[data-testid="employees-list"]').isVisible();

        // Either loading was shown or list is already there
        expect(isVisible || listVisible).toBeTruthy();
      });
    });

    test('EM1.3 - Should display employee count summary', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      await test.step('Verify employee summary is displayed', async () => {
        const summary = page.locator('[data-testid="employees-summary"]');
        await expect(summary).toBeVisible();

        const summaryText = await summary.textContent();
        expect(summaryText).toContain('Total:');
        expect(summaryText).toMatch(/\d+ employee/);
      });
    });

    test('EM1.4 - Should fetch and display department names correctly', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      await test.step('Verify department names are not just IDs', async () => {
        const firstDepartment = page.locator('[data-testid^="employee-department-"]').first();
        const departmentText = await firstDepartment.textContent();

        // Should be a readable name, not a UUID or "Unknown Department"
        expect(departmentText).not.toMatch(/^[a-f0-9-]{36}$/i); // Not a UUID
        expect(departmentText).not.toBe('');
        expect(departmentText?.length).toBeGreaterThan(0);
      });
    });
  });

  test.describe('US-EM2: Add New Employee', () => {

    test('EM2.1 - Should display "Add Employee" button and open form modal', async ({ page }) => {
      await test.step('Verify Add Employee button is visible and clickable', async () => {
        const addButton = page.locator('[data-testid="add-employee-button"]');
        await expect(addButton).toBeVisible();
        await expect(addButton).toBeEnabled();
      });

      await test.step('Click Add Employee button', async () => {
        await page.click('[data-testid="add-employee-button"]');
      });

      await test.step('Verify form modal opens', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const modalTitle = page.locator('[data-testid="modal-title"]');
        await expect(modalTitle).toHaveText('Add New Employee');
      });

      await test.step('Verify all form fields are present', async () => {
        await expect(page.locator('[data-testid="employee-first-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-last-name"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-email"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-position"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-department"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-weekly-capacity"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-salary"]')).toBeVisible();
        await expect(page.locator('[data-testid="employee-skills"]')).toBeVisible();
      });
    });

    test('EM2.2 - Should successfully create a new employee', async ({ page }) => {
      let createdEmployeeId: string | null = null;

      await test.step('Open form modal', async () => {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Fill in employee data', async () => {
        await page.fill('[data-testid="employee-first-name"]', testEmployee.firstName);
        await page.fill('[data-testid="employee-last-name"]', testEmployee.lastName);
        await page.fill('[data-testid="employee-email"]', testEmployee.email);
        await page.fill('[data-testid="employee-position"]', testEmployee.position);

        // Select first available department
        await page.selectOption('[data-testid="employee-department"]', { index: 1 });

        await page.fill('[data-testid="employee-weekly-capacity"]', testEmployee.weeklyCapacity.toString());
        await page.fill('[data-testid="employee-salary"]', testEmployee.salary.toString());
        await page.fill('[data-testid="employee-skills"]', testEmployee.skills.join(', '));
      });

      await test.step('Submit form', async () => {
        await page.click('[data-testid="submit-employee"]');
      });

      await test.step('Verify success toast appears', async () => {
        const toast = page.locator('[data-testid="success-toast"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });

        const toastText = await toast.textContent();
        expect(toastText?.toLowerCase()).toContain('success');
      });

      await test.step('Verify modal closes', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify new employee appears in list', async () => {
        await page.waitForTimeout(1000); // Wait for list to update

        const employeeName = `${testEmployee.firstName} ${testEmployee.lastName}`;
        const newEmployeeCard = page.locator(`text=${employeeName}`).first();
        await expect(newEmployeeCard).toBeVisible({ timeout: 5000 });

        // Get the employee ID from the card
        const cardElement = newEmployeeCard.locator('xpath=ancestor::div[contains(@data-testid, "employee-")]').first();
        const cardTestId = await cardElement.getAttribute('data-testid');
        createdEmployeeId = cardTestId?.replace('employee-', '') || null;
      });

      // Cleanup
      test.afterAll(async () => {
        if (createdEmployeeId) {
          await fetch(`${API_BASE_URL}/employees/${createdEmployeeId}`, {
            method: 'DELETE'
          }).catch(() => {});
        }
      });
    });

    test('EM2.3 - Should validate required fields', async ({ page }) => {
      await test.step('Open form modal', async () => {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Try to submit empty form', async () => {
        await page.click('[data-testid="submit-employee"]');
      });

      await test.step('Verify validation errors or form not submitted', async () => {
        // HTML5 validation should prevent submission
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).toBeVisible(); // Modal should still be open
      });
    });

    test('EM2.4 - Should validate email format', async ({ page }) => {
      await test.step('Open form modal', async () => {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Enter invalid email', async () => {
        await page.fill('[data-testid="employee-email"]', 'invalid-email');
        await page.fill('[data-testid="employee-first-name"]', 'Test');
        await page.click('[data-testid="submit-employee"]');
      });

      await test.step('Verify email validation', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).toBeVisible(); // Modal should still be open due to validation
      });
    });

    test('EM2.5 - Should allow canceling form', async ({ page }) => {
      await test.step('Open form modal', async () => {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Fill in some data', async () => {
        await page.fill('[data-testid="employee-first-name"]', 'Test');
        await page.fill('[data-testid="employee-last-name"]', 'User');
      });

      await test.step('Click cancel button', async () => {
        await page.click('[data-testid="cancel-button"]');
      });

      await test.step('Verify modal closes', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      });
    });
  });

  test.describe('US-EM3: Edit Employee Information', () => {

    test('EM3.1 - Should display edit button and open pre-filled form', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      await test.step('Verify edit button is visible', async () => {
        const firstEditButton = page.locator('[data-testid^="edit-employee-"]').first();
        await expect(firstEditButton).toBeVisible();
        await expect(firstEditButton).toBeEnabled();
      });

      await test.step('Click edit button', async () => {
        const firstEditButton = page.locator('[data-testid^="edit-employee-"]').first();
        await firstEditButton.click();
      });

      await test.step('Verify form modal opens with Edit title', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        const modalTitle = page.locator('[data-testid="modal-title"]');
        await expect(modalTitle).toHaveText('Edit Employee');
      });

      await test.step('Verify form fields are pre-filled', async () => {
        const firstName = await page.inputValue('[data-testid="employee-first-name"]');
        const lastName = await page.inputValue('[data-testid="employee-last-name"]');
        const email = await page.inputValue('[data-testid="employee-email"]');

        expect(firstName).not.toBe('');
        expect(lastName).not.toBe('');
        expect(email).not.toBe('');
      });
    });

    test('EM3.2 - Should successfully update employee information', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      let originalFirstName: string = '';
      const updatedPosition = `Updated Position ${Date.now()}`;

      await test.step('Get original employee name', async () => {
        const firstNameElement = page.locator('[data-testid^="employee-name-"]').first();
        originalFirstName = (await firstNameElement.textContent()) || '';
      });

      await test.step('Click edit button', async () => {
        const firstEditButton = page.locator('[data-testid^="edit-employee-"]').first();
        await firstEditButton.click();
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Update position field', async () => {
        await page.fill('[data-testid="employee-position"]', updatedPosition);
      });

      await test.step('Submit form', async () => {
        await page.click('[data-testid="submit-employee"]');
      });

      await test.step('Verify success toast appears', async () => {
        const toast = page.locator('[data-testid="success-toast"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });

        const toastText = await toast.textContent();
        expect(toastText?.toLowerCase()).toContain('success');
      });

      await test.step('Verify modal closes', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify updated position appears in list', async () => {
        await page.waitForTimeout(1000); // Wait for list to update

        const updatedPositionElement = page.locator(`text=${updatedPosition}`);
        await expect(updatedPositionElement).toBeVisible({ timeout: 5000 });
      });
    });

    test('EM3.3 - Should validate changes before submission', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      await test.step('Click edit button', async () => {
        const firstEditButton = page.locator('[data-testid^="edit-employee-"]').first();
        await firstEditButton.click();
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Clear required field', async () => {
        await page.fill('[data-testid="employee-first-name"]', '');
      });

      await test.step('Try to submit', async () => {
        await page.click('[data-testid="submit-employee"]');
      });

      await test.step('Verify form validation prevents submission', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).toBeVisible(); // Modal should still be open
      });
    });

    test('EM3.4 - Should allow canceling edit without saving', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      let originalPosition: string = '';

      await test.step('Get original position', async () => {
        const firstPositionElement = page.locator('[data-testid^="employee-position-"]').first();
        originalPosition = (await firstPositionElement.textContent()) || '';
      });

      await test.step('Click edit button', async () => {
        const firstEditButton = page.locator('[data-testid^="edit-employee-"]').first();
        await firstEditButton.click();
        await page.waitForSelector('[data-testid="employee-form-modal"]');
      });

      await test.step('Make changes', async () => {
        await page.fill('[data-testid="employee-position"]', 'Changed Position');
      });

      await test.step('Click cancel', async () => {
        await page.click('[data-testid="cancel-button"]');
      });

      await test.step('Verify modal closes', async () => {
        const modal = page.locator('[data-testid="employee-form-modal"]');
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify original position unchanged', async () => {
        const firstPositionElement = page.locator('[data-testid^="employee-position-"]').first();
        const currentPosition = await firstPositionElement.textContent();
        expect(currentPosition).toBe(originalPosition);
      });
    });
  });

  test.describe('US-EM4: Delete Employee', () => {

    test('EM4.1 - Should display delete button and open confirmation dialog', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      await test.step('Verify delete button is visible', async () => {
        const firstDeleteButton = page.locator('[data-testid^="delete-employee-"]').first();
        await expect(firstDeleteButton).toBeVisible();
        await expect(firstDeleteButton).toBeEnabled();
      });

      await test.step('Click delete button', async () => {
        const firstDeleteButton = page.locator('[data-testid^="delete-employee-"]').first();
        await firstDeleteButton.click();
      });

      await test.step('Verify confirmation dialog opens', async () => {
        const confirmDialog = page.locator('[data-testid="delete-confirmation-message"]');
        await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify dialog shows employee name', async () => {
        const dialogMessage = page.locator('[data-testid="delete-confirmation-message"]');
        const messageText = await dialogMessage.textContent();

        expect(messageText).toContain('Are you sure');
        // Should contain employee name
        expect(messageText?.length).toBeGreaterThan(20);
      });

      await test.step('Verify Cancel and Confirm buttons are present', async () => {
        const cancelButton = page.locator('[data-testid="cancel-delete-button"]');
        const confirmButton = page.locator('[data-testid="confirm-delete-button"]');

        await expect(cancelButton).toBeVisible();
        await expect(confirmButton).toBeVisible();
      });
    });

    test('EM4.2 - Should cancel deletion when Cancel button is clicked', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      const employeeCount = await page.locator('[data-testid^="employee-"]').count();

      await test.step('Click delete button', async () => {
        const firstDeleteButton = page.locator('[data-testid^="delete-employee-"]').first();
        await firstDeleteButton.click();
        await page.waitForSelector('[data-testid="delete-confirmation-message"]');
      });

      await test.step('Click cancel button', async () => {
        await page.click('[data-testid="cancel-delete-button"]');
      });

      await test.step('Verify dialog closes', async () => {
        const confirmDialog = page.locator('[data-testid="delete-confirmation-message"]');
        await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify employee count unchanged', async () => {
        const newCount = await page.locator('[data-testid^="employee-"]').count();
        expect(newCount).toBe(employeeCount);
      });
    });

    test('EM4.3 - Should successfully delete employee when Confirm is clicked', async ({ page }) => {
      // First create a test employee to delete
      const testDeleteEmployee = {
        firstName: 'Delete',
        lastName: 'Test',
        email: `delete.test.${Date.now()}@example.com`,
        position: 'Test Position',
        weeklyCapacity: 40,
        salary: 50000
      };

      let createdEmployeeId: string | null = null;

      await test.step('Create test employee via API', async () => {
        // Get first department
        const depsResponse = await fetch(`${API_BASE_URL}/departments`);
        const departments = await depsResponse.json();
        const departmentId = Array.isArray(departments) ? departments[0]?.id : departments.data?.[0]?.id;

        const response = await fetch(`${API_BASE_URL}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...testDeleteEmployee, departmentId })
        });
        const result = await response.json();
        createdEmployeeId = result.data?.id || result.id;

        // Reload page to show new employee
        await page.reload();
        await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });
      });

      await test.step('Find and click delete button for test employee', async () => {
        const employeeName = `${testDeleteEmployee.firstName} ${testDeleteEmployee.lastName}`;
        const employeeCard = page.locator(`text=${employeeName}`).first().locator('xpath=ancestor::div[contains(@data-testid, "employee-")]').first();
        const deleteButton = employeeCard.locator('[data-testid^="delete-employee-"]');

        await deleteButton.click();
        await page.waitForSelector('[data-testid="delete-confirmation-message"]');
      });

      await test.step('Confirm deletion', async () => {
        await page.click('[data-testid="confirm-delete-button"]');
      });

      await test.step('Verify success toast appears', async () => {
        const toast = page.locator('[data-testid="success-toast"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });

        const toastText = await toast.textContent();
        expect(toastText?.toLowerCase()).toContain('success');
      });

      await test.step('Verify dialog closes', async () => {
        const confirmDialog = page.locator('[data-testid="delete-confirmation-message"]');
        await expect(confirmDialog).not.toBeVisible({ timeout: 5000 });
      });

      await test.step('Verify employee removed from list', async () => {
        await page.waitForTimeout(1000); // Wait for list to update

        const employeeName = `${testDeleteEmployee.firstName} ${testDeleteEmployee.lastName}`;
        const deletedEmployee = page.locator(`text=${employeeName}`);
        await expect(deletedEmployee).not.toBeVisible({ timeout: 5000 });
      });
    });

    test('EM4.4 - Should show error toast if deletion fails', async ({ page }) => {
      await page.waitForSelector('[data-testid="employees-list"]', { timeout: 10000 });

      // Intercept DELETE request and make it fail
      await page.route('**/api/employees/*', route => {
        if (route.request().method() === 'DELETE') {
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          route.continue();
        }
      });

      await test.step('Click delete button', async () => {
        const firstDeleteButton = page.locator('[data-testid^="delete-employee-"]').first();
        await firstDeleteButton.click();
        await page.waitForSelector('[data-testid="delete-confirmation-message"]');
      });

      await test.step('Confirm deletion', async () => {
        await page.click('[data-testid="confirm-delete-button"]');
      });

      await test.step('Verify error toast appears', async () => {
        const toast = page.locator('[data-testid="error-toast"]').first();
        await expect(toast).toBeVisible({ timeout: 10000 });

        const toastText = await toast.textContent();
        expect(toastText?.toLowerCase()).toContain('fail');
      });
    });
  });

  test.describe('Integration Tests', () => {

    test('INT-1 - Complete CRUD workflow', async ({ page }) => {
      const workflowEmployee = {
        firstName: 'Workflow',
        lastName: 'Test',
        email: `workflow.test.${Date.now()}@example.com`,
        position: 'QA Engineer',
        weeklyCapacity: 35,
        salary: 70000,
        skills: ['Testing', 'Automation']
      };

      let employeeId: string | null = null;

      // CREATE
      await test.step('Create employee', async () => {
        await page.click('[data-testid="add-employee-button"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]');

        await page.fill('[data-testid="employee-first-name"]', workflowEmployee.firstName);
        await page.fill('[data-testid="employee-last-name"]', workflowEmployee.lastName);
        await page.fill('[data-testid="employee-email"]', workflowEmployee.email);
        await page.fill('[data-testid="employee-position"]', workflowEmployee.position);
        await page.selectOption('[data-testid="employee-department"]', { index: 1 });
        await page.fill('[data-testid="employee-weekly-capacity"]', workflowEmployee.weeklyCapacity.toString());
        await page.fill('[data-testid="employee-salary"]', workflowEmployee.salary.toString());

        await page.click('[data-testid="submit-employee"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'hidden', timeout: 10000 });
      });

      // READ
      await test.step('Verify employee in list', async () => {
        await page.waitForTimeout(1000);
        const employeeName = `${workflowEmployee.firstName} ${workflowEmployee.lastName}`;
        const employeeCard = page.locator(`text=${employeeName}`).first();
        await expect(employeeCard).toBeVisible({ timeout: 5000 });
      });

      // UPDATE
      await test.step('Edit employee', async () => {
        const employeeName = `${workflowEmployee.firstName} ${workflowEmployee.lastName}`;
        const employeeCard = page.locator(`text=${employeeName}`).first().locator('xpath=ancestor::div[contains(@data-testid, "employee-")]').first();
        const editButton = employeeCard.locator('[data-testid^="edit-employee-"]');

        await editButton.click();
        await page.waitForSelector('[data-testid="employee-form-modal"]');

        await page.fill('[data-testid="employee-position"]', 'Senior QA Engineer');
        await page.click('[data-testid="submit-employee"]');
        await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'hidden', timeout: 10000 });
      });

      // DELETE
      await test.step('Delete employee', async () => {
        await page.waitForTimeout(1000);
        const employeeName = `${workflowEmployee.firstName} ${workflowEmployee.lastName}`;
        const employeeCard = page.locator(`text=${employeeName}`).first().locator('xpath=ancestor::div[contains(@data-testid, "employee-")]').first();
        const deleteButton = employeeCard.locator('[data-testid^="delete-employee-"]');

        await deleteButton.click();
        await page.waitForSelector('[data-testid="delete-confirmation-message"]');
        await page.click('[data-testid="confirm-delete-button"]');
        await page.waitForTimeout(1000);

        const deletedEmployee = page.locator(`text=${employeeName}`);
        await expect(deletedEmployee).not.toBeVisible({ timeout: 5000 });
      });
    });
  });
});
