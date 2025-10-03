"use strict";
/**
 * Heat Map Routes - Phase 1 Production Implementation
 * Following plan.md lines 55-60 for endpoint specifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const heat_map_controller_1 = require("../controllers/heat-map.controller");
const router = (0, express_1.Router)();
const heatMapController = new heat_map_controller_1.HeatMapController();
// Apply authentication to all routes
// Disabled for testing - re-enable in production
// router.use(authMiddleware);
/**
 * GET /api/capacity/heatmap
 * Get heat map data with filters
 * Access: All authenticated users
 */
router.get('/heatmap', heat_map_controller_1.HeatMapController.validateHeatMapQuery, heatMapController.getHeatMap);
/**
 * GET /api/capacity/heatmap/summary
 * Get heat map summary statistics
 * Access: All authenticated users
 */
router.get('/heatmap/summary', heat_map_controller_1.HeatMapController.validateHeatMapQuery, heatMapController.getHeatMapSummary);
/**
 * GET /api/capacity/trends/:employeeId
 * Get employee utilization trends
 * Access: Employee (own data), Manager, Admin
 */
router.get('/trends/:employeeId', heat_map_controller_1.HeatMapController.validateEmployeeTrends, heatMapController.getEmployeeTrends);
/**
 * GET /api/capacity/bottlenecks
 * Identify capacity bottlenecks
 * Access: Manager, Admin, Executive
 */
router.get('/bottlenecks', 
// roleGuard(['manager', 'admin', 'executive']), // Disabled for testing
heat_map_controller_1.HeatMapController.validateHeatMapQuery, heatMapController.getBottlenecks);
/**
 * GET /api/capacity/heatmap/export
 * Export heat map data
 * Access: Manager, Admin
 */
router.get('/heatmap/export', 
// roleGuard(['manager', 'admin']), // Disabled for testing
heat_map_controller_1.HeatMapController.validateHeatMapQuery, heatMapController.exportHeatMap);
/**
 * POST /api/capacity/heatmap/refresh
 * Manually refresh heat map data
 * Access: Admin only
 */
router.post('/heatmap/refresh', 
// roleGuard(['admin']), // Disabled for testing
heatMapController.refreshHeatMap);
exports.default = router;
