import { DefaultTask, DefaultMilestone, RequiredSkill, TemplateMetadata } from '../models/ProjectTemplate';
import { ProjectService } from './project.service';
import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';

export interface ProjectTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  defaultTasks: DefaultTask[];
  defaultMilestones: DefaultMilestone[];
  defaultBudget?: number;
  defaultDuration?: number;
  requiredSkills: RequiredSkill[];
  defaultTeamSize: number;
  metadata?: TemplateMetadata;
  isActive: boolean;
  isBuiltIn: boolean;
  isPublic: boolean;
  version: number;
  createdById?: string;
  usageCount: number;
  averageRating: number;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateFromProjectOptions {
  name: string;
  description: string;
  category: string;
  isPublic?: boolean;
  excludePersonalData?: boolean;
}

export interface ApplyTemplateOptions {
  templateId: string;
  projectName: string;
  startDate: Date;
  clientId?: string;
  customBudget?: number;
  customDuration?: number;
  teamAssignments?: { [taskId: string]: string[] }; // taskId -> employeeIds
  customizations?: {
    includeTasks?: string[];
    excludeTasks?: string[];
    includeMilestones?: string[];
    excludeMilestones?: string[];
    modifyTasks?: { [taskId: string]: Partial<DefaultTask> };
    modifyMilestones?: { [milestoneId: string]: Partial<DefaultMilestone> };
  };
}

export interface TemplateSearchFilters {
  category?: string;
  industry?: string;
  complexity?: string;
  methodology?: string;
  tags?: string[];
  minRating?: number;
  isPublic?: boolean;
  createdById?: string;
}

export class TemplateService {
  private static db = DatabaseService.getInstance();
  private projectService: ProjectService;

  constructor(
    private databaseService: DatabaseService
  ) {
    this.projectService = new ProjectService(this.databaseService);
  }

