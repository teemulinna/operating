import express from 'express';
import { body, param, query } from 'express-validator';
import { CapacityController } from '../controllers/capacity.controller';

const router = express.Router();

// Validation middleware
const validateCapacityCreation = [
  body('employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('availableHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Available hours must be between 0 and 24'),
  body('allocatedHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Allocated hours must be between 0 and 24'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with maximum 500 characters')
];

const validateCapacityUpdate = [
  param('id')
    .isUUID()
    .withMessage('Capacity entry ID must be a valid UUID'),
  body('availableHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Available hours must be between 0 and 24'),
  body('allocatedHours')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Allocated hours must be between 0 and 24'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with maximum 500 characters')
];

const validateBulkCapacityCreation = [
  body('entries')
    .isArray({ min: 1, max: 100 })
    .withMessage('Entries must be an array with 1-100 items'),
  body('entries.*.employeeId')
    .isUUID()
    .withMessage('Each entry must have a valid employee UUID'),
  body('entries.*.date')
    .isISO8601()
    .withMessage('Each entry must have a valid ISO 8601 date'),
  body('entries.*.availableHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Available hours must be between 0 and 24'),
  body('entries.*.allocatedHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Allocated hours must be between 0 and 24')
];

const validateBulkImportCapacity = [
  body('entries')
    .isArray({ min: 1, max: 500 })
    .withMessage('Entries must be an array with 1-500 items'),
  body('entries.*.employeeId')
    .isUUID()
    .withMessage('Each entry must have a valid employee UUID'),
  body('entries.*.date')
    .isISO8601()
    .withMessage('Each entry must have a valid ISO 8601 date'),
  body('entries.*.availableHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Available hours must be between 0 and 24'),
  body('entries.*.allocatedHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Allocated hours must be between 0 and 24')
];

const validateEmployeeParam = [
  param('employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID')
];

const validateDateParam = [
  param('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
];

const validateQueryFilters = [
  query('employeeId')
    .optional()
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Date from must be a valid ISO 8601 date'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Date to must be a valid ISO 8601 date'),
  query('minUtilization')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Minimum utilization must be between 0 and 2'),
  query('maxUtilization')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Maximum utilization must be between 0 and 2')
];

const validateEmployeeCapacityUpdate = [
  param('employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('availableHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Available hours must be between 0 and 24'),
  body('allocatedHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Allocated hours must be between 0 and 24'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must be a string with maximum 500 characters')
];

/**
 * @swagger
 * /api/capacity:
 *   get:
 *     tags: [Capacity]
 *     summary: Get all capacity data
 *     description: Retrieve capacity data for all employees with optional filtering
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: minUtilization
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 2
 *         description: Minimum utilization rate
 *       - in: query
 *         name: maxUtilization
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 2
 *         description: Maximum utilization rate
 *     responses:
 *       200:
 *         description: Capacity data retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/', validateQueryFilters, CapacityController.getAllCapacity);

/**
 * @swagger
 * /api/capacity:
 *   post:
 *     tags: [Capacity]
 *     summary: Create new capacity entry
 *     description: Create a new capacity entry for an employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - date
 *               - availableHours
 *               - allocatedHours
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               date:
 *                 type: string
 *                 format: date
 *               availableHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               allocatedHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Capacity entry created successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/', validateCapacityCreation, CapacityController.createCapacity);

/**
 * @swagger
 * /api/capacity/bulk:
 *   post:
 *     tags: [Capacity]
 *     summary: Bulk create capacity entries
 *     description: Create multiple capacity entries at once
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required:
 *                     - employeeId
 *                     - date
 *                     - availableHours
 *                     - allocatedHours
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                       format: uuid
 *                     date:
 *                       type: string
 *                       format: date
 *                     availableHours:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 24
 *                     allocatedHours:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 24
 *                     notes:
 *                       type: string
 *                       maxLength: 500
 *     responses:
 *       201:
 *         description: Capacity entries created successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', validateBulkCapacityCreation, CapacityController.bulkCreateCapacity);

/**
 * @swagger
 * /api/capacity/bulk-import:
 *   post:
 *     tags: [Capacity]
 *     summary: Bulk import capacity entries
 *     description: Import multiple capacity entries with options for handling duplicates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required:
 *                     - employeeId
 *                     - date
 *                     - availableHours
 *                     - allocatedHours
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                       format: uuid
 *                     date:
 *                       type: string
 *                       format: date
 *                     availableHours:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 24
 *                     allocatedHours:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 24
 *                     notes:
 *                       type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   skipDuplicates:
 *                     type: boolean
 *                     default: true
 *                   updateExisting:
 *                     type: boolean
 *                     default: false
 *     responses:
 *       201:
 *         description: Bulk import completed successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-import', validateBulkImportCapacity, CapacityController.bulkImportCapacity);

/**
 * @swagger
 * /api/capacity/export:
 *   get:
 *     tags: [Capacity]
 *     summary: Export capacity data to CSV
 *     description: Export capacity data with employee details in CSV format
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee ID
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       500:
 *         description: Internal server error
 */
router.get('/export', CapacityController.exportCapacityCSV);

/**
 * @swagger
 * /api/capacity/summary:
 *   get:
 *     tags: [Capacity]
 *     summary: Get utilization summary
 *     description: Get capacity utilization summary with optional filtering
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by employee ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Utilization summary retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/summary', CapacityController.getUtilizationSummary);

/**
 * @swagger
 * /api/capacity/trends:
 *   get:
 *     tags: [Capacity]
 *     summary: Get team capacity trends
 *     description: Get capacity trends for teams/departments
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Team capacity trends retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/trends', CapacityController.getTeamCapacityTrends);

/**
 * @swagger
 * /api/capacity/overutilized:
 *   get:
 *     tags: [Capacity]
 *     summary: Get overutilized employees
 *     description: Get employees who exceed utilization threshold
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 2
 *           default: 0.9
 *         description: Utilization threshold (default 0.9)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Overutilized employees retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/overutilized', CapacityController.getOverutilizedEmployees);

/**
 * @swagger
 * /api/capacity/department/{departmentName}:
 *   get:
 *     tags: [Capacity]
 *     summary: Get capacity data by department name
 *     description: Retrieve capacity data for a specific department
 *     parameters:
 *       - in: path
 *         name: departmentName
 *         required: true
 *         schema:
 *           type: string
 *         description: Department name
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Department capacity data retrieved successfully
 *       400:
 *         description: Invalid department name
 *       500:
 *         description: Internal server error
 */
router.get('/department/:departmentName', CapacityController.getDepartmentCapacity);

/**
 * @swagger
 * /api/capacity/employee/{employeeId}:
 *   get:
 *     tags: [Capacity]
 *     summary: Get capacity data for specific employee
 *     description: Retrieve capacity data and summary for a specific employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Employee capacity data retrieved successfully
 *       400:
 *         description: Invalid employee ID
 *       500:
 *         description: Internal server error
 */
router.get('/employee/:employeeId', validateEmployeeParam, CapacityController.getEmployeeCapacity);

/**
 * @swagger
 * /api/capacity/employee/{employeeId}/{date}:
 *   get:
 *     tags: [Capacity]
 *     summary: Get capacity data for specific employee and date
 *     description: Retrieve capacity data for a specific employee on a specific date
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Specific date
 *     responses:
 *       200:
 *         description: Capacity data retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Capacity entry not found
 *       500:
 *         description: Internal server error
 */
router.get('/employee/:employeeId/:date', 
  [...validateEmployeeParam, ...validateDateParam], 
  CapacityController.getCapacityByDate
);

/**
 * @swagger
 * /api/capacity/employees/{employeeId}/capacity:
 *   put:
 *     tags: [Capacity]
 *     summary: Update employee capacity
 *     description: Update or create capacity entry for a specific employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - availableHours
 *               - allocatedHours
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               availableHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               allocatedHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Employee capacity updated successfully
 *       400:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
router.put('/employees/:employeeId/capacity', validateEmployeeCapacityUpdate, CapacityController.updateEmployeeCapacity);

/**
 * @swagger
 * /api/capacity/{id}:
 *   put:
 *     tags: [Capacity]
 *     summary: Update capacity entry
 *     description: Update an existing capacity entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Capacity entry UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               availableHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               allocatedHours:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 24
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Capacity entry updated successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Capacity entry not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', validateCapacityUpdate, CapacityController.updateCapacity);

/**
 * @swagger
 * /api/capacity/{id}:
 *   delete:
 *     tags: [Capacity]
 *     summary: Delete capacity entry
 *     description: Delete a capacity entry
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Capacity entry UUID
 *     responses:
 *       200:
 *         description: Capacity entry deleted successfully
 *       400:
 *         description: Invalid capacity entry ID
 *       404:
 *         description: Capacity entry not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',
  param('id').isUUID().withMessage('Capacity entry ID must be a valid UUID'),
  CapacityController.deleteCapacity
);

// ============================================
// HEAT MAP ENDPOINTS
// ============================================

/**
 * @swagger
 * /api/capacity/heatmap:
 *   get:
 *     tags: [Capacity, HeatMap]
 *     summary: Get capacity heat map data
 *     description: Retrieve heat map visualization data for capacity planning
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for heat map
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for heat map
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *       - in: query
 *         name: employeeIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         style: form
 *         explode: true
 *         description: Filter by employee IDs
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Heat map granularity
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive employees
 *       - in: query
 *         name: includeWeekends
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include weekend days
 *     responses:
 *       200:
 *         description: Heat map data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cells:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       employeeId:
 *                         type: string
 *                       employeeName:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       heatLevel:
 *                         type: string
 *                         enum: [available, green, blue, yellow, red, unavailable]
 *                       utilizationPercentage:
 *                         type: number
 *                 summary:
 *                   type: object
 *                 metadata:
 *                   type: object
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/heatmap',
  [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('departmentId')
      .optional()
      .isUUID()
      .withMessage('Department ID must be a valid UUID'),
    query('employeeIds')
      .optional()
      .isArray()
      .withMessage('Employee IDs must be an array'),
    query('employeeIds.*')
      .optional()
      .isUUID()
      .withMessage('Each employee ID must be a valid UUID'),
    query('granularity')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Granularity must be daily, weekly, or monthly'),
    query('includeInactive')
      .optional()
      .isBoolean()
      .withMessage('Include inactive must be a boolean'),
    query('includeWeekends')
      .optional()
      .isBoolean()
      .withMessage('Include weekends must be a boolean')
  ],
  CapacityController.getHeatmap
);

/**
 * @swagger
 * /api/capacity/bottlenecks:
 *   get:
 *     tags: [Capacity, HeatMap]
 *     summary: Get capacity bottlenecks
 *     description: Identify resources and periods with capacity issues
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analysis
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analysis
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *     responses:
 *       200:
 *         description: Bottlenecks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employeeId:
 *                     type: string
 *                   employeeName:
 *                     type: string
 *                   startDate:
 *                     type: string
 *                     format: date
 *                   endDate:
 *                     type: string
 *                     format: date
 *                   consecutiveDays:
 *                     type: number
 *                   avgUtilization:
 *                     type: number
 *                   severity:
 *                     type: string
 *                     enum: [low, medium, high, critical]
 *       500:
 *         description: Internal server error
 */
router.get('/bottlenecks',
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('departmentId')
      .optional()
      .isUUID()
      .withMessage('Department ID must be a valid UUID')
  ],
  CapacityController.getBottlenecks
);

/**
 * @swagger
 * /api/capacity/trends/{employeeId}:
 *   get:
 *     tags: [Capacity]
 *     summary: Get capacity trends for employee
 *     description: Retrieve historical capacity trends for an employee
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *       - in: query
 *         name: periods
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 52
 *           default: 12
 *         description: Number of periods to analyze
 *     responses:
 *       200:
 *         description: Capacity trends retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   period:
 *                     type: string
 *                   utilizationPercentage:
 *                     type: number
 *                   allocatedHours:
 *                     type: number
 *                   availableHours:
 *                     type: number
 *                   trend:
 *                     type: string
 *                     enum: [increasing, stable, decreasing]
 *       400:
 *         description: Invalid employee ID
 *       500:
 *         description: Internal server error
 */
router.get('/trends/:employeeId',
  [
    param('employeeId')
      .isUUID()
      .withMessage('Employee ID must be a valid UUID'),
    query('periods')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Periods must be between 1 and 52')
  ],
  CapacityController.getCapacityTrends
);

/**
 * @swagger
 * /api/capacity/heatmap/export:
 *   get:
 *     tags: [Capacity, HeatMap]
 *     summary: Export heat map data to CSV
 *     description: Export heat map visualization data in CSV format
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for export
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for export
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Export granularity
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/heatmap/export',
  [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('departmentId')
      .optional()
      .isUUID()
      .withMessage('Department ID must be a valid UUID'),
    query('granularity')
      .optional()
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Granularity must be daily, weekly, or monthly')
  ],
  CapacityController.exportHeatmapCSV
);

/**
 * @swagger
 * /api/capacity/heatmap/refresh:
 *   post:
 *     tags: [Capacity, HeatMap]
 *     summary: Refresh heat map materialized views
 *     description: Manually trigger refresh of heat map cached data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               concurrent:
 *                 type: boolean
 *                 default: true
 *                 description: Use concurrent refresh (non-blocking)
 *     responses:
 *       200:
 *         description: Views refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 refreshed:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       viewName:
 *                         type: string
 *                       duration:
 *                         type: string
 *                       rowCount:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/heatmap/refresh',
  [
    body('concurrent')
      .optional()
      .isBoolean()
      .withMessage('Concurrent must be a boolean')
  ],
  CapacityController.refreshHeatmapViews
);

/**
 * @swagger
 * /api/capacity/department/{departmentId}/summary:
 *   get:
 *     tags: [Capacity]
 *     summary: Get department capacity summary
 *     description: Get aggregated capacity summary for a department
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Department UUID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for summary (defaults to today)
 *     responses:
 *       200:
 *         description: Department summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departmentId:
 *                   type: string
 *                 departmentName:
 *                   type: string
 *                 totalEmployees:
 *                   type: number
 *                 totalAvailableHours:
 *                   type: number
 *                 totalAllocatedHours:
 *                   type: number
 *                 avgUtilizationPercentage:
 *                   type: number
 *                 departmentHeatLevel:
 *                   type: string
 *       404:
 *         description: Department summary not found
 *       500:
 *         description: Internal server error
 */
router.get('/department/:departmentId/summary',
  [
    param('departmentId')
      .isUUID()
      .withMessage('Department ID must be a valid UUID'),
    query('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO 8601 date')
  ],
  CapacityController.getDepartmentCapacitySummary
);

export { router as capacityRoutes };