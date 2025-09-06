/**
 * Employee Assignment View API Integration Tests
 * Tests multi-project employee view and conflict detection with real-time capabilities
 * Following TDD methodology - comprehensive employee-centric testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { initializeServices } from '../../src/container/service-registration';
import { ProjectStatus } from '../../src/types';

describe('Employee Assignment View API Integration Tests', () => {
  let databaseService: DatabaseService;
  let testEmployeeId: string;
  let testEmployeeId2: string;
  let testProjectId1: string;
  let testProjectId2: string;
  let testProjectId3: string;
  let departmentId: string;

  beforeAll(async () => {
    // Initialize services and database
    await initializeServices();
    databaseService = DatabaseService.getInstance();
  });

  afterAll(async () => {
    // Clean up
    await DatabaseService.disconnect();
  });

  beforeEach(async () => {
    // Clean and set up comprehensive test data
    const pool = databaseService.getPool();
    if (!pool) throw new Error('Database pool not available');

    // Clean existing data
    await pool.query('DELETE FROM allocations WHERE 1=1');
    await pool.query('DELETE FROM projects WHERE 1=1');
    await pool.query('DELETE FROM employees WHERE 1=1');
    await pool.query('DELETE FROM departments WHERE 1=1');

    // Create test department
    const deptResult = await pool.query(`
      INSERT INTO departments (name, description, is_active)
      VALUES ('Product Engineering', 'Product Engineering Department', true)
      RETURNING id
    `);
    departmentId = deptResult.rows[0].id;

    // Create test employees
    const employee1Result = await pool.query(`
      INSERT INTO employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('Alex Johnson', 'alex@example.com', 'Full Stack Developer', $1, '2023-01-01', true)
      RETURNING id
    `, [departmentId]);
    testEmployeeId = employee1Result.rows[0].id;

    const employee2Result = await pool.query(`
      INSERT INTO employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('Sarah Chen', 'sarah@example.com', 'Senior Frontend Developer', $1, '2023-03-01', true)
      RETURNING id
    `, [departmentId]);
    testEmployeeId2 = employee2Result.rows[0].id;

    // Create test projects with varying timelines
    const projects = [
      {
        name: 'E-commerce Platform',
        description: 'Major e-commerce platform development',
        client: 'Retail Corp',
        startDate: '2024-01-01',
        endDate: '2024-06-30',
        budget: 150000,
        hourlyRate: 120
      },
      {
        name: 'Mobile App Redesign',
        description: 'Complete mobile app UI/UX redesign',
        client: 'Tech Startup',
        startDate: '2024-03-01',
        endDate: '2024-08-31',
        budget: 80000,
        hourlyRate: 100
      },
      {
        name: 'API Integration System',
        description: 'Third-party API integration platform',
        client: 'Enterprise Client',
        startDate: '2024-05-01',
        endDate: '2024-10-31',
        budget: 200000,
        hourlyRate: 150
      }
    ];

    const projectIds = [];
    for (const project of projects) {
      const result = await pool.query(`
        INSERT INTO projects (name, description, start_date, end_date, status, client_name, budget, hourly_rate)
        VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)
        RETURNING id
      `, [project.name, project.description, project.startDate, project.endDate, 
          project.client, project.budget, project.hourlyRate]);
      projectIds.push(result.rows[0].id);
    }

    [testProjectId1, testProjectId2, testProjectId3] = projectIds;
  });

  describe('GET /api/allocations/employee/:employeeId - Multi-Project Employee View', () => {
    beforeEach(async () => {
      // Create complex allocation scenario for employee
      const allocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId1.toString(),
          allocatedHours: 120, // 3 weeks full-time
          roleOnProject: 'Backend Lead',
          startDate: '2024-01-15',
          endDate: '2024-02-05',
          hourlyRate: 120,
          notes: 'Leading backend development team'
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId2.toString(),
          allocatedHours: 80, // 2 weeks full-time
          roleOnProject: 'Full Stack Developer',
          startDate: '2024-03-15',
          endDate: '2024-03-29',
          hourlyRate: 110,
          notes: 'Mobile app backend integration'
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId3.toString(),
          allocatedHours: 160, // 4 weeks full-time
          roleOnProject: 'API Architect',
          startDate: '2024-06-01',
          endDate: '2024-06-28',
          hourlyRate: 150,
          notes: 'Designing API architecture and implementation'
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId1.toString(),
          allocatedHours: 40, // 1 week part-time
          roleOnProject: 'Code Reviewer',
          startDate: '2024-04-01',
          endDate: '2024-04-05',
          hourlyRate: 120,
          notes: 'Code review and mentoring'
        }
      ];

      for (const allocation of allocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation)
          .expect(201);
      }
    });

    it('should get all allocations for employee across multiple projects', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Employee allocations retrieved successfully');
      expect(response.body.data).toHaveLength(4);
      
      // Verify all allocations belong to the correct employee
      expect(response.body.data.every((allocation: any) => 
        allocation.employeeId === testEmployeeId
      )).toBeTruthy();

      // Check that allocations span multiple projects
      const projectIds = new Set(response.body.data.map((a: any) => a.projectId));
      expect(projectIds.size).toBe(3);
    });

    it('should show different roles across projects', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .expect(200);

      const roles = response.body.data.map((allocation: any) => allocation.roleOnProject);
      expect(roles).toContain('Backend Lead');
      expect(roles).toContain('Full Stack Developer');
      expect(roles).toContain('API Architect');
      expect(roles).toContain('Code Reviewer');
    });

    it('should calculate total workload across projects', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .expect(200);

      const totalHours = response.body.data.reduce(
        (sum: number, allocation: any) => sum + allocation.allocatedHours, 
        0
      );
      expect(totalHours).toBe(400); // 120 + 80 + 160 + 40
    });

    it('should filter employee allocations by date range', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({
          startDateFrom: '2024-01-01',
          startDateTo: '2024-02-28'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].roleOnProject).toBe('Backend Lead');
    });

    it('should filter employee allocations by active status', async () => {
      // First, deactivate one allocation
      const allResponse = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`);
      
      const allocationToDeactivate = allResponse.body.data[0];
      
      await request(app)
        .put(`/api/allocations/${allocationToDeactivate.id}`)
        .send({ isActive: false });

      // Then filter by active status
      const activeResponse = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({ isActive: true })
        .expect(200);

      expect(activeResponse.body.data).toHaveLength(3);
      expect(activeResponse.body.data.every((allocation: any) => 
        allocation.isActive === true
      )).toBeTruthy();
    });

    it('should support pagination for employees with many allocations', async () => {
      const page1 = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.pagination.totalPages).toBe(2);
      expect(page1.body.pagination.total).toBe(4);

      const page2 = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.data).toHaveLength(2);
      expect(page2.body.pagination.page).toBe(2);
    });

    it('should return empty result for employee with no allocations', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return 400 for invalid employee ID', async () => {
      const response = await request(app)
        .get('/api/allocations/employee/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Employee not found');
    });
  });

  describe('GET /api/allocations/conflicts - Real-time Conflict Detection', () => {
    beforeEach(async () => {
      // Create baseline allocations that will cause conflicts
      const baselineAllocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId1.toString(),
          allocatedHours: 80,
          roleOnProject: 'Frontend Developer',
          startDate: '2024-07-01',
          endDate: '2024-07-15',
          hourlyRate: 100
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId2.toString(),
          allocatedHours: 60,
          roleOnProject: 'UI Designer',
          startDate: '2024-07-20',
          endDate: '2024-07-31',
          hourlyRate: 90
        }
      ];

      for (const allocation of baselineAllocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation);
      }
    });

    it('should detect direct overlap conflicts', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-07-10',
          endDate: '2024-07-20' // Overlaps with first allocation
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conflict check completed');
      expect(response.body.data.hasConflicts).toBe(true);
      expect(response.body.data.conflicts).toHaveLength(1);
      expect(response.body.data.conflicts[0].projectName).toBe('E-commerce Platform');
    });

    it('should detect multiple overlapping conflicts', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-07-05',
          endDate: '2024-07-25' // Overlaps with both allocations
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hasConflicts).toBe(true);
      expect(response.body.data.conflicts).toHaveLength(2);
      
      const projectNames = response.body.data.conflicts.map((c: any) => c.projectName);
      expect(projectNames).toContain('E-commerce Platform');
      expect(projectNames).toContain('Mobile App Redesign');
    });

    it('should provide intelligent scheduling suggestions', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-07-10',
          endDate: '2024-07-25'
        })
        .expect(200);

      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      expect(response.body.data.suggestions[0]).toContain('Found');
      expect(response.body.data.suggestions).toContain(
        expect.stringMatching(/Consider starting after/)
      );
    });

    it('should exclude specified allocation from conflict check', async () => {
      // Get existing allocation to exclude
      const existingResponse = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`);
      const existingAllocationId = existingResponse.body.data[0].id;

      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-07-01',
          endDate: '2024-07-15',
          excludeAllocationId: existingAllocationId
        })
        .expect(200);

      expect(response.body.data.hasConflicts).toBe(false);
      expect(response.body.data.conflicts).toHaveLength(0);
    });

    it('should return no conflicts for non-overlapping dates', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-08-01',
          endDate: '2024-08-15' // No overlap with existing allocations
        })
        .expect(200);

      expect(response.body.data.hasConflicts).toBe(false);
      expect(response.body.data.conflicts).toHaveLength(0);
      expect(response.body.data.suggestions).toHaveLength(0);
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          // Missing startDate and endDate
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: 'invalid-date',
          endDate: '2024-07-15'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Start date must be valid ISO 8601'
        })
      );
    });

    it('should handle edge case overlaps', async () => {
      // Test exact boundary overlaps
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-07-15', // Ends exactly when first allocation ends
          endDate: '2024-07-20'   // Starts exactly when second allocation starts
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Depending on business rules, this might or might not be a conflict
      // The test validates the API handles boundary conditions gracefully
    });
  });

  describe('Employee Workload Analysis', () => {
    beforeEach(async () => {
      // Create comprehensive workload scenario
      const workloadAllocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId1.toString(),
          allocatedHours: 160, // Full month
          roleOnProject: 'Technical Lead',
          startDate: '2024-09-01',
          endDate: '2024-09-30',
          hourlyRate: 140
        },
        {
          employeeId: testEmployeeId2.toString(),
          projectId: testProjectId2.toString(),
          allocatedHours: 80, // Half month
          roleOnProject: 'Frontend Developer',
          startDate: '2024-09-01',
          endDate: '2024-09-15',
          hourlyRate: 110
        },
        {
          employeeId: testEmployeeId2.toString(),
          projectId: testProjectId3.toString(),
          allocatedHours: 60, // Part-time
          roleOnProject: 'UX Consultant',
          startDate: '2024-09-16',
          endDate: '2024-09-30',
          hourlyRate: 120
        }
      ];

      for (const allocation of workloadAllocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation);
      }
    });

    it('should calculate employee utilization rates', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeId', testEmployeeId);
      expect(response.body.data).toHaveProperty('totalAllocatedHours', 160);
      expect(response.body.data).toHaveProperty('utilizationRate');
      expect(response.body.data.utilizationRate).toBeCloseTo(100); // Full utilization
    });

    it('should identify over-utilized employees', async () => {
      // Create over-allocation scenario
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId2.toString(),
          allocatedHours: 40, // Additional hours causing over-allocation
          roleOnProject: 'Consultant',
          startDate: '2024-09-15',
          endDate: '2024-09-20',
          hourlyRate: 130,
          force: true // Override conflict detection
        });

      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        })
        .expect(200);

      expect(response.body.data.utilizationRate).toBeGreaterThan(100);
      expect(response.body.data.totalAllocatedHours).toBe(200); // 160 + 40
    });

    it('should provide utilization summary across all employees', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilization summary retrieved');
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('averageUtilization');
      expect(response.body.data).toHaveProperty('overutilizedCount');
      expect(response.body.data).toHaveProperty('underutilizedCount');
      expect(response.body.data).toHaveProperty('totalAllocations');
    });

    it('should handle employees with varying part-time schedules', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId2,
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        })
        .expect(200);

      expect(response.body.data.totalAllocatedHours).toBe(140); // 80 + 60
      expect(response.body.data.utilizationRate).toBeCloseTo(87.5); // 140/160 * 100
    });
  });

  describe('Cross-Project Resource Insights', () => {
    beforeEach(async () => {
      // Create scenario showing employee working across multiple projects
      const crossProjectAllocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId1.toString(),
          allocatedHours: 60,
          roleOnProject: 'Backend Developer',
          startDate: '2024-10-01',
          endDate: '2024-10-15',
          hourlyRate: 120
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId2.toString(),
          allocatedHours: 50,
          roleOnProject: 'Mobile Developer',
          startDate: '2024-10-16',
          endDate: '2024-10-25',
          hourlyRate: 110
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId3.toString(),
          allocatedHours: 40,
          roleOnProject: 'API Consultant',
          startDate: '2024-10-26',
          endDate: '2024-10-31',
          hourlyRate: 150
        }
      ];

      for (const allocation of crossProjectAllocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation);
      }
    });

    it('should show employee progression across different project types', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({
          startDateFrom: '2024-10-01',
          startDateTo: '2024-10-31'
        })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      
      // Sort by start date to verify progression
      const sortedAllocations = response.body.data.sort(
        (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );

      expect(sortedAllocations[0].roleOnProject).toBe('Backend Developer');
      expect(sortedAllocations[1].roleOnProject).toBe('Mobile Developer');
      expect(sortedAllocations[2].roleOnProject).toBe('API Consultant');
    });

    it('should calculate total revenue generated by employee', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({
          startDateFrom: '2024-10-01',
          startDateTo: '2024-10-31'
        })
        .expect(200);

      const totalRevenue = response.body.data.reduce(
        (sum: number, allocation: any) => 
          sum + (allocation.allocatedHours * allocation.hourlyRate), 
        0
      );

      expect(totalRevenue).toBe(19300); // (60*120) + (50*110) + (40*150)
    });

    it('should identify skill diversification across projects', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({
          startDateFrom: '2024-10-01',
          startDateTo: '2024-10-31'
        })
        .expect(200);

      const roles = response.body.data.map((allocation: any) => allocation.roleOnProject);
      const uniqueRoles = new Set(roles);
      
      expect(uniqueRoles.size).toBe(3);
      expect(roles).toContain('Backend Developer');
      expect(roles).toContain('Mobile Developer');
      expect(roles).toContain('API Consultant');
    });
  });
});