  /**
   * Create a new template
   */
  async createTemplate(templateData: Partial<ProjectTemplate>, createdById?: string): Promise<ProjectTemplate> {
    // Validate template
    const errors = this.validateTemplate(templateData);
    if (errors.length > 0) {
      throw new ApiError(400, `Template validation failed: ${errors.join(', ')}`);
    }

    const query = `
      INSERT INTO project_templates (
        name, description, category, default_tasks, default_milestones,
        default_budget, default_duration, required_skills, default_team_size,
        metadata, is_active, is_built_in, is_public, version, created_by_id,
        usage_count, average_rating, custom_fields
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      templateData.name,
      templateData.description,
      templateData.category,
      JSON.stringify(templateData.defaultTasks || []),
      JSON.stringify(templateData.defaultMilestones || []),
      templateData.defaultBudget,
      templateData.defaultDuration,
      JSON.stringify(templateData.requiredSkills || []),
      templateData.defaultTeamSize || 1,
      JSON.stringify(templateData.metadata),
      templateData.isActive !== false,
      templateData.isBuiltIn || false,
      templateData.isPublic || false,
      templateData.version || 1,
      createdById,
      templateData.usageCount || 0,
      templateData.averageRating || 0,
      JSON.stringify(templateData.customFields)
    ];

    const result = await TemplateService.db.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  /**
   * Create template from existing project
   */
  async createTemplateFromProject(
    projectId: string, 
    options: CreateTemplateFromProjectOptions,
    createdById?: string
  ): Promise<ProjectTemplate> {
    const project = await this.projectService.getProjectById(parseInt(projectId));
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    // Convert project data to template format
    const defaultTasks: DefaultTask[] = project.tasks?.map((task: any) => ({
      id: task.id || '',
      name: task.name || '',
      description: task.description || '',
      duration: Math.ceil((new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      dependencies: task.dependencies || [],
      requiredSkills: task.requiredSkills || [],
      estimatedHours: task.estimatedHours || 8,
      priority: task.priority as any || 'medium'
    })) || [];

    const defaultMilestones: DefaultMilestone[] = project.milestones?.map((milestone: any) => ({
      id: milestone.id || '',
      name: milestone.name || '',
      description: milestone.description || '',
      daysFromStart: Math.ceil((new Date(milestone.targetDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      criteria: milestone.criteria || [],
      deliverables: milestone.deliverables || []
    })) || [];

    const requiredSkills: RequiredSkill[] = project.skillRequirements?.map((skill: any) => ({
      skillId: skill.skillId || '',
      skillName: skill.skillName || '',
      level: skill.level as any || 'mid',
      quantity: skill.quantity || 1
    })) || [];

    const templateData: Partial<ProjectTemplate> = {
      name: options.name,
      description: options.description,
      category: options.category,
      defaultTasks: defaultTasks,
      defaultMilestones: defaultMilestones,
      defaultBudget: project.budget,
      defaultDuration: Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)),
      requiredSkills: requiredSkills,
      defaultTeamSize: project.teamSize || 1,
      isPublic: options.isPublic || false,
      metadata: {
        industry: project.industry || 'General',
        complexity: this.assessComplexity(defaultTasks.length, Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))),
        methodology: project.methodology as any || 'agile',
        tags: project.tags || [],
        estimatedSuccessRate: 85, // Default estimate
        averageCompletionTime: Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))
      }
    };

    return await this.createTemplate(templateData, createdById);
  }

  /**
   * Apply template to create new project
   */
  async applyTemplate(options: ApplyTemplateOptions, createdById?: string): Promise<any> {
    const template = await this.getTemplateById(options.templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    // Increment usage count
    const updateQuery = `
      UPDATE project_templates 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE template_id = $1
    `;
    await TemplateService.db.query(updateQuery, [options.templateId]);

    // Prepare tasks with customizations
    let tasks = [...template.defaultTasks];
    if (options.customizations) {
      if (options.customizations.includeTasks) {
        tasks = tasks.filter(task => options.customizations!.includeTasks!.includes(task.id));
      }
      if (options.customizations.excludeTasks) {
        tasks = tasks.filter(task => !options.customizations!.excludeTasks!.includes(task.id));
      }
      if (options.customizations.modifyTasks) {
        tasks = tasks.map(task => ({
          ...task,
          ...options.customizations!.modifyTasks![task.id]
        }));
      }
    }

    // Prepare milestones with customizations
    let milestones = [...template.defaultMilestones];
    if (options.customizations) {
      if (options.customizations.includeMilestones) {
        milestones = milestones.filter(milestone => options.customizations!.includeMilestones!.includes(milestone.id));
      }
      if (options.customizations.excludeMilestones) {
        milestones = milestones.filter(milestone => !options.customizations!.excludeMilestones!.includes(milestone.id));
      }
      if (options.customizations.modifyMilestones) {
        milestones = milestones.map(milestone => ({
          ...milestone,
          ...options.customizations!.modifyMilestones![milestone.id]
        }));
      }
    }

    // Calculate project end date
    const duration = options.customDuration || template.defaultDuration || 30;
    const endDate = new Date(options.startDate);
    endDate.setDate(endDate.getDate() + duration);

    // Create project data
    const projectData = {
      name: options.projectName,
      description: `Project created from template: ${template.name}`,
      start_date: options.startDate.toISOString(),
      end_date: endDate.toISOString(),
      startDate: options.startDate,
      endDate: endDate,
      budget: options.customBudget || template.defaultBudget,
      status: 'planning' as const,
      priority: 'medium' as const,
      clientId: options.clientId,
      teamSize: template.defaultTeamSize,
      industry: template.metadata?.industry,
      methodology: template.metadata?.methodology,
      tags: template.metadata?.tags || [],
      tasks: tasks.map(task => {
        const taskStartDate = new Date(options.startDate);
        taskStartDate.setDate(taskStartDate.getDate() + Math.max(...task.dependencies.map(dep => 
          tasks.find(t => t.id === dep)?.duration || 0
        ), 0));
        
        const taskEndDate = new Date(taskStartDate);
        taskEndDate.setDate(taskEndDate.getDate() + task.duration);

        return {
          name: task.name,
          description: task.description,
          startDate: taskStartDate,
          endDate: taskEndDate,
          status: 'not_started' as const,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          dependencies: task.dependencies,
          requiredSkills: task.requiredSkills
        };
      }),
      milestones: milestones.map(milestone => {
        const milestoneDate = new Date(options.startDate);
        milestoneDate.setDate(milestoneDate.getDate() + milestone.daysFromStart);

        return {
          name: milestone.name,
          description: milestone.description,
          targetDate: milestoneDate,
          status: 'pending' as const,
          criteria: milestone.criteria,
          deliverables: milestone.deliverables
        };
      }),
      skillRequirements: template.requiredSkills.map(skill => ({
        skillId: skill.skillId,
        skillName: skill.skillName,
        level: skill.level,
        quantity: skill.quantity
      }))
    };

    return await this.projectService.createProject(projectData);
  }

  /**
   * Clone existing project
   */
  async cloneProject(projectId: string, newName: string, createdById?: string): Promise<any> {
    const originalProject = await this.projectService.getProjectById(parseInt(projectId));
    if (!originalProject) {
      throw new ApiError(404, 'Project not found');
    }

    const clonedData = {
      ...originalProject,
      name: newName,
      status: 'planning' as const,
      // Reset dates to start from today
      startDate: new Date(),
      endDate: new Date(Date.now() + (new Date(originalProject.endDate).getTime() - new Date(originalProject.startDate).getTime())),
      // Reset progress fields
      completionPercentage: 0,
      actualStartDate: undefined,
      actualEndDate: undefined,
      // Generate new IDs for tasks and milestones
      tasks: originalProject.tasks?.map((task: any) => ({
        ...task,
        id: undefined, // Will get new ID
        status: 'not_started' as const,
        completionPercentage: 0,
        actualStartDate: undefined,
        actualEndDate: undefined
      })),
      milestones: originalProject.milestones?.map((milestone: any) => ({
        ...milestone,
        id: undefined, // Will get new ID
        status: 'pending' as const,
        completionDate: undefined
      }))
    };

    const { id, ...clonedDataClean } = clonedData; // Remove ID to create new project
    return await this.projectService.createProject(clonedDataClean as any);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ProjectTemplate | null> {
    const query = `
      SELECT pt.*, CONCAT(e.first_name, ' ', e.last_name) as creator_name
      FROM project_templates pt
      LEFT JOIN employees e ON pt.created_by_id = e.id
      WHERE pt.template_id = $1
    `;
    
    const result = await TemplateService.db.query(query, [templateId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Search templates with filters
   */
  async searchTemplates(filters: TemplateSearchFilters, limit = 20, offset = 0): Promise<{ templates: ProjectTemplate[], total: number }> {
    let whereClause = 'WHERE pt.is_active = true';
    const values: any[] = [];
    let paramCount = 0;

    if (filters.category) {
      values.push(filters.category);
      whereClause += ` AND pt.category = $${++paramCount}`;
    }

    if (filters.isPublic !== undefined) {
      values.push(filters.isPublic);
      whereClause += ` AND pt.is_public = $${++paramCount}`;
    }

    if (filters.createdById) {
      values.push(filters.createdById);
      whereClause += ` AND pt.created_by_id = $${++paramCount}`;
    }

    if (filters.minRating) {
      values.push(filters.minRating);
      whereClause += ` AND pt.average_rating >= $${++paramCount}`;
    }

    if (filters.industry) {
      values.push(`%"industry":"${filters.industry}"%`);
      whereClause += ` AND pt.metadata::text LIKE $${++paramCount}`;
    }

    if (filters.complexity) {
      values.push(`%"complexity":"${filters.complexity}"%`);
      whereClause += ` AND pt.metadata::text LIKE $${++paramCount}`;
    }

    if (filters.methodology) {
      values.push(`%"methodology":"${filters.methodology}"%`);
      whereClause += ` AND pt.metadata::text LIKE $${++paramCount}`;
    }

    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach((tag) => {
        values.push(`%"${tag}"%`);
        whereClause += ` AND pt.metadata::text LIKE $${++paramCount}`;
      });
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM project_templates pt
      ${whereClause}
    `;

    const dataQuery = `
      SELECT pt.*, CONCAT(e.first_name, ' ', e.last_name) as creator_name
      FROM project_templates pt
      LEFT JOIN employees e ON pt.created_by_id = e.id
      ${whereClause}
      ORDER BY pt.usage_count DESC, pt.average_rating DESC, pt.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    values.push(limit, offset);

    const [countResult, dataResult] = await Promise.all([
      TemplateService.db.query(countQuery, values.slice(0, -2)),
      TemplateService.db.query(dataQuery, values)
    ]);

    const templates = dataResult.rows.map(row => this.mapRow(row));
    const total = parseInt(countResult.rows[0].total);

    return { templates, total };
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit = 10): Promise<ProjectTemplate[]> {
    const query = `
      SELECT pt.*, CONCAT(e.first_name, ' ', e.last_name) as creator_name
      FROM project_templates pt
      LEFT JOIN employees e ON pt.created_by_id = e.id
      WHERE pt.is_active = true AND pt.is_public = true
      ORDER BY pt.usage_count DESC, pt.average_rating DESC
      LIMIT $1
    `;
    
    const result = await TemplateService.db.query(query, [limit]);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(): Promise<{ category: string, count: number }[]> {
    const query = `
      SELECT category, COUNT(*) as count
      FROM project_templates
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `;
    
    const result = await TemplateService.db.query(query);
    return result.rows.map(row => ({
      category: row.category,
      count: parseInt(row.count)
    }));
  }

  /**
   * Update template
   */
  async updateTemplate(templateId: string, updates: Partial<ProjectTemplate>): Promise<ProjectTemplate> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    const updatedTemplate = { ...template, ...updates };
    updatedTemplate.version += 1;

    const errors = this.validateTemplate(updatedTemplate);
    if (errors.length > 0) {
      throw new ApiError(400, `Template validation failed: ${errors.join(', ')}`);
    }

    const query = `
      UPDATE project_templates 
      SET name = $2, description = $3, category = $4, default_tasks = $5,
          default_milestones = $6, default_budget = $7, default_duration = $8,
          required_skills = $9, default_team_size = $10, metadata = $11,
          is_active = $12, is_public = $13, version = $14, custom_fields = $15,
          updated_at = CURRENT_TIMESTAMP
      WHERE template_id = $1
      RETURNING *
    `;

    const values = [
      templateId,
      updatedTemplate.name,
      updatedTemplate.description,
      updatedTemplate.category,
      JSON.stringify(updatedTemplate.defaultTasks),
      JSON.stringify(updatedTemplate.defaultMilestones),
      updatedTemplate.defaultBudget,
      updatedTemplate.defaultDuration,
      JSON.stringify(updatedTemplate.requiredSkills),
      updatedTemplate.defaultTeamSize,
      JSON.stringify(updatedTemplate.metadata),
      updatedTemplate.isActive,
      updatedTemplate.isPublic,
      updatedTemplate.version,
      JSON.stringify(updatedTemplate.customFields)
    ];

    const result = await TemplateService.db.query(query, values);
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Template not found');
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    if (template.isBuiltIn) {
      throw new ApiError(400, 'Cannot delete built-in templates');
    }

    // Soft delete
    const query = `
      UPDATE project_templates 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE template_id = $1
    `;
    
    await TemplateService.db.query(query, [templateId]);
  }

  /**
   * Rate template
   */
  async rateTemplate(templateId: string, rating: number): Promise<ProjectTemplate> {
    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
    }

    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    const query = `
      UPDATE project_templates 
      SET usage_count = usage_count + 1,
          average_rating = (average_rating * usage_count + $2) / (usage_count + 1),
          updated_at = CURRENT_TIMESTAMP
      WHERE template_id = $1
      RETURNING *
    `;

    const result = await TemplateService.db.query(query, [templateId, rating]);
    if (result.rows.length === 0) {
      throw new ApiError(404, 'Template not found');
    }
    
    return this.mapRow(result.rows[0]);
  }

  /**
   * Export template
   */
  async exportTemplate(templateId: string): Promise<any> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      template: {
        name: template.name,
        description: template.description,
        category: template.category,
        defaultTasks: template.defaultTasks,
        defaultMilestones: template.defaultMilestones,
        defaultBudget: template.defaultBudget,
        defaultDuration: template.defaultDuration,
        requiredSkills: template.requiredSkills,
        defaultTeamSize: template.defaultTeamSize,
        metadata: template.metadata,
        customFields: template.customFields
      }
    };
  }

  /**
   * Import template
   */
  async importTemplate(templateData: any, createdById?: string): Promise<ProjectTemplate> {
    if (!templateData.template) {
      throw new ApiError(400, 'Invalid template format');
    }

    const template: Partial<ProjectTemplate> = {
      ...templateData.template,
      createdById: createdById,
      isBuiltIn: false,
      isPublic: false,
      usageCount: 0,
      averageRating: 0,
      version: 1
    };

    return await this.createTemplate(template, createdById);
  }

  /**
   * Assess project complexity based on tasks and duration
   */
  private assessComplexity(taskCount: number, duration: number): 'simple' | 'moderate' | 'complex' | 'enterprise' {
    if (taskCount <= 5 && duration <= 30) return 'simple';
    if (taskCount <= 15 && duration <= 90) return 'moderate';
    if (taskCount <= 30 && duration <= 180) return 'complex';
    return 'enterprise';
  }

  private validateTemplate(template: Partial<ProjectTemplate>): string[] {
    const errors: string[] = [];

    if (!template.name?.trim()) errors.push('Template name is required');
    if (!template.description?.trim()) errors.push('Template description is required');
    if (!template.category?.trim()) errors.push('Template category is required');
    if (!template.defaultTasks?.length) errors.push('At least one default task is required');
    if ((template.defaultTeamSize || 0) < 1) errors.push('Default team size must be at least 1');

    // Validate tasks
    template.defaultTasks?.forEach((task, index) => {
      if (!task.name?.trim()) errors.push(`Task ${index + 1}: name is required`);
      if (task.duration < 0) errors.push(`Task ${index + 1}: duration must be positive`);
      if (task.estimatedHours < 0) errors.push(`Task ${index + 1}: estimated hours must be positive`);
    });

    // Validate milestones
    template.defaultMilestones?.forEach((milestone, index) => {
      if (!milestone.name?.trim()) errors.push(`Milestone ${index + 1}: name is required`);
      if (milestone.daysFromStart < 0) errors.push(`Milestone ${index + 1}: days from start must be positive`);
    });

    return errors;
  }

  private mapRow(row: any): ProjectTemplate {
    const template: ProjectTemplate = {
      templateId: row.template_id,
      name: row.name,
      description: row.description,
      category: row.category,
      defaultTasks: typeof row.default_tasks === 'string' ? JSON.parse(row.default_tasks) : row.default_tasks,
      defaultMilestones: typeof row.default_milestones === 'string' ? JSON.parse(row.default_milestones) : row.default_milestones,
      defaultDuration: row.default_duration,
      requiredSkills: typeof row.required_skills === 'string' ? JSON.parse(row.required_skills) : row.required_skills,
      defaultTeamSize: row.default_team_size,
      isActive: row.is_active,
      isBuiltIn: row.is_built_in,
      isPublic: row.is_public,
      version: row.version,
      createdById: row.created_by_id,
      usageCount: row.usage_count,
      averageRating: parseFloat(row.average_rating) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    // Add optional properties only if they have values
    if (row.default_budget !== null && row.default_budget !== undefined) {
      template.defaultBudget = parseFloat(row.default_budget);
    }
    if (row.metadata !== null && row.metadata !== undefined) {
      template.metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    }
    if (row.custom_fields !== null && row.custom_fields !== undefined) {
      template.customFields = typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : row.custom_fields;
    }

    return template;
  }
}