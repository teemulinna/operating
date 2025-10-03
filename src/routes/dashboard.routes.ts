/**
 * Dashboard Routes - Production Implementation
 * Provides endpoints for dashboard statistics and analytics
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { serviceInjectionMiddleware } from '../middleware/service-injection.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Apply service injection middleware to all dashboard routes
router.use(serviceInjectionMiddleware);

/**
 * GET /api/dashboard/stats
 * Get comprehensive dashboard statistics
 * Access: All authenticated users
 */
router.get('/stats', dashboardController.getStats);

/**
 * GET /api/dashboard/trends
 * Get trend data for dashboard charts
 * Access: All authenticated users
 * Query params:
 * - period: 7days | 30days | 90days | 1year
 * - metric: utilization | projects | allocations
 */
router.get('/trends', dashboardController.getTrends);

/**
 * GET /api/dashboard/alerts
 * Get current alerts and warnings
 * Access: All authenticated users
 */
router.get('/alerts', dashboardController.getAlerts);

export default router;