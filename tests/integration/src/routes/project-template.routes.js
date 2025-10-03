"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectTemplateRoutes = void 0;
const express_1 = require("express");
const project_template_controller_1 = require("../controllers/project-template.controller");
const template_validation_middleware_1 = require("../middleware/template-validation.middleware");
const router = (0, express_1.Router)();
exports.projectTemplateRoutes = router;
const templateController = new project_template_controller_1.ProjectTemplateController();
// Public routes
router.get('/search', template_validation_middleware_1.validateTemplateSearch, templateController.searchTemplates);
router.get('/popular', templateController.getPopularTemplates);
router.get('/categories', templateController.getCategories);
router.get('/built-in', templateController.getBuiltInTemplates);
router.get('/:id', templateController.getTemplate);
// Protected routes (commented out for development)
// router.use(authMiddleware);
// Template CRUD
router.post('/', template_validation_middleware_1.validateTemplate, templateController.createTemplate);
router.put('/:id', template_validation_middleware_1.validateTemplate, templateController.updateTemplate);
router.delete('/:id', templateController.deleteTemplate);
// Template operations
router.post('/from-project/:projectId', template_validation_middleware_1.validateCreateFromProject, templateController.createFromProject);
router.post('/apply', template_validation_middleware_1.validateApplyTemplate, templateController.applyTemplate);
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
