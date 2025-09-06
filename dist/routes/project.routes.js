"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const express_1 = require("express");
const project_service_1 = require("../services/project.service");
const types_1 = require("../types");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
exports.projectRoutes = router;
const projectService = new project_service_1.ProjectService();
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
const createProjectValidation = [
    (0, express_validator_1.body)('name').isString().isLength({ min: 1, max: 255 }).withMessage('Project name is required and must be less than 255 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('clientName').optional().isString().isLength({ max: 255 }).withMessage('Client name must be less than 255 characters'),
    (0, express_validator_1.body)('status').optional().isIn(['planning', 'active', 'completed', 'on-hold']).withMessage('Invalid status'),
    (0, express_validator_1.body)('startDate').isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.body)('endDate').isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.body)('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    (0, express_validator_1.body)('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
    (0, express_validator_1.body)('createdBy').optional().isInt().withMessage('Created by must be a valid user ID')
];
const updateProjectValidation = [
    (0, express_validator_1.param)('id').isInt().withMessage('Project ID must be a valid integer'),
    (0, express_validator_1.body)('name').optional().isString().isLength({ min: 1, max: 255 }).withMessage('Project name must be less than 255 characters'),
    (0, express_validator_1.body)('description').optional().isString().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('clientName').optional().isString().isLength({ max: 255 }).withMessage('Client name must be less than 255 characters'),
    (0, express_validator_1.body)('status').optional().isIn(['planning', 'active', 'completed', 'on-hold']).withMessage('Invalid status'),
    (0, express_validator_1.body)('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
    (0, express_validator_1.body)('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
    (0, express_validator_1.body)('budget').optional().isFloat({ min: 0 }).withMessage('Budget must be a positive number'),
    (0, express_validator_1.body)('hourlyRate').optional().isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number')
];
const projectIdValidation = [
    (0, express_validator_1.param)('id').isInt().withMessage('Project ID must be a valid integer')
];
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'DESC', status, clientName, startDateFrom, startDateTo, endDateFrom, endDateTo } = req.query;
        const filters = {};
        if (status)
            filters.status = status;
        if (clientName)
            filters.clientName = clientName;
        if (startDateFrom)
            filters.startDateFrom = new Date(startDateFrom);
        if (startDateTo)
            filters.startDateTo = new Date(startDateTo);
        if (endDateFrom)
            filters.endDateFrom = new Date(endDateFrom);
        if (endDateTo)
            filters.endDateTo = new Date(endDateTo);
        const result = await projectService.getProjects(filters, parseInt(page), parseInt(limit), sortBy, sortOrder);
        res.json({
            success: true,
            data: result.data,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages
            }
        });
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects',
            message: error.message
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const stats = await projectService.getProjectStatistics();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching project statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project statistics',
            message: error.message
        });
    }
});
router.get('/overdue', async (req, res) => {
    try {
        const overdueProjects = await projectService.getOverdueProjects();
        res.json({
            success: true,
            data: overdueProjects,
            count: overdueProjects.length
        });
    }
    catch (error) {
        console.error('Error fetching overdue projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch overdue projects',
            message: error.message
        });
    }
});
router.get('/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 10 } = req.query;
        if (!searchTerm) {
            return res.status(400).json({
                success: false,
                error: 'Search term is required'
            });
        }
        const projects = await projectService.getProjects({}, 1, parseInt(limit));
        const filteredProjects = projects.data.filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase()));
        res.json({
            success: true,
            data: filteredProjects
        });
    }
    catch (error) {
        console.error('Error searching projects:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search projects',
            message: error.message
        });
    }
});
router.get('/:id', projectIdValidation, handleValidationErrors, async (req, res) => {
    try {
        const project = await projectService.getProjectById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        res.json({
            success: true,
            data: project
        });
    }
    catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch project',
            message: error.message
        });
    }
});
router.post('/', createProjectValidation, handleValidationErrors, async (req, res) => {
    try {
        const projectData = {
            name: req.body.name,
            description: req.body.description,
            clientName: req.body.clientName,
            status: req.body.status || types_1.ProjectStatus.PLANNING,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            budget: req.body.budget,
            hourlyRate: req.body.hourlyRate,
            createdBy: req.body.createdBy
        };
        const project = await projectService.createProject(projectData);
        res.status(201).json({
            success: true,
            data: project,
            message: 'Project created successfully'
        });
    }
    catch (error) {
        console.error('Error creating project:', error);
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'Conflict',
                message: error.message
            });
        }
        if (error.message.includes('End date must be after start date')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date range',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create project',
            message: error.message
        });
    }
});
router.put('/:id', updateProjectValidation, handleValidationErrors, async (req, res) => {
    try {
        const updateData = {
            ...(req.body.name && { name: req.body.name }),
            ...(req.body.description !== undefined && { description: req.body.description }),
            ...(req.body.clientName !== undefined && { clientName: req.body.clientName }),
            ...(req.body.status && { status: req.body.status }),
            ...(req.body.startDate && { startDate: new Date(req.body.startDate) }),
            ...(req.body.endDate && { endDate: new Date(req.body.endDate) }),
            ...(req.body.budget !== undefined && { budget: req.body.budget }),
            ...(req.body.hourlyRate !== undefined && { hourlyRate: req.body.hourlyRate })
        };
        const project = await projectService.updateProject(req.params.id, updateData);
        res.json({
            success: true,
            data: project,
            message: 'Project updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating project:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'Conflict',
                message: error.message
            });
        }
        if (error.message.includes('Invalid status transition')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status transition',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update project',
            message: error.message
        });
    }
});
router.delete('/:id', projectIdValidation, handleValidationErrors, async (req, res) => {
    try {
        const project = await projectService.deleteProject(req.params.id);
        res.json({
            success: true,
            data: project,
            message: 'Project deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting project:', error);
        if (error.message === 'Project not found') {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to delete project',
            message: error.message
        });
    }
});
router.get('/:id/budget-utilization', projectIdValidation, handleValidationErrors, async (req, res) => {
    try {
        const utilization = await projectService.calculateBudgetUtilization(req.params.id);
        res.json({
            success: true,
            data: {
                projectId: req.params.id,
                budgetUtilization: utilization
            }
        });
    }
    catch (error) {
        console.error('Error calculating budget utilization:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate budget utilization',
            message: error.message
        });
    }
});
router.get('/client/:clientName', async (req, res) => {
    try {
        const clientName = decodeURIComponent(req.params.clientName);
        const projects = await projectService.getProjectsByClient(clientName);
        res.json({
            success: true,
            data: projects,
            count: projects.length,
            client: clientName
        });
    }
    catch (error) {
        console.error('Error fetching projects by client:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects by client',
            message: error.message
        });
    }
});
router.get('/status/:status', async (req, res) => {
    try {
        const status = req.params.status;
        if (!['planning', 'active', 'completed', 'on-hold'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        const projects = await projectService.getProjectsByStatus(status);
        res.json({
            success: true,
            data: projects,
            count: projects.length,
            status: status
        });
    }
    catch (error) {
        console.error('Error fetching projects by status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch projects by status',
            message: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=project.routes.js.map