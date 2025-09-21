import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ResourceAssignmentService } from '../../../src/services/resource-assignment.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('ResourceAssignmentService - Real Functional Tests', () => {
  let service: ResourceAssignmentService;
  let db: DatabaseService;
  let testEmployeeId: string; // UUID
  let testProjectId: number;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new ResourceAssignmentService();

    // Get a test employee with UUID
    try {
      const empResult = await db.query(`
        SELECT id FROM employees
        WHERE is_active = true
        LIMIT 1
      `);

      if (empResult.rows.length > 0) {
        testEmployeeId = empResult.rows[0].id; // This is a UUID
      } else {
        // Create test employee
        const newEmp = await db.query(`
          INSERT INTO employees (name, email, department_id, role, is_active, default_hours)
          VALUES ('Test Employee', 'test@example.com', 1, 'Developer', true, 40)
          RETURNING id
        `);
        testEmployeeId = newEmp.rows[0].id;
      }

      // Get or create test project
      const projResult = await db.query(`
        SELECT id FROM projects WHERE name LIKE 'Test%' LIMIT 1
      `);

      if (projResult.rows.length > 0) {
        testProjectId = projResult.rows[0].id;
      } else {
        const newProj = await db.query(`
          INSERT INTO projects (name, status, start_date, end_date, budget)
          VALUES ('Test Project', 'active', '2024-01-01', '2024-12-31', 100000)
          RETURNING id
        `);
        testProjectId = newProj.rows[0].id;
      }
    } catch (error) {
      console.warn('Test setup warning:', error);
    }
  });

  afterAll(async () => {
    ResourceAssignmentService.resetAssignmentTracking();
    await db.disconnect();
  });

  beforeEach(() => {
    ResourceAssignmentService.resetAssignmentTracking();
  });

  describe('Resource Assignment Operations', () => {
    it('should create a resource assignment with correct property names', async () => {
      const assignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId, // UUID
        start_date: '2024-06-01',
        end_date: '2024-08-31',
        planned_allocation_percentage: 60,
        assignment_type: 'Developer',
        confidence_level: 'confirmed',
        notes: 'Test assignment'
      };

      const result = await service.createAssignment(assignment);

      expect(result).toBeDefined();
      expect(result.project_id).toBe(testProjectId);
      expect(result.employee_id).toBe(testEmployeeId);
      expect(result.plannedAllocationPercentage).toBe(60);
    });

    it('should validate allocation percentage', async () => {
      const invalidAssignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 150 // Invalid: over 100%
      };

      await expect(service.createAssignment(invalidAssignment)).rejects.toThrow(
        'Planned allocation percentage must be between 1 and 100'
      );
    });

    it('should prevent over-allocation', async () => {
      // First assignment: 60%
      await service.createAssignment({
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 60
      });

      // Second assignment: 50% (would total 110%)
      await expect(service.createAssignment({
        project_id: testProjectId + 1,
        employee_id: testEmployeeId,
        start_date: '2024-06-01',
        planned_allocation_percentage: 50
      })).rejects.toThrow('Scheduling conflict detected. Employee is over-allocated across multiple projects');
    });

    it('should validate employee capacity', async () => {
      const capacity = await service.validateEmployeeCapacity(
        testEmployeeId,
        '2024-07-01',
        '2024-09-30',
        50
      );

      // validateEmployeeCapacity doesn't return a value, it throws on error
      expect(capacity).toBeUndefined();
    });

    it('should calculate allocated hours correctly', async () => {
      const assignment = {
        project_id: testProjectId,
        employee_id: testEmployeeId,
        start_date: '2024-07-01',
        planned_allocation_percentage: 75
      };

      const result = await service.createAssignment(assignment);

      expect(result.allocated_hours).toBe(30); // 75% of 40 hours
    });
  });
});