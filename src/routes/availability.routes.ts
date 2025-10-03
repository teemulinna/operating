import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
// import { authenticateToken } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { asyncHandler } from '../middleware/async-handler';
import { serviceInjectionMiddleware } from '../middleware/service-injection.middleware';
import { ApiError } from '../utils/api-error';
import { AvailabilityController } from '../controllers/availability.controller';
import { logger } from '../utils/logger';
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

const router = Router();
const controller = new AvailabilityController();

// Middleware for all routes
// router.use(authenticateToken); // Authentication disabled for development
router.use(serviceInjectionMiddleware);

// Validation middleware
const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  next();
};

// Date validation helper
const validateDateParam = (value: string) => {
  const date = parseISO(value);
  if (!isValid(date)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }
  return true;
};

// ============================================
// AVAILABILITY PATTERNS
// ============================================

// GET /api/availability/patterns
router.get(
  '/patterns',
  [
    query('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    query('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('patternType').optional().isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getPatterns(req, res);
    return result;
  })
);

// GET /api/availability/patterns/:id
router.get(
  '/patterns/:id',
  [
    param('id').isUUID().withMessage('Invalid pattern ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getPattern(req, res);
    return result;
  })
);

// POST /api/availability/patterns
router.post(
  '/patterns',
  roleGuard(['admin', 'manager']),
  [
    body('employeeId').isUUID().withMessage('Employee ID is required'),
    body('patternType').isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    body('name').isString().notEmpty().withMessage('Pattern name is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('isActive').optional().isBoolean(),
    body('weeklyHours').optional().isObject(),
    body('customDates').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.createPattern(req, res);
    return result;
  })
);

// PUT /api/availability/patterns/:id
router.put(
  '/patterns/:id',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid pattern ID'),
    body('name').optional().isString().notEmpty(),
    body('patternType').optional().isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('isActive').optional().isBoolean(),
    body('weeklyHours').optional().isObject(),
    body('customDates').optional().isArray(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.updatePattern(req, res);
    return result;
  })
);

// DELETE /api/availability/patterns/:id
router.delete(
  '/patterns/:id',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid pattern ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.deletePattern(req, res);
    return result;
  })
);

// POST /api/availability/patterns/:id/activate
router.post(
  '/patterns/:id/activate',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid pattern ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.activatePattern(req, res);
    return result;
  })
);

// POST /api/availability/patterns/:id/clone
router.post(
  '/patterns/:id/clone',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid pattern ID'),
    body('employeeId').isUUID().withMessage('Target employee ID is required'),
    body('name').optional().isString().notEmpty()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.clonePattern(req, res);
    return result;
  })
);

// ============================================
// AVAILABILITY EXCEPTIONS
// ============================================

// GET /api/availability/exceptions
router.get(
  '/exceptions',
  [
    query('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    query('exceptionType').optional().isIn(['holiday', 'leave', 'training', 'other']),
    query('status').optional().isIn(['pending', 'approved', 'rejected']),
    query('startDate').optional().custom(validateDateParam),
    query('endDate').optional().custom(validateDateParam),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getExceptions(req, res);
    return result;
  })
);

// GET /api/availability/exceptions/:id
router.get(
  '/exceptions/:id',
  [
    param('id').isUUID().withMessage('Invalid exception ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getException(req, res);
    return result;
  })
);

// POST /api/availability/exceptions
router.post(
  '/exceptions',
  [
    body('employeeId').isUUID().withMessage('Employee ID is required'),
    body('exceptionType').isIn(['holiday', 'leave', 'training', 'other']),
    body('exceptionDate').isISO8601().withMessage('Valid exception date is required'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('reason').optional().isString().notEmpty(),
    body('hoursAffected').optional().isFloat({ min: 0, max: 24 }),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.createException(req, res);
    return result;
  })
);

// PUT /api/availability/exceptions/:id
router.put(
  '/exceptions/:id',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid exception ID'),
    body('exceptionType').optional().isIn(['holiday', 'leave', 'training', 'other']),
    body('exceptionDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('reason').optional().isString().notEmpty(),
    body('hoursAffected').optional().isFloat({ min: 0, max: 24 }),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.updateException(req, res);
    return result;
  })
);

