import { useState, useEffect, useCallback } from 'react';
import { OverAllocationWarning, AllocationPeriod, OverAllocationCalculation } from '../types/over-allocation-warning.types';
import { overAllocationWarningService } from '../services/over-allocation-warning.service';

interface UseOverAllocationWarningsOptions {
  refreshInterval?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface UseOverAllocationWarningsReturn {
  warnings: OverAllocationWarning[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  calculateOverAllocation: (periods: AllocationPeriod[], defaultHours: number) => OverAllocationCalculation;
  calculateOverAllocationWithOverlaps: (periods: AllocationPeriod[], defaultHours: number) => OverAllocationCalculation & { hasOverlap: boolean; maxUtilizationRate: number };
}

export function useOverAllocationWarnings(
  employeeId?: string,
  options: UseOverAllocationWarningsOptions = {}
): UseOverAllocationWarningsReturn {
  const [warnings, setWarnings] = useState<OverAllocationWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (employeeId) {
        // Fetch warnings for specific employee
        const warning = await overAllocationWarningService.getEmployeeWarnings(
          employeeId,
          options.startDate,
          options.endDate
        );
        setWarnings([warning]);
      } else {
        // Fetch warnings for all employees
        const allWarnings = await overAllocationWarningService.getAllWarnings(
          options.startDate,
          options.endDate
        );
        setWarnings(allWarnings);
      }
    } catch (err) {
      console.error('Failed to fetch over-allocation warnings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, options.startDate, options.endDate]);

  const refetch = useCallback(async () => {
    await fetchWarnings();
  }, [fetchWarnings]);

  // Calculate over-allocation for given periods
  const calculateOverAllocation = useCallback((periods: AllocationPeriod[], defaultHours: number): OverAllocationCalculation => {
    if (periods.length === 0) {
      return {
        totalAllocatedHours: 0,
        defaultHours,
        overAllocationHours: 0,
        utilizationRate: 0,
        isOverAllocated: false
      };
    }

    const totalAllocatedHours = periods.reduce((sum, period) => sum + period.allocatedHours, 0);
    const utilizationRate = (totalAllocatedHours / defaultHours) * 100;
    const overAllocationHours = Math.max(0, totalAllocatedHours - defaultHours);
    const isOverAllocated = utilizationRate > 100;

    return {
      totalAllocatedHours,
      defaultHours,
      overAllocationHours,
      utilizationRate,
      isOverAllocated
    };
  }, []);

  // Calculate over-allocation with overlap detection
  const calculateOverAllocationWithOverlaps = useCallback((
    periods: AllocationPeriod[], 
    defaultHours: number
  ): OverAllocationCalculation & { hasOverlap: boolean; maxUtilizationRate: number } => {
    if (periods.length === 0) {
      return {
        totalAllocatedHours: 0,
        defaultHours,
        overAllocationHours: 0,
        utilizationRate: 0,
        isOverAllocated: false,
        hasOverlap: false,
        maxUtilizationRate: 0
      };
    }

    // Simple approach: sum all hours (overlaps would be counted multiple times)
    const totalAllocatedHours = periods.reduce((sum, period) => sum + period.allocatedHours, 0);

    // Detect overlaps by checking if any periods intersect
    let hasOverlap = false;
    let maxUtilizationInOverlap = 0;

    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const period1 = periods[i]!;
        const period2 = periods[j]!;
        
        // Check if periods overlap
        if (period1.startDate < period2.endDate && period2.startDate < period1.endDate) {
          hasOverlap = true;
          const overlapHours = period1.allocatedHours + period2.allocatedHours;
          const overlapUtilization = (overlapHours / defaultHours) * 100;
          maxUtilizationInOverlap = Math.max(maxUtilizationInOverlap, overlapUtilization);
        }
      }
    }

    const utilizationRate = (totalAllocatedHours / defaultHours) * 100;
    const maxUtilizationRate = Math.max(utilizationRate, maxUtilizationInOverlap);

    return {
      totalAllocatedHours,
      defaultHours,
      overAllocationHours: Math.max(0, totalAllocatedHours - defaultHours),
      utilizationRate,
      isOverAllocated: utilizationRate > 100 || hasOverlap,
      hasOverlap,
      maxUtilizationRate
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const intervalId = setInterval(fetchWarnings, options.refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchWarnings, options.refreshInterval]);

  return {
    warnings,
    loading,
    error,
    refetch,
    calculateOverAllocation,
    calculateOverAllocationWithOverlaps
  };
}