"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = exports.SERVICE_NAMES = void 0;
exports.configureServices = configureServices;
exports.initializeServices = initializeServices;
exports.shutdownServices = shutdownServices;
exports.checkServiceHealth = checkServiceHealth;
exports.getContainerStatus = getContainerStatus;
const service_container_1 = require("./service-container");
const database_service_1 = require("../database/database.service");
const department_service_1 = require("../services/department.service");
const employee_service_1 = require("../services/employee.service");
const skill_service_1 = require("../services/skill.service");
const allocation_service_1 = require("../services/allocation.service");
const models_1 = require("../models");
exports.SERVICE_NAMES = {
    DATABASE: 'DatabaseService',
    DEPARTMENT: 'DepartmentService',
    EMPLOYEE: 'EmployeeService',
    SKILL: 'SkillService',
    ALLOCATION: 'AllocationService',
};
function configureServices() {
    service_container_1.registerService.instance(exports.SERVICE_NAMES.DATABASE, database_service_1.DatabaseService.getInstance());
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.DEPARTMENT, () => new department_service_1.DepartmentService());
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.EMPLOYEE, () => new employee_service_1.EmployeeService());
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.SKILL, () => new skill_service_1.SkillService());
    service_container_1.registerService.singleton(exports.SERVICE_NAMES.ALLOCATION, () => new allocation_service_1.AllocationService());
}
exports.Services = {
    database: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DATABASE),
    department: () => service_container_1.container.resolve(exports.SERVICE_NAMES.DEPARTMENT),
    employee: () => service_container_1.container.resolve(exports.SERVICE_NAMES.EMPLOYEE),
    skill: () => service_container_1.container.resolve(exports.SERVICE_NAMES.SKILL),
    allocation: () => service_container_1.container.resolve(exports.SERVICE_NAMES.ALLOCATION),
};
async function initializeServices() {
    configureServices();
    const databaseService = exports.Services.database();
    await databaseService.connect();
    const pool = databaseService.getPool();
    if (!pool) {
        throw new Error('Database pool is not available');
    }
    (0, models_1.initializeModels)(pool);
    console.log('✅ All services initialized and configured');
}
async function shutdownServices() {
    try {
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
function getContainerStatus() {
    return {
        registeredServices: service_container_1.container.getServiceNames(),
        totalServices: service_container_1.container.getServiceNames().length,
        requiredServices: Object.values(exports.SERVICE_NAMES),
        allServicesRegistered: Object.values(exports.SERVICE_NAMES).every(name => service_container_1.container.hasService(name))
    };
}
//# sourceMappingURL=service-registration.js.map