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

export { router as capacityRoutes };