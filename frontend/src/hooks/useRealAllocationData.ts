/**
 * GREEN Phase: React Query hooks for real allocation data integration
 * 
 * This file implements the GREEN phase of our TDD cycle:
 * - Connect frontend to real backend APIs
 * - Fetch and cache allocation data with React Query
 * - Enable real-time updates and optimistic mutations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AllocationService } from '../services/allocationService';
import type {
  CreateAllocationRequest,
  UpdateAllocationRequest,
  AllocationFilters,
  AllocationPaginationParams,
} from '../types/allocation';
// Query keys for consistent caching
export const allocationKeys = {
  all: ['allocations'] as const,
  lists: () => [...allocationKeys.all, 'list'] as const,
  list: (filters: AllocationFilters, pagination: AllocationPaginationParams) => 
    [...allocationKeys.lists(), filters, pagination] as const,
  details: () => [...allocationKeys.all, 'detail'] as const,
  detail: (id: string) => [...allocationKeys.details(), id] as const,
  employee: (employeeId: string) => [...allocationKeys.all, 'employee', employeeId] as const,
  project: (projectId: string) => [...allocationKeys.all, 'project', projectId] as const,
  utilization: (employeeId?: string) => [...allocationKeys.all, 'utilization', employeeId] as const,
  conflicts: (filters?: any) => [...allocationKeys.all, 'conflicts', filters] as const,
};
/**
 * Hook for fetching all allocations with filters and pagination
 */
export const useAllocations = (
  filters: AllocationFilters = {},
  pagination: AllocationPaginationParams = {}
) => {
  return useQuery({
    queryKey: allocationKeys.list(filters, pagination),
    queryFn: () => AllocationService.getAllocations(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
/**
 * Hook for fetching a single allocation by ID
 */
export const useAllocation = (id: string, enabled = true) => {
  return useQuery({
    queryKey: allocationKeys.detail(id),
    queryFn: () => AllocationService.getAllocation(id),
    enabled: enabled && !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
/**
 * Hook for fetching employee-specific allocations
 */
export const useEmployeeAllocations = (
  employeeId: string,
  filters?: Omit<AllocationFilters, 'employeeId'>,
  pagination?: AllocationPaginationParams,
  enabled = true
) => {
  return useQuery({
    queryKey: allocationKeys.employee(employeeId),
    queryFn: () => AllocationService.getEmployeeAllocations(employeeId, filters, pagination),
    enabled: enabled && !!employeeId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
  });
};
/**
 * Hook for fetching project-specific allocations
 */
export const useProjectAllocations = (
  projectId: string,
  filters?: Omit<AllocationFilters, 'projectId'>,
  pagination?: AllocationPaginationParams,
  enabled = true
) => {
  return useQuery({
    queryKey: allocationKeys.project(projectId),
    queryFn: () => AllocationService.getProjectAllocations(projectId, filters, pagination),
    enabled: enabled && !!projectId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 8 * 60 * 1000, // 8 minutes
  });
};
/**
 * Hook for fetching employee utilization data
 */
export const useEmployeeUtilization = (
  employeeId: string,
  startDate?: string,
  endDate?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: allocationKeys.utilization(employeeId),
    queryFn: () => AllocationService.getEmployeeUtilization(employeeId, startDate, endDate),
    enabled: enabled && !!employeeId,
    staleTime: 1 * 60 * 1000, // 1 minute (capacity data changes frequently)
    gcTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time capacity monitoring
  });
};
/**
 * Hook for fetching multiple employee utilization data
 */
export const useMultipleEmployeeUtilization = (
  employeeIds: string[],
  startDate?: string,
  endDate?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: [...allocationKeys.utilization(), 'multiple', employeeIds, startDate, endDate],
    queryFn: () => AllocationService.getMultipleEmployeeUtilization(employeeIds, startDate, endDate),
    enabled: enabled && employeeIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });
};
/**
 * Hook for fetching allocation conflicts
 */
export const useAllocationConflicts = (
  filters?: {
    employeeId?: string;
    projectId?: string;
    severity?: string;
    type?: string;
  },
  enabled = true
) => {
  return useQuery({
    queryKey: allocationKeys.conflicts(filters),
    queryFn: () => AllocationService.getConflicts(filters),
    enabled,
    staleTime: 30 * 1000, // 30 seconds (conflicts need to be fresh)
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute for real-time conflict detection
  });
};
/**
 * Mutation hook for creating allocations with optimistic updates
 */
export const useCreateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAllocationRequest) => AllocationService.createAllocation(data),
    onSuccess: (result, variables) => {
      // Update allocation list cache
      queryClient.invalidateQueries({ queryKey: allocationKeys.lists() });

      // Update employee allocations cache
      queryClient.invalidateQueries({ queryKey: allocationKeys.employee(variables.employeeId) });

      // Update project allocations cache
      queryClient.invalidateQueries({ queryKey: allocationKeys.project(variables.projectId) });

      // Update utilization data
      queryClient.invalidateQueries({ queryKey: allocationKeys.utilization(variables.employeeId) });

      // Update conflicts data
      queryClient.invalidateQueries({ queryKey: allocationKeys.conflicts() });

      // Add new allocation to cache
      if (result.allocation) {
        queryClient.setQueryData(
          allocationKeys.detail(result.allocation.id),
          result.allocation
        );
      }
    },
    onError: (error, _variables) => {
      console.error('Failed to create allocation:', error);
      // You could add toast notifications here
    }
  });
};
/**
 * Mutation hook for updating allocations
 */
