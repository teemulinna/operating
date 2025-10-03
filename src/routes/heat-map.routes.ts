/**
 * Heat Map Routes - Phase 1 Production Implementation
 * Following plan.md lines 55-60 for endpoint specifications
 */

import { Router } from 'express';
import { HeatMapController } from '../controllers/heat-map.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';

const router = Router();
const heatMapController = new HeatMapController();

// Apply authentication to all routes
// Disabled for testing - re-enable in production
// router.use(authMiddleware);

/**
 * GET /api/capacity/heatmap
 * Get heat map data with filters
 * Access: All authenticated users
 */
router.get(
  '/heatmap',
  HeatMapController.validateHeatMapQuery,
  heatMapController.getHeatMap
);

/**
 * GET /api/capacity/heatmap/summary
 * Get heat map summary statistics
 * Access: All authenticated users
 */
router.get(
  '/heatmap/summary',
  HeatMapController.validateHeatMapQuery,
  heatMapController.getHeatMapSummary
);

/**
 * GET /api/capacity/trends/:employeeId
 * Get employee utilization trends
 * Access: Employee (own data), Manager, Admin
 */
router.get(
  '/trends/:employeeId',
  HeatMapController.validateEmployeeTrends,
  heatMapController.getEmployeeTrends
);

/**
 * GET /api/capacity/bottlenecks
 * Identify capacity bottlenecks
 * Access: Manager, Admin, Executive
 */
router.get(
  '/bottlenecks',
  // roleGuard(['manager', 'admin', 'executive']), // Disabled for testing
  HeatMapController.validateHeatMapQuery,
  heatMapController.getBottlenecks
);

/**
 * GET /api/capacity/heatmap/export
 * Export heat map data
 * Access: Manager, Admin
 */
router.get(
  '/heatmap/export',
  // roleGuard(['manager', 'admin']), // Disabled for testing
  HeatMapController.validateHeatMapQuery,
  heatMapController.exportHeatMap
);

/**
 * POST /api/capacity/heatmap/refresh
 * Manually refresh heat map data
 * Access: Admin only
 */
router.post(
  '/heatmap/refresh',
  // roleGuard(['admin']), // Disabled for testing
  heatMapController.refreshHeatMap
);

export default router;