"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const allocation_templates_service_1 = require("../services/allocation-templates.service");
const api_error_1 = require("../utils/api-error");
const router = (0, express_1.Router)();
const templatesService = new allocation_templates_service_1.AllocationTemplatesService();
const getUserId = (req) => {
    return req.headers['user-id'] || 'default-user';
};
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const filters = {
            category: req.query.category,
            visibility: req.query.visibility,
            status: req.query.status,
            search: req.query.search,
            tags: req.query.tags ? req.query.tags.split(',') : undefined,
            created_by: req.query.created_by,
            organization_id: req.query.organization_id
        };
        const pagination = {
            page: Math.max(1, parseInt(req.query.page) || 1),
            limit: Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
        };
        const result = await templatesService.getTemplates(filters, userId, pagination);
        res.json(result);
    }
    catch (error) {
        console.error('Error in GET /allocation-templates:', error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateData = req.body;
        if (!templateData.name || !templateData.category) {
            return res.status(400).json({ error: 'Name and category are required' });
        }
        if (templateData.default_budget_range && (!Array.isArray(templateData.default_budget_range) || templateData.default_budget_range.length !== 2)) {
            return res.status(400).json({ error: 'Budget range must be an array with exactly 2 numbers [min, max]' });
        }
        const result = await templatesService.createTemplate(templateData, userId);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error in POST /allocation-templates:', error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.get('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const result = await templatesService.getTemplateById(templateId, userId);
        res.json(result);
    }
    catch (error) {
        console.error(`Error in GET /allocation-templates/${req.params.id}:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.put('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const updateData = req.body;
        const result = await templatesService.updateTemplate(templateId, updateData, userId);
        res.json(result);
    }
    catch (error) {
        console.error(`Error in PUT /allocation-templates/${req.params.id}:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        await templatesService.deleteTemplate(templateId, userId);
        res.status(204).send();
    }
    catch (error) {
        console.error(`Error in DELETE /allocation-templates/${req.params.id}:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/:id/roles', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const roleData = req.body;
        if (!roleData.role_name || !roleData.planned_allocation_percentage) {
            return res.status(400).json({ error: 'Role name and planned allocation percentage are required' });
        }
        if (roleData.planned_allocation_percentage <= 0 || roleData.planned_allocation_percentage > 100) {
            return res.status(400).json({ error: 'Planned allocation percentage must be between 0.01 and 100' });
        }
        const result = await templatesService.addTemplateRole(templateId, roleData, userId);
        res.status(201).json(result);
    }
    catch (error) {
        console.error(`Error in POST /allocation-templates/${req.params.id}/roles:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/:id/apply', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const options = req.body;
        if (!options.project_id || !options.start_date) {
            return res.status(400).json({ error: 'Project ID and start date are required' });
        }
        if (isNaN(Date.parse(options.start_date))) {
            return res.status(400).json({ error: 'Invalid start date format' });
        }
        const result = await templatesService.applyTemplateToProject(templateId, options, userId);
        res.json(result);
    }
    catch (error) {
        console.error(`Error in POST /allocation-templates/${req.params.id}/apply:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/:id/clone', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required for cloned template' });
        }
        const result = await templatesService.cloneTemplate(templateId, name, userId);
        res.status(201).json(result);
    }
    catch (error) {
        console.error(`Error in POST /allocation-templates/${req.params.id}/clone:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.post('/:id/rate', async (req, res) => {
    try {
        const userId = getUserId(req);
        const templateId = req.params.id;
        const { project_id, rating, feedback } = req.body;
        if (!project_id || !rating) {
            return res.status(400).json({ error: 'Project ID and rating are required' });
        }
        await templatesService.rateTemplate(templateId, project_id, rating, feedback, userId);
        res.json({ message: 'Rating submitted successfully' });
    }
    catch (error) {
        console.error(`Error in POST /allocation-templates/${req.params.id}/rate:`, error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.get('/popular', async (req, res) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const result = await templatesService.getPopularTemplates(limit);
        res.json(result);
    }
    catch (error) {
        console.error('Error in GET /allocation-templates/popular:', error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
router.get('/categories', async (req, res) => {
    try {
        const result = await templatesService.getTemplateCategories();
        res.json(result);
    }
    catch (error) {
        console.error('Error in GET /allocation-templates/categories:', error);
        if (error instanceof api_error_1.ApiError) {
            res.status(error.statusCode).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});
exports.default = router;
//# sourceMappingURL=allocation-templates.routes.js.map