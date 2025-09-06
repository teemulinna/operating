import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EmployeeService } from '@/services/api'
import type { Employee, CreateEmployeeRequest, EmployeeFilters, PaginationParams } from '@/types/employee'

const EMPLOYEE_KEYS = {
  all: ['employees'] as const,
  lists: () => [...EMPLOYEE_KEYS.all, 'list'] as const,
  list: (filters: EmployeeFilters, pagination: PaginationParams) => 
    [...EMPLOYEE_KEYS.lists(), filters, pagination] as const,
  details: () => [...EMPLOYEE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...EMPLOYEE_KEYS.details(), id] as const,
  departments: () => [...EMPLOYEE_KEYS.all, 'departments'] as const,
  positions: () => [...EMPLOYEE_KEYS.all, 'positions'] as const,
}

export function useEmployees(
  filters: EmployeeFilters = {}, 
  pagination: PaginationParams = {}
) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.list(filters, pagination),
    queryFn: () => EmployeeService.getEmployees(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.detail(id),
    queryFn: () => EmployeeService.getEmployee(id),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (employee: CreateEmployeeRequest) => 
      EmployeeService.createEmployee(employee),
    onSuccess: () => {
      // Invalidate employee lists to refetch data
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Employee> }) =>
      EmployeeService.updateEmployee(id, updates),
    onSuccess: (updatedEmployee) => {
      // Update the specific employee in cache
      queryClient.setQueryData(
        EMPLOYEE_KEYS.detail(updatedEmployee.id), 
        updatedEmployee
      )
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => EmployeeService.deleteEmployee(id),
    onSuccess: (_, deletedId) => {
      // Remove employee from cache
      queryClient.removeQueries({ queryKey: EMPLOYEE_KEYS.detail(deletedId) })
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.lists() })
    },
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.departments(),
    queryFn: () => EmployeeService.getDepartments(),
    staleTime: 10 * 60 * 1000, // 10 minutes - departments change infrequently
  })
}

export function usePositions() {
  return useQuery({
    queryKey: EMPLOYEE_KEYS.positions(),
    queryFn: () => EmployeeService.getPositions(),
    staleTime: 10 * 60 * 1000, // 10 minutes - positions change infrequently
  })
}

export function useCSVImport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (file: File) => EmployeeService.importCSV(file),
    onSuccess: () => {
      // Invalidate all employee queries after import
      queryClient.invalidateQueries({ queryKey: EMPLOYEE_KEYS.all })
    },
  })
}

export function useCSVExport() {
  return useMutation({
    mutationFn: (filters: EmployeeFilters = {}) => EmployeeService.exportCSV(filters),
  })
}

// Export missing items
export const useEmployeeCSV = useCSVImport;
export const employeeKeys = EMPLOYEE_KEYS;