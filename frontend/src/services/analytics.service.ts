import axios from 'axios';
import {
  UtilizationData,
  CapacityTrendData,
  ResourceAllocationMetrics,
  SkillGap,
  DepartmentPerformance,
  DepartmentComparison,
  AnalyticsFilters,
  ExportOptions,
  AnalyticsApiResponse,
  DashboardSummary
} from '../types/analytics';

class AnalyticsService {
  private baseUrl = '/api/analytics';

  /**
   * Get team utilization data
   */
  async getTeamUtilization(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<UtilizationData[]>> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/team-utilization`, { params });
    return response.data;
  }

  /**
   * Get capacity trends over time
   */
  async getCapacityTrends(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<CapacityTrendData[]>> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/capacity-trends`, { params });
    return response.data;
  }

  /**
   * Get resource allocation metrics
   */
  async getResourceAllocationMetrics(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<ResourceAllocationMetrics>> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/resource-allocation`, { params });
    return response.data;
  }

  /**
   * Get skills gap analysis
   */
  async getSkillsGapAnalysis(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<SkillGap[]>> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/skills-gap`, { params });
    return response.data;
  }

  /**
   * Get department performance metrics
   */
  async getDepartmentPerformance(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<DepartmentPerformance[]>> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/department-performance`, { params });
    return response.data;
  }

  /**
   * Compare departments
   */
  async compareDepartments(
    departmentAId: string,
    departmentBId: string,
    filters: AnalyticsFilters = {}
  ): Promise<{ data: DepartmentComparison; metadata: any }> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(
      `${this.baseUrl}/compare-departments/${departmentAId}/${departmentBId}`,
      { params }
    );
    return response.data;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(options: ExportOptions): Promise<any> {
    const response = await axios.post(`${this.baseUrl}/export`, options, {
      responseType: options.format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(filters: AnalyticsFilters = {}): Promise<DashboardSummary> {
    const params = this.buildQueryParams(filters);
    const response = await axios.get(`${this.baseUrl}/dashboard-summary`, { params });
    return response.data;
  }

  /**
   * Helper method to build query parameters
   */
  private buildQueryParams(filters: AnalyticsFilters): any {
    const params: any = {};
    
    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom.toISOString().split('T')[0];
    }
    
    if (filters.dateTo) {
      params.dateTo = filters.dateTo.toISOString().split('T')[0];
    }
    
    if (filters.departmentIds && filters.departmentIds.length > 0) {
      params.departmentIds = filters.departmentIds.join(',');
    }
    
    if (filters.skillCategories && filters.skillCategories.length > 0) {
      params.skillCategories = filters.skillCategories.join(',');
    }
    
    if (filters.aggregationPeriod) {
      params.aggregationPeriod = filters.aggregationPeriod;
    }
    
    if (filters.utilizationThreshold?.min !== undefined) {
      params.minUtilization = filters.utilizationThreshold.min;
    }
    
    if (filters.utilizationThreshold?.max !== undefined) {
      params.maxUtilization = filters.utilizationThreshold.max;
    }
    
    return params;
  }
}

export default new AnalyticsService();
export { AnalyticsService };