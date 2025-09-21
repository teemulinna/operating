import { Request, Response, NextFunction } from 'express';
import { ProjectTemplateModel } from '../models/ProjectTemplateModel';

export const validateTemplate = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { body } = req;
  
  const errors = ProjectTemplateModel.validateTemplate(body);
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Template validation failed',
      details: errors
    });
  }
  
  next();
};

export const validateTemplateSearch = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { query } = req;
  const errors: string[] = [];
  
  if (query.limit && (isNaN(parseInt(query.limit as string)) || parseInt(query.limit as string) < 1 || parseInt(query.limit as string) > 100)) {
    errors.push('Limit must be a number between 1 and 100');
  }
  
  if (query.offset && (isNaN(parseInt(query.offset as string)) || parseInt(query.offset as string) < 0)) {
    errors.push('Offset must be a non-negative number');
  }
  
  if (query.minRating && (isNaN(parseFloat(query.minRating as string)) || parseFloat(query.minRating as string) < 0 || parseFloat(query.minRating as string) > 5)) {
    errors.push('Minimum rating must be a number between 0 and 5');
  }
  
  if (query.complexity && !['simple', 'moderate', 'complex', 'enterprise'].includes(query.complexity as string)) {
    errors.push('Complexity must be one of: simple, moderate, complex, enterprise');
  }
  
  if (query.methodology && !['agile', 'waterfall', 'hybrid', 'lean'].includes(query.methodology as string)) {
    errors.push('Methodology must be one of: agile, waterfall, hybrid, lean');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Search validation failed',
      details: errors
    });
  }
  
  next();
};

export const validateApplyTemplate = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { body } = req;
  const errors: string[] = [];
  
  if (!body.templateId) {
    errors.push('Template ID is required');
  }
  
  if (!body.projectName || typeof body.projectName !== 'string' || body.projectName.trim().length === 0) {
    errors.push('Project name is required and must be a non-empty string');
  }
  
  if (!body.startDate) {
    errors.push('Start date is required');
  } else {
    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Start date must be a valid date');
    }
  }
  
  if (body.customBudget !== undefined && (isNaN(parseFloat(body.customBudget)) || parseFloat(body.customBudget) < 0)) {
    errors.push('Custom budget must be a positive number');
  }
  
  if (body.customDuration !== undefined && (isNaN(parseInt(body.customDuration)) || parseInt(body.customDuration) < 1)) {
    errors.push('Custom duration must be at least 1 day');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Apply template validation failed',
      details: errors
    });
  }
  
  next();
};

export const validateCreateFromProject = (req: Request, res: Response, next: NextFunction): Response | void => {
  const { body, params } = req;
  const errors: string[] = [];
  
  if (!params.projectId) {
    errors.push('Project ID is required');
  }
  
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    errors.push('Template name is required and must be a non-empty string');
  }
  
  if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
    errors.push('Template description is required and must be a non-empty string');
  }
  
  if (!body.category || typeof body.category !== 'string' || body.category.trim().length === 0) {
    errors.push('Template category is required and must be a non-empty string');
  }
  
  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean') {
    errors.push('isPublic must be a boolean value');
  }
  
  if (body.excludePersonalData !== undefined && typeof body.excludePersonalData !== 'boolean') {
    errors.push('excludePersonalData must be a boolean value');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Create from project validation failed',
      details: errors
    });
  }
  
  next();
};