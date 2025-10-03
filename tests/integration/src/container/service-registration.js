"use strict";
/**
 * Service Registration Configuration
 * Registers all services with the dependency injection container
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = exports.SERVICE_NAMES = void 0;
exports.configureServices = configureServices;
exports.initializeServices = initializeServices;
exports.shutdownServices = shutdownServices;
exports.checkServiceHealth = checkServiceHealth;
exports.validateServiceInitialization = validateServiceInitialization;
exports.getContainerStatus = getContainerStatus;
const service_container_1 = require("./service-container");
const database_service_1 = require("../database/database.service");
const department_service_1 = require("../services/department.service");
const employee_service_1 = require("../services/employee.service");
const skill_service_1 = require("../services/skill.service");
const allocation_service_wrapper_1 = require("../services/allocation-service-wrapper");
const dependency_service_1 = require("../services/dependency.service");
const schedule_management_service_1 = require("../services/schedule-management.service");
const cache_service_1 = require("../services/cache.service");
const websocket_service_1 = require("../websocket/websocket.service");
const availability_pattern_service_1 = require("../services/availability-pattern.service");
const scenario_planner_service_1 = require("../services/scenario-planner.service");
const resource_analytics_service_1 = require("../services/resource-analytics.service");
const exportController_1 = require("../controllers/exportController");
const models_1 = require("../models");
const heat_map_service_1 = require("../services/heat-map.service");
/**
 * Service names constants for type safety
 */
exports.SERVICE_NAMES = {
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
};
/**
 * Configure all services in the container
 */
function configureServices() {
    // Register database service as singleton first
    service_container_1.registerService.instance(exports.SERVICE_NAMES.DATABASE, database_service_1.DatabaseService.getInstance());
    // Register business services as singletons with proper database injection
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.DEPARTMENT, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        return new department_service_1.DepartmentService(db);
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.EMPLOYEE, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        return new employee_service_1.EmployeeService(db);
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SKILL, () => {
        // SkillService uses static initialization pattern, return instance
        return new skill_service_1.SkillService();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.ALLOCATION, () => {
        // Use wrapper for AllocationService to make it injectable
        return new allocation_service_wrapper_1.AllocationServiceWrapper();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.DEPENDENCY, () => {
        return new dependency_service_1.DependencyService();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SCHEDULE_MANAGEMENT, () => {
        return new schedule_management_service_1.ScheduleManagementService();
    });
    // Register cache service as singleton
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.CACHE, () => {
        return cache_service_1.CacheService.getInstance({
            maxSize: 1000,
            defaultTTL: 3600,
            evictionPolicy: 'LRU',
            cleanupIntervalMs: 60000
        });
    });
    // Register WebSocket service as singleton
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.WEBSOCKET, () => {
        return websocket_service_1.WebSocketService.getInstance();
    });
    // Register ResourceAnalyticsService
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.RESOURCE_ANALYTICS, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        // ResourceAnalyticsService constructor needs to be adjusted to accept Pool
        return new resource_analytics_service_1.ResourceAnalyticsService(db.getPool());
    });
    // Register AvailabilityPatternService
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.AVAILABILITY_PATTERN, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        const cache = service_container_1.container.resolve(exports.SERVICE_NAMES.CACHE);
        const ws = service_container_1.container.resolve(exports.SERVICE_NAMES.WEBSOCKET);
        return new availability_pattern_service_1.AvailabilityPatternService(db.getPool(), cache, ws);
    });
    // Register ScenarioPlanner
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SCENARIO_PLANNER, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        const cache = service_container_1.container.resolve(exports.SERVICE_NAMES.CACHE);
        const ws = service_container_1.container.resolve(exports.SERVICE_NAMES.WEBSOCKET);
        const availability = service_container_1.container.resolve(exports.SERVICE_NAMES.AVAILABILITY_PATTERN);
        const analytics = service_container_1.container.resolve(exports.SERVICE_NAMES.RESOURCE_ANALYTICS);
        return new scenario_planner_service_1.ScenarioPlanner(db.getPool(), cache, ws, availability, analytics);
    });
    // Register HeatMapService
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.HEAT_MAP, () => {
        return new heat_map_service_1.HeatMapService();
    });
}
/**
 * Type-safe service resolution helpers
 */
