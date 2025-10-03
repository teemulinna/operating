"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentRoutes = void 0;
const express_1 = require("express");
const department_controller_1 = require("../controllers/department.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
exports.departmentRoutes = router;
const departmentController = new department_controller_1.DepartmentController();
// GET /api/departments - Get all departments
router.get('/', departmentController.getDepartments);
// GET /api/departments/analytics - Get department analytics
router.get('/analytics', (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.getDepartmentAnalytics);
// GET /api/departments/:id - Get department by ID
router.get('/:id', validate_middleware_1.validateIdParam, departmentController.getDepartmentById);
// GET /api/departments/:id/employees - Get department employees
router.get('/:id/employees', validate_middleware_1.validateIdParam, departmentController.getDepartmentEmployees);
// POST /api/departments - Create new department
router.post('/', validate_middleware_1.validateCreateDepartment, (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.createDepartment);
// PUT /api/departments/:id - Update department
router.put('/:id', validate_middleware_1.validateIdParam, validate_middleware_1.validateCreateDepartment, (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.updateDepartment);
// DELETE /api/departments/:id - Delete department
router.delete('/:id', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), departmentController.deleteDepartment);
