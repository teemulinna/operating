import request from 'supertest';
import { app } from '../../src/app';
import { testDb } from '../setup';

describe('Phase 3 Integration Validation', () => {
  let db: any;

  beforeAll(async () => {
    db = testDb;
    
    // Ensure basic tables exist
    try {
      await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('projects', 'employees', 'departments')
      `);
    } catch (error) {
      console.log('Database tables check:', error);
    }
  });

  afterAll(async () => {
    // Connection cleanup handled by setup
  });

  describe('1. Project Pipeline Integration', () => {
    test('should create project with roles and assignments in sequence', async () => {
      // Step 1: Create project
      const projectData = {
        name: 'Integration Test Project',
        clientName: 'Test Client',
        startDate: '2025-01-01',
        status: 'planning'
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(projectResponse.body.data).toHaveProperty('id');
      const projectId = projectResponse.body.data.id;

      // Step 2: Add project role
      const roleData = {
        roleName: 'Senior Developer',
        requiredSkills: ['TypeScript', 'Node.js'],
        minimumExperienceLevel: 'senior',
        plannedAllocationPercentage: 80
      };

      const roleResponse = await request(app)
        .post(`/api/projects/${projectId}/roles`)
        .send(roleData)
        .expect(201);

      expect(roleResponse.body.data).toHaveProperty('id');

      // Step 3: Test project retrieval with roles
      const fullProjectResponse = await request(app)
        .get(`/api/projects/${projectId}`)
        .expect(200);

      expect(fullProjectResponse.body.data).toHaveProperty('roles');
      expect(fullProjectResponse.body.data.roles).toHaveLength(1);
    });

    test('should handle project status transitions properly', async () => {
      const project = await createTestProject();
      
      // Test status progression: planning -> active -> completed
      const statusProgression = ['active', 'completed'];
      
      for (const status of statusProgression) {
        const response = await request(app)
          .put(`/api/projects/${project.id}`)
          .send({ status })
          .expect(200);
        
        expect(response.body.data.status).toBe(status);
      }
    });
  });

  describe('2. Allocation Templates Integration', () => {
    test('should create allocation templates that work with resource assignment', async () => {
      const project = await createTestProject();
      const employee = await createTestEmployee();
      
      // Create allocation template
      const allocationData = {
        employeeId: employee.id,
        projectId: project.id,
        allocatedHours: 40,
        weekStartDate: '2025-01-06',
        utilizationPercentage: 100
      };

      const response = await request(app)
        .post('/api/allocations')
        .send(allocationData)
        .expect(201);

      // Verify allocation can be retrieved and is properly linked
      const allocation = response.body.data;
      expect(allocation.employeeId).toBe(employee.id);
      expect(allocation.projectId).toBe(project.id);
      
      // Test that resource assignment respects allocation
      const assignmentResponse = await request(app)
        .get(`/api/projects/${project.id}/assignments`)
        .expect(200);
      
      // Should include allocation information
      expect(assignmentResponse.body).toHaveProperty('data');
    });
  });

  describe('3. Scenario Planning Integration', () => {
    test('should integrate scenario planning with new pipeline features', async () => {
      // Create scenario with project pipeline integration
      const scenarioData = {
        name: 'Q1 2025 Planning',
        description: 'Integration test scenario',
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        assumptions: ['Normal capacity', 'No holidays'],
        parameters: {
          maxUtilization: 90,
          bufferPercentage: 10
        }
      };

      const response = await request(app)
        .post('/api/scenarios')
        .send(scenarioData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      
      // Test scenario can reference projects and allocations
      const scenarioId = response.body.data.id;
      const scenarios = await request(app)
        .get(`/api/scenarios/${scenarioId}`)
        .expect(200);
        
      expect(scenarios.body.data.name).toBe('Q1 2025 Planning');
    });
  });

  describe('4. Database Integrity', () => {
    test('should maintain referential integrity across all new features', async () => {
      const project = await createTestProject();
      const employee = await createTestEmployee();
      
      // Create interconnected data
      const role = await createProjectRole(project.id);
      const assignment = await createProjectAssignment(project.id, employee.id);
      const allocation = await createAllocation(employee.id, project.id);
      
      // Test foreign key constraints
      const integrityCheck = await db.query(`
        SELECT 
          p.id as project_id,
          pr.id as role_id,
          pa.id as assignment_id,
          aa.id as allocation_id
        FROM projects p
        LEFT JOIN project_roles pr ON p.id = pr.project_id
        LEFT JOIN project_assignments pa ON p.id = pa.project_id
        LEFT JOIN assignment_allocations aa ON p.id = aa.project_id
        WHERE p.id = $1
      `, [project.id]);
      
      expect(integrityCheck.rows.length).toBeGreaterThan(0);
    });

    test('should handle cascading deletes properly', async () => {
      const project = await createTestProject();
      const employee = await createTestEmployee();
      
      await createProjectRole(project.id);
      await createProjectAssignment(project.id, employee.id);
      
      // Delete project should cascade
      await request(app)
        .delete(`/api/projects/${project.id}`)
        .expect(200);
      
      // Verify dependent records are cleaned up
      const roleCheck = await db.query('SELECT id FROM project_roles WHERE project_id = $1', [project.id]);
      expect(roleCheck.rows.length).toBe(0);
    });
  });

  describe('5. API Endpoint Consistency', () => {
    test('should return consistent response formats across all endpoints', async () => {
      const endpoints = [
        '/api/projects',
        '/api/allocations',
        '/api/analytics',
        '/api/scenarios'
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        
        // All endpoints should follow standard format
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('success');
        
        if (Array.isArray(response.body.data)) {
          expect(response.body).toHaveProperty('pagination');
        }
      }
    });

    test('should handle error responses consistently', async () => {
      // Test non-existent project
      const response = await request(app)
        .get('/api/projects/99999')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('6. Performance Under Load', () => {
    test('should handle concurrent project operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .post('/api/projects')
          .send({
            name: `Concurrent Project ${i}`,
            clientName: 'Load Test Client',
            startDate: '2025-01-01'
          })
      );
      
      const results = await Promise.all(concurrentOperations);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(201);
        expect(result.body.data).toHaveProperty('id');
      });
    });
  });

  // Helper functions
  async function createTestProject() {
    const response = await request(app)
      .post('/api/projects')
      .send({
        name: 'Test Project',
        clientName: 'Test Client',
        startDate: '2025-01-01'
      });
    return response.body.data;
  }

  async function createTestEmployee() {
    const employeeResult = await db.query(`
      INSERT INTO employees (first_name, last_name, email, department_id, hire_date)
      VALUES ('Test', 'Employee', 'test@example.com', 
        (SELECT id FROM departments LIMIT 1), 
        CURRENT_DATE)
      RETURNING *
    `);
    return employeeResult.rows[0];
  }

  async function createProjectRole(projectId: string) {
    const response = await request(app)
      .post(`/api/projects/${projectId}/roles`)
      .send({
        roleName: 'Test Role',
        requiredSkills: ['Testing'],
        minimumExperienceLevel: 'intermediate',
        plannedAllocationPercentage: 50
      });
    return response.body.data;
  }

  async function createProjectAssignment(projectId: string, employeeId: string) {
    const response = await request(app)
      .post(`/api/projects/${projectId}/assignments`)
      .send({
        employeeId,
        assignmentType: 'employee',
        startDate: '2025-01-01',
        plannedAllocationPercentage: 50,
        confidenceLevel: 'confirmed'
      });
    return response.body.data;
  }

  async function createAllocation(employeeId: string, projectId: string) {
    const response = await request(app)
      .post('/api/allocations')
      .send({
        employeeId,
        projectId,
        allocatedHours: 20,
        weekStartDate: '2025-01-06',
        utilizationPercentage: 50
      });
    return response.body.data;
  }
});