export const __esModule: boolean;
export class OverAllocationWarningService {
    db: any;
    checkOverAllocation(employeeId: any): Promise<{
        employeeId: any;
        employeeName: string;
        weekStartDate: any;
        weekEndDate: any;
        weeklyCapacity: any;
        allocatedHours: any;
        overAllocationHours: number;
        utilizationRate: number;
        severity: any;
        message: string;
        suggestions: string[];
        affectedAllocations: any;
    } | null>;
    batchCheckOverAllocations(employeeIds: any, startDate: any, endDate: any): Promise<({
        employeeId: any;
        employeeName: string;
        weekStartDate: any;
        weekEndDate: any;
        weeklyCapacity: any;
        allocatedHours: any;
        overAllocationHours: number;
        utilizationRate: number;
        severity: any;
        message: string;
        suggestions: string[];
        affectedAllocations: any;
    } | null)[]>;
    getOverAllocationSummary(): Promise<{
        hasOverAllocations: boolean;
        totalWarnings: number;
        totalCritical: number;
        criticalCount: number;
        warnings: {
            employeeId: any;
            employeeName: string;
            weekStartDate: any;
            weekEndDate: any;
            weeklyCapacity: any;
            allocatedHours: any;
            overAllocationHours: number;
            utilizationRate: number;
            severity: any;
            message: string;
            suggestions: string[];
            affectedAllocations: any;
        }[];
        weeklyBreakdown: {
            weekStartDate: Date;
            weekEndDate: Date;
            warningCount: number;
            criticalCount: number;
        }[];
        totalEmployees: any;
        overAllocatedCount: number;
        averageUtilization: number;
    }>;
    checkWeeklyOverAllocation(employeeId: any, weekStartDate: any, weekEndDate: any): Promise<{
        employeeId: any;
        employeeName: string;
        weekStartDate: any;
        weekEndDate: any;
        weeklyCapacity: any;
        allocatedHours: any;
        overAllocationHours: number;
        utilizationRate: number;
        severity: any;
        message: string;
        suggestions: string[];
        affectedAllocations: any;
    } | null>;
    calculateOverAllocationMetrics(employeeId: any, weekStartDate: any, weekEndDate: any): Promise<{
        weeklyCapacity: any;
        allocatedHours: any;
        overAllocationHours: number;
        utilizationRate: number;
    }>;
    determineSeverity(weeklyCapacity: any, allocatedHours: any): any;
    getScheduleViewWarnings(startDate: any, endDate: any): Promise<{
        hasOverAllocations: boolean;
        totalWarnings: number;
        totalCritical: number;
        warnings: {
            employeeId: any;
            employeeName: string;
            weekStartDate: any;
            weekEndDate: any;
            weeklyCapacity: any;
            allocatedHours: any;
            overAllocationHours: number;
            utilizationRate: number;
            severity: any;
            message: string;
            suggestions: string[];
            affectedAllocations: any;
        }[];
        weeklyBreakdown: {
            weekStartDate: Date;
            weekEndDate: any;
            warningCount: number;
            criticalCount: number;
        }[];
    }>;
    getEmployeeAllocationsInRange(employeeId: any, startDate: any, endDate: any): Promise<any>;
    calculateWeeklyHours(allocations: any, weekStartDate: any, weekEndDate: any): any;
    getWeeksBetween(startDate: any, endDate: any): {
        weekStartDate: Date;
        weekEndDate: any;
    }[];
    formatEmployeeName(employee: any): string;
}
//# sourceMappingURL=over-allocation-warning.service.d.ts.map