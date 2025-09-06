// Project Management Types
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';

// API Response Project (matches backend)
export interface ApiProject {
  id: string; // UUID string from backend
  name: string;
  description?: string;
  clientName: string;
  status: ProjectStatus;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  budget?: number;
  hourlyRate?: number;
  totalHours?: number;
  billedHours?: number;
  isActive: boolean;
  teamMembers?: string[]; // Employee IDs
  tags?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Calculated fields from backend
  budgetUtilization?: number; // Percentage
  timeProgress?: number; // Percentage
  estimatedCompletion?: string; // ISO date string
}

// Frontend Project (for display)
export interface Project {
  id: string; // UUID string
  name: string;
  description?: string;
  clientName: string;
  status: ProjectStatus;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  budget?: number;
  hourlyRate?: number;
  totalHours?: number;
  billedHours?: number;
  isActive: boolean;
  teamMembers?: string[]; // Employee IDs
  teamMembersCount?: number; // Calculated field
  tags?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Calculated fields
  budgetUtilization?: number; // 0-100 percentage
  timeProgress?: number; // 0-100 percentage
  estimatedCompletion?: string; // ISO date string
  daysRemaining?: number; // Calculated
  isOverBudget?: boolean; // Calculated
  isOverdue?: boolean; // Calculated
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  clientName: string;
  status?: ProjectStatus;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  budget?: number;
  hourlyRate?: number;
  totalHours?: number;
  teamMembers?: string[]; // Employee IDs
  tags?: string[];
  notes?: string;
  isActive?: boolean;
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

// API Response structure (matches backend)
export interface ApiProjectsResponse {
  data: ApiProject[];
  pagination: {
    currentPage: number;
    totalItems: number;
    totalPages?: number;
    limit?: number;
  };
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
  const endDate = apiProject.endDate ? new Date(apiProject.endDate) : null;
  const startDate = new Date(apiProject.startDate);
  
  // Calculate derived fields
  const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined;
  const isOverdue = endDate ? now > endDate && apiProject.status === 'active' : false;
  const budgetSpent = (apiProject.billedHours || 0) * (apiProject.hourlyRate || 0);
  const isOverBudget = apiProject.budget ? budgetSpent > apiProject.budget : false;

  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description,
    clientName: apiProject.clientName,
    status: apiProject.status,
    startDate: apiProject.startDate,
    endDate: apiProject.endDate,
    budget: apiProject.budget,
    hourlyRate: apiProject.hourlyRate,
    totalHours: apiProject.totalHours,
    billedHours: apiProject.billedHours,
    isActive: apiProject.isActive,
    teamMembers: apiProject.teamMembers || [],
    teamMembersCount: apiProject.teamMembers?.length || 0,
    tags: apiProject.tags || [],
    notes: apiProject.notes,
    createdAt: apiProject.createdAt,
    updatedAt: apiProject.updatedAt,
    budgetUtilization: apiProject.budgetUtilization,
    timeProgress: apiProject.timeProgress,
    estimatedCompletion: apiProject.estimatedCompletion,
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
    clientName: project.clientName,
    status: project.status || 'planning',
    startDate: project.startDate,
    endDate: project.endDate,
    budget: project.budget,
    hourlyRate: project.hourlyRate,
    totalHours: project.totalHours,
    teamMembers: project.teamMembers || [],
    tags: project.tags || [],
    notes: project.notes,
    isActive: project.isActive !== undefined ? project.isActive : true,
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