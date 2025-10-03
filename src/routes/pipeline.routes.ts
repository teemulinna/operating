// Pipeline Management Routes with CRM Integration
import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validate.middleware';
import { PipelineManagementService } from '../services/pipeline-management.service';
import { CRMIntegrationService } from '../services/crm-integration.service';

const router = Router();
const pipelineService = new PipelineManagementService();
const crmService = new CRMIntegrationService();

// Validation rules
const createPipelineProjectValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Project name must be 1-200 characters'),
  body('clientName')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Client name must be 1-200 characters'),
  body('stage')
    .isIn(['lead', 'prospect', 'opportunity', 'proposal', 'negotiation', 'won', 'lost', 'on-hold'])
    .withMessage('Invalid pipeline stage'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level'),
  body('probability')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Probability must be between 0 and 100'),
  body('estimatedValue')
    .isFloat({ min: 0 })
    .withMessage('Estimated value must be positive'),
  body('estimatedStartDate')
    .isISO8601()
    .withMessage('Estimated start date must be valid'),
  body('estimatedDuration')
    .isInt({ min: 1 })
    .withMessage('Estimated duration must be positive'),
  body('requiredSkills')
    .isArray()
    .withMessage('Required skills must be an array'),
  body('resourceDemand')
    .isArray()
    .withMessage('Resource demand must be an array'),
  body('resourceDemand.*.skillCategory')
    .isString()
    .withMessage('Skill category is required'),
  body('resourceDemand.*.experienceLevel')
    .isIn(['junior', 'intermediate', 'senior', 'expert'])
    .withMessage('Invalid experience level'),
  body('resourceDemand.*.requiredCount')
    .isInt({ min: 1 })
    .withMessage('Required count must be positive'),
  body('resourceDemand.*.allocationPercentage')
    .isFloat({ min: 1, max: 100 })
    .withMessage('Allocation percentage must be between 1 and 100'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const updatePipelineProjectValidation = [
  ...createPipelineProjectValidation.map(rule => rule.optional())
];

const crmSyncValidation = [
  body('crmSystemId')
    .isUUID()
    .withMessage('CRM system ID must be a valid UUID'),
  body('operation')
    .isIn(['sync', 'import', 'export'])
    .withMessage('Invalid sync operation'),
  body('direction')
    .optional()
    .isIn(['bidirectional', 'to-crm', 'from-crm'])
    .withMessage('Invalid sync direction')
];

const crmSystemValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('CRM system name must be 1-100 characters'),
  body('type')
    .isIn(['salesforce', 'hubspot', 'pipedrive', 'dynamics', 'custom'])
    .withMessage('Invalid CRM system type'),
  body('apiUrl')
    .isURL()
    .withMessage('API URL must be valid'),
  body('authType')
    .isIn(['oauth', 'api-key', 'basic', 'bearer'])
    .withMessage('Invalid authentication type'),
  body('syncSettings.autoSync')
    .isBoolean()
    .withMessage('Auto sync must be boolean'),
  body('syncSettings.syncInterval')
    .isInt({ min: 5 })
    .withMessage('Sync interval must be at least 5 minutes'),
  body('syncSettings.syncDirection')
    .isIn(['bidirectional', 'crm-to-system', 'system-to-crm'])
    .withMessage('Invalid sync direction'),
  body('syncSettings.conflictResolution')
    .isIn(['crm-wins', 'system-wins', 'manual', 'timestamp'])
    .withMessage('Invalid conflict resolution strategy')
];

// Pipeline Project Routes
router.post(
  '/projects',
  createPipelineProjectValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const project = await pipelineService.createPipelineProject(req.body);
      res.status(201).json({
        success: true,
        data: project,
        message: 'Pipeline project created successfully'
      });
    } catch (error) {
      console.error('Error creating pipeline project:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to create pipeline project'
      });
    }
  }
);

router.get('/projects', async (req, res) => {
  try {
    const filters = {
      stage: req.query.stage as any,
      priority: req.query.priority as any,
      clientName: req.query.clientName as string,
      probabilityMin: req.query.probabilityMin ? parseFloat(req.query.probabilityMin as string) : undefined,
      probabilityMax: req.query.probabilityMax ? parseFloat(req.query.probabilityMax as string) : undefined,
      valueMin: req.query.valueMin ? parseFloat(req.query.valueMin as string) : undefined,
      valueMax: req.query.valueMax ? parseFloat(req.query.valueMax as string) : undefined,
      startDateFrom: req.query.startDateFrom as string,
      startDateTo: req.query.startDateTo as string,
      skills: req.query.skills ? (Array.isArray(req.query.skills) ? req.query.skills as string[] : [req.query.skills as string]) : undefined,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags as string[] : [req.query.tags as string]) : undefined,
      syncStatus: req.query.syncStatus as any,
      search: req.query.search as string
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
  } catch (error) {
    console.error('Error fetching pipeline projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline projects'
    });
  }
});

router.get(
  '/projects/:id',
  param('id').isUUID().withMessage('Project ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const project = await pipelineService.getPipelineProject(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline project not found'
        });
      }
      return res.json({
        success: true,
        data: project,
        message: 'Pipeline project retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching pipeline project:', error);
      return res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to fetch pipeline project'
      });
    }
  }
);

router.put(
  '/projects/:id',
  param('id').isUUID().withMessage('Project ID must be a valid UUID'),
  updatePipelineProjectValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const project = await pipelineService.updatePipelineProject(
        req.params.id,
        req.body
      );
      res.json({
        success: true,
        data: project,
        message: 'Pipeline project updated successfully'
      });
    } catch (error) {
      console.error('Error updating pipeline project:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to update pipeline project'
      });
    }
  }
);

