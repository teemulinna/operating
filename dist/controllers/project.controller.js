"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
const resource_assignment_service_1 = require("../services/resource-assignment.service");
const api_error_1 = require("../utils/api-error");
class ProjectController {
    constructor() {
        this.createProject = async (req, res, next) => {
            try {
                const projectData = {
                    name: req.body.name,
                    description: req.body.description,
                    client_name: req.body.clientName,
                    start_date: req.body.startDate,
                    end_date: req.body.endDate,
                    status: req.body.status || 'planning',
                    priority: req.body.priority || 'medium',
                    budget: req.body.budget,
                    estimated_hours: req.body.estimatedHours
                };
                const project = await this.projectService.createProject(projectData);
                console.log(`Project created: ${project.name} (ID: ${project.id})`);
                res.status(201).json({
                    success: true,
                    data: project,
                    message: 'Project created successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProjects = async (req, res, next) => {
            try {
                const filters = {
                    status: req.query.status,
                    priority: req.query.priority,
                    clientName: req.query.clientName,
                    search: req.query.search,
                    startDate: req.query.startDate,
                    endDate: req.query.endDate
                };
                const pagination = {
                    page: parseInt(req.query.page) || 1,
                    limit: parseInt(req.query.limit) || 20,
                    sortBy: req.query.sortBy || 'created_at',
                    sortOrder: req.query.sortOrder || 'desc'
                };
                const result = await this.projectService.getProjects(filters, pagination);
                res.json({
                    success: true,
                    data: result.projects,
                    pagination: result.pagination,
                    total: result.total
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProjectById = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const project = await this.projectService.getProjectById(projectId);
                if (!project) {
                    throw new api_error_1.ApiError(404, 'Project not found');
                }
                const roles = await this.projectService.getProjectRoles(projectId);
                const assignments = await this.assignmentService.getProjectAssignments(projectId);
                res.json({
                    success: true,
                    data: {
                        ...project,
                        roles,
                        assignments,
                        summary: {
                            totalRoles: roles.length,
                            filledRoles: roles.filter(r => r.current_assignments >= r.max_assignments).length,
                            assignedEmployees: assignments.length,
                            totalPlannedHours: assignments.reduce((sum, a) => sum + (a.planned_hours_per_week || 0), 0)
                        }
                    }
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.updateProject = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const updateData = {
                    name: req.body.name,
                    description: req.body.description,
                    client_name: req.body.clientName,
                    start_date: req.body.startDate,
                    end_date: req.body.endDate,
                    status: req.body.status,
                    priority: req.body.priority,
                    budget: req.body.budget,
                    estimated_hours: req.body.estimatedHours
                };
                const project = await this.projectService.updateProject(projectId, updateData);
                console.log(`Project updated: ${project.name} (ID: ${projectId})`);
                res.json({
                    success: true,
                    data: project,
                    message: 'Project updated successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteProject = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const activeAssignments = await this.assignmentService.getActiveAssignments(projectId);
                if (activeAssignments.length > 0) {
                    throw new api_error_1.ApiError(400, 'Cannot delete project with active resource assignments');
                }
                await this.projectService.deleteProject(projectId);
                console.log(`Project deleted: ID ${projectId}`);
                res.json({
                    success: true,
                    message: 'Project deleted successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.addProjectRole = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const roleData = {
                    project_id: projectId,
                    role_name: req.body.roleName,
                    description: req.body.description,
                    required_skills: req.body.requiredSkills || [],
                    minimum_experience_level: req.body.minimumExperienceLevel,
                    start_date: req.body.startDate,
                    end_date: req.body.endDate,
                    planned_allocation_percentage: req.body.plannedAllocationPercentage,
                    estimated_hours: req.body.estimatedHours,
                    hourly_rate: req.body.hourlyRate,
                    max_assignments: req.body.maxAssignments || 1
                };
                const role = await this.projectService.addProjectRole(roleData);
                res.status(201).json({
                    success: true,
                    data: role,
                    message: 'Project role created successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProjectRoles = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const roles = await this.projectService.getProjectRoles(projectId);
                res.json({
                    success: true,
                    data: roles
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.assignEmployeeToProject = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const assignmentData = {
                    project_id: projectId,
                    employee_id: req.body.employeeId,
                    project_role_id: req.body.projectRoleId,
                    assignment_type: req.body.assignmentType || 'employee',
                    start_date: req.body.startDate,
                    end_date: req.body.endDate,
                    planned_allocation_percentage: req.body.plannedAllocationPercentage,
                    hourly_rate: req.body.hourlyRate,
                    confidence_level: req.body.confidenceLevel || 'confirmed',
                    notes: req.body.notes
                };
                const assignment = await this.assignmentService.createAssignment(assignmentData);
                res.status(201).json({
                    success: true,
                    data: assignment,
                    message: 'Employee assigned to project successfully'
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.getProjectAssignments = async (req, res, next) => {
            try {
                const projectId = parseInt(req.params.id);
                if (isNaN(projectId)) {
                    throw new api_error_1.ApiError(400, 'Invalid project ID');
                }
                const assignments = await this.assignmentService.getProjectAssignments(projectId);
                res.json({
                    success: true,
                    data: assignments
                });
            }
            catch (error) {
                next(error);
            }
        };
        this.projectService = new project_service_1.ProjectService();
        this.assignmentService = new resource_assignment_service_1.ResourceAssignmentService();
    }
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=project.controller.js.map