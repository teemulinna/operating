/**
 * Integration tests for bulk operations with database transactions
 * Tests transaction handling, rollback scenarios, and performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import BulkAllocationService from '@/services/bulk-allocation.service';
import TeamManagementService from '@/services/team-management.service';
import type {
  BulkCreateAllocationRequest,
  BulkUpdateAllocationRequest,
  BulkDeleteAllocationRequest,
  CreateTeamTemplateRequest,
  TeamAssignmentRequest,
} from '@/types/bulk-operations';
import type { CreateAllocationRequest } from '@/types/allocation';

// Test database connection
const testDbPool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'resource_allocation_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'password',
});

// Test data setup
const testEmployeeIds: string[] = [];
const testProjectIds: string[] = [];
const testDepartmentId = '550e8400-e29b-41d4-a716-446655440000';

describe('Bulk Operations Integration Tests', () => {
  beforeAll(async () => {
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await testDbPool.end();
  });

  beforeEach(async () => {
    // Reset allocation data before each test
    await testDbPool.query('DELETE FROM allocations WHERE created_at >= NOW() - INTERVAL \'1 hour\'');
  });

  describe('Bulk Allocation Creation', () => {
    it('should create multiple allocations in a single transaction', async () => {
      const allocations: CreateAllocationRequest[] = [
        {
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 40,
          role: 'Developer',
        },
        {
          employeeId: testEmployeeIds[1],
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 30,
          role: 'Designer',
        },
        {
          employeeId: testEmployeeIds[2],
          projectId: testProjectIds[1],
          startDate: '2025-02-01',
          endDate: '2025-04-30',
          allocatedHours: 35,
          role: 'Analyst',
        },
      ];

      const request: BulkCreateAllocationRequest = {
        allocations,
        options: {
          batchSize: 2,
          validateBeforeCommit: true,
        },
      };

      const result = await BulkAllocationService.bulkCreateAllocations(request);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.totalProcessed).toBe(3);
      expect(result.transactionId).toBeDefined();

      // Verify database state
      const dbResult = await testDbPool.query(
        'SELECT COUNT(*) FROM allocations WHERE employee_id = ANY($1)',
        [testEmployeeIds]
      );
      expect(parseInt(dbResult.rows[0].count)).toBe(3);
    });

    it('should rollback transaction on critical error', async () => {
      const allocations: CreateAllocationRequest[] = [
        {
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 40,
          role: 'Developer',
        },
        {
          employeeId: 'invalid-uuid', // This will cause an error
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 30,
          role: 'Designer',
        },
      ];

      const request: BulkCreateAllocationRequest = {
        allocations,
        options: {
          continueOnError: false, // Rollback on any error
        },
      };

      await expect(BulkAllocationService.bulkCreateAllocations(request))
        .rejects.toThrow();

      // Verify no allocations were created
      const dbResult = await testDbPool.query(
        'SELECT COUNT(*) FROM allocations WHERE employee_id = $1',
        [testEmployeeIds[0]]
      );
      expect(parseInt(dbResult.rows[0].count)).toBe(0);
    });

    it('should handle partial failures with continueOnError option', async () => {
      const allocations: CreateAllocationRequest[] = [
        {
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 40,
          role: 'Developer',
        },
        {
          employeeId: 'invalid-uuid',
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 30,
          role: 'Designer',
        },
        {
          employeeId: testEmployeeIds[1],
          projectId: testProjectIds[1],
          startDate: '2025-02-01',
          endDate: '2025-04-30',
          allocatedHours: 35,
          role: 'Analyst',
        },
      ];

      const request: BulkCreateAllocationRequest = {
        allocations,
        options: {
          continueOnError: true,
        },
      };

      const result = await BulkAllocationService.bulkCreateAllocations(request);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
      expect(result.totalProcessed).toBe(3);
    });
  });

  describe('Bulk Allocation Updates', () => {
    it('should update multiple allocations with batch processing', async () => {
      // First create some allocations
      const allocationIds = await createTestAllocations(3);

      const updates = allocationIds.map((id, index) => ({
        id,
        updates: {
          allocatedHours: 20 + index * 5,
          role: `Updated Role ${index + 1}`,
        },
      }));

      const request: BulkUpdateAllocationRequest = {
        updates,
        options: {
          batchSize: 2,
        },
      };

      const result = await BulkAllocationService.bulkUpdateAllocations(request);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);

      // Verify updates in database
      const dbResult = await testDbPool.query(
        'SELECT id, allocated_hours, role FROM allocations WHERE id = ANY($1) ORDER BY allocated_hours',
        [allocationIds]
      );

      expect(dbResult.rows).toHaveLength(3);
      expect(dbResult.rows[0].allocated_hours).toBe('20.00');
      expect(dbResult.rows[1].allocated_hours).toBe('25.00');
      expect(dbResult.rows[2].allocated_hours).toBe('30.00');
    });

    it('should handle update conflicts and validation errors', async () => {
      const allocationIds = await createTestAllocations(2);

      // Create conflicting allocation for first employee
      await testDbPool.query(
        `INSERT INTO allocations (id, employee_id, project_id, start_date, end_date, allocated_hours, status, is_active)
         VALUES (uuid_generate_v4(), $1, $2, '2025-01-01', '2025-06-30', 40, 'active', true)`,
        [testEmployeeIds[0], testProjectIds[1]]
      );

      const updates = [
        {
          id: allocationIds[0],
          updates: {
            startDate: '2025-01-01',
            endDate: '2025-06-30',
            allocatedHours: 50, // This would cause overallocation
          },
        },
        {
          id: allocationIds[1],
          updates: {
            allocatedHours: 25,
            role: 'Updated Role',
          },
        },
      ];

      const request: BulkUpdateAllocationRequest = {
        updates,
        options: {
          continueOnError: true,
        },
      };

      const result = await BulkAllocationService.bulkUpdateAllocations(request);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.conflicts).toBeDefined();
      expect(result.conflicts!.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Allocation Deletion', () => {
    it('should delete multiple allocations with cascade handling', async () => {
      const allocationIds = await createTestAllocations(3);

      // Create some related time entries
      await testDbPool.query(
        `INSERT INTO time_entries (id, allocation_id, employee_id, hours_worked, entry_date)
         VALUES (uuid_generate_v4(), $1, $2, 8, CURRENT_DATE)`,
        [allocationIds[0], testEmployeeIds[0]]
      );

      const request: BulkDeleteAllocationRequest = {
        ids: allocationIds,
        options: {
          cascadeDelete: true,
        },
      };

      const result = await BulkAllocationService.bulkDeleteAllocations(request);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);

      // Verify deletions
      const dbResult = await testDbPool.query(
        'SELECT COUNT(*) FROM allocations WHERE id = ANY($1)',
        [allocationIds]
      );
      expect(parseInt(dbResult.rows[0].count)).toBe(0);

      // Verify cascade deletion of time entries
      const timeEntriesResult = await testDbPool.query(
        'SELECT COUNT(*) FROM time_entries WHERE allocation_id = ANY($1)',
        [allocationIds]
      );
      expect(parseInt(timeEntriesResult.rows[0].count)).toBe(0);
    });
  });

  describe('Team Management Operations', () => {
    it('should create team template and assign team to project', async () => {
      const templateRequest: CreateTeamTemplateRequest = {
        name: 'Standard Development Team',
        description: 'Template for typical development project',
        departmentId: testDepartmentId,
        roles: [
          {
            roleName: 'Senior Developer',
            requiredSkills: ['JavaScript', 'Node.js', 'PostgreSQL'],
            minimumExperienceLevel: 'senior',
            allocationPercentage: 80,
            isRequired: true,
            priority: 9,
          },
          {
            roleName: 'Junior Developer',
            requiredSkills: ['JavaScript', 'React'],
            minimumExperienceLevel: 'junior',
            allocationPercentage: 60,
            isRequired: true,
            priority: 7,
          },
          {
            roleName: 'Designer',
            requiredSkills: ['UI/UX', 'Figma'],
            minimumExperienceLevel: 'intermediate',
            allocationPercentage: 40,
            isRequired: false,
            priority: 5,
          },
        ],
        estimatedDurationDays: 90,
        tags: ['development', 'web', 'standard'],
      };

      const template = await TeamManagementService.createTeamTemplate(templateRequest);

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Standard Development Team');
      expect(template.roles).toHaveLength(3);

      // Create team and assign to project
      const teamRequest = {
        name: 'Project Alpha Team',
        description: 'Team for Project Alpha development',
        departmentId: testDepartmentId,
        leaderId: testEmployeeIds[0],
        memberIds: testEmployeeIds.slice(0, 3),
      };

      const team = await TeamManagementService.createTeam(teamRequest);
      expect(team.id).toBeDefined();
      expect(team.members).toHaveLength(3);

      // Assign team to project using template
      const assignmentRequest: TeamAssignmentRequest = {
        teamId: team.id,
        projectId: testProjectIds[0],
        templateId: template.id,
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        options: {
          autoAssignRoles: true,
          validateSkillMatch: true,
        },
      };

      const assignmentResult = await TeamManagementService.assignTeamToProject(assignmentRequest);

      expect(assignmentResult.assignments.length).toBeGreaterThan(0);
      expect(assignmentResult.totalCapacityUsed).toBeGreaterThan(0);

      // Verify allocations were created
      const allocationsResult = await testDbPool.query(
        'SELECT COUNT(*) FROM allocations WHERE project_id = $1 AND employee_id = ANY($2)',
        [testProjectIds[0], testEmployeeIds.slice(0, 3)]
      );
      expect(parseInt(allocationsResult.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch operations efficiently', async () => {
      const batchSize = 1000;
      const allocations: CreateAllocationRequest[] = [];

      // Generate large batch of allocations
      for (let i = 0; i < batchSize; i++) {
        allocations.push({
          employeeId: testEmployeeIds[i % testEmployeeIds.length],
          projectId: testProjectIds[i % testProjectIds.length],
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          allocatedHours: 10 + (i % 30),
          role: `Role ${i % 5}`,
        });
      }

      const startTime = Date.now();

      const request: BulkCreateAllocationRequest = {
        allocations,
        options: {
          batchSize: 100, // Process in chunks
          continueOnError: true,
        },
      };

      const result = await BulkAllocationService.bulkCreateAllocations(request);

      const duration = Date.now() - startTime;

      expect(result.totalProcessed).toBe(batchSize);
      expect(result.successful.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds

      console.log(`Processed ${batchSize} allocations in ${duration}ms`);
      console.log(`Success rate: ${(result.successful.length / result.totalProcessed * 100).toFixed(2)}%`);
    });

    it('should process chunked operations with progress tracking', async () => {
      const testData = Array.from({ length: 500 }, (_, i) => ({
        employeeId: testEmployeeIds[i % testEmployeeIds.length],
        projectId: testProjectIds[i % testProjectIds.length],
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        allocatedHours: 20,
        role: `Test Role ${i}`,
      }));

      const progressUpdates: Array<{ current: number; total: number; percentage: number }> = [];

      const result = await BulkAllocationService.processBulkOperationInChunks(
        testData,
        async (chunk) => {
          const request: BulkCreateAllocationRequest = {
            allocations: chunk,
            options: { continueOnError: true },
          };
          return await BulkAllocationService.bulkCreateAllocations(request);
        },
        {
          chunkSize: 50,
          onProgress: (progress) => {
            progressUpdates.push(progress);
          },
          continueOnError: true,
        }
      );

      expect(result.totalProcessed).toBe(500);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Transaction Rollback Scenarios', () => {
    it('should rollback on database constraint violations', async () => {
      const allocations: CreateAllocationRequest[] = [
        {
          employeeId: testEmployeeIds[0],
          projectId: testProjectIds[0],
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          allocatedHours: 40,
          role: 'Developer',
        },
        {
          employeeId: testEmployeeIds[0], // Same employee
          projectId: testProjectIds[0], // Same project
          startDate: '2025-01-01', // Same dates - should violate unique constraint
          endDate: '2025-03-31',
          allocatedHours: 30,
          role: 'Designer',
        },
      ];

      const request: BulkCreateAllocationRequest = {
        allocations,
        options: {
          continueOnError: false,
        },
      };

      await expect(BulkAllocationService.bulkCreateAllocations(request))
        .rejects.toThrow();

      // Verify no allocations were created due to rollback
      const dbResult = await testDbPool.query(
        'SELECT COUNT(*) FROM allocations WHERE employee_id = $1 AND project_id = $2',
        [testEmployeeIds[0], testProjectIds[0]]
      );
      expect(parseInt(dbResult.rows[0].count)).toBe(0);
    });

    it('should handle deadlock scenarios gracefully', async () => {
      // This test simulates potential deadlock scenarios in concurrent operations
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const allocations: CreateAllocationRequest[] = [
          {
            employeeId: testEmployeeIds[i % testEmployeeIds.length],
            projectId: testProjectIds[(i + 1) % testProjectIds.length],
            startDate: `2025-0${(i % 9) + 1}-01`,
            endDate: `2025-0${(i % 9) + 1}-28`,
            allocatedHours: 20,
            role: `Concurrent Role ${i}`,
          },
        ];

        const request: BulkCreateAllocationRequest = {
          allocations,
          options: {
            continueOnError: true,
          },
        };

        try {
          return await BulkAllocationService.bulkCreateAllocations(request);
        } catch (error) {
          // Expected some operations might fail due to concurrency
          return null;
        }
      });

      const results = await Promise.allSettled(operations);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;

      expect(successful).toBeGreaterThan(0);
      console.log(`${successful}/${results.length} concurrent operations succeeded`);
    });
  });
});

// Helper functions
async function setupTestData() {
  // Create test department
  await testDbPool.query(`
    INSERT INTO departments (id, name, description, is_active) 
    VALUES ($1, 'Test Department', 'Department for testing', true)
    ON CONFLICT (id) DO NOTHING
  `, [testDepartmentId]);

  // Create test employees
  for (let i = 0; i < 5; i++) {
    const employeeId = `550e8400-e29b-41d4-a716-44665544000${i}`;
    testEmployeeIds.push(employeeId);
    
    await testDbPool.query(`
      INSERT INTO employees (id, employee_number, first_name, last_name, email, hire_date, department_id, position_title, employment_type, weekly_capacity_hours, is_active)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, 'Test Position', 'FULL_TIME', 40, true)
      ON CONFLICT (id) DO NOTHING
    `, [employeeId, `EMP${i}`, `First${i}`, `Last${i}`, `test${i}@example.com`, testDepartmentId]);
  }

  // Create test projects
  for (let i = 0; i < 3; i++) {
    const projectId = `660e8400-e29b-41d4-a716-44665544000${i}`;
    testProjectIds.push(projectId);
    
    await testDbPool.query(`
      INSERT INTO projects (id, name, description, client_name, status, start_date, is_active)
      VALUES ($1, $2, $3, 'Test Client', 'active', CURRENT_DATE, true)
      ON CONFLICT (id) DO NOTHING
    `, [projectId, `Test Project ${i}`, `Description for test project ${i}`]);
  }
}

async function cleanupTestData() {
  // Clean up in reverse order of dependencies
  await testDbPool.query('DELETE FROM time_entries WHERE allocation_id IN (SELECT id FROM allocations WHERE employee_id = ANY($1))', [testEmployeeIds]);
  await testDbPool.query('DELETE FROM team_assignments WHERE team_id IN (SELECT id FROM teams WHERE created_at >= NOW() - INTERVAL \'1 hour\')');
  await testDbPool.query('DELETE FROM team_members WHERE team_id IN (SELECT id FROM teams WHERE created_at >= NOW() - INTERVAL \'1 hour\')');
  await testDbPool.query('DELETE FROM teams WHERE created_at >= NOW() - INTERVAL \'1 hour\'');
  await testDbPool.query('DELETE FROM team_template_roles WHERE template_id IN (SELECT id FROM team_templates WHERE created_at >= NOW() - INTERVAL \'1 hour\')');
  await testDbPool.query('DELETE FROM team_templates WHERE created_at >= NOW() - INTERVAL \'1 hour\'');
  await testDbPool.query('DELETE FROM allocations WHERE employee_id = ANY($1)', [testEmployeeIds]);
  await testDbPool.query('DELETE FROM employees WHERE id = ANY($1)', [testEmployeeIds]);
  await testDbPool.query('DELETE FROM projects WHERE id = ANY($1)', [testProjectIds]);
  await testDbPool.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
  await testDbPool.query('DELETE FROM bulk_operations_log WHERE created_at >= NOW() - INTERVAL \'1 hour\'');
}

async function createTestAllocations(count: number): Promise<string[]> {
  const allocationIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const result = await testDbPool.query(`
      INSERT INTO allocations (id, employee_id, project_id, start_date, end_date, allocated_hours, role, status, is_active)
      VALUES (uuid_generate_v4(), $1, $2, '2025-01-01', '2025-03-31', $3, $4, 'active', true)
      RETURNING id
    `, [
      testEmployeeIds[i % testEmployeeIds.length],
      testProjectIds[i % testProjectIds.length],
      15 + i * 5,
      `Test Role ${i}`,
    ]);
    
    allocationIds.push(result.rows[0].id);
  }
  
  return allocationIds;
}