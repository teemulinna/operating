import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { AvailabilityController } from '../controllers/availabilityController';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Validation rules
const availabilityStatusValidation = [
  body('status')
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Status must be one of: available, busy, unavailable'),
  body('capacity')
    .isInt({ min: 0, max: 100 })
    .withMessage('Capacity must be an integer between 0 and 100'),
  body('currentProjects')
    .isInt({ min: 0 })
    .withMessage('Current projects must be a non-negative integer'),
  body('availableHours')
    .isInt({ min: 0 })
    .withMessage('Available hours must be a non-negative integer'),
];

const employeeStatusesQueryValidation = [
  query('status')
    .optional()
    .isIn(['available', 'busy', 'unavailable', 'all'])
    .withMessage('Status must be one of: available, busy, unavailable, all'),
  query('departmentId')
    .optional()
    .isUUID()
    .withMessage('Department ID must be a valid UUID'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const bulkUpdateValidation = [
  body('updates')
    .isArray({ min: 1 })
    .withMessage('Updates must be a non-empty array'),
  body('updates.*.employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  body('updates.*.status')
    .optional()
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Status must be one of: available, busy, unavailable'),
  body('updates.*.capacity')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Capacity must be between 0 and 100'),
  body('updates.*.currentProjects')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current projects must be non-negative'),
  body('updates.*.availableHours')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available hours must be non-negative'),
];

// Routes

/**
 * @route GET /api/availability/status
 * @description Get availability status for all employees with optional filtering
 * @access Public
 * @query {string} [status] - Filter by availability status (available, busy, unavailable, all)
 * @query {string} [departmentId] - Filter by department UUID
 * @query {string} [search] - Search in employee names, email, position
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=50] - Number of items per page
 */
router.get(
  '/status',
  employeeStatusesQueryValidation,
  validateRequest,
  AvailabilityController.getEmployeeStatuses
);

/**
 * @route PUT /api/availability/status/:id
 * @description Update employee availability status
 * @access Public
 * @param {string} id - Employee UUID
 * @body {string} status - New status (available, busy, unavailable)
 * @body {number} capacity - Capacity percentage (0-100)
 * @body {number} currentProjects - Number of current projects
 * @body {number} availableHours - Available hours per week
 */
router.put(
  '/status/:id',
  param('id').isUUID().withMessage('Employee ID must be a valid UUID'),
  availabilityStatusValidation,
  validateRequest,
  AvailabilityController.updateEmployeeStatus
);

/**
 * @route GET /api/availability/department/:id
 * @description Get department utilization metrics and employee details
 * @access Public
 * @param {string} id - Department UUID
 */
router.get(
  '/department/:id',
  param('id').isUUID().withMessage('Department ID must be a valid UUID'),
  validateRequest,
  AvailabilityController.getDepartmentUtilization
);

/**
 * @route GET /api/availability/real-time
 * @description Get WebSocket configuration for real-time updates
 * @access Public
 */
router.get(
  '/real-time',
  AvailabilityController.getRealTimeConfig
);

/**
 * @route GET /api/availability/real-time/status
 * @description Get real-time system status and metrics
 * @access Public
 */
router.get(
  '/real-time/status',
  AvailabilityController.getRealTimeStatus
);

/**
 * @route PUT /api/availability/bulk-update
 * @description Bulk update multiple employee availability statuses
 * @access Public
 * @body {Array} updates - Array of update objects with employeeId and fields to update
 */
router.put(
  '/bulk-update',
  bulkUpdateValidation,
  validateRequest,
  AvailabilityController.bulkUpdateAvailability
);

export { router as availabilityRoutes };