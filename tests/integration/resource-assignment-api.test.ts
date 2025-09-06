/**
 * Resource Assignment API Integration Tests
 * Tests all resource assignment endpoints with comprehensive validation
 * Following TDD methodology - comprehensive business logic testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { initializeServices } from '../../src/container/service-registration';
import { ProjectStatus } from '../../src/types';

describe('Resource Assignment API Integration Tests', () => {
  let databaseService: DatabaseService;
  let testProjectId: string;
  let testEmployeeId: string;
  let testEmployeeId2: string;
  let testAllocationId: string;
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
    // Clean and set up test data
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
      VALUES ('Engineering', 'Software Engineering Department', true)
      RETURNING id
    `);
    departmentId = deptResult.rows[0].id;

    // Create test employees
    const employee1Result = await pool.query(`
      INSERT INTO employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('John Developer', 'john@example.com', 'Senior Developer', $1, '2023-01-01', true)
      RETURNING id
    `, [departmentId]);
    testEmployeeId = employee1Result.rows[0].id;

    const employee2Result = await pool.query(`
      INSERT INTO employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('Jane Tester', 'jane@example.com', 'QA Engineer', $1, '2023-02-01', true)
      RETURNING id
    `, [departmentId]);
    testEmployeeId2 = employee2Result.rows[0].id;

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, client_name, budget, hourly_rate)
      VALUES ('Resource Test Project', 'Project for resource assignment testing', '2024-06-01', '2024-12-31', 'active', 'Test Corp', 120000, 150)
      RETURNING id
    `);
    testProjectId = projectResult.rows[0].id;
  });

  describe('POST /api/allocations - Create Resource Allocation', () => {
    it('should create allocation with valid data', async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 160, // Full-time for a month
        roleOnProject: 'Technical Lead',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        hourlyRate: 150,
        notes: 'Leading the backend development team'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation created successfully');
      expect(response.body.data).toMatchObject({
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 160,
        roleOnProject: 'Technical Lead',
        hourlyRate: 150,
        notes: 'Leading the backend development team'
      });
      expect(response.body.data.id).toBeDefined();
      
      testAllocationId = response.body.data.id;
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        // Missing allocatedHours, roleOnProject, startDate, endDate
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate date range (end date after start date)', async () => {
      const invalidDateData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 80,
        roleOnProject: 'Developer',
        startDate: '2024-06-30',
        endDate: '2024-06-01' // End before start
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(invalidDateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'End date must be a valid ISO 8601 date'
        })
      );
    });

    it('should validate allocation hours range', async () => {
      const invalidHoursData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: -10, // Negative hours
        roleOnProject: 'Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(invalidHoursData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Allocated hours must be between 0.1 and 1000'
        })
      );
    });

    it('should validate employee existence', async () => {
      const invalidEmployeeData = {
        employeeId: '99999', // Non-existent employee
        projectId: testProjectId.toString(),
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(invalidEmployeeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Employee not found');
    });

    it('should validate project existence', async () => {
      const invalidProjectData = {
        employeeId: testEmployeeId.toString(),
        projectId: '99999', // Non-existent project
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(invalidProjectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Project not found');
    });

    it('should detect and warn about over-allocation without force flag', async () => {
      const overAllocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 200, // 200 hours in a month (over-allocation)
        roleOnProject: 'Full Stack Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(overAllocationData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Allocation conflicts detected');
      expect(response.body.suggestion).toContain('Use force=true parameter to override conflicts');
    });

    it('should allow over-allocation with force flag', async () => {
      const overAllocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 200, // Over-allocation
        roleOnProject: 'Full Stack Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        force: true
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(overAllocationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allocatedHours).toBe(200);
    });

    it('should validate allocation dates within project timeline', async () => {
      const outsideProjectData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 40,
        roleOnProject: 'Developer',
        startDate: '2025-01-01', // After project end date (2024-12-31)
        endDate: '2025-01-31'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(outsideProjectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('outside project timeline');
    });
  });

  describe('GET /api/allocations - List All Allocations', () => {
    beforeEach(async () => {
      // Create multiple test allocations
      const allocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 80,
          roleOnProject: 'Backend Developer',
          startDate: '2024-06-01',
          endDate: '2024-06-15'
        },
        {
          employeeId: testEmployeeId2.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 60,
          roleOnProject: 'QA Engineer',
          startDate: '2024-06-16',
          endDate: '2024-06-30'
        }
      ];

      for (const allocation of allocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation);
      }
    });

    it('should get all allocations with pagination', async () => {
      const response = await request(app)
        .get('/api/allocations')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocations retrieved successfully');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter allocations by employee', async () => {
      const response = await request(app)
        .get('/api/allocations')
        .query({ employeeId: testEmployeeId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].employeeId).toBe(testEmployeeId);
      expect(response.body.data[0].roleOnProject).toBe('Backend Developer');
    });

    it('should filter allocations by project', async () => {
      const response = await request(app)
        .get('/api/allocations')
        .query({ projectId: testProjectId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((allocation: any) => 
        allocation.projectId === testProjectId
      )).toBeTruthy();
    });

    it('should filter allocations by date range', async () => {
      const response = await request(app)
        .get('/api/allocations')
        .query({
          startDateFrom: '2024-06-01',
          startDateTo: '2024-06-15'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].roleOnProject).toBe('Backend Developer');
    });

    it('should filter active allocations', async () => {
      const response = await request(app)
        .get('/api/allocations')
        .query({ isActive: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((allocation: any) => 
        allocation.isActive === true
      )).toBeTruthy();
    });
  });

  describe('GET /api/allocations/:id - Get Specific Allocation', () => {
    beforeEach(async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 120,
        roleOnProject: 'System Architect',
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        hourlyRate: 180,
        notes: 'Architecture design and implementation'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData);
      testAllocationId = response.body.data.id;
    });

    it('should get allocation by ID', async () => {
      const response = await request(app)
        .get(`/api/allocations/${testAllocationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testAllocationId,
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 120,
        roleOnProject: 'System Architect',
        hourlyRate: 180
      });
    });

    it('should get allocation with details', async () => {
      const response = await request(app)
        .get(`/api/allocations/${testAllocationId}`)
        .query({ includeDetails: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeDetails');
      expect(response.body.data).toHaveProperty('projectDetails');
      expect(response.body.data.employeeDetails.name).toBe('John Developer');
      expect(response.body.data.projectDetails.name).toBe('Resource Test Project');
    });

    it('should return 404 for non-existent allocation', async () => {
      const response = await request(app)
        .get('/api/allocations/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Allocation not found');
    });
  });

  describe('PUT /api/allocations/:id - Update Allocation', () => {
    beforeEach(async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 80,
        roleOnProject: 'Developer',
        startDate: '2024-08-01',
        endDate: '2024-08-15',
        hourlyRate: 140
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData);
      testAllocationId = response.body.data.id;
    });

    it('should update allocation successfully', async () => {
      const updateData = {
        allocatedHours: 100,
        roleOnProject: 'Senior Developer',
        hourlyRate: 160,
        notes: 'Updated to senior role with additional responsibilities'
      };

      const response = await request(app)
        .put(`/api/allocations/${testAllocationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation updated successfully');
      expect(response.body.data).toMatchObject({
        allocatedHours: 100,
        roleOnProject: 'Senior Developer',
        hourlyRate: 160,
        notes: 'Updated to senior role with additional responsibilities'
      });
    });

    it('should validate allocation hours on update', async () => {
      const invalidUpdateData = {
        allocatedHours: 0 // Invalid zero hours
      };

      const response = await request(app)
        .put(`/api/allocations/${testAllocationId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          msg: 'Allocated hours must be between 0.1 and 1000'
        })
      );
    });

    it('should prevent date updates that create conflicts', async () => {
      // Create another allocation that would conflict
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 40,
          roleOnProject: 'Tester',
          startDate: '2024-08-20',
          endDate: '2024-08-30'
        });

      // Try to update first allocation to overlap
      const conflictingUpdateData = {
        startDate: '2024-08-25',
        endDate: '2024-09-05'
      };

      const response = await request(app)
        .put(`/api/allocations/${testAllocationId}`)
        .send(conflictingUpdateData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Update would create allocation conflicts');
    });

    it('should return 404 for non-existent allocation', async () => {
      const updateData = {
        allocatedHours: 50
      };

      const response = await request(app)
        .put('/api/allocations/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Allocation not found');
    });
  });

  describe('DELETE /api/allocations/:id - Delete Allocation', () => {
    beforeEach(async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 60,
        roleOnProject: 'UI Developer',
        startDate: '2024-09-01',
        endDate: '2024-09-15'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData);
      testAllocationId = response.body.data.id;
    });

    it('should delete allocation successfully', async () => {
      const response = await request(app)
        .delete(`/api/allocations/${testAllocationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation cancelled successfully');

      // Verify deletion
      await request(app)
        .get(`/api/allocations/${testAllocationId}`)
        .expect(404);
    });

    it('should return 404 for non-existent allocation', async () => {
      const response = await request(app)
        .delete('/api/allocations/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Allocation not found');
    });
  });

  describe('Allocation Status Management', () => {
    beforeEach(async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 80,
        roleOnProject: 'DevOps Engineer',
        startDate: '2024-10-01',
        endDate: '2024-10-15'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData);
      testAllocationId = response.body.data.id;
    });

    it('should confirm allocation', async () => {
      const response = await request(app)
        .post(`/api/allocations/${testAllocationId}/confirm`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation confirmed successfully');
    });

    it('should complete allocation with actual hours', async () => {
      const response = await request(app)
        .post(`/api/allocations/${testAllocationId}/complete`)
        .send({ actualHours: 75 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation completed successfully');
      expect(response.body.data.actualHours).toBe(75);
    });

    it('should cancel allocation', async () => {
      const response = await request(app)
        .post(`/api/allocations/${testAllocationId}/cancel`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation cancelled successfully');
    });
  });

  describe('Capacity Validation API', () => {
    it('should validate capacity for proposed allocation', async () => {
      const validationData = {
        employeeId: testEmployeeId.toString(),
        allocatedHours: 80, // Normal allocation
        startDate: '2024-11-01',
        endDate: '2024-11-15'
      };

      const response = await request(app)
        .post('/api/allocations/validate-capacity')
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Capacity validation completed');
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('warnings');
      expect(response.body.data).toHaveProperty('utilizationRate');
    });

    it('should warn about high utilization', async () => {
      const highUtilizationData = {
        employeeId: testEmployeeId.toString(),
        allocatedHours: 170, // High utilization
        startDate: '2024-11-01',
        endDate: '2024-11-30'
      };

      const response = await request(app)
        .post('/api/allocations/validate-capacity')
        .send(highUtilizationData)
        .expect(200);

      expect(response.body.data.warnings).toContain(
        expect.stringMatching(/Over-allocation detected/)
      );
      expect(response.body.data.isValid).toBe(false);
    });

    it('should require all validation fields', async () => {
      const incompleteData = {
        employeeId: testEmployeeId.toString(),
        // Missing allocatedHours, startDate, endDate
      };

      const response = await request(app)
        .post('/api/allocations/validate-capacity')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Utilization Metrics API', () => {
    beforeEach(async () => {
      // Create multiple allocations for utilization testing
      const allocations = [
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 80,
          roleOnProject: 'Developer',
          startDate: '2024-12-01',
          endDate: '2024-12-15'
        },
        {
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 60,
          roleOnProject: 'Code Reviewer',
          startDate: '2024-12-16',
          endDate: '2024-12-31'
        }
      ];

      for (const allocation of allocations) {
        await request(app)
          .post('/api/allocations')
          .send(allocation);
      }
    });

    it('should get employee utilization metrics', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-12-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Employee capacity metrics retrieved');
      expect(response.body.data).toHaveProperty('employeeId', testEmployeeId);
      expect(response.body.data).toHaveProperty('totalAllocatedHours', 140);
      expect(response.body.data).toHaveProperty('utilizationRate');
    });

    it('should get overall utilization summary', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          startDate: '2024-12-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utilization summary retrieved');
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('averageUtilization');
      expect(response.body.data).toHaveProperty('overutilizedCount');
      expect(response.body.data).toHaveProperty('underutilizedCount');
    });
  });
});