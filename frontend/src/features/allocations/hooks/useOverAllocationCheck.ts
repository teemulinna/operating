import React from 'react';
import type { Allocation, Employee } from './useAllocationOperations';

export interface OverAllocationWarning {
  employeeId: string;
  employeeName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  weeklyCapacity: number;
  allocatedHours: number;
  overAllocationHours: number;
  utilizationRate: number;
  severity: 'warning' | 'critical';
  message: string;
  suggestions: string[];
  affectedAllocations: Array<{
    allocationId: string;
    projectName: string;
    allocatedHours: number;
  }>;
}

interface UseOverAllocationCheckReturn {
  checkOverAllocation: (
    employeeId: string,
    startDate: Date,
    endDate: Date,
    allocatedHours: number,
    excludeAllocationId?: string
  ) => OverAllocationWarning | null;
  getAllOverAllocations: () => OverAllocationWarning[];
  isEmployeeOverAllocated: (employeeId: string, weekStart: Date) => boolean;
  getWeeklyUtilization: (employeeId: string, weekStart: Date) => number;
}

export const useOverAllocationCheck = (
  allocations: Allocation[],
  employees: Employee[],
  projects: any[] = []
): UseOverAllocationCheckReturn => {

  const getWeeksInRange = (startDate: Date, endDate: Date): Date[] => {
    const weeks: Date[] = [];
    const current = new Date(startDate);
    
    // Find the Monday of the start week
    const monday = new Date(current);
    monday.setDate(current.getDate() - current.getDay() + 1);
    
    while (monday <= endDate) {
      weeks.push(new Date(monday));
      monday.setDate(monday.getDate() + 7);
    }
    
    return weeks;
  };

  const getWeeklyUtilization = React.useCallback((employeeId: string) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const relevantAllocations = allocations.filter(allocation => {
      if (allocation.employeeId !== employeeId) return false;
      if (allocation.status === 'cancelled') return false;
      
      const allocStart = new Date(allocation.startDate);
      const allocEnd = new Date(allocation.endDate);
      
      // Check if allocation overlaps with the week
      return allocStart <= weekEnd && allocEnd >= weekStart;
    });

    return relevantAllocations.reduce((total, allocation) => total + allocation.allocatedHours, 0);
  }, [allocations]);

  const isEmployeeOverAllocated = React.useCallback((employeeId: string, weekStart: Date): boolean => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return false;

    const weeklyHours = getWeeklyUtilization(employeeId, weekStart);
    return weeklyHours > (employee.workingHours || 40);
  }, [employees, getWeeklyUtilization]);

  const checkOverAllocation = React.useCallback((
    employeeId: string,
    startDate: Date,
    endDate: Date,
    allocatedHours: number,
    excludeAllocationId?: string
  ): OverAllocationWarning | null => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return null;

    const weeks = getWeeksInRange(startDate, endDate);
    const weeklyCapacity = employee.workingHours || 40;

    // Find the worst week for over-allocation
    let worstWeek: {
      weekStart: Date;
      totalHours: number;
      overAllocation: number;
      affectedAllocations: Array<{
        allocationId: string;
        projectName: string;
        allocatedHours: number;
      }>;
    } | null = null;

    for (const weekStart of weeks) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Get existing allocations for this week
      const existingAllocations = allocations.filter(allocation => {
        if (allocation.employeeId !== employeeId) return false;
        if (allocation.status === 'cancelled') return false;
        if (excludeAllocationId && allocation.id === excludeAllocationId) return false;
        
        const allocStart = new Date(allocation.startDate);
        const allocEnd = new Date(allocation.endDate);
        
        return allocStart <= weekEnd && allocEnd >= weekStart;
      });

      const existingHours = existingAllocations.reduce((total, allocation) => total + allocation.allocatedHours, 0);
      const totalHours = existingHours + allocatedHours;
      const overAllocation = totalHours - weeklyCapacity;

      if (overAllocation > 0 && (!worstWeek || overAllocation > worstWeek.overAllocation)) {
        const affectedAllocations = [
          ...existingAllocations.map(allocation => ({
            allocationId: allocation.id,
            projectName: projects.find(p => p.id === allocation.projectId)?.name || 'Unknown Project',
            allocatedHours: allocation.allocatedHours
          })),
          {
            allocationId: 'new',
            projectName: 'New Allocation',
            allocatedHours: allocatedHours
          }
        ];

        worstWeek = {
          weekStart,
          totalHours,
          overAllocation,
          affectedAllocations
        };
      }
    }

    if (!worstWeek) return null;

    const utilizationRate = (worstWeek.totalHours / weeklyCapacity) * 100;
    const severity = utilizationRate >= 150 ? 'critical' : 'warning';

    const suggestions = [];
    if (worstWeek.overAllocation <= 8) {
      suggestions.push('Consider reducing hours on one of the projects');
      suggestions.push('Ask if overtime is acceptable for this period');
    } else {
      suggestions.push('Redistribute work across multiple team members');
      suggestions.push('Consider extending project timelines');
      suggestions.push('Evaluate project priorities and postpone lower priority work');
    }

    if (worstWeek.affectedAllocations.length > 3) {
      suggestions.push('Consider consolidating similar projects');
    }

    const weekEnd = new Date(worstWeek.weekStart);
    weekEnd.setDate(worstWeek.weekStart.getDate() + 6);

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      weekStartDate: worstWeek.weekStart,
      weekEndDate: weekEnd,
      weeklyCapacity,
      allocatedHours: worstWeek.totalHours,
      overAllocationHours: worstWeek.overAllocation,
      utilizationRate,
      severity,
      message: `${employee.firstName} ${employee.lastName} is over-allocated by ${worstWeek.overAllocation} hours (${utilizationRate.toFixed(1)}% utilization) during the week of ${worstWeek.weekStart.toLocaleDateString()}`,
      suggestions,
      affectedAllocations: worstWeek.affectedAllocations
    };
  }, [allocations, employees, projects]);

  const getAllOverAllocations = React.useCallback((): OverAllocationWarning[] => {
    const warnings: OverAllocationWarning[] = [];
    const checkedWeeks = new Set<string>();

    // Check all existing allocations for over-allocations
    for (const allocation of allocations) {
      if (allocation.status === 'cancelled') continue;

      const startDate = new Date(allocation.startDate);
      const endDate = new Date(allocation.endDate);
      const weeks = getWeeksInRange(startDate, endDate);

      for (const weekStart of weeks) {
        const weekKey = `${allocation.employeeId}-${weekStart.getTime()}`;
        if (checkedWeeks.has(weekKey)) continue;
        checkedWeeks.add(weekKey);

        if (isEmployeeOverAllocated(allocation.employeeId, weekStart)) {
          const employee = employees.find(e => e.id === allocation.employeeId);
          if (!employee) continue;

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          const weeklyHours = getWeeklyUtilization(allocation.employeeId, weekStart);
          const weeklyCapacity = employee.workingHours || 40;
          const overAllocation = weeklyHours - weeklyCapacity;
          const utilizationRate = (weeklyHours / weeklyCapacity) * 100;

          // Get affected allocations for this week
          const affectedAllocations = allocations
            .filter(alloc => {
              if (alloc.employeeId !== allocation.employeeId) return false;
              if (alloc.status === 'cancelled') return false;
              
              const allocStart = new Date(alloc.startDate);
              const allocEnd = new Date(alloc.endDate);
              
              return allocStart <= weekEnd && allocEnd >= weekStart;
            })
            .map(alloc => ({
              allocationId: alloc.id,
              projectName: projects.find(p => p.id === alloc.projectId)?.name || 'Unknown Project',
              allocatedHours: alloc.allocatedHours
            }));

          warnings.push({
            employeeId: allocation.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            weeklyCapacity,
            allocatedHours: weeklyHours,
            overAllocationHours: overAllocation,
            utilizationRate,
            severity: utilizationRate >= 150 ? 'critical' : 'warning',
            message: `${employee.firstName} ${employee.lastName} is over-allocated by ${overAllocation} hours (${utilizationRate.toFixed(1)}% utilization)`,
            suggestions: [
              'Consider reducing hours on one of the projects',
              'Redistribute work across team members',
              'Evaluate project priorities'
            ],
            affectedAllocations
          });
        }
      }
    }

    return warnings;
  }, [allocations, employees, projects, isEmployeeOverAllocated, getWeeklyUtilization]);

  return {
    checkOverAllocation,
    getAllOverAllocations,
    isEmployeeOverAllocated,
    getWeeklyUtilization
  };
};