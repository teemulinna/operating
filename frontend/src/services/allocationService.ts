import { apiClient } from '@/services/api';
import type {
  Allocation,
  ApiAllocation,
  ApiAllocationsResponse,
  CreateAllocationRequest,
  UpdateAllocationRequest,
  AllocationFilters,
  AllocationPaginationParams,
  AllocationsResponse,
  AllocationConflict,
  EmployeeUtilization,
  ProjectTeamAllocation,
  ConflictResolution,
  ApiError,
} from '@/types/allocation';
import { transformApiAllocation, transformToApiRequest } from '@/types/allocation';

export class AllocationService {
  /**
   * Get all allocations with optional filtering and pagination
   */
  static async getAllocations(
    filters: AllocationFilters = {},
    pagination: AllocationPaginationParams = {}
  ): Promise<AllocationsResponse> {
    const params = new URLSearchParams();
    
    // Add filter params
    if (filters.search) params.append('search', filters.search);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.projectId) params.append('projectId', filters.projectId);
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
    if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
    if (filters.endDateFrom) params.append('endDateFrom', filters.endDateFrom);
    if (filters.endDateTo) params.append('endDateTo', filters.endDateTo);
    if (filters.allocatedHoursMin !== undefined) params.append('allocatedHoursMin', filters.allocatedHoursMin.toString());
    if (filters.allocatedHoursMax !== undefined) params.append('allocatedHoursMax', filters.allocatedHoursMax.toString());
    if (filters.role) params.append('role', filters.role);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters.hasConflicts !== undefined) params.append('hasConflicts', filters.hasConflicts.toString());
    if (filters.isOverallocated !== undefined) params.append('isOverallocated', filters.isOverallocated.toString());

    // Add pagination params
    if (pagination.page) params.append('page', pagination.page.toString());
    if (pagination.limit) params.append('limit', pagination.limit.toString());
    if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
    if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);

    const response = await apiClient.get<ApiAllocationsResponse>(`/allocations?${params.toString()}`);
    
    // Transform API response to match frontend expectations
    const apiData = response.data;
    const transformedAllocations = apiData.data?.map((allocation: ApiAllocation) => 
      transformApiAllocation(allocation)
    ) || [];

    return {
      allocations: transformedAllocations,
      total: apiData.pagination?.totalItems || 0,
      page: apiData.pagination?.currentPage || 1,
      limit: apiData.pagination?.limit || 10,
      totalPages: apiData.pagination?.totalPages || Math.ceil((apiData.pagination?.totalItems || 0) / (apiData.pagination?.limit || 10)),
      conflicts: apiData.conflicts,
    };
  }

  /**
   * Get a single allocation by ID
   */
  static async getAllocation(id: string): Promise<Allocation> {
    const response = await apiClient.get<{ data: ApiAllocation }>(`/allocations/${id}`);
    return transformApiAllocation(response.data.data);
  }

  /**
   * Create a new allocation with conflict detection
   */
  static async createAllocation(allocation: CreateAllocationRequest): Promise<{
    allocation: Allocation;
    conflicts?: AllocationConflict[];
  }> {
    const apiRequest = transformToApiRequest(allocation);
    const response = await apiClient.post<{ 
      data: ApiAllocation; 
      conflicts?: AllocationConflict[] 
    }>('/allocations', {
      ...apiRequest,
      checkConflicts: allocation.checkConflicts !== false, // Default to true
      forceCreate: allocation.forceCreate || false,
    });
    
    return {
      allocation: transformApiAllocation(response.data.data),
      conflicts: response.data.conflicts,
    };
  }

  /**
   * Update an existing allocation
   */
  static async updateAllocation(
    id: string, 
    updates: Omit<UpdateAllocationRequest, 'id'>
  ): Promise<{
    allocation: Allocation;
    conflicts?: AllocationConflict[];
  }> {
    const apiRequest = transformToApiRequest(updates as CreateAllocationRequest);
    const response = await apiClient.put<{ 
      data: ApiAllocation; 
      conflicts?: AllocationConflict[] 
    }>(`/allocations/${id}`, apiRequest);
    
    return {
      allocation: transformApiAllocation(response.data.data),
      conflicts: response.data.conflicts,
    };
  }

  /**
   * Delete an allocation
   */
  static async deleteAllocation(id: string): Promise<void> {
    await apiClient.delete(`/allocations/${id}`);
  }

  /**
   * Get allocations for a specific employee
   */
  static async getEmployeeAllocations(
    employeeId: string,
    filters?: Omit<AllocationFilters, 'employeeId'>,
    pagination?: AllocationPaginationParams
  ): Promise<AllocationsResponse> {
    return this.getAllocations(
      { ...filters, employeeId },
      pagination
    );
  }

  /**
   * Get allocations for a specific project
   */
  static async getProjectAllocations(
    projectId: string,
    filters?: Omit<AllocationFilters, 'projectId'>,
    pagination?: AllocationPaginationParams
  ): Promise<AllocationsResponse> {
    return this.getAllocations(
      { ...filters, projectId },
      pagination
    );
  }

  /**
   * Get employee utilization data
   */
  static async getEmployeeUtilization(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EmployeeUtilization> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<{ data: EmployeeUtilization }>(
      `/allocations/utilization/employee/${employeeId}?${params.toString()}`
    );
    return response.data.data;
  }

  /**
   * Get utilization data for multiple employees
   */
  static async getMultipleEmployeeUtilization(
    employeeIds: string[],
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, EmployeeUtilization>> {
    const params = new URLSearchParams();
    employeeIds.forEach(id => params.append('employeeIds', id));
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get<{ data: Record<string, EmployeeUtilization> }>(
      `/allocations/utilization/employees?${params.toString()}`
    );
    return response.data.data;
  }

  /**
   * Get project team allocation data
   */
  static async getProjectTeamAllocation(projectId: string): Promise<ProjectTeamAllocation> {
    const response = await apiClient.get<{ data: ProjectTeamAllocation }>(
      `/allocations/projects/${projectId}/team`
    );
    return response.data.data;
  }

  /**
   * Get allocation conflicts
   */
  static async getConflicts(
    filters?: {
      employeeId?: string;
      projectId?: string;
      severity?: string;
      type?: string;
    }
  ): Promise<AllocationConflict[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.type) params.append('type', filters.type);

    const response = await apiClient.get<{ data: AllocationConflict[] }>(
      `/allocations/conflicts?${params.toString()}`
    );
    return response.data.data;
  }

  /**
   * Resolve allocation conflicts
   */
  static async resolveConflict(resolution: ConflictResolution): Promise<{
    success: boolean;
    updatedAllocations?: Allocation[];
    remainingConflicts?: AllocationConflict[];
  }> {
    const response = await apiClient.post<{
      data: {
        success: boolean;
        updatedAllocations?: ApiAllocation[];
        remainingConflicts?: AllocationConflict[];
      }
    }>('/allocations/conflicts/resolve', resolution);

    const data = response.data.data;
    return {
      success: data.success,
      updatedAllocations: data.updatedAllocations?.map(transformApiAllocation),
      remainingConflicts: data.remainingConflicts,
    };
  }

  /**
   * Check for conflicts without creating allocation
   */
  static async checkConflicts(allocation: CreateAllocationRequest): Promise<AllocationConflict[]> {
    const apiRequest = transformToApiRequest(allocation);
    const response = await apiClient.post<{ data: AllocationConflict[] }>(
      '/allocations/conflicts/check',
      apiRequest
    );
    return response.data.data;
  }

  /**
   * Bulk update allocations (for drag-drop operations)
   */
  static async bulkUpdateAllocations(updates: {
    allocationId: string;
    startDate: string;
    endDate: string;
    allocatedHours?: number;
  }[]): Promise<{
    updated: Allocation[];
    conflicts?: AllocationConflict[];
    failed?: { allocationId: string; error: string }[];
  }> {
    const response = await apiClient.put<{
      data: {
        updated: ApiAllocation[];
        conflicts?: AllocationConflict[];
        failed?: { allocationId: string; error: string }[];
      }
    }>('/allocations/bulk-update', { updates });

    const data = response.data.data;
    return {
      updated: data.updated.map(transformApiAllocation),
      conflicts: data.conflicts,
      failed: data.failed,
    };
  }

  /**
   * Get calendar data for allocations
   */
  static async getCalendarData(
    startDate: string,
    endDate: string,
    filters?: AllocationFilters
  ): Promise<{
    allocations: Allocation[];
    employees: { id: string; name: string }[];
    projects: { id: string; name: string; clientName: string }[];
  }> {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    
    // Add filter params
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.projectId) params.append('projectId', filters.projectId);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);

    const response = await apiClient.get<{
      data: {
        allocations: ApiAllocation[];
        employees: { id: string; name: string }[];
        projects: { id: string; name: string; clientName: string }[];
      }
    }>(`/allocations/calendar?${params.toString()}`);

    const data = response.data.data;
    return {
      allocations: data.allocations.map(transformApiAllocation),
      employees: data.employees,
      projects: data.projects,
    };
  }

  /**
   * Export allocations as CSV
   */
  static async exportCSV(filters: AllocationFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    // Add filter params for export
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'all') {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/allocations/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import allocations from CSV
   */
  static async importCSV(file: File): Promise<{
    imported: number;
    failed: number;
    errors: string[];
    conflicts?: AllocationConflict[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{
      data: {
        imported: number;
        failed: number;
        errors: string[];
        conflicts?: AllocationConflict[];
      }
    }>('/allocations/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }
}

export default AllocationService;