// DELETE /api/availability/exceptions/:id
router.delete(
  '/exceptions/:id',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid exception ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.deleteException(req, res);
    return result;
  })
);

// POST /api/availability/exceptions/:id/approve
router.post(
  '/exceptions/:id/approve',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid exception ID'),
    body('approvedBy').isUUID().withMessage('Approver ID is required'),
    body('comments').optional().isString()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.approveException(req, res);
    return result;
  })
);

// POST /api/availability/exceptions/:id/reject
router.post(
  '/exceptions/:id/reject',
  roleGuard(['admin', 'manager']),
  [
    param('id').isUUID().withMessage('Invalid exception ID'),
    body('rejectedBy').isUUID().withMessage('Rejector ID is required'),
    body('reason').isString().notEmpty().withMessage('Rejection reason is required')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.rejectException(req, res);
    return result;
  })
);

// ============================================
// HOLIDAYS
// ============================================

// GET /api/availability/holidays
router.get(
  '/holidays',
  [
    query('year').optional().isInt({ min: 2020, max: 2100 }).toInt(),
    query('country').optional().isString().isLength({ min: 2, max: 2 }),
    query('region').optional().isString(),
    query('includeOptional').optional().isBoolean()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getHolidays(req, res);
    return result;
  })
);

// GET /api/availability/holidays/:id
router.get(
  '/holidays/:id',
  [
    param('id').isUUID().withMessage('Invalid holiday ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getHoliday(req, res);
    return result;
  })
);

// POST /api/availability/holidays
router.post(
  '/holidays',
  roleGuard(['admin']),
  [
    body('name').isString().notEmpty().withMessage('Holiday name is required'),
    body('holidayDate').isISO8601().withMessage('Valid holiday date is required'),
    body('isRecurring').optional().isBoolean(),
    body('country').optional().isString().isLength({ min: 2, max: 2 }),
    body('region').optional().isString(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.createHoliday(req, res);
    return result;
  })
);

// PUT /api/availability/holidays/:id
router.put(
  '/holidays/:id',
  roleGuard(['admin']),
  [
    param('id').isUUID().withMessage('Invalid holiday ID'),
    body('name').optional().isString().notEmpty(),
    body('holidayDate').optional().isISO8601(),
    body('isRecurring').optional().isBoolean(),
    body('country').optional().isString().isLength({ min: 2, max: 2 }),
    body('region').optional().isString(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.updateHoliday(req, res);
    return result;
  })
);

// DELETE /api/availability/holidays/:id
router.delete(
  '/holidays/:id',
  roleGuard(['admin']),
  [
    param('id').isUUID().withMessage('Invalid holiday ID')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.deleteHoliday(req, res);
    return result;
  })
);

// POST /api/availability/holidays/bulk-import
router.post(
  '/holidays/bulk-import',
  roleGuard(['admin']),
  [
    body('holidays').isArray().withMessage('Holidays array is required'),
    body('holidays.*.name').isString().notEmpty(),
    body('holidays.*.holidayDate').isISO8601(),
    body('holidays.*.country').optional().isString().isLength({ min: 2, max: 2 }),
    body('replaceExisting').optional().isBoolean()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.bulkImportHolidays(req, res);
    return result;
  })
);

// ============================================
// EFFECTIVE AVAILABILITY
// ============================================

// GET /api/availability/effective/:employeeId/:date
router.get(
  '/effective/:employeeId/:date',
  [
    param('employeeId').isUUID().withMessage('Invalid employee ID'),
    param('date').custom(validateDateParam)
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getEffectiveAvailability(req, res);
    return result;
  })
);

// GET /api/availability/effective/:employeeId/range
router.get(
  '/effective/:employeeId/range',
  [
    param('employeeId').isUUID().withMessage('Invalid employee ID'),
    query('startDate').custom(validateDateParam),
    query('endDate').custom(validateDateParam)
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getAvailabilityRange(req, res);
    return result;
  })
);

// GET /api/availability/department/:departmentId/summary
router.get(
  '/department/:departmentId/summary',
  [
    param('departmentId').isUUID().withMessage('Invalid department ID'),
    query('date').optional().custom(validateDateParam),
    query('startDate').optional().custom(validateDateParam),
    query('endDate').optional().custom(validateDateParam)
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getDepartmentAvailability(req, res);
    return result;
  })
);

