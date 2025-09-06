import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { handleValidationErrors } from '../middleware/validate.middleware';

const router = Router();
const projectController = new ProjectController();

// Project validation rules
const createProjectValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Project name must be 1-200 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('clientName')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Client name must be less than 200 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid project priority'),
  body('budget')
    .optional()
    .isNumeric()
    .withMessage('Budget must be a number'),
  body('estimatedHours')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated hours must be a positive integer')
];

const updateProjectValidation = [
  ...createProjectValidation.map(rule => rule.optional())
];

const projectRoleValidation = [
  body('roleName')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Role name must be 1-100 characters'),
  body('requiredSkills')
    .optional()
    .isArray()
    .withMessage('Required skills must be an array'),
  body('minimumExperienceLevel')
    .optional()
    .isIn(['junior', 'intermediate', 'senior', 'expert'])
    .withMessage('Invalid experience level'),
  body('plannedAllocationPercentage')
    .isNumeric()
    .custom((value) => {
      if (value <= 0 || value > 100) {
        throw new Error('Allocation percentage must be between 1 and 100');
      }
      return true;
    })
];

const resourceAssignmentValidation = [
  body('employeeId')
    .isUUID()
    .withMessage('Employee ID must be a valid UUID'),
  body('assignmentType')
    .optional()
    .isIn(['employee', 'contractor', 'consultant', 'intern'])
    .withMessage('Invalid assignment type'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  body('plannedAllocationPercentage')
    .isNumeric()
    .custom((value) => {
      if (value <= 0 || value > 100) {
        throw new Error('Allocation percentage must be between 1 and 100');
      }
      return true;
    }),
  body('confidenceLevel')
    .optional()
    .isIn(['tentative', 'probable', 'confirmed'])
    .withMessage('Invalid confidence level')
];

// Apply authentication middleware to all routes
// router.use(authMiddleware); // Temporarily disabled for development

// Project CRUD routes
router.post('/', createProjectValidation, handleValidationErrors, projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', 
  param('id').isNumeric().withMessage('Project ID must be a number'),
  projectController.getProjectById
);
router.put('/:id', 
  param('id').isNumeric().withMessage('Project ID must be a number'),
  updateProjectValidation,
  handleValidationErrors,
  projectController.updateProject
);
router.delete('/:id',
  param('id').isNumeric().withMessage('Project ID must be a number'),
  projectController.deleteProject
);

// Project roles routes
router.post('/:id/roles',
  param('id').isNumeric().withMessage('Project ID must be a number'),
  projectRoleValidation,
  handleValidationErrors,
  projectController.addProjectRole
);
router.get('/:id/roles',
  param('id').isNumeric().withMessage('Project ID must be a number'),
  projectController.getProjectRoles
);

// Resource assignment routes
router.post('/:id/assignments',
  param('id').isNumeric().withMessage('Project ID must be a number'),
  resourceAssignmentValidation,
  handleValidationErrors,
  projectController.assignEmployeeToProject
);
router.get('/:id/assignments',
  param('id').isNumeric().withMessage('Project ID must be a number'),
  projectController.getProjectAssignments
);

export { router as projectRoutes };