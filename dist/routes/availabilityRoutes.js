"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const availabilityController_1 = require("../controllers/availabilityController");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
exports.availabilityRoutes = router;
const availabilityStatusValidation = [
    (0, express_validator_1.body)('status')
        .isIn(['available', 'busy', 'unavailable'])
        .withMessage('Status must be one of: available, busy, unavailable'),
    (0, express_validator_1.body)('capacity')
        .isInt({ min: 0, max: 100 })
        .withMessage('Capacity must be an integer between 0 and 100'),
    (0, express_validator_1.body)('currentProjects')
        .isInt({ min: 0 })
        .withMessage('Current projects must be a non-negative integer'),
    (0, express_validator_1.body)('availableHours')
        .isInt({ min: 0 })
        .withMessage('Available hours must be a non-negative integer'),
];
const employeeStatusesQueryValidation = [
    (0, express_validator_1.query)('status')
        .optional()
        .isIn(['available', 'busy', 'unavailable', 'all'])
        .withMessage('Status must be one of: available, busy, unavailable, all'),
    (0, express_validator_1.query)('departmentId')
        .optional()
        .isUUID()
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('search')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be between 1 and 100 characters'),
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
];
const bulkUpdateValidation = [
    (0, express_validator_1.body)('updates')
        .isArray({ min: 1 })
        .withMessage('Updates must be a non-empty array'),
    (0, express_validator_1.body)('updates.*.employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.body)('updates.*.status')
        .optional()
        .isIn(['available', 'busy', 'unavailable'])
        .withMessage('Status must be one of: available, busy, unavailable'),
    (0, express_validator_1.body)('updates.*.capacity')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Capacity must be between 0 and 100'),
    (0, express_validator_1.body)('updates.*.currentProjects')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Current projects must be non-negative'),
    (0, express_validator_1.body)('updates.*.availableHours')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Available hours must be non-negative'),
];
router.get('/status', employeeStatusesQueryValidation, validate_middleware_1.validateRequest, availabilityController_1.AvailabilityController.getEmployeeStatuses);
router.put('/status/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Employee ID must be a valid UUID'), availabilityStatusValidation, validate_middleware_1.validateRequest, availabilityController_1.AvailabilityController.updateEmployeeStatus);
router.get('/department/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Department ID must be a valid UUID'), validate_middleware_1.validateRequest, availabilityController_1.AvailabilityController.getDepartmentUtilization);
router.get('/real-time', availabilityController_1.AvailabilityController.getRealTimeConfig);
router.get('/real-time/status', availabilityController_1.AvailabilityController.getRealTimeStatus);
router.put('/bulk-update', bulkUpdateValidation, validate_middleware_1.validateRequest, availabilityController_1.AvailabilityController.bulkUpdateAvailability);
//# sourceMappingURL=availabilityRoutes.js.map