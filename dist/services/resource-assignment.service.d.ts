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
interface SkillRequirement {
    skill_id: string;
    required_level: number;
    is_mandatory: boolean;
}
interface ProjectRequirements {
    project_id: number;
    roles_needed: Array<{
        role_name: string;
        count: number;
        skills: SkillRequirement[];
        allocation_percentage: number;
        start_date: string;
        end_date?: string;
    }>;
}
interface ResourceAvailability {
    employee_id: string;
    available_percentage: number;
    start_date: string;
    end_date?: string;
    current_allocations: number;
    skills: Array<{
        skill_id: string;
        level: number;
    }>;
}
interface OptimizationResult {
    assignments: ResourceAssignmentData[];
    total_cost: number;
    coverage_score: number;
    utilization_score: number;
    conflicts: Array<{
        employee_id: string;
        message: string;
    }>;
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
    assignResourcesToProject(projectId: number, assignments: Array<{
        employee_id: string;
        role?: string;
        allocation_percentage: number;
        start_date: string;
        end_date?: string;
        hourly_rate?: number;
    }>): Promise<any[]>;
    optimizeResourceAllocation(projectRequirements: ProjectRequirements): Promise<OptimizationResult>;
    getResourceAvailability(startDate: string, endDate: string, filters?: {
        department_id?: string;
        skills?: string[];
        min_availability?: number;
    }): Promise<ResourceAvailability[]>;
    findBestMatchingResources(skillRequirements: SkillRequirement[], count: number, constraints?: {
        start_date?: string;
        end_date?: string;
        min_allocation?: number;
        department_id?: string;
    }): Promise<Array<{
        employee_id: string;
        first_name: string;
        last_name: string;
        position: string;
        skill_match_score: number;
        available_percentage: number;
        hourly_rate?: number;
        matching_skills: Array<{
            skill_id: string;
            level: number;
            required_level: number;
        }>;
    }>>;
    validateAllocation(employeeId: string, projectId: number, startDate: string, endDate: string | undefined, allocationPercentage: number): Promise<{
        isValid: boolean;
        warnings: string[];
        errors: string[];
        recommendations: string[];
    }>;
    private calculateWeeksBetween;
}
export {};
//# sourceMappingURL=resource-assignment.service.d.ts.map