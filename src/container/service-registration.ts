/**
 * Service Registration Configuration
 * Registers all services with the dependency injection container
 */

import { container, registerService } from './service-container';
import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationServiceWrapper } from '../services/allocation-service-wrapper';
import { DependencyService } from '../services/dependency.service';
import { ScheduleManagementService } from '../services/schedule-management.service';
import { CacheService } from '../services/cache.service';
import { WebSocketService } from '../websocket/websocket.service';
import { AvailabilityPatternService } from '../services/availability-pattern.service';
import { ScenarioPlanner } from '../services/scenario-planner.service';
import { ResourceAnalyticsService } from '../services/resource-analytics.service';
import { HeatMapService } from '../services/heat-map.service';
import { ExportController } from '../controllers/exportController';
import { initializeModels } from '../models';

/**
 * Service names constants for type safety
 */
export const SERVICE_NAMES = {
  DATABASE: 'DatabaseService',
  DEPARTMENT: 'DepartmentService',
  EMPLOYEE: 'EmployeeService',
  SKILL: 'SkillService',
  ALLOCATION: 'AllocationService',
  DEPENDENCY: 'DependencyService',
  SCHEDULE_MANAGEMENT: 'ScheduleManagementService',
  CACHE: 'CacheService',
  WEBSOCKET: 'WebSocketService',
  AVAILABILITY_PATTERN: 'AvailabilityPatternService',
  SCENARIO_PLANNER: 'ScenarioPlanner',
  RESOURCE_ANALYTICS: 'ResourceAnalyticsService',
  HEAT_MAP: 'HeatMapService',
} as const;

/**
 * Configure all services in the container
 */
export function configureServices(): void {
  // Register database service as singleton first
  registerService.instance(
    SERVICE_NAMES.DATABASE,
    DatabaseService.getInstance()
  );

  // Register business services as singletons with proper database injection
  registerService.singleton(
    SERVICE_NAMES.DEPARTMENT,
    () => {
      const db = container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE);
      return new DepartmentService(db);
    }
  );

  registerService.singleton(
    SERVICE_NAMES.EMPLOYEE,
    () => {
      const db = container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE);
      return new EmployeeService(db);
    }
  );

  registerService.singleton(
    SERVICE_NAMES.SKILL,
    () => {
      // SkillService uses static initialization pattern, return instance
      return new SkillService();
    }
  );

  registerService.singleton(
    SERVICE_NAMES.ALLOCATION,
    () => {
      // Use wrapper for AllocationService to make it injectable
      return new AllocationServiceWrapper();
    }
  );

  registerService.singleton(
    SERVICE_NAMES.DEPENDENCY,
    () => {
      return new DependencyService();
    }
  );

  registerService.singleton(
    SERVICE_NAMES.SCHEDULE_MANAGEMENT,
    () => {
      return new ScheduleManagementService();
    }
  );

  // Register cache service as singleton
  registerService.singleton(
    SERVICE_NAMES.CACHE,
    () => {
      return CacheService.getInstance({
        maxSize: 1000,
        defaultTTL: 3600,
        evictionPolicy: 'LRU',
        cleanupIntervalMs: 60000
      });
    }
  );

  // Register WebSocket service as singleton
  registerService.singleton(
    SERVICE_NAMES.WEBSOCKET,
    () => {
      return WebSocketService.getInstance();
    }
  );

  // Register ResourceAnalyticsService
  registerService.singleton(
    SERVICE_NAMES.RESOURCE_ANALYTICS,
    () => {
      const db = container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE);
      // ResourceAnalyticsService constructor needs to be adjusted to accept Pool
      return new ResourceAnalyticsService(db.getPool());
    }
  );

  // Register AvailabilityPatternService
  registerService.singleton(
    SERVICE_NAMES.AVAILABILITY_PATTERN,
    () => {
      const db = container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE);
      const cache = container.resolve<CacheService>(SERVICE_NAMES.CACHE);
      const ws = container.resolve<WebSocketService>(SERVICE_NAMES.WEBSOCKET);
      return new AvailabilityPatternService(db.getPool(), cache, ws);
    }
  );

  // Register ScenarioPlanner
  registerService.singleton(
    SERVICE_NAMES.SCENARIO_PLANNER,
    () => {
      const db = container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE);
      const cache = container.resolve<CacheService>(SERVICE_NAMES.CACHE);
      const ws = container.resolve<WebSocketService>(SERVICE_NAMES.WEBSOCKET);
      const availability = container.resolve<AvailabilityPatternService>(SERVICE_NAMES.AVAILABILITY_PATTERN);
      const analytics = container.resolve<ResourceAnalyticsService>(SERVICE_NAMES.RESOURCE_ANALYTICS);
      return new ScenarioPlanner(db.getPool(), cache, ws, availability, analytics);
    }
  );

  // Register HeatMapService
  registerService.singleton(
    SERVICE_NAMES.HEAT_MAP,
    () => {
      return new HeatMapService();
    }
  );
}

