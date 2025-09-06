/**
 * Multi-Project Assignment Integration Tests
 * Tests for enabling employees to be assigned to multiple projects with allocation percentages
 * 
 * Test Coverage:
 * - Multi-project assignment creation and validation
 * - Allocation percentage tracking and validation
 * - Total allocation validation (must not exceed 100%)
 * - Assignment retrieval and filtering
 * - Database: assignment_allocations table operations
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DatabaseService } from '../../src/database/database.service';
import { MultiProjectAssignmentService } from '../../src/services/multi-project-assignment.service';
import { ApiError } from '../../src/utils/api-error';

describe('Multi-Project Assignment Integration Tests', () => {
  let db: DatabaseService;
  let service: MultiProjectAssignmentService;
  let testProjectIds: number[] = [];
  let testEmployeeIds: number[] = [];
  let testRoleIds: number[] = [];

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    service = new MultiProjectAssignmentService();
    
    // Ensure test database is ready
    await db.testConnection();
  });

  afterAll(async () => {
    // Clean up test data
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM assignment_allocations WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM resource_assignments WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM project_roles WHERE project_id = ANY($1)', [testProjectIds]);
      await db.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
    }
    if (testEmployeeIds.length > 0) {
      await db.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
    }
  });

  beforeEach(async () => {
    // Create test projects
    const project1 = await db.query(`
      INSERT INTO projects (name, description, start_date, status) 
      VALUES ('Test Project Alpha', 'First test project', '2024-01-01', 'active')
      RETURNING id
    `);
    const project2 = await db.query(`
      INSERT INTO projects (name, description, start_date, status) 
      VALUES ('Test Project Beta', 'Second test project', '2024-01-01', 'active')
      RETURNING id
    `);
    const project3 = await db.query(`
      INSERT INTO projects (name, description, start_date, status) 
      VALUES ('Test Project Gamma', 'Third test project', '2024-01-01', 'active')
      RETURNING id
    `);
    
    testProjectIds = [project1.rows[0].id, project2.rows[0].id, project3.rows[0].id];

    // Create test employees
    const employee1 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id) 
      VALUES ('John', 'Doe', 'john.doe@test.com', 'Developer', 1)
      RETURNING id
    `);
    const employee2 = await db.query(`
      INSERT INTO employees (first_name, last_name, email, position, department_id) 
      VALUES ('Jane', 'Smith', 'jane.smith@test.com', 'Designer', 1)
      RETURNING id
    `);
    
    testEmployeeIds = [employee1.rows[0].id, employee2.rows[0].id];

    // Create test project roles
    const role1 = await db.query(`
      INSERT INTO project_roles (project_id, role_name, description, start_date, planned_allocation_percentage, max_assignments)
      VALUES ($1, 'Frontend Developer', 'React development', '2024-01-01', 50, 2)
      RETURNING id
    `, [testProjectIds[0]]);
    
    const role2 = await db.query(`
      INSERT INTO project_roles (project_id, role_name, description, start_date, planned_allocation_percentage, max_assignments)
      VALUES ($1, 'Backend Developer', 'API development', '2024-01-01', 30, 2)
      RETURNING id
    `, [testProjectIds[1]]);
    
    const role3 = await db.query(`
      INSERT INTO project_roles (project_id, role_name, description, start_date, planned_allocation_percentage, max_assignments)
      VALUES ($1, 'UI Designer', 'Design system', '2024-01-01', 20, 1)
      RETURNING id
    `, [testProjectIds[2]]);

    testRoleIds = [role1.rows[0].id, role2.rows[0].id, role3.rows[0].id];
  });

  afterEach(async () => {
    // Clean up test data after each test
    if (testProjectIds.length > 0) {
      await db.query('DELETE FROM assignment_allocations WHERE project_id = ANY($1)', [testProjectIds]);
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
  });

  describe('Multi-Project Assignment Creation', () => {
    test('should create assignment with valid allocation percentages', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 30 },
          { projectId: testProjectIds[2], roleId: testRoleIds[2], allocationPercentage: 20 }
        ],
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'active'
      };

      const result = await service.createMultiProjectAssignment(assignmentData);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe(testEmployeeIds[0]);
      expect(result.totalAllocation).toBe(100);
      expect(result.allocations).toHaveLength(3);
      expect(result.allocations[0].allocationPercentage).toBe(50);
      expect(result.allocations[1].allocationPercentage).toBe(30);
      expect(result.allocations[2].allocationPercentage).toBe(20);
    });

    test('should reject assignment when total allocation exceeds 100%', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 60 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      await expect(service.createMultiProjectAssignment(assignmentData))
        .rejects.toThrow('Total allocation percentage cannot exceed 100%');
    });

    test('should allow partial allocation (less than 100%)', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 40 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 30 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      const result = await service.createMultiProjectAssignment(assignmentData);

      expect(result.totalAllocation).toBe(70);
      expect(result.allocations).toHaveLength(2);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01'
      };

      await expect(service.createMultiProjectAssignment(invalidData as any))
        .rejects.toThrow('Employee ID is required');
    });
  });

  describe('Assignment Allocation Updates', () => {
    test('should update allocation percentages', async () => {
      // First create an assignment
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 60 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 40 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      const assignment = await service.createMultiProjectAssignment(assignmentData);

      // Update allocations
      const updateData = {
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 30 },
          { projectId: testProjectIds[2], roleId: testRoleIds[2], allocationPercentage: 20 }
        ]
      };

      const updated = await service.updateMultiProjectAssignment(assignment.id, updateData);

      expect(updated.totalAllocation).toBe(100);
      expect(updated.allocations).toHaveLength(3);
    });

    test('should prevent updates that exceed 100% allocation', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      const assignment = await service.createMultiProjectAssignment(assignmentData);

      const invalidUpdate = {
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 70 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 50 }
        ]
      };

      await expect(service.updateMultiProjectAssignment(assignment.id, invalidUpdate))
        .rejects.toThrow('Total allocation percentage cannot exceed 100%');
    });
  });

  describe('Assignment Retrieval and Filtering', () => {
    beforeEach(async () => {
      // Create test assignments
      await service.createMultiProjectAssignment({
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 30 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      });

      await service.createMultiProjectAssignment({
        employeeId: testEmployeeIds[1],
        projectAllocations: [
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 40 },
          { projectId: testProjectIds[2], roleId: testRoleIds[2], allocationPercentage: 35 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      });
    });

    test('should retrieve assignments by employee ID', async () => {
      const assignments = await service.getAssignmentsByEmployee(testEmployeeIds[0]);

      expect(assignments).toHaveLength(1);
      expect(assignments[0].employeeId).toBe(testEmployeeIds[0]);
      expect(assignments[0].totalAllocation).toBe(80);
    });

    test('should retrieve assignments by project ID', async () => {
      const assignments = await service.getAssignmentsByProject(testProjectIds[1]);

      expect(assignments).toHaveLength(2);
      expect(assignments.every(a => 
        a.allocations.some(alloc => alloc.projectId === testProjectIds[1])
      )).toBe(true);
    });

    test('should filter assignments by status', async () => {
      const activeAssignments = await service.getAssignments({ status: 'active' });
      const completedAssignments = await service.getAssignments({ status: 'completed' });

      expect(activeAssignments.length).toBeGreaterThan(0);
      expect(completedAssignments).toHaveLength(0);
    });

    test('should filter assignments by date range', async () => {
      const assignments = await service.getAssignments({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(assignments.length).toBeGreaterThan(0);
      assignments.forEach(assignment => {
        expect(new Date(assignment.startDate).getFullYear()).toBe(2024);
      });
    });
  });

  describe('Employee Utilization Calculation', () => {
    test('should calculate total utilization across projects', async () => {
      await service.createMultiProjectAssignment({
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 40 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 35 },
          { projectId: testProjectIds[2], roleId: testRoleIds[2], allocationPercentage: 15 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      });

      const utilization = await service.getEmployeeUtilization(testEmployeeIds[0]);

      expect(utilization.totalAllocation).toBe(90);
      expect(utilization.availableCapacity).toBe(10);
      expect(utilization.projectCount).toBe(3);
      expect(utilization.allocations).toHaveLength(3);
    });

    test('should handle employee with no assignments', async () => {
      const utilization = await service.getEmployeeUtilization(testEmployeeIds[1]);

      expect(utilization.totalAllocation).toBe(0);
      expect(utilization.availableCapacity).toBe(100);
      expect(utilization.projectCount).toBe(0);
      expect(utilization.allocations).toHaveLength(0);
    });
  });

  describe('Database Operations', () => {
    test('should create assignment_allocations table records', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 60 },
          { projectId: testProjectIds[1], roleId: testRoleIds[1], allocationPercentage: 40 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      const assignment = await service.createMultiProjectAssignment(assignmentData);

      // Verify records in assignment_allocations table
      const allocations = await db.query(`
        SELECT * FROM assignment_allocations WHERE assignment_id = $1
      `, [assignment.id]);

      expect(allocations.rows).toHaveLength(2);
      expect(allocations.rows[0].allocation_percentage).toBe(60);
      expect(allocations.rows[1].allocation_percentage).toBe(40);
    });

    test('should maintain referential integrity', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      const assignment = await service.createMultiProjectAssignment(assignmentData);

      // Delete project should cascade or prevent deletion
      await expect(
        db.query('DELETE FROM projects WHERE id = $1', [testProjectIds[0]])
      ).rejects.toThrow(); // Should throw due to foreign key constraint
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid project ID', async () => {
      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: 99999, roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      await expect(service.createMultiProjectAssignment(assignmentData))
        .rejects.toThrow('Project not found');
    });

    test('should handle invalid employee ID', async () => {
      const assignmentData = {
        employeeId: 99999,
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      await expect(service.createMultiProjectAssignment(assignmentData))
        .rejects.toThrow('Employee not found');
    });

    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalQuery = db.query;
      db.query = () => Promise.reject(new Error('Database connection lost'));

      const assignmentData = {
        employeeId: testEmployeeIds[0],
        projectAllocations: [
          { projectId: testProjectIds[0], roleId: testRoleIds[0], allocationPercentage: 50 }
        ],
        startDate: '2024-01-01',
        status: 'active'
      };

      await expect(service.createMultiProjectAssignment(assignmentData))
        .rejects.toThrow('Database connection lost');

      // Restore original method
      db.query = originalQuery;
    });
  });
});