"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceMonitoringMiddleware = exports.transactionMiddleware = exports.serviceHealthCheckMiddleware = exports.serviceInjectionMiddleware = void 0;
const service_registration_1 = require("../container/service-registration");
const serviceInjectionMiddleware = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === 'test') {
            const { initializeAppServices } = await Promise.resolve().then(() => __importStar(require('../app')));
            await initializeAppServices();
        }
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