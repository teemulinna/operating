export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    position: string;
    hireDate: Date;
    isActive: boolean;
    weeklyCapacity: number;
    salary?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface Department {
    id: string;
    name: string;
    description?: string;
    managerId?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Skill {
    id: string;
    name: string;
    description?: string;
    category: SkillCategory;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmployeeSkill {
    id: string;
    employeeId: string;
    skillId: string;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number;
    lastAssessed?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CapacityHistory {
    id: string;
    employeeId: string;
    date: Date;
    availableHours: number;
    allocatedHours: number;
    utilizationRate: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Project {
    id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    priority?: ProjectPriority;
    clientId?: string;
    clientName?: string;
    startDate: Date;
    endDate: Date;
    estimatedHours?: number;
    actualHours?: number;
    budget?: number;
    hourlyRate?: number;
    costToDate?: number;
    managerId?: string;
    createdBy?: number;
    createdAt: Date;
    updatedAt: Date;
    isActive?: boolean;
}
export interface ResourceAllocation {
    id: number;
    projectId?: number;
    project_id?: number;
    employeeId?: string;
    employee_id?: string;
    allocatedHours?: number;
    allocated_hours?: number;
    allocationPercentage?: number;
    allocation_percentage?: number;
    hourlyRate?: number;
    billableRate?: number;
    billable_rate?: number;
    roleOnProject?: string;
    role?: string;
    startDate?: Date;
    start_date?: Date;
    endDate?: Date;
    end_date?: Date;
    actualHours?: number;
    actual_hours?: number;
    notes?: string;
    status?: string;
    utilizationTarget?: number;
    utilization_target?: number;
    isActive?: boolean;
    is_active?: boolean;
    createdAt?: Date;
    created_at?: Date;
    updatedAt?: Date;
    updated_at?: Date;
}
export interface SkillRequirement {
    id: string;
    projectId: string;
    skillId: string;
    minimumProficiency: ProficiencyLevel;
    requiredCount: number;
    fulfilled: boolean;
    priority: RequirementPriority;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum SkillCategory {
    TECHNICAL = "technical",
    SOFT = "soft",
    LANGUAGE = "language",
    CERTIFICATION = "certification",
    DOMAIN = "domain"
}
export declare enum ProficiencyLevel {
    BEGINNER = 1,
    INTERMEDIATE = 2,
    ADVANCED = 3,
    EXPERT = 4,
    MASTER = 5
}
export declare enum ProjectStatus {
    PLANNING = "planning",
    ACTIVE = "active",
    ON_HOLD = "on_hold",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum ProjectPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum RequirementPriority {
    OPTIONAL = "optional",
    PREFERRED = "preferred",
    REQUIRED = "required",
    CRITICAL = "critical"
}
export interface CreateEmployeeInput {
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    position: string;
    hireDate: Date;
    weeklyCapacity?: number;
    salary?: number;
}
export interface UpdateEmployeeInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    departmentId?: string;
    position?: string;
    isActive?: boolean;
    weeklyCapacity?: number;
    salary?: number;
}
export interface CreateDepartmentInput {
    name: string;
    description?: string;
    managerId?: string;
}
export interface UpdateDepartmentInput {
    name?: string;
    description?: string;
    managerId?: string;
    isActive?: boolean;
}
export interface CreateSkillInput {
    name: string;
    description?: string;
    category: SkillCategory;
}
export interface UpdateSkillInput {
    name?: string;
    description?: string;
    category?: SkillCategory;
    isActive?: boolean;
}
export interface CreateEmployeeSkillInput {
    employeeId: string;
    skillId: string;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number;
    lastAssessed?: Date;
}
export interface UpdateEmployeeSkillInput {
    proficiencyLevel?: ProficiencyLevel;
    yearsOfExperience?: number;
    lastAssessed?: Date;
    isActive?: boolean;
}
export interface CreateCapacityHistoryInput {
    employeeId: string;
    date: Date;
    availableHours: number;
    allocatedHours: number;
    notes?: string;
}
export interface UpdateCapacityHistoryInput {
    availableHours?: number;
    allocatedHours?: number;
    notes?: string;
}
export interface CreateProjectInput {
    name: string;
    description?: string;
    status: ProjectStatus;
    priority?: ProjectPriority;
    clientId?: string;
    clientName?: string;
    startDate: Date;
    endDate: Date;
    estimatedHours?: number;
    budget?: number;
    hourlyRate?: number;
    managerId?: string;
    createdBy?: number;
}
export interface UpdateProjectInput {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    clientId?: string;
    clientName?: string;
    startDate?: Date;
    endDate?: Date;
    estimatedHours?: number;
    actualHours?: number;
    budget?: number;
    hourlyRate?: number;
    costToDate?: number;
    managerId?: string;
    isActive?: boolean;
}
export interface CreateResourceAllocationInput {
    projectId: number;
    employeeId: string;
    allocatedHours?: number;
    allocationPercentage?: number;
    hourlyRate?: number;
    billableRate?: number;
    roleOnProject?: string;
    role?: string;
    startDate: Date;
    endDate: Date;
    status?: string;
    notes?: string;
    utilizationTarget?: number;
}
export declare enum AllocationStatus {
    TENTATIVE = "tentative",
    CONFIRMED = "confirmed",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export interface AllocationOverlap {
    allocationId: number;
    projectName: string;
    startDate: Date;
    endDate: Date;
    allocatedHours: number;
}
export interface CapacityMetrics {
    employeeId: string;
    totalAllocatedHours: number;
    utilizationRate: number;
    conflictCount: number;
    activeAllocations: number;
}
export interface AllocationConflictReport {
    hasConflicts: boolean;
    conflicts: AllocationOverlap[];
    suggestions: string[];
}
export interface CapacityValidationResult {
    isValid: boolean;
    warnings: string[];
    maxCapacityHours: number;
    currentAllocatedHours: number;
    utilizationRate: number;
}
export interface UtilizationSummary {
    totalEmployees: number;
    averageUtilization: number;
    overutilizedCount: number;
    underutilizedCount: number;
    totalAllocations: number;
    conflictsCount: number;
}
export declare enum OverAllocationSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface OverAllocationWarning {
    employeeId: string;
    employeeName: string;
    weekStartDate: Date;
    weekEndDate: Date;
    defaultHours: number;
    allocatedHours: number;
    overAllocationHours: number;
    utilizationRate: number;
    severity: OverAllocationSeverity;
    message: string;
    suggestions: string[];
    affectedAllocations: Array<{
        allocationId: string;
        projectName: string;
        allocatedHours: number;
    }>;
}
export interface OverAllocationSummary {
    hasOverAllocations: boolean;
    totalWarnings: number;
    totalCritical: number;
    criticalCount?: number;
    warnings: OverAllocationWarning[];
    weeklyBreakdown: Array<{
        weekStartDate: Date;
        weekEndDate: Date;
        warningCount: number;
        criticalCount: number;
    }>;
    totalEmployees?: number;
    overAllocatedCount?: number;
    averageUtilization?: number;
}
export interface UpdateResourceAllocationInput {
    allocatedHours?: number;
    allocationPercentage?: number;
    hourlyRate?: number;
    billableRate?: number;
    roleOnProject?: string;
    role?: string;
    startDate?: Date;
    endDate?: Date;
    actualHours?: number;
    notes?: string;
    status?: string;
    utilizationTarget?: number;
    isActive?: boolean;
}
export interface CreateSkillRequirementInput {
    projectId: string;
    skillId: string;
    minimumProficiency: ProficiencyLevel;
    requiredCount: number;
    priority: RequirementPriority;
}
export interface UpdateSkillRequirementInput {
    minimumProficiency?: ProficiencyLevel;
    requiredCount?: number;
    fulfilled?: boolean;
    priority?: RequirementPriority;
}
export interface EmployeeFilters {
    departmentId?: string;
    position?: string;
    isActive?: boolean;
    skillIds?: string[];
    minProficiencyLevel?: ProficiencyLevel;
}
export interface SkillFilters {
    category?: SkillCategory;
    isActive?: boolean;
}
export interface CapacityFilters {
    employeeId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minUtilizationRate?: number;
    maxUtilizationRate?: number;
}
export interface ProjectFilters {
    status?: ProjectStatus;
    priority?: ProjectPriority;
    managerId?: string;
    clientId?: string;
    clientName?: string;
    startDateFrom?: Date;
    startDateTo?: Date;
    endDateFrom?: Date;
    endDateTo?: Date;
    isActive?: boolean;
}
export interface ResourceAllocationFilters {
    projectId?: string;
    employeeId?: string;
    startDateFrom?: Date;
    startDateTo?: Date;
    endDateFrom?: Date;
    endDateTo?: Date;
    isActive?: boolean;
}
export interface SkillRequirementFilters {
    projectId?: string;
    skillId?: string;
    minimumProficiency?: ProficiencyLevel;
    fulfilled?: boolean;
    priority?: RequirementPriority;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface EmployeeWithSkills extends Employee {
    skills: Array<EmployeeSkill & {
        skill: Skill;
    }>;
    department: Department;
}
export interface DepartmentWithEmployees extends Department {
    employees: Employee[];
    manager?: Employee;
}
export interface ProjectWithDetails extends Project {
    allocations: Array<ResourceAllocation & {
        employee: Employee;
    }>;
    skillRequirements: Array<SkillRequirement & {
        skill: Skill;
    }>;
    manager: Employee;
}
export interface ResourceAllocationWithDetails extends ResourceAllocation {
    project: Project;
    employee: Employee;
}
export interface EmployeeWithCapacity extends Employee {
    currentAllocations: ResourceAllocation[];
    skills: Array<EmployeeSkill & {
        skill: Skill;
    }>;
    capacityHistory: CapacityHistory[];
    hourlyRate?: number;
    totalAllocatedHours: number;
    utilizationRate: number;
}
export interface ResourcePlanningDashboard {
    totalProjects: number;
    activeProjects: number;
    totalEmployees: number;
    utilizationSummary: {
        averageUtilization: number;
        overutilizedEmployees: number;
        underutilizedEmployees: number;
    };
    projectsByStatus: Record<ProjectStatus, number>;
    skillGaps: Array<{
        skill: Skill;
        requiredCount: number;
        availableCount: number;
        gap: number;
    }>;
}
export interface ProjectStatistics {
    totalProjects: number;
    projectsByStatus: Record<string, number>;
    totalBudget: number;
    averageBudget: number;
    averageHourlyRate: number;
}
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    poolSize?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}
export interface ValidationError {
    field: string;
    message: string;
    value: any;
}
export interface SkillMatchCriteria {
    requiredSkills: Array<{
        skillId: string;
        skillName: string;
        category: SkillCategory;
        minimumProficiency: ProficiencyLevel;
        weight: number;
        isRequired: boolean;
    }>;
    projectId?: string;
    roleTitle?: string;
    experienceLevel?: 'junior' | 'mid' | 'senior' | 'lead';
    availabilityHours?: number;
    startDate?: Date;
    endDate?: Date;
}
export interface EmployeeSkillMatch {
    employeeId: string;
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        position: string;
        departmentId: string;
        departmentName?: string;
    };
    overallMatchScore: number;
    skillMatches: Array<{
        skillId: string;
        skillName: string;
        category: SkillCategory;
        required: boolean;
        weight: number;
        hasSkill: boolean;
        employeeProficiency: ProficiencyLevel | null;
        requiredProficiency: ProficiencyLevel;
        proficiencyGap: number;
        matchScore: number;
        yearsOfExperience?: number;
        lastUsed?: Date;
    }>;
    strengthAreas: string[];
    gapAreas: string[];
    availabilityScore: number;
    teamFitScore: number;
    overallRecommendation: 'excellent' | 'good' | 'fair' | 'poor';
    reasoningNotes: string[];
}
export interface TeamChemistryAnalysis {
    overallChemistryScore: number;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    skillComplementarity: {
        score: number;
        overlapAreas: string[];
        gapAreas: string[];
        redundantSkills: string[];
        uniqueContributions: Array<{
            employeeId: string;
            uniqueSkills: string[];
        }>;
    };
    experienceDiversity: {
        score: number;
        seniorityBalance: {
            junior: number;
            mid: number;
            senior: number;
            lead: number;
        };
        domainExpertise: Array<{
            domain: string;
            experts: string[];
            novices: string[];
        }>;
    };
    collaborationHistory: {
        score: number;
        successfulCollaborations: Array<{
            projectName: string;
            participants: string[];
            successScore: number;
            duration: number;
        }>;
        potentialConflicts: Array<{
            members: string[];
            reason: string;
            severity: 'low' | 'medium' | 'high';
        }>;
    };
    riskFactors: Array<{
        type: 'skill_gap' | 'personality_clash' | 'over_qualification' | 'under_qualification' | 'workload_imbalance';
        severity: 'low' | 'medium' | 'high';
        description: string;
        affectedMembers: string[];
        mitigation: string;
    }>;
    predictedPerformance: {
        velocityScore: number;
        qualityScore: number;
        innovationScore: number;
        stabilityScore: number;
    };
}
export interface ResourceRecommendation {
    recommendationId: string;
    projectId?: string;
    overallScore: number;
    confidence: 'high' | 'medium' | 'low';
    recommendedTeam: {
        members: Array<{
            employeeId: string;
            recommendedRole: string;
            matchScore: number;
            skillMatch: EmployeeSkillMatch;
            alternativeRoles?: string[];
        }>;
        totalCost?: number;
        teamChemistry: TeamChemistryAnalysis;
    };
    alternatives: Array<{
        members: Array<{
            employeeId: string;
            recommendedRole: string;
            matchScore: number;
        }>;
        overallScore: number;
        tradeoffs: string[];
    }>;
    reasoning: {
        keyStrengths: string[];
        potentialConcerns: string[];
        tradeoffs: string[];
        riskAssessment: {
            level: 'low' | 'medium' | 'high';
            factors: string[];
            mitigation: string[];
        };
    };
    optimizations: Array<{
        type: 'skill_training' | 'external_hire' | 'role_adjustment' | 'timeline_adjustment';
        description: string;
        impact: number;
        cost?: number;
        timeline?: string;
    }>;
}
export declare class DatabaseError extends Error {
    code?: string;
    constraint?: string;
    table?: string;
    detail?: string;
    constructor(message: string, code?: string);
}
//# sourceMappingURL=index.d.ts.map