// GET /api/availability/team/:teamId/summary
router.get(
  '/team/:teamId/summary',
  [
    param('teamId').isUUID().withMessage('Invalid team ID'),
    query('date').optional().custom(validateDateParam),
    query('startDate').optional().custom(validateDateParam),
    query('endDate').optional().custom(validateDateParam)
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getTeamAvailability(req, res);
    return result;
  })
);

// ============================================
// BULK OPERATIONS
// ============================================

// POST /api/availability/patterns/bulk-create
router.post(
  '/patterns/bulk-create',
  roleGuard(['admin', 'manager']),
  [
    body('patterns').isArray().withMessage('Patterns array is required'),
    body('patterns.*.employeeId').isUUID(),
    body('patterns.*.patternType').isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    body('patterns.*.name').isString().notEmpty(),
    body('patterns.*.startDate').isISO8601()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.bulkCreatePatterns(req, res);
    return result;
  })
);

// POST /api/availability/patterns/bulk-update
router.post(
  '/patterns/bulk-update',
  roleGuard(['admin', 'manager']),
  [
    body('patternIds').isArray().withMessage('Pattern IDs array is required'),
    body('patternIds.*').isUUID(),
    body('updates').isObject().withMessage('Updates object is required')
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.bulkUpdatePatterns(req, res);
    return result;
  })
);

// POST /api/availability/patterns/copy-week
router.post(
  '/patterns/copy-week',
  roleGuard(['admin', 'manager']),
  [
    body('sourceWeekStart').custom(validateDateParam),
    body('targetWeekStart').custom(validateDateParam),
    body('employeeIds').optional().isArray(),
    body('employeeIds.*').optional().isUUID()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.copyWeekPattern(req, res);
    return result;
  })
);

// ============================================
// ANALYTICS & REPORTS
// ============================================

// GET /api/availability/analytics/utilization
router.get(
  '/analytics/utilization',
  [
    query('startDate').custom(validateDateParam),
    query('endDate').custom(validateDateParam),
    query('departmentId').optional().isUUID(),
    query('teamId').optional().isUUID(),
    query('granularity').optional().isIn(['daily', 'weekly', 'monthly'])
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getUtilizationAnalytics(req, res);
    return result;
  })
);

// GET /api/availability/analytics/coverage
router.get(
  '/analytics/coverage',
  [
    query('date').custom(validateDateParam),
    query('shiftStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    query('shiftEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    query('requiredCoverage').optional().isInt({ min: 1 })
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getCoverageAnalysis(req, res);
    return result;
  })
);

// GET /api/availability/analytics/forecast
router.get(
  '/analytics/forecast',
  roleGuard(['admin', 'manager']),
  [
    query('weeks').optional().isInt({ min: 1, max: 52 }).toInt(),
    query('departmentId').optional().isUUID(),
    query('includeSeasonality').optional().isBoolean()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getAvailabilityForecast(req, res);
    return result;
  })
);

// GET /api/availability/export
router.get(
  '/export',
  roleGuard(['admin', 'manager']),
  [
    query('format').isIn(['csv', 'excel', 'json']),
    query('startDate').custom(validateDateParam),
    query('endDate').custom(validateDateParam),
    query('departmentId').optional().isUUID(),
    query('includeExceptions').optional().isBoolean()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.exportAvailability(req, res);
    return result;
  })
);

// ============================================
// NOTIFICATIONS & ALERTS
// ============================================

// POST /api/availability/alerts/configure
router.post(
  '/alerts/configure',
  roleGuard(['admin', 'manager']),
  [
    body('alertType').isIn(['low_coverage', 'pattern_conflict', 'exception_pending']),
    body('threshold').optional().isNumeric(),
    body('recipients').isArray().withMessage('Recipients array is required'),
    body('recipients.*').isEmail(),
    body('enabled').optional().isBoolean()
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.configureAlerts(req, res);
    return result;
  })
);

// GET /api/availability/alerts/pending
router.get(
  '/alerts/pending',
  roleGuard(['admin', 'manager']),
  [
    query('alertType').optional().isIn(['low_coverage', 'pattern_conflict', 'exception_pending']),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await controller.getPendingAlerts(req, res);
    return result;
  })
);

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Availability route error:', error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;