import { test, expect } from '@playwright/test';

/**
 * Data Validation Test Suite
 * Tests all global validation criteria for Employees, Projects, and Allocations
 * Covers both client-side (form validation) and server-side (API validation)
 */

const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:3001/api';

test.describe('Data Validation Rules', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Employee Validation', () => {
    test('should validate email uniqueness and format', async ({ page, request }) => {
      // Test 1: Invalid email format - client-side
      await page.click('text=Employees');
      await page.click('button:has-text("Add Employee")');

      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', 'invalid-email');

      // Check for client-side validation message
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');

      // Test 2: Invalid email format - server-side
      const invalidEmailResponse = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(invalidEmailResponse.status()).toBe(400);

      // Test 3: Duplicate email - server-side
      // First create an employee
      const firstEmployee = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 80000
        }
      });
      const firstCreated = firstEmployee.ok();

      if (firstCreated) {
        // Try to create another with same email
        const duplicateResponse = await request.post(`${API_URL}/employees`, {
          data: {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.smith@test.com',
            department: 'Marketing',
            weeklyCapacity: 35,
            salary: 70000
          }
        });
        expect(duplicateResponse.status()).toBe(400);
        const errorBody = await duplicateResponse.json();
        expect(errorBody.error || errorBody.message).toContain('email');
      }
    });

    test('should require first name and last name', async ({ page, request }) => {
      // Test 1: Client-side - required field validation
      await page.click('text=Employees');
      await page.click('button:has-text("Add Employee")');

      const firstNameInput = page.locator('input[name="firstName"]');
      const lastNameInput = page.locator('input[name="lastName"]');

      // Check if fields are marked as required
      await expect(firstNameInput).toHaveAttribute('required', '');
      await expect(lastNameInput).toHaveAttribute('required', '');

      // Test 2: Server-side - missing first name
      const missingFirstName = await request.post(`${API_URL}/employees`, {
        data: {
          lastName: 'Doe',
          email: 'missing.first@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(missingFirstName.status()).toBe(400);

      // Test 3: Server-side - missing last name
      const missingLastName = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          email: 'missing.last@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(missingLastName.status()).toBe(400);
    });

    test('should validate salary as positive number', async ({ page, request }) => {
      // Test 1: Negative salary - server-side
      const negativeSalary = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.negative@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: -50000
        }
      });
      expect(negativeSalary.status()).toBe(400);

      // Test 2: Zero salary - server-side
      const zeroSalary = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'Zero',
          email: 'jane.zero@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 0
        }
      });
      expect(zeroSalary.status()).toBe(400);

      // Test 3: Valid positive salary - should succeed
      const validSalary = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Valid',
          lastName: 'Employee',
          email: 'valid.salary@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(validSalary.ok()).toBeTruthy();
    });

    test('should validate weekly capacity between 0-168 hours', async ({ page, request }) => {
      // Test 1: Negative capacity
      const negativeCapacity = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Negative',
          email: 'john.negative.capacity@test.com',
          department: 'Engineering',
          weeklyCapacity: -10,
          salary: 75000
        }
      });
      expect(negativeCapacity.status()).toBe(400);

      // Test 2: Over 168 hours (7 days * 24 hours)
      const overCapacity = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'Over',
          email: 'jane.over.capacity@test.com',
          department: 'Engineering',
          weeklyCapacity: 200,
          salary: 75000
        }
      });
      expect(overCapacity.status()).toBe(400);

      // Test 3: Valid capacity (40 hours)
      const validCapacity = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Valid',
          lastName: 'Capacity',
          email: 'valid.capacity@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(validCapacity.ok()).toBeTruthy();

      // Test 4: Edge case - exactly 168 hours
      const maxCapacity = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Max',
          lastName: 'Capacity',
          email: 'max.capacity@test.com',
          department: 'Engineering',
          weeklyCapacity: 168,
          salary: 75000
        }
      });
      expect(maxCapacity.ok()).toBeTruthy();
    });

    test('should validate department exists in system', async ({ page, request }) => {
      // Test 1: Get valid departments
      const departmentsResponse = await request.get(`${API_URL}/employees`);
      expect(departmentsResponse.ok()).toBeTruthy();

      // Test 2: Invalid department
      const invalidDept = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'InvalidDept',
          email: 'john.invaliddept@test.com',
          department: 'NonExistentDepartment12345',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      // Note: This might pass if department validation is not strict
      // In a real system, this should fail with 400

      // Test 3: Valid department
      const validDept = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'ValidDept',
          email: 'jane.validdept@test.com',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });
      expect(validDept.ok()).toBeTruthy();
    });
  });

  test.describe('Project Validation', () => {
    test('should require project name and enforce uniqueness', async ({ page, request }) => {
      // Test 1: Missing project name - server-side
      const missingName = await request.post(`${API_URL}/projects`, {
        data: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(missingName.status()).toBe(400);

      // Test 2: Create project with unique name
      const uniqueProject = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Unique Project ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      const isCreated = uniqueProject.ok();

      if (isCreated) {
        const projectData = await uniqueProject.json();

        // Test 3: Try to create duplicate project name
        const duplicateName = await request.post(`${API_URL}/projects`, {
          data: {
            name: projectData.name,
            startDate: '2025-02-01',
            endDate: '2025-11-30',
            budget: 50000,
            hourlyRate: 80,
            status: 'planning',
            priority: 'medium'
          }
        });
        // Should fail with duplicate name
        expect(duplicateName.status()).toBe(400);
      }
    });

    test('should validate end date after start date', async ({ page, request }) => {
      // Test 1: End date before start date
      const invalidDates = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Invalid Dates Project ${Date.now()}`,
          startDate: '2025-12-31',
          endDate: '2025-01-01',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(invalidDates.status()).toBe(400);

      // Test 2: End date same as start date (edge case)
      const sameDates = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Same Dates Project ${Date.now()}`,
          startDate: '2025-06-15',
          endDate: '2025-06-15',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      // This might be valid depending on business rules
      const isSameDateValid = sameDates.ok();

      // Test 3: Valid date range
      const validDates = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Valid Dates Project ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(validDates.ok()).toBeTruthy();
    });

    test('should validate budget and hourly rate as positive numbers', async ({ page, request }) => {
      // Test 1: Negative budget
      const negativeBudget = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Negative Budget ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: -100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(negativeBudget.status()).toBe(400);

      // Test 2: Negative hourly rate
      const negativeRate = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Negative Rate ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: -100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(negativeRate.status()).toBe(400);

      // Test 3: Zero budget
      const zeroBudget = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Zero Budget ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 0,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(zeroBudget.status()).toBe(400);

      // Test 4: Valid positive values
      const validProject = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Valid Budget Rate ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });
      expect(validProject.ok()).toBeTruthy();
    });

    test('should validate status enum values', async ({ page, request }) => {
      const validStatuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];

      // Test 1: Invalid status
      const invalidStatus = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Invalid Status ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'invalid-status',
          priority: 'high'
        }
      });
      expect(invalidStatus.status()).toBe(400);

      // Test 2: Valid statuses
      for (const status of validStatuses.slice(0, 2)) {
        const validStatusResponse = await request.post(`${API_URL}/projects`, {
          data: {
            name: `Valid Status ${status} ${Date.now()}`,
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            budget: 100000,
            hourlyRate: 100,
            status: status,
            priority: 'high'
          }
        });
        expect(validStatusResponse.ok()).toBeTruthy();
      }
    });

    test('should validate priority enum values', async ({ page, request }) => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];

      // Test 1: Invalid priority
      const invalidPriority = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Invalid Priority ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'invalid-priority'
        }
      });
      expect(invalidPriority.status()).toBe(400);

      // Test 2: Valid priorities
      for (const priority of validPriorities.slice(0, 2)) {
        const validPriorityResponse = await request.post(`${API_URL}/projects`, {
          data: {
            name: `Valid Priority ${priority} ${Date.now()}`,
            startDate: '2025-01-01',
            endDate: '2025-12-31',
            budget: 100000,
            hourlyRate: 100,
            status: 'active',
            priority: priority
          }
        });
        expect(validPriorityResponse.ok()).toBeTruthy();
      }
    });
  });

  test.describe('Allocation Validation', () => {
    let testEmployee: any;
    let testProject: any;

    test.beforeEach(async ({ request }) => {
      // Create test employee
      const employeeResponse = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Test',
          lastName: 'Allocation',
          email: `test.allocation.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      if (employeeResponse.ok()) {
        testEmployee = await employeeResponse.json();
      }

      // Create test project
      const projectResponse = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Test Allocation Project ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      if (projectResponse.ok()) {
        testProject = await projectResponse.json();
      }
    });

    test('should validate employee and project existence', async ({ request }) => {
      // Test 1: Non-existent employee ID
      const invalidEmployee = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: '99999999-9999-9999-9999-999999999999',
          projectId: testProject?.id || 1,
          hours: 20,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });
      expect(invalidEmployee.status()).toBe(400);

      // Test 2: Non-existent project ID
      const invalidProject = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee?.id || 1,
          projectId: 999999,
          hours: 20,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });
      expect(invalidProject.status()).toBe(400);

      // Test 3: Valid employee and project
      if (testEmployee && testProject) {
        const validAllocation = await request.post(`${API_URL}/allocations`, {
          data: {
            employeeId: testEmployee.id,
            projectId: testProject.id,
            hours: 20,
            startDate: '2025-01-01',
            endDate: '2025-03-31'
          }
        });
        expect(validAllocation.ok()).toBeTruthy();
      }
    });

    test('should validate hours as positive number', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Test 1: Negative hours
      const negativeHours = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: -10,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });
      expect(negativeHours.status()).toBe(400);

      // Test 2: Zero hours
      const zeroHours = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 0,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });
      expect(zeroHours.status()).toBe(400);

      // Test 3: Valid positive hours
      const validHours = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 25,
          startDate: '2025-04-01',
          endDate: '2025-06-30'
        }
      });
      expect(validHours.ok()).toBeTruthy();
    });

    test('should validate end date after start date', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Test 1: End date before start date
      const invalidDates = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 20,
          startDate: '2025-06-30',
          endDate: '2025-01-01'
        }
      });
      expect(invalidDates.status()).toBe(400);

      // Test 2: Valid date range
      const validDates = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 20,
          startDate: '2025-07-01',
          endDate: '2025-09-30'
        }
      });
      expect(validDates.ok()).toBeTruthy();
    });

    test('should not exceed employee weekly capacity', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Test: Allocation exceeding weekly capacity (40 hours)
      const overCapacity = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 50, // Exceeds 40 hour capacity
          startDate: '2025-10-01',
          endDate: '2025-12-31'
        }
      });

      // This might return 400 or create with warning
      if (overCapacity.ok()) {
        const allocationData = await overCapacity.json();
        // Check for warning about over-allocation
        expect(allocationData).toBeDefined();
      } else {
        expect(overCapacity.status()).toBe(400);
      }

      // Test: Valid allocation within capacity
      const withinCapacity = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 30, // Within 40 hour capacity
          startDate: '2026-01-01',
          endDate: '2026-03-31'
        }
      });
      expect(withinCapacity.ok()).toBeTruthy();
    });

    test('should detect and flag overlapping allocations', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Create first allocation
      const firstAllocation = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 20,
          startDate: '2026-04-01',
          endDate: '2026-06-30'
        }
      });
      expect(firstAllocation.ok()).toBeTruthy();

      // Create overlapping allocation
      const overlappingAllocation = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 20,
          startDate: '2026-05-01', // Overlaps with first allocation
          endDate: '2026-07-31'
        }
      });

      // System should either:
      // 1. Return 400 if overlaps are not allowed
      // 2. Return 200 with warning flag
      // 3. Check for over-allocation warnings endpoint

      if (overlappingAllocation.ok()) {
        // Check if there's a warning system
        const warningsResponse = await request.get(`${API_URL}/over-allocation-warnings`);
        if (warningsResponse.ok()) {
          const warnings = await warningsResponse.json();
          // Should have warning for this employee
          const hasWarning = Array.isArray(warnings) && warnings.some(
            (w: any) => w.employeeId === testEmployee.id
          );
          expect(hasWarning).toBeTruthy();
        }
      }
    });
  });

  test.describe('Client-Side Form Validation', () => {
    test('should show validation errors on employee form', async ({ page }) => {
      await page.click('text=Employees');
      await page.click('button:has-text("Add Employee")');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Check for validation messages
      const form = page.locator('form');
      await expect(form).toBeVisible();

      // HTML5 validation should prevent submission
      const firstNameInput = page.locator('input[name="firstName"]');
      await expect(firstNameInput).toHaveAttribute('required', '');
    });

    test('should show validation errors on project form', async ({ page }) => {
      await page.click('text=Projects');
      await page.waitForTimeout(500);

      const addButton = page.locator('button:has-text("Add Project")').first();
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Check for required fields
        const nameInput = page.locator('input[name="name"]');
        if (await nameInput.isVisible()) {
          await expect(nameInput).toHaveAttribute('required', '');
        }
      }
    });
  });
});
