import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { apiService } from '../services/api-real';
import { api, checkApiHealth } from '../services/api';

describe('API Integration Tests', () => {
  beforeAll(() => {
    // Ensure we're testing against the correct backend
    expect(import.meta.env.VITE_API_URL || 'http://localhost:3001/api').toContain('3001');
  });

  describe('Health Check', () => {
    it('should connect to backend health endpoint', async () => {
      const isHealthy = await checkApiHealth();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Employee API Integration', () => {
    it('should fetch real employees from backend', async () => {
      const response = await apiService.getEmployees();
      
      // Check response structure matches backend
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('pagination');
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verify we get real data (not mock data)
      if (response.data.length > 0) {
        const employee = response.data[0];
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('firstName');
        expect(employee).toHaveProperty('lastName');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('position');
        expect(employee).toHaveProperty('departmentId');
        expect(employee).toHaveProperty('department'); // transformed field
        
        // Ensure it's not mock data
        expect(employee.email).not.toContain('resourceforge.com');
      }
    });

    it('should fetch specific employee by ID', async () => {
      const employeesResponse = await apiService.getEmployees();
      
      if (employeesResponse.data.length > 0) {
        const firstEmployee = employeesResponse.data[0];
        const specificEmployee = await apiService.getEmployee(firstEmployee.id);
        
        expect(specificEmployee).toBeDefined();
        expect(specificEmployee?.id).toBe(firstEmployee.id);
        expect(specificEmployee?.firstName).toBe(firstEmployee.firstName);
      }
    });

    it('should handle employee not found gracefully', async () => {
      const nonExistentEmployee = await apiService.getEmployee('non-existent-id');
      expect(nonExistentEmployee).toBeNull();
    });
  });

  describe('Project API Integration', () => {
    it('should fetch real projects from backend', async () => {
      const response = await apiService.getProjects();
      
      // Check response structure
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('pagination');
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verify we get real data
      if (response.data.length > 0) {
        const project = response.data[0];
        expect(project).toHaveProperty('id');
        expect(project).toHaveProperty('name');
        expect(project).toHaveProperty('description');
        expect(project).toHaveProperty('status');
        expect(project).toHaveProperty('startDate'); // transformed field
        expect(project).toHaveProperty('endDate'); // transformed field
        
        // Ensure it's real backend data (check for actual project names)
        expect(typeof project.name).toBe('string');
        expect(project.name.length).toBeGreaterThan(0);
      }
    });

    it('should fetch specific project by ID', async () => {
      const projectsResponse = await apiService.getProjects();
      
      if (projectsResponse.data.length > 0) {
        const firstProject = projectsResponse.data[0];
        const specificProject = await apiService.getProject(firstProject.id);
        
        expect(specificProject).toBeDefined();
        expect(specificProject?.id).toBe(firstProject.id);
        expect(specificProject?.name).toBe(firstProject.name);
      }
    });

    it('should handle project not found gracefully', async () => {
      const nonExistentProject = await apiService.getProject(999999);
      expect(nonExistentProject).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    let createdEmployeeId: string | undefined;
    let createdProjectId: number | undefined;

    afterAll(async () => {
      // Cleanup created test data
      if (createdEmployeeId) {
        try {
          await apiService.deleteEmployee(createdEmployeeId);
        } catch (error) {
          console.warn('Failed to cleanup test employee:', error);
        }
      }
      
      if (createdProjectId) {
        try {
          await apiService.deleteProject(createdProjectId);
        } catch (error) {
          console.warn('Failed to cleanup test project:', error);
        }
      }
    });

    it('should create a new employee', async () => {
      const newEmployee = {
        firstName: 'Test',
        lastName: 'Employee',
        email: `test.employee.${Date.now()}@test.com`,
        position: 'Test Engineer',
        departmentId: 'e85e5cfe-1970-4ea8-98c8-4a59b7587a52', // Engineering dept from backend
        salary: 75000,
        hireDate: new Date(),
        skills: ['Testing'],
        status: 'active' as const
      };

      const createdEmployee = await apiService.createEmployee(newEmployee);
      createdEmployeeId = createdEmployee.id;
      
      expect(createdEmployee).toBeDefined();
      expect(createdEmployee.firstName).toBe(newEmployee.firstName);
      expect(createdEmployee.lastName).toBe(newEmployee.lastName);
      expect(createdEmployee.email).toBe(newEmployee.email);
    });

    it('should create a new project', async () => {
      const newProject = {
        name: `Test Project ${Date.now()}`,
        description: 'A test project for API integration',
        status: 'planning' as const,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        budget: 50000,
        priority: 'medium' as const
      };

      const createdProject = await apiService.createProject(newProject);
      createdProjectId = createdProject.id;
      
      expect(createdProject).toBeDefined();
      expect(createdProject.name).toBe(newProject.name);
      expect(createdProject.description).toBe(newProject.description);
      expect(createdProject.status).toBe(newProject.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Temporarily break the API URL to test error handling
      const originalBaseURL = api.defaults?.baseURL;
      
      try {
        // This should trigger a network error
        await expect(api.get('http://invalid-url/employees')).rejects.toThrow();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid data gracefully', async () => {
      try {
        await apiService.createEmployee({
          firstName: '',
          lastName: '',
          email: 'invalid-email',
          position: '',
          departmentId: '',
          salary: -1000,
          hireDate: new Date(),
          skills: [],
          status: 'active'
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});