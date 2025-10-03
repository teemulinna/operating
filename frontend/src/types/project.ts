// Project Management Types
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';

// API Response Project (matches actual backend response)
export interface ApiProject {
  id: number; // Backend uses integer IDs
  name: string;
  description?: string;
  client_name?: string; // Backend uses snake_case
  status: ProjectStatus;
  start_date: string; // Backend uses snake_case and ISO date string
  end_date?: string; // Backend uses snake_case and ISO date string
  budget?: string; // Backend returns as string (decimal)
  hourly_rate?: string; // Backend returns as string (decimal)
  estimated_hours?: number;
  actual_hours?: string; // Backend returns as string (decimal)
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  // Calculated fields from backend aggregation
  total_roles?: string;
  filled_roles?: string;
  assigned_employees?: string;
  total_planned_hours?: string;
}

// Frontend Project (for display)
export interface Project {
  id: number;
  name: string;
  description?: string;
  clientName?: string;
  status: ProjectStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  budget?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  actualHours?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  // Calculated fields from aggregation
  totalRoles?: number;
  filledRoles?: number;
  assignedEmployees?: number;
  totalPlannedHours?: number;
  // Client-side calculated fields
  budgetUtilization?: number; // 0-100 percentage
  timeProgress?: number; // 0-100 percentage
  daysRemaining?: number; // Calculated
  isOverBudget?: boolean; // Calculated
  isOverdue?: boolean; // Calculated
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  client_name?: string;
  status?: ProjectStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  start_date: string; // ISO date string
  end_date?: string; // ISO date string
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  id: string; // UUID string
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | 'all';
  clientName?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  budgetMin?: number;
  budgetMax?: number;
  isActive?: boolean;
  teamMember?: string; // Employee ID
  tags?: string[];
  isOverdue?: boolean;
  isOverBudget?: boolean;
}

export interface ProjectPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: keyof Project;
  sortOrder?: 'asc' | 'desc';
}

// API Response structure (matches actual backend)
export interface ApiProjectsResponse {
  success: boolean;
  data: ApiProject[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  total: number;
}

// Frontend response structure
export interface ProjectsResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Project statistics
export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalBilled: number;
  averageProjectDuration: number; // in days
  onTimeCompletionRate: number; // percentage
  budgetUtilizationRate: number; // percentage
  averageBudget?: number;
  averageHourlyRate?: number;
  projectsByStatus?: {
    active: number;
    completed: number;
    'on-hold': number;
    planning: number;
  };
}

// Project timeline event
export interface ProjectTimelineEvent {
  id: string;
  projectId: string;
  type: 'created' | 'status_changed' | 'team_updated' | 'budget_updated' | 'milestone' | 'note_added';
  title: string;
  description?: string;
  date: string; // ISO date string
  userId?: string; // Who made the change
  metadata?: Record<string, unknown>;
}

// Project assignment for team members
export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    avatar?: string;
  };
  role: 'manager' | 'lead' | 'developer' | 'designer' | 'qa' | 'analyst' | 'consultant';
  utilizationPercentage: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  estimatedHours?: number;
  actualHours?: number;
  hourlyRate?: number;
  createdAt: string;
  updatedAt: string;
}

// Project Role Types (NEW)
export type ExperienceLevel = 'junior' | 'intermediate' | 'senior' | 'expert';
export type ProjectRoleStatus = 'active' | 'completed' | 'on-hold' | 'cancelled';

