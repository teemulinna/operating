import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsFilters, ExportOptions } from '../types/analytics.types';
import { ApiError } from '../utils/api-error';

export class AnalyticsController {
  
  /**
   * Get team utilization data
   */
  static async getTeamUtilization(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentIds: req.query.departmentIds ? 
          (req.query.departmentIds as string).split(',').filter(Boolean) : undefined,
        aggregationPeriod: (req.query.aggregationPeriod as 'daily' | 'weekly' | 'monthly' | 'quarterly') || 'weekly'
      };

      const result = await AnalyticsService.getTeamUtilizationData(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching team utilization data:', error);
      throw new ApiError(500, 'Failed to fetch team utilization data');
    }
  }

  /**
   * Get capacity trends
   */
  static async getCapacityTrends(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentIds: req.query.departmentIds ? 
          (req.query.departmentIds as string).split(',').filter(Boolean) : undefined,
        aggregationPeriod: (req.query.aggregationPeriod as 'daily' | 'weekly' | 'monthly' | 'quarterly') || 'weekly'
      };

      const result = await AnalyticsService.getCapacityTrends(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching capacity trends:', error);
      throw new ApiError(500, 'Failed to fetch capacity trends');
    }
  }

  /**
   * Get resource allocation metrics
   */
  static async getResourceAllocationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentIds: req.query.departmentIds ? 
          (req.query.departmentIds as string).split(',').filter(Boolean) : undefined,
        skillCategories: req.query.skillCategories ? 
          (req.query.skillCategories as string).split(',').filter(Boolean) : undefined,
        utilizationThreshold: {
          min: req.query.minUtilization ? parseFloat(req.query.minUtilization as string) : undefined,
          max: req.query.maxUtilization ? parseFloat(req.query.maxUtilization as string) : undefined
        }
      };

      const result = await AnalyticsService.getResourceAllocationMetrics(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching resource allocation metrics:', error);
      throw new ApiError(500, 'Failed to fetch resource allocation metrics');
    }
  }

  /**
   * Get skills gap analysis
   */
  static async getSkillsGapAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentIds: req.query.departmentIds ? 
          (req.query.departmentIds as string).split(',').filter(Boolean) : undefined,
        skillCategories: req.query.skillCategories ? 
          (req.query.skillCategories as string).split(',').filter(Boolean) : undefined
      };

      const result = await AnalyticsService.getSkillGapAnalysis(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching skills gap analysis:', error);
      throw new ApiError(500, 'Failed to fetch skills gap analysis');
    }
  }

  /**
   * Get department performance
   */
  static async getDepartmentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        departmentIds: req.query.departmentIds ? 
          (req.query.departmentIds as string).split(',').filter(Boolean) : undefined
      };

      const result = await AnalyticsService.getDepartmentPerformance(filters);
      res.json(result);
    } catch (error) {
      console.error('Error fetching department performance:', error);
      throw new ApiError(500, 'Failed to fetch department performance');
    }
  }

  /**
   * Compare departments
   */
  static async compareDepartments(req: Request, res: Response): Promise<void> {
    try {
      const { departmentAId, departmentBId } = req.params;
      
      if (!departmentAId || !departmentBId) {
        throw new ApiError(400, 'Both department IDs are required');
      }

      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
      };

      const result = await AnalyticsService.compareDepartments(departmentAId, departmentBId, filters);
      res.json({
        data: result,
        metadata: {
          generatedAt: new Date(),
          departments: {
            A: result.departmentA.name,
            B: result.departmentB.name
          }
        }
      });
    } catch (error) {
      console.error('Error comparing departments:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to compare departments');
    }
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const exportOptions: ExportOptions = {
        format: (req.body.format as 'png' | 'pdf' | 'csv' | 'json') || 'json',
        includeSummary: req.body.includeSummary !== false,
        includeCharts: req.body.includeCharts !== false,
        includeRawData: req.body.includeRawData !== false,
        dateRange: {
          from: req.body.dateRange?.from ? new Date(req.body.dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: req.body.dateRange?.to ? new Date(req.body.dateRange.to) : new Date()
        }
      };

      const filters: AnalyticsFilters = {
        dateFrom: exportOptions.dateRange.from,
        dateTo: exportOptions.dateRange.to,
        departmentIds: req.body.departmentIds,
        skillCategories: req.body.skillCategories
      };

      // Gather all analytics data
      const [
        utilizationData,
        capacityTrends,
        resourceMetrics,
        skillsGap,
        departmentPerformance
      ] = await Promise.all([
        AnalyticsService.getTeamUtilizationData(filters),
        AnalyticsService.getCapacityTrends(filters),
        AnalyticsService.getResourceAllocationMetrics(filters),
        AnalyticsService.getSkillGapAnalysis(filters),
        AnalyticsService.getDepartmentPerformance(filters)
      ]);

      const exportData = {
        exportOptions,
        generatedAt: new Date(),
        summary: {
          totalDataPoints: utilizationData.data.length + capacityTrends.data.length + 
                          skillsGap.data.length + departmentPerformance.data.length,
          dateRange: exportOptions.dateRange,
          departments: utilizationData.data.length,
          skillGaps: skillsGap.data.length,
          averageUtilization: resourceMetrics.data.averageUtilizationAcrossCompany
        },
        data: {
          teamUtilization: exportOptions.includeRawData ? utilizationData.data : null,
          capacityTrends: exportOptions.includeRawData ? capacityTrends.data : null,
          resourceAllocation: resourceMetrics.data,
          skillsGap: exportOptions.includeRawData ? skillsGap.data : null,
          departmentPerformance: exportOptions.includeRawData ? departmentPerformance.data : null
        }
      };

      // Set appropriate headers based on format
      switch (exportOptions.format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.json"`);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.csv"`);
          // Would need CSV conversion logic here
          break;
        case 'pdf':
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.pdf"`);
          // Would need PDF generation logic here
          break;
        default:
          res.setHeader('Content-Type', 'application/json');
      }

      res.json(exportData);
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw new ApiError(500, 'Failed to export analytics data');
    }
  }

  /**
   * Get analytics dashboard summary
   */
  static async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const filters: AnalyticsFilters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : 
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : new Date()
      };

      const [resourceMetrics, skillsGap, departmentPerformance] = await Promise.all([
        AnalyticsService.getResourceAllocationMetrics(filters),
        AnalyticsService.getSkillGapAnalysis(filters),
        AnalyticsService.getDepartmentPerformance(filters)
      ]);

      const summary = {
        overview: {
          totalEmployees: resourceMetrics.data.totalEmployees,
          totalDepartments: resourceMetrics.data.totalDepartments,
          averageUtilization: resourceMetrics.data.averageUtilizationAcrossCompany,
          criticalSkillGaps: skillsGap.data.filter(gap => gap.criticalityLevel === 'critical').length,
          topPerformingDepartment: departmentPerformance.data[0]?.departmentName || 'N/A'
        },
        alerts: {
          overutilizedEmployees: resourceMetrics.data.overutilizedEmployees,
          underutilizedEmployees: resourceMetrics.data.underutilizedEmployees,
          criticalSkillGaps: skillsGap.data.filter(gap => gap.criticalityLevel === 'critical').length,
          capacityShortfall: resourceMetrics.data.capacityForecast
            .filter(forecast => forecast.capacityGap > 0).length
        },
        trends: {
          utilizationTrend: 'stable', // Would calculate from historical data
          skillGapTrend: 'improving', // Would calculate from historical data
          capacityTrend: 'increasing' // Would calculate from historical data
        },
        metadata: {
          generatedAt: new Date(),
          dataFreshness: 'real-time',
          nextUpdate: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
        }
      };

      res.json(summary);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw new ApiError(500, 'Failed to fetch dashboard summary');
    }
  }
}