import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { format } from 'date-fns';

// ============================================
// TYPES
// ============================================

export type HeatmapGranularity = 'daily' | 'weekly' | 'monthly';
export type HeatLevel = 'available' | 'green' | 'blue' | 'yellow' | 'red' | 'unavailable';

export interface HeatmapCell {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  availableHours: number;
  allocatedHours: number;
  utilizationPercentage: number;
  heatLevel: HeatLevel;
  projectCount: number;
  projectNames: string[];
  isHoliday?: boolean;
  hasException?: boolean;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  summary: {
    totalEmployees: number;
    totalAvailableHours: number;
    totalAllocatedHours: number;
    avgUtilization: number;
    peakUtilization: number;
    overAllocatedDays: number;
    underUtilizedDays: number;
  };
  metadata: {
    startDate: Date;
    endDate: Date;
    granularity: HeatmapGranularity;
    lastRefreshed: Date;
    cached: boolean;
  };
}

export interface HeatmapFilters {
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  employeeIds?: string[];
  teamIds?: string[];
  granularity?: HeatmapGranularity;
  includeInactive?: boolean;
  includeWeekends?: boolean;
}

// ============================================
// API FUNCTIONS
// ============================================

async function fetchHeatmapData(filters: HeatmapFilters): Promise<HeatmapData> {
  const params = new URLSearchParams({
    startDate: format(filters.startDate, 'yyyy-MM-dd'),
    endDate: format(filters.endDate, 'yyyy-MM-dd'),
    granularity: filters.granularity || 'daily',
    includeInactive: String(filters.includeInactive || false),
    includeWeekends: String(filters.includeWeekends || false)
  });

  if (filters.departmentId) {
    params.append('departmentId', filters.departmentId);
  }

  if (filters.employeeIds && filters.employeeIds.length > 0) {
    filters.employeeIds.forEach(id => params.append('employeeIds', id));
  }

  if (filters.teamIds && filters.teamIds.length > 0) {
    filters.teamIds.forEach(id => params.append('teamIds', id));
  }

  const response = await fetch(`/api/capacity/heatmap?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch heatmap data' }));
    throw new Error(error.message || 'Failed to fetch heatmap data');
  }

  const result = await response.json();

  // Transform dates from strings to Date objects
  return {
    ...result.data,
    cells: result.data.cells.map((cell: any) => ({
      ...cell,
      date: new Date(cell.date)
    })),
    metadata: {
      ...result.data.metadata,
      startDate: new Date(result.data.metadata.startDate),
      endDate: new Date(result.data.metadata.endDate),
      lastRefreshed: new Date(result.data.metadata.lastRefreshed)
    }
  };
}

// ============================================
// HOOK
// ============================================

export function useCapacityHeatmap(
  filters: HeatmapFilters
): UseQueryResult<HeatmapData, Error> {
  return useQuery({
    queryKey: ['capacity', 'heatmap', filters],
    queryFn: () => fetchHeatmapData(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

// ============================================
// ADDITIONAL HOOKS
// ============================================

export function useCapacityBottlenecks(
  startDate?: Date,
  endDate?: Date,
  departmentId?: string
) {
  return useQuery({
    queryKey: ['capacity', 'bottlenecks', { startDate, endDate, departmentId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', format(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('endDate', format(endDate, 'yyyy-MM-dd'));
      if (departmentId) params.append('departmentId', departmentId);

      const response = await fetch(`/api/capacity/bottlenecks?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bottlenecks');
      }

      const result = await response.json();
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  });
}

export function useCapacityTrends(
  employeeId: string,
  periods: number = 12
) {
  return useQuery({
    queryKey: ['capacity', 'trends', employeeId, periods],
    queryFn: async () => {
      const params = new URLSearchParams({
        periods: String(periods)
      });

      const response = await fetch(`/api/capacity/trends/${employeeId}?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch capacity trends');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,    // 30 minutes
  });
}

export function useDepartmentCapacitySummary(
  departmentId: string,
  date?: Date
) {
  return useQuery({
    queryKey: ['capacity', 'department', 'summary', departmentId, date],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', format(date, 'yyyy-MM-dd'));

      const response = await fetch(`/api/capacity/department/${departmentId}/summary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch department summary');
      }

      const result = await response.json();
      return result.data;
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });
}