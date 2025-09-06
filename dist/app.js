"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const employee_routes_1 = require("./routes/employee.routes");
const department_routes_1 = require("./routes/department.routes");
const skill_routes_1 = require("./routes/skill.routes");
const capacity_routes_1 = require("./routes/capacity.routes");
const resource_routes_1 = __importDefault(require("./routes/resource.routes"));
const project_routes_1 = require("./routes/project.routes");
const allocation_routes_1 = __importDefault(require("./routes/allocation.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const error_handler_1 = require("./middleware/error-handler");
const auth_middleware_1 = require("./middleware/auth.middleware");
const request_logger_1 = require("./middleware/request-logger");
const service_injection_middleware_1 = require("./middleware/service-injection.middleware");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
    credentials: true
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, compression_1.default)());
app.use(service_injection_middleware_1.serviceInjectionMiddleware);
app.use(service_injection_middleware_1.serviceMonitoringMiddleware);
app.use(request_logger_1.requestLogger);
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.get('/api', (_req, res) => {
    res.json({
        name: 'Employee Management API',
        version: '1.0.0',
        description: 'RESTful API for employee management system with Weekly Capacity Management',
        endpoints: {
            employees: '/api/employees',
            departments: '/api/departments',
            skills: '/api/skills',
            capacity: '/api/capacity',
            resources: '/api/resources',
            projects: '/api/projects',
            allocations: '/api/allocations',
            analytics: '/api/analytics'
        },
        documentation: '/api/docs',
        features: ['Employee CRUD', 'Department Management', 'Skill Tracking', 'Weekly Capacity Planning', 'Project Management', 'Resource Allocation', 'Analytics']
    });
});
app.use('/api/employees', auth_middleware_1.authMiddleware);
app.use('/api/departments', auth_middleware_1.authMiddleware);
app.use('/api/skills', auth_middleware_1.authMiddleware);
app.use('/api/capacity', auth_middleware_1.authMiddleware);
app.use('/api/resources', auth_middleware_1.authMiddleware);
app.use('/api/projects', auth_middleware_1.authMiddleware);
app.use('/api/allocations', auth_middleware_1.authMiddleware);
app.use('/api/analytics', auth_middleware_1.authMiddleware);
app.use('/api/employees', employee_routes_1.employeeRoutes);
app.use('/api/departments', department_routes_1.departmentRoutes);
app.use('/api/skills', skill_routes_1.skillRoutes);
app.use('/api/capacity', capacity_routes_1.capacityRoutes);
app.use('/api/resources', resource_routes_1.default);
app.use('/api/projects', project_routes_1.projectRoutes);
app.use('/api/allocations', allocation_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist`,
        availableRoutes: ['/api/employees', '/api/departments', '/api/skills', '/api/capacity', '/api/resources', '/api/projects', '/api/allocations', '/api/analytics']
    });
});
app.use(error_handler_1.errorHandler);
//# sourceMappingURL=app.js.map