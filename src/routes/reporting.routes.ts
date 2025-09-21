import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ReportingService } from '../services/reporting.service';
import { AnalyticsService } from '../services/analytics.service';
import { asyncHandler } from '../middleware/async-handler';
import { AnalyticsFilters, ExportOptions } from '../types/analytics.types';

const router = Router();

// Validation middleware
const validateDateRange = [
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
  query('departmentIds').optional().isArray(),
  query('aggregationPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly'])
];

const validateReportConfig = [
  body('name').notEmpty().withMessage('Report name is required'),
  body('reportType').isIn([
    'utilization_report', 'burn_down_chart', 'department_analytics',
    'executive_dashboard', 'trend_analysis', 'comparison_report', 'custom_report'
  ]).withMessage('Invalid report type'),
  body('configuration').isObject().withMessage('Configuration must be an object'),
  body('isPublic').optional().isBoolean(),
  body('scheduleFrequency').optional().isIn(['daily', 'weekly', 'monthly'])
];

const validateExportOptions = [
  body('format').isIn(['pdf', 'csv', 'json', 'png']).withMessage('Invalid export format'),
  body('includeSummary').optional().isBoolean(),
  body('includeCharts').optional().isBoolean(),
  body('includeRawData').optional().isBoolean(),
  body('dateRange').isObject().withMessage('Date range is required'),
  body('dateRange.from').isISO8601().withMessage('Valid from date required'),
  body('dateRange.to').isISO8601().withMessage('Valid to date required')
];

// Helper function to check validation results
const checkValidationErrors = (req: Request, res: Response): Response | null => {
  const errors = validationResult(req);
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
const buildFilters = (req: Request): AnalyticsFilters => {
  return {
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    departmentIds: req.query.departmentIds ? (req.query.departmentIds as string[]) : undefined,
    aggregationPeriod: req.query.aggregationPeriod as any || 'weekly'
  };
};

// GET /api/reporting/utilization - Generate utilization report
router.get('/utilization',
  validateDateRange,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const filters = buildFilters(req);
    const reportingService = new ReportingService();

    const report = await reportingService.generateUtilizationReport(filters);

    return res.json({
      success: true,
      message: 'Utilization report generated successfully',
      data: report.data,
      metadata: report.metadata
    });
  })
);

// GET /api/reporting/burn-down/:projectId - Generate project burn-down report
router.get('/burn-down/:projectId',
  param('projectId').notEmpty().withMessage('Project ID is required'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { projectId } = req.params;
    const reportingService = new ReportingService();

    const report = await reportingService.generateBurnDownReport(projectId);

    return res.json({
      success: true,
      message: 'Burn-down report generated successfully',
      data: report.data,
      metadata: report.metadata
    });
  })
);

// GET /api/reporting/executive-dashboard - Generate executive dashboard
router.get('/executive-dashboard',
  validateDateRange,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const filters = buildFilters(req);
    const reportingService = new ReportingService();

    const dashboard = await reportingService.generateExecutiveDashboard(filters);

    return res.json({
      success: true,
      message: 'Executive dashboard generated successfully',
      data: dashboard.data,
      metadata: dashboard.metadata
    });
  })
);

// GET /api/reporting/department-analytics - Department-level analytics
router.get('/department-analytics',
  validateDateRange,
  query('departmentId').optional().isString(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const filters = buildFilters(req);

    // Get team utilization data
    const utilizationData = await AnalyticsService.getTeamUtilizationData(filters);

    // Get capacity trends
    const trendsData = await AnalyticsService.getCapacityTrends(filters);

    // Get department performance
    const performanceData = await AnalyticsService.getDepartmentPerformance(filters);

    // Get skill gap analysis
    const skillGaps = await AnalyticsService.getSkillGapAnalysis(filters);

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
  })
);

// POST /api/reporting/comparison - Generate comparison report
router.post('/comparison',
  body('type').isIn(['department', 'project', 'employee', 'time-period']).withMessage('Invalid comparison type'),
  body('subjectIds').isArray().withMessage('Subject IDs must be an array'),
  body('metrics').isArray().withMessage('Metrics must be an array'),
  validateDateRange,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { type, subjectIds, metrics } = req.body;
    const filters = buildFilters(req);
    const reportingService = new ReportingService();

    const report = await reportingService.generateComparisonReport(type, subjectIds, metrics, filters);

    return res.json({
      success: true,
      message: 'Comparison report generated successfully',
      data: report.data,
      metadata: report.metadata
    });
  })
);

// GET /api/reporting/trends - Resource demand trends and forecasting
router.get('/trends',
  validateDateRange,
  query('forecastPeriods').optional().isInt({ min: 1, max: 24 }).withMessage('Forecast periods must be 1-24'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const filters = buildFilters(req);
    const forecastPeriods = parseInt(req.query.forecastPeriods as string) || 12;

    // Get capacity trends
    const trendsData = await AnalyticsService.getCapacityTrends(filters);

    // Get resource allocation metrics which includes forecasts
    const metricsData = await AnalyticsService.getResourceAllocationMetrics(filters);

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
  })
);

// POST /api/reporting/export - Export report in various formats
router.post('/export/:reportType',
  param('reportType').isIn([
    'utilization', 'burn-down', 'executive-dashboard', 'department-analytics', 'comparison', 'trends'
  ]).withMessage('Invalid report type'),
  validateExportOptions,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { reportType } = req.params;
    const exportOptions: ExportOptions = {
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
    const reportingService = new ReportingService();
    let reportData: any;
    const filters: AnalyticsFilters = {
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
        const utilization = await AnalyticsService.getTeamUtilizationData(filters);
        const performance = await AnalyticsService.getDepartmentPerformance(filters);
        reportData = { data: { utilization: utilization.data, performance: performance.data } };
        break;
      case 'trends':
        const trends = await AnalyticsService.getCapacityTrends(filters);
        const metrics = await AnalyticsService.getResourceAllocationMetrics(filters);
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
  })
);

// GET /api/reporting/download/:fileName - Download exported report
router.get('/download/:fileName',
  param('fileName').notEmpty().withMessage('File name is required'),
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

// GET /api/reporting/configurations - Get saved report configurations
router.get('/configurations',
  query('userId').optional().isString(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const reportingService = new ReportingService();
    
    const configurations = await reportingService.getReportConfigurations(userId);

    res.json({
      success: true,
      message: 'Report configurations retrieved successfully',
      data: configurations
    });
  })
);

// POST /api/reporting/configurations - Save report configuration
router.post('/configurations',
  validateReportConfig,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const reportingService = new ReportingService();
    const configId = await reportingService.saveReportConfiguration(req.body);

    return res.status(201).json({
      success: true,
      message: 'Report configuration saved successfully',
      data: { id: configId }
    });
  })
);

// GET /api/reporting/real-time/metrics - Real-time analytics metrics
router.get('/real-time/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    // Get current utilization metrics
    const utilizationSummary = await AnalyticsService.getResourceAllocationMetrics();
    
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
  })
);

// GET /api/reporting/kpis - Key Performance Indicators
router.get('/kpis',
  validateDateRange,
  asyncHandler(async (req: Request, res: Response) => {
    const filters = buildFilters(req);
    const reportingService = new ReportingService();
    
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
  })
);

export default router;