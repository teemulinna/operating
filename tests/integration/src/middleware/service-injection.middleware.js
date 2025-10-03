"use strict";
/**
 * Service Injection Middleware
 * Makes services available to controllers through request context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceMonitoringMiddleware = exports.transactionMiddleware = exports.serviceHealthCheckMiddleware = exports.serviceInjectionMiddleware = void 0;
const service_registration_1 = require("../container/service-registration");
/**
 * Middleware to inject services into request context
 */
const serviceInjectionMiddleware = async (req, res, next) => {
    try {
        // In test environment, ensure services are initialized
        if (process.env.NODE_ENV === 'test') {
            const { initializeAppServices } = await Promise.resolve().then(() => require('../app'));
            await initializeAppServices();
        }
        // Inject services into request
        const databaseService = service_registration_1.Services.database();
        const cacheService = service_registration_1.Services.cache();
        const websocketService = service_registration_1.Services.websocket();
        const availabilityPatternService = service_registration_1.Services.availabilityPattern();
        req.services = {
            database: databaseService,
            department: service_registration_1.Services.department(),
            employee: service_registration_1.Services.employee(),
            skill: service_registration_1.Services.skill(),
            allocation: service_registration_1.Services.allocation(),
            cache: cacheService,
            websocket: websocketService,
            availabilityPattern: availabilityPatternService,
            scenarioPlanner: service_registration_1.Services.scenarioPlanner(),
            resourceAnalytics: service_registration_1.Services.resourceAnalytics(),
            heatMap: service_registration_1.Services.heatMap(),
            // Compatibility aliases
            db: databaseService.getPool(),
            cacheService: cacheService,
            wsService: websocketService,
            availabilityService: availabilityPatternService,
        };
        next();
    }
    catch (error) {
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
        }
        else {
            res.status(503).json({
                error: 'Service unavailable',
                message: 'Unable to initialize services',
                timestamp: new Date().toISOString(),
                path: req.path
            });
        }
    }
};
exports.serviceInjectionMiddleware = serviceInjectionMiddleware;
/**
 * Health check middleware to verify services are available
 */
const serviceHealthCheckMiddleware = async (req, res, next) => {
    try {
        const databaseService = service_registration_1.Services.database();
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
    }
    catch (error) {
        console.error('Service health check failed:', error);
        res.status(503).json({
            error: 'Service health check failed',
            message: 'Unable to verify service health',
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
};
exports.serviceHealthCheckMiddleware = serviceHealthCheckMiddleware;
/**
 * Transaction middleware for database operations
 */
const transactionMiddleware = async (req, res, next) => {
    const services = req.services;
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
exports.transactionMiddleware = transactionMiddleware;
/**
 * Service performance monitoring middleware
 */
const serviceMonitoringMiddleware = (req, res, next) => {
    const startTime = Date.now();
    // Override res.end to measure response time
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
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
exports.serviceMonitoringMiddleware = serviceMonitoringMiddleware;
