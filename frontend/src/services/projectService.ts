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
  ApiError
} from '@/types/project';
import { transformApiProject, transformToApiRequest } from '@/types/project';

export class ProjectService {
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

    const response = await apiClient.get<ApiProjectsResponse>(`/projects?${params.toString()}`);
    
    // Transform API response to match frontend expectations
    const apiData = response.data;
    const transformedProjects = apiData.data?.map((proj: ApiProject) => transformApiProject(proj)) || [];

    return {
      projects: transformedProjects,
      total: apiData.pagination?.totalItems || 0,
      page: apiData.pagination?.currentPage || 1,
      limit: apiData.pagination?.limit || 10,
      totalPages: apiData.pagination?.totalPages || Math.ceil((apiData.pagination?.totalItems || 0) / (apiData.pagination?.limit || 10)),
    };
  }

  /**
   * Get a single project by ID
   */
  static async getProject(id: string): Promise<Project> {
    const response = await apiClient.get<{ data: ApiProject }>(`/projects/${id}`);
    return transformApiProject(response.data.data);
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
}

export default ProjectService;