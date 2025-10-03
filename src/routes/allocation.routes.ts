import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AllocationService } from '../services/allocation.service';
import { asyncHandler } from '../middleware/async-handler';
import { ResourceAllocationFilters, CreateResourceAllocationInput, UpdateResourceAllocationInput } from '../types';
import { RequestWithServices } from '../middleware/service-injection.middleware';
import { ApiError } from '../utils/api-error';

const router = Router();

// Validation middleware
const validateAllocationCreation = [
  body('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isString()
    .withMessage('Employee ID must be a string'),
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .custom((value) => {
      // Accept both string and number, convert to string for validation
      const stringValue = String(value);
      if (!stringValue || stringValue === 'null' || stringValue === 'undefined') {
        throw new Error('Project ID cannot be empty');
      }
      return true;
    })
    .withMessage('Project ID is required'),
  body('allocatedHours')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Allocated hours must be between 0.1 and 1000'),
  body('roleOnProject')
    .notEmpty()
    .withMessage('Role on project is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Role must be between 1 and 255 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

const validateAllocationUpdate = [
  body('allocatedHours')
    .optional()
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Allocated hours must be between 0.1 and 1000'),
  body('actualHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Actual hours must be between 0 and 1000'),
  body('roleOnProject')
    .optional()
    .notEmpty()
    .withMessage('Role on project cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Role must be between 1 and 255 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isString()
    .withMessage('ID must be a string')
];

const validateEmployeeId = [
  param('employeeId')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isString()
    .withMessage('Employee ID must be a string')
];

const validateProjectId = [
  param('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isString()
    .withMessage('Project ID must be a string')
];

// Helper function to check validation results
const checkValidationErrors = (req: Request, res: Response): Response | null => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  return null;
};

// GET /api/allocations - Get all allocations with filters and pagination
router.get('/', 
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('employeeId').optional().isString(),
  query('projectId').optional().isString(),
  query('startDateFrom').optional().isISO8601().toDate(),
  query('startDateTo').optional().isISO8601().toDate(),
  query('endDateFrom').optional().isISO8601().toDate(),
  query('endDateTo').optional().isISO8601().toDate(),
  query('isActive').optional().isBoolean().toBoolean(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: ResourceAllocationFilters = {
      employeeId: req.query.employeeId as string,
      projectId: req.query.projectId as string,
      startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom as string) : undefined,
      startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo as string) : undefined,
      endDateFrom: req.query.endDateFrom ? new Date(req.query.endDateFrom as string) : undefined,
      endDateTo: req.query.endDateTo ? new Date(req.query.endDateTo as string) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };

    const result = await AllocationService.getAllAllocations(filters, page, limit);

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
  })
);

// GET /api/allocations/employee/:employeeId - Get allocations for specific employee
router.get('/employee/:employeeId',
  validateEmployeeId,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDateFrom').optional().isISO8601().toDate(),
  query('startDateTo').optional().isISO8601().toDate(),
  query('isActive').optional().isBoolean().toBoolean(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: ResourceAllocationFilters = {
      startDateFrom: req.query.startDateFrom ? new Date(req.query.startDateFrom as string) : undefined,
      startDateTo: req.query.startDateTo ? new Date(req.query.startDateTo as string) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };

    const result = await AllocationService.getEmployeeAllocations(employeeId, filters, page, limit);

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
  })
);

// GET /api/allocations/project/:projectId - Get allocations for specific project
router.get('/project/:projectId',
  validateProjectId,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean().toBoolean(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const filters: ResourceAllocationFilters = {
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
    };

    const result = await AllocationService.getProjectAllocations(projectId, filters, page, limit);

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
  })
);

// GET /api/allocations/conflicts - Detect allocation conflicts
router.get('/conflicts',
  query('employeeId').notEmpty().withMessage('Employee ID is required'),
  query('startDate').isISO8601().withMessage('Start date must be valid ISO 8601').toDate(),
  query('endDate').isISO8601().withMessage('End date must be valid ISO 8601').toDate(),
  query('excludeAllocationId').optional().isString(),
  asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId, excludeAllocationId } = req.query;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    const conflictReport = await AllocationService.checkAllocationConflicts(
      employeeId as string,
      startDate,
      endDate,
      excludeAllocationId as string
    );

    return res.json({
      success: true,
      message: 'Conflict check completed',
      data: conflictReport
    });
  })
);

// GET /api/allocations/utilization - Get utilization metrics
router.get('/utilization',
  query('employeeId').optional().isString(),
  query('startDate').optional().isISO8601().toDate(),
  query('endDate').optional().isISO8601().toDate(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId } = req.query;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (employeeId) {
      // Get metrics for specific employee
      const metrics = await AllocationService.getCapacityMetrics(employeeId as string, startDate, endDate);
      return res.json({
        success: true,
        message: 'Employee capacity metrics retrieved',
        data: metrics
      });
    } else {
      // Get utilization summary for all employees
      const summary = await AllocationService.getUtilizationSummary(startDate, endDate);
      return res.json({
        success: true,
        message: 'Utilization summary retrieved',
        data: summary
      });
    }
  })
);

