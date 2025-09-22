"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const async_handler_1 = require("../middleware/async-handler");
const router = (0, express_1.Router)();
router.get('/team-utilization', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getTeamUtilization));
router.get('/capacity-trends', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getCapacityTrends));
router.get('/resource-allocation', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getResourceAllocationMetrics));
router.get('/skills-gap', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getSkillsGapAnalysis));
router.get('/department-performance', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getDepartmentPerformance));
router.get('/compare-departments/:departmentAId/:departmentBId', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.compareDepartments));
router.post('/export', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.exportAnalytics));
router.get('/dashboard-summary', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getDashboardSummary));
router.get('/stats', (0, async_handler_1.asyncHandler)(analytics_controller_1.AnalyticsController.getDashboardStats));
exports.default = router;
//# sourceMappingURL=analytics.routes.js.map