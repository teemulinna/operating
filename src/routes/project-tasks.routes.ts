import { Router } from 'express';
import { ProjectTasksController } from '../controllers/project-tasks.controller';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validate.middleware';
import { TaskType, TaskStatus, TaskPriority } from '../models/ProjectTask';
import { DependencyType } from '../models/TaskDependency';

const router = Router();
const controller = new ProjectTasksController();

// Validation schemas
const projectIdValidation = param('projectId').isUUID().withMessage('Invalid project ID');
const taskIdValidation = param('taskId').isUUID().withMessage('Invalid task ID');
const dependencyIdValidation = param('dependencyId').isUUID().withMessage('Invalid dependency ID');

const createTaskValidation = [
  projectIdValidation,
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('taskType')
    .optional()
    .isIn(Object.values(TaskType))
    .withMessage(`Task type must be one of: ${Object.values(TaskType).join(', ')}`),
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),
  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('plannedStartDate')
    .optional()
    .isISO8601()
    .withMessage('Planned start date must be a valid ISO 8601 date'),
  body('plannedEndDate')
    .optional()
    .isISO8601()
    .withMessage('Planned end date must be a valid ISO 8601 date'),
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  body('effort')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Effort must be a non-negative number'),
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Assigned to must be a valid UUID'),
  body('parentTaskId')
    .optional()
    .isUUID()
    .withMessage('Parent task ID must be a valid UUID'),
  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a non-negative number'),
  body('budgetAllocated')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget allocated must be a non-negative number'),
  validateRequest
];

const updateTaskValidation = [
  taskIdValidation,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('taskType')
    .optional()
    .isIn(Object.values(TaskType))
    .withMessage(`Task type must be one of: ${Object.values(TaskType).join(', ')}`),
  body('status')
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(`Status must be one of: ${Object.values(TaskStatus).join(', ')}`),
  body('priority')
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(`Priority must be one of: ${Object.values(TaskPriority).join(', ')}`),
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer'),
  body('effort')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Effort must be a non-negative number'),
  validateRequest
];

const createDependencyValidation = [
  taskIdValidation,
  body('predecessorId')
    .isUUID()
    .withMessage('Predecessor ID is required and must be a valid UUID'),
  body('dependencyType')
    .optional()
    .isIn(Object.values(DependencyType))
    .withMessage(`Dependency type must be one of: ${Object.values(DependencyType).join(', ')}`),
  body('lagTime')
    .optional()
    .isInt()
    .withMessage('Lag time must be an integer (positive for lag, negative for lead)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  validateRequest
];

const scheduleOptionsValidation = [
  projectIdValidation,
  body('optimizeFor')
    .optional()
    .isIn(['duration', 'cost', 'resources'])
    .withMessage('Optimize for must be one of: duration, cost, resources'),
  body('allowParallelTasks')
    .optional()
    .isBoolean()
    .withMessage('Allow parallel tasks must be a boolean'),
  body('maxResourceUtilization')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Max resource utilization must be between 0 and 1'),
  body('bufferTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Buffer time must be a non-negative integer'),
  body('workingDaysOnly')
    .optional()
    .isBoolean()
    .withMessage('Working days only must be a boolean'),
  validateRequest
];

// Task Routes
router.get('/projects/:projectId/tasks', 
  [
    projectIdValidation,
    query('status').optional().isIn(Object.values(TaskStatus)),
    query('taskType').optional().isIn(Object.values(TaskType)),
    query('assignedTo').optional().isUUID(),
    query('includeSubtasks').optional().isIn(['true', 'false']),
    query('sortBy').optional().isIn(['sortOrder', 'name', 'startDate', 'endDate', 'priority']),
    query('sortOrder').optional().isIn(['ASC', 'DESC']),
    validateRequest
  ],
  controller.getProjectTasks
);

router.get('/tasks/:taskId',
  [taskIdValidation, validateRequest],
  controller.getTask
);

router.post('/projects/:projectId/tasks',
  createTaskValidation,
  controller.createTask
);

router.put('/tasks/:taskId',
  updateTaskValidation,
  controller.updateTask
);

router.delete('/tasks/:taskId',
  [taskIdValidation, validateRequest],
  controller.deleteTask
);

// Dependency Routes
router.get('/tasks/:taskId/dependencies',
  [
    taskIdValidation,
    query('type').optional().isIn(['predecessors', 'successors', 'both']),
    validateRequest
  ],
  controller.getTaskDependencies
);

router.post('/tasks/:taskId/dependencies',
  createDependencyValidation,
  controller.createDependency
);

router.put('/dependencies/:dependencyId',
  [
    dependencyIdValidation,
    body('dependencyType')
      .optional()
      .isIn(Object.values(DependencyType))
      .withMessage(`Dependency type must be one of: ${Object.values(DependencyType).join(', ')}`),
    body('lagTime')
      .optional()
      .isInt()
      .withMessage('Lag time must be an integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('Is active must be a boolean'),
    validateRequest
  ],
  controller.updateDependency
);

router.delete('/dependencies/:dependencyId',
  [dependencyIdValidation, validateRequest],
  controller.deleteDependency
);

// Project Analysis Routes
router.get('/projects/:projectId/critical-path',
  [projectIdValidation, validateRequest],
  controller.getCriticalPath
);

router.get('/projects/:projectId/dependencies/validate',
  [projectIdValidation, validateRequest],
  controller.validateDependencies
);

router.get('/projects/:projectId/conflicts',
  [projectIdValidation, validateRequest],
  controller.detectConflicts
);

router.get('/projects/:projectId/dependency-graph',
  [projectIdValidation, validateRequest],
  controller.getDependencyGraph
);

// Schedule Management Routes
router.post('/projects/:projectId/auto-schedule',
  scheduleOptionsValidation,
  controller.autoSchedule
);

router.post('/projects/:projectId/apply-schedule',
  [
    projectIdValidation,
    body('recommendations')
      .isArray()
      .withMessage('Recommendations must be an array'),
    validateRequest
  ],
  controller.applySchedule
);

router.get('/projects/:projectId/schedule-summary',
  [projectIdValidation, validateRequest],
  controller.getScheduleSummary
);

router.post('/projects/:projectId/optimize-schedule',
  scheduleOptionsValidation,
  controller.optimizeSchedule
);

export default router;