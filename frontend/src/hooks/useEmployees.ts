import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { EmployeeService } from '@/services/api';
import type { 
  Employee, 
  CreateEmployeeRequest, 
  UpdateEmployeeRequest, 
  EmployeeFilters, 
  PaginationParams,
  ApiError 
} from '@/types/employee';

// Query keys for React Query
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (filters: EmployeeFilters, pagination: PaginationParams) => 
    [...employeeKeys.lists(), filters, pagination] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
  departments: () => [...employeeKeys.all, 'departments'] as const,
  positions: () => [...employeeKeys.all, 'positions'] as const,
};

/**
 * Hook for fetching employees with filtering and pagination
 */
export function useEmployees(
  filters: EmployeeFilters = {},
  pagination: PaginationParams = {}
) {
  return useQuery({
    queryKey: employeeKeys.list(filters, pagination),
    queryFn: () => EmployeeService.getEmployees(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching a single employee
 */
export function useEmployee(id: number) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => EmployeeService.getEmployee(id),
    enabled: !!id && id > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching departments
 */
export function useDepartments() {
  return useQuery({
    queryKey: employeeKeys.departments(),
    queryFn: EmployeeService.getDepartments,
    staleTime: 15 * 60 * 1000, // 15 minutes - departments change rarely
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for fetching positions
 */
export function usePositions() {
  return useQuery({
    queryKey: employeeKeys.positions(),
    queryFn: EmployeeService.getPositions,
    staleTime: 15 * 60 * 1000, // 15 minutes - positions change rarely
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for creating employees
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employee: CreateEmployeeRequest) => 
      EmployeeService.createEmployee(employee),
    onSuccess: () => {
      // Invalidate and refetch employee lists
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.departments() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.positions() });
    },
    onError: (error: ApiError) => {
      console.error('Failed to create employee:', error);
    },
  });
}

/**
 * Hook for updating employees
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Omit<UpdateEmployeeRequest, 'id'> }) =>
      EmployeeService.updateEmployee(id, updates),
    onSuccess: (updatedEmployee) => {
      // Update the specific employee in cache
      queryClient.setQueryData(
        employeeKeys.detail(updatedEmployee.id),
        updatedEmployee
      );
      
      // Invalidate employee lists to reflect changes
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.departments() });
      queryClient.invalidateQueries({ queryKey: employeeKeys.positions() });
    },
    onError: (error: ApiError) => {
      console.error('Failed to update employee:', error);
    },
  });
}

/**
 * Hook for deleting employees
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => EmployeeService.deleteEmployee(id),
    onSuccess: (_, deletedId) => {
      // Remove the employee from cache
      queryClient.removeQueries({ queryKey: employeeKeys.detail(deletedId) });
      
      // Invalidate employee lists
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
    },
    onError: (error: ApiError) => {
      console.error('Failed to delete employee:', error);
    },
  });
}

/**
 * Hook for CSV operations
 */
export function useEmployeeCSV() {
  const exportCSV = useCallback(async (filters: EmployeeFilters = {}) => {
    try {
      const blob = await EmployeeService.exportCSV(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to export CSV:', error);
      return { success: false, error: error as ApiError };
    }
  }, []);

  const importCSV = useMutation({
    mutationFn: (file: File) => EmployeeService.importCSV(file),
    onError: (error: ApiError) => {
      console.error('Failed to import CSV:', error);
    },
  });

  return {
    exportCSV,
    importCSV,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticEmployee() {
  const queryClient = useQueryClient();

  const updateEmployeeOptimistic = useCallback(
    (id: number, updates: Partial<Employee>) => {
      const previousEmployee = queryClient.getQueryData<Employee>(
        employeeKeys.detail(id)
      );

      if (previousEmployee) {
        // Optimistically update the cache
        queryClient.setQueryData<Employee>(
          employeeKeys.detail(id),
          { ...previousEmployee, ...updates }
        );
      }

      return previousEmployee;
    },
    [queryClient]
  );

  const rollbackEmployee = useCallback(
    (id: number, previousEmployee: Employee) => {
      queryClient.setQueryData(employeeKeys.detail(id), previousEmployee);
    },
    [queryClient]
  );

  return {
    updateEmployeeOptimistic,
    rollbackEmployee,
  };
}