/**
 * Type-safe service resolution helpers
 */
export const Services = {
  database: () => container.resolve<DatabaseService>(SERVICE_NAMES.DATABASE),
  department: () => container.resolve<DepartmentService>(SERVICE_NAMES.DEPARTMENT),
  employee: () => container.resolve<EmployeeService>(SERVICE_NAMES.EMPLOYEE),
  skill: () => container.resolve<SkillService>(SERVICE_NAMES.SKILL),
  allocation: () => container.resolve<AllocationServiceWrapper>(SERVICE_NAMES.ALLOCATION),
  dependency: () => container.resolve<DependencyService>(SERVICE_NAMES.DEPENDENCY),
  scheduleManagement: () => container.resolve<ScheduleManagementService>(SERVICE_NAMES.SCHEDULE_MANAGEMENT),
  cache: () => container.resolve<CacheService>(SERVICE_NAMES.CACHE),
  websocket: () => container.resolve<WebSocketService>(SERVICE_NAMES.WEBSOCKET),
  availabilityPattern: () => container.resolve<AvailabilityPatternService>(SERVICE_NAMES.AVAILABILITY_PATTERN),
  scenarioPlanner: () => container.resolve<ScenarioPlanner>(SERVICE_NAMES.SCENARIO_PLANNER),
  resourceAnalytics: () => container.resolve<ResourceAnalyticsService>(SERVICE_NAMES.RESOURCE_ANALYTICS),
  heatMap: () => container.resolve<HeatMapService>(SERVICE_NAMES.HEAT_MAP),
};

/**
 * Initialize all services and ensure they're connected
 */
export async function initializeServices(): Promise<void> {
  try {
    // Configure service registrations first
    configureServices();

    // Initialize database connection
    const databaseService = Services.database();
    if (!databaseService) {
      throw new Error('DatabaseService not registered properly');
    }

    await databaseService.connect();

    // Get database pool and validate
    const pool = databaseService.getPool();
    if (!pool) {
      throw new Error('Database pool is not available after connection');
    }

    // Initialize all models with database connection
    initializeModels(pool);

    // Initialize services that need static setup
    SkillService.initialize(pool);

    // Initialize controllers that need database access
    console.log('🔧 Initializing ExportController with pool from service registration:', !!pool);
    ExportController.initialize(pool);
    console.log('✅ ExportController initialization called');

    // Validate all services are properly registered and can be resolved
    await validateServiceInitialization();

    console.log('✅ All services initialized and configured');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gracefully shutdown all services
 */
export async function shutdownServices(): Promise<void> {
  try {
    // Cleanup NotificationService timers if initialized
    try {
      const { NotificationService } = await import('../services/notification.service');
      NotificationService.resetInstance();
    } catch (error) {
      // Ignore if NotificationService not initialized
    }

    // Disconnect database
    await DatabaseService.disconnect();

    // Clear container
    container.clear();

    console.log('✅ All services shut down gracefully');
  } catch (error) {
    console.error('❌ Error during service shutdown:', error);
    throw error;
  }
}

/**
 * Health check for all services
 */
export async function checkServiceHealth(): Promise<{
  database: boolean;
  services: boolean;
  overall: boolean;
}> {
  try {
    const databaseService = Services.database();
    const databaseHealthy = await databaseService.checkHealth();
    
    // Check if all required services are registered
    const requiredServices = Object.values(SERVICE_NAMES);
    const servicesHealthy = requiredServices.every(name => container.hasService(name));
    
    return {
      database: databaseHealthy,
      services: servicesHealthy,
      overall: databaseHealthy && servicesHealthy
    };
  } catch (error) {
    console.error('❌ Service health check failed:', error);
    return {
      database: false,
      services: false,
      overall: false
    };
  }
}

/**
 * Validate that all services are properly initialized
 */
export async function validateServiceInitialization(): Promise<void> {
  const requiredServices = Object.values(SERVICE_NAMES);
  const missingServices: string[] = [];
  const failedServices: string[] = [];

  for (const serviceName of requiredServices) {
    if (!container.hasService(serviceName)) {
      missingServices.push(serviceName);
      continue;
    }

    try {
      const service = container.resolve(serviceName);
      if (!service) {
        failedServices.push(serviceName);
      }
    } catch (error) {
      failedServices.push(serviceName);
      console.error(`Failed to resolve service ${serviceName}:`, error);
    }
  }

  if (missingServices.length > 0) {
    throw new Error(`Missing services: ${missingServices.join(', ')}`);
  }

  if (failedServices.length > 0) {
    throw new Error(`Failed to resolve services: ${failedServices.join(', ')}`);
  }

  console.log('✅ All services validated successfully');
}

/**
 * Get service container status for debugging
 */
export function getContainerStatus() {
  return {
    registeredServices: container.getServiceNames(),
    totalServices: container.getServiceNames().length,
    requiredServices: Object.values(SERVICE_NAMES),
    allServicesRegistered: Object.values(SERVICE_NAMES).every(name => container.hasService(name))
  };
}