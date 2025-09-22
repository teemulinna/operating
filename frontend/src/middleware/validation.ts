import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Generic validation middleware to check for errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Employee validation rules
export const validateEmployeeCreate = [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be less than 100 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('salary')
    .optional()
    .isNumeric()
    .withMessage('Salary must be a number')
    .isFloat({ min: 0 })
    .withMessage('Salary must be positive'),
  handleValidationErrors
];

export const validateEmployeeUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid employee ID'),
  ...validateEmployeeCreate.slice(0, -1), // Reuse create validators except the error handler
  handleValidationErrors
];

export const validateEmployeeId = [
  param('id')
    .isUUID()
    .withMessage('Invalid employee ID'),
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .escape(),
  query('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department filter must be less than 100 characters'),
  query('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position filter must be less than 100 characters'),
  handleValidationErrors
];

// Project validation rules
export const validateProjectCreate = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 200 })
    .withMessage('Project name must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.start_date && new Date(value) < new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('budget')
    .optional()
    .isNumeric()
    .withMessage('Budget must be a number')
    .isFloat({ min: 0 })
    .withMessage('Budget must be positive'),
  handleValidationErrors
];

export const validateProjectUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID'),
  ...validateProjectCreate.slice(0, -1),
  handleValidationErrors
];

export const validateProjectId = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID'),
  handleValidationErrors
];

// Allocation validation rules
export const validateAllocationCreate = [
  body('employee_id')
    .notEmpty()
    .withMessage('Employee ID is required')
    .isUUID()
    .withMessage('Invalid employee ID'),
  body('project_id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('hours')
    .notEmpty()
    .withMessage('Hours are required')
    .isNumeric()
    .withMessage('Hours must be a number')
    .isFloat({ min: 0, max: 40 })
    .withMessage('Hours must be between 0 and 40'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be a valid date'),
  body('status')
    .optional()
    .isIn(['active', 'pending', 'completed'])
    .withMessage('Invalid allocation status'),
  handleValidationErrors
];

export const validateAllocationUpdate = [
  param('id')
    .isUUID()
    .withMessage('Invalid allocation ID'),
  ...validateAllocationCreate.slice(0, -1),
  handleValidationErrors
];

export const validateAllocationId = [
  param('id')
    .isUUID()
    .withMessage('Invalid allocation ID'),
  handleValidationErrors
];

// Date range validation
export const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.query?.start_date && new Date(value) < new Date(req.query.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateEmployeeId,
  validateProjectCreate,
  validateProjectUpdate,
  validateProjectId,
  validateAllocationCreate,
  validateAllocationUpdate,
  validateAllocationId,
  validatePagination,
  validateSearch,
  validateDateRange
};