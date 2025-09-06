import { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput, 
  ProjectFilters,
  PaginatedResponse,
  ProjectStatus,
  ProjectStatistics,
  DatabaseError 
} from '../types';
import { ProjectModel } from '../models/project.model';

export class ProjectService {
  
  /**
   * Create a new project with validation
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    // Validate business rules
    await this.validateProjectInput(input);

    // Set default values
    const projectData: CreateProjectInput = {
      ...input,
      status: input.status || ProjectStatus.PLANNING
    };

    return await ProjectModel.create(projectData);
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid project ID');
    }
    
    return await ProjectModel.findById(id);
  }

  /**
   * Update project with validation and business rules
   */
  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid project ID');
    }

    // Get existing project for validation
    const existingProject = await ProjectModel.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Validate business rules for updates
    await this.validateProjectUpdate(existingProject, input);

    return await ProjectModel.update(id, input);
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(id: string): Promise<Project> {
    if (!id || isNaN(Number(id))) {
      throw new Error('Invalid project ID');
    }

    const existingProject = await ProjectModel.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    return await ProjectModel.delete(id);
  }

  /**
   * Get projects with filtering, pagination, and sorting
   */
  async getProjects(
    filters: ProjectFilters = {}, 
    page: number = 1, 
    limit: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<PaginatedResponse<Project>> {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    return await ProjectModel.findAll(filters, page, limit, sortBy, sortOrder);
  }

  /**
   * Get project statistics for dashboard
   */
  async getProjectStatistics(): Promise<ProjectStatistics> {
    return await ProjectModel.getProjectStatistics();
  }

  /**
   * Validate project input data
   */
  private async validateProjectInput(input: CreateProjectInput): Promise<void> {
    const errors: string[] = [];

    // Required fields validation
    if (!input.name?.trim()) {
      errors.push('Project name is required');
    }

    if (!input.startDate) {
      errors.push('Start date is required');
    }

    if (!input.endDate) {
      errors.push('End date is required');
    }

    // Date validation
    if (input.startDate && input.endDate) {
      if (input.endDate <= input.startDate) {
        errors.push('End date must be after start date');
      }
    }

    // Budget validation
    if (input.budget !== undefined && input.budget < 0) {
      errors.push('Budget must be positive');
    }

    // Hourly rate validation
    if (input.hourlyRate !== undefined && input.hourlyRate < 0) {
      errors.push('Hourly rate must be positive');
    }

    // Name length validation
    if (input.name && input.name.length > 255) {
      errors.push('Project name must be less than 255 characters');
    }

    // Client name validation
    if (input.clientName && input.clientName.length > 255) {
      errors.push('Client name must be less than 255 characters');
    }

    // Check for duplicate project name
    if (input.name) {
      const existingProject = await ProjectModel.findByName(input.name);
      if (existingProject) {
        errors.push(`Project with name '${input.name}' already exists`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Validate project update data and business rules
   */
  private async validateProjectUpdate(
    existingProject: Project, 
    input: UpdateProjectInput
  ): Promise<void> {
    const errors: string[] = [];

    // Date validation
    const startDate = input.startDate || existingProject.startDate;
    const endDate = input.endDate || existingProject.endDate;

    if (endDate <= startDate) {
      errors.push('End date must be after start date');
    }

    // Budget validation
    if (input.budget !== undefined && input.budget < 0) {
      errors.push('Budget must be positive');
    }

    // Hourly rate validation
    if (input.hourlyRate !== undefined && input.hourlyRate < 0) {
      errors.push('Hourly rate must be positive');
    }

    // Name length validation
    if (input.name && input.name.length > 255) {
      errors.push('Project name must be less than 255 characters');
    }

    // Client name validation
    if (input.clientName && input.clientName.length > 255) {
      errors.push('Client name must be less than 255 characters');
    }

    // Status transition validation
    if (input.status) {
      this.validateStatusTransition(existingProject.status, input.status);
    }

    // Check for duplicate project name (if changing name)
    if (input.name && input.name !== existingProject.name) {
      const existingProjectWithName = await ProjectModel.findByName(input.name);
      if (existingProjectWithName) {
        errors.push(`Project with name '${input.name}' already exists`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Validate status transitions according to business rules
   */
  private validateStatusTransition(currentStatus: ProjectStatus, newStatus: ProjectStatus): void {
    const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
      [ProjectStatus.PLANNING]: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD],
      [ProjectStatus.ACTIVE]: [ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED],
      [ProjectStatus.ON_HOLD]: [ProjectStatus.ACTIVE, ProjectStatus.PLANNING],
      [ProjectStatus.COMPLETED]: [], // No transitions allowed from completed
      [ProjectStatus.CANCELLED]: [] // No transitions allowed from cancelled
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    
    if (!allowedStatuses.includes(newStatus)) {
      if (currentStatus === ProjectStatus.COMPLETED) {
        throw new Error('Cannot change status from completed');
      }
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Calculate budget utilization percentage
   */
  async calculateBudgetUtilization(projectId: string): Promise<number> {
    const project = await this.getProjectById(projectId);
    if (!project || !project.budget || !project.hourlyRate) {
      return 0;
    }

    // In a full implementation, this would calculate based on actual time logged
    // For now, we'll return a placeholder calculation
    const budgetedHours = project.budget / project.hourlyRate;
    const actualHours = project.actualHours || 0;
    
    return actualHours > 0 ? (actualHours / budgetedHours) * 100 : 0;
  }

  /**
   * Get projects by status
   */
  async getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
    const result = await this.getProjects({ status });
    return result.data;
  }

  /**
   * Get projects for a specific client
   */
  async getProjectsByClient(clientName: string): Promise<Project[]> {
    const result = await this.getProjects({ clientName });
    return result.data;
  }

  /**
   * Get active projects (planning + active)
   */
  async getActiveProjects(): Promise<Project[]> {
    const planningProjects = await this.getProjectsByStatus(ProjectStatus.PLANNING);
    const activeProjects = await this.getProjectsByStatus(ProjectStatus.ACTIVE);
    
    return [...planningProjects, ...activeProjects];
  }

  /**
   * Calculate project duration in days
   */
  calculateProjectDuration(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if project is overdue
   */
  isProjectOverdue(project: Project): boolean {
    if (project.status === ProjectStatus.COMPLETED) {
      return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(project.endDate);
    endDate.setHours(0, 0, 0, 0);
    
    return today > endDate;
  }

  /**
   * Get overdue projects
   */
  async getOverdueProjects(): Promise<Project[]> {
    const activeProjects = await this.getActiveProjects();
    return activeProjects.filter(project => this.isProjectOverdue(project));
  }
}