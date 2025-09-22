export interface ProjectAllocation {
    projectId: number;
    roleId: number;
    allocationPercentage: number;
    startDate: string;
    endDate?: string;
}
export interface MultiProjectAssignmentData {
    employeeId: string;
    projectAllocations: ProjectAllocation[];
    startDate: string;
    endDate?: string;
    status: 'active' | 'planned' | 'completed' | 'cancelled';
}
export interface MultiProjectAssignment {
    id: number;
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    totalAllocation: number;
    startDate: string;
    endDate?: string;
    status: string;
    allocations: Array<{
        id: number;
        projectId: number;
        projectName: string;
        roleId: number;
        roleName: string;
        allocationPercentage: number;
        startDate: string;
        endDate?: string;
        status: string;
    }>;
    createdAt: string;
    updatedAt: string;
}
export interface EmployeeUtilization {
    employeeId: string;
    employeeName: string;
    totalAllocation: number;
    availableCapacity: number;
    projectCount: number;
    allocations: Array<{
        projectId: number;
        projectName: string;
        roleId: number;
        roleName: string;
        allocationPercentage: number;
        startDate: string;
        endDate?: string;
    }>;
}
export declare class MultiProjectAssignmentService {
    private db;
    constructor();
    createMultiProjectAssignment(data: MultiProjectAssignmentData): Promise<MultiProjectAssignment>;
    updateMultiProjectAssignment(assignmentId: number, updateData: Partial<MultiProjectAssignmentData>): Promise<MultiProjectAssignment>;
    getMultiProjectAssignmentById(assignmentId: number): Promise<MultiProjectAssignment>;
    getAssignmentsByEmployee(employeeId: string): Promise<MultiProjectAssignment[]>;
    getAssignmentsByProject(projectId: number): Promise<MultiProjectAssignment[]>;
    getAssignments(filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
        employeeId: string;
        projectId?: number;
    }): Promise<MultiProjectAssignment[]>;
    getEmployeeUtilization(employeeId: string): Promise<EmployeeUtilization>;
    private validateAssignmentData;
    private validateProjectsAndRoles;
    private validateNoConflicts;
    optimizeMultiProjectAssignments(options: AssignmentOptions): Promise<AssignmentResult>;
    private calculateSkillMatch;
}
//# sourceMappingURL=multi-project-assignment.service.d.ts.map