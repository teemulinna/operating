"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacityRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const capacity_controller_1 = require("../controllers/capacity.controller");
const router = express_1.default.Router();
exports.capacityRoutes = router;
// Validation middleware
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
router.get('/', validateQueryFilters, capacity_controller_1.CapacityController.getAllCapacity);
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
router.post('/', validateCapacityCreation, capacity_controller_1.CapacityController.createCapacity);
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
router.post('/bulk', validateBulkCapacityCreation, capacity_controller_1.CapacityController.bulkCreateCapacity);
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
router.post('/bulk-import', validateBulkImportCapacity, capacity_controller_1.CapacityController.bulkImportCapacity);
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
router.get('/export', capacity_controller_1.CapacityController.exportCapacityCSV);
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
router.get('/summary', capacity_controller_1.CapacityController.getUtilizationSummary);
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
router.get('/trends', capacity_controller_1.CapacityController.getTeamCapacityTrends);
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
router.get('/overutilized', capacity_controller_1.CapacityController.getOverutilizedEmployees);
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
router.get('/department/:departmentName', capacity_controller_1.CapacityController.getDepartmentCapacity);
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
router.get('/employee/:employeeId', validateEmployeeParam, capacity_controller_1.CapacityController.getEmployeeCapacity);
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
router.get('/employee/:employeeId/:date', [...validateEmployeeParam, ...validateDateParam], capacity_controller_1.CapacityController.getCapacityByDate);
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
router.put('/employees/:employeeId/capacity', validateEmployeeCapacityUpdate, capacity_controller_1.CapacityController.updateEmployeeCapacity);
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
router.put('/:id', validateCapacityUpdate, capacity_controller_1.CapacityController.updateCapacity);
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
router.delete('/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Capacity entry ID must be a valid UUID'), capacity_controller_1.CapacityController.deleteCapacity);
// Heat map endpoints have been moved to heat-map.routes.ts
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
router.get('/trends/:employeeId', [
    (0, express_validator_1.param)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.query)('periods')
        .optional()
        .isInt({ min: 1, max: 52 })
        .withMessage('Periods must be between 1 and 52')
], capacity_controller_1.CapacityController.getCapacityTrends);
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
router.get('/department/:departmentId/summary', [
    (0, express_validator_1.param)('departmentId')
        .isUUID()
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date')
], capacity_controller_1.CapacityController.getDepartmentCapacitySummary);
