import express from 'express';
import { DepartmentController } from '../controllers/department.controller';
import { validateCreateDepartment, validateIdParam } from '../middleware/validate.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = express.Router();
const departmentController = new DepartmentController();

// GET /api/departments - Get all departments
router.get(
  '/',
  departmentController.getDepartments
);

// GET /api/departments/analytics - Get department analytics
router.get(
  '/analytics',
  requireRole(['admin', 'hr']),
  departmentController.getDepartmentAnalytics
);

// GET /api/departments/:id - Get department by ID
router.get(
  '/:id',
  validateIdParam,
  departmentController.getDepartmentById
);

// GET /api/departments/:id/employees - Get department employees
router.get(
  '/:id/employees',
  validateIdParam,
  departmentController.getDepartmentEmployees
);

// POST /api/departments - Create new department
router.post(
  '/',
  validateCreateDepartment,
  requireRole(['admin', 'hr']),
  departmentController.createDepartment
);

// PUT /api/departments/:id - Update department
router.put(
  '/:id',
  validateIdParam,
  validateCreateDepartment,
  requireRole(['admin', 'hr']),
  departmentController.updateDepartment
);

// DELETE /api/departments/:id - Delete department
router.delete(
  '/:id',
  validateIdParam,
  requireRole(['admin']),
  departmentController.deleteDepartment
);

export { router as departmentRoutes };