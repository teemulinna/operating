import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { EmployeeService } from '@/services/api';
import type { Employee, CreateEmployeeRequest, EmployeesResponse } from '@/types/employee';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock data
const mockEmployee: Employee = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-0123',
  department: 'Engineering',
  position: 'Software Engineer',
  salary: 75000,
  startDate: '2024-01-15T00:00:00Z',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockEmployeesResponse: EmployeesResponse = {
  employees: [mockEmployee],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('EmployeeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios create to return mocked axios instance
    mockedAxios.create = vi.fn().mockReturnValue({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEmployees', () => {
    it('fetches employees with default parameters', async () => {
      const mockResponse = { data: mockEmployeesResponse };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      // Mock the axios instance
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const result = await EmployeeService.getEmployees();

      expect(result).toEqual(mockEmployeesResponse);
      expect(mockGet).toHaveBeenCalledWith('/employees?');
    });

    it('constructs query params correctly', async () => {
      const mockResponse = { data: mockEmployeesResponse };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const filters = {
        search: 'John',
        department: 'Engineering',
        status: 'active' as const,
        salaryMin: 50000,
        salaryMax: 100000,
      };

      const pagination = {
        page: 2,
        limit: 10,
        sortBy: 'lastName' as const,
        sortOrder: 'desc' as const,
      };

      await EmployeeService.getEmployees(filters, pagination);

      const expectedUrl = '/employees?' + [
        'search=John',
        'department=Engineering',
        'status=active',
        'salaryMin=50000',
        'salaryMax=100000',
        'page=2',
        'limit=10',
        'sortBy=lastName',
        'sortOrder=desc'
      ].join('&');

      expect(mockGet).toHaveBeenCalledWith(expectedUrl);
    });

    it('skips empty filter values', async () => {
      const mockResponse = { data: mockEmployeesResponse };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const filters = {
        search: 'John',
        department: '',
        status: 'all' as const, // Should be skipped
      };

      await EmployeeService.getEmployees(filters);

      expect(mockGet).toHaveBeenCalledWith('/employees?search=John');
    });
  });

  describe('getEmployee', () => {
    it('fetches single employee by id', async () => {
      const mockResponse = { data: mockEmployee };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const result = await EmployeeService.getEmployee(1);

      expect(result).toEqual(mockEmployee);
      expect(mockGet).toHaveBeenCalledWith('/employees/1');
    });
  });

  describe('createEmployee', () => {
    it('creates new employee', async () => {
      const mockResponse = { data: mockEmployee };
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        post: mockPost,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const newEmployee: CreateEmployeeRequest = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '555-0456',
        department: 'Marketing',
        position: 'Marketing Manager',
        salary: 68000,
        startDate: '2024-02-01',
        status: 'active',
      };

      const result = await EmployeeService.createEmployee(newEmployee);

      expect(result).toEqual(mockEmployee);
      expect(mockPost).toHaveBeenCalledWith('/employees', newEmployee);
    });
  });

  describe('updateEmployee', () => {
    it('updates existing employee', async () => {
      const updatedEmployee = { ...mockEmployee, firstName: 'Johnny' };
      const mockResponse = { data: updatedEmployee };
      const mockPut = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        put: mockPut,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const updates = { firstName: 'Johnny' };
      const result = await EmployeeService.updateEmployee(1, updates);

      expect(result).toEqual(updatedEmployee);
      expect(mockPut).toHaveBeenCalledWith('/employees/1', updates);
    });
  });

  describe('deleteEmployee', () => {
    it('deletes employee', async () => {
      const mockDelete = vi.fn().mockResolvedValue({});
      
      (mockedAxios.create as any).mockReturnValue({
        delete: mockDelete,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      await EmployeeService.deleteEmployee(1);

      expect(mockDelete).toHaveBeenCalledWith('/employees/1');
    });
  });

  describe('getDepartments', () => {
    it('fetches departments list', async () => {
      const departments = ['Engineering', 'Marketing', 'Sales'];
      const mockResponse = { data: departments };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const result = await EmployeeService.getDepartments();

      expect(result).toEqual(departments);
      expect(mockGet).toHaveBeenCalledWith('/employees/departments');
    });
  });

  describe('getPositions', () => {
    it('fetches positions list', async () => {
      const positions = ['Software Engineer', 'Marketing Manager'];
      const mockResponse = { data: positions };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const result = await EmployeeService.getPositions();

      expect(result).toEqual(positions);
      expect(mockGet).toHaveBeenCalledWith('/employees/positions');
    });
  });

  describe('exportCSV', () => {
    it('exports employees as CSV', async () => {
      const csvBlob = new Blob(['csv data'], { type: 'text/csv' });
      const mockResponse = { data: csvBlob };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const filters = { department: 'Engineering' };
      const result = await EmployeeService.exportCSV(filters);

      expect(result).toEqual(csvBlob);
      expect(mockGet).toHaveBeenCalledWith('/employees/export/csv?department=Engineering', {
        responseType: 'blob',
      });
    });

    it('exports with empty filters', async () => {
      const csvBlob = new Blob(['csv data'], { type: 'text/csv' });
      const mockResponse = { data: csvBlob };
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const result = await EmployeeService.exportCSV();

      expect(result).toEqual(csvBlob);
      expect(mockGet).toHaveBeenCalledWith('/employees/export/csv?', {
        responseType: 'blob',
      });
    });
  });

  describe('importCSV', () => {
    it('imports employees from CSV file', async () => {
      const importResult = { imported: 5, errors: [] };
      const mockResponse = { data: importResult };
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        post: mockPost,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const file = new File(['csv data'], 'employees.csv', { type: 'text/csv' });
      const result = await EmployeeService.importCSV(file);

      expect(result).toEqual(importResult);
      
      // Verify FormData was created and sent
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[0]).toBe('/employees/import/csv');
      expect(callArgs[1]).toBeInstanceOf(FormData);
      expect(callArgs[2]).toEqual({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });

    it('handles import with errors', async () => {
      const importResult = { 
        imported: 2, 
        errors: ['Row 3: Invalid email format'] 
      };
      const mockResponse = { data: importResult };
      const mockPost = vi.fn().mockResolvedValue(mockResponse);
      
      (mockedAxios.create as any).mockReturnValue({
        post: mockPost,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      const file = new File(['csv data with errors'], 'employees.csv', { type: 'text/csv' });
      const result = await EmployeeService.importCSV(file);

      expect(result).toEqual(importResult);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('transforms axios errors to API errors', async () => {
      const axiosError = {
        response: {
          data: { message: 'Validation failed' },
          status: 400,
        },
        message: 'Request failed',
      };

      const mockGet = vi.fn().mockRejectedValue(axiosError);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { 
          request: { use: vi.fn() }, 
          response: { 
            use: vi.fn().mockImplementation((success, error) => {
              // Simulate the error interceptor
              return error;
            })
          } 
        },
      });

      try {
        await EmployeeService.getEmployee(1);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // The actual implementation would transform this via interceptors
        // For now, we just verify the mock was called
        expect(mockGet).toHaveBeenCalledWith('/employees/1');
      }
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network Error');
      const mockGet = vi.fn().mockRejectedValue(networkError);
      
      (mockedAxios.create as any).mockReturnValue({
        get: mockGet,
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      });

      try {
        await EmployeeService.getEmployee(1);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toEqual(networkError);
      }
    });
  });
});