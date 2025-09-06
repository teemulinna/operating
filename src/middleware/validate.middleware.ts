import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ApiError } from '../utils/api-error';

// Validation helper
export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }
  next();
};

// Export validateRequest for backward compatibility
export const validateRequest = handleValidationErrors;

export const actualHandleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));
    
    throw new ApiError(400, 'Validation failed', errorMessages);
  }
  next();
};

// Employee validation rules
export const validateCreateEmployee = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('position')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),
  
  body('departmentId')
    .isInt({ min: 1 })
    .withMessage('Department ID must be a positive integer'),
  
  body('salary')
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Salary must be a positive number less than 10,000,000'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array')
    .custom((skills) => {
      if (skills && skills.length > 20) {
        throw new Error('Maximum 20 skills allowed');
      }
      if (skills && skills.some((skill: any) => typeof skill !== 'string' || skill.length > 50)) {
        throw new Error('Each skill must be a string with maximum 50 characters');
      }
      return true;
    }),
  
  handleValidationErrors
];

export const validateUpdateEmployee = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('position')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),
  
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Department ID must be a positive integer'),
  
  body('salary')
    .optional()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Salary must be a positive number less than 10,000,000'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array')
    .custom((skills) => {
      if (skills && skills.length > 20) {
        throw new Error('Maximum 20 skills allowed');
      }
      if (skills && skills.some((skill: any) => typeof skill !== 'string' || skill.length > 50)) {
        throw new Error('Each skill must be a string with maximum 50 characters');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  handleValidationErrors
];

// Department validation rules
export const validateCreateDepartment = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('managerId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Manager ID must be a positive integer'),
  
  handleValidationErrors
];

// Parameter validation
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  
  handleValidationErrors
];

// Query validation
export const validateEmployeeQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Department ID must be a positive integer'),
  
  query('salaryMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),
  
  query('salaryMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),
  
  query('sortBy')
    .optional()
    .isIn(['firstName', 'lastName', 'salary', 'hireDate'])
    .withMessage('Sort by must be one of: firstName, lastName, salary, hireDate'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  handleValidationErrors
];
