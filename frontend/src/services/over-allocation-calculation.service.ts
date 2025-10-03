import { Allocation } from '../types/allocation';
import { format, parseISO, isSameWeek, startOfWeek, endOfWeek } from 'date-fns';

export interface EmployeeCapacity {
  employeeId: string;
  employeeName: string;
  weeklyCapacity: number;
  capacity: number;
}

export interface WeeklyAllocation {
  weekStart: Date;
  weekEnd: Date;
  employeeId: string;
  allocations: Allocation[];
  totalHours: number;
  capacity: number;
  utilizationRate: number;
  isOverAllocated: boolean;
  overAllocationHours: number;
}

export interface OverAllocationSummary {
  employeeId: string;
  employeeName: string;
  weeklyCapacity: number;
  weeklyAllocations: WeeklyAllocation[];
  hasOverAllocation: boolean;
  maxUtilizationRate: number;
  totalOverAllocationHours: number;
  severity: 'none' | 'medium' | 'high' | 'critical';
  warnings: string[];
  suggestions: string[];
}

class OverAllocationCalculationService {
  /**
   * Calculate over-allocation for an employee across multiple weeks
   */
  calculateEmployeeOverAllocation(
    employeeId: string,
    employeeName: string,
    weeklyCapacity: number,
    allocations: Allocation[],
    dateRange?: { start: Date; end: Date }
  ): OverAllocationSummary {
    // Filter allocations for this employee
    const employeeAllocations = allocations.filter(alloc => alloc.employeeId === employeeId);

    // Group allocations by week
    const weeklyData = this.groupAllocationsByWeek(employeeAllocations, weeklyCapacity, dateRange);

    // Calculate summary metrics
    const hasOverAllocation = weeklyData.some(week => week.isOverAllocated);
    const maxUtilizationRate = Math.max(...weeklyData.map(week => week.utilizationRate), 0);
    const totalOverAllocationHours = weeklyData.reduce(
      (sum, week) => sum + week.overAllocationHours,
      0
    );

    // Determine severity
    const severity = this.calculateSeverity(maxUtilizationRate, hasOverAllocation);

    // Generate warnings and suggestions
    const warnings = this.generateWarnings(weeklyData);
    const suggestions = this.generateSuggestions(weeklyData);

    return {
      employeeId,
      employeeName,
      weeklyCapacity,
      weeklyAllocations: weeklyData,
      hasOverAllocation,
      maxUtilizationRate,
      totalOverAllocationHours,
      severity,
      warnings,
      suggestions
    };
  }

  /**
   * Calculate over-allocation for multiple employees
   */
  calculateMultipleEmployeeOverAllocation(
    employees: EmployeeCapacity[],
    allocations: Allocation[],
    dateRange?: { start: Date; end: Date }
  ): OverAllocationSummary[] {
    return employees.map(employee => 
      this.calculateEmployeeOverAllocation(
        employee.employeeId,
        employee.employeeName,
        employee.weeklyCapacity,
        allocations,
        dateRange
      )
    );
  }

  /**
   * Calculate real-time over-allocation for a specific week
   */
  calculateWeeklyOverAllocation(
    employeeId: string,
    weekStart: Date,
    weeklyCapacity: number,
    allocations: Allocation[]
  ): WeeklyAllocation {
    const weekEnd = endOfWeek(weekStart);
    
    // Filter allocations for this employee and week
    const weekAllocations = allocations.filter(alloc => {
      const allocStart = parseISO(alloc.startDate);
      const allocEnd = parseISO(alloc.endDate);
      
      return alloc.employeeId === employeeId && (
        isSameWeek(allocStart, weekStart) ||
        isSameWeek(allocEnd, weekStart) ||
        (allocStart <= weekStart && allocEnd >= weekEnd)
      );
    });

    // Calculate total hours for the week
    const totalHours = weekAllocations.reduce(
      (sum, alloc) => sum + (alloc.allocatedHours || 0),
      0
    );

    const utilizationRate = weeklyCapacity > 0 ? (totalHours / weeklyCapacity) * 100 : 0;
    const isOverAllocated = utilizationRate > 100;
    const overAllocationHours = Math.max(0, totalHours - weeklyCapacity);

    return {
      weekStart,
      weekEnd,
      employeeId,
      allocations: weekAllocations,
      totalHours,
      capacity: weeklyCapacity,
      utilizationRate,
      isOverAllocated,
      overAllocationHours
    };
  }

