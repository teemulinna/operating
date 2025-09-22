import { test, expect } from '@playwright/test';

test.describe('Weekly Capacity Feature Test', () => {
  const API_BASE = 'http://localhost:3001/api';

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002/employees');
    await page.waitForTimeout(2000);
  });

  test('should display and update employee weekly capacity', async ({ page }) => {
    // Check if we can see employees
    await expect(page.getByTestId('employees-title')).toBeVisible();

    // Click Add Employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for form modal
    await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'visible' });

    // Fill in employee form with weekly capacity
    await page.getByTestId('employee-first-name').fill('Test');
    await page.getByTestId('employee-last-name').fill('Capacity');
    await page.getByTestId('employee-email').fill(`test.capacity.${Date.now()}@example.com`);
    await page.getByTestId('employee-position').fill('Part-Time Developer');

    // Set weekly capacity to 20 hours (part-time)
    const capacityInput = page.getByTestId('employee-weekly-capacity');
    await capacityInput.clear();
    await capacityInput.fill('20');

    // Select department (check if options are available)
    const departmentSelect = page.getByTestId('employee-department');
    await departmentSelect.click();
    const firstOption = await departmentSelect.locator('option').nth(1);
    const departmentValue = await firstOption.getAttribute('value');
    await departmentSelect.selectOption(departmentValue || '');

    // Set salary
    await page.getByTestId('employee-salary').fill('50000');

    // Submit form
    await page.getByTestId('submit-employee').click();

    // Wait for modal to close after successful submission
    await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'hidden', timeout: 10000 });

    // Wait a bit for the list to update
    await page.waitForTimeout(1000);

    // Verify the employee appears with correct weekly capacity
    const employeeCard = page.locator('[data-testid*="employee-"][data-testid$="-hours"]').filter({ hasText: '20h/week' });
    await expect(employeeCard).toBeVisible({ timeout: 10000 });

    // Now test updating the capacity
    const editButton = page.locator('[data-testid*="edit-employee-"]').first();
    await editButton.click();

    // Wait for edit form
    await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'visible' });

    // Update weekly capacity to 30 hours
    const editCapacityInput = page.getByTestId('employee-weekly-capacity');
    await editCapacityInput.clear();
    await editCapacityInput.fill('30');

    // Submit update
    await page.getByTestId('submit-employee').click();

    // Wait for modal to close after successful update
    await page.waitForSelector('[data-testid="employee-form-modal"]', { state: 'hidden', timeout: 10000 });

    // Wait a bit for the list to update
    await page.waitForTimeout(1000);

    // Verify the capacity is updated
    const updatedCard = page.locator('[data-testid*="employee-"][data-testid$="-hours"]').filter({ hasText: '30h/week' });
    await expect(updatedCard).toBeVisible({ timeout: 10000 });
  });

  test('should persist weekly capacity in database', async ({ request, page }) => {
    // Create employee via API with specific weekly capacity
    const newEmployee = {
      firstName: 'API',
      lastName: 'Test',
      email: `api.test.${Date.now()}@example.com`,
      position: 'API Tester',
      departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52', // Engineering department ID
      weeklyCapacity: 25,
      salary: 60000
    };

    const createResponse = await request.post(`${API_BASE}/employees`, {
      data: newEmployee
    });

    const created = await createResponse.json();
    console.log('Created employee:', created);

    // Verify the API returns weeklyCapacity (as string with decimal)
    expect(created).toHaveProperty('weeklyCapacity');
    expect(created.weeklyCapacity).toBe('25.00');

    // Get employee by ID to verify persistence
    const getResponse = await request.get(`${API_BASE}/employees/${created.id}`);
    const fetched = await getResponse.json();

    console.log('Fetched employee:', fetched);
    expect(fetched).toHaveProperty('weeklyCapacity');
    expect(fetched.weeklyCapacity).toBe('25.00');

    // Update weekly capacity
    const updateResponse = await request.put(`${API_BASE}/employees/${created.id}`, {
      data: {
        ...newEmployee,
        weeklyCapacity: 35
      }
    });

    const updated = await updateResponse.json();
    console.log('Updated employee:', updated);

    expect(updated).toHaveProperty('weeklyCapacity');
    expect(updated.weeklyCapacity).toBe('35.00');

    // Clean up - delete test employee
    await request.delete(`${API_BASE}/employees/${created.id}`);
  });
});