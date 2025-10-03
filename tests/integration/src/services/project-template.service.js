"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTemplateService = void 0;
const database_service_1 = require("../database/database.service");
const api_error_1 = require("../utils/api-error");
class ProjectTemplateService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
    }
    async createTemplate(options, createdById) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    // Additional methods to match controller expectations
    async createTemplateFromProject(projectId, templateName, createdById) {
        return this.createFromProject(projectId, templateName, createdById);
    }
    async cloneProject(projectId, newName, createdById) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async searchTemplates(filters, page, limit) {
        return { templates: [], total: 0 };
    }
    async getPopularTemplates(limit) {
        return [];
    }
    async getTemplateCategories() {
        return [];
    }
    async rateTemplate(templateId, rating, userId) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async exportTemplate(templateId) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async importTemplate(templateData, createdById) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async createFromProject(projectId, templateName, createdById) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async applyTemplate(options, createdById) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async getTemplates(categoryFilter) {
        return [];
    }
    async getTemplateById(templateId) {
        throw new api_error_1.ApiError(404, 'Template not found');
    }
    async updateTemplate(templateId, updates) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    async deleteTemplate(templateId) {
        throw new api_error_1.ApiError(501, 'ProjectTemplateService needs PostgreSQL implementation');
    }
    assessComplexity(taskCount, duration) {
        if (taskCount < 5 && duration < 30)
            return 'low';
        if (taskCount < 15 && duration < 90)
            return 'medium';
        return 'high';
    }
}
exports.ProjectTemplateService = ProjectTemplateService;
