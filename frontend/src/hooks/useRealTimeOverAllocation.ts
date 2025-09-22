import { useState, useEffect, useCallback, useMemo } from 'react';
import { Allocation } from '../types/allocation';
import { 
  overAllocationCalculationService,
  OverAllocationSummary,
  WeeklyAllocation,
  EmployeeCapacity
} from '../services/over-allocation-calculation.service';

interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  weeklyCapacity?: number;
  capacity?: number;
}

interface UseRealTimeOverAllocationOptions {
  refreshInterval?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeInactive?: boolean;
}

interface UseRealTimeOverAllocationReturn {
  // Summary data
  overAllocationSummaries: OverAllocationSummary[];
  
  // Loading states
  loading: boolean;
  error: Error | null;
  
  // Actions
  refetch: () => Promise<void>;
  
  // Helper functions
  getEmployeeOverAllocation: (employeeId: string) => OverAllocationSummary | null;
  getWeeklyOverAllocation: (employeeId: string, weekStart: Date) => WeeklyAllocation | null;
  isEmployeeOverAllocated: (employeeId: string) => boolean;
  getEmployeeUtilizationRate: (employeeId: string;
  getEmployeeWarningLevel: (employeeId: string) => 'none' | 'medium' | 'high' | 'critical';
  
  // Statistics
  overAllocatedEmployeeCount: number;
  totalOverAllocationHours: number;
  avgUtilizationRate: number;
}

export function useRealTimeOverAllocation(
  employees: Employee[] = [],
  allocations: Allocation[] = [],
  options: UseRealTimeOverAllocationOptions = {}
): UseRealTimeOverAllocationReturn {
  const [overAllocationSummaries, setOverAllocationSummaries] = useState<OverAllocationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Transform employees to EmployeeCapacity format
  const employeeCapacities = useMemo((): EmployeeCapacity[] => {
    return employees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${emp.id}`,
      weeklyCapacity: emp.weeklyCapacity || emp.capacity || 40,
      capacity: emp.capacity || emp.weeklyCapacity || 40
    }));
  }, [employees]);

  // Calculate over-allocation summaries
  const calculateOverAllocations = useCallback(async () => {
    if (employeeCapacities.length === 0) {
      setOverAllocationSummaries([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Filter allocations if needed
      let filteredAllocations = allocations;
      if (!options.includeInactive) {
        filteredAllocations = allocations.filter(alloc => alloc.isActive !== false);
      }

      // Calculate over-allocation for all employees
      const summaries = overAllocationCalculationService.calculateMultipleEmployeeOverAllocation(
        employeeCapacities,
        filteredAllocations,
        options.dateRange
      );

      setOverAllocationSummaries(summaries);
    } catch (err) {
      console.error('Failed to calculate over-allocations:', err);
      setError(err instanceof Error ? err : new Error('Calculation failed'));
    } finally {
      setLoading(false);
    }
  }, [employeeCapacities, allocations, options.dateRange, options.includeInactive]);

  // Helper function to get employee over-allocation
  const getEmployeeOverAllocation = useCallback((employeeId: string): OverAllocationSummary | null => {
    return overAllocationSummaries.find(summary => summary.employeeId === employeeId) || null;
  }, [overAllocationSummaries]);

  // Helper function to get weekly over-allocation
  const getWeeklyOverAllocation = useCallback((
    employeeId: string,
    weekStart: Date
  ): WeeklyAllocation | null => {
    const employee = employeeCapacities.find(emp => emp.employeeId === employeeId);
    if (!employee) return null;

    return overAllocationCalculationService.calculateWeeklyOverAllocation(
      employeeId,
      weekStart,
      employee.weeklyCapacity,
      allocations
    );
  }, [employeeCapacities, allocations]);

  // Helper function to check if employee is over-allocated
  const isEmployeeOverAllocated = useCallback((employeeId: string): boolean => {
    const summary = getEmployeeOverAllocation(employeeId);
    return summary?.hasOverAllocation || false;
  }, [getEmployeeOverAllocation]);

  // Helper function to get employee utilization rate
  const getEmployeeUtilizationRate = useCallback((employeeId: string => {
    const summary = getEmployeeOverAllocation(employeeId);
    return summary?.maxUtilizationRate || 0;
  }, [getEmployeeOverAllocation]);

  // Helper function to get employee warning level
  const getEmployeeWarningLevel = useCallback((employeeId: string): 'none' | 'medium' | 'high' | 'critical' => {
    const summary = getEmployeeOverAllocation(employeeId);
    return summary?.severity || 'none';
  }, [getEmployeeOverAllocation]);

  // Refetch function
  const refetch = useCallback(async () => {
    await calculateOverAllocations();
  }, [calculateOverAllocations]);

  // Statistics
  const statistics = useMemo(() => {
    const overAllocatedCount = overAllocationSummaries.filter(summary => summary.hasOverAllocation).length;
    const totalOverHours = overAllocationSummaries.reduce(
      (sum, summary) => sum + summary.totalOverAllocationHours,
      0
    );
    const avgUtilization = overAllocationSummaries.length > 0
      ? overAllocationSummaries.reduce(
          (sum, summary) => sum + summary.maxUtilizationRate,
          0
        ) / overAllocationSummaries.length
      : 0;

    return {
      overAllocatedEmployeeCount: overAllocatedCount,
      totalOverAllocationHours: totalOverHours,
      avgUtilizationRate: avgUtilization
    };
  }, [overAllocationSummaries]);

  // Calculate over-allocations when dependencies change
  useEffect(() => {
    calculateOverAllocations();
  }, [calculateOverAllocations]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const intervalId = setInterval(() => {
        calculateOverAllocations();
      }, options.refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [calculateOverAllocations, options.refreshInterval]);

  return {
    // Summary data
    overAllocationSummaries,
    
    // Loading states
    loading,
    error,
    
    // Actions
    refetch,
    
    // Helper functions
    getEmployeeOverAllocation,
    getWeeklyOverAllocation,
    isEmployeeOverAllocated,
    getEmployeeUtilizationRate,
    getEmployeeWarningLevel,
    
    // Statistics
    ...statistics
  };
}

export default useRealTimeOverAllocation;
