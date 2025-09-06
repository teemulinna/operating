import axios from 'axios';
import type {
  CapacityEntry,
  ApiCapacityResponse,
  ApiCapacitySummaryResponse,
  ApiCapacityTrendsResponse,
  ApiOverutilizedResponse,
  ApiEmployeeCapacityResponse,
  CapacitySummary,
  CapacityTrend,
  OverutilizedEmployee,
  EmployeeCapacityData,
  CreateCapacityRequest,
  UpdateCapacityRequest,
  CapacityFilters
} from '@/types/capacity';
import { apiClient } from './api';

/**
 * Capacity Management Service
 * Handles all capacity-related API operations
 */
export class CapacityService {
  /**
   * Get all capacity entries with optional filtering
   */
  static async getCapacityEntries(filters: CapacityFilters = {}): Promise<{ entries: CapacityEntry[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.minUtilization !== undefined) params.append('minUtilization', filters.minUtilization.toString());
    if (filters.maxUtilization !== undefined) params.append('maxUtilization', filters.maxUtilization.toString());

    const response = await apiClient.get<ApiCapacityResponse>(`/capacity?${params.toString()}`);
    
    const data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    
    return {
      entries: data,
      count: response.data.count || data.length
    };
  }

  /**
   * Get capacity summary statistics
   */
  static async getCapacitySummary(): Promise<CapacitySummary> {
    const response = await apiClient.get<ApiCapacitySummaryResponse>('/capacity/summary');
    return response.data.data;
  }

  /**
   * Get capacity trends over time
   */
  static async getCapacityTrends(): Promise<CapacityTrend[]> {
    const response = await apiClient.get<ApiCapacityTrendsResponse>('/capacity/trends');
    return response.data.data;
  }

  /**
   * Get overutilized employees
   */
  static async getOverutilizedEmployees(threshold: number = 0.9): Promise<{ employees: OverutilizedEmployee[]; threshold: number }> {
    const response = await apiClient.get<ApiOverutilizedResponse>(`/capacity/overutilized?threshold=${threshold}`);
    return {
      employees: response.data.data,
      threshold: response.data.threshold
    };
  }

  /**
   * Get capacity data for a specific employee
   */
  static async getEmployeeCapacity(employeeId: string): Promise<EmployeeCapacityData> {
    const response = await apiClient.get<ApiEmployeeCapacityResponse>(`/capacity/employee/${employeeId}`);
    return response.data.data;
  }

  /**
   * Create a new capacity entry
   */
  static async createCapacityEntry(request: CreateCapacityRequest): Promise<CapacityEntry> {
    const response = await apiClient.post<{ success: boolean; data: CapacityEntry }>('/capacity', request);
    return response.data.data;
  }

  /**
   * Update an existing capacity entry
   */
  static async updateCapacityEntry(id: string, request: UpdateCapacityRequest): Promise<CapacityEntry> {
    const response = await apiClient.put<{ success: boolean; data: CapacityEntry }>(`/capacity/${id}`, request);
    return response.data.data;
  }

  /**
   * Delete a capacity entry
   */
  static async deleteCapacityEntry(id: string): Promise<void> {
    await apiClient.delete(`/capacity/${id}`);
  }

  /**
   * Get capacity data for a specific department
   */
  static async getDepartmentCapacity(departmentName: string): Promise<{ entries: CapacityEntry[]; count: number }> {
    const response = await apiClient.get<ApiCapacityResponse>(`/capacity/department/${departmentName}`);
    
    const data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    
    return {
      entries: data,
      count: response.data.count || data.length
    };
  }

  /**
   * Bulk import capacity entries
   */
  static async bulkImportCapacity(entries: CreateCapacityRequest[]): Promise<{ imported: number; errors: string[] }> {
    const response = await apiClient.post<{ success: boolean; imported: number; errors: string[] }>('/capacity/bulk-import', entries);
    return {
      imported: response.data.imported,
      errors: response.data.errors
    };
  }

  /**
   * Export capacity data as CSV
   */
  static async exportCapacityCSV(filters: CapacityFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    params.append('format', 'csv');

    const response = await apiClient.get(`/capacity/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Update employee capacity (alternative endpoint)
   */
  static async updateEmployeeCapacity(employeeId: string, request: Omit<CreateCapacityRequest, 'employeeId'>): Promise<CapacityEntry> {
    const response = await apiClient.put<{ success: boolean; data: CapacityEntry }>(`/employees/${employeeId}/capacity`, request);
    return response.data.data;
  }

  /**
   * Get capacity analytics for a date range
   */
  static async getCapacityAnalytics(startDate: string, endDate: string): Promise<{
    summary: CapacitySummary;
    trends: CapacityTrend[];
    overutilized: OverutilizedEmployee[];
  }> {
    const [summary, trends, overutilized] = await Promise.all([
      this.getCapacitySummary(),
      this.getCapacityTrends(),
      this.getOverutilizedEmployees()
    ]);

    return {
      summary,
      trends,
      overutilized
    };
  }

  /**
   * Calculate utilization rate
   */
  static calculateUtilizationRate(allocatedHours: number, availableHours: number): number {
    if (availableHours === 0) return 0;
    return Math.round((allocatedHours / availableHours) * 100) / 100;
  }

  /**
   * Format utilization rate as percentage
   */
  static formatUtilizationRate(utilizationRate: number): string {
    return `${Math.round(utilizationRate * 100)}%`;
  }

  /**
   * Get utilization status based on rate
   */
  static getUtilizationStatus(utilizationRate: number): 'low' | 'optimal' | 'high' | 'overutilized' {
    if (utilizationRate < 0.6) return 'low';
    if (utilizationRate <= 0.8) return 'optimal';
    if (utilizationRate <= 0.9) return 'high';
    return 'overutilized';
  }

  /**
   * Get utilization color for UI display
   */
  static getUtilizationColor(utilizationRate: number): string {
    const status = this.getUtilizationStatus(utilizationRate);
    switch (status) {
      case 'low': return '#fbbf24'; // yellow-400
      case 'optimal': return '#10b981'; // emerald-500
      case 'high': return '#f59e0b'; // amber-500
      case 'overutilized': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  }
}

export default CapacityService;