"use strict";
/**
 * Heat Map Controller - Phase 1 Production Implementation
 * Following plan.md lines 55-60 for endpoint specifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatMapController = void 0;
const api_error_1 = require("../utils/api-error");
const async_handler_1 = require("../middleware/async-handler");
const express_validator_1 = require("express-validator");
class HeatMapController {
    constructor() {
        /**
         * GET /api/capacity/heatmap
         * Get heat map data with filters
         * plan.md line 56: filters: date range, granularity, dept/employee, levels
         */
        this.getHeatMap = (0, async_handler_1.asyncHandler)(async (req, res) => {
            // Validate request
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
            }
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                employeeId: req.query.employeeId,
                employeeIds: req.query.employeeIds ? req.query.employeeIds.split(',') : undefined,
                departmentId: req.query.departmentId,
                departmentIds: req.query.departmentIds ? req.query.departmentIds.split(',') : undefined,
                utilizationCategories: req.query.levels ? req.query.levels.split(',') : undefined,
                minUtilization: req.query.minUtilization ? parseFloat(req.query.minUtilization) : undefined,
                maxUtilization: req.query.maxUtilization ? parseFloat(req.query.maxUtilization) : undefined,
                groupBy: req.query.granularity
            };
            const heatMapService = this.getHeatMapService(req);
            const data = await heatMapService.getHeatMapData(filters);
            // Set cache headers for performance (plan.md line 59)
            res.set({
                'Cache-Control': 'public, max-age=300', // 5 minutes
                'ETag': `"heatmap-${Date.now()}"`,
                'X-Total-Count': data.length.toString()
            });
            res.status(200).json({
                success: true,
                data,
                meta: {
                    count: data.length,
                    filters,
                    timestamp: new Date().toISOString()
                }
            });
        });
        /**
         * GET /api/capacity/heatmap/summary
         * Get heat map summary statistics
         */
        this.getHeatMapSummary = (0, async_handler_1.asyncHandler)(async (req, res) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                employeeId: req.query.employeeId,
                departmentId: req.query.departmentId
            };
            const heatMapService = this.getHeatMapService(req);
            const summary = await heatMapService.getHeatMapSummary(filters);
            res.set({
                'Cache-Control': 'public, max-age=300'
            });
            res.status(200).json({
                success: true,
                data: summary,
                timestamp: new Date().toISOString()
            });
        });
        /**
         * GET /api/capacity/trends/:employeeId
         * Get employee utilization trends over time
         * plan.md line 57
         */
        this.getEmployeeTrends = (0, async_handler_1.asyncHandler)(async (req, res) => {
            const { employeeId } = req.params;
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw new api_error_1.ApiError(400, 'Start date and end date are required');
            }
            const heatMapService = this.getHeatMapService(req);
            const timeline = await heatMapService.getEmployeeTimeline(employeeId, new Date(startDate), new Date(endDate));
            res.set({
                'Cache-Control': 'public, max-age=300'
            });
            res.status(200).json({
                success: true,
                data: {
                    employeeId,
                    timeline,
                    statistics: this.calculateTrendStatistics(timeline)
                },
                timestamp: new Date().toISOString()
            });
        });
        /**
         * GET /api/capacity/bottlenecks
         * Identify capacity bottlenecks
         * plan.md line 58
         */
        this.getBottlenecks = (0, async_handler_1.asyncHandler)(async (req, res) => {
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : new Date(),
                endDate: req.query.endDate ? new Date(req.query.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                minUtilization: 80 // Focus on high utilization
            };
            const heatMapService = this.getHeatMapService(req);
            const data = await heatMapService.getHeatMapData(filters);
            // Group by employee and identify bottlenecks
            const bottlenecks = this.identifyBottlenecks(data);
            res.set({
                'Cache-Control': 'public, max-age=300'
            });
            res.status(200).json({
                success: true,
                data: {
                    bottlenecks,
                    totalBottlenecks: bottlenecks.length,
                    criticalCount: bottlenecks.filter(b => b.severity === 'critical').length,
                    recommendations: this.generateBottleneckRecommendations(bottlenecks)
                },
                timestamp: new Date().toISOString()
            });
        });
        /**
         * GET /api/capacity/heatmap/export
         * Export heat map data
         * plan.md line 59: Export service (CSV/PDF/PNG)
         */
        this.exportHeatMap = (0, async_handler_1.asyncHandler)(async (req, res) => {
            const format = req.query.format || 'csv';
            if (!['csv', 'json'].includes(format)) {
                throw new api_error_1.ApiError(400, 'Invalid export format. Supported: csv, json');
            }
            const filters = {
                startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
                endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
                employeeId: req.query.employeeId,
                departmentId: req.query.departmentId
            };
            if (format === 'csv') {
                const heatMapService = this.getHeatMapService(req);
                const csv = await heatMapService.exportToCSV(filters);
                res.set({
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="heatmap-${Date.now()}.csv"`
                });
                res.status(200).send(csv);
            }
            else {
                const heatMapService = this.getHeatMapService(req);
                const data = await heatMapService.getHeatMapData(filters);
                res.set({
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="heatmap-${Date.now()}.json"`
                });
                res.status(200).json(data);
            }
        });
        /**
         * POST /api/capacity/heatmap/refresh
         * Manually refresh the heat map materialized view
         */
        this.refreshHeatMap = (0, async_handler_1.asyncHandler)(async (req, res) => {
            const heatMapService = this.getHeatMapService(req);
            await heatMapService.refreshHeatMap();
            res.status(200).json({
                success: true,
                message: 'Heat map data refreshed successfully',
                timestamp: new Date().toISOString()
            });
        });
    }
    getHeatMapService(req) {
        const services = req.services;
        if (!services?.heatMap) {
            throw new api_error_1.ApiError(500, 'Heat map service not initialized');
        }
        return services.heatMap;
    }
    /**
     * Calculate trend statistics from timeline data
     */
    calculateTrendStatistics(timeline) {
        if (!timeline.length)
            return {};
        const utilizations = timeline.map(t => t.utilization_percentage);
        const sum = utilizations.reduce((a, b) => a + b, 0);
        const avg = sum / utilizations.length;
        const max = Math.max(...utilizations);
        const min = Math.min(...utilizations);
        // Calculate trend (simple linear regression)
        let trend = 'stable';
        if (timeline.length > 1) {
            const firstHalf = utilizations.slice(0, Math.floor(utilizations.length / 2));
            const secondHalf = utilizations.slice(Math.floor(utilizations.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            if (secondAvg > firstAvg + 10)
                trend = 'increasing';
            else if (secondAvg < firstAvg - 10)
                trend = 'decreasing';
        }
        return {
            average: Math.round(avg * 100) / 100,
            max: Math.round(max * 100) / 100,
            min: Math.round(min * 100) / 100,
            trend,
            overAllocationDays: timeline.filter(t => t.utilization_percentage > 100).length,
            criticalDays: timeline.filter(t => t.utilization_percentage > 120).length
        };
    }
    /**
     * Identify bottlenecks from heat map data
     */
    identifyBottlenecks(data) {
        const employeeBottlenecks = new Map();
        data.forEach(item => {
            if (item.utilizationPercentage >= 80) {
                if (!employeeBottlenecks.has(item.employeeId)) {
                    employeeBottlenecks.set(item.employeeId, {
                        employeeId: item.employeeId,
                        employeeName: item.employeeName,
                        departmentName: item.departmentName,
                        dates: [],
                        maxUtilization: 0,
                        avgUtilization: 0,
                        totalDays: 0
                    });
                }
                const bottleneck = employeeBottlenecks.get(item.employeeId);
                bottleneck.dates.push(item.date);
                bottleneck.maxUtilization = Math.max(bottleneck.maxUtilization, item.utilizationPercentage);
                bottleneck.avgUtilization += item.utilizationPercentage;
                bottleneck.totalDays++;
            }
        });
        const bottlenecks = Array.from(employeeBottlenecks.values()).map(b => {
            b.avgUtilization = b.avgUtilization / b.totalDays;
            b.severity = b.maxUtilization >= 120 ? 'critical' : b.maxUtilization >= 100 ? 'high' : 'medium';
            return b;
        });
        return bottlenecks.sort((a, b) => b.maxUtilization - a.maxUtilization);
    }
    /**
     * Generate recommendations for bottlenecks
     */
    generateBottleneckRecommendations(bottlenecks) {
        const recommendations = [];
        const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
        if (criticalCount > 0) {
            recommendations.push(`Immediate attention required: ${criticalCount} employees are critically over-allocated (>120%)`);
            recommendations.push('Consider redistributing workload or hiring additional resources');
        }
        const highCount = bottlenecks.filter(b => b.severity === 'high').length;
        if (highCount > 0) {
            recommendations.push(`${highCount} employees are over-allocated (>100%). Review project assignments`);
        }
        if (bottlenecks.length > 5) {
            recommendations.push('Multiple bottlenecks detected. Consider team expansion or project timeline adjustments');
        }
        const departments = new Set(bottlenecks.map(b => b.departmentName));
        if (departments.size === 1) {
            recommendations.push(`Bottlenecks concentrated in ${Array.from(departments)[0]}. Department-specific intervention needed`);
        }
        return recommendations;
    }
}
exports.HeatMapController = HeatMapController;
/**
 * Validation middleware for heat map endpoints
 */
HeatMapController.validateHeatMapQuery = [
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('Invalid end date format'),
    (0, express_validator_1.query)('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.query)('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    (0, express_validator_1.query)('granularity').optional().isIn(['day', 'week', 'month']).withMessage('Invalid granularity'),
    (0, express_validator_1.query)('levels').optional().isString().withMessage('Invalid levels format'),
    (0, express_validator_1.query)('minUtilization').optional().isFloat({ min: 0, max: 200 }).withMessage('Invalid min utilization'),
    (0, express_validator_1.query)('maxUtilization').optional().isFloat({ min: 0, max: 200 }).withMessage('Invalid max utilization')
];
HeatMapController.validateEmployeeTrends = [
    (0, express_validator_1.param)('employeeId').isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.query)('startDate').notEmpty().isISO8601().withMessage('Start date is required'),
    (0, express_validator_1.query)('endDate').notEmpty().isISO8601().withMessage('End date is required')
];
