"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRoutes = void 0;
const express_1 = require("express");
const multer_1 = require("multer");
const employee_controller_1 = require("../controllers/employee.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
exports.employeeRoutes = router;
const employeeController = new employee_controller_1.EmployeeController();
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});
// GET /api/employees - Get all employees with filtering and pagination
router.get('/', validate_middleware_1.validateEmployeeQuery, employeeController.getEmployees);
// GET /api/employees/analytics - Get employee analytics
router.get('/analytics', (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.getEmployeeAnalytics);
// GET /api/employees/export - Export employees as CSV
router.get('/export', validate_middleware_1.validateEmployeeQuery, employeeController.exportEmployees);
// POST /api/employees/bulk-import - Bulk import employees from CSV
router.post('/bulk-import', (0, auth_middleware_1.requireRole)(['admin', 'hr']), upload.single('file'), employeeController.bulkImportEmployees);
// GET /api/employees/:id - Get employee by ID
router.get('/:id', validate_middleware_1.validateIdParam, employeeController.getEmployeeById);
// GET /api/employees/:id/deletion-constraints - Check deletion constraints
router.get('/:id/deletion-constraints', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), employeeController.checkEmployeeDeletionConstraints);
// POST /api/employees - Create new employee
router.post('/', validate_middleware_1.validateCreateEmployee, (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.createEmployee);
// PUT /api/employees/:id - Update employee
router.put('/:id', validate_middleware_1.validateIdParam, validate_middleware_1.validateUpdateEmployee, (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.updateEmployee);
// DELETE /api/employees/:id - Delete employee
router.delete('/:id', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), employeeController.deleteEmployee);
