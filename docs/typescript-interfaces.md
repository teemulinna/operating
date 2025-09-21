# TypeScript Interface Definitions and API Contracts

## Core Domain Interfaces

### Employee Management

```typescript
// src/types/employee.ts
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: number;
  departmentName?: string;
  defaultHoursPerWeek: number;
  salary?: number;
  skills?: Skill[];
  startDate: string;
  endDate?: string;
  status: EmployeeStatus;
  manager?: Employee;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  departmentId: number;
  defaultHoursPerWeek: number;
  salary?: number;
  skills?: string[];
  startDate: string;
  managerId?: number;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  position?: string;
  departmentId?: number;
  defaultHoursPerWeek?: number;
  salary?: number;
  skills?: string[];
  endDate?: string;
  status?: EmployeeStatus;
  managerId?: number;
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  TERMINATED = 'terminated'
}

export interface EmployeeCapacity {
  employeeId: number;
  totalHours: number;
  allocatedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  dateRange: DateRange;
}

export interface EmployeeSkill {
  id: number;
  employeeId: number;
  skillId: number;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience?: number;
  lastUsed?: string;
  certifications?: string[];
}
```

### Project Management

```typescript
// src/types/project.ts
export interface Project {
  id: number;
  name: string;
  description: string;
  clientName?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate?: string;
  budget?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  actualHours?: number;
  completionPercentage?: number;
  projectManager?: Employee;
  teamMembers?: ProjectTeamMember[];
  requiredSkills?: ProjectSkillRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  description: string;
  clientName?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string;
  endDate?: string;
  budget?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  projectManagerId?: number;
  requiredSkills?: ProjectSkillRequirementDto[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  clientName?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  budget?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  completionPercentage?: number;
  projectManagerId?: number;
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

export interface ProjectTeamMember {
  id: number;
  projectId: number;
  employeeId: number;
  role: ProjectRole;
  allocatedHours: number;
  startDate: string;
  endDate?: string;
  billableRate?: number;
}

export interface ProjectSkillRequirement {
  id: number;
  projectId: number;
  skillId: number;
  requiredLevel: ProficiencyLevel;
  priority: RequirementPriority;
  estimatedHours?: number;
}
```

### Resource Allocation

