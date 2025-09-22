"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const employee_controller_1 = require("../controllers/employee.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
exports.employeeRoutes = router;
const employeeController = new employee_controller_1.EmployeeController();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
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
router.get('/', validate_middleware_1.validateEmployeeQuery, employeeController.getEmployees);
router.get('/analytics', (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.getEmployeeAnalytics);
router.get('/export', validate_middleware_1.validateEmployeeQuery, employeeController.exportEmployees);
router.post('/bulk-import', (0, auth_middleware_1.requireRole)(['admin', 'hr']), upload.single('file'), employeeController.bulkImportEmployees);
router.get('/:id', validate_middleware_1.validateIdParam, employeeController.getEmployeeById);
router.get('/:id/deletion-constraints', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), employeeController.checkEmployeeDeletionConstraints);
router.post('/', validate_middleware_1.validateCreateEmployee, (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.createEmployee);
router.put('/:id', validate_middleware_1.validateIdParam, validate_middleware_1.validateUpdateEmployee, (0, auth_middleware_1.requireRole)(['admin', 'hr']), employeeController.updateEmployee);
router.delete('/:id', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), employeeController.deleteEmployee);
//# sourceMappingURL=employee.routes.js.map