import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { employeeRoutes } from './routes/employee.routes';
import { departmentRoutes } from './routes/department.routes';
import { skillRoutes } from './routes/skill.routes';
import { capacityRoutes } from './routes/capacity.routes';
import resourceRoutes from './routes/resource.routes';
import { projectRoutes } from './routes/project.routes';
import allocationRoutes from './routes/allocation.routes';
import allocationDirectRoutes from './routes/allocation-direct.routes';
import allocationCSVRoutes from './routes/allocation-csv.routes';
import workingAllocationsRoutes from './routes/working-allocations.routes';
import { scenarioRoutes } from './routes/scenario.routes';
import { pipelineRoutes } from './routes/pipeline.routes';
import notificationRoutes from './routes/notification.routes';
import skillMatchingRoutes from './routes/skill-matching.routes';
import skillsMatchingRoutes from './routes/skills-matching.routes';
// AI and Intelligence Routes
import forecastingRoutes from './routes/forecasting.routes';
// Export and availability routes
import { exportRoutes } from './routes/exportRoutes';
import availabilityRoutes from './routes/availability.routes';
import analyticsRoutes from './routes/analytics.routes';
import reportingRoutes from './routes/reporting.routes';
import allocationTemplatesRoutes from './routes/allocation-templates.routes';
// import { mlOptimizationRoutes } from './routes/ml-optimization.routes'; // Temporarily disabled
import optimizationRoutes from './routes/optimization.routes';
import overAllocationWarningsRoutes from './routes/over-allocation-warnings.routes';
// Temporarily disabled project-tasks routes due to Sequelize compatibility
// import projectTasksRoutes from './routes/project-tasks.routes';
import { budgetRoutes } from './routes/budget.routes';
import { projectTemplateRoutes } from './routes/project-template.routes';
import { errorHandler } from './middleware/error-handler';
// Removed unused import - authMiddleware is temporarily disabled in routes
import { requestLogger } from './middleware/request-logger';
import { serviceInjectionMiddleware, serviceMonitoringMiddleware } from './middleware/service-injection.middleware';
import { initializeServices } from './container/service-registration';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
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

// Rate limiting (disabled in development, strict in production)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per windowMs in production
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });
  app.use('/api/', limiter);
  console.log('🔐 Rate limiting enabled for production environment');
} else {
  console.log('🔓 Rate limiting disabled for development/testing environment');
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Service injection middleware
app.use(serviceInjectionMiddleware);

// Performance monitoring middleware
app.use(serviceMonitoringMiddleware);

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API documentation endpoint
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

// Apply authentication middleware to protected routes (disabled for development)
// Development: No authentication required for testing
console.log('🔓 Authentication disabled for development environment');

// API routes
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/allocations', allocationDirectRoutes); // Direct allocation routes for MVP
app.use('/api/allocations/export', allocationCSVRoutes);
app.use('/api/working-allocations', workingAllocationsRoutes);
app.use('/api/allocation-templates', allocationTemplatesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', scenarioRoutes);
// AI and Intelligence Routes
app.use('/api/forecasting', forecastingRoutes);
// app.use('/api/ml-optimization', mlOptimizationRoutes); // Temporarily disabled
app.use('/api/optimization', optimizationRoutes);
app.use('/api/matching', skillMatchingRoutes);
app.use('/api/skills-matching', skillsMatchingRoutes);
app.use('/api/over-allocation-warnings', overAllocationWarningsRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/templates', projectTemplateRoutes);
app.use('/api/export', exportRoutes);
// Temporarily disabled project-tasks routes due to Sequelize compatibility
// app.use('/api', projectTasksRoutes);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: ['/api/employees', '/api/departments', '/api/skills', '/api/capacity', '/api/resources', '/api/projects', '/api/pipeline', '/api/allocations', '/api/availability', '/api/analytics', '/api/reporting', '/api/notifications', '/api/scenarios', '/api/forecasting', '/api/ml-optimization', '/api/optimization', '/api/matching', '/api/budgets', '/api/templates', '/api/tasks', '/api/dependencies']
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services for testing environment
// In production, services are initialized in server.ts
let servicesInitialized = false;
const initializeAppServices = async () => {
  if (!servicesInitialized && (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')) {
    try {
      await initializeServices();
      servicesInitialized = true;
      console.log('✅ Services initialized for', process.env.NODE_ENV, 'environment');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      // Don't throw here - let the middleware handle the error per request
    }
  }
};

// Initialize services immediately for test environment
if (process.env.NODE_ENV === 'test') {
  initializeAppServices();
}

export { app, initializeAppServices };