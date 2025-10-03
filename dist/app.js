"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAppServices = exports.app = void 0;
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
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const allocation_routes_1 = __importDefault(require("./routes/allocation.routes"));
const allocation_direct_routes_1 = __importDefault(require("./routes/allocation-direct.routes"));
const allocation_csv_routes_1 = __importDefault(require("./routes/allocation-csv.routes"));
const working_allocations_routes_1 = __importDefault(require("./routes/working-allocations.routes"));
const scenario_routes_1 = require("./routes/scenario.routes");
const pipeline_routes_1 = require("./routes/pipeline.routes");
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const skill_matching_routes_1 = __importDefault(require("./routes/skill-matching.routes"));
const skills_matching_routes_1 = __importDefault(require("./routes/skills-matching.routes"));
const forecasting_routes_1 = __importDefault(require("./routes/forecasting.routes"));
const exportRoutes_1 = require("./routes/exportRoutes");
const availability_routes_1 = __importDefault(require("./routes/availability.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const reporting_routes_1 = __importDefault(require("./routes/reporting.routes"));
const allocation_templates_routes_1 = __importDefault(require("./routes/allocation-templates.routes"));
const optimization_routes_1 = __importDefault(require("./routes/optimization.routes"));
const over_allocation_warnings_routes_1 = __importDefault(require("./routes/over-allocation-warnings.routes"));
const budget_routes_1 = require("./routes/budget.routes");
const project_template_routes_1 = require("./routes/project-template.routes");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const service_injection_middleware_1 = require("./middleware/service-injection.middleware");
const service_registration_1 = require("./container/service-registration");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3003',
        'http://127.0.0.1:3004'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
if (process.env.NODE_ENV === 'production') {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: {
            error: 'Too many requests from this IP, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);
    console.log('🔐 Rate limiting enabled for production environment');
}
else {
    console.log('🔓 Rate limiting disabled for development/testing environment');
}
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
        description: 'RESTful API for employee management system with Weekly Capacity Management and CRM Pipeline Integration',
        endpoints: {
            employees: '/api/employees',
            departments: '/api/departments',
            skills: '/api/skills',
            capacity: '/api/capacity',
            resources: '/api/resources',
            projects: '/api/projects',
            allocations: '/api/allocations',
            allocation_templates: '/api/allocation-templates',
            availability: '/api/availability',
            analytics: '/api/analytics',
            pipeline: '/api/pipeline',
            scenarios: '/api/scenarios',
            notifications: '/api/notifications',
            ml_optimization: '/api/ml-optimization',
            optimization: '/api/optimization',
            skill_matching: '/api/matching',
            forecasting: '/api/forecasting',
            project_tasks: '/api/tasks',
            task_dependencies: '/api/dependencies',
            budgets: '/api/budgets',
            templates: '/api/templates'
        },
        documentation: '/api/docs',
        features: [
            'Employee CRUD',
            'Department Management',
            'Skill Tracking',
            'Weekly Capacity Planning',
            'Project Management',
            'Resource Allocation',
            'Analytics',
            'CRM Pipeline Integration',
            'Scenario Planning',
            'Resource Demand Forecasting',
            'AI-Powered Resource Optimization',
            'Skills-Based Matching with Confidence Scoring',
            'Team Chemistry Analysis',
            'Resource Recommendation Engine',
            'Skill Gap Analysis',
            'Intelligent Resource Matching',
            'Predictive Analytics for Resource Demand',
            'Real-Time Adjustment Suggestions',
            'Multi-Algorithm Optimization Engine',
            'Real-Time Notification System',
            'Conflict Detection and Alerts',
            'Email, Slack, Teams, Push Notifications',
            'Escalation Rules and Management',
            'Project Task Management with Dependencies',
            'Critical Path Method (CPM) Analysis',
            'Task Dependency Management (FS, SS, FF, SF)',
            'Automated Schedule Optimization',
            'Resource Conflict Detection',
            'Gantt Chart Integration Support',
            'Budget Management and Financial Tracking',
            'Resource Cost Management',
            'Budget Forecasting and Variance Analysis',
            'Cost Category Breakdown and Analytics',
            'Financial Reporting and Dashboard',
            'Project Template System',
            'Built-in Industry Templates',
            'Template Customization and Preview',
            'Template Rating and Community Features',
            'Quick Project Creation from Templates',
            'Availability Pattern Management',
            'Weekly/Biweekly/Monthly/Custom Patterns',
            'Holiday Calendar Integration',
            'Exception Handling for Leave/Training',
            'Effective Availability Calculation',
            'Availability Analytics and Forecasting'
        ]
    });
});
console.log('🔓 Authentication disabled for development environment');
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/employees', employee_routes_1.employeeRoutes);
app.use('/api/departments', department_routes_1.departmentRoutes);
app.use('/api/skills', skill_routes_1.skillRoutes);
app.use('/api/capacity', capacity_routes_1.capacityRoutes);
app.use('/api/resources', resource_routes_1.default);
app.use('/api/projects', project_routes_1.projectRoutes);
app.use('/api/pipeline', pipeline_routes_1.pipelineRoutes);
app.use('/api/allocations', allocation_routes_1.default);
app.use('/api/allocations', allocation_direct_routes_1.default);
app.use('/api/allocations/export', allocation_csv_routes_1.default);
app.use('/api/working-allocations', working_allocations_routes_1.default);
app.use('/api/allocation-templates', allocation_templates_routes_1.default);
app.use('/api/availability', availability_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/reporting', reporting_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api', scenario_routes_1.scenarioRoutes);
app.use('/api/forecasting', forecasting_routes_1.default);
app.use('/api/optimization', optimization_routes_1.default);
app.use('/api/matching', skill_matching_routes_1.default);
app.use('/api/skills-matching', skills_matching_routes_1.default);
app.use('/api/over-allocation-warnings', over_allocation_warnings_routes_1.default);
app.use('/api/budgets', budget_routes_1.budgetRoutes);
app.use('/api/templates', project_template_routes_1.projectTemplateRoutes);
app.use('/api/export', exportRoutes_1.exportRoutes);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist`,
        availableRoutes: ['/api/employees', '/api/departments', '/api/skills', '/api/capacity', '/api/resources', '/api/projects', '/api/pipeline', '/api/allocations', '/api/availability', '/api/analytics', '/api/reporting', '/api/notifications', '/api/scenarios', '/api/forecasting', '/api/ml-optimization', '/api/optimization', '/api/matching', '/api/budgets', '/api/templates', '/api/tasks', '/api/dependencies']
    });
});
app.use(error_handler_1.errorHandler);
let servicesInitialized = false;
const initializeAppServices = async () => {
    if (!servicesInitialized && (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')) {
        try {
            await (0, service_registration_1.initializeServices)();
            servicesInitialized = true;
            console.log('✅ Services initialized for', process.env.NODE_ENV, 'environment');
        }
        catch (error) {
            console.error('❌ Failed to initialize services:', error);
        }
    }
};
exports.initializeAppServices = initializeAppServices;
if (process.env.NODE_ENV === 'test') {
    initializeAppServices();
}
//# sourceMappingURL=app.js.map