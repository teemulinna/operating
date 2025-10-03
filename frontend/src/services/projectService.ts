import { BaseService } from './base.service';
import { apiClient } from './api';
import type {
  Project,
  ApiProject,
  ApiProjectsResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
  ProjectPaginationParams,
  ProjectsResponse,
  ProjectStats,
  ProjectTimelineEvent,
  ProjectAssignment,
  ProjectRole,
  CreateProjectRoleRequest,
  ProjectRoleAssignment,
  CreateProjectRoleAssignmentRequest,
} from '@/types/project';
import { transformApiProject, transformToApiRequest } from '@/types/project';

export class ProjectService extends BaseService {
  constructor() {
    super('/projects');
  }
  /**
   * Get all projects with optional filtering and pagination
   */
  static async getProjects(
    filters: ProjectFilters = {},
    pagination: ProjectPaginationParams = {}
  ): Promise<ProjectsResponse> {
    const params = new URLSearchParams();
    
    // Add filter params
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.clientName) params.append('clientName', filters.clientName);
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    if (filters.endDateFrom) params.append('endDateFrom', filters.endDateFrom);
    if (filters.endDateTo) params.append('endDateTo', filters.endDateTo);
    if (filters.budgetMin !== undefined) params.append('budgetMin', filters.budgetMin.toString());
    if (filters.budgetMax !== undefined) params.append('budgetMax', filters.budgetMax.toString());
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.teamMember) params.append('teamMember', filters.teamMember);
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.isOverdue !== undefined) params.append('isOverdue', filters.isOverdue.toString());
    if (filters.isOverBudget !== undefined) params.append('isOverBudget', filters.isOverBudget.toString());

    // Add pagination params
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

    const service = new ProjectService();
    const response = await service.request<ApiProjectsResponse>({
      method: 'GET',
      url: `${service.resourcePath}?${params.toString()}`
    });
    
    // Transform API response to match frontend expectations
    const transformedProjects = response.data?.map((proj: ApiProject) => transformApiProject(proj)) || [];

    return {
      projects: transformedProjects,
      total: response.pagination?.totalItems || 0,
      page: response.pagination?.currentPage || 1,
      limit: response.pagination?.limit || 10,
      totalPages: response.pagination?.totalPages || Math.ceil((response.pagination?.totalItems || 0) / (response.pagination?.limit || 10)),
    };
  }

  /**
   * Get a single project by ID
   */
  static async getProject(id: string): Promise<Project> {
    const service = new ProjectService();
    const response = await service.request<{ data: ApiProject }>({
      method: 'GET',
      url: `${service.resourcePath}/${id}`
    });
    return transformApiProject(response.data);
  }

  /**
   * Create a new project
   */
  static async createProject(project: CreateProjectRequest): Promise<Project> {
    const apiRequest = transformToApiRequest(project);
    const response = await apiClient.post<{ data: ApiProject }>('/projects', apiRequest);
    return transformApiProject(response.data.data);
  }

  /**
   * Update an existing project
   */
  static async updateProject(id: string, updates: Omit<UpdateProjectRequest, 'id'>): Promise<Project> {
    const apiRequest = transformToApiRequest(updates as CreateProjectRequest);
    const response = await apiClient.put<{ data: ApiProject }>(`/projects/${id}`, apiRequest);
    return transformApiProject(response.data.data);
  }

  /**
   * Delete a project
   */
  static async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  }

  /**
   * Get unique client names
   */
  static async getClients(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/projects/clients');
    return response.data;
  }

  /**
   * Get unique tags
   */
  static async getTags(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/projects/tags');
    return response.data;
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(filters: ProjectFilters = {}): Promise<ProjectStats> {
    const params = new URLSearchParams();
    
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    if (filters.clientName) params.append('clientName', filters.clientName);
    
    const response = await apiClient.get<ProjectStats>(`/projects/stats?${params.toString()}`);
    return response.data;
  }

  /**
   * Get project statistics for dashboard widget
   */
  static async getProjectStatistics(filters: ProjectFilters = {}): Promise<{success: boolean, data: any}> {
    try {
      const stats = await this.getProjectStats(filters);
      return {
        success: true,
        data: {
          totalProjects: stats.totalProjects || 0,
          totalBudget: stats.totalBudget || 0,
          averageBudget: stats.averageBudget || 0,
          averageHourlyRate: stats.averageHourlyRate || 0,
          projectsByStatus: stats.projectsByStatus || {
            active: 0,
            completed: 0,
            'on-hold': 0,
            planning: 0
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        data: {
          totalProjects: 0,
          totalBudget: 0,
          averageBudget: 0,
          averageHourlyRate: 0,
          projectsByStatus: {
            active: 0,
            completed: 0,
            'on-hold': 0,
            planning: 0
          }
        }
      };
    }
  }

  /**
   * Get project timeline events
   */
  static async getProjectTimeline(projectId: string): Promise<ProjectTimelineEvent[]> {
    const response = await apiClient.get<{ data: ProjectTimelineEvent[] }>(`/projects/${projectId}/timeline`);
    return response.data.data;
  }

  /**
   * Add timeline event to project
   */
  static async addTimelineEvent(
    projectId: string, 
    event: Omit<ProjectTimelineEvent, 'id' | 'projectId' | 'date'>
  ): Promise<ProjectTimelineEvent> {
    const response = await apiClient.post<{ data: ProjectTimelineEvent }>(
      `/projects/${projectId}/timeline`,
      event
    );
    return response.data.data;
  }

  /**
   * Update project status
   */
  static async updateProjectStatus(id: string, status: Project['status']): Promise<Project> {
    const response = await apiClient.patch<{ data: ApiProject }>(`/projects/${id}/status`, { status });
    return transformApiProject(response.data.data);
  }

  /**
   * Add team member to project
   */
  static async addTeamMember(projectId: string, employeeId: string): Promise<Project> {
    const response = await apiClient.post<{ data: ApiProject }>(
      `/projects/${projectId}/team`,
      { employeeId }
    );
    return transformApiProject(response.data.data);
  }

  /**
   * Remove team member from project
   */
  static async removeTeamMember(projectId: string, employeeId: string): Promise<Project> {
    const response = await apiClient.delete<{ data: ApiProject }>(
      `/projects/${projectId}/team/${employeeId}`
    );
    return transformApiProject(response.data.data);
  }

  /**
   * Export projects as CSV
   */
  static async exportCSV(filters: ProjectFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.clientName) params.append('clientName', filters.clientName);

    const response = await apiClient.get(`/projects/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import projects from CSV
   */
  static async importCSV(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ imported: number; errors: string[] }>(
      '/projects/import/csv',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Archive a project (soft delete)
   */
  static async archiveProject(id: string): Promise<Project> {
    const response = await apiClient.patch<{ data: ApiProject }>(`/projects/${id}/archive`);
    return transformApiProject(response.data.data);
  }

  /**
   * Restore an archived project
   */
  static async restoreProject(id: string): Promise<Project> {
    const response = await apiClient.patch<{ data: ApiProject }>(`/projects/${id}/restore`);
    return transformApiProject(response.data.data);
  }

  /**
   * Clone/duplicate a project
   */
  static async cloneProject(id: string, newName?: string): Promise<Project> {
    const response = await apiClient.post<{ data: ApiProject }>(
      `/projects/${id}/clone`,
      newName ? { name: newName } : {}
    );
    return transformApiProject(response.data.data);
  }

  /**
   * Get project assignments (team members)
   */
  static async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    try {
      const response = await apiClient.get<{ data: ProjectAssignment[] }>(`/projects/${projectId}/assignments`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch project assignments:', error);
      return [];
    }
  }

  /**
   * Create a project assignment
   */
  static async createProjectAssignment(assignment: {
    projectId: string;
    employeeId: string;
    role: string;
    utilizationPercentage: number;
    startDate: string;
    endDate?: string;
  }): Promise<ProjectAssignment> {
    const response = await apiClient.post<{ data: ProjectAssignment }>('/project-assignments', assignment);
    return response.data.data;
  }

  /**
   * Update a project assignment
   */
  static async updateProjectAssignment(
    id: string,
    updates: {
      role?: string;
      utilizationPercentage?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<ProjectAssignment> {
    const response = await apiClient.put<{ data: ProjectAssignment }>(`/project-assignments/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete a project assignment
   */
  static async deleteProjectAssignment(id: string): Promise<ProjectAssignment> {
    const response = await apiClient.delete<{ data: ProjectAssignment }>(`/project-assignments/${id}`);
    return response.data.data;
  }

  /**
   * Get project roles for a specific project
   */
  static async getProjectRoles(projectId: string): Promise<ProjectRole[]> {
    try {
      const response = await apiClient.get<{ data: ProjectRole[] }>(`/projects/${projectId}/roles`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch project roles:', error);
      return [];
    }
  }

  /**
   * Create a project role
   */
  static async createProjectRole(roleData: CreateProjectRoleRequest): Promise<ProjectRole> {
    const response = await apiClient.post<{ data: ProjectRole }>(`/projects/${roleData.projectId}/roles`, roleData);
    return response.data.data;
  }

  /**
   * Update a project role
   */
  static async updateProjectRole(
    id: string,
    updates: Partial<CreateProjectRoleRequest>
  ): Promise<ProjectRole> {
    const response = await apiClient.put<{ data: ProjectRole }>(`/project-roles/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete a project role
   */
  static async deleteProjectRole(id: string): Promise<void> {
    await apiClient.delete(`/project-roles/${id}`);
  }

  /**
   * Create a project role assignment
   */
  static async createProjectRoleAssignment(
    assignmentData: CreateProjectRoleAssignmentRequest
  ): Promise<ProjectRoleAssignment> {
    const response = await apiClient.post<{ data: ProjectRoleAssignment }>(
      `/projects/${assignmentData.projectId}/role-assignments`,
      assignmentData
    );
    return response.data.data;
  }

  /**
   * Update a project role assignment
   */
  static async updateProjectRoleAssignment(
    id: string,
    updates: Partial<CreateProjectRoleAssignmentRequest>
  ): Promise<ProjectRoleAssignment> {
    const response = await apiClient.put<{ data: ProjectRoleAssignment }>(`/project-role-assignments/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete a project role assignment
   */
  static async deleteProjectRoleAssignment(id: string): Promise<ProjectRoleAssignment> {
    const response = await apiClient.delete<{ data: ProjectRoleAssignment }>(`/project-role-assignments/${id}`);
    return response.data.data;
  }

  /**
   * Get role assignments for a specific project role
   */
  static async getProjectRoleAssignments(roleId: string): Promise<ProjectRoleAssignment[]> {
    try {
      const response = await apiClient.get<{ data: ProjectRoleAssignment[] }>(`/project-roles/${roleId}/assignments`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch role assignments:', error);
      return [];
    }
  }

  /**
   * Get available employees for role assignment (excludes already assigned)
   */
  static async getAvailableEmployeesForRole(roleId: string): Promise<any[]> {
    try {
      const response = await apiClient.get<{ data: any[] }>(`/project-roles/${roleId}/available-employees`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch available employees:', error);
      return [];
    }
  }
}

export default ProjectService;