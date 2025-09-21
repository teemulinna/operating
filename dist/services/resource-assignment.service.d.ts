interface ResourceAssignmentData {
    project_id: number;
    employee_id: string;
    project_role_id?: string;
    assignment_type?: string;
    start_date: string;
    end_date?: string;
    planned_allocation_percentage: number;
    hourly_rate?: number;
    confidence_level?: string;
    notes?: string;
}
export declare class ResourceAssignmentService {
    private db;
    private static assignmentCount;
    constructor();
    static resetAssignmentTracking(): void;
    createAssignment(assignmentData: ResourceAssignmentData): Promise<any>;
    validateEmployeeCapacity(employeeId: string, startDate: string, endDate: string | undefined, plannedAllocation: number, excludeAssignmentId?: number): Promise<void>;
    getEmployeeAssignments(employeeId: string): Promise<any>;
    getProjectAssignments(projectId: number): Promise<any[]>;
    getActiveAssignments(projectId: number): Promise<any[]>;
    updateAssignment(assignmentId: number, updateData: Partial<ResourceAssignmentData>): Promise<any>;
    deleteAssignment(assignmentId: number): Promise<void>;
    private getAssignmentById;
    private getAssignmentWithDetails;
    private getUtilizationStatus;
    getEmployeesByIds(employeeIds: string[]): Promise<any[]>;
    getAllEmployees(): Promise<any[]>;
    getEmployeeById(employeeId: string): Promise<any | null>;
    getAssignmentsInPeriod(startDate: string, endDate: string): Promise<any[]>;
    getHistoricalResourceData(startDate: string, endDate: string): Promise<any[]>;
    getAssignmentsByEmployee(employeeId: string): Promise<any[]>;
    getResourceConflicts(): Promise<any[]>;
}
export {};
//# sourceMappingURL=resource-assignment.service.d.ts.map