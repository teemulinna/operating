"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DependencyService = void 0;
const api_error_1 = require("../utils/api-error");
const database_service_1 = require("../database/database.service");
class DependencyService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    async createDependency() {
        throw new api_error_1.ApiError(501, 'DependencyService needs PostgreSQL implementation');
    }
    async validateDependencies(projectId) {
        return {
            isValid: true,
            errors: [],
            warnings: ['DependencyService needs PostgreSQL implementation']
        };
    }
    async calculateCriticalPath(projectId) {
        throw new api_error_1.ApiError(501, 'DependencyService needs PostgreSQL implementation');
    }
    async updateSchedule() {
        throw new api_error_1.ApiError(501, 'DependencyService needs PostgreSQL implementation');
    }
    async detectScheduleConflicts(projectId) {
        return [];
    }
    async getDependencyGraph(projectId) {
        return {
            nodes: [],
            edges: []
        };
    }
}
exports.DependencyService = DependencyService;
