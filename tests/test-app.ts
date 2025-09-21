/**
 * Test-specific app configuration
 * Ensures proper service initialization order for tests
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import services and initialize them first
import { DatabaseService } from '../src/database/database.service';
import { SkillService } from '../src/services/skill.service';
import { initializeModels } from '../src/models';
import { Pool } from 'pg';

// Then import routes after services are ready
import { employeeRoutes } from '../src/routes/employee.routes';
import { departmentRoutes } from '../src/routes/department.routes';
import { skillRoutes } from '../src/routes/skill.routes';
import { capacityRoutes } from '../src/routes/capacity.routes';
import resourceRoutes from '../src/routes/resource.routes';
import { projectRoutes } from '../src/routes/project.routes';

const testApp = express();

// Middleware setup
testApp.use(cors({
  origin: true,
  credentials: true,
}));
testApp.use(helmet());
testApp.use(compression());
testApp.use(express.json({ limit: '50mb' }));
testApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Much higher limit for tests
  message: 'Too many requests from this IP, please try again later.',
});
testApp.use(limiter);

// Health check endpoint
testApp.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Initialize test-specific services
export const initializeTestServices = async (): Promise<void> => {
  try {
    // Reset singleton to ensure fresh state
    DatabaseService.resetInstance();

    // Connect to test database
    const db = DatabaseService.getInstance();
    await db.connect();

    // Verify connection
    const isConnected = await db.checkHealth();
    if (!isConnected) {
      throw new Error('Database health check failed');
    }

    // Get pool and initialize models
    const pool = db.getPool();
    initializeModels(pool);

    // Initialize SkillService
    SkillService.initialize(pool);

    console.log('✅ Test services initialized and database connected');
  } catch (error) {
    console.error('❌ Test service initialization failed:', error);
    throw error;
  }
};

// Routes setup - only after services are initialized
testApp.use('/api/employees', employeeRoutes);
testApp.use('/api/departments', departmentRoutes);
testApp.use('/api/skills', skillRoutes);
testApp.use('/api/capacity', capacityRoutes);
testApp.use('/api/resources', resourceRoutes);
testApp.use('/api/projects', projectRoutes);

// API documentation endpoint
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

// Global error handler
testApp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export { testApp };