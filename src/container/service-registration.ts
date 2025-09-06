/**
 * Service Registration Configuration
 * Registers all services with the dependency injection container
 */

import { container, registerService } from './service-container';
import { DatabaseService } from '../database/database.service';
import { DepartmentService } from '../services/department.service';
import { EmployeeService } from '../services/employee.service';
import { SkillService } from '../services/skill.service';
import { AllocationService } from '../services/allocation.service';
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
} as const;

/**
 * Configure all services in the container
 */
export function configureServices(): void {
  // Register database service as singleton
  registerService.instance(
    SERVICE_NAMES.DATABASE,
    DatabaseService.getInstance()
  );

  // Register business services as singletons with database injection
  registerService.singleton(
    SERVICE_NAMES.DEPARTMENT,
    () => new DepartmentService()
  );

  registerService.singleton(
    SERVICE_NAMES.EMPLOYEE,
    () => new EmployeeService()
  );

  registerService.singleton(
    SERVICE_NAMES.SKILL,
    () => new SkillService()
  );

  registerService.singleton(
    SERVICE_NAMES.ALLOCATION,
    () => new AllocationService()
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
  allocation: () => container.resolve<AllocationService>(SERVICE_NAMES.ALLOCATION),
};

/**
 * Initialize all services and ensure they're connected
 */
export async function initializeServices(): Promise<void> {
  // Configure service registrations
  configureServices();

  // Initialize database connection
  const databaseService = Services.database();
  await databaseService.connect();

  // Initialize all models with database connection
  const pool = databaseService.getPool();
  if (!pool) {
    throw new Error('Database pool is not available');
  }
  initializeModels(pool);

  console.log('✅ All services initialized and configured');
}

/**
 * Gracefully shutdown all services
 */
export async function shutdownServices(): Promise<void> {
  try {
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