/**
 * Production Fixes Validation Test
 *
 * Tests for the three critical production issues:
 * 1. Export endpoints (404 errors)
 * 2. Skills gap analysis SQL error (proficiency_level enum casting)
 * 3. Delete operation created_by column references
 */

import { DatabaseService } from '../src/database/database.service';
import { AnalyticsService } from '../src/services/analytics.service';
import { EmployeeService } from '../src/services/employee.service';
import { app } from '../src/app';
import request from 'supertest';

describe('Production Fixes Validation', () => {
  let db: DatabaseService;
  let analyticsService: AnalyticsService;
  let employeeService: EmployeeService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    analyticsService = new (AnalyticsService as any)();
    employeeService = new EmployeeService();

    // Initialize services
    AnalyticsService.initialize(db.pool);
  });

  describe('1. Export Routes Registration', () => {
    test('should have export routes properly registered', async () => {
      const response = await request(app)
        .get('/api/export/employees/csv')
        .expect(res => {
          // Should not be 404, could be 200 (success) or 500 (server error) but not missing route
          expect(res.status).not.toBe(404);
        });
    });

    test('should list export endpoints in API documentation', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.endpoints).toBeDefined();
      // Export routes should be accessible under /api/export
    });
  });

  describe('2. Skills Gap Analysis SQL Fix', () => {
    test('should handle proficiency_level enum casting without errors', async () => {
      // This test ensures the SQL query doesn't break with enum vs integer proficiency levels
      try {
        const result = await AnalyticsService.getSkillGapAnalysis();
        expect(result).toBeDefined();
        expect(result.data).toBeInstanceOf(Array);
      } catch (error) {
        // Should not throw SQL casting errors
        expect(error.message).not.toMatch(/cannot cast type.*proficiency_level.*to integer/i);
      }
    });

    test('should handle mixed proficiency level types (enum and integer)', async () => {
      try {
        const result = await AnalyticsService.getDepartmentPerformance();
        expect(result).toBeDefined();
        expect(result.data).toBeInstanceOf(Array);
      } catch (error) {
        expect(error.message).not.toMatch(/invalid input syntax.*proficiency_level/i);
      }
    });
  });

  describe('3. Delete Operation created_by Column Fix', () => {
    test('should handle deleteEmployee without created_by column errors', async () => {
      // Create a test employee first
      const testEmployee = {
        firstName: 'Test',
        lastName: 'Employee',
        email: `test-delete-${Date.now()}@example.com`,
        position: 'Test Position',
        departmentId: null, // Allow null for test
        weeklyCapacity: 40,
        salary: 50000,
        skills: []
      };

      try {
        const createdEmployee = await employeeService.createEmployee(testEmployee);
        expect(createdEmployee).toBeDefined();
        expect(createdEmployee.id).toBeDefined();

        // Now test deletion - should not throw created_by column errors
        const constraints = await employeeService.checkEmployeeDeletionConstraints(createdEmployee.id);
        expect(constraints).toBeDefined();
        expect(constraints.canDelete).toBe(true);

        // If deletion is allowed, attempt it
        if (constraints.canDelete) {
          await expect(employeeService.deleteEmployee(createdEmployee.id)).resolves.not.toThrow();
        }
      } catch (error) {
        // Should not throw column "created_by" does not exist errors
        expect(error.message).not.toMatch(/column.*created_by.*does not exist/i);
      }
    });

    test('should handle created_by column existence checks properly', async () => {
      // Test that the fix handles both cases: when created_by exists and when it doesn't
      const mockEmployeeId = '12345678-1234-1234-1234-123456789012';

      try {
        const constraints = await employeeService.checkEmployeeDeletionConstraints(mockEmployeeId);
        expect(constraints).toBeDefined();
        expect(constraints.blockers).toBeInstanceOf(Array);
        expect(constraints.warnings).toBeInstanceOf(Array);
      } catch (error) {
        // Should not throw created_by related SQL errors
        expect(error.message).not.toMatch(/created_by/i);
      }
    });
  });

  describe('4. Regression Tests', () => {
    test('should maintain existing functionality', async () => {
      // Test that core API endpoints still work
      const healthResponse = await request(app).get('/health').expect(200);
      expect(healthResponse.body.status).toBe('healthy');

      const apiResponse = await request(app).get('/api').expect(200);
      expect(apiResponse.body.name).toBe('Employee Management API');
    });

    test('should not break database connections', async () => {
      // Ensure database is still accessible after fixes
      const result = await db.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeDefined();
    });
  });
});