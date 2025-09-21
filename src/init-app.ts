import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { serviceInjectionMiddleware, serviceMonitoringMiddleware } from './middleware/service-injection.middleware';
import { initializeServices } from './container/service-registration';

// Create the Express app without routes
export const app = express();

// Configure middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request logging
app.use(requestLogger);

// Service injection middleware
app.use(serviceInjectionMiddleware);
app.use(serviceMonitoringMiddleware);

// Initialize routes after services are ready
export async function initializeApp(): Promise<express.Application> {
  // Initialize services first
  await initializeServices();

  // Now it's safe to import and use routes
  const { employeeRoutes } = await import('./routes/employee.routes');
  const { departmentRoutes } = await import('./routes/department.routes');
  const { skillRoutes } = await import('./routes/skill.routes');
  const { capacityRoutes } = await import('./routes/capacity.routes');
  const resourceRoutes = (await import('./routes/resource.routes')).default;
  const { projectRoutes } = await import('./routes/project.routes');
  const allocationRoutes = (await import('./routes/allocation.routes')).default;
  const allocationDirectRoutes = (await import('./routes/allocation-direct.routes')).default;
  const allocationCSVRoutes = (await import('./routes/allocation-csv.routes')).default;
  const workingAllocationsRoutes = (await import('./routes/working-allocations.routes')).default;
  const { scenarioRoutes } = await import('./routes/scenario.routes');
  const { pipelineRoutes } = await import('./routes/pipeline.routes');
  const notificationRoutes = (await import('./routes/notification.routes')).default;
  const skillMatchingRoutes = (await import('./routes/skill-matching.routes')).default;
  const skillsMatchingRoutes = (await import('./routes/skills-matching.routes')).default;
  const forecastingRoutes = (await import('./routes/forecasting.routes')).default;
  const { exportRoutes } = await import('./routes/exportRoutes');
  const analyticsRoutes = (await import('./routes/analytics.routes')).default;
  const reportingRoutes = (await import('./routes/reporting.routes')).default;
  const allocationTemplatesRoutes = (await import('./routes/allocation-templates.routes')).default;
  const { mlOptimizationRoutes } = await import('./routes/ml-optimization.routes');
  const optimizationRoutes = (await import('./routes/optimization.routes')).default;
  const overAllocationWarningsRoutes = (await import('./routes/over-allocation-warnings.routes')).default;
  const { budgetRoutes } = await import('./routes/budget.routes');
  const { projectTemplateRoutes } = await import('./routes/project-template.routes');
  const { availabilityRoutes } = await import('./routes/availabilityRoutes');

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const { checkServiceHealth } = await import('./container/service-registration');
      const health = await checkServiceHealth();

      if (health.overall) {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: health
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          services: health
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Employee Management API',
      version: '1.0.0',
      status: 'running',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Mount API routes
  app.use('/api/employees', employeeRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/skills', skillRoutes);
  app.use('/api/capacity', capacityRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/allocations', allocationRoutes);
  app.use('/api/allocations-direct', allocationDirectRoutes);
  app.use('/api/allocations-csv', allocationCSVRoutes);
  app.use('/api/working-allocations', workingAllocationsRoutes);
  app.use('/api/scenarios', scenarioRoutes);
  app.use('/api/pipeline', pipelineRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/skill-matching', skillMatchingRoutes);
  app.use('/api/skills-matching', skillsMatchingRoutes);
  app.use('/api/forecasting', forecastingRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reporting', reportingRoutes);
  app.use('/api/allocation-templates', allocationTemplatesRoutes);
  app.use('/api/ml-optimization', mlOptimizationRoutes);
  app.use('/api/optimization', optimizationRoutes);
  app.use('/api/over-allocation-warnings', overAllocationWarningsRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/project-templates', projectTemplateRoutes);
  app.use('/api/availability', availabilityRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}