export interface ProjectRole {
  id: string;
  projectId: string;
  roleName: string;
  description?: string;
  requiredSkills: string[];
  minimumExperienceLevel: ExperienceLevel;
  plannedAllocationPercentage: number;
  estimatedHours?: number;
  actualHours?: number;
  status: ProjectRoleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRoleRequest {
  projectId: string;
  roleName: string;
  description?: string;
  requiredSkills: string[];
  minimumExperienceLevel: ExperienceLevel;
  plannedAllocationPercentage: number;
  estimatedHours?: number;
}

export interface UpdateProjectRoleRequest extends Partial<Omit<CreateProjectRoleRequest, 'projectId'>> {
  id: string;
}

// Enhanced Assignment with Role Reference
export interface ProjectRoleAssignment extends Omit<ProjectAssignment, 'role'> {
  roleId: string;
  projectRole?: ProjectRole;
  confidenceLevel: 'tentative' | 'probable' | 'confirmed';
  assignmentType: 'employee' | 'contractor' | 'consultant' | 'intern';
}

export interface CreateProjectRoleAssignmentRequest {
  projectId: string;
  roleId: string;
  employeeId: string;
  assignmentType: 'employee' | 'contractor' | 'consultant' | 'intern';
  startDate: string;
  endDate?: string;
  plannedAllocationPercentage: number;
  confidenceLevel: 'tentative' | 'probable' | 'confirmed';
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface CSVExportOptions {
  includeInactive?: boolean;
  fields?: (keyof Project)[];
}

// Helper function to transform API project to frontend project
export function transformApiProject(apiProject: ApiProject): Project {
  const now = new Date();
  const endDate = apiProject.end_date ? new Date(apiProject.end_date) : null;
  const startDate = new Date(apiProject.start_date);

  // Parse numeric values from strings
  const budget = apiProject.budget ? parseFloat(apiProject.budget) : undefined;
  const hourlyRate = apiProject.hourly_rate ? parseFloat(apiProject.hourly_rate) : undefined;
  const actualHours = apiProject.actual_hours ? parseFloat(apiProject.actual_hours) : 0;
  const estimatedHours = apiProject.estimated_hours ?? undefined;

  // Calculate derived fields
  const rawDaysRemaining = endDate ? (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : undefined;
  const daysRemaining = rawDaysRemaining !== undefined ? Math.floor(rawDaysRemaining) : undefined;
  const isOverdue = endDate ? now > endDate && apiProject.status === 'active' : false;
  const budgetSpent = actualHours * (hourlyRate || 0);
  const isOverBudget = budget ? budgetSpent > budget : false;
  const budgetUtilization = budget && budget > 0 ? (budgetSpent / budget) * 100 : 0;

  let timeProgress: number | undefined;

  if (estimatedHours && actualHours > 0) {
    timeProgress = (actualHours / estimatedHours) * 100;
  } else if (endDate) {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = now.getTime() - startDate.getTime();
    if (totalDuration > 0) {
      timeProgress = (elapsedDuration / totalDuration) * 100;
    }
  }

  if (timeProgress !== undefined) {
    timeProgress = Math.max(0, Math.min(100, timeProgress));
  }

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    clientName: apiProject.client_name,
    status: apiProject.status,
    priority: apiProject.priority,
    startDate: apiProject.start_date,
    endDate: apiProject.end_date,
    budget,
    hourlyRate,
    estimatedHours,
    actualHours,
    createdAt: apiProject.created_at,
    updatedAt: apiProject.updated_at,
    createdBy: apiProject.created_by,
    totalRoles: parseInt(apiProject.total_roles || '0'),
    filledRoles: parseInt(apiProject.filled_roles || '0'),
    assignedEmployees: parseInt(apiProject.assigned_employees || '0'),
    totalPlannedHours: parseFloat(apiProject.total_planned_hours || '0'),
    budgetUtilization,
    timeProgress,
    daysRemaining,
    isOverBudget,
    isOverdue,
  };
}

// Helper function to transform frontend project to API format for create/update
export function transformToApiRequest(project: CreateProjectRequest): any {
  return {
    name: project.name,
    description: project.description,
    client_name: project.client_name,
    status: project.status || 'planning',
    priority: project.priority || 'medium',
    start_date: project.start_date,
    end_date: project.end_date,
    budget: project.budget,
    hourly_rate: project.hourly_rate,
    estimated_hours: project.estimated_hours,
  };
}

// Status badge color mappings
export const PROJECT_STATUS_COLORS = {
  planning: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800', 
  completed: 'bg-gray-100 text-gray-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

// Role Status Colors
export const ROLE_STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  'on-hold': 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

// Experience Level Colors
export const EXPERIENCE_LEVEL_COLORS = {
  junior: 'bg-blue-100 text-blue-800',
  intermediate: 'bg-purple-100 text-purple-800',
  senior: 'bg-orange-100 text-orange-800',
  expert: 'bg-red-100 text-red-800',
} as const;

// Priority levels for projects (can be extended later)
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export const PROJECT_PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
} as const;