import { ResourceAssignmentService } from './resource-assignment.service';
import { ProjectService } from './project.service';
export interface EmployeeAvailability {
    employeeId: number;
    totalHours: number;
    allocatedHours: number;
    availableHours: number;
    utilizationRate: number;
    conflicts: ResourceConflict[];
}
export interface ResourceConflict {
    conflictType: 'overlap' | 'overallocation';
    assignmentIds: number[];
    overlapDays: number;
    overAllocationHours: number;
    severity: 'low' | 'medium' | 'high';
}
export interface SkillMatch {
    employee: any;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    confidence: number;
}
export interface OptimizationResult {
    recommendations: ResourceRecommendation[];
    totalCost: number;
    completionTime: number;
    feasible: boolean;
    conflicts: ResourceConflict[];
    efficiency: number;
}
export interface ResourceRecommendation {
    employeeId: number;
    projectId: number;
    role: string;
    allocatedHours: number;
    confidence: number;
    reasoning: string;
}
export interface ProjectRequirements {
    projectId: number;
    requiredSkills: string[];
    duration: number;
    effortHours: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    startDate?: Date;
    endDate?: Date;
}
export declare class CapacityEngineService {
    private resourceAssignmentService;
    private projectService;
    constructor(resourceAssignmentService: ResourceAssignmentService, projectService: ProjectService);
    calculateEmployeeAvailability(employeeId: number, startDate: Date, endDate: Date): Promise<EmployeeAvailability>;
    findSkillMatches(requiredSkills: string[], employees: any[]): Promise<SkillMatch[]>;
    optimizeResourceAllocation(requirements: ProjectRequirements): Promise<OptimizationResult>;
    detectConflicts(assignments: any[]): Promise<ResourceConflict[]>;
    private calculateWorkingDays;
    private createTimeSlots;
    private getAssignmentTimeSlots;
    private calculateSkillMatchConfidence;
    private suggestRole;
    private identifyPotentialConflicts;
    private calculateOverlap;
    private calculateOverAllocation;
    private assessConflictSeverity;
}
//# sourceMappingURL=capacity-engine.service.d.ts.map