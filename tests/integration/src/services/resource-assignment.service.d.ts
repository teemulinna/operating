export const __esModule: boolean;
export class ResourceAssignmentService {
    static resetAssignmentTracking(): void;
    db: any;
    createAssignment(assignmentData: any): Promise<{
        id: any;
        project_id: any;
        employee_id: any;
        start_date: any;
        end_date: any;
        plannedAllocationPercentage: any;
        allocated_hours: any;
        role: any;
        status: any;
        notes: any;
    }>;
    validateEmployeeCapacity(employeeId: any, startDate: any, endDate: any, plannedAllocation: any, excludeAssignmentId: any): Promise<void>;
    getEmployeeAssignments(employeeId: any): Promise<{
        employeeId: any;
        assignments: any;
        summary: {
            totalAssignments: any;
            activeAssignments: any;
            totalAllocation: number;
            totalHours: number;
            utilizationStatus: string;
        };
    }>;
    getProjectAssignments(projectId: any): Promise<any>;
    getActiveAssignments(projectId: any): Promise<any>;
    updateAssignment(assignmentId: any, updateData: any): Promise<any>;
    deleteAssignment(assignmentId: any): Promise<void>;
    getAssignmentById(assignmentId: any): Promise<any>;
    getAssignmentWithDetails(assignmentId: any): Promise<any>;
    getUtilizationStatus(allocation: any): "over-allocated" | "fully-allocated" | "highly-utilized" | "available";
    getEmployeesByIds(employeeIds: any): Promise<any>;
    getAllEmployees(): Promise<any>;
    getEmployeeById(employeeId: any): Promise<any>;
    getAssignmentsInPeriod(startDate: any, endDate: any): Promise<any>;
    getHistoricalResourceData(startDate: any, endDate: any): Promise<any>;
    getAssignmentsByEmployee(employeeId: any): Promise<any>;
    getResourceConflicts(): Promise<any>;
    assignResourcesToProject(projectId: any, assignments: any): Promise<{
        id: any;
        project_id: any;
        employee_id: any;
        start_date: any;
        end_date: any;
        plannedAllocationPercentage: any;
        allocated_hours: any;
        role: any;
        status: any;
        notes: any;
    }[]>;
    optimizeResourceAllocation(projectRequirements: any): Promise<{
        assignments: {
            project_id: any;
            employee_id: any;
            assignment_type: any;
            start_date: any;
            end_date: any;
            planned_allocation_percentage: any;
            hourly_rate: any;
            confidence_level: string;
        }[];
        total_cost: number;
        coverage_score: number;
        utilization_score: number;
        conflicts: {
            employee_id: any;
            message: string;
        }[];
    }>;
    getResourceAvailability(startDate: any, endDate: any, filters: any): Promise<any>;
    findBestMatchingResources(skillRequirements: any, count: any, constraints: any): Promise<any>;
    validateAllocation(employeeId: any, projectId: any, startDate: any, endDate: any, allocationPercentage: any): Promise<{
        isValid: boolean;
        warnings: string[];
        errors: string[];
        recommendations: string[];
    }>;
    calculateWeeksBetween(startDate: any, endDate: any): number;
}
export namespace ResourceAssignmentService {
    let assignmentCount: Map<any, any>;
}
//# sourceMappingURL=resource-assignment.service.d.ts.map