import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CapacityEntry, CapacitySearchParams, WeeklyCapacityView, CapacityUpdateRequest } from '@/types/capacity';

// Mock API functions - replace with actual API calls
const mockCapacityData: CapacityEntry[] = [
  {
    id: '1',
    employeeId: '1',
    date: '2024-01-08',
    totalHours: 40,
    allocatedHours: 32,
    availableHours: 8,
    status: 'partially-available',
    projects: [
      { id: '1', projectId: 'p1', projectName: 'Website Redesign', allocatedHours: 20, color: '#3B82F6', priority: 'high' },
      { id: '2', projectId: 'p2', projectName: 'Mobile App', allocatedHours: 12, color: '#10B981', priority: 'medium' }
    ],
    notes: 'Available for small tasks only',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T10:30:00Z'
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockSearchCapacity = async (params: CapacitySearchParams): Promise<CapacityEntry[]> => {
  await delay(800);
  
  let results = [...mockCapacityData];
  
  if (params.query) {
    // In a real implementation, this would search by employee name, skills, etc.
    results = results.filter(entry => 
      entry.notes?.toLowerCase().includes(params.query!.toLowerCase())
    );
  }
  
  if (params.minHours) {
    results = results.filter(entry => entry.availableHours >= params.minHours!);
  }
  
  if (params.availability?.length) {
    results = results.filter(entry => params.availability!.includes(entry.status));
  }
  
  return results;
};

const mockUpdateCapacity = async (request: CapacityUpdateRequest): Promise<CapacityEntry> => {
  await delay(500);
  
  const existing = mockCapacityData.find(c => 
    c.employeeId === request.employeeId && c.date === request.date
  );
  
  if (existing) {
    existing.totalHours = request.totalHours;
    existing.availableHours = request.totalHours - existing.allocatedHours;
    existing.status = request.status || existing.status;
    existing.notes = request.notes;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  
  const newEntry: CapacityEntry = {
    id: Date.now().toString(),
    employeeId: request.employeeId,
    date: request.date,
    totalHours: request.totalHours,
    allocatedHours: 0,
    availableHours: request.totalHours,
    status: request.status || 'available',
    projects: [],
    notes: request.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockCapacityData.push(newEntry);
  return newEntry;
};

// React Query Hooks
export const useCapacitySearch = (params: CapacitySearchParams) => {
  return useQuery({
    queryKey: ['capacity-search', params],
    queryFn: () => mockSearchCapacity(params),
    staleTime: 30000, // 30 seconds
    retry: 2
  });
};

export const useEmployeeCapacity = (employeeId: string, dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['employee-capacity', employeeId, dateRange],
    queryFn: async () => {
      await delay(300);
      return mockCapacityData.filter(c => c.employeeId === employeeId);
    },
    staleTime: 60000, // 1 minute
    retry: 1
  });
};

export const useUpdateCapacity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: mockUpdateCapacity,
    onSuccess: (data) => {
      // Invalidate and refetch capacity queries
      queryClient.invalidateQueries({ queryKey: ['capacity-search'] });
      queryClient.invalidateQueries({ queryKey: ['employee-capacity', data.employeeId] });
      queryClient.invalidateQueries({ queryKey: ['weekly-capacity'] });
    },
    retry: 1
  });
};

export const useWeeklyCapacity = (employeeIds?: string[], weekStart?: string) => {
  return useQuery({
    queryKey: ['weekly-capacity', employeeIds, weekStart],
    queryFn: async (): Promise<WeeklyCapacityView[]> => {
      await delay(600);
      // Mock implementation - replace with real API call
      return [];
    },
    enabled: !!employeeIds?.length,
    staleTime: 120000, // 2 minutes
    retry: 1
  });
};

// Utility functions
export const getCapacityStatus = (totalHours: number, allocatedHours: number): string => {
  const utilizationRate = totalHours > 0 ? (allocatedHours / totalHours) * 100 : 0;
  
  if (utilizationRate >= 100) return 'overbooked';
  if (utilizationRate >= 80) return 'busy';
  if (utilizationRate >= 40) return 'partially-available';
  return 'available';
};

export const calculateWeeklyUtilization = (entries: CapacityEntry[]): number => {
  const totalHours = entries.reduce((sum, entry) => sum + entry.totalHours, 0);
  const allocatedHours = entries.reduce((sum, entry) => sum + entry.allocatedHours, 0);
  
  return totalHours > 0 ? (allocatedHours / totalHours) * 100 : 0;
};