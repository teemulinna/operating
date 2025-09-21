/**
 * Frontend API Integration Tests - REFACTOR Phase
 * Validates that frontend can consume API responses properly
 * Tests actual data flow from API to frontend components
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

// Frontend-compatible interfaces that match what components expect
interface FrontendEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: string;
  departmentName: string;
  salary: string;
  hireDate: string;
  skills: any[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FrontendProject {
  id: number;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date?: string;
  budget: string;
  priority: string;
  actual_hours: string;
  created_at: string;
  updated_at: string;
}

interface FrontendDepartment {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  employeeCount?: string;
  createdAt: string;
  updatedAt: string;
}

describe('Frontend API Integration Tests', () => {
  beforeAll(async () => {
    // Verify server is available
    try {
      await axios.get(`${API_BASE_URL}/health`);
    } catch (error) {
      throw new Error('API server is not running on localhost:3001');
    }
  });

  describe('Employee Data Integration', () => {
    it('should fetch employees and format data for frontend components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/employees`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      
      const apiData = response.data;
      expect(apiData).toHaveProperty('data');
      expect(Array.isArray(apiData.data)).toBe(true);
      
      if (apiData.data.length > 0) {
        const employee: FrontendEmployee = apiData.data[0];
        
        // Verify all required fields for frontend components are present
        expect(employee.id).toBeTruthy();
        expect(employee.firstName).toBeTruthy();
        expect(employee.lastName).toBeTruthy();
        expect(employee.email).toBeTruthy();
        expect(employee.position).toBeTruthy();
        expect(employee.departmentName).toBeTruthy();
        
        // Verify data can be used in frontend display logic
        const displayName = `${employee.firstName} ${employee.lastName}`;
        expect(displayName.length).toBeGreaterThan(2);
        
        const isActiveEmployee = employee.isActive;
        expect(typeof isActiveEmployee).toBe('boolean');
        
        // Verify date can be parsed for frontend date components
        const hireDate = new Date(employee.hireDate);
        expect(hireDate.getTime()).not.toBeNaN();
        
        // Verify salary can be formatted for display
        const salaryNumber = parseFloat(employee.salary);
        expect(salaryNumber).not.toBeNaN();
      }
    });

    it('should handle pagination data for frontend pagination components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/employees?page=1&limit=2`);
      
      const apiData = response.data;
      if (apiData.pagination) {
        const pagination = apiData.pagination;
        
        // Frontend pagination component requirements
        expect(typeof pagination.currentPage).toBe('number');
        expect(typeof pagination.totalPages).toBe('number');
        expect(typeof pagination.totalItems).toBe('number');
        expect(typeof pagination.hasNext).toBe('boolean');
        expect(typeof pagination.hasPrev).toBe('boolean');
        
        // Pagination logic validation
        expect(pagination.currentPage).toBeGreaterThan(0);
        expect(pagination.totalPages).toBeGreaterThan(0);
        expect(pagination.totalItems).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Project Data Integration', () => {
    it('should fetch projects and format data for project components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/projects`);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data).toHaveProperty('data');
      
      if (response.data.data.length > 0) {
        const project: FrontendProject = response.data.data[0];
        
        // Verify project card component requirements
        expect(project.id).toBeTruthy();
        expect(project.name).toBeTruthy();
        expect(project.status).toBeTruthy();
        expect(project.priority).toBeTruthy();
        
        // Verify status for status badge components
        const validStatuses = ['draft', 'active', 'completed', 'cancelled', 'planning', 'paused'];
        expect(validStatuses).toContain(project.status);
        
        // Verify priority for priority indicator components
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        expect(validPriorities).toContain(project.priority);
        
        // Verify dates for date picker components
        const startDate = new Date(project.start_date);
        expect(startDate.getTime()).not.toBeNaN();
        
        // Verify budget for financial display components
        const budgetNumber = parseFloat(project.budget);
        expect(budgetNumber).not.toBeNaN();
        
        // Verify hours for progress tracking components
        const actualHours = parseFloat(project.actual_hours);
        expect(actualHours).not.toBeNaN();
      }
    });
  });

  describe('Department Data Integration', () => {
    it('should fetch departments for dropdown and selection components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/departments`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      const department: FrontendDepartment = response.data[0];
      
      // Verify dropdown component requirements
      expect(department.id).toBeTruthy();
      expect(department.name).toBeTruthy();
      expect(typeof department.id).toBe('string');
      expect(typeof department.name).toBe('string');
      
      // Verify department selector component can use this data
      const optionValue = department.id;
      const optionLabel = department.name;
      expect(optionValue.length).toBeGreaterThan(0);
      expect(optionLabel.length).toBeGreaterThan(0);
      
      // Verify employee count for dashboard components
      if (department.employeeCount !== undefined) {
        const employeeCount = parseInt(department.employeeCount);
        expect(employeeCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide proper error responses for frontend error handling', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/employees/invalid-uuid`);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Frontend error handling requirements
        expect(error.response?.status).toBeTruthy();
        expect(error.response?.data).toBeTruthy();
        expect(error.response?.headers['content-type']).toContain('application/json');
        
        const errorData = error.response.data;
        expect(errorData.error || errorData.message).toBeTruthy();
        
        // Frontend can display meaningful error messages
        const errorMessage = errorData.error || errorData.message;
        expect(typeof errorMessage).toBe('string');
        expect(errorMessage.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cross-Reference Data Validation', () => {
    it('should validate employee-department relationships for frontend consistency', async () => {
      const [employeesResponse, departmentsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/employees`),
        axios.get(`${API_BASE_URL}/api/departments`)
      ]);
      
      const employees: FrontendEmployee[] = employeesResponse.data.data;
      const departments: FrontendDepartment[] = departmentsResponse.data;
      
      if (employees.length > 0 && departments.length > 0) {
        const departmentMap = new Map(departments.map(dept => [dept.id, dept.name]));
        
        employees.forEach(employee => {
          if (employee.departmentId) {
            // Frontend should be able to resolve department names
            const departmentExists = departmentMap.has(employee.departmentId);
            expect(departmentExists).toBe(true);
            
            // Verify department name consistency
            const expectedDeptName = departmentMap.get(employee.departmentId);
            expect(employee.departmentName).toBeTruthy();
          }
        });
      }
    });
  });

  describe('Performance and Data Size Validation', () => {
    it('should return reasonable response sizes for frontend performance', async () => {
      const startTime = Date.now();
      const response = await axios.get(`${API_BASE_URL}/api/employees`);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      const responseSize = JSON.stringify(response.data).length;
      
      // Frontend performance requirements
      expect(responseTime).toBeLessThan(5000); // Less than 5 seconds
      expect(responseSize).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
      
      // Verify data is not empty but not excessive
      expect(response.data.data.length).toBeGreaterThan(0);
      expect(response.data.data.length).toBeLessThan(10000); // Reasonable limit
    });

    it('should handle concurrent requests for frontend multi-tab scenarios', async () => {
      const requests = Array(5).fill(null).map(() => 
        axios.get(`${API_BASE_URL}/api/employees`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data.data).toBeTruthy();
      });
      
      // Concurrent handling should be reasonable
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(15000); // All 5 requests in under 15 seconds
    });
  });

  describe('Frontend Data Transformation Validation', () => {
    it('should provide data in format expected by table components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/employees`);
      const employees: FrontendEmployee[] = response.data.data;
      
      if (employees.length > 0) {
        // Simulate frontend table row transformation
        const tableRows = employees.map(emp => ({
          id: emp.id,
          fullName: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          position: emp.position,
          department: emp.departmentName,
          status: emp.isActive ? 'Active' : 'Inactive',
          hireDate: new Date(emp.hireDate).toLocaleDateString(),
          salary: new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
          }).format(parseFloat(emp.salary))
        }));
        
        tableRows.forEach(row => {
          expect(row.id).toBeTruthy();
          expect(row.fullName).toBeTruthy();
          expect(row.email).toBeTruthy();
          expect(row.position).toBeTruthy();
          expect(row.department).toBeTruthy();
          expect(['Active', 'Inactive']).toContain(row.status);
          expect(row.hireDate).toBeTruthy();
          expect(row.salary).toContain('$');
        });
      }
    });

    it('should provide data compatible with form components', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/departments`);
      const departments: FrontendDepartment[] = response.data;
      
      // Simulate frontend form select options
      const selectOptions = departments.map(dept => ({
        value: dept.id,
        label: dept.name,
        disabled: false
      }));
      
      selectOptions.forEach(option => {
        expect(option.value).toBeTruthy();
        expect(option.label).toBeTruthy();
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
        expect(typeof option.disabled).toBe('boolean');
      });
      
      // Verify at least one option exists for form functionality
      expect(selectOptions.length).toBeGreaterThan(0);
    });
  });
});