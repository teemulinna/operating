"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const over_allocation_warning_service_1 = require("../../../src/services/over-allocation-warning.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('OverAllocationWarningService - Real Functional Tests', () => {
    let db;
    let service;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new over_allocation_warning_service_1.OverAllocationWarningService();
    });
    (0, globals_1.afterAll)(async () => {
        await db.disconnect();
    });
    (0, globals_1.describe)('Over-allocation Detection', () => {
        (0, globals_1.it)('should check weekly over-allocation for employees', async () => {
            const empResult = await db.query(`
        SELECT id, first_name, last_name, COALESCE(weekly_capacity_hours, weekly_hours, 40) as capacity_hours
        FROM employees
        WHERE status = 'active'
        LIMIT 1
      `);
            if (empResult.rows.length > 0) {
                const employee = empResult.rows[0];
                const weekStart = new Date('2024-06-03');
                const weekEnd = new Date('2024-06-09');
                const warning = await service.checkWeeklyOverAllocation(employee.id, weekStart, weekEnd);
                if (warning) {
                    (0, globals_1.expect)(warning).toHaveProperty('employeeId');
                    (0, globals_1.expect)(warning.employeeId).toBe(employee.id);
                    (0, globals_1.expect)(warning).toHaveProperty('severity');
                    (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(warning.severity);
                    (0, globals_1.expect)(warning).toHaveProperty('utilizationRate');
                    (0, globals_1.expect)(warning.utilizationRate).toBeGreaterThan(100);
                }
                else {
                    (0, globals_1.expect)(warning).toBeNull();
                }
            }
        });
        (0, globals_1.it)('should batch check over-allocations for multiple employees', async () => {
            const employees = await db.query(`
        SELECT id FROM employees
        WHERE status = 'active'
        LIMIT 5
      `);
            const startDate = new Date('2024-06-01');
            const endDate = new Date('2024-06-30');
            const warnings = await service.batchCheckOverAllocations(employees.rows.map(e => e.id), startDate, endDate);
            (0, globals_1.expect)(Array.isArray(warnings)).toBe(true);
            warnings.forEach(warning => {
                if (warning) {
                    (0, globals_1.expect)(warning).toHaveProperty('employeeId');
                    (0, globals_1.expect)(warning).toHaveProperty('weekStartDate');
                    (0, globals_1.expect)(warning).toHaveProperty('allocatedHours');
                    (0, globals_1.expect)(warning).toHaveProperty('severity');
                }
            });
        });
        (0, globals_1.it)('should get over-allocation summary', async () => {
            const summary = await service.getOverAllocationSummary();
            (0, globals_1.expect)(summary).toBeDefined();
            (0, globals_1.expect)(summary).toHaveProperty('totalEmployees');
            (0, globals_1.expect)(summary).toHaveProperty('overAllocatedCount');
            (0, globals_1.expect)(summary).toHaveProperty('criticalCount');
            (0, globals_1.expect)(summary).toHaveProperty('averageUtilization');
            (0, globals_1.expect)(summary.totalEmployees).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(summary.overAllocatedCount).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(summary.overAllocatedCount).toBeLessThanOrEqual(summary.totalEmployees);
        });
        (0, globals_1.it)('should determine severity correctly', async () => {
            const testCases = [
                { default: 40, allocated: 42, expectedSeverity: 'low' },
                { default: 40, allocated: 48, expectedSeverity: 'medium' },
                { default: 40, allocated: 56, expectedSeverity: 'high' },
                { default: 40, allocated: 64, expectedSeverity: 'critical' }
            ];
            for (const test of testCases) {
                const severity = service.determineSeverity(test.default, test.allocated);
                (0, globals_1.expect)(severity).toBe(test.expectedSeverity);
            }
        });
    });
});
//# sourceMappingURL=over-allocation-warning.service.test.js.map