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
const exportController_1 = require("../controllers/exportController");
const models_1 = require("../models");
exports.SERVICE_NAMES = {
    DATABASE: 'DatabaseService',
    DEPARTMENT: 'DepartmentService',
    EMPLOYEE: 'EmployeeService',
    SKILL: 'SkillService',
    ALLOCATION: 'AllocationService',
    DEPENDENCY: 'DependencyService',
    SCHEDULE_MANAGEMENT: 'ScheduleManagementService',
};
function configureServices() {
    service_container_1.registerService.instance(exports.SERVICE_NAMES.DATABASE, database_service_1.DatabaseService.getInstance());
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.DEPARTMENT, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        return new department_service_1.DepartmentService(db);
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.EMPLOYEE, () => {
        const db = service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE);
        return new employee_service_1.EmployeeService(db);
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SKILL, () => {
        return new skill_service_1.SkillService();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.ALLOCATION, () => {
        return new allocation_service_wrapper_1.AllocationServiceWrapper();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.DEPENDENCY, () => {
        return new dependency_service_1.DependencyService();
    });
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SCHEDULE_MANAGEMENT, () => {
        return new schedule_management_service_1.ScheduleManagementService();
    });
}
exports.Services = {
    database: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE),
    department: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DEPARTMENT),
    employee: () => service_container_1.container.resolve(exports.SERVICE_NAMES.EMPLOYEE),
    skill: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SKILL),
    allocation: () => service_container_1.container.resolve(exports.SERVICE_NAMES.ALLOCATION),
    dependency: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DEPENDENCY),
    scheduleManagement: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SCHEDULE_MANAGEMENT),
};
async function initializeServices() {
    try {
        configureServices();
        const databaseService = exports.Services.database();
        if (!databaseService) {
            throw new Error('DatabaseService not registered properly');
        }
        await databaseService.connect();
        const pool = databaseService.getPool();
        if (!pool) {
            throw new Error('Database pool is not available after connection');
        }
        (0, models_1.initializeModels)(pool);
        skill_service_1.SkillService.initialize(pool);
        console.log('🔧 Initializing ExportController with pool from service registration:', !!pool);
        exportController_1.ExportController.initialize(pool);
        console.log('✅ ExportController initialization called');
        await validateServiceInitialization();
        console.log('✅ All services initialized and configured');
    }
    catch (error) {
        console.error('❌ Service initialization failed:', error);
        throw new Error(`Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
async function shutdownServices() {
    try {
        try {
            const { NotificationService } = await Promise.resolve().then(() => __importStar(require('../services/notification.service')));
            NotificationService.resetInstance();
        }
        catch (error) {
        }
        await database_service_1.DatabaseService.disconnect();
        service_container_1.container.clear();
        console.log('✅ All services shut down gracefully');
    }
    catch (error) {
        console.error('❌ Error during service shutdown:', error);
        throw error;
    }
}
async function checkServiceHealth() {
    try {
        const databaseService = exports.Services.database();
        const databaseHealthy = await databaseService.checkHealth();
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
function getContainerStatus() {
    return {
        registeredServices: service_container_1.container.getServiceNames(),
        totalServices: service_container_1.container.getServiceNames().length,
        requiredServices: Object.values(exports.SERVICE_NAMES),
        allServicesRegistered: Object.values(exports.SERVICE_NAMES).every(name => service_container_1.container.hasService(name))
    };
}
//# sourceMappingURL=service-registration.js.map