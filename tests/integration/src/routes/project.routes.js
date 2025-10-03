"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const project_controller_1 = require("../controllers/project.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
exports.projectRoutes = router;
const projectController = new project_controller_1.ProjectController();
// Project validation rules
const createProjectValidation = [
    (0, express_validator_1.body)('name')
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Project name must be 1-200 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Description must be less than 1000 characters'),
    (0, express_validator_1.body)('clientName')
        .optional()
        .isString()
        .isLength({ max: 200 })
        .withMessage('Client name must be less than 200 characters'),
    (0, express_validator_1.body)('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    (0, express_validator_1.body)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
        .withMessage('Invalid project status'),
    (0, express_validator_1.body)('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Invalid project priority'),
    (0, express_validator_1.body)('budget')
        .optional()
        .isNumeric()
        .withMessage('Budget must be a number'),
    (0, express_validator_1.body)('estimatedHours')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Estimated hours must be a positive integer')
];
const updateProjectValidation = [
    ...createProjectValidation.map(rule => rule.optional())
];
const projectRoleValidation = [
    (0, express_validator_1.body)('roleName')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Role name must be 1-100 characters'),
    (0, express_validator_1.body)('requiredSkills')
        .optional()
        .isArray()
        .withMessage('Required skills must be an array'),
    (0, express_validator_1.body)('minimumExperienceLevel')
        .optional()
        .isIn(['junior', 'intermediate', 'senior', 'expert'])
        .withMessage('Invalid experience level'),
    (0, express_validator_1.body)('plannedAllocationPercentage')
        .isNumeric()
        .custom((value) => {
        if (value <= 0 || value > 100) {
            throw new Error('Allocation percentage must be between 1 and 100');
        }
        return true;
    })
];
const resourceAssignmentValidation = [
    (0, express_validator_1.body)('employeeId')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    (0, express_validator_1.body)('assignmentType')
        .optional()
        .isIn(['employee', 'contractor', 'consultant', 'intern'])
        .withMessage('Invalid assignment type'),
    (0, express_validator_1.body)('startDate')
        .isISO8601()
        .withMessage('Start date must be a valid date'),
    (0, express_validator_1.body)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date'),
    (0, express_validator_1.body)('plannedAllocationPercentage')
        .isNumeric()
        .custom((value) => {
        if (value <= 0 || value > 100) {
            throw new Error('Allocation percentage must be between 1 and 100');
        }
        return true;
    }),
    (0, express_validator_1.body)('confidenceLevel')
        .optional()
        .isIn(['tentative', 'probable', 'confirmed'])
        .withMessage('Invalid confidence level')
];
// Apply authentication middleware to all routes
// router.use(authMiddleware); // Temporarily disabled for development
// Project CRUD routes
router.post('/', createProjectValidation, validate_middleware_1.handleValidationErrors, projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), projectController.getProjectById);
router.put('/:id', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), updateProjectValidation, validate_middleware_1.handleValidationErrors, projectController.updateProject);
router.delete('/:id', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), projectController.deleteProject);
// Project roles routes
router.post('/:id/roles', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), projectRoleValidation, validate_middleware_1.handleValidationErrors, projectController.addProjectRole);
router.get('/:id/roles', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), projectController.getProjectRoles);
// Resource assignment routes
router.post('/:id/assignments', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), resourceAssignmentValidation, validate_middleware_1.handleValidationErrors, projectController.assignEmployeeToProject);
router.get('/:id/assignments', (0, express_validator_1.param)('id').isNumeric().withMessage('Project ID must be a number'), projectController.getProjectAssignments);
