export interface ProjectAllocation {
    projectId: number;
    roleId: number;
    allocationPercentage: number;
    startDate: string;
    endDate?: string;
}
export interface MultiProjectAssignmentData {
    employeeId: number;
    projectAllocations: ProjectAllocation[];
    startDate: string;
    endDate?: string;
    status: 'active' | 'planned' | 'completed' | 'cancelled';
}
export interface MultiProjectAssignment {
    id: number;
    employeeId: number;
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
    employeeId: number;
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
    getAssignmentsByEmployee(employeeId: number): Promise<MultiProjectAssignment[]>;
    getAssignmentsByProject(projectId: number): Promise<MultiProjectAssignment[]>;
    getAssignments(filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
        employeeId?: number;
        projectId?: number;
    }): Promise<MultiProjectAssignment[]>;
    getEmployeeUtilization(employeeId: number): Promise<EmployeeUtilization>;
    private validateAssignmentData;
    private validateProjectsAndRoles;
    private validateNoConflicts;
}
//# sourceMappingURL=multi-project-assignment.service.d.ts.map