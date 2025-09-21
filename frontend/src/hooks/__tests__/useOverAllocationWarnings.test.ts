import { renderHook, act, waitFor } from '@testing-library/react';
import { useOverAllocationWarnings } from '../useOverAllocationWarnings';
import { overAllocationWarningService } from '../../services/over-allocation-warning.service';

// Mock the service
jest.mock('../../services/over-allocation-warning.service');

const mockOverAllocationWarningService = overAllocationWarningService as jest.Mocked<typeof overAllocationWarningService>;

describe('useOverAllocationWarnings Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading Warnings', () => {
    it('should load over-allocation warnings for employee', async () => {
      // Arrange
      const mockWarningData = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 50,
        defaultHours: 40,
        overAllocationHours: 10,
        utilizationRate: 125,
        severity: 'high' as const,
        warnings: ['Employee is over-allocated by 10 hours (125% capacity)']
      };

      mockOverAllocationWarningService.getEmployeeWarnings.mockResolvedValue(mockWarningData);

      // Act
      const { result } = renderHook(() => useOverAllocationWarnings('emp-1'));

      // Assert
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.warnings).toEqual([mockWarningData]);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle error when loading warnings fails', async () => {
      // Arrange
      const errorMessage = 'Failed to load warnings';
      mockOverAllocationWarningService.getEmployeeWarnings.mockRejectedValue(new Error(errorMessage));

      // Act
      const { result } = renderHook(() => useOverAllocationWarnings('emp-1'));

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.warnings).toEqual([]);
        expect(result.current.error).toEqual(expect.objectContaining({
          message: errorMessage
        }));
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should refetch warnings when employee allocation changes', async () => {
      // Arrange
      const initialWarning = {
        isOverAllocated: false,
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 30,
        defaultHours: 40,
        overAllocationHours: 0,
        utilizationRate: 75,
        severity: 'none' as const,
        warnings: []
      };

      const updatedWarning = {
        ...initialWarning,
        isOverAllocated: true,
        totalAllocatedHours: 45,
        overAllocationHours: 5,
        utilizationRate: 112.5,
        severity: 'medium' as const,
        warnings: ['Employee is over-allocated by 5 hours (112.5% capacity)']
      };

      mockOverAllocationWarningService.getEmployeeWarnings
        .mockResolvedValueOnce(initialWarning)
        .mockResolvedValueOnce(updatedWarning);

      // Act
      const { result } = renderHook(() => useOverAllocationWarnings('emp-1'));

      await waitFor(() => {
        expect(result.current.warnings[0]?.isOverAllocated).toBe(false);
      });

      // Simulate allocation change
      await act(async () => {
        await result.current.refetch();
      });

      // Assert
      await waitFor(() => {
        expect(result.current.warnings[0]?.isOverAllocated).toBe(true);
        expect(result.current.warnings[0]?.overAllocationHours).toBe(5);
      });
    });

    it('should automatically refetch warnings on interval', async () => {
      // Arrange
      const mockWarning = {
        isOverAllocated: true,
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalAllocatedHours: 50,
        defaultHours: 40,
        overAllocationHours: 10,
        utilizationRate: 125,
        severity: 'high' as const,
        warnings: ['Employee is over-allocated by 10 hours (125% capacity)']
      };

      mockOverAllocationWarningService.getEmployeeWarnings.mockResolvedValue(mockWarning);

      // Act
      const { result } = renderHook(() => 
        useOverAllocationWarnings('emp-1', { refreshInterval: 1000 })
      );

      // Assert - Initial call
      await waitFor(() => {
        expect(result.current.warnings).toHaveLength(1);
      });

      // Advance timers to trigger interval refresh
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockOverAllocationWarningService.getEmployeeWarnings).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Multiple Employee Warnings', () => {
    it('should load warnings for multiple employees', async () => {
      // Arrange
      const employeeWarnings = [
        {
          isOverAllocated: true,
          employeeId: 'emp-1',
          employeeName: 'John Doe',
          totalAllocatedHours: 50,
          defaultHours: 40,
          overAllocationHours: 10,
          utilizationRate: 125,
          severity: 'high' as const,
          warnings: ['Employee is over-allocated by 10 hours (125% capacity)']
        },
        {
          isOverAllocated: true,
          employeeId: 'emp-2',
          employeeName: 'Jane Smith',
          totalAllocatedHours: 42,
          defaultHours: 40,
          overAllocationHours: 2,
          utilizationRate: 105,
          severity: 'medium' as const,
          warnings: ['Employee is slightly over-allocated by 2 hours (105% capacity)']
        }
      ];

      mockOverAllocationWarningService.getAllWarnings.mockResolvedValue(employeeWarnings);

      // Act
      const { result } = renderHook(() => useOverAllocationWarnings());

      // Assert
      await waitFor(() => {
        expect(result.current.warnings).toHaveLength(2);
        expect(result.current.warnings).toEqual(employeeWarnings);
      });
    });
  });

  describe('Warning Calculations', () => {
    it('should correctly calculate over-allocation hours and percentage', async () => {
      // Arrange - This test should initially fail since calculation logic isn't implemented
      const { result } = renderHook(() => useOverAllocationWarnings('emp-1'));

      // Act & Assert
      await act(async () => {
        const calculation = result.current.calculateOverAllocation([
          { allocatedHours: 30, startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
          { allocatedHours: 20, startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') }
        ], 40);

        expect(calculation).toEqual({
          totalAllocatedHours: 50,
          defaultHours: 40,
          overAllocationHours: 10,
          utilizationRate: 125,
          isOverAllocated: true
        });
      });
    });

    it('should handle overlapping allocation periods correctly', async () => {
      // Arrange - This test should initially fail since overlap handling isn't implemented
      const { result } = renderHook(() => useOverAllocationWarnings('emp-1'));

      // Act & Assert
      await act(async () => {
        const calculation = result.current.calculateOverAllocationWithOverlaps([
          { 
            allocatedHours: 40, 
            startDate: new Date('2024-01-01'), 
            endDate: new Date('2024-01-15') // First half of month
          },
          { 
            allocatedHours: 40, 
            startDate: new Date('2024-01-10'), 
            endDate: new Date('2024-01-25') // Overlaps with first allocation
          }
        ], 40);

        // Should detect the overlap period and calculate correctly
        expect(calculation.hasOverlap).toBe(true);
        expect(calculation.maxUtilizationRate).toBeGreaterThan(100);
      });
    });
  });
});