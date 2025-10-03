import { BaseService } from './base.service';

export interface HeatMapData {
  date: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  totalAllocated: number;
  dailyCapacity: number;
  utilizationPercentage: number;
  utilizationCategory: 'green' | 'blue' | 'yellow' | 'red';
  projectCount: number;
  projectDetails?: {
    projectId: number;
    projectName: string;
    hours: number;
  }[];
}

export interface HeatMapSummary {
  totalEmployees: number;
  averageUtilization: number;
  overAllocatedCount: number;
  underAllocatedCount: number;
  criticalCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  departmentBreakdown?: {
    departmentId: string;
    departmentName: string;
    averageUtilization: number;
    employeeCount: number;
  }[];
}

export interface EmployeeTrend {
  date: string;
  utilizationPercentage: number;
  allocatedHours: number;
  capacity: number;
  category: 'green' | 'blue' | 'yellow' | 'red';
}

export interface Bottleneck {
  employeeId: string;
  employeeName: string;
  departmentName: string;
  dates: string[];
  maxUtilization: number;
  avgUtilization: number;
  totalDays: number;
  severity: 'critical' | 'high' | 'medium';
}

export interface HeatMapFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  employeeIds?: string[];
  departmentId?: string;
  departmentIds?: string[];
  utilizationCategories?: string[];
  minUtilization?: number;
  maxUtilization?: number;
  granularity?: 'day' | 'week' | 'month';
}

export class HeatMapService extends BaseService {
  constructor() {
    super('/capacity');
  }

  async getHeatMapData(filters?: HeatMapFilters): Promise<HeatMapData[]> {
    const response = await this.request<{ success: boolean; data: HeatMapData[] }>({
      method: 'GET',
      url: `${this.resourcePath}/heatmap`,
      params: filters,
    });
    return response.data || [];
  }

  async getHeatMapSummary(filters?: HeatMapFilters): Promise<HeatMapSummary> {
    const response = await this.request<{ success: boolean; data: HeatMapSummary }>({
      method: 'GET',
      url: `${this.resourcePath}/heatmap/summary`,
      params: filters,
    });
    return response.data;
  }

  async getEmployeeTrends(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeTrend[]> {
    const response = await this.request<{
      success: boolean;
      data: { timeline: EmployeeTrend[] }
    }>({
      method: 'GET',
      url: `${this.resourcePath}/trends/${employeeId}`,
      params: { startDate, endDate },
    });
    return response.data?.timeline || [];
  }

  async getBottlenecks(filters?: HeatMapFilters): Promise<{
    bottlenecks: Bottleneck[];
    totalBottlenecks: number;
    criticalCount: number;
    recommendations: string[];
  }> {
    // TODO: Implement backend endpoint - returning mock data for now
    try {
      const response = await this.request<{
        success: boolean;
        data: {
          bottlenecks: Bottleneck[];
          totalBottlenecks: number;
          criticalCount: number;
          recommendations: string[];
        }
      }>({
        method: 'GET',
        url: `${this.resourcePath}/bottlenecks`,
        params: filters,
      });
      return response.data;
    } catch (error) {
      // Return mock data if endpoint doesn't exist
      return {
        bottlenecks: [],
        totalBottlenecks: 0,
        criticalCount: 0,
        recommendations: [
          'Consider hiring additional resources for high-demand periods',
          'Review project timelines to better distribute workload',
          'Implement resource pooling for shared skills'
        ]
      };
    }
  }

  async exportHeatMap(filters?: HeatMapFilters, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await this.request<Blob>({
      method: 'GET',
      url: `${this.resourcePath}/heatmap/export`,
      params: { ...filters, format },
      responseType: 'blob',
    });
    return response;
  }

  async refreshHeatMap(): Promise<void> {
    await this.request<{ success: boolean }>({
      method: 'POST',
      url: `${this.resourcePath}/heatmap/refresh`,
    });
  }

  // Utility functions for color categorization
  static getUtilizationColor(percentage: number): 'green' | 'blue' | 'yellow' | 'red' {
    if (percentage <= 70) return 'green';
    if (percentage <= 85) return 'blue';
    if (percentage <= 100) return 'yellow';
    return 'red';
  }

  static getColorHex(category: 'green' | 'blue' | 'yellow' | 'red'): string {
    const colors = {
      green: '#10b981',  // emerald-500
      blue: '#3b82f6',   // blue-500
      yellow: '#f59e0b', // amber-500
      red: '#ef4444',    // red-500
    };
    return colors[category];
  }

  static getColorClass(category: 'green' | 'blue' | 'yellow' | 'red'): string {
    const classes = {
      green: 'bg-emerald-500',
      blue: 'bg-blue-500',
      yellow: 'bg-amber-500',
      red: 'bg-red-500',
    };
    return classes[category];
  }
}