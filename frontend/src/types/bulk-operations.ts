// Bulk Operations and Team Management Types

export interface BulkOperationOptions {
  continueOnError?: boolean;
  batchSize?: number;
  validateBeforeCommit?: boolean;
  dryRun?: boolean;
  skipConflictCheck?: boolean;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: { data: T; error: string; index: number }[];
  conflicts?: Array<{
    type: string;
    description: string;
    affectedItems: number[];
  }>;
  totalProcessed: number;
  transactionId: string;
  duration: number; // milliseconds
  warnings?: string[];
}

// Bulk Allocation Operations
export interface BulkCreateAllocationRequest {
  allocations: CreateAllocationRequest[];
  options?: BulkOperationOptions;
}

export interface BulkUpdateAllocationRequest {
  updates: Array<{
    id: string;
    updates: Partial<UpdateAllocationRequest>;
  }>;
  options?: BulkOperationOptions;
}

export interface BulkDeleteAllocationRequest {
  ids: string[];
  options?: BulkOperationOptions & {
    cascadeDelete?: boolean;
  };
}

// Team Template System
export interface TeamTemplate {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  roles: TeamTemplateRole[];
  estimatedDurationDays?: number;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  usage: {
    timesUsed: number;
    lastUsed?: string;
  };
}

export interface TeamTemplateRole {
  id: string;
  templateId: string;
  roleName: string;
  description?: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  minimumExperienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
  allocationPercentage: number; // 0-100
  estimatedHours?: number;
  isRequired: boolean;
  priority: number; // 1-10, higher is more important
}

export interface CreateTeamTemplateRequest {
  name: string;
  description?: string;
  departmentId?: string;
  roles: Omit<TeamTemplateRole, 'id' | 'templateId'>[];
  estimatedDurationDays?: number;
  tags?: string[];
}

export interface UpdateTeamTemplateRequest extends Partial<CreateTeamTemplateRequest> {
  id: string;
}

// Team Management
export interface Team {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  leaderId?: string;
  leaderName?: string;
  members: TeamMember[];
  capacity: TeamCapacity;
  skills: SkillMatrix;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  role?: string;
  skills: string[];
  weeklyCapacity: number;
  currentUtilization: number;
  joinedDate: string;
  isActive: boolean;
}

export interface TeamCapacity {
  totalWeeklyHours: number;
  availableWeeklyHours: number;
  allocatedWeeklyHours: number;
  utilizationRate: number; // 0-100
  skillCoverage: Record<string, number>; // skill -> proficiency score
  overallReadiness: number; // 0-100
}

