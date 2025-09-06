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
import { scenarioRoutes } from './routes/scenario.routes';
import { pipelineRoutes } from './routes/pipeline.routes';
// Temporarily disable problematic routes until controllers are fixed
// import { availabilityRoutes } from './routes/availabilityRoutes';
// import { exportRoutes } from './routes/exportRoutes';
import analyticsRoutes from './routes/analytics.routes';
import allocationTemplatesRoutes from './routes/allocation-templates.routes';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth.middleware';
import { requestLogger } from './middleware/request-logger';
import { serviceInjectionMiddleware, serviceMonitoringMiddleware } from './middleware/service-injection.middleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

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
      analytics: '/api/analytics',
      pipeline: '/api/pipeline',
      scenarios: '/api/scenarios'
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
      'Resource Demand Forecasting'
    ]
  });
});

// Apply authentication middleware to protected routes
app.use('/api/employees', authMiddleware);
app.use('/api/departments', authMiddleware);
app.use('/api/skills', authMiddleware);
app.use('/api/capacity', authMiddleware);
app.use('/api/resources', authMiddleware);
// app.use('/api/projects', authMiddleware); // Temporarily disabled for testing
// app.use('/api/pipeline', authMiddleware); // Temporarily disabled for testing
app.use('/api/allocations', authMiddleware);
app.use('/api/allocation-templates', authMiddleware);
app.use('/api/analytics', authMiddleware);

// API routes
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/capacity', capacityRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/allocation-templates', allocationTemplatesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', scenarioRoutes);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: ['/api/employees', '/api/departments', '/api/skills', '/api/capacity', '/api/resources', '/api/projects', '/api/pipeline', '/api/allocations', '/api/analytics', '/api/scenarios', '/api/forecasting']
  });
});

// Global error handler
app.use(errorHandler);

export { app };
