import { Router, Request, Response } from 'express';
import { AllocationTemplatesService } from '../services/allocation-templates.service';
import { ApiError } from '../utils/api-error';

const router = Router();
const templatesService = new AllocationTemplatesService();

// Helper function to get user ID from request (assuming auth middleware)
const getUserId = (req: Request): string => {
  const userId = req.headers['user-id'] as string;
  if (userId) {
    return userId;
  }
  // Generate a consistent default UUID for development/testing
  return '550e8400-e29b-41d4-a716-446655440000'; // Standard nil UUID variant
};

/**
 * @swagger
 * /api/allocation-templates:
 *   get:
 *     summary: Get allocation templates with filtering and pagination
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by template category
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *         description: Filter by visibility level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in template name and description
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated tags to filter by
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                 pagination:
 *                   type: object
 *                 total:
 *                   type: integer
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const filters = {
      category: req.query.category as string,
      visibility: req.query.visibility as string,
      status: req.query.status as string,
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      created_by: req.query.created_by as string,
      organization_id: req.query.organization_id as string
    };

    const pagination = {
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    };

    const result = await templatesService.getTemplates(filters, userId, pagination);
    return res.json(result);
  } catch (error) {
    console.error('Error in GET /allocation-templates:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates:
 *   post:
 *     summary: Create a new allocation template
 *     tags: [Allocation Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [web_development, mobile_app, consulting, research, data_analytics, devops, design, marketing, custom]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               visibility:
 *                 type: string
 *                 enum: [private, organization, public]
 *               default_duration_weeks:
 *                 type: integer
 *                 minimum: 1
 *               default_budget_range:
 *                 type: array
 *                 items:
 *                   type: number
 *                 minItems: 2
 *                 maxItems: 2
 *               default_priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Template name already exists
 */
router.post('/', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = getUserId(req);
    const templateData = req.body;

    // Validation
    if (!templateData.name || !templateData.category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    if (templateData.default_budget_range && (!Array.isArray(templateData.default_budget_range) || templateData.default_budget_range.length !== 2)) {
      return res.status(400).json({ error: 'Budget range must be an array with exactly 2 numbers [min, max]' });
    }

    const result = await templatesService.createTemplate(templateData, userId);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /allocation-templates:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/popular:
 *   get:
 *     summary: Get popular allocation templates
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of templates to return
 *     responses:
 *       200:
 *         description: Popular templates retrieved successfully
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    
    const result = await templatesService.getPopularTemplates(limit);
    return res.json(result);
  } catch (error) {
    console.error('Error in GET /allocation-templates/popular:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/categories:
 *   get:
 *     summary: Get template categories with statistics
 *     tags: [Allocation Templates]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await templatesService.getTemplateCategories();
    return res.json(result);
  } catch (error) {
    console.error('Error in GET /allocation-templates/categories:', error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}:
 *   get:
 *     summary: Get allocation template by ID
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;

    const result = await templatesService.getTemplateById(templateId, userId);
    return res.json(result);
  } catch (error) {
    console.error(`Error in GET /allocation-templates/${req.params.id}:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}:
 *   put:
 *     summary: Update allocation template
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const updateData = req.body;

    const result = await templatesService.updateTemplate(templateId, updateData, userId);
    return res.json(result);
  } catch (error) {
    console.error(`Error in PUT /allocation-templates/${req.params.id}:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}:
 *   delete:
 *     summary: Delete allocation template (soft delete)
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       204:
 *         description: Template deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Template not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;

    await templatesService.deleteTemplate(templateId, userId);
    return res.status(204).send();
  } catch (error) {
    console.error(`Error in DELETE /allocation-templates/${req.params.id}:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}/roles:
 *   post:
 *     summary: Add role to allocation template
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_name
 *               - planned_allocation_percentage
 *             properties:
 *               role_name:
 *                 type: string
 *               description:
 *                 type: string
 *               required_skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               minimum_experience_level:
 *                 type: string
 *                 enum: [junior, mid, senior, lead]
 *               planned_allocation_percentage:
 *                 type: number
 *                 minimum: 0.01
 *                 maximum: 100
 *               estimated_hours_per_week:
 *                 type: number
 *               duration_weeks:
 *                 type: integer
 *               hourly_rate_range:
 *                 type: array
 *                 items:
 *                   type: number
 *               is_critical:
 *                 type: boolean
 *               can_be_remote:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Role added successfully
 */
router.post('/:id/roles', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const roleData = req.body;

    // Validation
    if (!roleData.role_name || !roleData.planned_allocation_percentage) {
      return res.status(400).json({ error: 'Role name and planned allocation percentage are required' });
    }

    if (roleData.planned_allocation_percentage <= 0 || roleData.planned_allocation_percentage > 100) {
      return res.status(400).json({ error: 'Planned allocation percentage must be between 0.01 and 100' });
    }

    const result = await templatesService.addTemplateRole(templateId, roleData, userId);
    return res.status(201).json(result);
  } catch (error) {
    console.error(`Error in POST /allocation-templates/${req.params.id}/roles:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}/apply:
 *   post:
 *     summary: Apply template to a project
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - start_date
 *             properties:
 *               project_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               scale_duration:
 *                 type: number
 *                 description: Multiplier for template duration
 *               budget_override:
 *                 type: number
 *               skip_roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Role names to skip when applying
 *               customizations:
 *                 type: object
 *                 description: Custom modifications to template
 *     responses:
 *       200:
 *         description: Template applied successfully
 *       404:
 *         description: Template or project not found
 */
router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const options = req.body;

    // Validation
    if (!options.project_id || !options.start_date) {
      return res.status(400).json({ error: 'Project ID and start date are required' });
    }

    // Validate start_date format
    if (isNaN(Date.parse(options.start_date))) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }

    const result = await templatesService.applyTemplateToProject(templateId, options, userId);
    return res.json(result);
  } catch (error) {
    console.error(`Error in POST /allocation-templates/${req.params.id}/apply:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}/clone:
 *   post:
 *     summary: Clone an allocation template
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name for the cloned template
 *     responses:
 *       201:
 *         description: Template cloned successfully
 *       404:
 *         description: Template not found
 */
router.post('/:id/clone', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required for cloned template' });
    }

    const result = await templatesService.cloneTemplate(templateId, name, userId);
    return res.status(201).json(result);
  } catch (error) {
    console.error(`Error in POST /allocation-templates/${req.params.id}/clone:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/allocation-templates/{id}/rate:
 *   post:
 *     summary: Rate a template based on project usage
 *     tags: [Allocation Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - project_id
 *               - rating
 *             properties:
 *               project_id:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *       400:
 *         description: Invalid rating value
 *       404:
 *         description: Template usage record not found
 */
router.post('/:id/rate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = req.params.id;
    const { project_id, rating, feedback } = req.body;

    if (!project_id || !rating) {
      return res.status(400).json({ error: 'Project ID and rating are required' });
    }

    await templatesService.rateTemplate(templateId, project_id, rating, feedback, userId);
    return res.json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error(`Error in POST /allocation-templates/${req.params.id}/rate:`, error);
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;