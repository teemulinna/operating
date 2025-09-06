"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validate_middleware_1 = require("../middleware/validate.middleware");
const pipeline_management_service_1 = require("../services/pipeline-management.service");
const crm_integration_service_1 = require("../services/crm-integration.service");
const router = (0, express_1.Router)();
exports.pipelineRoutes = router;
const pipelineService = new pipeline_management_service_1.PipelineManagementService();
const crmService = new crm_integration_service_1.CRMIntegrationService();
const createPipelineProjectValidation = [
    (0, express_validator_1.body)('name')
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Project name must be 1-200 characters'),
    (0, express_validator_1.body)('clientName')
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Client name must be 1-200 characters'),
    (0, express_validator_1.body)('stage')
        .isIn(['lead', 'prospect', 'opportunity', 'proposal', 'negotiation', 'won', 'lost', 'on-hold'])
        .withMessage('Invalid pipeline stage'),
    (0, express_validator_1.body)('priority')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid priority level'),
    (0, express_validator_1.body)('probability')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Probability must be between 0 and 100'),
    (0, express_validator_1.body)('estimatedValue')
        .isFloat({ min: 0 })
        .withMessage('Estimated value must be positive'),
    (0, express_validator_1.body)('estimatedStartDate')
        .isISO8601()
        .withMessage('Estimated start date must be valid'),
    (0, express_validator_1.body)('estimatedDuration')
        .isInt({ min: 1 })
        .withMessage('Estimated duration must be positive'),
    (0, express_validator_1.body)('requiredSkills')
        .isArray()
        .withMessage('Required skills must be an array'),
    (0, express_validator_1.body)('resourceDemand')
        .isArray()
        .withMessage('Resource demand must be an array'),
    (0, express_validator_1.body)('resourceDemand.*.skillCategory')
        .isString()
        .withMessage('Skill category is required'),
    (0, express_validator_1.body)('resourceDemand.*.experienceLevel')
        .isIn(['junior', 'intermediate', 'senior', 'expert'])
        .withMessage('Invalid experience level'),
    (0, express_validator_1.body)('resourceDemand.*.requiredCount')
        .isInt({ min: 1 })
        .withMessage('Required count must be positive'),
    (0, express_validator_1.body)('resourceDemand.*.allocationPercentage')
        .isFloat({ min: 1, max: 100 })
        .withMessage('Allocation percentage must be between 1 and 100'),
    (0, express_validator_1.body)('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array')
];
const updatePipelineProjectValidation = [
    ...createPipelineProjectValidation.map(rule => rule.optional())
];
const crmSyncValidation = [
    (0, express_validator_1.body)('crmSystemId')
        .isUUID()
        .withMessage('CRM system ID must be a valid UUID'),
    (0, express_validator_1.body)('operation')
        .isIn(['sync', 'import', 'export'])
        .withMessage('Invalid sync operation'),
    (0, express_validator_1.body)('direction')
        .optional()
        .isIn(['bidirectional', 'to-crm', 'from-crm'])
        .withMessage('Invalid sync direction')
];
const crmSystemValidation = [
    (0, express_validator_1.body)('name')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('CRM system name must be 1-100 characters'),
    (0, express_validator_1.body)('type')
        .isIn(['salesforce', 'hubspot', 'pipedrive', 'dynamics', 'custom'])
        .withMessage('Invalid CRM system type'),
    (0, express_validator_1.body)('apiUrl')
        .isURL()
        .withMessage('API URL must be valid'),
    (0, express_validator_1.body)('authType')
        .isIn(['oauth', 'api-key', 'basic', 'bearer'])
        .withMessage('Invalid authentication type'),
    (0, express_validator_1.body)('syncSettings.autoSync')
        .isBoolean()
        .withMessage('Auto sync must be boolean'),
    (0, express_validator_1.body)('syncSettings.syncInterval')
        .isInt({ min: 5 })
        .withMessage('Sync interval must be at least 5 minutes'),
    (0, express_validator_1.body)('syncSettings.syncDirection')
        .isIn(['bidirectional', 'crm-to-system', 'system-to-crm'])
        .withMessage('Invalid sync direction'),
    (0, express_validator_1.body)('syncSettings.conflictResolution')
        .isIn(['crm-wins', 'system-wins', 'manual', 'timestamp'])
        .withMessage('Invalid conflict resolution strategy')
];
router.post('/projects', createPipelineProjectValidation, validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const project = await pipelineService.createPipelineProject(req.body);
        res.status(201).json({
            success: true,
            data: project,
            message: 'Pipeline project created successfully'
        });
    }
    catch (error) {
        console.error('Error creating pipeline project:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create pipeline project'
        });
    }
});
router.get('/projects', async (req, res) => {
    try {
        const filters = {
            stage: req.query.stage,
            priority: req.query.priority,
            clientName: req.query.clientName,
            probabilityMin: req.query.probabilityMin ? parseFloat(req.query.probabilityMin) : undefined,
            probabilityMax: req.query.probabilityMax ? parseFloat(req.query.probabilityMax) : undefined,
            valueMin: req.query.valueMin ? parseFloat(req.query.valueMin) : undefined,
            valueMax: req.query.valueMax ? parseFloat(req.query.valueMax) : undefined,
            startDateFrom: req.query.startDateFrom,
            startDateTo: req.query.startDateTo,
            skills: req.query.skills ? (Array.isArray(req.query.skills) ? req.query.skills : [req.query.skills]) : undefined,
            tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
            syncStatus: req.query.syncStatus,
            search: req.query.search
        };
        const result = await pipelineService.getPipelineProjects(filters);
        res.json({
            success: true,
            data: result.projects,
            pagination: {
                total: result.total,
                count: result.projects.length
            },
            message: 'Pipeline projects retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching pipeline projects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pipeline projects'
        });
    }
});
router.get('/projects/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Project ID must be a valid UUID'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const project = await pipelineService.getPipelineProject(req.params.id);
        res.json({
            success: true,
            data: project,
            message: 'Pipeline project retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching pipeline project:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to fetch pipeline project'
        });
    }
});
router.put('/projects/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Project ID must be a valid UUID'), updatePipelineProjectValidation, validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const project = await pipelineService.updatePipelineProject({
            id: req.params.id,
            ...req.body
        });
        res.json({
            success: true,
            data: project,
            message: 'Pipeline project updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating pipeline project:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update pipeline project'
        });
    }
});
router.delete('/projects/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Project ID must be a valid UUID'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        await pipelineService.deletePipelineProject(req.params.id);
        res.json({
            success: true,
            message: 'Pipeline project deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting pipeline project:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete pipeline project'
        });
    }
});
router.get('/analytics', async (req, res) => {
    try {
        const filters = {
            stage: req.query.stage,
            priority: req.query.priority,
            startDateFrom: req.query.startDateFrom,
            startDateTo: req.query.startDateTo
        };
        const analytics = await pipelineService.getPipelineAnalytics(filters);
        res.json({
            success: true,
            data: analytics,
            message: 'Pipeline analytics retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching pipeline analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pipeline analytics'
        });
    }
});
router.post('/crm-systems', crmSystemValidation, validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const crmSystem = await crmService.createCRMSystem(req.body);
        res.status(201).json({
            success: true,
            data: crmSystem,
            message: 'CRM system created successfully'
        });
    }
    catch (error) {
        console.error('Error creating CRM system:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to create CRM system'
        });
    }
});
router.get('/crm-systems', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const crmSystems = await crmService.getCRMSystems(includeInactive);
        res.json({
            success: true,
            data: crmSystems,
            message: 'CRM systems retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching CRM systems:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch CRM systems'
        });
    }
});
router.put('/crm-systems/:id', (0, express_validator_1.param)('id').isUUID().withMessage('CRM system ID must be a valid UUID'), crmSystemValidation.map(rule => rule.optional()), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const crmSystem = await crmService.updateCRMSystem(req.params.id, req.body);
        res.json({
            success: true,
            data: crmSystem,
            message: 'CRM system updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating CRM system:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to update CRM system'
        });
    }
});
router.post('/crm-sync', crmSyncValidation, validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const syncOperation = await crmService.startSync(req.body);
        res.status(202).json({
            success: true,
            data: syncOperation,
            message: 'CRM synchronization started successfully'
        });
    }
    catch (error) {
        console.error('Error starting CRM sync:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to start CRM synchronization'
        });
    }
});
router.get('/crm-sync/operations', async (req, res) => {
    try {
        const crmSystemId = req.query.crmSystemId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const operations = await crmService.getSyncOperations(crmSystemId, limit);
        res.json({
            success: true,
            data: operations,
            message: 'Sync operations retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching sync operations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sync operations'
        });
    }
});
router.get('/crm-sync/operations/:id', (0, express_validator_1.param)('id').isUUID().withMessage('Operation ID must be a valid UUID'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const operation = await crmService.getSyncOperation(req.params.id);
        if (!operation) {
            return res.status(404).json({
                success: false,
                message: 'Sync operation not found'
            });
        }
        res.json({
            success: true,
            data: operation,
            message: 'Sync operation retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching sync operation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sync operation'
        });
    }
});
router.post('/crm-systems/:id/test-connection', (0, express_validator_1.param)('id').isUUID().withMessage('CRM system ID must be a valid UUID'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const result = await crmService.testConnection(req.params.id);
        res.json({
            success: result.success,
            data: result.details,
            message: result.message
        });
    }
    catch (error) {
        console.error('Error testing connection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test CRM connection'
        });
    }
});
router.get('/crm-sync/conflicts', async (req, res) => {
    try {
        const crmSystemId = req.query.crmSystemId;
        const conflicts = await crmService.getSyncConflicts(crmSystemId);
        res.json({
            success: true,
            data: conflicts,
            message: 'Sync conflicts retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error fetching sync conflicts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sync conflicts'
        });
    }
});
router.post('/crm-sync/conflicts/:id/resolve', (0, express_validator_1.param)('id').isUUID().withMessage('Conflict ID must be a valid UUID'), (0, express_validator_1.body)('resolution')
    .isIn(['use-system', 'use-crm', 'merge'])
    .withMessage('Invalid resolution type'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        await crmService.resolveSyncConflict(req.params.id, req.body.resolution, req.body.customValue);
        res.json({
            success: true,
            message: 'Sync conflict resolved successfully'
        });
    }
    catch (error) {
        console.error('Error resolving sync conflict:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to resolve sync conflict'
        });
    }
});
router.post('/projects/:projectId/sync-to-crm/:crmSystemId', (0, express_validator_1.param)('projectId').isUUID().withMessage('Project ID must be a valid UUID'), (0, express_validator_1.param)('crmSystemId').isUUID().withMessage('CRM system ID must be a valid UUID'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const result = await crmService.syncProjectToCRM(req.params.projectId, req.params.crmSystemId);
        res.json({
            success: result.success,
            data: result.crmId ? { crmId: result.crmId } : undefined,
            message: result.success ? 'Project synced to CRM successfully' : result.error
        });
    }
    catch (error) {
        console.error('Error syncing project to CRM:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync project to CRM'
        });
    }
});
router.post('/crm/:crmSystemId/projects/:crmId/sync-from-crm', (0, express_validator_1.param)('crmSystemId').isUUID().withMessage('CRM system ID must be a valid UUID'), (0, express_validator_1.param)('crmId').isString().withMessage('CRM ID is required'), validate_middleware_1.handleValidationErrors, async (req, res) => {
    try {
        const result = await crmService.syncProjectFromCRM(req.params.crmId, req.params.crmSystemId);
        res.json({
            success: result.success,
            data: result.projectId ? { projectId: result.projectId } : undefined,
            message: result.success ? 'Project synced from CRM successfully' : result.error
        });
    }
    catch (error) {
        console.error('Error syncing project from CRM:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync project from CRM'
        });
    }
});
//# sourceMappingURL=pipeline.routes.js.map