import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { ResourceController } from '../controllers/resource.controller';

// UUID validation helper
const isValidUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const router = Router();

/**
 * @route   GET /api/resources/allocation
 * @desc    Get comprehensive resource allocation data
 * @access  Public (in production this would be protected)
 */
router.get(
  '/allocation',
  [
    query('departmentId').optional().isString().custom((value) => {
      if (value && !isValidUUID(value)) {
        throw new Error('Department ID must be a valid UUID');
      }
      return true;
    }).withMessage('Department ID must be a valid UUID'),
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
  ],
  ResourceController.getResourceAllocation
);

/**
 * @route   GET /api/resources/optimization
 * @desc    Get resource optimization suggestions
 * @access  Public (in production this would be protected)
 */
router.get(
  '/optimization',
  [
    query('mode').optional().isIn(['balanced', 'utilization', 'skills', 'revenue']).withMessage('Invalid optimization mode')
  ],
  ResourceController.getOptimizationSuggestions
);

/**
 * @route   POST /api/resources/allocation
 * @desc    Create new resource allocation
 * @access  Public (in production this would be protected)
 */
router.post(
  '/allocation',
  [
    body('employeeId').isString().custom((value) => {
      if (!isValidUUID(value)) {
        throw new Error('Employee ID is required and must be a valid UUID');
      }
      return true;
    }).withMessage('Employee ID is required and must be a valid UUID'),
    body('projectId').isString().notEmpty().withMessage('Project ID is required'),
    body('allocatedHours').isFloat({ min: 0, max: 168 }).withMessage('Allocated hours must be between 0 and 168'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date')
  ],
  ResourceController.createAllocation
);

/**
 * @route   GET /api/resources/conflicts
 * @desc    Get resource conflicts
 * @access  Public (in production this would be protected)
 */
router.get(
  '/conflicts',
  [
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
    query('type').optional().isIn(['overallocation', 'skill_mismatch', 'time_overlap', 'resource_unavailable']).withMessage('Invalid conflict type'),
    query('employeeId').optional().isString().notEmpty().withMessage('Employee ID must be a string')
  ],
  ResourceController.getConflicts
);

/**
 * @route   PATCH /api/resources/conflicts/:id
 * @desc    Resolve resource conflict
 * @access  Public (in production this would be protected)
 */
router.patch(
  '/conflicts/:id',
  [
    param('id').isString().notEmpty().withMessage('Conflict ID is required'),
    body('status').isIn(['resolved', 'ignored']).withMessage('Status must be either "resolved" or "ignored"'),
    body('resolution').optional().isString().withMessage('Resolution must be a string')
  ],
  ResourceController.resolveConflict
);

/**
 * @route   GET /api/resources/analytics
 * @desc    Get comprehensive resource analytics
 * @access  Public (in production this would be protected)
 */
router.get(
  '/analytics',
  [
    query('period').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid period'),
    query('departmentId').optional().isString().custom((value) => {
      if (value && !isValidUUID(value)) {
        throw new Error('Department ID must be a valid UUID');
      }
      return true;
    }).withMessage('Department ID must be a valid UUID')
  ],
  ResourceController.getResourceAnalytics
);

export default router;