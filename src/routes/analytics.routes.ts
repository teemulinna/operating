import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { asyncHandler } from '../middleware/async-handler';

const router = Router();

/**
 * @swagger
 * /api/analytics/team-utilization:
 *   get:
 *     summary: Get team utilization data by department
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for data range
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for data range
 *       - in: query
 *         name: departmentIds
 *         schema:
 *           type: string
 *         description: Comma-separated department IDs to filter
 *       - in: query
 *         name: aggregationPeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly]
 *         description: Data aggregation period
 *     responses:
 *       200:
 *         description: Team utilization data retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/team-utilization', asyncHandler(AnalyticsController.getTeamUtilization));

/**
 * @swagger
 * /api/analytics/capacity-trends:
 *   get:
 *     summary: Get capacity trends over time
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for trend analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for trend analysis
 *       - in: query
 *         name: departmentIds
 *         schema:
 *           type: string
 *         description: Comma-separated department IDs
 *       - in: query
 *         name: aggregationPeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly]
 *         description: Trend aggregation period
 *     responses:
 *       200:
 *         description: Capacity trends retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/capacity-trends', asyncHandler(AnalyticsController.getCapacityTrends));

/**
 * @swagger
 * /api/analytics/resource-allocation:
 *   get:
 *     summary: Get comprehensive resource allocation metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for metrics calculation
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for metrics calculation
 *       - in: query
 *         name: departmentIds
 *         schema:
 *           type: string
 *         description: Comma-separated department IDs
 *       - in: query
 *         name: skillCategories
 *         schema:
 *           type: string
 *         description: Comma-separated skill categories
 *       - in: query
 *         name: minUtilization
 *         schema:
 *           type: number
 *         description: Minimum utilization threshold
 *       - in: query
 *         name: maxUtilization
 *         schema:
 *           type: number
 *         description: Maximum utilization threshold
 *     responses:
 *       200:
 *         description: Resource allocation metrics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/resource-allocation', asyncHandler(AnalyticsController.getResourceAllocationMetrics));

/**
 * @swagger
 * /api/analytics/skills-gap:
 *   get:
 *     summary: Get skills gap analysis
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *       - in: query
 *         name: departmentIds
 *         schema:
 *           type: string
 *         description: Comma-separated department IDs
 *       - in: query
 *         name: skillCategories
 *         schema:
 *           type: string
 *         description: Comma-separated skill categories
 *     responses:
 *       200:
 *         description: Skills gap analysis retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/skills-gap', asyncHandler(AnalyticsController.getSkillsGapAnalysis));

/**
 * @swagger
 * /api/analytics/department-performance:
 *   get:
 *     summary: Get department performance metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for performance analysis
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for performance analysis
 *       - in: query
 *         name: departmentIds
 *         schema:
 *           type: string
 *         description: Comma-separated department IDs
 *     responses:
 *       200:
 *         description: Department performance metrics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/department-performance', asyncHandler(AnalyticsController.getDepartmentPerformance));

/**
 * @swagger
 * /api/analytics/compare-departments/{departmentAId}/{departmentBId}:
 *   get:
 *     summary: Compare two departments across multiple metrics
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: departmentAId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of first department to compare
 *       - in: path
 *         name: departmentBId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of second department to compare
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for comparison
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for comparison
 *     responses:
 *       200:
 *         description: Department comparison completed successfully
 *       400:
 *         description: Invalid department IDs
 *       500:
 *         description: Server error
 */
router.get('/compare-departments/:departmentAId/:departmentBId', asyncHandler(AnalyticsController.compareDepartments));

/**
 * @swagger
 * /api/analytics/export:
 *   post:
 *     summary: Export analytics data in various formats
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [png, pdf, csv, json]
 *                 default: json
 *               includeSummary:
 *                 type: boolean
 *                 default: true
 *               includeCharts:
 *                 type: boolean
 *                 default: true
 *               includeRawData:
 *                 type: boolean
 *                 default: true
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   from:
 *                     type: string
 *                     format: date
 *                   to:
 *                     type: string
 *                     format: date
 *               departmentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               skillCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *       500:
 *         description: Server error
 */
router.post('/export', asyncHandler(AnalyticsController.exportAnalytics));

/**
 * @swagger
 * /api/analytics/dashboard-summary:
 *   get:
 *     summary: Get analytics dashboard summary with key metrics and alerts
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for dashboard data
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for dashboard data
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalEmployees:
 *                       type: number
 *                     totalDepartments:
 *                       type: number
 *                     averageUtilization:
 *                       type: number
 *                     criticalSkillGaps:
 *                       type: number
 *                     topPerformingDepartment:
 *                       type: string
 *                 alerts:
 *                   type: object
 *                   properties:
 *                     overutilizedEmployees:
 *                       type: number
 *                     underutilizedEmployees:
 *                       type: number
 *                     criticalSkillGaps:
 *                       type: number
 *                     capacityShortfall:
 *                       type: number
 *                 trends:
 *                   type: object
 *                   properties:
 *                     utilizationTrend:
 *                       type: string
 *                     skillGapTrend:
 *                       type: string
 *                     capacityTrend:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.get('/dashboard-summary', asyncHandler(AnalyticsController.getDashboardSummary));

/**
 * @swagger
 * /api/analytics/stats:
 *   get:
 *     summary: Get basic dashboard statistics (employee count, project count, utilization rate)
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Basic dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 employeeCount:
 *                   type: number
 *                   description: Total number of active employees
 *                 projectCount:
 *                   type: number
 *                   description: Total number of active projects
 *                 utilizationRate:
 *                   type: number
 *                   description: Average team utilization percentage
 *                 allocationCount:
 *                   type: number
 *                   description: Total number of resource allocations
 *       500:
 *         description: Server error
 */
router.get('/stats', asyncHandler(AnalyticsController.getDashboardStats));

export default router;