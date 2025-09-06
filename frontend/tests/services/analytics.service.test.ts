import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import AnalyticsService from '../../src/services/analytics.service';
import type { AnalyticsFilters } from '../../src/types/analytics';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeamUtilization', () => {
    it('should fetch team utilization data', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              departmentId: '1',
              departmentName: 'Engineering',
              totalEmployees: 10,
              averageUtilization: 0.85,
              totalAvailableHours: 400,
              totalAllocatedHours: 340,
              utilizationTrend: 5.2
            }
          ],
          metadata: {
            generatedAt: new Date(),
            dataPoints: 1,
            dateRange: {
              from: new Date('2024-01-01'),
              to: new Date('2024-01-31')
            },
            filters: {},
            processingTimeMs: 150
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getTeamUtilization();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/team-utilization', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('should build query parameters correctly', async () => {
      const filters: AnalyticsFilters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        departmentIds: ['1', '2'],
        aggregationPeriod: 'weekly'
      };

      mockedAxios.get.mockResolvedValue({ data: { data: [], metadata: {} } });

      await AnalyticsService.getTeamUtilization(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/team-utilization', {
        params: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          departmentIds: '1,2',
          aggregationPeriod: 'weekly'
        }
      });
    });

    it('should handle empty filters', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: [], metadata: {} } });

      await AnalyticsService.getTeamUtilization({});

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/team-utilization', { params: {} });
    });
  });

  describe('getCapacityTrends', () => {
    it('should fetch capacity trends data', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              date: new Date('2024-01-15'),
              departmentId: '1',
              departmentName: 'Engineering',
              averageUtilization: 0.85,
              totalAvailableHours: 400,
              totalAllocatedHours: 340,
              employeeCount: 10
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getCapacityTrends();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/capacity-trends', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getResourceAllocationMetrics', () => {
    it('should fetch resource allocation metrics', async () => {
      const mockResponse = {
        data: {
          data: {
            totalEmployees: 50,
            totalDepartments: 5,
            averageUtilizationAcrossCompany: 0.78,
            overutilizedEmployees: 5,
            underutilizedEmployees: 8,
            criticalResourceGaps: [],
            topPerformingDepartments: [],
            capacityForecast: []
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getResourceAllocationMetrics();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/resource-allocation', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle utilization threshold filters', async () => {
      const filters: AnalyticsFilters = {
        utilizationThreshold: {
          min: 0.6,
          max: 0.9
        }
      };

      mockedAxios.get.mockResolvedValue({ data: { data: {} } });

      await AnalyticsService.getResourceAllocationMetrics(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/resource-allocation', {
        params: {
          minUtilization: 0.6,
          maxUtilization: 0.9
        }
      });
    });
  });

  describe('getSkillsGapAnalysis', () => {
    it('should fetch skills gap analysis', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              skillName: 'React',
              skillCategory: 'technical',
              totalDemand: 20,
              availableExperts: 12,
              gapPercentage: 40,
              criticalityLevel: 'high',
              affectedDepartments: ['Engineering', 'Product']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getSkillsGapAnalysis();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/skills-gap', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle skill category filters', async () => {
      const filters: AnalyticsFilters = {
        skillCategories: ['technical', 'domain']
      };

      mockedAxios.get.mockResolvedValue({ data: { data: [] } });

      await AnalyticsService.getSkillsGapAnalysis(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/skills-gap', {
        params: {
          skillCategories: 'technical,domain'
        }
      });
    });
  });

  describe('getDepartmentPerformance', () => {
    it('should fetch department performance metrics', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              departmentId: '1',
              departmentName: 'Engineering',
              averageUtilization: 0.85,
              efficiencyScore: 92.5,
              skillCoverage: 88.0,
              teamSatisfactionScore: 87.2,
              projectCompletionRate: 94.1
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getDepartmentPerformance();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/department-performance', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('compareDepartments', () => {
    it('should compare two departments', async () => {
      const mockResponse = {
        data: {
          data: {
            departmentA: {
              id: '1',
              name: 'Engineering',
              metrics: {
                employeeCount: 15,
                averageUtilization: 0.85,
                skillDiversity: 8,
                experienceLevel: 3.2,
                teamProductivity: 92.5,
                retentionRate: 94.2
              }
            },
            departmentB: {
              id: '2',
              name: 'Marketing',
              metrics: {
                employeeCount: 8,
                averageUtilization: 0.72,
                skillDiversity: 6,
                experienceLevel: 2.8,
                teamProductivity: 87.1,
                retentionRate: 91.5
              }
            },
            comparisons: [
              {
                metric: 'Employee Count',
                valueA: 15,
                valueB: 8,
                difference: 7,
                percentageDifference: 87.5,
                winner: 'A'
              }
            ]
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.compareDepartments('1', '2');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/compare-departments/1/2', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle filters in department comparison', async () => {
      const filters: AnalyticsFilters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      };

      mockedAxios.get.mockResolvedValue({ data: { data: {} } });

      await AnalyticsService.compareDepartments('1', '2', filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/compare-departments/1/2', {
        params: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31'
        }
      });
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics data as JSON', async () => {
      const exportOptions = {
        format: 'json' as const,
        includeSummary: true,
        includeCharts: true,
        includeRawData: true,
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      const mockResponse = { data: { exportData: 'mock-export-data' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.exportAnalytics(exportOptions);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/analytics/export', exportOptions, {
        responseType: 'json'
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle blob response for non-JSON formats', async () => {
      const exportOptions = {
        format: 'pdf' as const,
        includeSummary: true,
        includeCharts: true,
        includeRawData: false,
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      const mockBlob = new Blob(['mock-pdf-data']);
      mockedAxios.post.mockResolvedValue({ data: mockBlob });

      const result = await AnalyticsService.exportAnalytics(exportOptions);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/analytics/export', exportOptions, {
        responseType: 'blob'
      });
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getDashboardSummary', () => {
    it('should fetch dashboard summary', async () => {
      const mockResponse = {
        data: {
          overview: {
            totalEmployees: 50,
            totalDepartments: 5,
            averageUtilization: 0.78,
            criticalSkillGaps: 3,
            topPerformingDepartment: 'Engineering'
          },
          alerts: {
            overutilizedEmployees: 5,
            underutilizedEmployees: 8,
            criticalSkillGaps: 3,
            capacityShortfall: 2
          },
          trends: {
            utilizationTrend: 'stable',
            skillGapTrend: 'improving',
            capacityTrend: 'increasing'
          },
          metadata: {
            generatedAt: new Date(),
            dataFreshness: 'real-time',
            nextUpdate: new Date()
          }
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await AnalyticsService.getDashboardSummary();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/dashboard-summary', { params: {} });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('buildQueryParams', () => {
    it('should handle complex filter combinations', async () => {
      const filters: AnalyticsFilters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        departmentIds: ['1', '2', '3'],
        skillCategories: ['technical', 'soft'],
        aggregationPeriod: 'monthly',
        utilizationThreshold: {
          min: 0.5,
          max: 0.95
        }
      };

      mockedAxios.get.mockResolvedValue({ data: { data: [], metadata: {} } });

      await AnalyticsService.getTeamUtilization(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/team-utilization', {
        params: {
          dateFrom: '2024-01-01',
          dateTo: '2024-01-31',
          departmentIds: '1,2,3',
          skillCategories: 'technical,soft',
          aggregationPeriod: 'monthly',
          minUtilization: 0.5,
          maxUtilization: 0.95
        }
      });
    });

    it('should handle empty arrays in filters', async () => {
      const filters: AnalyticsFilters = {
        departmentIds: [],
        skillCategories: []
      };

      mockedAxios.get.mockResolvedValue({ data: { data: [], metadata: {} } });

      await AnalyticsService.getTeamUtilization(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/team-utilization', {
        params: {}
      });
    });

    it('should handle undefined utilization threshold values', async () => {
      const filters: AnalyticsFilters = {
        utilizationThreshold: {
          min: undefined,
          max: 0.9
        }
      };

      mockedAxios.get.mockResolvedValue({ data: { data: [] } });

      await AnalyticsService.getResourceAllocationMetrics(filters);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/analytics/resource-allocation', {
        params: {
          maxUtilization: 0.9
        }
      });
    });
  });

  describe('error handling', () => {
    it('should propagate network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(AnalyticsService.getTeamUtilization()).rejects.toThrow('Network Error');
    });

    it('should propagate HTTP errors', async () => {
      const httpError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      };
      mockedAxios.get.mockRejectedValue(httpError);

      await expect(AnalyticsService.getTeamUtilization()).rejects.toEqual(httpError);
    });

    it('should handle export errors', async () => {
      const exportError = new Error('Export failed');
      mockedAxios.post.mockRejectedValue(exportError);

      const exportOptions = {
        format: 'json' as const,
        includeSummary: true,
        includeCharts: false,
        includeRawData: true,
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      await expect(AnalyticsService.exportAnalytics(exportOptions)).rejects.toThrow('Export failed');
    });
  });
});