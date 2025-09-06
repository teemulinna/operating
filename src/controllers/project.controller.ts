import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ProjectService } from '../services/project.service';
import { ResourceAssignmentService } from '../services/resource-assignment.service';
import { ApiError } from '../utils/api-error';
import { handleValidationErrors } from '../middleware/validate.middleware';
// import { logger } from '../utils/logger';

export class ProjectController {
  private projectService: ProjectService;
  private assignmentService: ResourceAssignmentService;

  constructor() {
    this.projectService = new ProjectService();
    this.assignmentService = new ResourceAssignmentService();
  }

  createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (error) {
      next(error);
    }
  };

  getProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        clientName: req.query.clientName as string,
        search: req.query.search as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: (req.query.sortOrder as string) || 'desc'
      };

      const result = await this.projectService.getProjects(filters, pagination);

      res.json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  };

  getProjectById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        throw new ApiError(404, 'Project not found');
      }

      // Get project roles and assignments
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
    } catch (error) {
      next(error);
    }
  };

  updateProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
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
    } catch (error) {
      next(error);
    }
  };

  deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      // Check if project has active assignments
      const activeAssignments = await this.assignmentService.getActiveAssignments(projectId);
      if (activeAssignments.length > 0) {
        throw new ApiError(400, 'Cannot delete project with active resource assignments');
      }

      await this.projectService.deleteProject(projectId);

      console.log(`Project deleted: ID ${projectId}`);

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Project Roles Management
  addProjectRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
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
    } catch (error) {
      next(error);
    }
  };

  getProjectRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      const roles = await this.projectService.getProjectRoles(projectId);

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  };

  // Resource Assignments
  assignEmployeeToProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {

      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
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
    } catch (error) {
      next(error);
    }
  };

  getProjectAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        throw new ApiError(400, 'Invalid project ID');
      }

      const assignments = await this.assignmentService.getProjectAssignments(projectId);

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      next(error);
    }
  };
}