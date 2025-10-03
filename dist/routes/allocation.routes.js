"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const allocation_service_1 = require("../services/allocation.service");
const async_handler_1 = require("../middleware/async-handler");
const api_error_1 = require("../utils/api-error");
const router = (0, express_1.Router)();
const validateAllocationCreation = [
    (0, express_validator_1.body)('employeeId')
        .notEmpty()
        .withMessage('Employee ID is required')
        .isString()
        .withMessage('Employee ID must be a string'),
    (0, express_validator_1.body)('projectId')
        .notEmpty()
        .withMessage('Project ID is required')
        .custom((value) => {
        const stringValue = String(value);
        if (!stringValue || stringValue === 'null' || stringValue === 'undefined') {
            throw new Error('Project ID cannot be empty');
        }
        return true;
    })
        .withMessage('Project ID is required'),
    (0, express_validator_1.body)('allocatedHours')
        .isFloat({ min: 0.1, max: 1000 })
        .withMessage('Allocated hours must be between 0.1 and 1000'),
    (0, express_validator_1.body)('roleOnProject')
        .notEmpty()
        .withMessage('Role on project is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Role must be between 1 and 255 characters'),
    (0, express_validator_1.body)('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    (0, express_validator_1.body)('endDate')
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate(),
    (0, express_validator_1.body)('hourlyRate')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Hourly rate must be a positive number'),
    (0, express_validator_1.body)('notes')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Notes must be less than 1000 characters')
];
const validateAllocationUpdate = [
    (0, express_validator_1.body)('allocatedHours')
        .optional()
        .isFloat({ min: 0.1, max: 1000 })
        .withMessage('Allocated hours must be between 0.1 and 1000'),
    (0, express_validator_1.body)('actualHours')
        .optional()
        .isFloat({ min: 0, max: 1000 })
        .withMessage('Actual hours must be between 0 and 1000'),
    (0, express_validator_1.body)('roleOnProject')
        .optional()
        .notEmpty()
        .withMessage('Role on project cannot be empty')
        .isLength({ min: 1, max: 255 })
        .withMessage('Role must be between 1 and 255 characters'),
    (0, express_validator_1.body)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date')
        .toDate(),
    (0, express_validator_1.body)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date')
        .toDate(),
    (0, express_validator_1.body)('notes')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Notes must be less than 1000 characters'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
];
const validateId = [
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage('ID is required')
        .isString()
        .withMessage('ID must be a string')
];
const validateEmployeeId = [
    (0, express_validator_1.param)('employeeId')
        .notEmpty()
        .withMessage('Employee ID is required')
        .isString()
        .withMessage('Employee ID must be a string')
];
const validateProjectId = [
    (0, express_validator_1.param)('projectId')
        .notEmpty()
        .withMessage('Project ID is required')
        .isString()
        .withMessage('Project ID must be a string')
];
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
router.get('/', (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'), (0, express_validator_1.query)('employeeId').optional().isString(), (0, express_validator_1.query)('projectId').optional().isString(), (0, express_validator_1.query)('startDateFrom').optional().isISO8601().toDate(), (0, express_validator_1.query)('startDateTo').optional().isISO8601().toDate(), (0, express_validator_1.query)('endDateFrom').optional().isISO8601().toDate(), (0, express_validator_1.query)('endDateTo').optional().isISO8601().toDate(), (0, express_validator_1.query)('isActive').optional().isBoolean().toBoolean(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
        employeeId: req.query.employeeId,
        projectId: req.query.projectId,
        startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom) : undefined,
        startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo) : undefined,
        endDateFrom: req.query.endDateFrom ? new Date(req.query.endDateFrom) : undefined,
        endDateTo: req.query.endDateTo ? new Date(req.query.endDateTo) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };
    const result = await allocation_service_1.AllocationService.getAllAllocations(filters, page, limit);
    return res.json({
        success: true,
        message: 'Allocations retrieved successfully',
        data: result.data,
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }
    });
}));
router.get('/employee/:employeeId', validateEmployeeId, (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('startDateFrom').optional().isISO8601().toDate(), (0, express_validator_1.query)('startDateTo').optional().isISO8601().toDate(), (0, express_validator_1.query)('isActive').optional().isBoolean().toBoolean(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { employeeId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
        startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom) : undefined,
        startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };
    const result = await allocation_service_1.AllocationService.getEmployeeAllocations(employeeId, filters, page, limit);
    return res.json({
        success: true,
        message: 'Employee allocations retrieved successfully',
        data: result.data,
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }
    });
}));
router.get('/project/:projectId', validateProjectId, (0, express_validator_1.query)('page').optional().isInt({ min: 1 }), (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }), (0, express_validator_1.query)('isActive').optional().isBoolean().toBoolean(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { projectId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const filters = {
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };
    const result = await allocation_service_1.AllocationService.getProjectAllocations(projectId, filters, page, limit);
    return res.json({
        success: true,
        message: 'Project allocations retrieved successfully',
        data: result.data,
        pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
        }
    });
}));
router.get('/conflicts', (0, express_validator_1.query)('employeeId').notEmpty().withMessage('Employee ID is required'), (0, express_validator_1.query)('startDate').isISO8601().withMessage('Start date must be valid ISO 8601').toDate(), (0, express_validator_1.query)('endDate').isISO8601().withMessage('End date must be valid ISO 8601').toDate(), (0, express_validator_1.query)('excludeAllocationId').optional().isString(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { employeeId, excludeAllocationId } = req.query;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    const conflictReport = await allocation_service_1.AllocationService.checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId);
    return res.json({
        success: true,
        message: 'Conflict check completed',
        data: conflictReport
    });
}));
router.get('/utilization', (0, express_validator_1.query)('employeeId').optional().isString(), (0, express_validator_1.query)('startDate').optional().isISO8601().toDate(), (0, express_validator_1.query)('endDate').optional().isISO8601().toDate(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { employeeId } = req.query;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
    if (employeeId) {
        const metrics = await allocation_service_1.AllocationService.getCapacityMetrics(employeeId, startDate, endDate);
        return res.json({
            success: true,
            message: 'Employee capacity metrics retrieved',
            data: metrics
        });
    }
    else {
        const summary = await allocation_service_1.AllocationService.getUtilizationSummary(startDate, endDate);
        return res.json({
            success: true,
            message: 'Utilization summary retrieved',
            data: summary
        });
    }
}));
router.get('/calendar', (0, express_validator_1.query)('startDate').isISO8601().withMessage('Start date must be valid ISO 8601').toDate(), (0, express_validator_1.query)('endDate').isISO8601().withMessage('End date must be valid ISO 8601').toDate(), (0, express_validator_1.query)('employeeId').optional().isString(), (0, express_validator_1.query)('projectId').optional().isString(), (0, express_validator_1.query)('status').optional().isString(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const services = req.services;
    if (!services?.database) {
        throw new api_error_1.ApiError(500, 'Database service not initialized');
    }
    const db = services.database.getPool();
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    const { employeeId, projectId, status } = req.query;
    const filters = {
        startDate,
        endDate,
        isActive: status !== 'inactive'
    };
    const allocationsResult = await allocation_service_1.AllocationService.getAllAllocations(filters, 1, 1000);
    const employeeIds = [...new Set(allocationsResult.data.map((a) => a.employeeId))];
    const projectIds = [...new Set(allocationsResult.data.map((a) => a.projectId).filter(Boolean))];
    const [employeesData, projectsData] = await Promise.all([
        db.query(`SELECT id, first_name, last_name, position
         FROM employees
         WHERE id = ANY($1) AND is_active = true
         ORDER BY last_name, first_name`, [employeeIds]),
        db.query(`SELECT id, name, client_name, status
         FROM projects
         WHERE id = ANY($1)
         ORDER BY name`, [projectIds.map(String)])
    ]);
    const employees = employeesData.rows.map((emp) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        position: emp.position
    }));
    const projects = projectsData.rows.map((proj) => ({
        id: String(proj.id),
        name: proj.name,
        clientName: proj.client_name || '',
        status: proj.status
    }));
    return res.json({
        success: true,
        data: {
            allocations: allocationsResult.data,
            employees,
            projects
        }
    });
}));
router.get('/:id', validateId, (0, express_validator_1.query)('includeDetails').optional().isBoolean().toBoolean(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const includeDetails = req.query.includeDetails === 'true';
    let allocation;
    if (includeDetails) {
        allocation = await allocation_service_1.AllocationService.getAllocationWithDetails(id);
    }
    else {
        allocation = await allocation_service_1.AllocationService.getAllocation(id);
    }
    if (!allocation) {
        return res.status(404).json({
            success: false,
            message: 'Allocation not found'
        });
    }
    return res.json({
        success: true,
        message: 'Allocation retrieved successfully',
        data: allocation
    });
}));
router.post('/', validateAllocationCreation, (0, express_validator_1.body)('force').optional().isBoolean().withMessage('Force must be a boolean'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const input = {
        employeeId: req.body.employeeId,
        projectId: req.body.projectId,
        allocatedHours: parseFloat(req.body.allocatedHours),
        roleOnProject: req.body.roleOnProject,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        hourlyRate: req.body.hourlyRate ? parseFloat(req.body.hourlyRate) : undefined,
        notes: req.body.notes
    };
    const force = req.body.force === true;
    try {
        const allocation = await allocation_service_1.AllocationService.createAllocation(input, force);
        return res.status(201).json({
            success: true,
            message: 'Allocation created successfully',
            data: allocation
        });
    }
    catch (error) {
        if (error.message.includes('conflicts detected')) {
            return res.status(409).json({
                success: false,
                message: 'Allocation conflicts detected',
                error: error.message,
                suggestion: 'Use force=true parameter to override conflicts or check conflicts endpoint first'
            });
        }
        throw error;
    }
}));
router.put('/:id', validateId, validateAllocationUpdate, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const updates = {};
    if (req.body.allocatedHours !== undefined)
        updates.allocatedHours = parseFloat(req.body.allocatedHours);
    if (req.body.actualHours !== undefined)
        updates.actualHours = parseFloat(req.body.actualHours);
    if (req.body.roleOnProject !== undefined)
        updates.roleOnProject = req.body.roleOnProject;
    if (req.body.startDate !== undefined)
        updates.startDate = req.body.startDate;
    if (req.body.endDate !== undefined)
        updates.endDate = req.body.endDate;
    if (req.body.hourlyRate !== undefined)
        updates.hourlyRate = parseFloat(req.body.hourlyRate);
    if (req.body.notes !== undefined)
        updates.notes = req.body.notes;
    if (req.body.isActive !== undefined)
        updates.isActive = req.body.isActive;
    try {
        const allocation = await allocation_service_1.AllocationService.updateAllocation(id, updates);
        return res.json({
            success: true,
            message: 'Allocation updated successfully',
            data: allocation
        });
    }
    catch (error) {
        if (error.message.includes('conflicts')) {
            return res.status(409).json({
                success: false,
                message: 'Update would create allocation conflicts',
                error: error.message
            });
        }
        throw error;
    }
}));
router.delete('/:id', validateId, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const allocation = await allocation_service_1.AllocationService.deleteAllocation(id);
    return res.json({
        success: true,
        message: 'Allocation cancelled successfully',
        data: allocation
    });
}));
router.post('/:id/confirm', validateId, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const allocation = await allocation_service_1.AllocationService.confirmAllocation(id);
    return res.json({
        success: true,
        message: 'Allocation confirmed successfully',
        data: allocation
    });
}));
router.post('/:id/complete', validateId, (0, express_validator_1.body)('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be non-negative'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const actualHours = req.body.actualHours ? parseFloat(req.body.actualHours) : undefined;
    const allocation = await allocation_service_1.AllocationService.completeAllocation(id, actualHours);
    return res.json({
        success: true,
        message: 'Allocation completed successfully',
        data: allocation
    });
}));
router.post('/:id/cancel', validateId, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { id } = req.params;
    const allocation = await allocation_service_1.AllocationService.cancelAllocation(id);
    return res.json({
        success: true,
        message: 'Allocation cancelled successfully',
        data: allocation
    });
}));
router.post('/validate-capacity', (0, express_validator_1.body)('employeeId').notEmpty().isString(), (0, express_validator_1.body)('allocatedHours').isFloat({ min: 0.1 }), (0, express_validator_1.body)('startDate').isISO8601().toDate(), (0, express_validator_1.body)('endDate').isISO8601().toDate(), (0, express_validator_1.body)('excludeAllocationId').optional().isString(), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError)
        return validationError;
    const { employeeId, allocatedHours, startDate, endDate, excludeAllocationId } = req.body;
    const validation = await allocation_service_1.AllocationService.validateCapacity(employeeId, parseFloat(allocatedHours), startDate, endDate, excludeAllocationId);
    return res.json({
        success: true,
        message: 'Capacity validation completed',
        data: validation
    });
}));
exports.default = router;
//# sourceMappingURL=allocation.routes.js.map