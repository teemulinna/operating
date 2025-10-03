/**
 * Service Injection Middleware
 * Makes services available to controllers through request context
 */

import { Request, Response, NextFunction } from 'express';
import { Services } from '../container/service-registration';
import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationServiceWrapper } from '../services/allocation-service-wrapper';
import { CacheService } from '../services/cache.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AvailabilityPatternService } from '../services/availability-pattern.service';
import { ScenarioPlanner } from '../services/scenario-planner.service';
import { ResourceAnalyticsService } from '../services/resource-analytics.service';
import { HeatMapService } from '../services/heat-map.service';

/**
 * Extended Request interface with injected services
 */
export interface RequestWithServices extends Request {
  services: {
    database: DatabaseService;
    department: DepartmentService;
    employee: EmployeeService;
    skill: SkillService;
    allocation: AllocationServiceWrapper;
    cache: CacheService;
    websocket: WebSocketService;
    availabilityPattern: AvailabilityPatternService;
    scenarioPlanner: ScenarioPlanner;
    resourceAnalytics: ResourceAnalyticsService;
    heatMap: HeatMapService;
    db?: any; // For backward compatibility with controllers expecting db directly
    cacheService?: CacheService; // Alternative name for compatibility
    wsService?: WebSocketService; // Alternative name for compatibility
    availabilityService?: AvailabilityPatternService; // Alternative name for compatibility
  };
}

/**
 * Middleware to inject services into request context
 */
export const serviceInjectionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In test environment, ensure services are initialized
    if (process.env.NODE_ENV === 'test') {
      const { initializeAppServices } = await import('../app');
      await initializeAppServices();
    }

    // Inject services into request
    const databaseService = Services.database();
    const cacheService = Services.cache();
    const websocketService = Services.websocket();
    const availabilityPatternService = Services.availabilityPattern();

    (req as RequestWithServices).services = {
      database: databaseService,
      department: Services.department(),
      employee: Services.employee(),
      skill: Services.skill(),
      allocation: Services.allocation(),
      cache: cacheService,
      websocket: websocketService,
      availabilityPattern: availabilityPatternService,
      scenarioPlanner: Services.scenarioPlanner(),
      resourceAnalytics: Services.resourceAnalytics(),
      heatMap: Services.heatMap(),
      // Compatibility aliases
      db: databaseService.getPool(),
      cacheService: cacheService,
      wsService: websocketService,
      availabilityService: availabilityPatternService,
    };

    next();
  } catch (error) {
    console.error('Service injection failed:', error);
    console.error('Error details:', error);

    // In test environment, provide more detailed error information
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to initialize services',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    } else {
      res.status(503).json({
        error: 'Service unavailable',
        message: 'Unable to initialize services',
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  }
};

/**
 * Health check middleware to verify services are available
 */
export const serviceHealthCheckMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const databaseService = Services.database();
    const isHealthy = await databaseService.checkHealth();

    if (!isHealthy) {
      res.status(503).json({
        error: 'Database service unhealthy',
        message: 'Database connection is not available',
        timestamp: new Date().toISOString(),
        path: req.path
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Service health check failed:', error);
    res.status(503).json({
      error: 'Service health check failed',
      message: 'Unable to verify service health',
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
};

/**
 * Transaction middleware for database operations
 */
export const transactionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const services = (req as RequestWithServices).services;
  
  if (!services?.database) {
    res.status(503).json({
      error: 'Database service not available',
      timestamp: new Date().toISOString(),
      path: req.path
    });
    return;
  }

  // For now, we'll use the existing connection pool
  // In a more advanced implementation, we could start a transaction here
  next();
};

/**
 * Service performance monitoring middleware
 */
export const serviceMonitoringMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Override res.end to measure response time
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Log service-related metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    }

    // Call original end and return this
    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};