export interface SkillMatrix {
  skills: Array<{
    name: string;
    category: string;
    coverage: number; // percentage of team with this skill
    averageProficiency: number; // 1-5 scale
    critical: boolean;
  }>;
  gaps: Array<{
    skill: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  departmentId?: string;
  leaderId?: string;
  memberIds: string[];
}

export interface UpdateTeamRequest extends Partial<CreateTeamRequest> {
  id: string;
}

// Team Assignment Operations
export interface TeamAssignmentRequest {
  teamId: string;
  projectId: string;
  templateId?: string; // Use template for role assignments
  startDate: string;
  endDate?: string;
  roleAssignments?: Array<{
    employeeId: string;
    roleId?: string;
    customRole?: string;
    allocationPercentage: number;
    startDate?: string;
    endDate?: string;
  }>;
  options?: {
    autoAssignRoles?: boolean;
    allowPartialAssignment?: boolean;
    validateSkillMatch?: boolean;
  };
}

export interface TeamAssignmentResult {
  teamId: string;
  projectId: string;
  assignments: Array<{
    employeeId: string;
    allocationId: string;
    role: string;
    allocationPercentage: number;
    startDate: string;
    endDate?: string;
    skillMatch: number; // 0-100
    conflicts?: string[];
  }>;
  unassigned: Array<{
    employeeId: string;
    reason: string;
    suggestions?: string[];
  }>;
  warnings: string[];
  totalCapacityUsed: number;
}

// Copy/Paste Operations
export interface CopyAllocationRequest {
  sourceProjectId: string;
  targetProjectIds: string[];
  options?: {
    preserveDates?: boolean;
    adjustDates?: {
      offsetDays: number;
    };
    preserveAllocations?: boolean;
    adjustAllocations?: {
      scaleFactor: number; // 0.1 to 2.0
    };
    copyOnlyActiveAllocations?: boolean;
    roleMapping?: Record<string, string>; // old role -> new role
  };
}

export interface CopyAllocationResult {
  successful: Array<{
    sourceAllocationId: string;
    targetProjectId: string;
    newAllocationId: string;
  }>;
  failed: Array<{
    sourceAllocationId: string;
    targetProjectId: string;
    error: string;
  }>;
  summary: {
    totalAttempted: number;
    totalSuccessful: number;
    totalFailed: number;
    projectsCopiedTo: number;
  };
}

// CSV/Excel Import/Export
export interface ImportOptions {
  file: File;
  mapping: FieldMapping;
  options: {
    hasHeaders?: boolean;
    skipRows?: number;
    validateOnly?: boolean;
    continueOnError?: boolean;
    batchSize?: number;
  };
}

export interface FieldMapping {
  employeeId: string; // column name or index
  employeeName?: string | number;
  projectId?: string | number;
  projectName?: string | number;
  startDate: string | number;
  endDate?: string | number;
  allocatedHours: string | number;
  role?: string | number;
  status?: string | number;
  notes?: string | number;
}

export interface ImportResult {
  imported: number;
  failed: number;
  warnings: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
  conflicts?: AllocationConflict[];
  preview?: ImportPreviewRow[];
}

export interface ImportPreviewRow {
  row: number;
  data: Record<string, any>;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  conflicts?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'excel';
  filters?: AllocationFilters;
  fields?: string[];
  includeHeaders?: boolean;
  dateFormat?: string;
  groupBy?: 'employee' | 'project' | 'department' | 'none';
}

// Department-level Management
export interface DepartmentAllocationSummary {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  totalCapacity: number; // hours per week
  totalAllocated: number; // hours per week
  utilizationRate: number; // percentage
  teams: Array<{
    teamId: string;
    teamName: string;
    memberCount: number;
    capacity: number;
    allocated: number;
    utilization: number;
  }>;
  projects: Array<{
    projectId: string;
    projectName: string;
    clientName: string;
    allocatedHours: number;
    employeeCount: number;
  }>;
  skillDistribution: Record<string, number>;
  overallocation: Array<{
    employeeId: string;
    employeeName: string;
    capacity: number;
    allocated: number;
    overallocationHours: number;
  }>;
}

export interface DepartmentRebalancingRequest {
  departmentId: string;
  options: {
    targetUtilizationRange: [number, number]; // [min%, max%]
    redistributeOverallocated?: boolean;
    considerSkillMatch?: boolean;
    preserveTeamStructure?: boolean;
    maxChangesPerEmployee?: number;
  };
}

export interface DepartmentRebalancingResult {
  proposedChanges: Array<{
    type: 'reassign' | 'adjust_hours' | 'split_allocation';
    employeeId: string;
    currentAllocationId?: string;
    newProjectId?: string;
    hourChange?: number;
    reason: string;
    impact: {
      oldUtilization: number;
      newUtilization: number;
      skillMatch: number;
    };
  }>;
  summary: {
    employeesAffected: number;
    totalHoursRebalanced: number;
    utilizationImprovement: number;
    skillMatchImprovement: number;
  };
  warnings: string[];
}

// Capacity Planning with Skill Matrices
export interface CapacityPlanningRequest {
  projectId: string;
  requiredRoles: Array<{
    roleName: string;
    requiredSkills: string[];
    minimumExperienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
    estimatedHours: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    startDate: string;
    endDate?: string;
  }>;
  constraints?: {
    departmentIds?: string[];
    teamIds?: string[];
    excludeEmployeeIds?: string[];
    maxUtilizationPerEmployee?: number;
    requireSkillMatch?: boolean;
    preferTeamCohesion?: boolean;
  };
}

export interface CapacityPlanningResult {
  recommendations: Array<{
    roleIndex: number;
    candidates: Array<{
      employeeId: string;
      employeeName: string;
      skillMatch: number; // 0-100
      availability: number; // hours per week
      currentUtilization: number; // percentage
      estimatedStartDate: string;
      confidence: number; // 0-100
      pros: string[];
      cons: string[];
    }>;
    alternatives?: Array<{
      type: 'split_role' | 'adjust_hours' | 'external_hire' | 'skill_development';
      description: string;
      timeToImplement: number; // days
      cost?: number;
    }>;
  }>;
  summary: {
    totalRolesFilled: number;
    totalRolesUnfilled: number;
    averageSkillMatch: number;
    estimatedStartDate: string;
    riskFactors: string[];
  };
  skillGaps: Array<{
    skill: string;
    requiredLevel: string;
    availableLevel: string;
    gap: number;
    recommendations: string[];
  }>;
}

// API Response Types
export interface BulkOperationStatus {
  operationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  startedAt: string;
  estimatedCompletion?: string;
  results?: BulkOperationResult<any>;
}

// Import necessary types
import type {
  CreateAllocationRequest,
  UpdateAllocationRequest,
  AllocationConflict,
  AllocationFilters,
} from './allocation';