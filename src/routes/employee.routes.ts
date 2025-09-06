import express from 'express';
import multer from 'multer';
import { EmployeeController } from '../controllers/employee.controller';
import { 
  validateCreateEmployee, 
  validateUpdateEmployee, 
  validateIdParam, 
  validateEmployeeQuery 
} from '../middleware/validate.middleware';
import { requireRole } from '../middleware/auth.middleware';

const router = express.Router();
const employeeController = new EmployeeController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// GET /api/employees - Get all employees with filtering and pagination
router.get(
  '/',
  validateEmployeeQuery,
  employeeController.getEmployees
);

// GET /api/employees/analytics - Get employee analytics
router.get(
  '/analytics',
  requireRole(['admin', 'hr']),
  employeeController.getEmployeeAnalytics
);

// GET /api/employees/export - Export employees as CSV
router.get(
  '/export',
  validateEmployeeQuery,
  employeeController.exportEmployees
);

// POST /api/employees/bulk-import - Bulk import employees from CSV
router.post(
  '/bulk-import',
  requireRole(['admin', 'hr']),
  upload.single('file'),
  employeeController.bulkImportEmployees
);

// GET /api/employees/:id - Get employee by ID
router.get(
  '/:id',
  validateIdParam,
  employeeController.getEmployeeById
);

// POST /api/employees - Create new employee
router.post(
  '/',
  validateCreateEmployee,
  requireRole(['admin', 'hr']),
  employeeController.createEmployee
);

// PUT /api/employees/:id - Update employee
router.put(
  '/:id',
  validateIdParam,
  validateUpdateEmployee,
  requireRole(['admin', 'hr']),
  employeeController.updateEmployee
);

// DELETE /api/employees/:id - Delete employee
router.delete(
  '/:id',
  validateIdParam,
  requireRole(['admin']),
  employeeController.deleteEmployee
);

export { router as employeeRoutes };