"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const resource_controller_1 = require("../controllers/resource.controller");
// UUID validation helper
const isValidUUID = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
const router = (0, express_1.Router)();
/**
 * @route   GET /api/resources/allocation
 * @desc    Get comprehensive resource allocation data
 * @access  Public (in production this would be protected)
 */
router.get('/allocation', [
    (0, express_validator_1.query)('departmentId').optional().isString().custom((value) => {
        if (value && !isValidUUID(value)) {
            throw new Error('Department ID must be a valid UUID');
        }
        return true;
    }).withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.query)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], resource_controller_1.ResourceController.getResourceAllocation);
/**
 * @route   GET /api/resources/optimization
 * @desc    Get resource optimization suggestions
 * @access  Public (in production this would be protected)
 */
router.get('/optimization', [
    (0, express_validator_1.query)('mode').optional().isIn(['balanced', 'utilization', 'skills', 'revenue']).withMessage('Invalid optimization mode')
], resource_controller_1.ResourceController.getOptimizationSuggestions);
/**
 * @route   POST /api/resources/allocation
 * @desc    Create new resource allocation
 * @access  Public (in production this would be protected)
 */
router.post('/allocation', [
    (0, express_validator_1.body)('employeeId').isString().custom((value) => {
        if (!isValidUUID(value)) {
            throw new Error('Employee ID is required and must be a valid UUID');
        }
        return true;
    }).withMessage('Employee ID is required and must be a valid UUID'),
    (0, express_validator_1.body)('projectId').isString().notEmpty().withMessage('Project ID is required'),
    (0, express_validator_1.body)('allocatedHours').isFloat({ min: 0, max: 168 }).withMessage('Allocated hours must be between 0 and 168'),
    (0, express_validator_1.body)('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.body)('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
], resource_controller_1.ResourceController.createAllocation);
/**
 * @route   GET /api/resources/conflicts
 * @desc    Get resource conflicts
 * @access  Public (in production this would be protected)
 */
router.get('/conflicts', [
    (0, express_validator_1.query)('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
    (0, express_validator_1.query)('type').optional().isIn(['overallocation', 'skill_mismatch', 'time_overlap', 'resource_unavailable']).withMessage('Invalid conflict type'),
    (0, express_validator_1.query)('employeeId').optional().isString().notEmpty().withMessage('Employee ID must be a string')
], resource_controller_1.ResourceController.getConflicts);
/**
 * @route   PATCH /api/resources/conflicts/:id
 * @desc    Resolve resource conflict
 * @access  Public (in production this would be protected)
 */
router.patch('/conflicts/:id', [
    (0, express_validator_1.param)('id').isString().notEmpty().withMessage('Conflict ID is required'),
    (0, express_validator_1.body)('status').isIn(['resolved', 'ignored']).withMessage('Status must be either "resolved" or "ignored"'),
    (0, express_validator_1.body)('resolution').optional().isString().withMessage('Resolution must be a string')
], resource_controller_1.ResourceController.resolveConflict);
/**
 * @route   GET /api/resources/analytics
 * @desc    Get comprehensive resource analytics
 * @access  Public (in production this would be protected)
 */
router.get('/analytics', [
    (0, express_validator_1.query)('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
    (0, express_validator_1.query)('departmentId').optional().isString().custom((value) => {
        if (value && !isValidUUID(value)) {
            throw new Error('Department ID must be a valid UUID');
        }
        return true;
    }).withMessage('Department ID must be a valid UUID')
], resource_controller_1.ResourceController.getResourceAnalytics);
exports.default = router;
