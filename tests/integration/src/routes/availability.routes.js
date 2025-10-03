"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
// import { authenticateToken } from '../middleware/auth.middleware';
const role_middleware_1 = require("../middleware/role.middleware");
const async_handler_1 = require("../middleware/async-handler");
const service_injection_middleware_1 = require("../middleware/service-injection.middleware");
const api_error_1 = require("../utils/api-error");
const availability_controller_1 = require("../controllers/availability.controller");
const logger_1 = require("../utils/logger");
const date_fns_1 = require("date-fns");
const router = (0, express_1.Router)();
const controller = new availability_controller_1.AvailabilityController();
// Middleware for all routes
// router.use(authenticateToken); // Authentication disabled for development
router.use(service_injection_middleware_1.serviceInjectionMiddleware);
// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        // Get the first error message
        const firstError = errors.array()[0];
        const message = firstError.msg || 'Validation failed';
        res.status(400).json({
            success: false,
            message: message,
            errors: errors.array()
        });
        return;
    }
    next();
};
// Date validation helper
const validateDateParam = (value) => {
    const date = (0, date_fns_1.parseISO)(value);
    if (!(0, date_fns_1.isValid)(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
    }
    return true;
};
// ============================================
// AVAILABILITY PATTERNS
// ============================================
// GET /api/availability/patterns
router.get('/patterns', [
    (0, express_validator_1.query)('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.query)('departmentId').optional().isUUID().withMessage('Invalid department ID'),
    (0, express_validator_1.query)('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    (0, express_validator_1.query)('patternType').optional().isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getPatterns(req, res);
    return result;
}));
// GET /api/availability/patterns/:id
router.get('/patterns/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid pattern ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getPattern(req, res);
    return result;
}));
// POST /api/availability/patterns
router.post('/patterns', 
// roleGuard(['admin', 'manager']), // Temporarily disabled for development
[
    (0, express_validator_1.body)('employeeId').isUUID().withMessage('Employee ID is required'),
    (0, express_validator_1.body)('patternType').isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Pattern name is required'),
    (0, express_validator_1.body)('startDate').optional().isISO8601().withMessage('Valid start date is required'),
    (0, express_validator_1.body)('endDate').optional().isISO8601().withMessage('Invalid end date'),
    (0, express_validator_1.body)('effectiveFrom').optional().isISO8601().withMessage('Valid effective from date is required'),
    (0, express_validator_1.body)('effectiveTo').optional().isISO8601().withMessage('Invalid effective to date'),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('weeklyHours').optional().isObject(),
    (0, express_validator_1.body)('customDates').optional().isArray(),
    (0, express_validator_1.body)('metadata').optional().isObject(),
    (0, express_validator_1.body)('configuration').optional().isObject(),
    (0, express_validator_1.body)('notes').optional().isString()
], 
// Custom validation to ensure at least one date field is present
(req, res, next) => {
    if (!req.body.startDate && !req.body.effectiveFrom) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: [{
                    type: 'field',
                    msg: 'Either startDate or effectiveFrom is required',
                    path: 'startDate',
                    location: 'body'
                }]
        });
        return;
    }
    next();
}, validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.createPattern(req, res);
    return result;
}));
// PUT /api/availability/patterns/:id
router.put('/patterns/:id', 
// roleGuard(['admin', 'manager']), // Disabled for development
[
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid pattern ID'),
    (0, express_validator_1.body)('name').optional().isString().trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('patternType').optional().isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    (0, express_validator_1.body)('startDate').optional().isISO8601(),
    (0, express_validator_1.body)('endDate').optional().isISO8601(),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('weeklyHours').optional().isObject(),
    (0, express_validator_1.body)('customDates').optional().isArray(),
    (0, express_validator_1.body)('metadata').optional().isObject(),
    (0, express_validator_1.body)('notes').optional().isString()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.updatePattern(req, res);
    return result;
}));
// DELETE /api/availability/patterns/:id
router.delete('/patterns/:id', 
// roleGuard(['admin', 'manager']), // Disabled for development
[
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid pattern ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.deletePattern(req, res);
    return result;
}));
// POST /api/availability/patterns/:id/activate
router.post('/patterns/:id/activate', 
// roleGuard(['admin', 'manager']), // Disabled for development
[
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid pattern ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.activatePattern(req, res);
    return result;
}));
// POST /api/availability/patterns/:id/clone
router.post('/patterns/:id/clone', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid pattern ID'),
    (0, express_validator_1.body)('employeeId').isUUID().withMessage('Target employee ID is required'),
    (0, express_validator_1.body)('name').optional().isString().notEmpty()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.clonePattern(req, res);
    return result;
}));
// ============================================
// AVAILABILITY EXCEPTIONS
// ============================================
// GET /api/availability/exceptions
router.get('/exceptions', [
    (0, express_validator_1.query)('employeeId').optional().isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.query)('exceptionType').optional().isIn(['holiday', 'leave', 'training', 'other']),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'approved', 'rejected']),
    (0, express_validator_1.query)('startDate').optional().custom(validateDateParam),
    (0, express_validator_1.query)('endDate').optional().custom(validateDateParam),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getExceptions(req, res);
    return result;
}));
// GET /api/availability/exceptions/:id
router.get('/exceptions/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid exception ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getException(req, res);
    return result;
}));
// POST /api/availability/exceptions
router.post('/exceptions', [
    (0, express_validator_1.body)('employeeId').isUUID().withMessage('Employee ID is required'),
    (0, express_validator_1.body)('exceptionType').isIn(['holiday', 'leave', 'training', 'other']),
    (0, express_validator_1.body)('exceptionDate').isISO8601().withMessage('Valid exception date is required'),
    (0, express_validator_1.body)('endDate').optional().isISO8601().withMessage('Invalid end date'),
    (0, express_validator_1.body)('reason').optional().isString().notEmpty(),
    (0, express_validator_1.body)('hoursAffected').optional().isFloat({ min: 0, max: 24 }),
    (0, express_validator_1.body)('metadata').optional().isObject()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.createException(req, res);
    return result;
}));
// PUT /api/availability/exceptions/:id
router.put('/exceptions/:id', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid exception ID'),
    (0, express_validator_1.body)('exceptionType').optional().isIn(['holiday', 'leave', 'training', 'other']),
    (0, express_validator_1.body)('exceptionDate').optional().isISO8601(),
    (0, express_validator_1.body)('endDate').optional().isISO8601(),
    (0, express_validator_1.body)('reason').optional().isString().notEmpty(),
    (0, express_validator_1.body)('hoursAffected').optional().isFloat({ min: 0, max: 24 }),
    (0, express_validator_1.body)('metadata').optional().isObject()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.updateException(req, res);
    return result;
}));
// DELETE /api/availability/exceptions/:id
router.delete('/exceptions/:id', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid exception ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.deleteException(req, res);
    return result;
}));
// POST /api/availability/exceptions/:id/approve
router.post('/exceptions/:id/approve', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid exception ID'),
    (0, express_validator_1.body)('approvedBy').isUUID().withMessage('Approver ID is required'),
    (0, express_validator_1.body)('comments').optional().isString()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.approveException(req, res);
    return result;
}));
// POST /api/availability/exceptions/:id/reject
router.post('/exceptions/:id/reject', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid exception ID'),
    (0, express_validator_1.body)('rejectedBy').isUUID().withMessage('Rejector ID is required'),
    (0, express_validator_1.body)('reason').isString().notEmpty().withMessage('Rejection reason is required')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.rejectException(req, res);
    return result;
}));
// ============================================
// HOLIDAYS
// ============================================
// GET /api/availability/holidays
router.get('/holidays', [
    (0, express_validator_1.query)('year').optional().isInt({ min: 2020, max: 2100 }).toInt(),
    (0, express_validator_1.query)('country').optional().isString().isLength({ min: 2, max: 2 }),
    (0, express_validator_1.query)('region').optional().isString(),
    (0, express_validator_1.query)('includeOptional').optional().isBoolean()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getHolidays(req, res);
    return result;
}));
// GET /api/availability/holidays/:id
router.get('/holidays/:id', [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid holiday ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getHoliday(req, res);
    return result;
}));
// POST /api/availability/holidays
router.post('/holidays', (0, role_middleware_1.roleGuard)(['admin']), [
    (0, express_validator_1.body)('name').isString().notEmpty().withMessage('Holiday name is required'),
    (0, express_validator_1.body)('holidayDate').isISO8601().withMessage('Valid holiday date is required'),
    (0, express_validator_1.body)('isRecurring').optional().isBoolean(),
    (0, express_validator_1.body)('country').optional().isString().isLength({ min: 2, max: 2 }),
    (0, express_validator_1.body)('region').optional().isString(),
    (0, express_validator_1.body)('metadata').optional().isObject()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.createHoliday(req, res);
    return result;
}));
// PUT /api/availability/holidays/:id
router.put('/holidays/:id', (0, role_middleware_1.roleGuard)(['admin']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid holiday ID'),
    (0, express_validator_1.body)('name').optional().isString().trim().isLength({ min: 1 }),
    (0, express_validator_1.body)('holidayDate').optional().isISO8601(),
    (0, express_validator_1.body)('isRecurring').optional().isBoolean(),
    (0, express_validator_1.body)('country').optional().isString().isLength({ min: 2, max: 2 }),
    (0, express_validator_1.body)('region').optional().isString(),
    (0, express_validator_1.body)('metadata').optional().isObject()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.updateHoliday(req, res);
    return result;
}));
// DELETE /api/availability/holidays/:id
router.delete('/holidays/:id', (0, role_middleware_1.roleGuard)(['admin']), [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid holiday ID')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.deleteHoliday(req, res);
    return result;
}));
// POST /api/availability/holidays/bulk-import
router.post('/holidays/bulk-import', (0, role_middleware_1.roleGuard)(['admin']), [
    (0, express_validator_1.body)('holidays').isArray().withMessage('Holidays array is required'),
    (0, express_validator_1.body)('holidays.*.name').isString().notEmpty(),
    (0, express_validator_1.body)('holidays.*.holidayDate').isISO8601(),
    (0, express_validator_1.body)('holidays.*.country').optional().isString().isLength({ min: 2, max: 2 }),
    (0, express_validator_1.body)('replaceExisting').optional().isBoolean()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.bulkImportHolidays(req, res);
    return result;
}));
// ============================================
// EFFECTIVE AVAILABILITY
// ============================================
// GET /api/availability/effective/:employeeId/:date
router.get('/effective/:employeeId/:date', [
    (0, express_validator_1.param)('employeeId').isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.param)('date').custom(validateDateParam)
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getEffectiveAvailability(req, res);
    return result;
}));
// GET /api/availability/effective/:employeeId/range
router.get('/effective/:employeeId/range', [
    (0, express_validator_1.param)('employeeId').isUUID().withMessage('Invalid employee ID'),
    (0, express_validator_1.query)('startDate').custom(validateDateParam),
    (0, express_validator_1.query)('endDate').custom(validateDateParam)
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getAvailabilityRange(req, res);
    return result;
}));
// GET /api/availability/department/:departmentId/summary
router.get('/department/:departmentId/summary', [
    (0, express_validator_1.param)('departmentId').isUUID().withMessage('Invalid department ID'),
    (0, express_validator_1.query)('date').optional().custom(validateDateParam),
    (0, express_validator_1.query)('startDate').optional().custom(validateDateParam),
    (0, express_validator_1.query)('endDate').optional().custom(validateDateParam)
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getDepartmentAvailability(req, res);
    return result;
}));
// GET /api/availability/team/:teamId/summary
router.get('/team/:teamId/summary', [
    (0, express_validator_1.param)('teamId').isUUID().withMessage('Invalid team ID'),
    (0, express_validator_1.query)('date').optional().custom(validateDateParam),
    (0, express_validator_1.query)('startDate').optional().custom(validateDateParam),
    (0, express_validator_1.query)('endDate').optional().custom(validateDateParam)
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getTeamAvailability(req, res);
    return result;
}));
// ============================================
// BULK OPERATIONS
// ============================================
// POST /api/availability/patterns/bulk-create
router.post('/patterns/bulk-create', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.body)('patterns').isArray().withMessage('Patterns array is required'),
    (0, express_validator_1.body)('patterns.*.employeeId').isUUID(),
    (0, express_validator_1.body)('patterns.*.patternType').isIn(['weekly', 'biweekly', 'monthly', 'custom']),
    (0, express_validator_1.body)('patterns.*.name').isString().notEmpty(),
    (0, express_validator_1.body)('patterns.*.startDate').isISO8601()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.bulkCreatePatterns(req, res);
    return result;
}));
// POST /api/availability/patterns/bulk-update
router.post('/patterns/bulk-update', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.body)('patternIds').isArray().withMessage('Pattern IDs array is required'),
    (0, express_validator_1.body)('patternIds.*').isUUID(),
    (0, express_validator_1.body)('updates').isObject().withMessage('Updates object is required')
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.bulkUpdatePatterns(req, res);
    return result;
}));
// POST /api/availability/patterns/copy-week
router.post('/patterns/copy-week', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.body)('sourceWeekStart').custom(validateDateParam),
    (0, express_validator_1.body)('targetWeekStart').custom(validateDateParam),
    (0, express_validator_1.body)('employeeIds').optional().isArray(),
    (0, express_validator_1.body)('employeeIds.*').optional().isUUID()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.copyWeekPattern(req, res);
    return result;
}));
// ============================================
// ANALYTICS & REPORTS
// ============================================
// GET /api/availability/analytics/utilization
router.get('/analytics/utilization', [
    (0, express_validator_1.query)('startDate').custom(validateDateParam),
    (0, express_validator_1.query)('endDate').custom(validateDateParam),
    (0, express_validator_1.query)('departmentId').optional().isUUID(),
    (0, express_validator_1.query)('teamId').optional().isUUID(),
    (0, express_validator_1.query)('granularity').optional().isIn(['daily', 'weekly', 'monthly'])
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getUtilizationAnalytics(req, res);
    return result;
}));
// GET /api/availability/analytics/coverage
router.get('/analytics/coverage', [
    (0, express_validator_1.query)('date').custom(validateDateParam),
    (0, express_validator_1.query)('shiftStart').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    (0, express_validator_1.query)('shiftEnd').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    (0, express_validator_1.query)('requiredCoverage').optional().isInt({ min: 1 })
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getCoverageAnalysis(req, res);
    return result;
}));
// GET /api/availability/analytics/forecast
router.get('/analytics/forecast', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.query)('weeks').optional().isInt({ min: 1, max: 52 }).toInt(),
    (0, express_validator_1.query)('departmentId').optional().isUUID(),
    (0, express_validator_1.query)('includeSeasonality').optional().isBoolean()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getAvailabilityForecast(req, res);
    return result;
}));
// GET /api/availability/export
router.get('/export', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.query)('format').isIn(['csv', 'excel', 'json']),
    (0, express_validator_1.query)('startDate').custom(validateDateParam),
    (0, express_validator_1.query)('endDate').custom(validateDateParam),
    (0, express_validator_1.query)('departmentId').optional().isUUID(),
    (0, express_validator_1.query)('includeExceptions').optional().isBoolean()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.exportAvailability(req, res);
    return result;
}));
// ============================================
// NOTIFICATIONS & ALERTS
// ============================================
// POST /api/availability/alerts/configure
router.post('/alerts/configure', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.body)('alertType').isIn(['low_coverage', 'pattern_conflict', 'exception_pending']),
    (0, express_validator_1.body)('threshold').optional().isNumeric(),
    (0, express_validator_1.body)('recipients').isArray().withMessage('Recipients array is required'),
    (0, express_validator_1.body)('recipients.*').isEmail(),
    (0, express_validator_1.body)('enabled').optional().isBoolean()
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.configureAlerts(req, res);
    return result;
}));
// GET /api/availability/alerts/pending
router.get('/alerts/pending', (0, role_middleware_1.roleGuard)(['admin', 'manager']), [
    (0, express_validator_1.query)('alertType').optional().isIn(['low_coverage', 'pattern_conflict', 'exception_pending']),
    (0, express_validator_1.query)('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
], validateRequest, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await controller.getPendingAlerts(req, res);
    return result;
}));
// Error handling middleware
router.use((error, req, res, next) => {
    logger_1.logger.error('Availability route error:', error);
    if (error instanceof api_error_1.ApiError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            errors: error.errors || []
        });
    }
    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});
exports.default = router;