// GET /api/allocations/calendar - Get calendar view data (allocations, employees, projects)
router.get('/calendar',
  query('startDate').isISO8601().withMessage('Start date must be valid ISO 8601').toDate(),
  query('endDate').isISO8601().withMessage('End date must be valid ISO 8601').toDate(),
  query('employeeId').optional().isString(),
  query('projectId').optional().isString(),
  query('status').optional().isString(),
  asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const services = (req as RequestWithServices).services;
    if (!services?.database) {
      throw new ApiError(500, 'Database service not initialized');
    }
    const db = services.database.getPool();

    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const { employeeId, projectId, status } = req.query;

    // Build filters
    const filters: ResourceAllocationFilters = {
      startDateFrom: startDate,
      endDateTo: endDate,
      isActive: status !== 'inactive'
    };

    // Get allocations with the filters
    const allocationsResult = await AllocationService.getAllAllocations(filters, 1, 1000);

    // Get unique employee IDs and project IDs from allocations
    const employeeIds = [...new Set(allocationsResult.data.map((a: any) => a.employeeId))];
    const projectIds = [...new Set(allocationsResult.data.map((a: any) => a.projectId).filter(Boolean))];

    // Fetch employee and project details
    const [employeesData, projectsData] = await Promise.all([
      // Get employees
      db.query(
        `SELECT id, first_name, last_name, position
         FROM employees
         WHERE id = ANY($1) AND is_active = true
         ORDER BY last_name, first_name`,
        [employeeIds]
      ),
      // Get projects
      db.query(
        `SELECT id, name, client_name, status
         FROM projects
         WHERE id = ANY($1)
         ORDER BY name`,
        [projectIds.map(String)]
      )
    ]);

    // Format employee data
    const employees = employeesData.rows.map((emp: any) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      position: emp.position
    }));

    // Format project data
    const projects = projectsData.rows.map((proj: any) => ({
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
  })
);

// GET /api/allocations/:id - Get specific allocation
router.get('/:id',
  validateId,
  query('includeDetails').optional().isBoolean().toBoolean(),
  asyncHandler(async (req: Request, res: Response): Promise<Response> => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const includeDetails = req.query.includeDetails === 'true';

    let allocation;
    if (includeDetails) {
      allocation = await AllocationService.getAllocationWithDetails(id);
    } else {
      allocation = await AllocationService.getAllocation(id);
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
  })
);

// POST /api/allocations - Create new allocation
router.post('/',
  validateAllocationCreation,
  body('force').optional().isBoolean().withMessage('Force must be a boolean'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const input: CreateResourceAllocationInput = {
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
      const allocation = await AllocationService.createAllocation(input, force);
      
      return res.status(201).json({
        success: true,
        message: 'Allocation created successfully',
        data: allocation
      });
    } catch (error: any) {
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
  })
);

// PUT /api/allocations/:id - Update allocation
router.put('/:id',
  validateId,
  validateAllocationUpdate,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const updates: UpdateResourceAllocationInput = {};

    // Only include provided fields
    if (req.body.allocatedHours !== undefined) updates.allocatedHours = parseFloat(req.body.allocatedHours);
    if (req.body.actualHours !== undefined) updates.actualHours = parseFloat(req.body.actualHours);
    if (req.body.roleOnProject !== undefined) updates.roleOnProject = req.body.roleOnProject;
    if (req.body.startDate !== undefined) updates.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) updates.endDate = req.body.endDate;
    if (req.body.hourlyRate !== undefined) updates.hourlyRate = parseFloat(req.body.hourlyRate);
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    try {
      const allocation = await AllocationService.updateAllocation(id, updates);
      
      return res.json({
        success: true,
        message: 'Allocation updated successfully',
        data: allocation
      });
    } catch (error: any) {
      if (error.message.includes('conflicts')) {
        return res.status(409).json({
          success: false,
          message: 'Update would create allocation conflicts',
          error: error.message
        });
      }
      throw error;
    }
  })
);

// DELETE /api/allocations/:id - Delete (cancel) allocation
router.delete('/:id',
  validateId,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const allocation = await AllocationService.deleteAllocation(id);

    return res.json({
      success: true,
      message: 'Allocation cancelled successfully',
      data: allocation
    });
  })
);

// POST /api/allocations/:id/confirm - Confirm allocation
router.post('/:id/confirm',
  validateId,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const allocation = await AllocationService.confirmAllocation(id);

    return res.json({
      success: true,
      message: 'Allocation confirmed successfully',
      data: allocation
    });
  })
);

// POST /api/allocations/:id/complete - Complete allocation
router.post('/:id/complete',
  validateId,
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be non-negative'),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const actualHours = req.body.actualHours ? parseFloat(req.body.actualHours) : undefined;
    
    const allocation = await AllocationService.completeAllocation(id, actualHours);

    return res.json({
      success: true,
      message: 'Allocation completed successfully',
      data: allocation
    });
  })
);

// POST /api/allocations/:id/cancel - Cancel allocation
router.post('/:id/cancel',
  validateId,
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const allocation = await AllocationService.cancelAllocation(id);

    return res.json({
      success: true,
      message: 'Allocation cancelled successfully',
      data: allocation
    });
  })
);

// POST /api/allocations/validate-capacity - Validate capacity for proposed allocation
router.post('/validate-capacity',
  body('employeeId').notEmpty().isString(),
  body('allocatedHours').isFloat({ min: 0.1 }),
  body('startDate').isISO8601().toDate(),
  body('endDate').isISO8601().toDate(),
  body('excludeAllocationId').optional().isString(),
  asyncHandler(async (req: Request, res: Response) => {
    const validationError = checkValidationErrors(req, res);
    if (validationError) return validationError;

    const { employeeId, allocatedHours, startDate, endDate, excludeAllocationId } = req.body;

    const validation = await AllocationService.validateCapacity(
      employeeId,
      parseFloat(allocatedHours),
      startDate,
      endDate,
      excludeAllocationId
    );

    return res.json({
      success: true,
      message: 'Capacity validation completed',
      data: validation
    });
  })
);

export default router;