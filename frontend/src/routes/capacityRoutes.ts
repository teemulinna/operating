import express from 'express';
import {
  getEmployeeCapacity,
  updateEmployeeCapacity,
  getTeamCapacity,
  bulkUpdateCapacity,
  getCapacityAnalytics
} from '../controllers/capacityController';
import { authenticate, authorize } from '../middleware/auth';
import { validateId } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /capacity/employee/{id}:
 *   get:
 *     summary: Get capacity data for specific employee
 *     tags: [Capacity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter until this date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Maximum records to return
 *     responses:
 *       200:
 *         description: Employee capacity data
 *       404:
 *         description: Employee not found
 */
router.get('/employee/:id', validateId, getEmployeeCapacity);

/**
 * @swagger
 * /capacity/employee/{id}:
 *   put:
 *     summary: Update employee capacity for a specific date
 *     tags: [Capacity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID
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
 *                 description: Date for the capacity record
 *               availableHours:
 *                 type: number
 *                 minimum: 0
 *                 description: Available hours for the day
 *               allocatedHours:
 *                 type: number
 *                 minimum: 0
 *                 description: Allocated hours for the day
 *               notes:
 *                 type: string
 *                 description: Optional notes about capacity
 *     responses:
 *       200:
 *         description: Capacity updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Employee not found
 */
router.put('/employee/:id', authorize('admin', 'hr', 'manager'), validateId, updateEmployeeCapacity);

/**
 * @swagger
 * /capacity/team:
 *   get:
 *     summary: Get team capacity overview
 *     tags: [Capacity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: Filter by department ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for capacity overview (defaults to today)
 *     responses:
 *       200:
 *         description: Team capacity overview
 */
router.get('/team', authorize('admin', 'hr', 'manager'), getTeamCapacity);

/**
 * @swagger
 * /capacity/bulk:
 *   post:
 *     summary: Bulk update capacity for multiple employees
 *     tags: [Capacity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
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
 *                       description: Employee ID
 *                     date:
 *                       type: string
 *                       format: date
 *                       description: Date for the capacity record
 *                     availableHours:
 *                       type: number
 *                       minimum: 0
 *                       description: Available hours
 *                     allocatedHours:
 *                       type: number
 *                       minimum: 0
 *                       description: Allocated hours
 *                     notes:
 *                       type: string
 *                       description: Optional notes
 *     responses:
 *       200:
 *         description: Bulk update completed with results
 *       400:
 *         description: Invalid input data
 */
router.post('/bulk', authorize('admin', 'hr'), bulkUpdateCapacity);

/**
 * @swagger
 * /capacity/analytics:
 *   get:
 *     summary: Get capacity analytics and trends
 *     tags: [Capacity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by specific employee
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Capacity analytics data
 */
router.get('/analytics', authorize('admin', 'hr', 'manager'), getCapacityAnalytics);

export default router;