"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentRoutes = void 0;
const express_1 = __importDefault(require("express"));
const department_controller_1 = require("../controllers/department.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
exports.departmentRoutes = router;
const departmentController = new department_controller_1.DepartmentController();
router.get('/', departmentController.getDepartments);
router.get('/analytics', (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.getDepartmentAnalytics);
router.get('/:id', validate_middleware_1.validateIdParam, departmentController.getDepartmentById);
router.get('/:id/employees', validate_middleware_1.validateIdParam, departmentController.getDepartmentEmployees);
router.post('/', validate_middleware_1.validateCreateDepartment, (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.createDepartment);
router.put('/:id', validate_middleware_1.validateIdParam, validate_middleware_1.validateCreateDepartment, (0, auth_middleware_1.requireRole)(['admin', 'hr']), departmentController.updateDepartment);
router.delete('/:id', validate_middleware_1.validateIdParam, (0, auth_middleware_1.requireRole)(['admin']), departmentController.deleteDepartment);
//# sourceMappingURL=department.routes.js.map