"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const analytics_service_1 = require("../services/analytics.service");
const api_error_1 = require("../utils/api-error");
class AnalyticsController {
    static async getTeamUtilization(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                departmentIds: req.query.departmentIds ?
                    req.query.departmentIds.split(',').filter(Boolean) : undefined,
                aggregationPeriod: req.query.aggregationPeriod || 'weekly'
            };
            const result = await analytics_service_1.AnalyticsService.getTeamUtilizationData(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching team utilization data:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch team utilization data');
        }
    }
    static async getCapacityTrends(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                departmentIds: req.query.departmentIds ?
                    req.query.departmentIds.split(',').filter(Boolean) : undefined,
                aggregationPeriod: req.query.aggregationPeriod || 'weekly'
            };
            const result = await analytics_service_1.AnalyticsService.getCapacityTrends(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching capacity trends:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch capacity trends');
        }
    }
    static async getResourceAllocationMetrics(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                departmentIds: req.query.departmentIds ?
                    req.query.departmentIds.split(',').filter(Boolean) : undefined,
                skillCategories: req.query.skillCategories ?
                    req.query.skillCategories.split(',').filter(Boolean) : undefined,
                utilizationThreshold: {
                    min: req.query.minUtilization ? parseFloat(req.query.minUtilization) : undefined,
                    max: req.query.maxUtilization ? parseFloat(req.query.maxUtilization) : undefined
                }
            };
            const result = await analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching resource allocation metrics:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch resource allocation metrics');
        }
    }
    static async getSkillsGapAnalysis(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                departmentIds: req.query.departmentIds ?
                    req.query.departmentIds.split(',').filter(Boolean) : undefined,
                skillCategories: req.query.skillCategories ?
                    req.query.skillCategories.split(',').filter(Boolean) : undefined
            };
            const result = await analytics_service_1.AnalyticsService.getSkillGapAnalysis(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching skills gap analysis:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch skills gap analysis');
        }
    }
    static async getDepartmentPerformance(req, res) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
                departmentIds: req.query.departmentIds ?
                    req.query.departmentIds.split(',').filter(Boolean) : undefined
            };
            const result = await analytics_service_1.AnalyticsService.getDepartmentPerformance(filters);
            res.json(result);
        }
        catch (error) {
            console.error('Error fetching department performance:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch department performance');
        }
    }
    static async compareDepartments(req, res) {
        try {
            const { departmentAId, departmentBId } = req.params;
            if (!departmentAId || !departmentBId) {
                throw new api_error_1.ApiError(400, 'Both department IDs are required');
            }
            const filters = {
                dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
                dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined
            };
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
            switch (exportOptions.format) {
                case 'json':
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.json"`);
                    break;
                case 'csv':
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${Date.now()}.csv"`);
                    break;
                case 'pdf':
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.pdf"`);
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
                    utilizationTrend: 'stable',
                    skillGapTrend: 'improving',
                    capacityTrend: 'increasing'
                },
                metadata: {
                    generatedAt: new Date(),
                    dataFreshness: 'real-time',
                    nextUpdate: new Date(Date.now() + 60 * 60 * 1000)
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
//# sourceMappingURL=analytics.controller.js.map