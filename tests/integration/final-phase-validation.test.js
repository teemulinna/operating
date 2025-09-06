/**
 * Final Phase 1C-2 Validation Test Suite
 * Confirms all functionalities are working with real database
 */

const axios = require('axios');
const API_BASE = 'http://localhost:3001/api';

describe('Final Phase 1C-2 Validation', () => {
  let testProjectId;
  let testRoleId;

  test('Backend server is healthy', async () => {
    const response = await axios.get('http://localhost:3001/health');
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
  });

  describe('Phase 1B - Project CRUD Operations', () => {
    test('CREATE project with real database persistence', async () => {
      const projectData = {
        name: 'Phase Validation Test Project',
        description: 'Verifying real database operations',
        clientName: 'Validation Client',
        startDate: '2025-01-10',
        endDate: '2025-06-30',
        status: 'active',
        priority: 'high',
        budget: 100000,
        estimatedHours: 1200
      };

      const response = await axios.post(`${API_BASE}/projects`, projectData);
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe(projectData.name);
      expect(response.data.data.id).toBeDefined();
      testProjectId = response.data.data.id;
    });

    test('READ project from database', async () => {
      const response = await axios.get(`${API_BASE}/projects/${testProjectId}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.name).toBe('Phase Validation Test Project');
    });

    test('UPDATE project in database', async () => {
      const updates = {
        description: 'Updated validation description',
        priority: 'critical'
      };
      
      const response = await axios.put(`${API_BASE}/projects/${testProjectId}`, updates);
      expect(response.status).toBe(200);
      expect(response.data.data.description).toBe(updates.description);
      expect(response.data.data.priority).toBe(updates.priority);
    });

    test('LIST all projects with pagination', async () => {
      const response = await axios.get(`${API_BASE}/projects?page=1&limit=10`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.pagination).toBeDefined();
    });
  });

  describe('Phase 1C - Project Role Management', () => {
    test('CREATE project role', async () => {
      const roleData = {
        roleName: 'Senior Developer',
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        minExperience: 5,
        estimatedHours: 160,
        hourlyRate: 150
      };

      const response = await axios.post(`${API_BASE}/projects/${testProjectId}/roles`, roleData);
      expect(response.status).toBe(201);
      expect(response.data.data.role_name).toBe(roleData.roleName);
      testRoleId = response.data.data.id;
    });

    test('GET project roles', async () => {
      const response = await axios.get(`${API_BASE}/projects/${testProjectId}/roles`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 2 - Resource Planning', () => {
    test('GET capacity analysis', async () => {
      const response = await axios.get(`${API_BASE}/resource-planning/capacity`);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test('POST optimization request', async () => {
      const optimizationRequest = {
        projectId: testProjectId,
        startDate: '2025-02-01',
        endDate: '2025-03-31',
        requiredSkills: ['JavaScript', 'React']
      };

      const response = await axios.post(`${API_BASE}/resource-planning/optimize`, optimizationRequest);
      expect(response.status).toBe(200);
      expect(response.data.recommendations).toBeDefined();
    });

    test('GET conflict detection', async () => {
      const response = await axios.get(`${API_BASE}/resource-planning/conflicts`);
      expect(response.status).toBe(200);
      expect(response.data.conflicts).toBeDefined();
    });
  });

  describe('Data Persistence Verification', () => {
    test('Project persists after re-fetch', async () => {
      // Wait a moment to ensure database write
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await axios.get(`${API_BASE}/projects/${testProjectId}`);
      expect(response.status).toBe(200);
      expect(response.data.data.description).toBe('Updated validation description');
      expect(response.data.data.priority).toBe('critical');
    });

    test('DELETE project from database', async () => {
      const response = await axios.delete(`${API_BASE}/projects/${testProjectId}`);
      expect(response.status).toBe(200);
      
      // Verify deletion
      try {
        await axios.get(`${API_BASE}/projects/${testProjectId}`);
        fail('Should have thrown 404');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  describe('No Mock Data Verification', () => {
    test('All responses contain real database timestamps', async () => {
      const response = await axios.get(`${API_BASE}/projects`);
      const projects = response.data.data;
      
      projects.forEach(project => {
        expect(project.created_at).toBeDefined();
        expect(new Date(project.created_at).getTime()).toBeGreaterThan(0);
        expect(project.updated_at).toBeDefined();
      });
    });

    test('Database connection is active', async () => {
      // Create and immediately read to verify real DB
      const tempProject = {
        name: `DB Test ${Date.now()}`,
        description: 'Testing database connection',
        clientName: 'DB Test Client',
        startDate: '2025-02-01',
        status: 'planning'
      };
      
      const createResponse = await axios.post(`${API_BASE}/projects`, tempProject);
      const createdId = createResponse.data.data.id;
      
      const readResponse = await axios.get(`${API_BASE}/projects/${createdId}`);
      expect(readResponse.data.data.name).toBe(tempProject.name);
      
      // Cleanup
      await axios.delete(`${API_BASE}/projects/${createdId}`);
    });
  });
});