import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useEmployees, 
  useEmployee, 
  useDepartments, 
  usePositions,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useEmployeeCSV
} from '@/hooks/useEmployees';
import { EmployeeService } from '@/services/api';
import type { Employee, EmployeesResponse, CreateEmployeeRequest } from '@/types/employee';

// Mock the API service
vi.mock('@/services/api');
const mockEmployeeService = vi.mocked(EmployeeService);

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

const mockDepartments = ['Engineering', 'Marketing', 'Sales'];
const mockPositions = ['Software Engineer', 'Marketing Manager', 'Sales Representative'];

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useEmployees hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEmployees', () => {
    it('fetches employees successfully', async () => {
      mockEmployeeService.getEmployees.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(
        () => useEmployees(),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockEmployeesResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith({}, {});
    });

    it('passes filters and pagination to API', async () => {
      mockEmployeeService.getEmployees.mockResolvedValue(mockEmployeesResponse);

      const filters = { search: 'John', department: 'Engineering' };
      const pagination = { page: 2, limit: 10, sortBy: 'lastName' as keyof Employee, sortOrder: 'desc' as const };

      const { result } = renderHook(
        () => useEmployees(filters, pagination),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockEmployeesResponse);
      });

      expect(mockEmployeeService.getEmployees).toHaveBeenCalledWith(filters, pagination);
    });

    it('handles API errors', async () => {
      const error = new Error('API Error');
      mockEmployeeService.getEmployees.mockRejectedValue(error);

      const { result } = renderHook(
        () => useEmployees(),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
      });
    });
  });

  describe('useEmployee', () => {
    it('fetches single employee successfully', async () => {
      mockEmployeeService.getEmployee.mockResolvedValue(mockEmployee);

      const { result } = renderHook(
        () => useEmployee(1),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockEmployee);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockEmployeeService.getEmployee).toHaveBeenCalledWith(1);
    });

    it('does not fetch when id is invalid', async () => {
      const { result } = renderHook(
        () => useEmployee(0),
        { wrapper: TestWrapper }
      );

      // Should not make API call
      expect(mockEmployeeService.getEmployee).not.toHaveBeenCalled();
      expect(result.current.data).toBeUndefined();
    });

    it('handles API errors', async () => {
      const error = new Error('Employee not found');
      mockEmployeeService.getEmployee.mockRejectedValue(error);

      const { result } = renderHook(
        () => useEmployee(999),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('useDepartments', () => {
    it('fetches departments successfully', async () => {
      mockEmployeeService.getDepartments.mockResolvedValue(mockDepartments);

      const { result } = renderHook(
        () => useDepartments(),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockDepartments);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockEmployeeService.getDepartments).toHaveBeenCalled();
    });

    it('handles API errors', async () => {
      const error = new Error('Failed to fetch departments');
      mockEmployeeService.getDepartments.mockRejectedValue(error);

      const { result } = renderHook(
        () => useDepartments(),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('usePositions', () => {
    it('fetches positions successfully', async () => {
      mockEmployeeService.getPositions.mockResolvedValue(mockPositions);

      const { result } = renderHook(
        () => usePositions(),
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPositions);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockEmployeeService.getPositions).toHaveBeenCalled();
    });
  });

  describe('useCreateEmployee', () => {
    it('creates employee successfully', async () => {
      mockEmployeeService.createEmployee.mockResolvedValue(mockEmployee);

      const { result } = renderHook(
        () => useCreateEmployee(),
        { wrapper: TestWrapper }
      );

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

      result.current.mutate(newEmployee);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockEmployee);
      });

      expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(newEmployee);
    });

    it('handles creation errors', async () => {
      const error = new Error('Creation failed');
      mockEmployeeService.createEmployee.mockRejectedValue(error);

      const { result } = renderHook(
        () => useCreateEmployee(),
        { wrapper: TestWrapper }
      );

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

      result.current.mutate(newEmployee);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useUpdateEmployee', () => {
    it('updates employee successfully', async () => {
      const updatedEmployee = { ...mockEmployee, firstName: 'Johnny' };
      mockEmployeeService.updateEmployee.mockResolvedValue(updatedEmployee);

      const { result } = renderHook(
        () => useUpdateEmployee(),
        { wrapper: TestWrapper }
      );

      const updates = { firstName: 'Johnny' };

      result.current.mutate({ id: 1, updates });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(updatedEmployee);
      });

      expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith(1, updates);
    });

    it('handles update errors', async () => {
      const error = new Error('Update failed');
      mockEmployeeService.updateEmployee.mockRejectedValue(error);

      const { result } = renderHook(
        () => useUpdateEmployee(),
        { wrapper: TestWrapper }
      );

      result.current.mutate({ id: 1, updates: { firstName: 'Johnny' } });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useDeleteEmployee', () => {
    it('deletes employee successfully', async () => {
      mockEmployeeService.deleteEmployee.mockResolvedValue();

      const { result } = renderHook(
        () => useDeleteEmployee(),
        { wrapper: TestWrapper }
      );

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockEmployeeService.deleteEmployee).toHaveBeenCalledWith(1);
    });

    it('handles deletion errors', async () => {
      const error = new Error('Deletion failed');
      mockEmployeeService.deleteEmployee.mockRejectedValue(error);

      const { result } = renderHook(
        () => useDeleteEmployee(),
        { wrapper: TestWrapper }
      );

      result.current.mutate(1);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useEmployeeCSV', () => {
    beforeEach(() => {
      // Mock DOM methods for file download
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
      
      global.URL.createObjectURL = vi.fn().mockReturnValue('mock-blob-url');
      global.URL.revokeObjectURL = vi.fn();
    });

    it('exports CSV successfully', async () => {
      const csvBlob = new Blob(['csv data'], { type: 'text/csv' });
      mockEmployeeService.exportCSV.mockResolvedValue(csvBlob);

      const { result } = renderHook(
        () => useEmployeeCSV(),
        { wrapper: TestWrapper }
      );

      const filters = { department: 'Engineering' };
      const exportResult = await result.current.exportCSV(filters);

      expect(exportResult.success).toBe(true);
      expect(mockEmployeeService.exportCSV).toHaveBeenCalledWith(filters);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(csvBlob);
    });

    it('handles export errors', async () => {
      const error = new Error('Export failed');
      mockEmployeeService.exportCSV.mockRejectedValue(error);

      const { result } = renderHook(
        () => useEmployeeCSV(),
        { wrapper: TestWrapper }
      );

      const exportResult = await result.current.exportCSV();

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toEqual(error);
    });

    it('imports CSV successfully', async () => {
      const importResult = { imported: 5, errors: [] };
      mockEmployeeService.importCSV.mockResolvedValue(importResult);

      const { result } = renderHook(
        () => useEmployeeCSV(),
        { wrapper: TestWrapper }
      );

      const file = new File(['csv data'], 'employees.csv', { type: 'text/csv' });

      result.current.importCSV.mutate(file);

      await waitFor(() => {
        expect(result.current.importCSV.isSuccess).toBe(true);
        expect(result.current.importCSV.data).toEqual(importResult);
      });

      expect(mockEmployeeService.importCSV).toHaveBeenCalledWith(file);
    });

    it('handles import errors', async () => {
      const error = new Error('Import failed');
      mockEmployeeService.importCSV.mockRejectedValue(error);

      const { result } = renderHook(
        () => useEmployeeCSV(),
        { wrapper: TestWrapper }
      );

      const file = new File(['invalid csv'], 'employees.csv', { type: 'text/csv' });

      result.current.importCSV.mutate(file);

      await waitFor(() => {
        expect(result.current.importCSV.isError).toBe(true);
        expect(result.current.importCSV.error).toEqual(error);
      });
    });
  });
});