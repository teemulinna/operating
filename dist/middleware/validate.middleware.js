"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEmployeeQuery = exports.validateIdParam = exports.validateCreateDepartment = exports.validateUpdateEmployee = exports.validateCreateEmployee = exports.actualHandleValidationErrors = exports.validate = exports.validateRequest = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
const api_error_1 = require("../utils/api-error");
const isValidUUID = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};
const handleValidationErrors = (req, _res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
exports.validateRequest = exports.handleValidationErrors;
exports.validate = exports.handleValidationErrors;
const actualHandleValidationErrors = (req, _res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.type === 'field' ? error.path : 'unknown',
            message: error.msg,
            value: error.type === 'field' ? error.value : undefined
        }));
        throw new api_error_1.ApiError(400, 'Validation failed', errorMessages);
    }
    next();
};
exports.actualHandleValidationErrors = actualHandleValidationErrors;
exports.validateCreateEmployee = [
    (0, express_validator_1.body)('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('position')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Position must be between 2 and 100 characters'),
    (0, express_validator_1.body)('departmentId')
        .isString()
        .trim()
        .custom((value) => {
        if (!isValidUUID(value)) {
            throw new Error('Department ID must be a valid UUID');
        }
        return true;
    })
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.body)('salary')
        .isFloat({ min: 0, max: 10000000 })
        .withMessage('Salary must be a positive number less than 10,000,000'),
    (0, express_validator_1.body)('defaultHoursPerWeek')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Default hours per week must be between 1 and 100'),
    (0, express_validator_1.body)('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array')
        .custom((skills) => {
        if (skills && skills.length > 20) {
            throw new Error('Maximum 20 skills allowed');
        }
        if (skills && skills.some((skill) => typeof skill !== 'string' || skill.length > 50)) {
            throw new Error('Each skill must be a string with maximum 50 characters');
        }
        return true;
    }),
    exports.handleValidationErrors
];
exports.validateUpdateEmployee = [
    (0, express_validator_1.body)('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('position')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Position must be between 2 and 100 characters'),
    (0, express_validator_1.body)('departmentId')
        .optional()
        .isString()
        .trim()
        .custom((value) => {
        if (value && !isValidUUID(value)) {
            throw new Error('Department ID must be a valid UUID');
        }
        return true;
    })
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.body)('salary')
        .optional()
        .isFloat({ min: 0, max: 10000000 })
        .withMessage('Salary must be a positive number less than 10,000,000'),
    (0, express_validator_1.body)('skills')
        .optional()
        .isArray()
        .withMessage('Skills must be an array')
        .custom((skills) => {
        if (skills && skills.length > 20) {
            throw new Error('Maximum 20 skills allowed');
        }
        if (skills && skills.some((skill) => typeof skill !== 'string' || skill.length > 50)) {
            throw new Error('Each skill must be a string with maximum 50 characters');
        }
        return true;
    }),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value'),
    exports.handleValidationErrors
];
exports.validateCreateDepartment = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Department name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    (0, express_validator_1.body)('managerId')
        .optional()
        .isString()
        .trim()
        .custom((value) => {
        if (value && !isValidUUID(value)) {
            throw new Error('Manager ID must be a valid UUID');
        }
        return true;
    })
        .withMessage('Manager ID must be a valid UUID'),
    exports.handleValidationErrors
];
exports.validateIdParam = [
    (0, express_validator_1.param)('id')
        .isString()
        .trim()
        .custom((value) => {
        if (!isValidUUID(value)) {
            throw new Error('ID must be a valid UUID');
        }
        return true;
    })
        .withMessage('ID must be a valid UUID'),
    exports.handleValidationErrors
];
exports.validateEmployeeQuery = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    (0, express_validator_1.query)('departmentId')
        .optional()
        .isString()
        .trim()
        .custom((value) => {
        if (value && !isValidUUID(value)) {
            throw new Error('Department ID must be a valid UUID');
        }
        return true;
    })
        .withMessage('Department ID must be a valid UUID'),
    (0, express_validator_1.query)('salaryMin')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Minimum salary must be a positive number'),
    (0, express_validator_1.query)('salaryMax')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Maximum salary must be a positive number'),
    (0, express_validator_1.query)('sortBy')
        .optional()
        .isIn(['firstName', 'lastName', 'salary', 'hireDate'])
        .withMessage('Sort by must be one of: firstName, lastName, salary, hireDate'),
    (0, express_validator_1.query)('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    (0, express_validator_1.query)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean value'),
    exports.handleValidationErrors
];
//# sourceMappingURL=validate.middleware.js.map