// Pipeline Service for CRM Integration Frontend
import { apiClient } from './api';
import {
  PipelineProject,
  CreatePipelineProjectRequest,
  UpdatePipelineProjectRequest,
  PipelineFilters,
  PipelineAnalytics,
  CRMSystemConfig,
  CRMSyncOperation,
  CRMSyncError
} from '@/types/pipeline';

export class PipelineService {
  // Pipeline Project Operations
  static async getPipelineProjects(filters: PipelineFilters = {}): Promise<{
    projects: PipelineProject[];
    total: number;
  }> {
    const params = new URLSearchParams();
    
    // Add filter parameters
    if (filters.stage) {
      if (Array.isArray(filters.stage)) {
        filters.stage.forEach(stage => params.append('stage', stage));
      } else {
        params.append('stage', filters.stage);
      }
    }
    
    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        filters.priority.forEach(priority => params.append('priority', priority));
      } else {
        params.append('priority', filters.priority);
      }
    }
    
    if (filters.clientName) params.append('clientName', filters.clientName);
    if (filters.probabilityMin !== undefined) params.append('probabilityMin', filters.probabilityMin.toString());
    if (filters.probabilityMax !== undefined) params.append('probabilityMax', filters.probabilityMax.toString());
    if (filters.valueMin !== undefined) params.append('valueMin', filters.valueMin.toString());
    if (filters.valueMax !== undefined) params.append('valueMax', filters.valueMax.toString());
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    if (filters.syncStatus) params.append('syncStatus', filters.syncStatus);
    if (filters.search) params.append('search', filters.search);
    
    if (filters.skills && filters.skills.length > 0) {
      filters.skills.forEach(skill => params.append('skills', skill));
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    const response = await apiClient.get<{
      success: boolean;
      data: PipelineProject[];
      pagination: { total: number; count: number };
    }>(`/pipeline/projects?${params.toString()}`);

    return {
      projects: response.data.data,
      total: response.data.pagination.total
    };
  }

  static async getPipelineProject(id: string): Promise<PipelineProject> {
    const response = await apiClient.get<{
      success: boolean;
      data: PipelineProject;
    }>(`/pipeline/projects/${id}`);

    return response.data.data;
  }

  static async createPipelineProject(request: CreatePipelineProjectRequest): Promise<PipelineProject> {
    const response = await apiClient.post<{
      success: boolean;
      data: PipelineProject;
    }>('/pipeline/projects', request);

    return response.data.data;
  }

  static async updatePipelineProject(id: string, updates: Partial<CreatePipelineProjectRequest>): Promise<PipelineProject> {
    const response = await apiClient.put<{
      success: boolean;
      data: PipelineProject;
    }>(`/pipeline/projects/${id}`, updates);

    return response.data.data;
  }

  static async deletePipelineProject(id: string): Promise<void> {
    await apiClient.delete(`/pipeline/projects/${id}`);
  }

  // Pipeline Analytics
  static async getPipelineAnalytics(filters: PipelineFilters = {}): Promise<PipelineAnalytics> {
    const params = new URLSearchParams();
    
    if (filters.stage) params.append('stage', Array.isArray(filters.stage) ? filters.stage.join(',') : filters.stage);
    if (filters.priority) params.append('priority', Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority);
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);

    const response = await apiClient.get<{
      success: boolean;
      data: PipelineAnalytics;
    }>(`/pipeline/analytics?${params.toString()}`);

    return response.data.data;
  }

  // CRM System Management
  static async getCRMSystems(includeInactive = false): Promise<CRMSystemConfig[]> {
    const params = new URLSearchParams();
    if (includeInactive) params.append('includeInactive', 'true');

    const response = await apiClient.get<{
      success: boolean;
      data: CRMSystemConfig[];
    }>(`/pipeline/crm-systems?${params.toString()}`);

    return response.data.data;
  }

  static async createCRMSystem(config: Omit<CRMSystemConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CRMSystemConfig> {
    const response = await apiClient.post<{
      success: boolean;
      data: CRMSystemConfig;
    }>('/pipeline/crm-systems', config);

    return response.data.data;
  }

  static async updateCRMSystem(id: string, updates: Partial<CRMSystemConfig>): Promise<CRMSystemConfig> {
    const response = await apiClient.put<{
      success: boolean;
      data: CRMSystemConfig;
    }>(`/pipeline/crm-systems/${id}`, updates);

    return response.data.data;
  }

  static async testCRMConnection(id: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data?: any;
    }>(`/pipeline/crm-systems/${id}/test-connection`);

    return {
      success: response.data.success,
      message: response.data.message,
      details: response.data.data
    };
  }

  // CRM Synchronization Operations
  static async startCRMSync(request: {
    crmSystemId: string;
    operation: 'sync' | 'import' | 'export';
    direction?: 'bidirectional' | 'to-crm' | 'from-crm';
    filters?: any;
    options?: any;
  }): Promise<CRMSyncOperation> {
    const response = await apiClient.post<{
      success: boolean;
      data: CRMSyncOperation;
    }>('/pipeline/crm-sync', request);

    return response.data.data;
  }

  static async getSyncOperations(crmSystemId?: string, limit = 50): Promise<CRMSyncOperation[]> {
    const params = new URLSearchParams();
    if (crmSystemId) params.append('crmSystemId', crmSystemId);
    params.append('limit', limit.toString());

    const response = await apiClient.get<{
      success: boolean;
      data: CRMSyncOperation[];
    }>(`/pipeline/crm-sync/operations?${params.toString()}`);

    return response.data.data;
  }

  static async getSyncOperation(id: string): Promise<CRMSyncOperation> {
    const response = await apiClient.get<{
      success: boolean;
      data: CRMSyncOperation;
    }>(`/pipeline/crm-sync/operations/${id}`);

    return response.data.data;
  }

  static async getSyncConflicts(crmSystemId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (crmSystemId) params.append('crmSystemId', crmSystemId);

    const response = await apiClient.get<{
      success: boolean;
      data: any[];
    }>(`/pipeline/crm-sync/conflicts?${params.toString()}`);

    return response.data.data;
  }

  static async resolveSyncConflict(
    conflictId: string,
    resolution: 'use-system' | 'use-crm' | 'merge',
    customValue?: any
  ): Promise<void> {
    await apiClient.post(`/pipeline/crm-sync/conflicts/${conflictId}/resolve`, {
      resolution,
      customValue
    });
  }

  // Individual Project CRM Operations
  static async syncProjectToCRM(projectId: string, crmSystemId: string): Promise<{
    success: boolean;
    crmId?: string;
    error?: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      data?: { crmId: string };
      message: string;
    }>(`/pipeline/projects/${projectId}/sync-to-crm/${crmSystemId}`);

    return {
      success: response.data.success,
      crmId: response.data.data?.crmId,
      error: response.data.success ? undefined : response.data.message
    };
  }

  static async syncProjectFromCRM(crmId: string, crmSystemId: string): Promise<{
    success: boolean;
    projectId?: string;
    error?: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      data?: { projectId: string };
      message: string;
    }>(`/pipeline/crm/${crmSystemId}/projects/${crmId}/sync-from-crm`);

    return {
      success: response.data.success,
      projectId: response.data.data?.projectId,
      error: response.data.success ? undefined : response.data.message
    };
  }

  // Utility methods for frontend
  static async getUniqueClients(): Promise<string[]> {
    const { projects } = await this.getPipelineProjects();
    const clients = new Set(projects.map(p => p.clientName));
    return Array.from(clients).sort();
  }

  static async getUniqueSkills(): Promise<string[]> {
    const { projects } = await this.getPipelineProjects();
    const skills = new Set<string>();
    projects.forEach(project => {
      project.requiredSkills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }

  static async getUniqueTags(): Promise<string[]> {
    const { projects } = await this.getPipelineProjects();
    const tags = new Set<string>();
    projects.forEach(project => {
      project.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }

  // Real-time sync status polling
  static async pollSyncOperation(operationId: string, onUpdate: (operation: CRMSyncOperation) => void): Promise<void> {
    const poll = async () => {
      try {
        const operation = await this.getSyncOperation(operationId);
        onUpdate(operation);
        
        if (operation.status === 'pending' || operation.status === 'running') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Error polling sync operation:', error);
      }
    };
    
    poll();
  }

  // Export/Import functionality
  static async exportPipelineData(filters: PipelineFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/pipeline/export?${params.toString()}`, {
      responseType: 'blob'
    });

    return response.data;
  }

  // Pipeline forecasting integration with scenario planning
  static async createScenarioFromPipeline(
    projectIds: string[],
    scenarioName: string,
    conversionRates?: Record<string, number>
  ): Promise<string> {
    const response = await apiClient.post<{
      success: boolean;
      data: { scenarioId: string };
    }>('/pipeline/create-scenario', {
      projectIds,
      scenarioName,
      conversionRates: conversionRates || {
        lead: 0.2,
        prospect: 0.3,
        opportunity: 0.5,
        proposal: 0.7,
        negotiation: 0.8
      }
    });

    return response.data.data.scenarioId;
  }

  // Dashboard summary data
  static async getPipelineSummary(): Promise<{
    totalValue: number;
    weightedValue: number;
    projectCount: number;
    winRate: number;
    avgDealSize: number;
    topOpportunities: PipelineProject[];
    recentActivity: any[];
    syncStatus: {
      synced: number;
      pending: number;
      failed: number;
      conflicts: number;
    };
  }> {
    try {
      const [projects, analytics] = await Promise.all([
        this.getPipelineProjects({ stage: ['opportunity', 'proposal', 'negotiation'] }),
        this.getPipelineAnalytics()
      ]);

      const topOpportunities = projects.projects
        .sort((a, b) => (b.estimatedValue * b.probability) - (a.estimatedValue * a.probability))
        .slice(0, 5);

      const syncStatusCounts = projects.projects.reduce((acc, project) => {
        acc[project.syncStatus] = (acc[project.syncStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalValue: analytics.totalValue,
        weightedValue: analytics.weightedValue,
        projectCount: projects.total,
        winRate: analytics.winLossAnalysis.winRate,
        avgDealSize: analytics.winLossAnalysis.avgDealSize,
        topOpportunities,
        recentActivity: [], // Would be populated from activity logs
        syncStatus: {
          synced: syncStatusCounts.synced || 0,
          pending: syncStatusCounts.pending || 0,
          failed: syncStatusCounts.failed || 0,
          conflicts: syncStatusCounts.conflict || 0,
        }
      };
    } catch (error) {
      console.error('Error fetching pipeline summary:', error);
      throw error;
    }
  }
}

export default PipelineService;