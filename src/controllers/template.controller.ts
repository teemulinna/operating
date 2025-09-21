import { Request, Response } from 'express';
import { TemplateService, CreateTemplateFromProjectOptions, ApplyTemplateOptions, TemplateSearchFilters } from '../services/template.service';
import { DatabaseService } from '../database/database.service';
import { asyncHandler } from '../middleware/async-handler';
import { ApiError } from '../utils/api-error';

export class TemplateController {
  private templateService: TemplateService;

  constructor(databaseService: DatabaseService) {
    this.templateService = new TemplateService(databaseService);
  }

  /**
   * Create new template
   */
  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const template = await this.templateService.createTemplate(req.body, userId);
    res.status(201).json({
      success: true,
      data: template
    });
  });

  /**
   * Create template from existing project
   */
  createFromProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const options: CreateTemplateFromProjectOptions = req.body;
    const userId = req.user?.id;

    const template = await this.templateService.createTemplateFromProject(projectId, options, userId);
    res.status(201).json({
      success: true,
      data: template
    });
  });

  /**
   * Apply template to create new project
   */
  applyTemplate = asyncHandler(async (req: Request, res: Response) => {
    const options: ApplyTemplateOptions = req.body;
    const userId = req.user?.id;

    const project = await this.templateService.applyTemplate(options, userId);
    res.status(201).json({
      success: true,
      data: project
    });
  });

  /**
   * Clone existing project
   */
  cloneProject = asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const { newName } = req.body;
    const userId = req.user?.id;

    if (!newName) {
      throw new ApiError(400, 'New project name is required');
    }

    const project = await this.templateService.cloneProject(projectId, newName, userId);
    res.json({
      success: true,
      data: project
    });
  });

  /**
   * Get template by ID
   */
  getTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await this.templateService.getTemplateById(id);
    
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Search templates
   */
  searchTemplates = asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      industry,
      complexity,
      methodology,
      tags,
      minRating,
      isPublic,
      createdById,
      limit = 20,
      offset = 0
    } = req.query;

    const filters: TemplateSearchFilters = {};
    if (category) filters.category = category as string;
    if (industry) filters.industry = industry as string;
    if (complexity) filters.complexity = complexity as string;
    if (methodology) filters.methodology = methodology as string;
    if (tags) filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
    if (minRating) filters.minRating = parseFloat(minRating as string);
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (createdById) filters.createdById = createdById as string;

    const result = await this.templateService.searchTemplates(
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result.templates,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  });

  /**
   * Get popular templates
   */
  getPopularTemplates = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const templates = await this.templateService.getPopularTemplates(parseInt(limit as string));
    
    res.json({
      success: true,
      data: templates
    });
  });

  /**
   * Get template categories
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.templateService.getTemplateCategories();
    
    res.json({
      success: true,
      data: categories
    });
  });

  /**
   * Update template
   */
  updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const template = await this.templateService.updateTemplate(id, req.body);
    
    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Delete template
   */
  deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.templateService.deleteTemplate(id);
    
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  });

  /**
   * Rate template
   */
  rateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
    }

    const template = await this.templateService.rateTemplate(id, rating);
    
    res.json({
      success: true,
      data: template
    });
  });

  /**
   * Export template
   */
  exportTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const exportData = await this.templateService.exportTemplate(id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="template-${id}.json"`);
    res.json(exportData);
  });

  /**
   * Import template
   */
  importTemplate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const template = await this.templateService.importTemplate(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: template
    });
  });

  /**
   * Get user's templates
   */
  getUserTemplates = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError(401, 'Authentication required');
    }

    const { limit = 20, offset = 0 } = req.query;
    
    const filters: TemplateSearchFilters = { createdById: userId };
    const result = await this.templateService.searchTemplates(
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: result.templates,
      pagination: {
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  });

  /**
   * Get built-in templates
   */
  getBuiltInTemplates = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, offset = 0 } = req.query;
    
    const filters: TemplateSearchFilters = { isPublic: true };
    const result = await this.templateService.searchTemplates(
      filters,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    // Filter built-in templates
    const builtInTemplates = result.templates.filter(template => template.isBuiltIn);

    res.json({
      success: true,
      data: builtInTemplates,
      pagination: {
        total: builtInTemplates.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: builtInTemplates.length > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  });

  /**
   * Duplicate template
   */
  duplicateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.id;

    const originalTemplate = await this.templateService.getTemplateById(id);
    if (!originalTemplate) {
      throw new ApiError(404, 'Template not found');
    }

    const duplicatedData = {
      ...originalTemplate,
      templateId: undefined, // Remove template ID so a new one gets generated
      createdAt: undefined,
      updatedAt: undefined,
      name: name || originalTemplate.name,
      createdById: userId
    };

    const template = await this.templateService.createTemplate(duplicatedData, userId);
    
    res.status(201).json({
      success: true,
      data: template
    });
  });

  /**
   * Customize template before applying
   */
  customizeTemplate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { customizations } = req.body;

    const template = await this.templateService.getTemplateById(id);
    if (!template) {
      throw new ApiError(404, 'Template not found');
    }

    // Apply customizations to template data (preview mode)
    let customizedTasks = [...template.defaultTasks];
    let customizedMilestones = [...template.defaultMilestones];

    if (customizations) {
      if (customizations.includeTasks) {
        customizedTasks = customizedTasks.filter(task => 
          customizations.includeTasks.includes(task.id)
        );
      }
      if (customizations.excludeTasks) {
        customizedTasks = customizedTasks.filter(task => 
          !customizations.excludeTasks.includes(task.id)
        );
      }
      if (customizations.modifyTasks) {
        customizedTasks = customizedTasks.map(task => ({
          ...task,
          ...customizations.modifyTasks[task.id]
        }));
      }

      if (customizations.includeMilestones) {
        customizedMilestones = customizedMilestones.filter(milestone => 
          customizations.includeMilestones.includes(milestone.id)
        );
      }
      if (customizations.excludeMilestones) {
        customizedMilestones = customizedMilestones.filter(milestone => 
          !customizations.excludeMilestones.includes(milestone.id)
        );
      }
      if (customizations.modifyMilestones) {
        customizedMilestones = customizedMilestones.map(milestone => ({
          ...milestone,
          ...customizations.modifyMilestones[milestone.id]
        }));
      }
    }

    const customizedTemplate = {
      ...template,
      defaultTasks: customizedTasks,
      defaultMilestones: customizedMilestones,
      estimatedDuration: customizedTasks.reduce((max, task) => 
        Math.max(max, task.duration + Math.max(...task.dependencies.map(dep => 
          customizedTasks.find(t => t.id === dep)?.duration || 0
        ), 0)), 0),
      estimatedBudget: customizedTasks.reduce((sum, task) => sum + task.estimatedHours, 0) * 100 // Assuming $100/hour
    };

    res.json({
      success: true,
      data: customizedTemplate
    });
  });
}