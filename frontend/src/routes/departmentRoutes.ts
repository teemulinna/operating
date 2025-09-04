import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
} from '../controllers/departmentController';
import { authenticate, authorize } from '../middleware/auth';
import { validateDepartment, validateId, validatePagination } from '../middleware/validation';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name and description
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: List of departments
 */
router.get('/', validatePagination, getAllDepartments);

/**
 * @swagger
 * /departments/stats:
 *   get:
 *     summary: Get department statistics
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department statistics
 */
router.get('/stats', authorize('admin', 'hr', 'manager'), getDepartmentStats);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
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
 *         description: Department details
 *       404:
 *         description: Department not found
 */
router.get('/:id', validateId, getDepartmentById);

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Department'
 *     responses:
 *       201:
 *         description: Department created successfully
 */
router.post('/', authorize('admin', 'hr'), validateDepartment, createDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   put:
 *     summary: Update department
 *     tags: [Departments]
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
 *             $ref: '#/components/schemas/Department'
 *     responses:
 *       200:
 *         description: Department updated successfully
 */
router.put('/:id', authorize('admin', 'hr'), validateId, validateDepartment, updateDepartment);

/**
 * @swagger
 * /departments/{id}:
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
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
 *         description: Department deleted successfully
 */
router.delete('/:id', authorize('admin', 'hr'), validateId, deleteDepartment);

export default router;