import { test, expect } from '@playwright/test';

/**
 * API Data Validation Test Suite
 * Tests server-side validation for all global validation criteria
 * Focus: Backend validation rules for Employees, Projects, and Allocations
 */

const API_URL = 'http://localhost:3001/api';

test.describe('Server-Side API Validation', () => {
  test.describe('Employee API Validation', () => {
    test('should validate email format', async ({ request }) => {
      const response = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email-format',
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      const isValid = response.ok();
      const status = response.status();

      console.log(`✓ Email format validation: ${status} (${isValid ? 'PASS' : 'FAIL'})`);
      expect([400, 422]).toContain(status);
    });

    test('should validate email uniqueness', async ({ request }) => {
      const uniqueEmail = `test.unique.${Date.now()}@test.com`;

      // Create first employee
      const first = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'First',
          lastName: 'Employee',
          email: uniqueEmail,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      const firstCreated = first.ok();
      console.log(`  First employee created: ${firstCreated ? 'YES' : 'NO'} (${first.status()})`);

      if (firstCreated) {
        // Try to create duplicate
        const duplicate = await request.post(`${API_URL}/employees`, {
          data: {
            firstName: 'Second',
            lastName: 'Employee',
            email: uniqueEmail,
            department: 'Marketing',
            weeklyCapacity: 35,
            salary: 70000
          }
        });

        const duplicateFailed = !duplicate.ok();
        console.log(`✓ Email uniqueness validation: ${duplicate.status()} (${duplicateFailed ? 'PASS' : 'FAIL'})`);
        expect([400, 409, 422]).toContain(duplicate.status());
      } else {
        test.skip();
      }
    });

    test('should require first name and last name', async ({ request }) => {
      // Missing first name
      const noFirstName = await request.post(`${API_URL}/employees`, {
        data: {
          lastName: 'Doe',
          email: `no.firstname.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      console.log(`  Missing firstName: ${noFirstName.status()} (${!noFirstName.ok() ? 'PASS' : 'FAIL'})`);

      // Missing last name
      const noLastName = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          email: `no.lastname.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      console.log(`✓ Missing lastName: ${noLastName.status()} (${!noLastName.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(noFirstName.status());
      expect([400, 422]).toContain(noLastName.status());
    });

    test('should validate salary as positive number', async ({ request }) => {
      // Negative salary
      const negative = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Negative',
          email: `negative.salary.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: -50000
        }
      });

      const negativeRejected = !negative.ok();
      console.log(`  Negative salary: ${negative.status()} (${negativeRejected ? 'PASS' : 'FAIL'})`);

      // Zero salary
      const zero = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'Zero',
          email: `zero.salary.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 0
        }
      });

      const zeroRejected = !zero.ok();
      console.log(`✓ Zero salary: ${zero.status()} (${zeroRejected ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(negative.status());
      expect([400, 422]).toContain(zero.status());
    });

    test('should validate weekly capacity (0-168 hours)', async ({ request }) => {
      // Negative capacity
      const negative = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'John',
          lastName: 'Negative',
          email: `negative.capacity.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: -10,
          salary: 75000
        }
      });

      console.log(`  Negative capacity: ${negative.status()} (${!negative.ok() ? 'PASS' : 'FAIL'})`);

      // Over 168 hours
      const over = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Jane',
          lastName: 'Over',
          email: `over.capacity.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 200,
          salary: 75000
        }
      });

      console.log(`  Over 168 hours: ${over.status()} (${!over.ok() ? 'PASS' : 'FAIL'})`);

      // Valid: 40 hours
      const valid40 = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Valid',
          lastName: 'Forty',
          email: `valid.40.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      console.log(`  Valid 40 hours: ${valid40.status()} (${valid40.ok() ? 'PASS' : 'FAIL'})`);

      // Edge case: exactly 168
      const max = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Max',
          lastName: 'Capacity',
          email: `max.capacity.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 168,
          salary: 75000
        }
      });

      console.log(`✓ Exactly 168 hours: ${max.status()} (${max.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(negative.status());
      expect([400, 422]).toContain(over.status());
      expect([200, 201]).toContain(valid40.status());
      expect([200, 201]).toContain(max.status());
    });
  });

  test.describe('Project API Validation', () => {
    test('should require project name', async ({ request }) => {
      const response = await request.post(`${API_URL}/projects`, {
        data: {
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      console.log(`✓ Missing project name: ${response.status()} (${!response.ok() ? 'PASS' : 'FAIL'})`);
      expect([400, 422]).toContain(response.status());
    });

    test('should validate end date after start date', async ({ request }) => {
      // End before start
      const invalid = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Invalid Dates ${Date.now()}`,
          startDate: '2025-12-31',
          endDate: '2025-01-01',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      const invalidRejected = !invalid.ok();
      console.log(`  End before start: ${invalid.status()} (${invalidRejected ? 'PASS' : 'FAIL'})`);

      // Valid dates
      const valid = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Valid Dates ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      console.log(`✓ Valid date range: ${valid.status()} (${valid.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(invalid.status());
      expect([200, 201]).toContain(valid.status());
    });

    test('should validate budget and hourly rate as positive', async ({ request }) => {
      // Negative budget
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

      console.log(`  Negative budget: ${negativeBudget.status()} (${!negativeBudget.ok() ? 'PASS' : 'FAIL'})`);

      // Negative rate
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

      console.log(`  Negative rate: ${negativeRate.status()} (${!negativeRate.ok() ? 'PASS' : 'FAIL'})`);

      // Valid values
      const valid = await request.post(`${API_URL}/projects`, {
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

      console.log(`✓ Valid budget/rate: ${valid.status()} (${valid.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(negativeBudget.status());
      expect([400, 422]).toContain(negativeRate.status());
      expect([200, 201]).toContain(valid.status());
    });

    test('should validate status enum', async ({ request }) => {
      // Invalid status
      const invalid = await request.post(`${API_URL}/projects`, {
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

      console.log(`  Invalid status: ${invalid.status()} (${!invalid.ok() ? 'PASS' : 'FAIL'})`);

      // Valid status
      const valid = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Valid Status ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      console.log(`✓ Valid status: ${valid.status()} (${valid.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(invalid.status());
      expect([200, 201]).toContain(valid.status());
    });

    test('should validate priority enum', async ({ request }) => {
      // Invalid priority
      const invalid = await request.post(`${API_URL}/projects`, {
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

      console.log(`  Invalid priority: ${invalid.status()} (${!invalid.ok() ? 'PASS' : 'FAIL'})`);

      // Valid priority
      const valid = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Valid Priority ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      console.log(`✓ Valid priority: ${valid.status()} (${valid.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(invalid.status());
      expect([200, 201]).toContain(valid.status());
    });
  });

  test.describe('Allocation API Validation', () => {
    let testEmployee: any;
    let testProject: any;

    test.beforeAll(async ({ request }) => {
      // Create test employee
      const empResponse = await request.post(`${API_URL}/employees`, {
        data: {
          firstName: 'Allocation',
          lastName: 'Tester',
          email: `allocation.tester.${Date.now()}@test.com`,
          department: 'Engineering',
          weeklyCapacity: 40,
          salary: 75000
        }
      });

      if (empResponse.ok()) {
        testEmployee = await empResponse.json();
        console.log(`  Created test employee: ${testEmployee.id}`);
      }

      // Create test project
      const projResponse = await request.post(`${API_URL}/projects`, {
        data: {
          name: `Allocation Test Project ${Date.now()}`,
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          budget: 100000,
          hourlyRate: 100,
          status: 'active',
          priority: 'high'
        }
      });

      if (projResponse.ok()) {
        testProject = await projResponse.json();
        console.log(`  Created test project: ${testProject.id}`);
      }
    });

    test('should validate employee and project existence', async ({ request }) => {
      // Invalid employee ID
      const invalidEmp = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: '99999999-9999-9999-9999-999999999999',
          projectId: testProject?.id || 1,
          hours: 20,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });

      console.log(`  Invalid employee: ${invalidEmp.status()} (${!invalidEmp.ok() ? 'PASS' : 'FAIL'})`);

      // Invalid project ID
      const invalidProj = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee?.id || '99999999-9999-9999-9999-999999999999',
          projectId: 999999,
          hours: 20,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });

      console.log(`✓ Invalid project: ${invalidProj.status()} (${!invalidProj.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 404, 422]).toContain(invalidEmp.status());
      expect([400, 404, 422]).toContain(invalidProj.status());
    });

    test('should validate hours as positive number', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Negative hours
      const negative = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: -10,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });

      console.log(`  Negative hours: ${negative.status()} (${!negative.ok() ? 'PASS' : 'FAIL'})`);

      // Zero hours
      const zero = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 0,
          startDate: '2025-01-01',
          endDate: '2025-03-31'
        }
      });

      console.log(`✓ Zero hours: ${zero.status()} (${!zero.ok() ? 'PASS' : 'FAIL'})`);

      expect([400, 422]).toContain(negative.status());
      expect([400, 422]).toContain(zero.status());
    });

    test('should validate end date after start date', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // End before start
      const invalid = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 20,
          startDate: '2025-06-30',
          endDate: '2025-01-01'
        }
      });

      console.log(`✓ End before start: ${invalid.status()} (${!invalid.ok() ? 'PASS' : 'FAIL'})`);
      expect([400, 422]).toContain(invalid.status());
    });

    test('should check capacity limits (warning system)', async ({ request }) => {
      if (!testEmployee || !testProject) {
        test.skip();
        return;
      }

      // Allocation over capacity (50 hours > 40 hour capacity)
      const overCapacity = await request.post(`${API_URL}/allocations`, {
        data: {
          employeeId: testEmployee.id,
          projectId: testProject.id,
          hours: 50,
          startDate: '2026-01-01',
          endDate: '2026-03-31'
        }
      });

      const status = overCapacity.status();
      const created = overCapacity.ok();

      console.log(`  Over-capacity allocation: ${status} (${created ? 'CREATED WITH WARNING' : 'REJECTED'})`);

      // Check for warnings if allocation was created
      if (created) {
        const warningsResponse = await request.get(`${API_URL}/over-allocation-warnings`);
        if (warningsResponse.ok()) {
          const warnings = await warningsResponse.json();
          const hasWarning = Array.isArray(warnings) && warnings.length > 0;
          console.log(`✓ Over-allocation warnings: ${hasWarning ? 'PASS' : 'FAIL'} (${warnings.length} warnings found)`);
        }
      }
    });
  });
});
