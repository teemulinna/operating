import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  getEmployeeStats
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';
import { 
  validateEmployee, 
  validateEmployeeUpdate, 
  validateId, 
  validatePagination, 
  validateSearch 
} from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees with pagination and filtering
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of employees per page
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, terminated]
 *         description: Filter by employee status
 *       - in: query
 *         name: position
 *         schema:
 *           type: string
 *         description: Filter by position (partial match)
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by skills (comma-separated)
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', validatePagination, validateSearch, getAllEmployees);

/**
 * @swagger
 * /employees/stats:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee statistics
 */
router.get('/stats', authorize('admin', 'hr', 'manager'), getEmployeeStats);

/**
 * @swagger
 * /employees/department/{departmentId}:
 *   get:
 *     summary: Get employees by department
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of employees in department
 */
router.get('/department/:departmentId', validateId, getEmployeesByDepartment);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get('/:id', validateId, getEmployeeById);

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authorize('admin', 'hr'), validateEmployee, createEmployee);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employee'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
router.put('/:id', authorize('admin', 'hr'), validateId, validateEmployeeUpdate, updateEmployee);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
router.delete('/:id', authorize('admin', 'hr'), validateId, deleteEmployee);

export default router;