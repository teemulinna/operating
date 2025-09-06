"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const types_1 = require("../types");
const project_model_1 = require("../models/project.model");
class ProjectService {
    async createProject(input) {
        await this.validateProjectInput(input);
        const projectData = {
            ...input,
            status: input.status || types_1.ProjectStatus.PLANNING
        };
        return await project_model_1.ProjectModel.create(projectData);
    }
    async getProjectById(id) {
        if (!id || isNaN(Number(id))) {
            throw new Error('Invalid project ID');
        }
        return await project_model_1.ProjectModel.findById(id);
    }
    async updateProject(id, input) {
        if (!id || isNaN(Number(id))) {
            throw new Error('Invalid project ID');
        }
        const existingProject = await project_model_1.ProjectModel.findById(id);
        if (!existingProject) {
            throw new Error('Project not found');
        }
        await this.validateProjectUpdate(existingProject, input);
        return await project_model_1.ProjectModel.update(id, input);
    }
    async deleteProject(id) {
        if (!id || isNaN(Number(id))) {
            throw new Error('Invalid project ID');
        }
        const existingProject = await project_model_1.ProjectModel.findById(id);
        if (!existingProject) {
            throw new Error('Project not found');
        }
        return await project_model_1.ProjectModel.delete(id);
    }
    async getProjects(filters = {}, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'DESC') {
        if (page < 1)
            page = 1;
        if (limit < 1 || limit > 100)
            limit = 50;
        return await project_model_1.ProjectModel.findAll(filters, page, limit, sortBy, sortOrder);
    }
    async getProjectStatistics() {
        return await project_model_1.ProjectModel.getProjectStatistics();
    }
    async validateProjectInput(input) {
        const errors = [];
        if (!input.name?.trim()) {
            errors.push('Project name is required');
        }
        if (!input.startDate) {
            errors.push('Start date is required');
        }
        if (!input.endDate) {
            errors.push('End date is required');
        }
        if (input.startDate && input.endDate) {
            if (input.endDate <= input.startDate) {
                errors.push('End date must be after start date');
            }
        }
        if (input.budget !== undefined && input.budget < 0) {
            errors.push('Budget must be positive');
        }
        if (input.hourlyRate !== undefined && input.hourlyRate < 0) {
            errors.push('Hourly rate must be positive');
        }
        if (input.name && input.name.length > 255) {
            errors.push('Project name must be less than 255 characters');
        }
        if (input.clientName && input.clientName.length > 255) {
            errors.push('Client name must be less than 255 characters');
        }
        if (input.name) {
            const existingProject = await project_model_1.ProjectModel.findByName(input.name);
            if (existingProject) {
                errors.push(`Project with name '${input.name}' already exists`);
            }
        }
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }
    async validateProjectUpdate(existingProject, input) {
        const errors = [];
        const startDate = input.startDate || existingProject.startDate;
        const endDate = input.endDate || existingProject.endDate;
        if (endDate <= startDate) {
            errors.push('End date must be after start date');
        }
        if (input.budget !== undefined && input.budget < 0) {
            errors.push('Budget must be positive');
        }
        if (input.hourlyRate !== undefined && input.hourlyRate < 0) {
            errors.push('Hourly rate must be positive');
        }
        if (input.name && input.name.length > 255) {
            errors.push('Project name must be less than 255 characters');
        }
        if (input.clientName && input.clientName.length > 255) {
            errors.push('Client name must be less than 255 characters');
        }
        if (input.status) {
            this.validateStatusTransition(existingProject.status, input.status);
        }
        if (input.name && input.name !== existingProject.name) {
            const existingProjectWithName = await project_model_1.ProjectModel.findByName(input.name);
            if (existingProjectWithName) {
                errors.push(`Project with name '${input.name}' already exists`);
            }
        }
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }
    }
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [types_1.ProjectStatus.PLANNING]: [types_1.ProjectStatus.ACTIVE, types_1.ProjectStatus.ON_HOLD],
            [types_1.ProjectStatus.ACTIVE]: [types_1.ProjectStatus.ON_HOLD, types_1.ProjectStatus.COMPLETED],
            [types_1.ProjectStatus.ON_HOLD]: [types_1.ProjectStatus.ACTIVE, types_1.ProjectStatus.PLANNING],
            [types_1.ProjectStatus.COMPLETED]: [],
            [types_1.ProjectStatus.CANCELLED]: []
        };
        const allowedStatuses = validTransitions[currentStatus] || [];
        if (!allowedStatuses.includes(newStatus)) {
            if (currentStatus === types_1.ProjectStatus.COMPLETED) {
                throw new Error('Cannot change status from completed');
            }
            throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
    async calculateBudgetUtilization(projectId) {
        const project = await this.getProjectById(projectId);
        if (!project || !project.budget || !project.hourlyRate) {
            return 0;
        }
        const budgetedHours = project.budget / project.hourlyRate;
        const actualHours = project.actualHours || 0;
        return actualHours > 0 ? (actualHours / budgetedHours) * 100 : 0;
    }
    async getProjectsByStatus(status) {
        const result = await this.getProjects({ status });
        return result.data;
    }
    async getProjectsByClient(clientName) {
        const result = await this.getProjects({ clientName });
        return result.data;
    }
    async getActiveProjects() {
        const planningProjects = await this.getProjectsByStatus(types_1.ProjectStatus.PLANNING);
        const activeProjects = await this.getProjectsByStatus(types_1.ProjectStatus.ACTIVE);
        return [...planningProjects, ...activeProjects];
    }
    calculateProjectDuration(startDate, endDate) {
        const timeDiff = endDate.getTime() - startDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    isProjectOverdue(project) {
        if (project.status === types_1.ProjectStatus.COMPLETED) {
            return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(project.endDate);
        endDate.setHours(0, 0, 0, 0);
        return today > endDate;
    }
    async getOverdueProjects() {
        const activeProjects = await this.getActiveProjects();
        return activeProjects.filter(project => this.isProjectOverdue(project));
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map