"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverAllocationWarningService = void 0;
const types_1 = require("../types");
const database_service_1 = require("../database/database.service");
// Use the imported OverAllocationSeverity enum from types
class OverAllocationWarningService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    /**
     * Check for over-allocation for a specific employee
     */
    async checkOverAllocation(employeeId) {
        // Default to current week
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        return this.checkWeeklyOverAllocation(employeeId, weekStart, weekEnd);
    }
    /**
     * Batch check over-allocations for multiple employees in a date range
     */
    async batchCheckOverAllocations(employeeIds, startDate, endDate) {
        const warnings = [];
        for (const employeeId of employeeIds) {
            try {
                // Get weeks in the date range
                const weeks = this.getWeeksBetween(startDate, endDate);
                // Check each week for this employee
                for (const week of weeks) {
                    const warning = await this.checkWeeklyOverAllocation(employeeId, week.weekStartDate, week.weekEndDate);
                    if (warning) {
                        warnings.push(warning);
                        break; // Only add first warning found for this employee
                    }
                }
                // If no warnings found, add null to maintain array order
                if (warnings.length < employeeIds.indexOf(employeeId) + 1) {
                    warnings.push(null);
                }
            }
            catch (error) {
                console.error(`Error checking allocation for employee ${employeeId}:`, error);
                warnings.push(null);
            }
        }
        return warnings;
    }
    /**
     * Get over-allocation summary for all employees
     */
    async getOverAllocationSummary() {
        try {
            // Get all active employees
            const employeesQuery = `
        SELECT id, first_name, last_name, COALESCE(weekly_capacity_hours, weekly_hours, 40) as capacity_hours
        FROM employees
        WHERE status = 'active'
      `;
            const employeesResult = await this.db.query(employeesQuery);
            const employees = employeesResult.rows;
            const totalEmployees = employees.length;
            let overAllocatedCount = 0;
            let criticalCount = 0;
            const warnings = [];
            let totalUtilization = 0;
            // Check current week for all employees
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            for (const employee of employees) {
                const warning = await this.checkWeeklyOverAllocation(employee.id, weekStart, weekEnd);
                if (warning) {
                    warnings.push(warning);
                    overAllocatedCount++;
                    if (warning.severity === types_1.OverAllocationSeverity.CRITICAL) {
                        criticalCount++;
                    }
                    totalUtilization += warning.utilizationRate;
                }
                else {
                    // Calculate utilization even if not over-allocated
                    const metrics = await this.calculateOverAllocationMetrics(employee.id, weekStart, weekEnd);
                    totalUtilization += metrics.utilizationRate;
                }
            }
            const averageUtilization = totalEmployees > 0 ? totalUtilization / totalEmployees : 0;
            return {
                hasOverAllocations: overAllocatedCount > 0,
                totalWarnings: overAllocatedCount - criticalCount, // Non-critical warnings
                totalCritical: criticalCount,
                criticalCount, // Alias for test compatibility
                warnings,
                weeklyBreakdown: [{
                        weekStartDate: weekStart,
                        weekEndDate: weekEnd,
                        warningCount: overAllocatedCount - criticalCount,
                        criticalCount
                    }],
                totalEmployees,
                overAllocatedCount,
                averageUtilization
            };
        }
        catch (error) {
            console.error('Error getting over-allocation summary:', error);
            throw new types_1.DatabaseError('Failed to get over-allocation summary');
        }
    }
    /**
     * Check for over-allocation for a specific employee in a given week
     */
    async checkWeeklyOverAllocation(employeeId, weekStartDate, weekEndDate) {
        try {
            // Get employee details
            const employeeQuery = `
        SELECT id, first_name, last_name, COALESCE(weekly_capacity_hours, weekly_hours, 40) as capacity_hours
        FROM employees
        WHERE id = $1 AND status = 'active'
      `;
            const employeeResult = await this.db.query(employeeQuery, [employeeId]);
            if (employeeResult.rows.length === 0) {
                throw new types_1.DatabaseError('Employee not found or inactive');
            }
            const employee = employeeResult.rows[0];
            // Get allocations for the employee in the given week using direct database queries
            const allocations = await this.getEmployeeAllocationsInRange(employeeId, weekStartDate, weekEndDate);
            // Calculate total allocated hours for the week
            const totalAllocatedHours = this.calculateWeeklyHours(allocations, weekStartDate, weekEndDate);
            // Check if over-allocated
            const weeklyCapacity = employee.capacity_hours || 40;
            if (totalAllocatedHours <= weeklyCapacity) {
                return null; // No over-allocation
            }
            // Calculate over-allocation metrics
            const overAllocationHours = totalAllocatedHours - weeklyCapacity;
            const utilizationRate = (totalAllocatedHours / weeklyCapacity) * 100;
            const severity = this.determineSeverity(weeklyCapacity, totalAllocatedHours);
            // Create affected allocations list with project details
            const affectedAllocations = allocations.map(allocation => ({
                allocationId: String(allocation.id),
                projectName: allocation.project_name || `Project ${allocation.project_id}`,
                allocatedHours: allocation.allocated_hours || 0
            }));
            return {
                employeeId,
                employeeName: this.formatEmployeeName(employee),
                weekStartDate,
                weekEndDate,
                weeklyCapacity,
                allocatedHours: totalAllocatedHours,
                overAllocationHours,
                utilizationRate,
                severity,
                message: `${this.formatEmployeeName(employee)} is over-allocated by ${overAllocationHours} hours (${utilizationRate.toFixed(1)}% utilization)`,
                suggestions: [
                    `Consider reducing allocation by ${overAllocationHours} hours`,
                    'Review project priorities and deadlines',
                    'Consider redistributing work to other team members'
                ],
                affectedAllocations
            };
        }
        catch (error) {
            console.error('Error checking weekly over-allocation:', error);
            if (error instanceof types_1.DatabaseError) {
                throw error;
            }
            throw new types_1.DatabaseError('Failed to check over-allocation');
        }
    }
    /**
     * Calculate over-allocation metrics for an employee
     */
    async calculateOverAllocationMetrics(employeeId, weekStartDate, weekEndDate) {
        const employeeQuery = `
      SELECT COALESCE(weekly_capacity_hours, weekly_hours, 40) as capacity_hours
      FROM employees
      WHERE id = $1 AND status = 'active'
    `;
        const employeeResult = await this.db.query(employeeQuery, [employeeId]);
        if (employeeResult.rows.length === 0) {
            throw new types_1.DatabaseError('Employee not found or inactive');
        }
        const allocations = await this.getEmployeeAllocationsInRange(employeeId, weekStartDate, weekEndDate);
        const weeklyCapacity = employeeResult.rows[0].capacity_hours || 40;
        const allocatedHours = this.calculateWeeklyHours(allocations, weekStartDate, weekEndDate);
        const overAllocationHours = Math.max(0, allocatedHours - weeklyCapacity);
        const utilizationRate = (allocatedHours / weeklyCapacity) * 100;
        return {
            weeklyCapacity,
            allocatedHours,
            overAllocationHours,
            utilizationRate
        };
    }
    /**
     * Determine severity level based on over-allocation percentage
     */
    determineSeverity(weeklyCapacity, allocatedHours) {
        if (allocatedHours <= weeklyCapacity) {
            return types_1.OverAllocationSeverity.LOW;
        }
        const overAllocationPercentage = ((allocatedHours - weeklyCapacity) / weeklyCapacity) * 100;
        if (overAllocationPercentage <= 5)
            return types_1.OverAllocationSeverity.LOW; // 1-5% over
        if (overAllocationPercentage <= 20)
            return types_1.OverAllocationSeverity.MEDIUM; // 6-20% over
        if (overAllocationPercentage <= 40)
            return types_1.OverAllocationSeverity.HIGH; // 21-40% over
        return types_1.OverAllocationSeverity.CRITICAL; // >40% over
    }
    /**
     * Get all over-allocation warnings for schedule view
     */
    async getScheduleViewWarnings(startDate, endDate) {
        const warnings = [];
        const weeklyBreakdown = [];
        // Get all weeks in the date range
        const weeks = this.getWeeksBetween(startDate, endDate);
        // Get all employees
        const employeesQuery = `
      SELECT id FROM employees WHERE status = 'active'
    `;
        const employeesResult = await this.db.query(employeesQuery);
        for (const week of weeks) {
            let weekWarningCount = 0;
            let weekCriticalCount = 0;
            for (const employee of employeesResult.rows) {
                const warning = await this.checkWeeklyOverAllocation(employee.id, week.weekStartDate, week.weekEndDate);
                if (warning) {
                    warnings.push(warning);
                    weekWarningCount++;
                    if (warning.severity === types_1.OverAllocationSeverity.CRITICAL) {
                        weekCriticalCount++;
                    }
                }
            }
            weeklyBreakdown.push({
                weekStartDate: week.weekStartDate,
                weekEndDate: week.weekEndDate,
                warningCount: weekWarningCount,
                criticalCount: weekCriticalCount
            });
        }
        const totalWarnings = warnings.filter(w => w.severity !== types_1.OverAllocationSeverity.CRITICAL).length;
        const totalCritical = warnings.filter(w => w.severity === types_1.OverAllocationSeverity.CRITICAL).length;
        return {
            hasOverAllocations: warnings.length > 0,
            totalWarnings,
            totalCritical,
            warnings,
            weeklyBreakdown
        };
    }
    // Helper methods for internal calculations
    /**
     * Get all allocations for an employee within a date range using direct database queries
     */
    async getEmployeeAllocationsInRange(employeeId, startDate, endDate) {
        const query = `
      SELECT
        a.id,
        a.project_id,
        a.allocated_hours,
        a.start_date,
        a.end_date,
        p.name as project_name
      FROM allocations a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.employee_id = $1
        AND a.status IN ('tentative', 'confirmed')
        AND a.start_date <= $3
        AND COALESCE(a.end_date, '9999-12-31') >= $2
    `;
        const result = await this.db.query(query, [employeeId, startDate, endDate]);
        return result.rows;
    }
    /**
     * Calculate total hours for allocations within a specific week
     */
    calculateWeeklyHours(allocations, weekStartDate, weekEndDate) {
        return allocations.reduce((total, allocation) => {
            // Check if allocation overlaps with the week
            const allocStart = new Date(allocation.start_date || new Date());
            const allocEnd = new Date(allocation.end_date || new Date());
            if (allocStart <= weekEndDate && allocEnd >= weekStartDate) {
                // For simplicity, we'll use the full allocated hours if there's any overlap
                // In a real implementation, you might want to prorate based on actual overlap
                return total + (allocation.allocated_hours || 0);
            }
            return total;
        }, 0);
    }
    /**
     * Get weeks between two dates
     */
    getWeeksBetween(startDate, endDate) {
        const weeks = [];
        const current = new Date(startDate);
        while (current < endDate) {
            const weekStart = new Date(current);
            const weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 6); // 7-day week
            weeks.push({
                weekStartDate: weekStart,
                weekEndDate: Math.min(weekEnd.getTime(), endDate.getTime()) === endDate.getTime()
                    ? endDate
                    : weekEnd
            });
            current.setDate(current.getDate() + 7);
        }
        return weeks;
    }
    /**
     * Format employee name
     */
    formatEmployeeName(employee) {
        return `${employee.first_name} ${employee.last_name}`;
    }
}
exports.OverAllocationWarningService = OverAllocationWarningService;
