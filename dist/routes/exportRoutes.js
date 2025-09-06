"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const exportController_1 = require("../controllers/exportController");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
exports.exportRoutes = router;
const csvExportValidation = [
    (0, express_validator_1.body)('filters')
        .optional()
        .isObject()
        .withMessage('Filters must be an object'),
    (0, express_validator_1.body)('filters.status')
        .optional()
        .isIn(['available', 'busy', 'unavailable', 'all'])
        .withMessage('Status filter must be one of: available, busy, unavailable, all'),
    (0, express_validator_1.body)('filters.departmentId')
        .optional()
        .isUUID()
        .withMessage('Department ID filter must be a valid UUID'),
    (0, express_validator_1.body)('filters.search')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search filter must be a string with max 100 characters'),
    (0, express_validator_1.body)('fields')
        .optional()
        .isArray()
        .withMessage('Fields must be an array')
        .custom((fields) => {
        const validFields = [
            'firstName', 'lastName', 'email', 'position', 'departmentName',
            'status', 'capacity', 'currentProjects', 'availableHours',
            'hireDate', 'createdAt', 'updatedAt'
        ];
        const invalidFields = fields.filter((field) => !validFields.includes(field));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
        }
        return true;
    }),
];
const excelExportValidation = [
    (0, express_validator_1.body)('filters')
        .optional()
        .isObject()
        .withMessage('Filters must be an object'),
    (0, express_validator_1.body)('includeCharts')
        .optional()
        .isBoolean()
        .withMessage('Include charts must be a boolean'),
    (0, express_validator_1.body)('worksheets')
        .optional()
        .isArray()
        .withMessage('Worksheets must be an array')
        .custom((worksheets) => {
        const validWorksheets = ['employees', 'summary', 'department_breakdown', 'availability_trends'];
        const invalidWorksheets = worksheets.filter((ws) => !validWorksheets.includes(ws));
        if (invalidWorksheets.length > 0) {
            throw new Error(`Invalid worksheets: ${invalidWorksheets.join(', ')}`);
        }
        return true;
    }),
];
const pdfReportValidation = [
    (0, express_validator_1.body)('dateRange')
        .isObject()
        .withMessage('Date range is required'),
    (0, express_validator_1.body)('dateRange.start')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('dateRange.end')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('includeDepartments')
        .optional()
        .isArray()
        .withMessage('Include departments must be an array'),
    (0, express_validator_1.body)('includeDepartments.*')
        .optional()
        .isUUID()
        .withMessage('Department IDs must be valid UUIDs'),
    (0, express_validator_1.body)('reportType')
        .optional()
        .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'annual'])
        .withMessage('Report type must be one of: daily, weekly, monthly, quarterly, annual'),
    (0, express_validator_1.body)('includeCharts')
        .optional()
        .isBoolean()
        .withMessage('Include charts must be a boolean'),
    (0, express_validator_1.body)('includeProjections')
        .optional()
        .isBoolean()
        .withMessage('Include projections must be a boolean'),
];
const scheduleReportValidation = [
    (0, express_validator_1.body)('reportType')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Report type is required and must be between 1-100 characters'),
    (0, express_validator_1.body)('frequency')
        .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
        .withMessage('Frequency must be one of: daily, weekly, monthly, quarterly'),
    (0, express_validator_1.body)('format')
        .isIn(['csv', 'excel', 'pdf'])
        .withMessage('Format must be one of: csv, excel, pdf'),
    (0, express_validator_1.body)('recipients')
        .isArray({ min: 1 })
        .withMessage('Recipients must be a non-empty array'),
    (0, express_validator_1.body)('recipients.*')
        .isEmail()
        .withMessage('All recipients must be valid email addresses'),
    (0, express_validator_1.body)('filters')
        .optional()
        .isObject()
        .withMessage('Filters must be an object'),
    (0, express_validator_1.body)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
];
const externalSyncValidation = [
    (0, express_validator_1.body)('targetSystems')
        .isArray({ min: 1 })
        .withMessage('Target systems must be a non-empty array'),
    (0, express_validator_1.body)('targetSystems.*')
        .isIn(['jira', 'asana', 'trello', 'monday', 'slack', 'teams'])
        .withMessage('Target systems must contain valid system names'),
    (0, express_validator_1.body)('syncType')
        .isString()
        .isLength({ min: 1, max: 50 })
        .withMessage('Sync type is required and must be between 1-50 characters'),
    (0, express_validator_1.body)('data')
        .isObject()
        .withMessage('Data must be an object'),
];
const bulkUpdateValidation = [
    (0, express_validator_1.body)('updates')
        .isArray({ min: 1 })
        .withMessage('Updates must be a non-empty array'),
    (0, express_validator_1.body)('updates.*.employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.body)('updates.*.updates')
        .isObject()
        .withMessage('Updates must be an object'),
];
router.post('/employees/csv', csvExportValidation, validate_middleware_1.validateRequest, exportController_1.ExportController.exportEmployeesCSV);
router.post('/employees/excel', excelExportValidation, validate_middleware_1.validateRequest, exportController_1.ExportController.exportEmployeesExcel);
router.post('/capacity-report/pdf', pdfReportValidation, validate_middleware_1.validateRequest, exportController_1.ExportController.generateCapacityReportPDF);
router.post('/schedule', scheduleReportValidation, validate_middleware_1.validateRequest, exportController_1.ExportController.scheduleReport);
router.post('/external/sync', externalSyncValidation, validate_middleware_1.validateRequest, exportController_1.ExportController.syncWithExternalTools);
router.put('/bulk-update', bulkUpdateValidation, validate_middleware_1.validateRequest, async (req, res) => {
    try {
        const { updates } = req.body;
        const availabilityUpdates = updates.filter((update) => update.updates.capacity !== undefined ||
            update.updates.status !== undefined ||
            update.updates.availableHours !== undefined ||
            update.updates.currentProjects !== undefined).map((update) => ({
            employeeId: update.employeeId,
            ...update.updates
        }));
        if (availabilityUpdates.length > 0) {
            req.body = { updates: availabilityUpdates };
            return await require('../controllers/availabilityController').AvailabilityController.bulkUpdateAvailability(req, res);
        }
        res.json({
            success: true,
            message: 'No availability updates to process',
            results: []
        });
    }
    catch (error) {
        console.error('Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process bulk update',
            error: error.message
        });
    }
});
//# sourceMappingURL=exportRoutes.js.map