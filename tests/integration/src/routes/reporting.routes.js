"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const reporting_service_1 = require("../services/reporting.service");
const analytics_service_1 = require("../services/analytics.service");
const async_handler_1 = require("../middleware/async-handler");
const router = (0, express_1.Router)();
// Validation middleware
const validateDateRange = [
    (0, express_validator_1.query)('dateFrom').optional().isISO8601().toDate(),
    (0, express_validator_1.query)('dateTo').optional().isISO8601().toDate(),
    (0, express_validator_1.query)('departmentIds').optional().isArray(),
    (0, express_validator_1.query)('aggregationPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly'])
];
const validateReportConfig = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Report name is required'),
    (0, express_validator_1.body)('reportType').isIn([
        'utilization_report', 'burn_down_chart', 'department_analytics',
        'executive_dashboard', 'trend_analysis', 'comparison_report', 'custom_report'
    ]).withMessage('Invalid report type'),
    (0, express_validator_1.body)('configuration').isObject().withMessage('Configuration must be an object'),
    (0, express_validator_1.body)('isPublic').optional().isBoolean(),
    (0, express_validator_1.body)('scheduleFrequency').optional().isIn(['daily', 'weekly', 'monthly'])
];
const validateExportOptions = [
    (0, express_validator_1.body)('format').isIn(['pdf', 'csv', 'json', 'png']).withMessage('Invalid export format'),
    (0, express_validator_1.body)('includeSummary').optional().isBoolean(),
    (0, express_validator_1.body)('includeCharts').optional().isBoolean(),
    (0, express_validator_1.body)('includeRawData').optional().isBoolean(),
    (0, express_validator_1.body)('dateRange').isObject().withMessage('Date range is required'),
    (0, express_validator_1.body)('dateRange.from').isISO8601().withMessage('Valid from date required'),
    (0, express_validator_1.body)('dateRange.to').isISO8601().withMessage('Valid to date required')
];
// Helper function to check validation results
const checkValidationErrors = (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    return null;
};
// Helper function to build analytics filters
const buildFilters = (req) => {
    return {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo) : undefined,
        departmentIds: req.query.departmentIds ? req.query.departmentIds : undefined,
        aggregationPeriod: req.query.aggregationPeriod || 'weekly'
    };
};
// GET /api/reporting/utilization - Generate utilization report
router.get('/utilization', validateDateRange, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const filters = buildFilters(req);
    const reportingService = new reporting_service_1.ReportingService();
    const report = await reportingService.generateUtilizationReport(filters);
    return res.json({
        success: true,
        message: 'Utilization report generated successfully',
        data: report.data,
        metadata: report.metadata
    });
}));
// GET /api/reporting/burn-down/:projectId - Generate project burn-down report
router.get('/burn-down/:projectId', (0, express_validator_1.param)('projectId').notEmpty().withMessage('Project ID is required'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { projectId } = req.params;
    const reportingService = new reporting_service_1.ReportingService();
    const report = await reportingService.generateBurnDownReport(projectId);
    return res.json({
        success: true,
        message: 'Burn-down report generated successfully',
        data: report.data,
        metadata: report.metadata
    });
}));
// GET /api/reporting/executive-dashboard - Generate executive dashboard
router.get('/executive-dashboard', validateDateRange, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const filters = buildFilters(req);
    const reportingService = new reporting_service_1.ReportingService();
    const dashboard = await reportingService.generateExecutiveDashboard(filters);
    return res.json({
        success: true,
        message: 'Executive dashboard generated successfully',
        data: dashboard.data,
        metadata: dashboard.metadata
    });
}));
// GET /api/reporting/department-analytics - Department-level analytics
router.get('/department-analytics', validateDateRange, (0, express_validator_1.query)('departmentId').optional().isString(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const filters = buildFilters(req);
    // Get team utilization data
    const utilizationData = await analytics_service_1.AnalyticsService.getTeamUtilizationData(filters);
    // Get capacity trends
    const trendsData = await analytics_service_1.AnalyticsService.getCapacityTrends(filters);
    // Get department performance
    const performanceData = await analytics_service_1.AnalyticsService.getDepartmentPerformance(filters);
    // Get skill gap analysis
    const skillGaps = await analytics_service_1.AnalyticsService.getSkillGapAnalysis(filters);
    return res.json({
        success: true,
        message: 'Department analytics generated successfully',
        data: {
            utilization: utilizationData.data,
            trends: trendsData.data,
            performance: performanceData.data,
            skillGaps: skillGaps.data
        },
        metadata: {
            generatedAt: new Date(),
            dataPoints: utilizationData.data.length + trendsData.data.length + performanceData.data.length,
            dateRange: {
                from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                to: filters.dateTo || new Date()
            },
            filters
        }
    });
}));
// POST /api/reporting/comparison - Generate comparison report
router.post('/comparison', (0, express_validator_1.body)('type').isIn(['department', 'project', 'employee', 'time-period']).withMessage('Invalid comparison type'), (0, express_validator_1.body)('subjectIds').isArray().withMessage('Subject IDs must be an array'), (0, express_validator_1.body)('metrics').isArray().withMessage('Metrics must be an array'), validateDateRange, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { type, subjectIds, metrics } = req.body;
    const filters = buildFilters(req);
    const reportingService = new reporting_service_1.ReportingService();
    const report = await reportingService.generateComparisonReport(type, subjectIds, metrics, filters);
    return res.json({
        success: true,
        message: 'Comparison report generated successfully',
        data: report.data,
        metadata: report.metadata
    });
}));
// GET /api/reporting/trends - Resource demand trends and forecasting
router.get('/trends', validateDateRange, (0, express_validator_1.query)('forecastPeriods').optional().isInt({ min: 1, max: 24 }).withMessage('Forecast periods must be 1-24'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const filters = buildFilters(req);
    const forecastPeriods = parseInt(req.query.forecastPeriods) || 12;
    // Get capacity trends
    const trendsData = await analytics_service_1.AnalyticsService.getCapacityTrends(filters);
    // Get resource allocation metrics which includes forecasts
    const metricsData = await analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters);
    return res.json({
        success: true,
        message: 'Trend analysis completed successfully',
        data: {
            historicalTrends: trendsData.data,
            capacityForecast: metricsData.data.capacityForecast,
            resourceMetrics: {
                totalEmployees: metricsData.data.totalEmployees,
                averageUtilization: metricsData.data.averageUtilizationAcrossCompany,
                overutilizedEmployees: metricsData.data.overutilizedEmployees,
                underutilizedEmployees: metricsData.data.underutilizedEmployees
            }
        },
        metadata: trendsData.metadata
    });
}));
// POST /api/reporting/export - Export report in various formats
router.post('/export/:reportType', (0, express_validator_1.param)('reportType').isIn([
    'utilization', 'burn-down', 'executive-dashboard', 'department-analytics', 'comparison', 'trends'
]).withMessage('Invalid report type'), validateExportOptions, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { reportType } = req.params;
    const exportOptions = {
        format: req.body.format,
        includeSummary: req.body.includeSummary !== false,
        includeCharts: req.body.includeCharts !== false,
        includeRawData: req.body.includeRawData !== false,
        dateRange: {
            from: new Date(req.body.dateRange.from),
            to: new Date(req.body.dateRange.to)
        }
    };
    // Get the report data based on type
    const reportingService = new reporting_service_1.ReportingService();
    let reportData;
    const filters = {
        dateFrom: exportOptions.dateRange.from,
        dateTo: exportOptions.dateRange.to
    };
    switch (reportType) {
        case 'utilization':
            reportData = await reportingService.generateUtilizationReport(filters);
            break;
        case 'executive-dashboard':
            reportData = await reportingService.generateExecutiveDashboard(filters);
            break;
        case 'department-analytics':
            const utilization = await analytics_service_1.AnalyticsService.getTeamUtilizationData(filters);
            const performance = await analytics_service_1.AnalyticsService.getDepartmentPerformance(filters);
            reportData = { data: { utilization: utilization.data, performance: performance.data } };
            break;
        case 'trends':
            const trends = await analytics_service_1.AnalyticsService.getCapacityTrends(filters);
            const metrics = await analytics_service_1.AnalyticsService.getResourceAllocationMetrics(filters);
            reportData = { data: { trends: trends.data, forecast: metrics.data.capacityForecast } };
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Report type not implemented for export'
            });
    }
    // Export the report
    const exportResult = await reportingService.exportReport(reportData, reportType, exportOptions);
    return res.json({
        success: true,
        message: 'Report exported successfully',
        data: {
            fileName: exportResult.filePath.split('/').pop(),
            format: exportResult.format,
            size: exportResult.size,
            downloadUrl: `/api/reporting/download/${exportResult.filePath.split('/').pop()}`
        }
    });
}));
// GET /api/reporting/download/:fileName - Download exported report
router.get('/download/:fileName', (0, express_validator_1.param)('fileName').notEmpty().withMessage('File name is required'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { fileName } = req.params;
    const filePath = require('path').join(process.cwd(), 'reports', fileName);
    // Security check - ensure file exists and is in reports directory
    if (!require('fs').existsSync(filePath) || !filePath.includes('/reports/')) {
        return res.status(404).json({
            success: false,
            message: 'Report file not found'
        });
    }
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
        case 'pdf':
            contentType = 'application/pdf';
            break;
        case 'csv':
            contentType = 'text/csv';
            break;
        case 'json':
            contentType = 'application/json';
            break;
        case 'png':
            contentType = 'image/png';
            break;
    }
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.sendFile(filePath);
}));
// GET /api/reporting/configurations - Get saved report configurations
router.get('/configurations', (0, express_validator_1.query)('userId').optional().isString(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const userId = req.query.userId;
    const reportingService = new reporting_service_1.ReportingService();
    const configurations = await reportingService.getReportConfigurations(userId);
    res.json({
        success: true,
        message: 'Report configurations retrieved successfully',
        data: configurations
    });
}));
// POST /api/reporting/configurations - Save report configuration
router.post('/configurations', validateReportConfig, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const reportingService = new reporting_service_1.ReportingService();
    const configId = await reportingService.saveReportConfiguration(req.body);
    return res.status(201).json({
        success: true,
        message: 'Report configuration saved successfully',
        data: { id: configId }
    });
}));
// GET /api/reporting/real-time/metrics - Real-time analytics metrics
router.get('/real-time/metrics', (0, async_handler_1.asyncHandler)(async (req, res) => {
    // Get current utilization metrics
    const utilizationSummary = await analytics_service_1.AnalyticsService.getResourceAllocationMetrics();
    // Get current conflicts and alerts
    const currentTime = new Date();
    const todayStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    res.json({
        success: true,
        message: 'Real-time metrics retrieved successfully',
        data: {
            timestamp: currentTime,
            utilization: {
                totalEmployees: utilizationSummary.data.totalEmployees,
                averageUtilization: utilizationSummary.data.averageUtilizationAcrossCompany,
                overutilized: utilizationSummary.data.overutilizedEmployees,
                underutilized: utilizationSummary.data.underutilizedEmployees
            },
            capacity: {
                totalDepartments: utilizationSummary.data.totalDepartments,
                topPerformers: utilizationSummary.data.topPerformingDepartments.slice(0, 3)
            },
            alerts: utilizationSummary.data.criticalResourceGaps.filter(gap => gap.criticalityLevel === 'critical').length,
            trends: {
                // Mock real-time trend data - in production, this would be calculated from recent data
                utilizationChange: (Math.random() - 0.5) * 10,
                capacityChange: (Math.random() - 0.5) * 8,
                alertsChange: Math.floor((Math.random() - 0.5) * 6)
            }
        }
    });
}));
// GET /api/reporting/kpis - Key Performance Indicators
router.get('/kpis', validateDateRange, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const filters = buildFilters(req);
    const reportingService = new reporting_service_1.ReportingService();
    const dashboard = await reportingService.generateExecutiveDashboard(filters);
    res.json({
        success: true,
        message: 'KPIs retrieved successfully',
        data: {
            kpis: dashboard.data.kpis,
            trends: dashboard.data.trends,
            alerts: dashboard.data.alerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical')
        },
        metadata: dashboard.metadata
    });
}));
exports.default = router;