export const useUpdateAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Omit<UpdateAllocationRequest, 'id'> }) =>
      AllocationService.updateAllocation(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: allocationKeys.detail(id) });
      // Snapshot previous value
      const previousAllocation = queryClient.getQueryData(allocationKeys.detail(id));
      // Optimistically update
      if (previousAllocation && typeof previousAllocation === 'object') {
        const typedPreviousAllocation = previousAllocation as Record<string, any>;
        queryClient.setQueryData(allocationKeys.detail(id), {
          ...typedPreviousAllocation,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      }
      return { previousAllocation };
    },
    onError: (_err, { id }, context) => {
      // Rollback optimistic update
      if (context?.previousAllocation) {
        queryClient.setQueryData(allocationKeys.detail(id), context.previousAllocation);
      }
    },
    onSuccess: (result, _variables) => {
      // Update related caches
      queryClient.invalidateQueries({ queryKey: allocationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: allocationKeys.employee(result.allocation.employeeId) });
      queryClient.invalidateQueries({ queryKey: allocationKeys.project(result.allocation.projectId.toString()) });
      queryClient.invalidateQueries({ queryKey: allocationKeys.utilization(result.allocation.employeeId) });
    }
  });
};
/**
 * Mutation hook for deleting allocations
 */
export const useDeleteAllocation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => AllocationService.deleteAllocation(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: allocationKeys.detail(id) });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: allocationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: allocationKeys.all });
    }
  });
};
/**
 * Mutation hook for bulk updating allocations
 */
export const useBulkUpdateAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: {
      allocationId: string;
      startDate: string;
      endDate: string;
      allocatedHours?: number;
    }[]) => AllocationService.bulkUpdateAllocations(updates),
    onSuccess: () => {
      // Invalidate all allocation-related queries
      queryClient.invalidateQueries({ queryKey: allocationKeys.all });
    }
  });
};
/**
 * Hook for checking allocation conflicts without creating
 */
export const useCheckAllocationConflicts = () => {
  return useMutation({
    mutationFn: (allocation: CreateAllocationRequest) => 
      AllocationService.checkConflicts(allocation),
  });
};
/**
 * Hook for calendar data with real-time updates
 */
export const useAllocationCalendarData = (
  startDate: string,
  endDate: string,
  filters?: AllocationFilters,
  enabled = true
) => {
  return useQuery({
    queryKey: [...allocationKeys.all, 'calendar', startDate, endDate, filters],
    queryFn: () => AllocationService.getCalendarData(startDate, endDate, filters),
    enabled: enabled && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute for real-time calendar updates
  });
};
/**
 * Custom hook for real-time allocation monitoring
 * Combines multiple queries for comprehensive allocation tracking
 */
export const useAllocationMonitoring = (employeeId?: string) => {
  const allocations = useAllocations({ employeeId }, { page: 1, limit: 50 });
  const utilization = useEmployeeUtilization(employeeId || '');
  const conflicts = useAllocationConflicts({ employeeId });
  return {
    allocations: allocations.data?.allocations || [],
    utilization: utilization.data,
    conflicts: conflicts.data || [],
    isLoading: allocations.isLoading || utilization.isLoading || conflicts.isLoading,
    isError: allocations.isError || utilization.isError || conflicts.isError,
    refetch: () => {
      allocations.refetch();
      utilization.refetch();
      conflicts.refetch();
    }
  };
};
