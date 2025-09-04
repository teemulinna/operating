import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// Employee validation rules
export const validateEmployee = [
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),
  
  body('departmentId')
    .notEmpty()
    .withMessage('Department ID is required')
    .isMongoId()
    .withMessage('Please provide a valid department ID'),
  
  body('salary')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  
  body('hireDate')
    .isISO8601()
    .withMessage('Please provide a valid hire date'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'terminated'])
    .withMessage('Status must be active, inactive, or terminated'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  
  body('managerId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid manager ID'),

  handleValidationErrors
];

export const validateEmployeeUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('position')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Position must be between 2 and 100 characters'),
  
  body('departmentId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid department ID'),
  
  body('salary')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  
  body('hireDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid hire date'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'terminated'])
    .withMessage('Status must be active, inactive, or terminated'),
  
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  
  body('managerId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid manager ID'),

  handleValidationErrors
];

// Department validation rules
export const validateDepartment = [
  body('name')
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Department name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('managerId')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid manager ID'),
  
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),

  handleValidationErrors
];

// Skill validation rules
export const validateSkill = [
  body('name')
    .notEmpty()
    .withMessage('Skill name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Skill name must be between 2 and 100 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('level')
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Level must be beginner, intermediate, advanced, or expert'),

  handleValidationErrors
];

// Query validation rules
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors
];

export const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('department')
    .optional()
    .isMongoId()
    .withMessage('Department must be a valid ID'),
  
  query('status')
    .optional()
    .isIn(['active', 'inactive', 'terminated'])
    .withMessage('Status must be active, inactive, or terminated'),
  
  query('salaryMin')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),
  
  query('salaryMax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),

  handleValidationErrors
];

// ID validation
export const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Please provide a valid ID'),

  handleValidationErrors
];

// Auth validation
export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['admin', 'hr', 'manager', 'employee'])
    .withMessage('Role must be admin, hr, manager, or employee'),

  handleValidationErrors
];