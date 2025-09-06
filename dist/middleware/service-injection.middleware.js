"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceMonitoringMiddleware = exports.transactionMiddleware = exports.serviceHealthCheckMiddleware = exports.serviceInjectionMiddleware = void 0;
const service_registration_1 = require("../container/service-registration");
const serviceInjectionMiddleware = (req, res, next) => {
    try {
        req.services = {
            database: service_registration_1.Services.database(),
            department: service_registration_1.Services.department(),
            employee: service_registration_1.Services.employee(),
            skill: service_registration_1.Services.skill(),
            allocation: service_registration_1.Services.allocation(),
        };
        next();
    }
    catch (error) {
        console.error('Service injection failed:', error);
        res.status(503).json({
            error: 'Service unavailable',
            message: 'Unable to initialize services',
            timestamp: new Date().toISOString(),
            path: req.path
        });
    }
};
exports.serviceInjectionMiddleware = serviceInjectionMiddleware;
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
    next();
};
exports.transactionMiddleware = transactionMiddleware;
const serviceMonitoringMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
        const duration = Date.now() - startTime;
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
        if (process.env.NODE_ENV === 'development') {
            console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        }
        originalEnd.call(this, chunk, encoding);
        return this;
    };
    next();
};
exports.serviceMonitoringMiddleware = serviceMonitoringMiddleware;
//# sourceMappingURL=service-injection.middleware.js.map