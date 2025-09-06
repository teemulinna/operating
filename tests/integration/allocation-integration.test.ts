/**
 * Resource Allocation Integration Tests
 * Tests the full integration between frontend and backend allocation systems
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { initializeServices } from '../../src/container/service-registration';

describe('Resource Allocation Integration', () => {
  let databaseService: DatabaseService;
  let testEmployeeId: string;
  let testProjectId: string;
  let testAllocationId: string;

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
    // Create test data for each test
    const pool = databaseService.getPool();
    if (!pool) throw new Error('Database pool not available');

    // Create test employee
    const employeeResult = await pool.query(`
      INSERT INTO employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('Test Employee', 'test@example.com', 'Developer', 1, '2023-01-01', true)
      RETURNING id
    `);
    testEmployeeId = employeeResult.rows[0].id;

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, start_date, end_date, status, client_name, budget)
      VALUES ('Test Project', 'Integration test project', '2024-01-01', '2024-12-31', 'active', 'Test Client', 100000)
      RETURNING id
    `);
    testProjectId = projectResult.rows[0].id;
  });

  describe('Allocation API Endpoints', () => {
    it('should create a new allocation successfully', async () => {
      const allocationData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 40,
        roleOnProject: 'Lead Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        hourlyRate: 75,
        notes: 'Integration test allocation'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.employeeId).toBe(testEmployeeId);
      expect(response.body.data.projectId).toBe(testProjectId);
      expect(response.body.data.allocatedHours).toBe(40);
      expect(response.body.data.roleOnProject).toBe('Lead Developer');

      testAllocationId = response.body.data.id;
    });

    it('should get all allocations with pagination', async () => {
      // First create an allocation
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 30,
          roleOnProject: 'Developer',
          startDate: '2024-07-01',
          endDate: '2024-07-31'
        });

      const response = await request(app)
        .get('/api/allocations')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should get allocations filtered by employee', async () => {
      // Create allocation first
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 35,
          roleOnProject: 'Senior Developer',
          startDate: '2024-08-01',
          endDate: '2024-08-31'
        });

      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].employeeId).toBe(testEmployeeId);
    });

    it('should get allocations filtered by project', async () => {
      // Create allocation first
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 25,
          roleOnProject: 'Junior Developer',
          startDate: '2024-09-01',
          endDate: '2024-09-30'
        });

      const response = await request(app)
        .get(`/api/allocations/project/${testProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].projectId).toBe(testProjectId);
    });

    it('should detect allocation conflicts', async () => {
      // Create first allocation
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 40,
          roleOnProject: 'Developer',
          startDate: '2024-10-01',
          endDate: '2024-10-31'
        });

      // Check for conflicts with overlapping dates
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-10-15',
          endDate: '2024-11-15'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hasConflicts');
      expect(response.body.data).toHaveProperty('conflicts');
      expect(response.body.data).toHaveProperty('suggestions');
    });

    it('should get utilization metrics', async () => {
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeId');
      expect(response.body.data).toHaveProperty('totalAllocatedHours');
      expect(response.body.data).toHaveProperty('utilizationRate');
    });

    it('should update an allocation', async () => {
      // Create allocation first
      const createResponse = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 30,
          roleOnProject: 'Developer',
          startDate: '2024-11-01',
          endDate: '2024-11-30'
        });

      const allocationId = createResponse.body.data.id;

      const updateResponse = await request(app)
        .put(`/api/allocations/${allocationId}`)
        .send({
          allocatedHours: 35,
          roleOnProject: 'Senior Developer',
          notes: 'Updated allocation'
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.allocatedHours).toBe(35);
      expect(updateResponse.body.data.roleOnProject).toBe('Senior Developer');
      expect(updateResponse.body.data.notes).toBe('Updated allocation');
    });

    it('should validate capacity before allocation', async () => {
      const response = await request(app)
        .post('/api/allocations/validate-capacity')
        .send({
          employeeId: testEmployeeId.toString(),
          allocatedHours: 60, // Over-allocation
          startDate: '2024-12-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('warnings');
      expect(response.body.data).toHaveProperty('utilizationRate');
    });
  });

  describe('Cross-System Integration', () => {
    it('should verify allocation uses real employee data', async () => {
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 30,
          roleOnProject: 'QA Engineer',
          startDate: '2025-01-01',
          endDate: '2025-01-31'
        })
        .expect(201);

      // Verify the allocation was created with real employee data
      expect(response.body.data.employeeId).toBe(testEmployeeId);
      
      // Get allocation with details to verify employee relationship
      const detailResponse = await request(app)
        .get(`/api/allocations/${response.body.data.id}?includeDetails=true`)
        .expect(200);

      expect(detailResponse.body.data).toHaveProperty('employeeDetails');
      expect(detailResponse.body.data.employeeDetails.name).toBe('Test Employee');
    });

    it('should verify allocation uses real project data', async () => {
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 20,
          roleOnProject: 'DevOps Engineer',
          startDate: '2025-02-01',
          endDate: '2025-02-28'
        })
        .expect(201);

      // Verify the allocation was created with real project data
      expect(response.body.data.projectId).toBe(testProjectId);
      
      // Get allocation with details to verify project relationship
      const detailResponse = await request(app)
        .get(`/api/allocations/${response.body.data.id}?includeDetails=true`)
        .expect(200);

      expect(detailResponse.body.data).toHaveProperty('projectDetails');
      expect(detailResponse.body.data.projectDetails.name).toBe('Test Project');
    });

    it('should enforce business rules across systems', async () => {
      // Try to create allocation with dates outside project timeline
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 30,
          roleOnProject: 'Architect',
          startDate: '2025-01-01', // After project end date
          endDate: '2025-01-31'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('outside project timeline');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain referential integrity', async () => {
      // Create allocation
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 25,
          roleOnProject: 'Technical Writer',
          startDate: '2025-03-01',
          endDate: '2025-03-31'
        })
        .expect(201);

      const allocationId = response.body.data.id;

      // Verify database consistency
      const pool = databaseService.getPool();
      if (!pool) throw new Error('Database pool not available');

      const dbResult = await pool.query(`
        SELECT a.*, e.name as employee_name, p.name as project_name
        FROM allocations a
        JOIN employees e ON a.employee_id = e.id
        JOIN projects p ON a.project_id = p.id
        WHERE a.id = $1
      `, [allocationId]);

      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].employee_id).toBe(testEmployeeId);
      expect(dbResult.rows[0].project_id).toBe(testProjectId);
      expect(dbResult.rows[0].employee_name).toBe('Test Employee');
      expect(dbResult.rows[0].project_name).toBe('Test Project');
    });

    it('should calculate utilization accurately', async () => {
      // Create multiple allocations
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 20,
          roleOnProject: 'Developer',
          startDate: '2025-04-01',
          endDate: '2025-04-30'
        });

      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 15,
          roleOnProject: 'Tester',
          startDate: '2025-04-15',
          endDate: '2025-04-30'
        });

      // Get utilization metrics
      const response = await request(app)
        .get('/api/allocations/utilization')
        .query({
          employeeId: testEmployeeId,
          startDate: '2025-04-01',
          endDate: '2025-04-30'
        })
        .expect(200);

      expect(response.body.data.totalAllocatedHours).toBe(35);
      expect(response.body.data.utilizationRate).toBeCloseTo(0.875); // 35/40 = 87.5%
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid employee ID', async () => {
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: 'invalid-id',
          projectId: testProjectId.toString(),
          allocatedHours: 30,
          roleOnProject: 'Developer',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Employee not found');
    });

    it('should handle invalid project ID', async () => {
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: 'invalid-id',
          allocatedHours: 30,
          roleOnProject: 'Developer',
          startDate: '2025-05-01',
          endDate: '2025-05-31'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Project not found');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: -10, // Invalid negative hours
          roleOnProject: '',  // Empty role
          startDate: '2025-06-01',
          endDate: '2025-05-31' // End before start
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });
});