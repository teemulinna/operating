"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const api_error_1 = require("../utils/api-error");
const database_service_1 = require("../database/database.service");
class AnalyticsController {
    /**
     * Get team utilization data
     */
    static async getTeamUtilization(req, res) {
        try {
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            if (req.query.departmentIds) {
                filters.departmentIds = req.query.departmentIds.split(',').filter(Boolean);
            }
            if (req.query.aggregationPeriod) {
                filters.aggregationPeriod = req.query.aggregationPeriod;
            }
            const result = await analytics_service_1.AnalyticsService.getTeamUtilizationData(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching team utilization data:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch team utilization data');
        }
    }
    /**
     * Get capacity trends
     */
    static async getCapacityTrends(req, res) {
        try {
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            if (req.query.departmentIds) {
                filters.departmentIds = req.query.departmentIds.split(',').filter(Boolean);
            }
            if (req.query.aggregationPeriod) {
                filters.aggregationPeriod = req.query.aggregationPeriod;
            }
            const result = await analytics_service_1.AnalyticsService.getCapacityTrends(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching capacity trends:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch capacity trends');
        }
    }
    /**
     * Get resource allocation metrics
     */
    static async getResourceAllocationMetrics(req, res) {
        try {
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            if (req.query.departmentIds) {
                filters.departmentIds = req.query.departmentIds.split(',').filter(Boolean);
            }
            if (req.query.skillCategories) {
                filters.skillCategories = req.query.skillCategories.split(',').filter(Boolean);
            }
            const minUtil = req.query.minUtilization ? parseFloat(req.query.minUtilization) : undefined;
            const maxUtil = req.query.maxUtilization ? parseFloat(req.query.maxUtilization) : undefined;
            if (minUtil !== undefined || maxUtil !== undefined) {
                filters.utilizationThreshold = {};
                if (minUtil !== undefined)
                    filters.utilizationThreshold.min = minUtil;
                if (maxUtil !== undefined)
                    filters.utilizationThreshold.max = maxUtil;
            }
            const result = await analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching resource allocation metrics:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch resource allocation metrics');
        }
    }
    /**
     * Get skills gap analysis
     */
    static async getSkillsGapAnalysis(req, res) {
        try {
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            if (req.query.departmentIds) {
                filters.departmentIds = req.query.departmentIds.split(',').filter(Boolean);
            }
            if (req.query.skillCategories) {
                filters.skillCategories = req.query.skillCategories.split(',').filter(Boolean);
            }
            const result = await analytics_service_1.AnalyticsService.getSkillGapAnalysis(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching skills gap analysis:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch skills gap analysis');
        }
    }
    /**
     * Get department performance
     */
    static async getDepartmentPerformance(req, res) {
        try {
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            if (req.query.departmentIds) {
                filters.departmentIds = req.query.departmentIds.split(',').filter(Boolean);
            }
            const result = await analytics_service_1.AnalyticsService.getDepartmentPerformance(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching department performance:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch department performance');
        }
    }
    /**
     * Compare departments
     */
    static async compareDepartments(req, res) {
        try {
            const { departmentAId, departmentBId } = req.params;
            if (!departmentAId || !departmentBId) {
                throw new api_error_1.ApiError(400, 'Both department IDs are required');
            }
            const filters = {};
            if (req.query.dateFrom) {
                filters.dateFrom = new Date(req.query.dateFrom);
            }
            if (req.query.dateTo) {
                filters.dateTo = new Date(req.query.dateTo);
            }
            const result = await analytics_service_1.AnalyticsService.compareDepartments(departmentAId, departmentBId, filters);
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
        }
        catch (error) {
            console.error('Error comparing departments:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to compare departments');
        }
    }
    /**
     * Export analytics data
     */
    static async exportAnalytics(req, res) {
        try {
            const exportOptions = {
                format: req.body.format || 'json',
                includeSummary: req.body.includeSummary !== false,
                includeCharts: req.body.includeCharts !== false,
                includeRawData: req.body.includeRawData !== false,
                dateRange: {
                    from: req.body.dateRange?.from ? new Date(req.body.dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    to: req.body.dateRange?.to ? new Date(req.body.dateRange.to) : new Date()
                }
            };
            const filters = {
                dateFrom: exportOptions.dateRange.from,
                dateTo: exportOptions.dateRange.to,
                departmentIds: req.body.departmentIds,
                skillCategories: req.body.skillCategories
            };
            // Gather all analytics data
            const [utilizationData, capacityTrends, resourceMetrics, skillsGap, departmentPerformance] = await Promise.all([
                analytics_service_1.AnalyticsService.getTeamUtilizationData(filters),
                analytics_service_1.AnalyticsService.getCapacityTrends(filters),
                analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters),
                analytics_service_1.AnalyticsService.getSkillGapAnalysis(filters),
                analytics_service_1.AnalyticsService.getDepartmentPerformance(filters)
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
        }
        catch (error) {
            console.error('Error exporting analytics:', error);
            throw new api_error_1.ApiError(500, 'Failed to export analytics data');
        }
    }
    /**
     * Get comprehensive dashboard statistics with real database calculations
     */
    static async getDashboardStats(_req, res) {
        try {
            const db = database_service_1.DatabaseService.getInstance().getPool();
            // Simplified dashboard query compatible with PostgreSQL
            const dashboardQuery = `
        SELECT 
          -- Employee metrics
          (SELECT COUNT(*) FROM employees WHERE is_active = true) as "employeeCount",
          (SELECT COUNT(*) FROM employees) as total_employees,
          
          -- Project metrics  
          (SELECT COUNT(*) FROM projects WHERE status IN ('active', 'planning') AND is_active = true) as "projectCount",
          (SELECT COUNT(*) FROM projects WHERE status = 'completed' AND is_active = true) as completed_projects,
          (SELECT COUNT(*) FROM projects WHERE is_active = true) as total_projects,
          
          -- Allocation metrics
          (SELECT COUNT(*) FROM resource_allocations) as "allocationCount",
          (SELECT COUNT(*) FROM resource_allocations WHERE is_active = true) as active_allocations,
          (SELECT COALESCE(SUM(allocated_hours), 0) FROM resource_allocations WHERE is_active = true) as total_allocated_hours,
          
          -- Simple utilization calculation
          CASE 
            WHEN (SELECT SUM(COALESCE(default_hours, 40)) FROM employees WHERE is_active = true) > 0 THEN
              ROUND(
                ((SELECT COALESCE(SUM(allocated_hours), 0) FROM resource_allocations WHERE is_active = true)::numeric / 
                 NULLIF((SELECT SUM(COALESCE(default_hours, 40)) FROM employees WHERE is_active = true)::numeric, 0) * 100), 
                2
              )
            ELSE 0
          END as "utilizationRate"
      `;
            const result = await db.query(dashboardQuery);
            const stats = result.rows[0];
            // Format response with comprehensive dashboard data
            const dashboardData = {
                // Core metrics (backward compatibility)
                employeeCount: parseInt(stats.employeeCount) || 0,
                projectCount: parseInt(stats.projectCount) || 0,
                utilizationRate: parseFloat(stats.utilizationRate) || 0,
                allocationCount: parseInt(stats.allocationCount) || 0,
                // Extended metrics for enhanced dashboard
                summary: {
                    totalEmployees: parseInt(stats.total_employees) || 0,
                    completedProjects: parseInt(stats.completed_projects) || 0,
                    totalProjects: parseInt(stats.total_projects) || 0,
                    activeAllocations: parseInt(stats.active_allocations) || 0,
                    totalAllocatedHours: parseFloat(stats.total_allocated_hours) || 0
                },
                utilization: {
                    overallRate: parseFloat(stats.utilizationRate) || 0
                },
                metadata: {
                    generatedAt: new Date(),
                    dataSource: 'real-time',
                    queryOptimized: true,
                    note: 'Using simplified real database calculations'
                }
            };
            res.json(dashboardData);
        }
        catch (error) {
            console.error('Error fetching comprehensive dashboard stats:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            // Return minimal fallback data with error indication
            res.json({
                employeeCount: 0,
                projectCount: 0,
                utilizationRate: 0,
                allocationCount: 0,
                error: 'Dashboard data temporarily unavailable',
                errorDetails: error.message,
                metadata: {
                    generatedAt: new Date(),
                    dataSource: 'fallback',
                    queryOptimized: false
                }
            });
        }
    }
    /**
     * Get analytics dashboard summary
     */
    static async getDashboardSummary(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) :
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : new Date()
            };
            const [resourceMetrics, skillsGap, departmentPerformance] = await Promise.all([
                analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters),
                analytics_service_1.AnalyticsService.getSkillGapAnalysis(filters),
                analytics_service_1.AnalyticsService.getDepartmentPerformance(filters)
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
        }
        catch (error) {
            console.error('Error fetching dashboard summary:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch dashboard summary');
        }
    }
}
exports.AnalyticsController = AnalyticsController;
