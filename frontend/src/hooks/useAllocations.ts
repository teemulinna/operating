import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AllocationService } from '@/services/allocationService';
import type {
  Allocation,
  CreateAllocationRequest,
  UpdateAllocationRequest,
  AllocationFilters,
  AllocationPaginationParams,
  AllocationConflict,
  EmployeeUtilization,
  ProjectTeamAllocation,
  ConflictResolution,
} from '@/types/allocation';

const ALLOCATION_KEYS = {
  all: ['allocations'] as const,
  lists: () => [...ALLOCATION_KEYS.all, 'list'] as const,
  list: (filters: AllocationFilters, pagination: AllocationPaginationParams) => 
    [...ALLOCATION_KEYS.lists(), filters, pagination] as const,
  details: () => [...ALLOCATION_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ALLOCATION_KEYS.details(), id] as const,
  employee: (employeeId: string) => [...ALLOCATION_KEYS.all, 'employee', employeeId] as const,
  project: (projectId: string) => [...ALLOCATION_KEYS.all, 'project', projectId] as const,
  utilization: (employeeId: string) => [...ALLOCATION_KEYS.all, 'utilization', employeeId] as const,
  multipleUtilization: (employeeIds: string[]) => [...ALLOCATION_KEYS.all, 'utilization', 'multiple', ...employeeIds] as const,
  conflicts: () => [...ALLOCATION_KEYS.all, 'conflicts'] as const,
  calendar: (startDate: string, endDate: string, filters?: AllocationFilters) => 
    [...ALLOCATION_KEYS.all, 'calendar', startDate, endDate, filters] as const,
  projectTeam: (projectId: string) => [...ALLOCATION_KEYS.all, 'project-team', projectId] as const,
} as const;

/**
 * Get all allocations with filtering and pagination
 */
export function useAllocations(
  filters: AllocationFilters = {},
  pagination: AllocationPaginationParams = {}
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.list(filters, pagination),
    queryFn: () => AllocationService.getAllocations(filters, pagination),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get a single allocation by ID
 */
export function useAllocation(id: string) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.detail(id),
    queryFn: () => AllocationService.getAllocation(id),
    enabled: !!id,
  });
}

/**
 * Create a new allocation with conflict detection
 */
export function useCreateAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (allocation: CreateAllocationRequest) => 
      AllocationService.createAllocation(allocation),
    onSuccess: () => {
      // Invalidate allocation lists to refetch data
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.conflicts() });
    },
  });
}

/**
 * Update an existing allocation
 */
export function useUpdateAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Omit<UpdateAllocationRequest, 'id'> }) =>
      AllocationService.updateAllocation(id, updates),
    onSuccess: (result) => {
      // Update the specific allocation in cache
      queryClient.setQueryData(
        ALLOCATION_KEYS.detail(result.allocation.id), 
        result.allocation
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.conflicts() });
    },
  });
}

/**
 * Delete an allocation
 */
export function useDeleteAllocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => AllocationService.deleteAllocation(id),
    onSuccess: (_, deletedId) => {
      // Remove allocation from cache
      queryClient.removeQueries({ queryKey: ALLOCATION_KEYS.detail(deletedId) });
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.conflicts() });
    },
  });
}

/**
 * Get allocations for a specific employee
 */
export function useEmployeeAllocations(
  employeeId: string,
  filters?: Omit<AllocationFilters, 'employeeId'>,
  pagination?: AllocationPaginationParams
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.employee(employeeId),
    queryFn: () => AllocationService.getEmployeeAllocations(employeeId, filters, pagination),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get allocations for a specific project
 */
export function useProjectAllocations(
  projectId: string,
  filters?: Omit<AllocationFilters, 'projectId'>,
  pagination?: AllocationPaginationParams
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.project(projectId),
    queryFn: () => AllocationService.getProjectAllocations(projectId, filters, pagination),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get utilization data for an employee
 */
export function useUtilization(
  employeeId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.utilization(employeeId),
    queryFn: () => AllocationService.getEmployeeUtilization(employeeId, startDate, endDate),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get utilization data for multiple employees
 */
export function useMultipleUtilization(
  employeeIds: string[],
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.multipleUtilization(employeeIds),
    queryFn: () => AllocationService.getMultipleEmployeeUtilization(employeeIds, startDate, endDate),
    enabled: employeeIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get project team allocation data
 */
export function useProjectTeamAllocation(projectId: string) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.projectTeam(projectId),
    queryFn: () => AllocationService.getProjectTeamAllocation(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get allocation conflicts
 */
export function useConflicts(filters?: {
  employeeId?: string;
  projectId?: string;
  severity?: string;
  type?: string;
}) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.conflicts(),
    queryFn: () => AllocationService.getConflicts(filters),
    staleTime: 1 * 60 * 1000, // 1 minute - conflicts need to be fresh
  });
}

/**
 * Resolve allocation conflicts
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (resolution: ConflictResolution) => 
      AllocationService.resolveConflict(resolution),
    onSuccess: () => {
      // Invalidate all allocation-related queries after resolving conflicts
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
    },
  });
}

/**
 * Check for conflicts without creating allocation
 */
export function useCheckConflicts() {
  return useMutation({
    mutationFn: (allocation: CreateAllocationRequest) => 
      AllocationService.checkConflicts(allocation),
  });
}

/**
 * Bulk update allocations (for drag-drop operations)
 */
export function useBulkUpdateAllocations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: {
      allocationId: string;
      startDate: string;
      endDate: string;
      allocatedHours?: number;
    }[]) => AllocationService.bulkUpdateAllocations(updates),
    onSuccess: () => {
      // Invalidate all allocation queries after bulk update
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
    },
  });
}

/**
 * Get calendar data for allocations
 */
export function useCalendarData(
  startDate: string,
  endDate: string,
  filters?: AllocationFilters
) {
  return useQuery({
    queryKey: ALLOCATION_KEYS.calendar(startDate, endDate, filters),
    queryFn: () => AllocationService.getCalendarData(startDate, endDate, filters),
    enabled: !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Export allocations as CSV
 */
export function useAllocationCSVExport() {
  return useMutation({
    mutationFn: (filters: AllocationFilters = {}) => 
      AllocationService.exportCSV(filters),
  });
}

/**
 * Import allocations from CSV
 */
export function useAllocationCSVImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => AllocationService.importCSV(file),
    onSuccess: () => {
      // Invalidate all allocation queries after import
      queryClient.invalidateQueries({ queryKey: ALLOCATION_KEYS.all });
    },
  });
}

// Export keys for external use
export const allocationKeys = ALLOCATION_KEYS;