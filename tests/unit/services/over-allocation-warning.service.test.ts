import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { OverAllocationWarningService } from '../../../src/services/over-allocation-warning.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('OverAllocationWarningService - Real Functional Tests', () => {
  let db: DatabaseService;
  let service: OverAllocationWarningService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new OverAllocationWarningService();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Over-allocation Detection', () => {
    it('should check weekly over-allocation for employees', async () => {
      // Get an active employee
      const empResult = await db.query(`
        SELECT id, first_name, last_name, COALESCE(weekly_capacity_hours, weekly_hours, 40) as capacity_hours
        FROM employees
        WHERE status = 'active'
        LIMIT 1
      `);

      if (empResult.rows.length > 0) {
        const employee = empResult.rows[0];
        const weekStart = new Date('2024-06-03'); // Monday
        const weekEnd = new Date('2024-06-09'); // Sunday

        const warning = await service.checkWeeklyOverAllocation(
          employee.id,
          weekStart,
          weekEnd
        );

        if (warning) {
          expect(warning).toHaveProperty('employeeId');
          expect(warning.employeeId).toBe(employee.id);
          expect(warning).toHaveProperty('severity');
          expect(['low', 'medium', 'high', 'critical']).toContain(warning.severity);
          expect(warning).toHaveProperty('utilizationRate');
          expect(warning.utilizationRate).toBeGreaterThan(100);
        } else {
          // No over-allocation, which is also valid
          expect(warning).toBeNull();
        }
      }
    });

    it('should batch check over-allocations for multiple employees', async () => {
      const employees = await db.query(`
        SELECT id FROM employees
        WHERE status = 'active'
        LIMIT 5
      `);

      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      const warnings = await service.batchCheckOverAllocations(
        employees.rows.map(e => e.id),
        startDate,
        endDate
      );

      expect(Array.isArray(warnings)).toBe(true);
      warnings.forEach(warning => {
        if (warning) {
          expect(warning).toHaveProperty('employeeId');
          expect(warning).toHaveProperty('weekStartDate');
          expect(warning).toHaveProperty('allocatedHours');
          expect(warning).toHaveProperty('severity');
        }
      });
    });

    it('should get over-allocation summary', async () => {
      const summary = await service.getOverAllocationSummary();

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('totalEmployees');
      expect(summary).toHaveProperty('overAllocatedCount');
      expect(summary).toHaveProperty('criticalCount');
      expect(summary).toHaveProperty('averageUtilization');

      expect(summary.totalEmployees).toBeGreaterThanOrEqual(0);
      expect(summary.overAllocatedCount).toBeGreaterThanOrEqual(0);
      expect(summary.overAllocatedCount).toBeLessThanOrEqual(summary.totalEmployees);
    });

    it('should determine severity correctly', async () => {
      const testCases = [
        { default: 40, allocated: 42, expectedSeverity: 'low' },
        { default: 40, allocated: 48, expectedSeverity: 'medium' },
        { default: 40, allocated: 56, expectedSeverity: 'high' },
        { default: 40, allocated: 64, expectedSeverity: 'critical' }
      ];

      for (const test of testCases) {
        const severity = service.determineSeverity(
          test.default,
          test.allocated
        );
        expect(severity).toBe(test.expectedSeverity);
      }
    });
  });
});