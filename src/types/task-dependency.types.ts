import { DependencyType } from '../models/TaskDependency';
import { TaskType, TaskStatus, TaskPriority } from '../models/ProjectTask';

export interface TaskDependencyDTO {
  id: string;
  predecessorId: string;
  successorId: string;
  dependencyType: DependencyType;
  lagTime: number;
  isActive: boolean;
  description?: string;
  predecessor?: {
    id: string;
    name: string;
    status: TaskStatus;
    endDate?: Date;
  };
  successor?: {
    id: string;
    name: string;
    status: TaskStatus;
    startDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTaskDTO {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progress: number;
  duration: number;
  effort: number;
  assignedTo?: string;
  parentTaskId?: string;
  sortOrder: number;
  isCriticalPath: boolean;
  slackTime: number;
  earlyStart?: Date;
  earlyFinish?: Date;
  lateStart?: Date;
  lateFinish?: Date;
  cost?: number;
  budgetAllocated?: number;
  resourceRequirements?: Record<string, any>;
  notes?: string;
  assignedEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  parentTask?: {
    id: string;
    name: string;
    taskType: TaskType;
  };
  childTasks?: ProjectTaskDTO[];
  predecessorDependencies?: TaskDependencyDTO[];
  successorDependencies?: TaskDependencyDTO[];
  isOverdue: boolean;
  daysRemaining: number | null;
  progressStatus: 'on_track' | 'at_risk' | 'behind';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDependencyRequest {
  predecessorId: string;
  dependencyType?: DependencyType;
  lagTime?: number;
  description?: string;
}

export interface UpdateTaskDependencyRequest {
  predecessorId?: string;
  successorId?: string;
  dependencyType?: DependencyType;
  lagTime?: number;
  isActive?: boolean;
  description?: string;
}

export interface CreateProjectTaskRequest {
  name: string;
  description?: string;
  taskType?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: Date;
  endDate?: Date;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  progress?: number;
  duration?: number;
  effort?: number;
  assignedTo?: string;
  parentTaskId?: string;
  sortOrder?: number;
  cost?: number;
  budgetAllocated?: number;
  resourceRequirements?: Record<string, any>;
  notes?: string;
}

export interface UpdateProjectTaskRequest extends Partial<CreateProjectTaskRequest> {
  actualStartDate?: Date;
  actualEndDate?: Date;
}

export interface DependencyGraphNode {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  startDate?: Date;
  endDate?: Date;
  progress: number;
  isCriticalPath: boolean;
}

export interface DependencyGraphEdge {
  id: string;
  source: string;
  target: string;
  type: DependencyType;
  lag: number;
  description?: string;
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
}

export interface CriticalPathAnalysis {
  projectDuration: number;
  criticalPath: Array<{
    taskId: string;
    task: ProjectTaskDTO;
    earlyStart: Date;
    earlyFinish: Date;
    lateStart: Date;
    lateFinish: Date;
    totalFloat: number;
    freeFloat: number;
    isCritical: boolean;
    predecessors: string[];
    successors: string[];
  }>;
  allNodes: Array<{
    taskId: string;
    task: ProjectTaskDTO;
    earlyStart: Date;
    earlyFinish: Date;
    lateStart: Date;
    lateFinish: Date;
    totalFloat: number;
    freeFloat: number;
    isCritical: boolean;
    predecessors: string[];
    successors: string[];
  }>;
  projectStartDate: Date;
  projectEndDate: Date;
}

export interface ScheduleConflict {
  taskId: string;
  taskName: string;
  conflictType: 'resource_overallocation' | 'dependency_violation' | 'date_constraint';
  description: string;
  suggestedAction: string;
}

export interface ScheduleOptimizationOptions {
  optimizeFor: 'duration' | 'cost' | 'resources';
  allowParallelTasks: boolean;
  maxResourceUtilization: number;
  bufferTime: number;
  workingDaysOnly: boolean;
  holidays?: Date[];
}

export interface ScheduleRecommendation {
  taskId: string;
  currentSchedule: {
    startDate?: Date;
    endDate?: Date;
    assignedTo?: string;
  };
  recommendedSchedule: {
    startDate: Date;
    endDate: Date;
    assignedTo?: string;
    confidence: number;
  };
  reasoning: string[];
  impactAnalysis: {
    affectedTasks: string[];
    scheduleChange: number;
    costImpact: number;
  };
}

export interface ProjectScheduleSummary {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  upcomingTasks: number;
  overdueTasks: number;
  averageProgress: number;
  estimatedCompletion: Date;
  actualDuration: number;
  plannedDuration: number;
  scheduleVariance: number;
  criticalPathTasks: number;
  resourceUtilization: number;
  budgetUtilization: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  taskType?: TaskType;
  assignedTo?: string;
  priority?: TaskPriority;
  includeSubtasks?: boolean;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  isCriticalPath?: boolean;
  progressMin?: number;
  progressMax?: number;
}

export interface TaskSortOptions {
  sortBy: 'sortOrder' | 'name' | 'startDate' | 'endDate' | 'priority' | 'progress' | 'status';
  sortOrder: 'ASC' | 'DESC';
}

export interface BulkTaskOperation {
  taskIds: string[];
  operation: 'update_status' | 'assign_resource' | 'update_dates' | 'delete';
  data: Record<string, any>;
}

export interface TaskTimelineEvent {
  id: string;
  taskId: string;
  eventType: 'created' | 'started' | 'completed' | 'updated' | 'assigned' | 'dependency_added';
  description: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface GanttChartData {
  tasks: Array<{
    id: string;
    name: string;
    start: Date;
    end: Date;
    progress: number;
    type: TaskType;
    status: TaskStatus;
    assignedTo?: string;
    parentId?: string;
    dependencies: string[];
    isCritical: boolean;
  }>;
  dependencies: Array<{
    from: string;
    to: string;
    type: DependencyType;
    lag: number;
  }>;
  milestones: Array<{
    id: string;
    name: string;
    date: Date;
    status: 'pending' | 'achieved' | 'missed';
  }>;
}

export interface ResourceLoadData {
  employeeId: string;
  employeeName: string;
  totalCapacity: number;
  allocatedHours: number;
  utilizationRate: number;
  tasks: Array<{
    taskId: string;
    taskName: string;
    startDate: Date;
    endDate: Date;
    effort: number;
  }>;
  overallocationPeriods: Array<{
    startDate: Date;
    endDate: Date;
    overallocationHours: number;
  }>;
}