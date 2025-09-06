/**
 * Project Management API Integration Tests
 * Tests all project-related endpoints with comprehensive business logic validation
 * Following TDD methodology - these tests define the expected behavior
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { initializeServices } from '../../src/container/service-registration';
import { ProjectStatus } from '../../src/types';

describe('Project Management API Integration Tests', () => {
  let databaseService: DatabaseService;
  let testProjectId: string;
  let testEmployeeId: string;

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

    // Use test-specific table names to avoid conflicts with existing tables
    await pool.query('DROP TABLE IF EXISTS test_allocations CASCADE');
    await pool.query('DROP TABLE IF EXISTS test_projects CASCADE');
    await pool.query('DROP TABLE IF EXISTS test_employees CASCADE');
    await pool.query('DROP TABLE IF EXISTS test_departments CASCADE');

    await pool.query(`
      CREATE TABLE test_departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE test_employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        position VARCHAR(255),
        department_id INTEGER REFERENCES test_departments(id),
        hire_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE test_projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        client_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        budget DECIMAL(12,2),
        hourly_rate DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        CONSTRAINT chk_status CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
        CONSTRAINT chk_dates CHECK (end_date >= start_date),
        CONSTRAINT chk_budget CHECK (budget >= 0),
        CONSTRAINT chk_hourly_rate CHECK (hourly_rate >= 0)
      )
    `);

    await pool.query(`
      CREATE TABLE allocations (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES test_projects(id),
        employee_id INTEGER REFERENCES test_employees(id),
        allocated_hours DECIMAL(8,2) NOT NULL,
        hourly_rate DECIMAL(8,2),
        role_on_project VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        actual_hours DECIMAL(8,2),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_allocated_hours CHECK (allocated_hours > 0),
        CONSTRAINT chk_hourly_rate_positive CHECK (hourly_rate >= 0),
        CONSTRAINT chk_allocation_dates CHECK (end_date >= start_date)
      )
    `);

    // Tables are fresh, no need to delete data

    // Create test department
    const deptResult = await pool.query(`
      INSERT INTO test_departments (name, description, is_active)
      VALUES ('Test Department', 'Test department for integration tests', true)
      RETURNING id
    `);

    // Create test employee
    const employeeResult = await pool.query(`
      INSERT INTO test_employees (name, email, position, department_id, hire_date, is_active)
      VALUES ('Test Employee', 'test@example.com', 'Developer', $1, '2023-01-01', true)
      RETURNING id
    `, [deptResult.rows[0].id]);
    testEmployeeId = employeeResult.rows[0].id;
  });

  describe('POST /api/projects - Create Project', () => {
    it('should create a valid project successfully', async () => {
      const projectData = {
        name: 'New Test Project',
        description: 'A comprehensive test project',
        clientName: 'Test Client Corp',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 75000,
        hourlyRate: 125,
        createdBy: 1
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project created successfully');
      expect(response.body.data).toMatchObject({
        name: projectData.name,
        description: projectData.description,
        clientName: projectData.clientName,
        status: ProjectStatus.PLANNING,
        budget: 75000,
        hourlyRate: 125
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
      
      testProjectId = response.body.data.id;
    });

    it('should reject project with invalid date range', async () => {
      const invalidProjectData = {
        name: 'Invalid Date Project',
        description: 'Project with end date before start date',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: '2024-12-31',
        endDate: '2024-06-01', // End before start
        budget: 50000,
        hourlyRate: 100
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidProjectData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('End date must be after start date');
    });

    it('should reject project with negative budget', async () => {
      const invalidProjectData = {
        name: 'Negative Budget Project',
        description: 'Project with negative budget',
        clientName: 'Test Client',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: -10000, // Invalid negative budget
        hourlyRate: 100
      };

      const response = await request(app)
        .post('/api/projects')
        .send(invalidProjectData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Budget must be positive');
    });

    it('should reject project with duplicate name', async () => {
      const projectData = {
        name: 'Duplicate Project',
        description: 'First project',
        clientName: 'Client A',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 30000,
        hourlyRate: 90
      };

      // Create first project
      await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const incompleteProjectData = {
        description: 'Project without required name',
        clientName: 'Test Client'
        // Missing name, startDate, endDate
      };

      const response = await request(app)
        .post('/api/projects')
        .send(incompleteProjectData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/projects - List Projects', () => {
    beforeEach(async () => {
      // Create multiple test projects
      const projects = [
        {
          name: 'Alpha Project',
          description: 'First project',
          clientName: 'Client A',
          status: ProjectStatus.PLANNING,
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          budget: 40000,
          hourlyRate: 80
        },
        {
          name: 'Beta Project',
          description: 'Second project',
          clientName: 'Client B',
          status: ProjectStatus.ACTIVE,
          startDate: '2024-02-01',
          endDate: '2024-08-31',
          budget: 60000,
          hourlyRate: 120
        },
        {
          name: 'Gamma Project',
          description: 'Third project',
          clientName: 'Client A',
          status: ProjectStatus.COMPLETED,
          startDate: '2024-03-01',
          endDate: '2024-09-30',
          budget: 35000,
          hourlyRate: 95
        }
      ];

      for (const project of projects) {
        await request(app)
          .post('/api/projects')
          .send(project);
      }
    });

    it('should get all projects with pagination', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1
      });
    });

    it('should filter projects by status', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ status: ProjectStatus.ACTIVE })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(ProjectStatus.ACTIVE);
      expect(response.body.data[0].name).toBe('Beta Project');
    });

    it('should filter projects by client name', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ clientName: 'Client A' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((p: any) => p.clientName === 'Client A')).toBeTruthy();
    });

    it('should support sorting by name ascending', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ sortBy: 'name', sortOrder: 'ASC' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].name).toBe('Alpha Project');
      expect(response.body.data[1].name).toBe('Beta Project');
      expect(response.body.data[2].name).toBe('Gamma Project');
    });

    it('should support pagination correctly', async () => {
      const page1 = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.pagination.totalPages).toBe(2);

      const page2 = await request(app)
        .get('/api/projects')
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(page2.body.data).toHaveLength(1);
      expect(page2.body.pagination.page).toBe(2);
    });
  });

  describe('GET /api/projects/:id - Get Project by ID', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Single Project Test',
        description: 'Test project for single retrieval',
        clientName: 'Single Client',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 45000,
        hourlyRate: 100
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      testProjectId = response.body.data.id;
    });

    it('should get project by valid ID', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: testProjectId,
        name: 'Single Project Test',
        description: 'Test project for single retrieval',
        clientName: 'Single Client',
        status: ProjectStatus.PLANNING,
        budget: 45000,
        hourlyRate: 100
      });
    });

    it('should return 404 for non-existent project ID', async () => {
      const response = await request(app)
        .get('/api/projects/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return 400 for invalid project ID format', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('PUT /api/projects/:id - Update Project', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Update Test Project',
        description: 'Project for update testing',
        clientName: 'Update Client',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 50000,
        hourlyRate: 110
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      testProjectId = response.body.data.id;
    });

    it('should update project successfully', async () => {
      const updateData = {
        name: 'Updated Project Name',
        description: 'Updated description',
        status: ProjectStatus.ACTIVE,
        budget: 60000,
        hourlyRate: 130
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project updated successfully');
      expect(response.body.data).toMatchObject({
        id: testProjectId,
        name: 'Updated Project Name',
        description: 'Updated description',
        status: ProjectStatus.ACTIVE,
        budget: 60000,
        hourlyRate: 130
      });
    });

    it('should validate status transitions', async () => {
      // First set to active
      await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send({ status: ProjectStatus.ACTIVE })
        .expect(200);

      // Then complete
      await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send({ status: ProjectStatus.COMPLETED })
        .expect(200);

      // Try to revert from completed (should fail)
      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send({ status: ProjectStatus.ACTIVE })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot change status from completed');
    });

    it('should return 404 for non-existent project', async () => {
      const updateData = {
        name: 'Non-existent Project Update'
      };

      const response = await request(app)
        .put('/api/projects/999999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });

    it('should validate date range on update', async () => {
      const invalidUpdateData = {
        startDate: '2024-12-31',
        endDate: '2024-06-01' // End before start
      };

      const response = await request(app)
        .put(`/api/projects/${testProjectId}`)
        .send(invalidUpdateData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('End date must be after start date');
    });
  });

  describe('DELETE /api/projects/:id - Delete Project', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Delete Test Project',
        description: 'Project for deletion testing',
        clientName: 'Delete Client',
        status: ProjectStatus.PLANNING,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 35000,
        hourlyRate: 85
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      testProjectId = response.body.data.id;
    });

    it('should delete project successfully', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(response.body.data.id).toBe(testProjectId);

      // Verify project is deleted
      await request(app)
        .get(`/api/projects/${testProjectId}`)
        .expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('GET /api/projects/stats - Project Statistics', () => {
    beforeEach(async () => {
      // Create projects for statistics
      const projects = [
        {
          name: 'Stats Project 1',
          clientName: 'Client X',
          status: ProjectStatus.PLANNING,
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          budget: 20000,
          hourlyRate: 80
        },
        {
          name: 'Stats Project 2',
          clientName: 'Client Y',
          status: ProjectStatus.ACTIVE,
          startDate: '2024-02-01',
          endDate: '2024-08-31',
          budget: 40000,
          hourlyRate: 100
        },
        {
          name: 'Stats Project 3',
          clientName: 'Client Z',
          status: ProjectStatus.COMPLETED,
          startDate: '2024-03-01',
          endDate: '2024-09-30',
          budget: 30000,
          hourlyRate: 90
        }
      ];

      for (const project of projects) {
        await request(app)
          .post('/api/projects')
          .send(project);
      }
    });

    it('should return project statistics', async () => {
      const response = await request(app)
        .get('/api/projects/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalProjects: 3,
        projectsByStatus: {
          planning: 1,
          active: 1,
          completed: 1
        },
        totalBudget: 90000,
        averageBudget: 30000,
        averageHourlyRate: 90 // (80 + 100 + 90) / 3
      });
    });
  });

  describe('POST /api/projects/:id/assignments - Assign Employee', () => {
    beforeEach(async () => {
      const projectData = {
        name: 'Assignment Test Project',
        description: 'Project for assignment testing',
        clientName: 'Assignment Client',
        status: ProjectStatus.ACTIVE,
        startDate: '2024-06-01',
        endDate: '2024-12-31',
        budget: 80000,
        hourlyRate: 120
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      testProjectId = response.body.data.id;
    });

    it('should create assignment successfully', async () => {
      const assignmentData = {
        employeeId: testEmployeeId.toString(),
        allocatedHours: 160, // Full-time for a month
        roleOnProject: 'Senior Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        hourlyRate: 120,
        notes: 'Lead development role'
      };

      const response = await request(app)
        .post('/api/allocations')
        .send({
          ...assignmentData,
          projectId: testProjectId.toString()
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Allocation created successfully');
      expect(response.body.data).toMatchObject({
        employeeId: testEmployeeId,
        projectId: testProjectId,
        allocatedHours: 160,
        roleOnProject: 'Senior Developer'
      });
    });

    it('should validate capacity constraints', async () => {
      const assignmentData = {
        employeeId: testEmployeeId.toString(),
        projectId: testProjectId.toString(),
        allocatedHours: 200, // Over-allocation
        roleOnProject: 'Developer',
        startDate: '2024-06-01',
        endDate: '2024-06-30'
      };

      // Check capacity validation
      const validationResponse = await request(app)
        .post('/api/allocations/validate-capacity')
        .send({
          employeeId: testEmployeeId.toString(),
          allocatedHours: 200,
          startDate: '2024-06-01',
          endDate: '2024-06-30'
        })
        .expect(200);

      expect(validationResponse.body.data.warnings).toContain(
        expect.stringMatching(/Over-allocation detected/)
      );
    });

    it('should detect scheduling conflicts', async () => {
      // Create first allocation
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: testProjectId.toString(),
          allocatedHours: 40,
          roleOnProject: 'Developer',
          startDate: '2024-06-01',
          endDate: '2024-06-15'
        })
        .expect(201);

      // Check for conflicts with overlapping dates
      const conflictResponse = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-06-10',
          endDate: '2024-06-20'
        })
        .expect(200);

      expect(conflictResponse.body.data.hasConflicts).toBe(true);
      expect(conflictResponse.body.data.conflicts).toHaveLength(1);
      expect(conflictResponse.body.data.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/employees/:id/assignments - Employee Multi-Project View', () => {
    beforeEach(async () => {
      // Create multiple projects
      const project1Response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Employee Project 1',
          clientName: 'Client A',
          status: ProjectStatus.ACTIVE,
          startDate: '2024-06-01',
          endDate: '2024-08-31',
          budget: 50000,
          hourlyRate: 100
        });

      const project2Response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Employee Project 2',
          clientName: 'Client B',
          status: ProjectStatus.PLANNING,
          startDate: '2024-07-01',
          endDate: '2024-10-31',
          budget: 40000,
          hourlyRate: 90
        });

      // Create allocations for the employee
      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: project1Response.body.data.id.toString(),
          allocatedHours: 80,
          roleOnProject: 'Backend Developer',
          startDate: '2024-06-01',
          endDate: '2024-06-30'
        });

      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: project2Response.body.data.id.toString(),
          allocatedHours: 60,
          roleOnProject: 'Full Stack Developer',
          startDate: '2024-07-15',
          endDate: '2024-07-31'
        });
    });

    it('should get all assignments for an employee', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((allocation: any) => 
        allocation.employeeId === testEmployeeId
      )).toBeTruthy();
    });

    it('should filter assignments by date range', async () => {
      const response = await request(app)
        .get(`/api/allocations/employee/${testEmployeeId}`)
        .query({
          startDateFrom: '2024-06-01',
          startDateTo: '2024-06-30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].roleOnProject).toBe('Backend Developer');
    });
  });

  describe('GET /api/assignments/conflicts - Real-time Conflict Detection', () => {
    it('should provide comprehensive conflict analysis', async () => {
      // Create base project and allocation
      const projectResponse = await request(app)
        .post('/api/projects')
        .send({
          name: 'Conflict Test Project',
          clientName: 'Conflict Client',
          status: ProjectStatus.ACTIVE,
          startDate: '2024-06-01',
          endDate: '2024-12-31',
          budget: 60000,
          hourlyRate: 110
        });

      await request(app)
        .post('/api/allocations')
        .send({
          employeeId: testEmployeeId.toString(),
          projectId: projectResponse.body.data.id.toString(),
          allocatedHours: 40,
          roleOnProject: 'Developer',
          startDate: '2024-06-01',
          endDate: '2024-06-15'
        });

      // Test conflict detection
      const response = await request(app)
        .get('/api/allocations/conflicts')
        .query({
          employeeId: testEmployeeId,
          startDate: '2024-06-10',
          endDate: '2024-06-20'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('hasConflicts', true);
      expect(response.body.data).toHaveProperty('conflicts');
      expect(response.body.data).toHaveProperty('suggestions');
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
    });
  });
});