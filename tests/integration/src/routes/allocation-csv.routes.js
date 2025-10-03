"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const allocation_service_1 = require("../services/allocation.service");
const async_handler_1 = require("../middleware/async-handler");
const router = (0, express_1.Router)();
// Helper function to check validation results
const checkValidationErrors = (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    return null;
};
// GET /api/allocations/export/csv - Export allocations to CSV
router.get('/csv', (0, express_validator_1.query)('startDate').optional().isISO8601().toDate(), (0, express_validator_1.query)('endDate').optional().isISO8601().toDate(), (0, express_validator_1.query)('employeeId').optional().isString(), (0, express_validator_1.query)('projectId').optional().isString(), (0, express_validator_1.query)('includeEnhancedFields').optional().isBoolean().toBoolean(), (0, express_validator_1.query)('includeSummary').optional().isBoolean().toBoolean(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    // Build export options with filters
    const options = {
        employeeId: req.query.employeeId,
        projectId: req.query.projectId,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
        includeEnhancedFields: req.query.includeEnhancedFields === 'true',
        includeSummary: req.query.includeSummary === 'true'
    };
    try {
        const csvData = await allocation_service_1.AllocationService.exportAllocationsToCSV(options);
        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `resource-allocations-${currentDate}.csv`;
        // Set appropriate headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache');
        return res.send(csvData);
    }
    catch (error) {
        if (error.message.includes('Invalid date range')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date range',
                error: error.message
            });
        }
        throw error;
    }
}));
exports.default = router;
