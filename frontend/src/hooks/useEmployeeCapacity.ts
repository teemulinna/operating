import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CapacityService } from '@/services/capacityService';
import type { 
  EmployeeCapacity, 
  EmployeeCapacityData,
  AvailabilityStatus 
} from '@/types/employee';
import type { 
  CapacityEntry, 
  CapacityUpdateRequest, 
  WeeklyCapacityView 
} from '@/types/capacity';

// Query keys for capacity-related queries
const CAPACITY_KEYS = {
  all: ['capacity'] as const,
  employee: (employeeId: string) => [...CAPACITY_KEYS.all, 'employee', employeeId] as const,
  employees: (employeeIds: string[]) => [...CAPACITY_KEYS.all, 'employees', employeeIds] as const,
  search: (params: any) => [...CAPACITY_KEYS.all, 'search', params] as const,
  weekly: (employeeIds: string[], weekStart: string) => 
    [...CAPACITY_KEYS.all, 'weekly', employeeIds, weekStart] as const,
};

/**
 * Hook to get capacity data for a single employee
 * Includes graceful degradation if capacity API is unavailable
 */
export function useEmployeeCapacity(
  employeeId: string,
  dateRange?: { start: string; end: string },
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CAPACITY_KEYS.employee(employeeId),
    queryFn: () => CapacityService.getEmployeeCapacity(employeeId, dateRange),
    enabled: !!employeeId && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once for capacity data
    retryOnMount: false,
  });
}

/**
 * Hook to get capacity data for multiple employees (for list views)
 * Essential for showing capacity in EmployeeList component
 */
export function useMultipleEmployeeCapacities(
  employeeIds: string[],
  date?: string,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CAPACITY_KEYS.employees(employeeIds),
    queryFn: () => CapacityService.getMultipleEmployeeCapacities(employeeIds, date),
    enabled: employeeIds.length > 0 && (options.enabled !== false),
    staleTime: 3 * 60 * 1000, // 3 minutes for bulk data
    retry: 1,
    retryOnMount: false,
  });
}

/**
 * Hook to update employee capacity
 */
export function useUpdateEmployeeCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, request }: { 
      employeeId: string; 
      request: CapacityUpdateRequest 
    }) => CapacityService.updateEmployeeCapacity(employeeId, request),
    onSuccess: (data, { employeeId }) => {
      // Update individual employee capacity
      queryClient.invalidateQueries({ 
        queryKey: CAPACITY_KEYS.employee(employeeId) 
      });
      // Update bulk capacity queries
      queryClient.invalidateQueries({ 
        queryKey: CAPACITY_KEYS.all 
      });
    },
    onError: (error) => {
      console.warn('Capacity update failed:', error);
    },
  });
}

/**
 * Hook for capacity-based employee search
 */
export function useCapacitySearch(params: {
  minAvailableHours?: number;
  maxUtilization?: number;
  availabilityStatus?: AvailabilityStatus[];
  dateRange?: { start: string; end: string };
  departmentIds?: string[];
}) {
  return useQuery({
    queryKey: CAPACITY_KEYS.search(params),
    queryFn: () => CapacityService.searchByCapacity(params),
    enabled: Object.keys(params).some(key => params[key as keyof typeof params] !== undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    retry: 1,
  });
}

/**
 * Hook for weekly capacity view
 */
export function useWeeklyCapacityView(
  employeeIds: string[],
  weekStart: string,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: CAPACITY_KEYS.weekly(employeeIds, weekStart),
    queryFn: () => CapacityService.getWeeklyCapacityView(employeeIds, weekStart),
    enabled: employeeIds.length > 0 && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

/**
 * Hook to check if capacity features are available
 * Useful for progressive enhancement
 */
export function useCapacityAvailability() {
  return useQuery({
    queryKey: ['capacity', 'availability'],
    queryFn: CapacityService.isCapacityAvailable,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Helper hook that combines employee data with capacity data
 * This is what EmployeeList will use for integrated display
 */
export function useEmployeeWithCapacity(employeeId: string) {
  const capacityQuery = useEmployeeCapacity(employeeId, undefined, { enabled: true });
  
  return {
    ...capacityQuery,
    data: capacityQuery.data ? {
      capacity: CapacityService.toEmployeeCapacity(capacityQuery.data),
      capacityData: CapacityService.toEmployeeCapacityData(capacityQuery.data),
    } : undefined,
  };
}

/**
 * Utility functions for capacity data transformation
 */
export const CapacityUtils = {
  /**
   * Get utilization color for UI display
   */
  getUtilizationColor: (utilization: number): string => {
    if (utilization >= 100) return 'text-red-600';
    if (utilization >= 80) return 'text-orange-600';
    if (utilization >= 60) return 'text-yellow-600';
    return 'text-green-600';
  },

  /**
   * Format utilization percentage for display
   */
  formatUtilization: (utilization: number): string => {
    return `${Math.round(utilization)}%`;
  },

  /**
   * Get availability status badge color
   */
  getStatusColor: (status: AvailabilityStatus): string => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-orange-100 text-orange-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'out-of-office': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },

  /**
   * Format hours for display
   */
  formatHours: (hours: number): string => {
    return `${hours}h`;
  },

  /**
   * Check if capacity data is available and valid
   */
  hasValidCapacity: (capacity: EmployeeCapacityData | undefined): boolean => {
    return !!(capacity && capacity.weeklyHours > 0);
  }
};

export default {
  useEmployeeCapacity,
  useMultipleEmployeeCapacities,
  useUpdateEmployeeCapacity,
  useCapacitySearch,
  useWeeklyCapacityView,
  useCapacityAvailability,
  useEmployeeWithCapacity,
  CapacityUtils,
};