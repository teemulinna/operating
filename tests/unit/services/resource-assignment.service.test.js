"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const resource_assignment_service_1 = require("../../../src/services/resource-assignment.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('ResourceAssignmentService - Real Functional Tests', () => {
    let service;
    let db;
    let testEmployeeId;
    let testProjectId;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new resource_assignment_service_1.ResourceAssignmentService();
        try {
            const empResult = await db.query(`
        SELECT id FROM employees
        WHERE is_active = true
        LIMIT 1
      `);
            if (empResult.rows.length > 0) {
                testEmployeeId = empResult.rows[0].id;
            }
            else {
                const newEmp = await db.query(`
          INSERT INTO employees (name, email, department_id, role, is_active, default_hours)
          VALUES ('Test Employee', 'test@example.com', 1, 'Developer', true, 40)
          RETURNING id
        `);
                testEmployeeId = newEmp.rows[0].id;
            }
            const projResult = await db.query(`
        SELECT id FROM projects WHERE name LIKE 'Test%' LIMIT 1
      `);
            if (projResult.rows.length > 0) {
                testProjectId = projResult.rows[0].id;
            }
            else {
                const newProj = await db.query(`
          INSERT INTO projects (name, status, start_date, end_date, budget)
          VALUES ('Test Project', 'active', '2024-01-01', '2024-12-31', 100000)
          RETURNING id
        `);
                testProjectId = newProj.rows[0].id;
            }
        }
        catch (error) {
            console.warn('Test setup warning:', error);
        }
    });
    (0, globals_1.afterAll)(async () => {
        resource_assignment_service_1.ResourceAssignmentService.resetAssignmentTracking();
        await db.disconnect();
    });
    (0, globals_1.beforeEach)(() => {
        resource_assignment_service_1.ResourceAssignmentService.resetAssignmentTracking();
    });
    (0, globals_1.describe)('Resource Assignment Operations', () => {
        (0, globals_1.it)('should create a resource assignment with correct property names', async () => {
            const assignment = {
                project_id: testProjectId,
                employee_id: testEmployeeId,
                start_date: '2024-06-01',
                end_date: '2024-08-31',
                planned_allocation_percentage: 60,
                assignment_type: 'Developer',
                confidence_level: 'confirmed',
                notes: 'Test assignment'
            };
            const result = await service.createAssignment(assignment);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.project_id).toBe(testProjectId);
            (0, globals_1.expect)(result.employee_id).toBe(testEmployeeId);
            (0, globals_1.expect)(result.plannedAllocationPercentage).toBe(60);
        });
        (0, globals_1.it)('should validate allocation percentage', async () => {
            const invalidAssignment = {
                project_id: testProjectId,
                employee_id: testEmployeeId,
                start_date: '2024-06-01',
                planned_allocation_percentage: 150
            };
            await (0, globals_1.expect)(service.createAssignment(invalidAssignment)).rejects.toThrow('Planned allocation percentage must be between 1 and 100');
        });
        (0, globals_1.it)('should prevent over-allocation', async () => {
            await service.createAssignment({
                project_id: testProjectId,
                employee_id: testEmployeeId,
                start_date: '2024-06-01',
                planned_allocation_percentage: 60
            });
            await (0, globals_1.expect)(service.createAssignment({
                project_id: testProjectId + 1,
                employee_id: testEmployeeId,
                start_date: '2024-06-01',
                planned_allocation_percentage: 50
            })).rejects.toThrow('Scheduling conflict detected. Employee is over-allocated across multiple projects');
        });
        (0, globals_1.it)('should validate employee capacity', async () => {
            const capacity = await service.validateEmployeeCapacity(testEmployeeId, '2024-07-01', '2024-09-30', 50);
            (0, globals_1.expect)(capacity).toBeUndefined();
        });
        (0, globals_1.it)('should calculate allocated hours correctly', async () => {
            const assignment = {
                project_id: testProjectId,
                employee_id: testEmployeeId,
                start_date: '2024-07-01',
                planned_allocation_percentage: 75
            };
            const result = await service.createAssignment(assignment);
            (0, globals_1.expect)(result.allocated_hours).toBe(30);
        });
    });
});
//# sourceMappingURL=resource-assignment.service.test.js.map