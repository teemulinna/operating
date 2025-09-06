"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.capacityFiltersSchema = exports.skillFiltersSchema = exports.employeeFiltersSchema = exports.updateCapacityHistorySchema = exports.createCapacityHistorySchema = exports.updateEmployeeSkillSchema = exports.createEmployeeSkillSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = exports.updateSkillSchema = exports.createSkillSchema = exports.updateDepartmentSchema = exports.createDepartmentSchema = void 0;
exports.validateInput = validateInput;
exports.validateQuery = validateQuery;
exports.validateProficiencyProgression = validateProficiencyProgression;
exports.validateCapacityConstraints = validateCapacityConstraints;
exports.validateDepartmentHierarchy = validateDepartmentHierarchy;
exports.validateSkillRelevance = validateSkillRelevance;
exports.isValidEmail = isValidEmail;
exports.isValidDateRange = isValidDateRange;
exports.isValidHireDate = isValidHireDate;
const joi_1 = __importDefault(require("joi"));
const types_1 = require("../types");
// Department validation schemas
exports.createDepartmentSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    managerId: joi_1.default.string().uuid().optional()
});
exports.updateDepartmentSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    description: joi_1.default.string().max(500).optional().allow(null),
    managerId: joi_1.default.string().uuid().optional().allow(null),
    isActive: joi_1.default.boolean().optional()
});
// Skill validation schemas
exports.createSkillSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    category: joi_1.default.string().valid(...Object.values(types_1.SkillCategory)).required()
});
exports.updateSkillSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    description: joi_1.default.string().max(500).optional().allow(null),
    category: joi_1.default.string().valid(...Object.values(types_1.SkillCategory)).optional(),
    isActive: joi_1.default.boolean().optional()
});
// Employee validation schemas
exports.createEmployeeSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50).required(),
    lastName: joi_1.default.string().min(2).max(50).required(),
    email: joi_1.default.string().email().max(255).required(),
    departmentId: joi_1.default.string().uuid().required(),
    position: joi_1.default.string().min(2).max(100).required(),
    hireDate: joi_1.default.date().max('now').required()
});
exports.updateEmployeeSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(2).max(50).optional(),
    lastName: joi_1.default.string().min(2).max(50).optional(),
    email: joi_1.default.string().email().max(255).optional(),
    departmentId: joi_1.default.string().uuid().optional(),
    position: joi_1.default.string().min(2).max(100).optional(),
    isActive: joi_1.default.boolean().optional()
});
// Employee skill validation schemas
exports.createEmployeeSkillSchema = joi_1.default.object({
    employeeId: joi_1.default.string().uuid().required(),
    skillId: joi_1.default.string().uuid().required(),
    proficiencyLevel: joi_1.default.number().integer().min(1).max(5).required(),
    yearsOfExperience: joi_1.default.number().integer().min(0).max(50).required(),
    lastAssessed: joi_1.default.date().max('now').optional()
});
exports.updateEmployeeSkillSchema = joi_1.default.object({
    proficiencyLevel: joi_1.default.number().integer().min(1).max(5).optional(),
    yearsOfExperience: joi_1.default.number().integer().min(0).max(50).optional(),
    lastAssessed: joi_1.default.date().max('now').optional().allow(null),
    isActive: joi_1.default.boolean().optional()
});
// Capacity history validation schemas
exports.createCapacityHistorySchema = joi_1.default.object({
    employeeId: joi_1.default.string().uuid().required(),
    date: joi_1.default.date().required(),
    availableHours: joi_1.default.number().min(0).max(168).precision(2).required(), // Max hours in a week
    allocatedHours: joi_1.default.number().min(0).max(168).precision(2).required(),
    notes: joi_1.default.string().max(1000).optional()
}).custom((obj, helpers) => {
    if (obj.allocatedHours > obj.availableHours) {
        return helpers.error('any.invalid', { message: 'Allocated hours cannot exceed available hours' });
    }
    return obj;
});
exports.updateCapacityHistorySchema = joi_1.default.object({
    availableHours: joi_1.default.number().min(0).max(168).precision(2).optional(),
    allocatedHours: joi_1.default.number().min(0).max(168).precision(2).optional(),
    notes: joi_1.default.string().max(1000).optional().allow(null)
}).custom((obj, helpers) => {
    if (obj.allocatedHours !== undefined && obj.availableHours !== undefined && obj.allocatedHours > obj.availableHours) {
        return helpers.error('any.invalid', { message: 'Allocated hours cannot exceed available hours' });
    }
    return obj;
});
// Query parameter validation schemas
exports.employeeFiltersSchema = joi_1.default.object({
    departmentId: joi_1.default.string().uuid().optional(),
    position: joi_1.default.string().optional(),
    isActive: joi_1.default.boolean().optional(),
    skillIds: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
    minProficiencyLevel: joi_1.default.number().integer().min(1).max(5).optional()
});
exports.skillFiltersSchema = joi_1.default.object({
    category: joi_1.default.string().valid(...Object.values(types_1.SkillCategory)).optional(),
    isActive: joi_1.default.boolean().optional()
});
exports.capacityFiltersSchema = joi_1.default.object({
    employeeId: joi_1.default.string().uuid().optional(),
    dateFrom: joi_1.default.date().optional(),
    dateTo: joi_1.default.date().optional(),
    minUtilizationRate: joi_1.default.number().min(0).max(10).precision(4).optional(),
    maxUtilizationRate: joi_1.default.number().min(0).max(10).precision(4).optional()
});
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(50)
});
// Validation helper functions
function validateInput(schema, data) {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
    });
    if (error) {
        const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        const validationError = new Error('Validation failed');
        validationError.validationErrors = validationErrors;
        throw validationError;
    }
    return value;
}
function validateQuery(schema, query) {
    const { error, value } = schema.validate(query, {
        abortEarly: false,
        allowUnknown: true,
        convert: true
    });
    if (error) {
        const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        const validationError = new Error('Query validation failed');
        validationError.validationErrors = validationErrors;
        throw validationError;
    }
    return value;
}
// Business logic validation functions
function validateProficiencyProgression(currentLevel, newLevel, yearsOfExperience) {
    // Ensure proficiency level aligns with years of experience
    const expectedMinLevel = Math.min(5, Math.max(1, Math.floor(yearsOfExperience / 2) + 1));
    if (newLevel > expectedMinLevel + 1) {
        throw new Error(`Proficiency level ${newLevel} seems too high for ${yearsOfExperience} years of experience. ` +
            `Expected level: ${expectedMinLevel} or lower.`);
    }
    // Prevent dramatic level drops without justification
    if (currentLevel > newLevel && (currentLevel - newLevel) > 2) {
        throw new Error(`Cannot reduce proficiency level from ${currentLevel} to ${newLevel} without proper justification`);
    }
}
function validateCapacityConstraints(availableHours, allocatedHours, date) {
    // Check if it's a weekend (basic business rule)
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && availableHours > 16) {
        throw new Error('Available hours on weekends should not exceed 16 hours');
    }
    if (!isWeekend && availableHours > 12) {
        throw new Error('Available hours on weekdays should not exceed 12 hours per day');
    }
    // Check utilization rate warnings
    const utilizationRate = availableHours > 0 ? allocatedHours / availableHours : 0;
    if (utilizationRate > 1.1) {
        throw new Error('Allocation exceeds available capacity by more than 10%');
    }
    if (utilizationRate < 0.3 && allocatedHours > 0) {
        console.warn(`Low utilization rate (${(utilizationRate * 100).toFixed(1)}%) detected for date ${date.toISOString().split('T')[0]}`);
    }
}
function validateDepartmentHierarchy(managerId, departmentId) {
    // This would need database access to fully validate
    // For now, just ensure manager is not self-referencing
    if (managerId === departmentId) {
        throw new Error('Department cannot manage itself');
    }
}
function validateSkillRelevance(skillCategory, position) {
    const positionLower = position.toLowerCase();
    // Basic position-skill relevance validation
    const technicalPositions = ['developer', 'engineer', 'architect', 'programmer', 'analyst'];
    const managementPositions = ['manager', 'director', 'lead', 'supervisor'];
    const designPositions = ['designer', 'ux', 'ui', 'creative'];
    if (skillCategory === types_1.SkillCategory.TECHNICAL) {
        const isTechnicalRole = technicalPositions.some(role => positionLower.includes(role));
        if (!isTechnicalRole) {
            console.warn(`Technical skill assigned to non-technical position: ${position}`);
        }
    }
    if (skillCategory === types_1.SkillCategory.SOFT) {
        const isManagementRole = managementPositions.some(role => positionLower.includes(role));
        if (isManagementRole && position.toLowerCase().includes('manager')) {
            // Management roles should have soft skills - this is expected
            return;
        }
    }
}
// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
// Date validation helpers
function isValidDateRange(startDate, endDate) {
    return startDate <= endDate;
}
function isValidHireDate(hireDate) {
    const today = new Date();
    const hundredYearsAgo = new Date();
    hundredYearsAgo.setFullYear(today.getFullYear() - 100);
    return hireDate >= hundredYearsAgo && hireDate <= today;
}
//# sourceMappingURL=validation.js.map