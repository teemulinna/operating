import { Router } from 'express';
import { ProjectTemplateController } from '../controllers/project-template.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateTemplate, validateTemplateSearch, validateApplyTemplate, validateCreateFromProject } from '../middleware/template-validation.middleware';

const router = Router();
const templateController = new ProjectTemplateController();

// Public routes
router.get('/search', validateTemplateSearch, templateController.searchTemplates);
router.get('/popular', templateController.getPopularTemplates);
router.get('/categories', templateController.getCategories);
router.get('/built-in', templateController.getBuiltInTemplates);
router.get('/:id', templateController.getTemplate);

// Protected routes (commented out for development)
// router.use(authMiddleware);

// Template CRUD
router.post('/', validateTemplate, templateController.createTemplate);
router.put('/:id', validateTemplate, templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);

// Template operations
router.post('/from-project/:projectId', validateCreateFromProject, templateController.createFromProject);
router.post('/apply', validateApplyTemplate, templateController.applyTemplate);
router.post('/clone-project/:projectId', templateController.cloneProject);
router.post('/:id/duplicate', templateController.duplicateTemplate);

// Template customization and preview
router.post('/:id/customize', templateController.customizeTemplate);

// Template rating and feedback
router.post('/:id/rate', templateController.rateTemplate);

// Import/Export
router.post('/import', templateController.importTemplate);
router.get('/:id/export', templateController.exportTemplate);

// User templates
router.get('/user/templates', templateController.getUserTemplates);

export { router as projectTemplateRoutes };