  /**
   * Group allocations by week
   */
  private groupAllocationsByWeek(
    allocations: Allocation[],
    weeklyCapacity: number,
    dateRange?: { start: Date; end: Date }
  ): WeeklyAllocation[] {
    const weeks = new Map<string, Allocation[]>();

    // Group allocations by week
    allocations.forEach(alloc => {
      const allocStart = parseISO(alloc.startDate);
      const allocEnd = parseISO(alloc.endDate);

      // Generate weeks that this allocation spans
      let currentWeek = startOfWeek(allocStart);
      const endWeek = startOfWeek(allocEnd);

      while (currentWeek <= endWeek) {
        // Check if week is within date range filter
        if (!dateRange || (currentWeek >= dateRange.start && currentWeek <= dateRange.end)) {
          const weekKey = format(currentWeek, 'yyyy-MM-dd');
          
          if (!weeks.has(weekKey)) {
            weeks.set(weekKey, []);
          }
          weeks.get(weekKey)!.push(alloc);
        }
        
        currentWeek = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    });

    // Convert to WeeklyAllocation objects
    return Array.from(weeks.entries()).map(([weekKey, weekAllocations]) => {
      const weekStart = parseISO(weekKey);
      const weekEnd = endOfWeek(weekStart);
      
      const totalHours = weekAllocations.reduce(
        (sum, alloc) => sum + (alloc.allocatedHours || 0),
        0
      );
      
      const utilizationRate = weeklyCapacity > 0 ? (totalHours / weeklyCapacity) * 100 : 0;
      const isOverAllocated = utilizationRate > 100;
      const overAllocationHours = Math.max(0, totalHours - weeklyCapacity);

      return {
        weekStart,
        weekEnd,
        employeeId: weekAllocations[0]?.employeeId || '',
        allocations: weekAllocations,
        totalHours,
        capacity: weeklyCapacity,
        utilizationRate,
        isOverAllocated,
        overAllocationHours
      };
    }).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  /**
   * Calculate severity based on utilization rate
   */
  private calculateSeverity(
    maxUtilizationRate: number,
    hasOverAllocation: boolean
  ): 'none' | 'medium' | 'high' | 'critical' {
    if (!hasOverAllocation || maxUtilizationRate <= 100) {
      return 'none';
    }
    
    if (maxUtilizationRate <= 120) {
      return 'medium';
    }
    
    if (maxUtilizationRate <= 150) {
      return 'high';
    }
    
    return 'critical';
  }

  /**
   * Generate warning messages
   */
  private generateWarnings(weeklyData: WeeklyAllocation[]): string[] {
    const warnings: string[] = [];
    const overAllocatedWeeks = weeklyData.filter(week => week.isOverAllocated);

    if (overAllocatedWeeks.length === 0) {
      return warnings;
    }

    warnings.push(
      `Employee is over-allocated in ${overAllocatedWeeks.length} week${overAllocatedWeeks.length > 1 ? 's' : ''}`
    );

    const maxWeek = weeklyData.reduce((max, week) => 
      week.utilizationRate > max.utilizationRate ? week : max
    );

    if (maxWeek.utilizationRate > 150) {
      warnings.push(
        `Critical over-allocation: ${Math.round(maxWeek.utilizationRate)}% capacity in week of ${format(maxWeek.weekStart, 'MMM dd')}`
      );
    } else if (maxWeek.utilizationRate > 120) {
      warnings.push(
        `High over-allocation: ${Math.round(maxWeek.utilizationRate)}% capacity in week of ${format(maxWeek.weekStart, 'MMM dd')}`
      );
    }

    const totalOverHours = weeklyData.reduce((sum, week) => sum + week.overAllocationHours, 0);
    if (totalOverHours > 0) {
      warnings.push(
        `Total excess hours: ${totalOverHours}h across all over-allocated weeks`
      );
    }

    return warnings;
  }

  /**
   * Generate resolution suggestions
   */
  private generateSuggestions(weeklyData: WeeklyAllocation[]): string[] {
    const suggestions: string[] = [];
    const overAllocatedWeeks = weeklyData.filter(week => week.isOverAllocated);

    if (overAllocatedWeeks.length === 0) {
      return suggestions;
    }

    // Suggest redistribution
    suggestions.push(
      'Redistribute allocations to spread workload across available weeks'
    );

    // Suggest reducing allocation hours
    const maxOverAllocation = Math.max(...overAllocatedWeeks.map(week => week.overAllocationHours));
    if (maxOverAllocation > 0) {
      suggestions.push(
        `Reduce allocation hours by ${maxOverAllocation}h in the most over-allocated week`
      );
    }

    // Suggest team assistance
    if (overAllocatedWeeks.some(week => week.utilizationRate > 120)) {
      suggestions.push(
        'Consider reassigning some tasks to other team members with available capacity'
      );
    }

    // Suggest deadline adjustment
    if (overAllocatedWeeks.length > 1) {
      suggestions.push(
        'Consider extending project deadlines to allow for more reasonable allocation'
      );
    }

    return suggestions;
  }
}

export const overAllocationCalculationService = new OverAllocationCalculationService();
export default overAllocationCalculationService;
