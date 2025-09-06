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
    constructor();
    createAssignment(assignmentData: ResourceAssignmentData): Promise<any>;
    validateEmployeeCapacity(employeeId: string, startDate: string, endDate: string | undefined, plannedAllocation: number, excludeAssignmentId?: string): Promise<void>;
    getEmployeeAssignments(employeeId: string): Promise<any>;
    getProjectAssignments(projectId: number): Promise<any[]>;
    getActiveAssignments(projectId: number): Promise<any[]>;
    updateAssignment(assignmentId: string, updateData: Partial<ResourceAssignmentData>): Promise<any>;
    deleteAssignment(assignmentId: string): Promise<void>;
    private getAssignmentById;
    private getAssignmentWithDetails;
    private getUtilizationStatus;
    getResourceConflicts(): Promise<any[]>;
}
export {};
//# sourceMappingURL=resource-assignment.service.d.ts.map