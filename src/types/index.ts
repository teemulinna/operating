// Core entity types
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  position: string;
  hireDate: Date;
  isActive: boolean;
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

// Resource Planning Models
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  clientName?: string;  // Changed from clientId to clientName
  startDate: Date;
  endDate: Date;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  hourlyRate?: number;  // Added hourlyRate
  costToDate?: number;
  managerId?: string;   // Made optional
  createdBy?: number;   // Added createdBy field
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;   // Made optional
}

export interface ResourceAllocation {
  id: string;
  projectId: string;
  employeeId: string;
  allocatedHours: number;
  hourlyRate?: number;
  roleOnProject: string;
  startDate: Date;
  endDate: Date;
  actualHours?: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// Enums
export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT = 'soft',
  LANGUAGE = 'language',
  CERTIFICATION = 'certification',
  DOMAIN = 'domain'
}

export enum ProficiencyLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4,
  MASTER = 5
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RequirementPriority {
  OPTIONAL = 'optional',
  PREFERRED = 'preferred',
  REQUIRED = 'required',
  CRITICAL = 'critical'
}

// Input types for creation/updates
export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  position: string;
  hireDate: Date;
}

export interface UpdateEmployeeInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  departmentId?: string;
  position?: string;
  isActive?: boolean;
  hourlyRate?: number;
  maxCapacityHours?: number;
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

// Resource Planning Input Types
export interface CreateProjectInput {
  name: string;
  description?: string;
  status: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  clientName?: string;  // Changed from clientId to clientName
  startDate: Date;
  endDate: Date;
  estimatedHours?: number;
  budget?: number;
  hourlyRate?: number;  // Added hourlyRate
  managerId?: string;   // Made optional 
  createdBy?: number;   // Added createdBy field
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  clientId?: string;
  clientName?: string;  // Changed from clientId to clientName
  startDate?: Date;
  endDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  hourlyRate?: number;  // Added hourlyRate
  costToDate?: number;
  managerId?: string;
  isActive?: boolean;
}

export interface CreateResourceAllocationInput {
  projectId: string;
  employeeId: string;
  allocatedHours: number;
  hourlyRate?: number;
  roleOnProject: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
}

// Allocation-specific enums and interfaces
export enum AllocationStatus {
  TENTATIVE = 'tentative',
  CONFIRMED = 'confirmed', 
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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

export interface UpdateResourceAllocationInput {
  allocatedHours?: number;
  hourlyRate?: number;
  roleOnProject?: string;
  startDate?: Date;
  endDate?: Date;
  actualHours?: number;
  notes?: string;
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

// Query filter types
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

// Resource Planning Filter Types
export interface ProjectFilters {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  managerId?: string;
  clientId?: string;
  clientName?: string;  // Changed from clientId to clientName
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

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmployeeWithSkills extends Employee {
  skills: Array<EmployeeSkill & { skill: Skill }>;
  department: Department;
}

export interface DepartmentWithEmployees extends Department {
  employees: Employee[];
  manager?: Employee;
}

// Resource Planning Response Types
export interface ProjectWithDetails extends Project {
  allocations: Array<ResourceAllocation & { employee: Employee }>;
  skillRequirements: Array<SkillRequirement & { skill: Skill }>;
  manager: Employee;
}

export interface ResourceAllocationWithDetails extends ResourceAllocation {
  project: Project;
  employee: Employee;
}

export interface EmployeeWithCapacity extends Employee {
  currentAllocations: ResourceAllocation[];
  skills: Array<EmployeeSkill & { skill: Skill }>;
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

// Project Management Statistics Types
export interface ProjectStatistics {
  totalProjects: number;
  projectsByStatus: Record<string, number>;
  totalBudget: number;
  averageBudget: number;
  averageHourlyRate: number;
}

// Database connection types
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

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export class DatabaseError extends Error {
  public code?: string;
  public constraint?: string;
  public table?: string;
  public detail?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'DatabaseError';
    if (code !== undefined) {
      this.code = code;
    }
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}