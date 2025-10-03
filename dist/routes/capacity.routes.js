"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacityRoutes = void 0;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const capacity_controller_1 = require("../controllers/capacity.controller");
const heat_map_routes_1 = __importDefault(require("./heat-map.routes"));
const router = express_1.default.Router();
exports.capacityRoutes = router;
router.use('/', heat_map_routes_1.default);
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
router.get('/heatmap', [
    (0, express_validator_1.query)('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('departmentId')
        .optional()
        .isUUID()
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('employeeIds')
        .optional()
        .isArray()
        .withMessage('Employee IDs must be an array'),
    (0, express_validator_1.query)('employeeIds.*')
        .optional()
        .isUUID()
        .withMessage('Each employee ID must be a valid UUID'),
    (0, express_validator_1.query)('granularity')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('Granularity must be daily, weekly, or monthly'),
    (0, express_validator_1.query)('includeInactive')
        .optional()
        .isBoolean()
        .withMessage('Include inactive must be a boolean'),
    (0, express_validator_1.query)('includeWeekends')
        .optional()
        .isBoolean()
        .withMessage('Include weekends must be a boolean')
], capacity_controller_1.CapacityController.getHeatmap);
router.get('/bottlenecks', [
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('departmentId')
        .optional()
        .isUUID()
        .withMessage('Department ID must be a valid UUID')
], capacity_controller_1.CapacityController.getBottlenecks);
router.get('/trends/:employeeId', [
    (0, express_validator_1.param)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.query)('periods')
        .optional()
        .isInt({ min: 1, max: 52 })
        .withMessage('Periods must be between 1 and 52')
], capacity_controller_1.CapacityController.getCapacityTrends);
router.get('/heatmap/export', [
    (0, express_validator_1.query)('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('endDate')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    (0, express_validator_1.query)('departmentId')
        .optional()
        .isUUID()
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('granularity')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('Granularity must be daily, weekly, or monthly')
], capacity_controller_1.CapacityController.exportHeatmapCSV);
router.post('/heatmap/refresh', [
    (0, express_validator_1.body)('concurrent')
        .optional()
        .isBoolean()
        .withMessage('Concurrent must be a boolean')
], capacity_controller_1.CapacityController.refreshHeatmapViews);
router.get('/department/:departmentId/summary', [
    (0, express_validator_1.param)('departmentId')
        .isUUID()
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date')
], capacity_controller_1.CapacityController.getDepartmentCapacitySummary);
//# sourceMappingURL=capacity.routes.js.map