exports.Services = {
    database: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE),
    department: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DEPARTMENT),
    employee: () => service_container_1.container.resolve(exports.SERVICE_NAMES.EMPLOYEE),
    skill: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SKILL),
    allocation: () => service_container_1.container.resolve(exports.SERVICE_NAMES.ALLOCATION),
    dependency: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DEPENDENCY),
    scheduleManagement: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SCHEDULE_MANAGEMENT),
    cache: () => service_container_1.container.resolve(exports.SERVICE_NAMES.CACHE),
    websocket: () => service_container_1.container.resolve(exports.SERVICE_NAMES.WEBSOCKET),
    availabilityPattern: () => service_container_1.container.resolve(exports.SERVICE_NAMES.AVAILABILITY_PATTERN),
    scenarioPlanner: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SCENARIO_PLANNER),
    resourceAnalytics: () => service_container_1.container.resolve(exports.SERVICE_NAMES.RESOURCE_ANALYTICS),
    heatMap: () => service_container_1.container.resolve(exports.SERVICE_NAMES.HEAT_MAP),
};
/**
 * Initialize all services and ensure they're connected
 */
async function initializeServices() {
    try {
        // Configure service registrations first
        configureServices();
        // Initialize database connection
        const databaseService = exports.Services.database();
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
        (0, models_1.initializeModels)(pool);
        // Initialize services that need static setup
        skill_service_1.SkillService.initialize(pool);
        // Initialize controllers that need database access
        console.log('🔧 Initializing ExportController with pool from service registration:', !!pool);
        exportController_1.ExportController.initialize(pool);
        console.log('✅ ExportController initialization called');
        // Validate all services are properly registered and can be resolved
        await validateServiceInitialization();
        console.log('✅ All services initialized and configured');
    }
    catch (error) {
        console.error('❌ Service initialization failed:', error);
        throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Gracefully shutdown all services
 */
async function shutdownServices() {
    try {
        // Cleanup NotificationService timers if initialized
        try {
            const { NotificationService } = await Promise.resolve().then(() => require('../services/notification.service'));
            NotificationService.resetInstance();
        }
        catch (error) {
            // Ignore if NotificationService not initialized
        }
        // Disconnect database
        await database_service_1.DatabaseService.disconnect();
        // Clear container
        service_container_1.container.clear();
        console.log('✅ All services shut down gracefully');
    }
    catch (error) {
        console.error('❌ Error during service shutdown:', error);
        throw error;
    }
}
/**
 * Health check for all services
 */
async function checkServiceHealth() {
    try {
        const databaseService = exports.Services.database();
        const databaseHealthy = await databaseService.checkHealth();
        // Check if all required services are registered
        const requiredServices = Object.values(exports.SERVICE_NAMES);
        const servicesHealthy = requiredServices.every(name => service_container_1.container.hasService(name));
        return {
            database: databaseHealthy,
            services: servicesHealthy,
            overall: databaseHealthy && servicesHealthy
        };
    }
    catch (error) {
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
async function validateServiceInitialization() {
    const requiredServices = Object.values(exports.SERVICE_NAMES);
    const missingServices = [];
    const failedServices = [];
    for (const serviceName of requiredServices) {
        if (!service_container_1.container.hasService(serviceName)) {
            missingServices.push(serviceName);
            continue;
        }
        try {
            const service = service_container_1.container.resolve(serviceName);
            if (!service) {
                failedServices.push(serviceName);
            }
        }
        catch (error) {
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
function getContainerStatus() {
    return {
        registeredServices: service_container_1.container.getServiceNames(),
        totalServices: service_container_1.container.getServiceNames().length,
        requiredServices: Object.values(exports.SERVICE_NAMES),
        allServicesRegistered: Object.values(exports.SERVICE_NAMES).every(name => service_container_1.container.hasService(name))
    };
}
