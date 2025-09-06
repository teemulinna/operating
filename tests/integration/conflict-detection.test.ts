/**
 * Resource Conflict Detection Integration Tests
 * Tests for detecting overlapping assignments and over-allocation periods
 * 
 * Test Coverage:
 * - Detect overlapping assignments across projects
 * - Identify over-allocation periods (total allocation > 100%)
 * - Suggest conflict resolution strategies
 * - Real-time validation on assignment creation
 * - API: GET /api/resource-conflicts
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/database/database.service';
import { ConflictDetectionService } from '../../src/services/conflict-detection.service';
import { ApiError } from '../../src/utils/api-error';

interface ConflictResolutionStrategy {
  strategyType: 'reduce_allocation' | 'adjust_dates' | 'reassign_employee' | 'split_role';
  description: string;
  impact: 'low' | 'medium' | 'high';
  feasibility: 'easy' | 'moderate' | 'difficult';
  details: any;
}

describe('Resource Conflict Detection Integration Tests', () => {
  let db: DatabaseService;
  let service: ConflictDetectionService;
  let testProjectIds: number[] = [];
  let testEmployeeIds: number[] = [];
  let testRoleIds: number[] = [];
  let testAssignmentIds: number[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    service = new ConflictDetectionService();
    
    await db.testConnection();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function setupTestData() {
    // Create test projects with different timelines
    const project1 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status) 
      VALUES ('Project Alpha', 'First project', '2024-01-01', '2024-06-30', 'active')
      RETURNING id
    `);
    const project2 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status) 
      VALUES ('Project Beta', 'Second project', '2024-03-01', '2024-09-30', 'active')
      RETURNING id
    `);
    const project3 = await db.query(`
      INSERT INTO projects (name, description, start_date, end_date, status) 
      VALUES ('Project Gamma', 'Third project', '2024-05-01', '2024-12-31', 'planning')
      RETURNING id
    `);
    
    testProjectIds = [project1.rows[0].id, project2.rows[0].id, project3.rows[0].id];

    // Create test employees
    const employee1 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('John', 'Doe', 'john.doe@test.com', 'Senior Developer', 1, true)
      RETURNING id
    `);
    const employee2 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('Jane', 'Smith', 'jane.smith@test.com', 'Project Manager', 1, true)
      RETURNING id
    `);
    const employee3 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
      VALUES ('Bob', 'Wilson', 'bob.wilson@test.com', 'Designer', 1, true)
      RETURNING id
    `);
    
    testEmployeeIds = [employee1.rows[0].id, employee2.rows[0].id, employee3.rows[0].id];

    // Create project roles
    const role1 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Lead Developer', 'Technical leadership', '2024-01-01', '2024-06-30', 80, 1)
      RETURNING id
    `, [testProjectIds[0]]);

    const role2 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Senior Developer', 'Core development', '2024-03-01', '2024-09-30', 60, 1)
      RETURNING id
    `, [testProjectIds[1]]);

    const role3 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Technical Architect', 'System architecture', '2024-05-01', '2024-12-31', 40, 1)
      RETURNING id
    `, [testProjectIds[2]]);

    const role4 = await db.query(`
      INSERT INTO project_roles (
        project_id, role_name, description, start_date, end_date,
        planned_allocation_percentage, max_assignments
      )
      VALUES ($1, 'Project Manager', 'Project coordination', '2024-03-15', '2024-09-15', 70, 1)
      RETURNING id
    `, [testProjectIds[1]]);

    testRoleIds = [role1.rows[0].id, role2.rows[0].id, role3.rows[0].id, role4.rows[0].id];
  }

  async function cleanupTestData() {
    if (testAssignmentIds.length > 0) {
      await db.query('DELETE FROM resource_assignments WHERE id = ANY($1)', [testAssignmentIds]);
    }
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM resource_assignments WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM project_roles WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
    }
    if (testEmployeeIds.length > 0) {
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
    }
    testProjectIds = [];
    testEmployeeIds = [];
    testRoleIds = [];
    testAssignmentIds = [];
  }

  describe('Overlapping Assignment Detection', () => {
    test('should detect simple date overlap between assignments', async () => {
      // Create overlapping assignments
      const assignment1 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 60, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      const assignment2 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 50, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1]]);

      testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id];

      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('date_overlap');
      expect(conflicts[0].severity).toBe('high'); // 110% allocation
      expect(conflicts[0].overlapPeriod.startDate).toBe('2024-03-01');
      expect(conflicts[0].overlapPeriod.endDate).toBe('2024-06-30');
      expect(conflicts[0].totalAllocationPercentage).toBe(110);
    });

    test('should detect multiple overlapping periods', async () => {
      // Create three overlapping assignments
      const assignment1 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-08-31', 40, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      const assignment2 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 40, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1]]);

      const assignment3 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-05-01', '2024-12-31', 30, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[2], testRoleIds[2]]);

      testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id, assignment3.rows[0].id];

      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      
      // Find the most severe conflict (all three projects)
      const severestConflict = conflicts.find(c => c.totalAllocationPercentage === 110);
      expect(severestConflict).toBeDefined();
      expect(severestConflict.overlapPeriod.startDate).toBe('2024-05-01');
      expect(severestConflict.overlapPeriod.endDate).toBe('2024-08-31');
    });

    test('should handle assignments with no end date', async () => {
      const assignment1 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', 50, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      const assignment2 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-06-01', '2024-12-31', 60, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1]]);

      testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id];

      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('date_overlap');
      expect(conflicts[0].hasOpenEndedAssignment).toBe(true);
    });
  });

  describe('Over-allocation Detection', () => {
    test('should categorize conflict severity based on allocation percentage', async () => {
      // Test different severity levels
      const testCases = [
        { allocation1: 60, allocation2: 45, expectedSeverity: 'medium' }, // 105%
        { allocation1: 70, allocation2: 50, expectedSeverity: 'high' },   // 120%
        { allocation1: 80, allocation2: 70, expectedSeverity: 'critical' } // 150%
      ];

      for (const testCase of testCases) {
        // Clean up previous assignments
        await db.query('DELETE FROM resource_assignments WHERE employee_id = $1', [testEmployeeIds[0]]);

        const assignment1 = await db.query(`
          INSERT INTO resource_assignments (
            employee_id, project_id, role_id, assignment_type, start_date, end_date,
            planned_allocation_percentage, status
          ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', $4, 'active')
          RETURNING id
        `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0], testCase.allocation1]);

        const assignment2 = await db.query(`
          INSERT INTO resource_assignments (
            employee_id, project_id, role_id, assignment_type, start_date, end_date,
            planned_allocation_percentage, status
          ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', $4, 'active')
          RETURNING id
        `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1], testCase.allocation2]);

        const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);

        expect(conflicts[0].severity).toBe(testCase.expectedSeverity);
        
        // Clean up for next iteration
        await db.query('DELETE FROM resource_assignments WHERE id IN ($1, $2)', 
          [assignment1.rows[0].id, assignment2.rows[0].id]);
      }
    });

    test('should detect allocation just at 100%', async () => {
      const assignment1 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 60, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      const assignment2 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 40, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1]]);

      testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id];

      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);

      // Should not be a conflict at exactly 100%
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    beforeEach(async () => {
      // Create a standard conflict scenario
      const assignment1 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 70, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      const assignment2 = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 50, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[1], testRoleIds[1]]);

      testAssignmentIds = [assignment1.rows[0].id, assignment2.rows[0].id];
    });

    test('should suggest allocation reduction strategies', async () => {
      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);
      const strategies = await service.suggestResolutionStrategies(conflicts[0]);

      const reductionStrategy = strategies.find(s => s.strategyType === 'reduce_allocation');
      expect(reductionStrategy).toBeDefined();
      expect(reductionStrategy.details.suggestedAllocations).toBeDefined();
      
      const totalSuggested = reductionStrategy.details.suggestedAllocations
        .reduce((sum: number, alloc: any) => sum + alloc.percentage, 0);
      expect(totalSuggested).toBeLessThanOrEqual(100);
    });

    test('should suggest date adjustment strategies', async () => {
      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);
      const strategies = await service.suggestResolutionStrategies(conflicts[0]);

      const dateStrategy = strategies.find(s => s.strategyType === 'adjust_dates');
      expect(dateStrategy).toBeDefined();
      expect(dateStrategy.details.suggestedDateChanges).toBeDefined();
      
      // Verify suggested dates eliminate overlap
      const changes = dateStrategy.details.suggestedDateChanges;
      expect(changes).toHaveLength(2);
      expect(new Date(changes[0].newEndDate) < new Date(changes[1].newStartDate) ||
             new Date(changes[1].newEndDate) < new Date(changes[0].newStartDate)).toBe(true);
    });

    test('should suggest employee reassignment when available', async () => {
      // Add another employee with similar skills
      const altEmployee = await db.query(`
        INSERT INTO employees (first_name, last_name, email, position, department_id, is_active) 
        VALUES ('Alternative', 'Employee', 'alt.emp@test.com', 'Senior Developer', 1, true)
        RETURNING id
      `);

      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);
      const strategies = await service.suggestResolutionStrategies(
        conflicts[0], 
        { includeReassignment: true }
      );

      const reassignmentStrategy = strategies.find(s => s.strategyType === 'reassign_employee');
      
      if (reassignmentStrategy) {
        expect(reassignmentStrategy.details.alternativeEmployees).toBeDefined();
        expect(reassignmentStrategy.details.alternativeEmployees.length).toBeGreaterThan(0);
      }

      // Clean up
      await db.query('DELETE FROM employees WHERE id = $1', [altEmployee.rows[0].id]);
    });

    test('should rank strategies by feasibility and impact', async () => {
      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);
      const strategies = await service.suggestResolutionStrategies(conflicts[0]);

      expect(strategies).toHaveLength(3); // reduce, adjust, reassign
      
      // Verify all strategies have required properties
      strategies.forEach(strategy => {
        expect(strategy.impact).toMatch(/^(low|medium|high)$/);
        expect(strategy.feasibility).toMatch(/^(easy|moderate|difficult)$/);
        expect(strategy.description).toBeDefined();
      });

      // Should be sorted by some ranking criteria
      for (let i = 0; i < strategies.length - 1; i++) {
        // Easy solutions should come before difficult ones
        if (strategies[i].feasibility === 'difficult') {
          expect(strategies[i + 1].feasibility).toBe('difficult');
        }
      }
    });
  });

  describe('Real-time Validation', () => {
    test('should validate assignment before creation', async () => {
      // Create existing assignment
      const existing = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 80, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      testAssignmentIds = [existing.rows[0].id];

      // Attempt to create conflicting assignment
      const newAssignment = {
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[1],
        roleId: testRoleIds[1],
        startDate: '2024-03-01',
        endDate: '2024-09-30',
        plannedAllocationPercentage: 40
      };

      const validation = await service.validateAssignmentCreation(newAssignment);

      expect(validation.hasConflicts).toBe(true);
      expect(validation.conflicts.length).toBeGreaterThan(0);
      expect(validation.maxAllocationPeriod.percentage).toBe(120);
    });

    test('should allow non-conflicting assignments', async () => {
      // Create existing assignment
      const existing = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-03-31', 60, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      testAssignmentIds = [existing.rows[0].id];

      // Create non-conflicting assignment (different time period)
      const newAssignment = {
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[1],
        roleId: testRoleIds[1],
        startDate: '2024-04-01',
        endDate: '2024-09-30',
        plannedAllocationPercentage: 50
      };

      const validation = await service.validateAssignmentCreation(newAssignment);

      expect(validation.hasConflicts).toBe(false);
      expect(validation.conflicts).toHaveLength(0);
    });

    test('should handle edge cases in date boundaries', async () => {
      // Create assignment ending on specific date
      const existing = await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ($1, $2, $3, 'employee', '2024-01-01', '2024-03-31', 100, 'active')
        RETURNING id
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0]]);

      testAssignmentIds = [existing.rows[0].id];

      // Create assignment starting the next day
      const newAssignment = {
        employeeId: testEmployeeIds[0],
        projectId: testProjectIds[1],
        roleId: testRoleIds[1],
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        plannedAllocationPercentage: 80
      };

      const validation = await service.validateAssignmentCreation(newAssignment);

      expect(validation.hasConflicts).toBe(false);
    });
  });

  describe('Bulk Conflict Analysis', () => {
    test('should detect conflicts across multiple employees', async () => {
      // Create assignments for multiple employees
      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES 
          ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 70, 'active'),
          ($1, $2, $3, 'employee', '2024-03-01', '2024-09-30', 40, 'active'),
          ($4, $2, $3, 'employee', '2024-02-01', '2024-07-31', 60, 'active'),
          ($4, $2, $3, 'employee', '2024-05-01', '2024-10-31', 50, 'active')
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0],
          testEmployeeIds[1], testProjectIds[1], testRoleIds[1]]);

      const allConflicts = await service.detectAllConflicts({
        employeeIds: [testEmployeeIds[0], testEmployeeIds[1]]
      });

      expect(allConflicts.totalConflicts).toBe(2);
      expect(allConflicts.conflictsByEmployee).toHaveProperty(testEmployeeIds[0].toString());
      expect(allConflicts.conflictsByEmployee).toHaveProperty(testEmployeeIds[1].toString());
    });

    test('should analyze conflicts by project', async () => {
      // Create cross-project conflicts
      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES 
          ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 60, 'active'),
          ($1, $4, $5, 'employee', '2024-03-01', '2024-09-30', 50, 'active')
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0], testProjectIds[1], testRoleIds[1]]);

      const projectConflicts = await service.analyzeProjectConflicts(testProjectIds);

      expect(projectConflicts.affectedProjects).toContain(testProjectIds[0]);
      expect(projectConflicts.affectedProjects).toContain(testProjectIds[1]);
      expect(projectConflicts.crossProjectConflicts).toHaveLength(1);
    });

    test('should generate conflict summary report', async () => {
      // Create various types of conflicts
      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES 
          ($1, $2, $3, 'employee', '2024-01-01', '2024-06-30', 80, 'active'),
          ($1, $4, $5, 'employee', '2024-03-01', '2024-09-30', 60, 'active'),
          ($6, $2, $3, 'employee', '2024-02-01', '2024-07-31', 120, 'active')
      `, [testEmployeeIds[0], testProjectIds[0], testRoleIds[0], 
          testProjectIds[1], testRoleIds[1], testEmployeeIds[1]]);

      const summary = await service.generateConflictSummary();

      expect(summary.totalEmployeesWithConflicts).toBeGreaterThan(0);
      expect(summary.conflictsBySeverity.high).toBeGreaterThan(0);
      expect(summary.conflictsByType.date_overlap).toBeGreaterThan(0);
      expect(summary.averageOverallocation).toBeGreaterThan(0);
      expect(summary.recommendedActions).toBeDefined();
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large datasets efficiently', async () => {
      // Create many assignments to test performance
      const assignments = [];
      for (let i = 0; i < 100; i++) {
        const employee = await db.query(`
          INSERT INTO employees (first_name, last_name, email, position, department_id) 
          VALUES ($1, $2, $3, 'Developer', 1)
          RETURNING id
        `, [`Test${i}`, `User${i}`, `test${i}@test.com`]);

        assignments.push([
          employee.rows[0].id, testProjectIds[0], testRoleIds[0], 
          'employee', '2024-01-01', '2024-06-30', 50 + (i % 30), 'active'
        ]);
      }

      await db.query(`
        INSERT INTO resource_assignments (
          employee_id, project_id, role_id, assignment_type, start_date, end_date,
          planned_allocation_percentage, status
        ) VALUES ${assignments.map((_, i) => `($${i*7 + 1}, $${i*7 + 2}, $${i*7 + 3}, $${i*7 + 4}, $${i*7 + 5}, $${i*7 + 6}, $${i*7 + 7}, $${i*7 + 8})`).join(', ')}
      `, assignments.flat());

      const startTime = Date.now();
      const conflicts = await service.detectAllConflicts();
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(conflicts).toBeDefined();

      // Clean up
      await db.query('DELETE FROM employees WHERE email LIKE $1', ['test%@test.com']);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid employee ID', async () => {
      await expect(service.detectOverlapConflicts(99999))
        .rejects.toThrow('Employee not found');
    });

    test('should handle empty assignment data gracefully', async () => {
      const conflicts = await service.detectOverlapConflicts(testEmployeeIds[0]);
      expect(conflicts).toHaveLength(0);
    });

    test('should handle database connection errors', async () => {
      const originalQuery = db.query;
      db.query = () => Promise.reject(new Error('Database connection lost'));

      await expect(service.detectOverlapConflicts(testEmployeeIds[0]))
        .rejects.toThrow('Database connection lost');

      db.query = originalQuery;
    });

    test('should validate assignment creation data', async () => {
      const invalidAssignment = {
        employeeId: null,
        projectId: testProjectIds[0],
        roleId: testRoleIds[0],
        startDate: '2024-01-01'
      };

      await expect(service.validateAssignmentCreation(invalidAssignment as any))
        .rejects.toThrow('Employee ID is required');
    });
  });
});