router.delete(
  '/projects/:id',
  param('id').isUUID().withMessage('Project ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      await pipelineService.deletePipelineProject(req.params.id);
      res.json({
        success: true,
        message: 'Pipeline project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting pipeline project:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to delete pipeline project'
      });
    }
  }
);

// Pipeline Analytics Routes
router.get('/analytics', async (req, res) => {
  try {
    const filters = {
      stage: req.query.stage as any,
      priority: req.query.priority as any,
      startDateFrom: req.query.startDateFrom as string,
      startDateTo: req.query.startDateTo as string
    };

    const analytics = await pipelineService.getPipelineAnalytics(filters);
    res.json({
      success: true,
      data: analytics,
      message: 'Pipeline analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching pipeline analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pipeline analytics'
    });
  }
});

// CRM System Management Routes
router.post(
  '/crm-systems',
  crmSystemValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const crmSystem = await crmService.createCRMSystem(req.body);
      res.status(201).json({
        success: true,
        data: crmSystem,
        message: 'CRM system created successfully'
      });
    } catch (error) {
      console.error('Error creating CRM system:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to create CRM system'
      });
    }
  }
);

router.get('/crm-systems', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const crmSystems = await crmService.getCRMSystems(includeInactive);
    res.json({
      success: true,
      data: crmSystems,
      message: 'CRM systems retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching CRM systems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CRM systems'
    });
  }
});

router.put(
  '/crm-systems/:id',
  param('id').isUUID().withMessage('CRM system ID must be a valid UUID'),
  crmSystemValidation.map(rule => rule.optional()),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const crmSystem = await crmService.updateCRMSystem(req.params.id, req.body);
      res.json({
        success: true,
        data: crmSystem,
        message: 'CRM system updated successfully'
      });
    } catch (error) {
      console.error('Error updating CRM system:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to update CRM system'
      });
    }
  }
);

// CRM Synchronization Routes
router.post(
  '/crm-sync',
  crmSyncValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const syncOperation = await crmService.startSync(req.body);
      res.status(202).json({
        success: true,
        data: syncOperation,
        message: 'CRM synchronization started successfully'
      });
    } catch (error) {
      console.error('Error starting CRM sync:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to start CRM synchronization'
      });
    }
  }
);

router.get('/crm-sync/operations', async (req, res) => {
  try {
    const crmSystemId = req.query.crmSystemId as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const operations = await crmService.getSyncOperations(crmSystemId, limit);
    res.json({
      success: true,
      data: operations,
      message: 'Sync operations retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching sync operations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync operations'
    });
  }
});

router.get(
  '/crm-sync/operations/:id',
  param('id').isUUID().withMessage('Operation ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const operation = await crmService.getSyncOperation(req.params.id);
      if (!operation) {
        return res.status(404).json({
          success: false,
          message: 'Sync operation not found'
        });
      }

      return res.json({
        success: true,
        data: operation,
        message: 'Sync operation retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching sync operation:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sync operation'
      });
    }
  }
);

router.post(
  '/crm-systems/:id/test-connection',
  param('id').isUUID().withMessage('CRM system ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await crmService.testConnection(req.params.id);
      res.json({
        success: result.success,
        data: result.details,
        message: result.message
      });
    } catch (error) {
      console.error('Error testing connection:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test CRM connection'
      });
    }
  }
);

// CRM Conflict Resolution Routes
router.get('/crm-sync/conflicts', async (req, res) => {
  try {
    const crmSystemId = req.query.crmSystemId as string;
    const conflicts = await crmService.getSyncConflicts(crmSystemId);
    res.json({
      success: true,
      data: conflicts,
      message: 'Sync conflicts retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching sync conflicts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync conflicts'
    });
  }
});

router.post(
  '/crm-sync/conflicts/:id/resolve',
  param('id').isUUID().withMessage('Conflict ID must be a valid UUID'),
  body('resolution')
    .isIn(['use-system', 'use-crm', 'merge'])
    .withMessage('Invalid resolution type'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      await crmService.resolveSyncConflict(
        req.params.id,
        req.body.resolution,
        req.body.customValue
      );
      res.json({
        success: true,
        message: 'Sync conflict resolved successfully'
      });
    } catch (error) {
      console.error('Error resolving sync conflict:', error);
      res.status((error as any).statusCode || 500).json({
        success: false,
        message: (error as any).message || 'Failed to resolve sync conflict'
      });
    }
  }
);

// Individual Project CRM Sync Routes
router.post(
  '/projects/:projectId/sync-to-crm/:crmSystemId',
  param('projectId').isUUID().withMessage('Project ID must be a valid UUID'),
  param('crmSystemId').isUUID().withMessage('CRM system ID must be a valid UUID'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await crmService.syncProjectToCRM(req.params.projectId, req.params.crmSystemId);
      res.json({
        success: result.success,
        data: result.crmId ? { crmId: result.crmId } : undefined,
        message: result.success ? 'Project synced to CRM successfully' : result.error
      });
    } catch (error) {
      console.error('Error syncing project to CRM:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync project to CRM'
      });
    }
  }
);

router.post(
  '/crm/:crmSystemId/projects/:crmId/sync-from-crm',
  param('crmSystemId').isUUID().withMessage('CRM system ID must be a valid UUID'),
  param('crmId').isString().withMessage('CRM ID is required'),
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const result = await crmService.syncProjectFromCRM(req.params.crmId, req.params.crmSystemId);
      res.json({
        success: result.success,
        data: result.projectId ? { projectId: result.projectId } : undefined,
        message: result.success ? 'Project synced from CRM successfully' : result.error
      });
    } catch (error) {
      console.error('Error syncing project from CRM:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync project from CRM'
      });
    }
  }
);

export { router as pipelineRoutes };