```typescript
// src/types/allocation.ts
export interface ResourceAllocation {
  id: number;
  employeeId: number;
  employee?: Employee;
  projectId: number;
  project?: Project;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject: string;
  status: AllocationStatus;
  notes?: string;
  billableRate?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllocationDto {
  employeeId: number;
  projectId: number;
  startDate: string;
  endDate: string;
  allocatedHours: number;
  roleOnProject: string;
  status?: AllocationStatus;
  notes?: string;
  billableRate?: number;
}

export interface UpdateAllocationDto {
  startDate?: string;
  endDate?: string;
  allocatedHours?: number;
  roleOnProject?: string;
  status?: AllocationStatus;
  notes?: string;
  billableRate?: number;
  isActive?: boolean;
}

export enum AllocationStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export interface AllocationConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  employeeId: number;
  conflictingAllocations: ResourceAllocation[];
  totalHours: number;
  availableHours: number;
  overAllocationHours: number;
  dateRange: DateRange;
  suggestions: ConflictResolution[];
}

export enum ConflictType {
  OVER_ALLOCATION = 'over_allocation',
  SKILL_MISMATCH = 'skill_mismatch',
  AVAILABILITY_CONFLICT = 'availability_conflict',
  BUDGET_EXCEEDED = 'budget_exceeded'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Skills and Competencies

```typescript
// src/types/skill.ts
export interface Skill {
  id: number;
  name: string;
  category: SkillCategory;
  description?: string;
  isActive: boolean;
  parentSkillId?: number;
  subSkills?: Skill[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillDto {
  name: string;
  category: SkillCategory;
  description?: string;
  parentSkillId?: number;
}

export interface UpdateSkillDto {
  name?: string;
  category?: SkillCategory;
  description?: string;
  isActive?: boolean;
  parentSkillId?: number;
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT_SKILLS = 'soft_skills',
  DOMAIN_KNOWLEDGE = 'domain_knowledge',
  TOOLS = 'tools',
  LANGUAGES = 'languages',
  CERTIFICATIONS = 'certifications'
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface SkillAssessment {
  id: number;
  employeeId: number;
  skillId: number;
  currentLevel: ProficiencyLevel;
  targetLevel?: ProficiencyLevel;
  assessedBy?: number;
  assessmentDate: string;
  notes?: string;
  evidenceLinks?: string[];
}

export interface SkillGap {
  skillId: number;
  skill: Skill;
  requiredLevel: ProficiencyLevel;
  currentLevel?: ProficiencyLevel;
  gap: number;
  employeesWithSkill: Employee[];
  trainingRecommendations?: TrainingRecommendation[];
}
```

## Service Interface Contracts

### Base Service Interface

```typescript
// src/services/interfaces/IBaseService.ts
export interface IBaseService<T, CreateT = Omit<T, 'id'>, UpdateT = Partial<T>> {
  findAll(options?: QueryOptions): Promise<PaginatedResult<T>>;
  findById(id: number): Promise<T | null>;
  create(data: CreateT): Promise<T>;
  update(id: number, data: UpdateT): Promise<T>;
  delete(id: number): Promise<void>;
  exists(id: number): Promise<boolean>;
  count(filters?: Record<string, any>): Promise<number>;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  include?: string[];
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters?: Record<string, any>;
  sorting?: {
    field: string;
    order: 'asc' | 'desc';
  };
}
```

### Employee Service Interface

```typescript
// src/services/interfaces/IEmployeeService.ts
export interface IEmployeeService extends IBaseService<Employee, CreateEmployeeDto, UpdateEmployeeDto> {
  // Extended search and filtering
  findByDepartment(departmentId: number, options?: QueryOptions): Promise<PaginatedResult<Employee>>;
  findBySkills(skillIds: number[], options?: QueryOptions): Promise<PaginatedResult<Employee>>;
  findByManager(managerId: number, options?: QueryOptions): Promise<PaginatedResult<Employee>>;
  findAvailable(dateRange: DateRange, requiredHours?: number): Promise<Employee[]>;
  
  // Capacity management
  getCapacity(employeeId: number, dateRange: DateRange): Promise<EmployeeCapacity>;
  getCapacityForMultiple(employeeIds: number[], dateRange: DateRange): Promise<EmployeeCapacity[]>;
  calculateUtilization(employeeId: number, dateRange: DateRange): Promise<UtilizationMetrics>;
  
  // Allocation management
  getAllocations(employeeId: number, dateRange?: DateRange): Promise<ResourceAllocation[]>;
  getActiveAllocations(employeeId: number): Promise<ResourceAllocation[]>;
  checkAvailability(employeeId: number, dateRange: DateRange, requiredHours: number): Promise<AvailabilityCheck>;
  
  // Skills management
  getSkills(employeeId: number): Promise<EmployeeSkill[]>;
  addSkill(employeeId: number, skillData: CreateEmployeeSkillDto): Promise<EmployeeSkill>;
  updateSkill(employeeId: number, skillId: number, updates: UpdateEmployeeSkillDto): Promise<EmployeeSkill>;
  removeSkill(employeeId: number, skillId: number): Promise<void>;
  
  // Performance and analytics
  getPerformanceMetrics(employeeId: number, dateRange: DateRange): Promise<PerformanceMetrics>;
  getWorkloadHistory(employeeId: number, dateRange: DateRange): Promise<WorkloadHistory[]>;
  
  // Bulk operations
  bulkCreate(employees: CreateEmployeeDto[]): Promise<BulkOperationResult<Employee>>;
  bulkUpdate(updates: BulkUpdateDto[]): Promise<BulkOperationResult<Employee>>;
  bulkDelete(employeeIds: number[]): Promise<BulkOperationResult<void>>;
}
```

### Project Service Interface

```typescript
// src/services/interfaces/IProjectService.ts
export interface IProjectService extends IBaseService<Project, CreateProjectDto, UpdateProjectDto> {
  // Extended search and filtering
  findByStatus(statuses: ProjectStatus[], options?: QueryOptions): Promise<PaginatedResult<Project>>;
  findByPriority(priorities: ProjectPriority[], options?: QueryOptions): Promise<PaginatedResult<Project>>;
  findByClient(clientName: string, options?: QueryOptions): Promise<PaginatedResult<Project>>;
  findByDateRange(dateRange: DateRange, options?: QueryOptions): Promise<PaginatedResult<Project>>;
  findByManager(managerId: number, options?: QueryOptions): Promise<PaginatedResult<Project>>;
  
  // Team management
  getTeamMembers(projectId: number): Promise<ProjectTeamMember[]>;
  addTeamMember(projectId: number, member: CreateProjectTeamMemberDto): Promise<ProjectTeamMember>;
  updateTeamMember(projectId: number, memberId: number, updates: UpdateProjectTeamMemberDto): Promise<ProjectTeamMember>;
  removeTeamMember(projectId: number, memberId: number): Promise<void>;
  
  // Resource requirements
  getResourceRequirements(projectId: number): Promise<ProjectSkillRequirement[]>;
  addResourceRequirement(projectId: number, requirement: CreateProjectSkillRequirementDto): Promise<ProjectSkillRequirement>;
  updateResourceRequirement(projectId: number, requirementId: number, updates: UpdateProjectSkillRequirementDto): Promise<ProjectSkillRequirement>;
  removeResourceRequirement(projectId: number, requirementId: number): Promise<void>;
  
  // Resource allocation
  getAllocations(projectId: number, dateRange?: DateRange): Promise<ResourceAllocation[]>;
  getResourceGaps(projectId: number): Promise<SkillGap[]>;
  suggestTeamMembers(projectId: number, criteria?: TeamSuggestionCriteria): Promise<TeamSuggestion[]>;
  
  // Progress and analytics
  updateProgress(projectId: number, progress: number): Promise<Project>;
  getProgressHistory(projectId: number): Promise<ProgressHistory[]>;
  getProjectMetrics(projectId: number, dateRange?: DateRange): Promise<ProjectMetrics>;
  getBudgetUtilization(projectId: number): Promise<BudgetUtilization>;
  getTimeTracking(projectId: number, dateRange?: DateRange): Promise<TimeTrackingData[]>;
  
  // Financial management
  updateBudget(projectId: number, budget: number): Promise<Project>;
  getBudgetBreakdown(projectId: number): Promise<BudgetBreakdown>;
  getBillableHours(projectId: number, dateRange?: DateRange): Promise<BillableHoursReport>;
  
  // Forecasting
  getForecast(projectId: number): Promise<ProjectForecast>;
  getRiskAssessment(projectId: number): Promise<RiskAssessment>;
}
```

### Allocation Service Interface

```typescript
// src/services/interfaces/IAllocationService.ts
export interface IAllocationService extends IBaseService<ResourceAllocation, CreateAllocationDto, UpdateAllocationDto> {
  // Conflict detection and resolution
  detectConflicts(dateRange?: DateRange): Promise<AllocationConflict[]>;
  detectConflictsForEmployee(employeeId: number, dateRange?: DateRange): Promise<AllocationConflict[]>;
  detectConflictsForProject(projectId: number, dateRange?: DateRange): Promise<AllocationConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
  
  // Validation and optimization
  validateAllocation(allocation: CreateAllocationDto): Promise<ValidationResult>;
  validateAllocationUpdate(id: number, updates: UpdateAllocationDto): Promise<ValidationResult>;
  optimizeAllocations(criteria: OptimizationCriteria): Promise<AllocationOptimization>;
  
  // Bulk operations
  bulkCreate(allocations: CreateAllocationDto[]): Promise<BulkOperationResult<ResourceAllocation>>;
  bulkUpdate(updates: BulkUpdateAllocationDto[]): Promise<BulkOperationResult<ResourceAllocation>>;
  bulkDelete(allocationIds: number[]): Promise<BulkOperationResult<void>>;
  
  // Calendar and scheduling
  getCalendarView(dateRange: DateRange, options?: CalendarViewOptions): Promise<CalendarData>;
  getEmployeeSchedule(employeeId: number, dateRange: DateRange): Promise<EmployeeSchedule>;
  getProjectSchedule(projectId: number, dateRange: DateRange): Promise<ProjectSchedule>;
  
  // Reporting and analytics
  getUtilizationReport(dateRange: DateRange, groupBy?: UtilizationGroupBy): Promise<UtilizationReport>;
  getAllocationTrends(dateRange: DateRange): Promise<AllocationTrends>;
  getCapacityForecast(dateRange: DateRange): Promise<CapacityForecast>;
  
  // Templates and patterns
  createFromTemplate(templateId: number, projectId: number, startDate: string): Promise<ResourceAllocation[]>;
  saveAsTemplate(allocationIds: number[], templateName: string): Promise<AllocationTemplate>;
  getTemplates(): Promise<AllocationTemplate[]>;
  
  // Import/Export
  exportToCSV(dateRange?: DateRange, filters?: AllocationFilters): Promise<string>;
  importFromCSV(csvData: string): Promise<BulkOperationResult<ResourceAllocation>>;
}
```

## Utility and Helper Types

### Common Types

```typescript
// src/types/common.ts
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

export interface BulkOperationResult<T> {
  successful: T[];
  failed: BulkOperationError[];
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface BulkOperationError {
  index: number;
  data: any;
  error: string;
  code: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  version: string;
  executionTime: number;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}
```

### Analytics and Metrics

```typescript
// src/types/analytics.ts
export interface UtilizationMetrics {
  employeeId: number;
  period: DateRange;
  totalCapacity: number;
  totalAllocated: number;
  totalAvailable: number;
  utilizationPercentage: number;
  overAllocationHours: number;
  efficiency: number;
  trends: UtilizationTrend[];
}

export interface UtilizationTrend {
  date: string;
  utilization: number;
  capacity: number;
  allocated: number;
}

export interface ProjectMetrics {
  projectId: number;
  period: DateRange;
  budgetUtilization: number;
  timeUtilization: number;
  resourceUtilization: number;
  completionPercentage: number;
  predictedCompletionDate: string;
  riskScore: number;
  qualityScore: number;
  teamSatisfaction: number;
}

export interface PerformanceMetrics {
  employeeId: number;
  period: DateRange;
  productivity: number;
  quality: number;
  collaboration: number;
  innovation: number;
  overallScore: number;
  improvements: string[];
  achievements: string[];
}

export interface WorkloadHistory {
  date: string;
  allocatedHours: number;
  actualHours: number;
  projects: ProjectWorkload[];
  efficiency: number;
  burnoutRisk: number;
}

export interface ProjectWorkload {
  projectId: number;
  projectName: string;
  hours: number;
  role: string;
  priority: ProjectPriority;
}
```

### Forecasting and Planning

```typescript
// src/types/forecasting.ts
export interface ProjectForecast {
  projectId: number;
  currentCompletion: number;
  predictedCompletionDate: string;
  confidenceInterval: number;
  resourceNeeds: ForecastResourceNeed[];
  budgetProjection: BudgetProjection;
  risks: RiskFactor[];
  milestones: ForecastMilestone[];
}

export interface ForecastResourceNeed {
  skillId: number;
  skillName: string;
  requiredLevel: ProficiencyLevel;
  startDate: string;
  endDate: string;
  estimatedHours: number;
  availability: ResourceAvailability;
}

export interface ResourceAvailability {
  totalRequired: number;
  currentlyAvailable: number;
  gap: number;
  suggestions: ResourceSuggestion[];
}

export interface ResourceSuggestion {
  type: 'hire' | 'train' | 'contract' | 'reallocate';
  description: string;
  cost: number;
  timeline: string;
  confidence: number;
}

export interface BudgetProjection {
  estimatedTotal: number;
  actualSpent: number;
  remainingBudget: number;
  projectedOverrun: number;
  costPerHour: number;
  efficiency: number;
}

export interface RiskFactor {
  id: string;
  type: RiskType;
  severity: RiskSeverity;
  probability: number;
  impact: number;
  description: string;
  mitigation: string[];
  owner: string;
}

export enum RiskType {
  RESOURCE = 'resource',
  TECHNICAL = 'technical',
  BUDGET = 'budget',
  TIMELINE = 'timeline',
  QUALITY = 'quality',
  EXTERNAL = 'external'
}

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Error Handling

```typescript
// src/types/errors.ts
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode?: number,
    public details?: any,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export enum ErrorCode {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  ALLOCATION_CONFLICT = 'ALLOCATION_CONFLICT',
  OVER_ALLOCATION = 'OVER_ALLOCATION',
  SKILL_MISMATCH = 'SKILL_MISMATCH',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface ErrorContext {
  operation: string;
  resource: string;
  resourceId?: number | string;
  userId?: number;
  timestamp: string;
  requestId?: string;
  additionalInfo?: Record<string, any>;
}

export interface ErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
    details?: any;
    context?: ErrorContext;
    suggestions?: string[];
  };
  requestId: string;
  timestamp: string;
}
```

These comprehensive TypeScript interfaces provide a solid foundation for type safety throughout the application, ensuring consistency between frontend and backend, and enabling better developer experience with IntelliSense and compile-time error checking.