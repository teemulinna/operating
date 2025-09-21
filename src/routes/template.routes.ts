import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { DatabaseService } from '../database/database.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

const createTemplateController = (databaseService: DatabaseService) => {
  return new TemplateController(databaseService);
};

// Validation schemas
const createTemplateValidation = [
  body('name').notEmpty().withMessage('Template name is required').isLength({ max: 255 }),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('defaultTasks').isArray({ min: 1 }).withMessage('At least one default task is required'),
  body('defaultTasks.*.name').notEmpty().withMessage('Task name is required'),
  body('defaultTasks.*.duration').isInt({ min: 0 }).withMessage('Task duration must be a positive number'),
  body('defaultTasks.*.estimatedHours').isInt({ min: 0 }).withMessage('Estimated hours must be positive'),
  body('defaultTasks.*.priority').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('defaultMilestones').optional().isArray(),
  body('defaultMilestones.*.name').optional().notEmpty().withMessage('Milestone name is required'),
  body('defaultMilestones.*.daysFromStart').optional().isInt({ min: 0 }).withMessage('Days from start must be positive'),
  body('defaultBudget').optional().isFloat({ min: 0 }).withMessage('Budget must be positive'),
  body('defaultDuration').optional().isInt({ min: 1 }).withMessage('Duration must be at least 1 day'),
  body('defaultTeamSize').isInt({ min: 1 }).withMessage('Team size must be at least 1'),
  body('requiredSkills').optional().isArray(),
  body('isPublic').optional().isBoolean()
];

const createFromProjectValidation = [
  param('projectId').isUUID().withMessage('Valid project ID is required'),
  body('name').notEmpty().withMessage('Template name is required').isLength({ max: 255 }),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('isPublic').optional().isBoolean(),
  body('excludePersonalData').optional().isBoolean()
];

const applyTemplateValidation = [
  body('templateId').isUUID().withMessage('Valid template ID is required'),
  body('projectName').notEmpty().withMessage('Project name is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('clientId').optional().isUUID().withMessage('Valid client ID required if provided'),
  body('customBudget').optional().isFloat({ min: 0 }).withMessage('Custom budget must be positive'),
  body('customDuration').optional().isInt({ min: 1 }).withMessage('Custom duration must be at least 1 day'),
  body('teamAssignments').optional().isObject(),
  body('customizations').optional().isObject()
];

const cloneProjectValidation = [
  param('projectId').isUUID().withMessage('Valid project ID is required'),
  body('newName').notEmpty().withMessage('New project name is required')
];

const searchValidation = [
  query('category').optional().isString(),
  query('industry').optional().isString(),
  query('complexity').optional().isIn(['simple', 'moderate', 'complex', 'enterprise']),
  query('methodology').optional().isIn(['agile', 'waterfall', 'hybrid', 'lean']),
  query('minRating').optional().isFloat({ min: 0, max: 5 }),
  query('isPublic').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
];

const updateTemplateValidation = [
  param('id').isUUID().withMessage('Valid template ID is required'),
  body('name').optional().isLength({ max: 255 }),
  body('description').optional().notEmpty(),
  body('category').optional().isLength({ max: 100 }),
  body('defaultTasks').optional().isArray({ min: 1 }),
  body('defaultTeamSize').optional().isInt({ min: 1 }),
  body('isPublic').optional().isBoolean()
];

const rateTemplateValidation = [
  param('id').isUUID().withMessage('Valid template ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
];

export default (databaseService: DatabaseService) => {
  const templateController = createTemplateController(databaseService);

  // Public routes
  router.get('/search', searchValidation, validate, templateController.searchTemplates);
  router.get('/popular', templateController.getPopularTemplates);
  router.get('/categories', templateController.getCategories);
  router.get('/built-in', templateController.getBuiltInTemplates);
  router.get('/:id', param('id').isUUID(), validate, templateController.getTemplate);

  // Protected routes
  router.use(authMiddleware);

  // Template CRUD
  router.post('/', createTemplateValidation, validate, templateController.createTemplate);
  router.put('/:id', updateTemplateValidation, validate, templateController.updateTemplate);
  router.delete('/:id', param('id').isUUID(), validate, templateController.deleteTemplate);

  // Template operations
  router.post('/from-project/:projectId', createFromProjectValidation, validate, templateController.createFromProject);
  router.post('/apply', applyTemplateValidation, validate, templateController.applyTemplate);
  router.post('/clone-project/:projectId', cloneProjectValidation, validate, templateController.cloneProject);
  router.post('/:id/duplicate', 
    param('id').isUUID().withMessage('Valid template ID is required'),
    body('name').optional().isLength({ max: 255 }),
    validate, 
    templateController.duplicateTemplate
  );

  // Template customization and preview
  router.post('/:id/customize', 
    param('id').isUUID().withMessage('Valid template ID is required'),
    body('customizations').optional().isObject(),
    validate,
    templateController.customizeTemplate
  );

  // Template rating and feedback
  router.post('/:id/rate', rateTemplateValidation, validate, templateController.rateTemplate);

  // Import/Export
  router.post('/import', 
    body('template').isObject().withMessage('Template data is required'),
    validate,
    templateController.importTemplate
  );
  router.get('/:id/export', 
    param('id').isUUID().withMessage('Valid template ID is required'),
    validate,
    templateController.exportTemplate
  );

  // User templates
  router.get('/user/templates', 
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    validate,
    templateController.getUserTemplates
  );

  return router;
};