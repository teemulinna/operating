"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const capacity_controller_1 = require("../controllers/capacity.controller");
const router = express_1.default.Router();
exports.capacityRoutes = router;
const validateCapacityCreation = [
    (0, express_validator_1.body)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('availableHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Available hours must be between 0 and 24'),
    (0, express_validator_1.body)('allocatedHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Allocated hours must be between 0 and 24'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Notes must be a string with maximum 500 characters')
];
const validateCapacityUpdate = [
    (0, express_validator_1.param)('id')
        .isUUID()
        .withMessage('Capacity entry ID must be a valid UUID'),
    (0, express_validator_1.body)('availableHours')
        .optional()
        .isFloat({ min: 0, max: 24 })
        .withMessage('Available hours must be between 0 and 24'),
    (0, express_validator_1.body)('allocatedHours')
        .optional()
        .isFloat({ min: 0, max: 24 })
        .withMessage('Allocated hours must be between 0 and 24'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Notes must be a string with maximum 500 characters')
];
const validateBulkCapacityCreation = [
    (0, express_validator_1.body)('entries')
        .isArray({ min: 1, max: 100 })
        .withMessage('Entries must be an array with 1-100 items'),
    (0, express_validator_1.body)('entries.*.employeeId')
        .isUUID()
        .withMessage('Each entry must have a valid employee UUID'),
    (0, express_validator_1.body)('entries.*.date')
        .isISO8601()
        .withMessage('Each entry must have a valid ISO 8601 date'),
    (0, express_validator_1.body)('entries.*.availableHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Available hours must be between 0 and 24'),
    (0, express_validator_1.body)('entries.*.allocatedHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Allocated hours must be between 0 and 24')
];
const validateBulkImportCapacity = [
    (0, express_validator_1.body)('entries')
        .isArray({ min: 1, max: 500 })
        .withMessage('Entries must be an array with 1-500 items'),
    (0, express_validator_1.body)('entries.*.employeeId')
        .isUUID()
        .withMessage('Each entry must have a valid employee UUID'),
    (0, express_validator_1.body)('entries.*.date')
        .isISO8601()
        .withMessage('Each entry must have a valid ISO 8601 date'),
    (0, express_validator_1.body)('entries.*.availableHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Available hours must be between 0 and 24'),
    (0, express_validator_1.body)('entries.*.allocatedHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Allocated hours must be between 0 and 24')
];
const validateEmployeeParam = [
    (0, express_validator_1.param)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID')
];
const validateDateParam = [
    (0, express_validator_1.param)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date')
];
const validateQueryFilters = [
    (0, express_validator_1.query)('employeeId')
        .optional()
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.query)('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('Date from must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('dateTo')
        .optional()
        .isISO8601()
        .withMessage('Date to must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('minUtilization')
        .optional()
        .isFloat({ min: 0, max: 2 })
        .withMessage('Minimum utilization must be between 0 and 2'),
    (0, express_validator_1.query)('maxUtilization')
        .optional()
        .isFloat({ min: 0, max: 2 })
        .withMessage('Maximum utilization must be between 0 and 2')
];
const validateEmployeeCapacityUpdate = [
    (0, express_validator_1.param)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.body)('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('availableHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Available hours must be between 0 and 24'),
    (0, express_validator_1.body)('allocatedHours')
        .isFloat({ min: 0, max: 24 })
        .withMessage('Allocated hours must be between 0 and 24'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Notes must be a string with maximum 500 characters')
];
router.get('/', validateQueryFilters, capacity_controller_1.CapacityController.getAllCapacity);
router.post('/', validateCapacityCreation, capacity_controller_1.CapacityController.createCapacity);
router.post('/bulk', validateBulkCapacityCreation, capacity_controller_1.CapacityController.bulkCreateCapacity);
router.post('/bulk-import', validateBulkImportCapacity, capacity_controller_1.CapacityController.bulkImportCapacity);
router.get('/export', capacity_controller_1.CapacityController.exportCapacityCSV);
router.get('/summary', capacity_controller_1.CapacityController.getUtilizationSummary);
router.get('/trends', capacity_controller_1.CapacityController.getTeamCapacityTrends);
router.get('/overutilized', capacity_controller_1.CapacityController.getOverutilizedEmployees);
router.get('/department/:departmentName', capacity_controller_1.CapacityController.getDepartmentCapacity);
router.get('/employee/:employeeId', validateEmployeeParam, capacity_controller_1.CapacityController.getEmployeeCapacity);
router.get('/employee/:employeeId/:date', [...validateEmployeeParam, ...validateDateParam], capacity_controller_1.CapacityController.getCapacityByDate);
router.put('/employees/:employeeId/capacity', validateEmployeeCapacityUpdate, capacity_controller_1.CapacityController.updateEmployeeCapacity);
router.put('/:id', validateCapacityUpdate, capacity_controller_1.CapacityController.updateCapacity);
router.delete('/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Capacity entry ID must be a valid UUID'), capacity_controller_1.CapacityController.deleteCapacity);
//# sourceMappingURL=capacity.routes.enhanced.js.map