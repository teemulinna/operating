import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  useAllocations,
  useAllocation,
  useCreateAllocation,
  useUpdateAllocation,
  useDeleteAllocation,
  useEmployeeAllocations,
  useProjectAllocations,
  useUtilization,
  useConflicts,
  useResolveConflict,
  useCheckConflicts,
  useBulkUpdateAllocations,
  useCalendarData,
} from '../../hooks/useAllocations';
import { AllocationService } from '../../services/allocationService';

// Mock the allocation service
vi.mock('../../services/allocationService');

const mockAllocationService = vi.mocked(AllocationService);

const mockAllocation = {
  id: 'alloc-1',
  employeeId: 'emp-1',
  projectId: 'proj-1',
  startDate: '2024-01-01',
  endDate: '2024-01-07',
  allocatedHours: 40,
  role: 'Developer',
  status: 'active' as const,
  notes: 'Test allocation',
  isActive: true,
  employeeName: 'John Doe',
  projectName: 'Test Project',
  clientName: 'Test Client',
  duration: 7,
  totalHours: 40,
  isOverdue: false,
  isUpcoming: false,
};

const mockAllocationsResponse = {
  allocations: [mockAllocation],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockUtilizationData = {
  employeeId: 'emp-1',
  employeeName: 'John Doe',
  weeklyCapacity: 40,
  allocatedHours: 30,
  availableHours: 10,
  utilizationRate: 75,
  overallocated: false,
  conflicts: [],
  allocations: [mockAllocation],
};

const mockConflict = {
  id: 'conflict-1',
  type: 'time_overlap' as const,
  severity: 'medium' as const,
  description: 'Time overlap detected',
  affectedAllocations: ['alloc-1'],
  canAutoResolve: false,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useAllocations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAllocations', () => {
    it('fetches allocations successfully', async () => {
      mockAllocationService.getAllocations.mockResolvedValue(mockAllocationsResponse);

      const { result } = renderHook(
        () => useAllocations(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAllocationsResponse);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockAllocationService.getAllocations).toHaveBeenCalledWith({}, {});
    });

    it('applies filters and pagination', async () => {
      const filters = { employeeId: 'emp-1', status: 'active' as const };
      const pagination = { page: 2, limit: 5 };

      mockAllocationService.getAllocations.mockResolvedValue(mockAllocationsResponse);

      renderHook(
        () => useAllocations(filters, pagination),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAllocationService.getAllocations).toHaveBeenCalledWith(filters, pagination);
      });
    });

    it('handles errors', async () => {
      const error = new Error('Failed to fetch allocations');
      mockAllocationService.getAllocations.mockRejectedValue(error);

      const { result } = renderHook(
        () => useAllocations(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('useAllocation', () => {
    it('fetches single allocation', async () => {
      mockAllocationService.getAllocation.mockResolvedValue(mockAllocation);

      const { result } = renderHook(
        () => useAllocation('alloc-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAllocation);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockAllocationService.getAllocation).toHaveBeenCalledWith('alloc-1');
    });

    it('does not fetch when id is empty', () => {
      const { result } = renderHook(
        () => useAllocation(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockAllocationService.getAllocation).not.toHaveBeenCalled();
    });
  });

  describe('useCreateAllocation', () => {
    it('creates allocation successfully', async () => {
      const mockResult = { allocation: mockAllocation, conflicts: [] };
      mockAllocationService.createAllocation.mockResolvedValue(mockResult);

      const { result } = renderHook(
        () => useCreateAllocation(),
        { wrapper: createWrapper() }
      );

      const allocationData = {
        employeeId: 'emp-1',
        projectId: 'proj-1',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        allocatedHours: 40,
      };

      await result.current.mutateAsync(allocationData);

      expect(mockAllocationService.createAllocation).toHaveBeenCalledWith(allocationData);
    });

    it('handles creation with conflicts', async () => {
      const mockResult = { allocation: mockAllocation, conflicts: [mockConflict] };
      mockAllocationService.createAllocation.mockResolvedValue(mockResult);

      const { result } = renderHook(
        () => useCreateAllocation(),
        { wrapper: createWrapper() }
      );

      const allocationData = {
        employeeId: 'emp-1',
        projectId: 'proj-1',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        allocatedHours: 40,
      };

      const response = await result.current.mutateAsync(allocationData);

      expect(response).toEqual(mockResult);
      expect(response.conflicts).toHaveLength(1);
    });
  });

  describe('useUpdateAllocation', () => {
    it('updates allocation successfully', async () => {
      const mockResult = { allocation: mockAllocation, conflicts: [] };
      mockAllocationService.updateAllocation.mockResolvedValue(mockResult);

      const { result } = renderHook(
        () => useUpdateAllocation(),
        { wrapper: createWrapper() }
      );

      const updateData = { id: 'alloc-1', updates: { allocatedHours: 30 } };
      await result.current.mutateAsync(updateData);

      expect(mockAllocationService.updateAllocation).toHaveBeenCalledWith(
        'alloc-1',
        { allocatedHours: 30 }
      );
    });
  });

  describe('useDeleteAllocation', () => {
    it('deletes allocation successfully', async () => {
      mockAllocationService.deleteAllocation.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useDeleteAllocation(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync('alloc-1');

      expect(mockAllocationService.deleteAllocation).toHaveBeenCalledWith('alloc-1');
    });
  });

  describe('useEmployeeAllocations', () => {
    it('fetches employee allocations', async () => {
      mockAllocationService.getEmployeeAllocations.mockResolvedValue(mockAllocationsResponse);

      const { result } = renderHook(
        () => useEmployeeAllocations('emp-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAllocationsResponse);
      });

      expect(mockAllocationService.getEmployeeAllocations).toHaveBeenCalledWith(
        'emp-1',
        undefined,
        undefined
      );
    });

    it('applies filters and pagination', async () => {
      const filters = { status: 'active' as const };
      const pagination = { page: 1, limit: 10 };

      mockAllocationService.getEmployeeAllocations.mockResolvedValue(mockAllocationsResponse);

      renderHook(
        () => useEmployeeAllocations('emp-1', filters, pagination),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAllocationService.getEmployeeAllocations).toHaveBeenCalledWith(
          'emp-1',
          filters,
          pagination
        );
      });
    });
  });

  describe('useProjectAllocations', () => {
    it('fetches project allocations', async () => {
      mockAllocationService.getProjectAllocations.mockResolvedValue(mockAllocationsResponse);

      const { result } = renderHook(
        () => useProjectAllocations('proj-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockAllocationsResponse);
      });

      expect(mockAllocationService.getProjectAllocations).toHaveBeenCalledWith(
        'proj-1',
        undefined,
        undefined
      );
    });
  });

  describe('useUtilization', () => {
    it('fetches utilization data', async () => {
      mockAllocationService.getEmployeeUtilization.mockResolvedValue(mockUtilizationData);

      const { result } = renderHook(
        () => useUtilization('emp-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockUtilizationData);
      });

      expect(mockAllocationService.getEmployeeUtilization).toHaveBeenCalledWith(
        'emp-1',
        undefined,
        undefined
      );
    });

    it('includes date range', async () => {
      mockAllocationService.getEmployeeUtilization.mockResolvedValue(mockUtilizationData);

      renderHook(
        () => useUtilization('emp-1', '2024-01-01', '2024-01-31'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAllocationService.getEmployeeUtilization).toHaveBeenCalledWith(
          'emp-1',
          '2024-01-01',
          '2024-01-31'
        );
      });
    });
  });

  describe('useConflicts', () => {
    it('fetches conflicts', async () => {
      mockAllocationService.getConflicts.mockResolvedValue([mockConflict]);

      const { result } = renderHook(
        () => useConflicts(),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual([mockConflict]);
      });

      expect(mockAllocationService.getConflicts).toHaveBeenCalledWith(undefined);
    });

    it('applies filters', async () => {
      const filters = { employeeId: 'emp-1', severity: 'high' };
      mockAllocationService.getConflicts.mockResolvedValue([mockConflict]);

      renderHook(
        () => useConflicts(filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAllocationService.getConflicts).toHaveBeenCalledWith(filters);
      });
    });
  });

  describe('useResolveConflict', () => {
    it('resolves conflict successfully', async () => {
      const mockResult = {
        success: true,
        updatedAllocations: [mockAllocation],
        remainingConflicts: [],
      };
      mockAllocationService.resolveConflict.mockResolvedValue(mockResult);

      const { result } = renderHook(
        () => useResolveConflict(),
        { wrapper: createWrapper() }
      );

      const resolution = {
        conflictId: 'conflict-1',
        resolutionType: 'reschedule' as const,
        parameters: { newStartDate: '2024-01-08' },
      };

      const response = await result.current.mutateAsync(resolution);

      expect(response).toEqual(mockResult);
      expect(mockAllocationService.resolveConflict).toHaveBeenCalledWith(resolution);
    });
  });

  describe('useCheckConflicts', () => {
    it('checks for conflicts', async () => {
      mockAllocationService.checkConflicts.mockResolvedValue([mockConflict]);

      const { result } = renderHook(
        () => useCheckConflicts(),
        { wrapper: createWrapper() }
      );

      const allocationData = {
        employeeId: 'emp-1',
        projectId: 'proj-1',
        startDate: '2024-01-01',
        endDate: '2024-01-07',
        allocatedHours: 40,
      };

      const conflicts = await result.current.mutateAsync(allocationData);

      expect(conflicts).toEqual([mockConflict]);
      expect(mockAllocationService.checkConflicts).toHaveBeenCalledWith(allocationData);
    });
  });

  describe('useBulkUpdateAllocations', () => {
    it('updates multiple allocations', async () => {
      const mockResult = {
        updated: [mockAllocation],
        conflicts: [],
        failed: [],
      };
      mockAllocationService.bulkUpdateAllocations.mockResolvedValue(mockResult);

      const { result } = renderHook(
        () => useBulkUpdateAllocations(),
        { wrapper: createWrapper() }
      );

      const updates = [{
        allocationId: 'alloc-1',
        startDate: '2024-01-08',
        endDate: '2024-01-14',
      }];

      const response = await result.current.mutateAsync(updates);

      expect(response).toEqual(mockResult);
      expect(mockAllocationService.bulkUpdateAllocations).toHaveBeenCalledWith(updates);
    });
  });

  describe('useCalendarData', () => {
    it('fetches calendar data', async () => {
      const mockCalendarData = {
        allocations: [mockAllocation],
        employees: [{ id: 'emp-1', name: 'John Doe' }],
        projects: [{ id: 'proj-1', name: 'Test Project', clientName: 'Test Client' }],
      };
      
      mockAllocationService.getCalendarData.mockResolvedValue(mockCalendarData);

      const { result } = renderHook(
        () => useCalendarData('2024-01-01', '2024-01-31'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCalendarData);
      });

      expect(mockAllocationService.getCalendarData).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
        undefined
      );
    });

    it('includes filters', async () => {
      const filters = { employeeId: 'emp-1' };
      const mockCalendarData = {
        allocations: [mockAllocation],
        employees: [{ id: 'emp-1', name: 'John Doe' }],
        projects: [{ id: 'proj-1', name: 'Test Project', clientName: 'Test Client' }],
      };
      
      mockAllocationService.getCalendarData.mockResolvedValue(mockCalendarData);

      renderHook(
        () => useCalendarData('2024-01-01', '2024-01-31', filters),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockAllocationService.getCalendarData).toHaveBeenCalledWith(
          '2024-01-01',
          '2024-01-31',
          filters
        );
      });
    });

    it('does not fetch when dates are missing', () => {
      const { result } = renderHook(
        () => useCalendarData('', ''),
        { wrapper: createWrapper() }
      );

      expect(result.current.data).toBeUndefined();
      expect(mockAllocationService.getCalendarData).not.toHaveBeenCalled();
    });
  });
});