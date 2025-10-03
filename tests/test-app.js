"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testApp = exports.initializeTestServices = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_service_1 = require("../src/database/database.service");
const skill_service_1 = require("../src/services/skill.service");
const models_1 = require("../src/models");
const employee_routes_1 = require("../src/routes/employee.routes");
const department_routes_1 = require("../src/routes/department.routes");
const skill_routes_1 = require("../src/routes/skill.routes");
const capacity_routes_1 = require("../src/routes/capacity.routes");
const resource_routes_1 = __importDefault(require("../src/routes/resource.routes"));
const project_routes_1 = require("../src/routes/project.routes");
const testApp = (0, express_1.default)();
exports.testApp = testApp;
testApp.use((0, cors_1.default)({
    origin: true,
    credentials: true,
}));
testApp.use((0, helmet_1.default)());
testApp.use((0, compression_1.default)());
testApp.use(express_1.default.json({ limit: '50mb' }));
testApp.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests from this IP, please try again later.',
});
testApp.use(limiter);
testApp.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});
const initializeTestServices = async () => {
    try {
        database_service_1.DatabaseService.resetInstance();
        const db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        const isConnected = await db.checkHealth();
        if (!isConnected) {
            throw new Error('Database health check failed');
        }
        const pool = db.getPool();
        (0, models_1.initializeModels)(pool);
        skill_service_1.SkillService.initialize(pool);
        console.log('✅ Test services initialized and database connected');
    }
    catch (error) {
        console.error('❌ Test service initialization failed:', error);
        throw error;
    }
};
exports.initializeTestServices = initializeTestServices;
testApp.use('/api/employees', employee_routes_1.employeeRoutes);
testApp.use('/api/departments', department_routes_1.departmentRoutes);
testApp.use('/api/skills', skill_routes_1.skillRoutes);
testApp.use('/api/capacity', capacity_routes_1.capacityRoutes);
testApp.use('/api/resources', resource_routes_1.default);
testApp.use('/api/projects', project_routes_1.projectRoutes);
testApp.get('/api', (_req, res) => {
    res.json({
        name: 'Employee Management Test API',
        version: '1.0.0',
        description: 'Test version of Employee Management API',
        endpoints: {
            employees: '/api/employees',
            departments: '/api/departments',
            skills: '/api/skills',
            capacity: '/api/capacity',
            resources: '/api/resources',
            projects: '/api/projects',
        },
    });
});
testApp.use((err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
    });
    res.status(err.status || 500).json({
        error: {
            message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
            status: err.status || 500,
            timestamp: new Date().toISOString(),
        },
    });
});
//# sourceMappingURL=test-app.js.map