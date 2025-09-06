"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationService = void 0;
const types_1 = require("../types");
const allocation_model_1 = require("../models/allocation.model");
const Employee_1 = require("../models/Employee");
const Project_1 = require("../models/Project");
class AllocationService {
    static async createAllocation(input, force = false) {
        const validationErrors = this.validateAllocationInput(input);
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        }
        const employee = await Employee_1.EmployeeModel.findById(input.employeeId);
        if (!employee) {
            throw new types_1.DatabaseError('Employee not found');
        }
        const project = await Project_1.ProjectModel.findById(input.projectId);
        if (!project) {
            throw new types_1.DatabaseError('Project not found');
        }
        await this.validateBusinessRules(input);
        if (force) {
            return allocation_model_1.AllocationModel.createForced(input);
        }
        return allocation_model_1.AllocationModel.create(input);
    }
    static async getAllocation(id) {
        return allocation_model_1.AllocationModel.findById(id);
    }
    static async getAllocationWithDetails(id) {
        return allocation_model_1.AllocationModel.findByIdWithDetails(id);
    }
    static async getEmployeeAllocations(employeeId, filters = {}, page = 1, limit = 50) {
        const employee = await Employee_1.EmployeeModel.findById(employeeId);
        if (!employee) {
            throw new types_1.DatabaseError('Employee not found');
        }
        return allocation_model_1.AllocationModel.findByEmployeeId(employeeId, filters, page, limit);
    }
    static async getProjectAllocations(projectId, filters = {}, page = 1, limit = 50) {
        const project = await Project_1.ProjectModel.findById(projectId);
        if (!project) {
            throw new types_1.DatabaseError('Project not found');
        }
        return allocation_model_1.AllocationModel.findByProjectId(projectId, filters, page, limit);
    }
    static async getAllAllocations(filters = {}, page = 1, limit = 50) {
        return allocation_model_1.AllocationModel.findAll(filters, page, limit);
    }
    static async updateAllocation(id, updates) {
        const currentAllocation = await allocation_model_1.AllocationModel.findById(id);
        if (!currentAllocation) {
            throw new types_1.DatabaseError('Allocation not found');
        }
        if (updates.startDate || updates.endDate) {
            const startDate = updates.startDate || currentAllocation.startDate;
            const endDate = updates.endDate || currentAllocation.endDate;
            const conflicts = await allocation_model_1.AllocationModel.checkOverlaps(currentAllocation.employeeId, startDate, endDate, id);
            if (conflicts.length > 0) {
                throw new types_1.DatabaseError(`Date update would create conflicts with ${conflicts.length} existing allocation(s)`);
            }
        }
        return allocation_model_1.AllocationModel.update(id, updates);
    }
    static async deleteAllocation(id) {
        const allocation = await allocation_model_1.AllocationModel.findById(id);
        if (!allocation) {
            throw new types_1.DatabaseError('Allocation not found');
        }
        return allocation_model_1.AllocationModel.delete(id);
    }
    static async checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId) {
        const conflicts = await allocation_model_1.AllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
        const suggestions = [];
        if (conflicts.length > 0) {
            suggestions.push(`Found ${conflicts.length} conflicting allocation(s)`);
            for (const conflict of conflicts) {
                const daysOverlap = Math.abs(Math.min(endDate.getTime(), conflict.endDate.getTime()) -
                    Math.max(startDate.getTime(), conflict.startDate.getTime())) / (1000 * 60 * 60 * 24);
                suggestions.push(`Conflict with "${conflict.projectName}" (${conflict.startDate.toISOString().split('T')[0]} to ${conflict.endDate.toISOString().split('T')[0]}, ${daysOverlap} days overlap)`);
            }
            if (conflicts.length > 0) {
                const latestEndDate = Math.max(...conflicts.map(c => c.endDate.getTime()));
                const suggestedStartDate = new Date(latestEndDate + 24 * 60 * 60 * 1000);
                suggestions.push(`Consider starting after ${suggestedStartDate.toISOString().split('T')[0]}`);
            }
        }
        return {
            hasConflicts: conflicts.length > 0,
            conflicts,
            suggestions
        };
    }
    static async validateCapacity(employeeId, allocatedHours, startDate, endDate, excludeAllocationId) {
        const warnings = [];
        const maxCapacityHours = 40;
        const metrics = await allocation_model_1.AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
        const employeeMetrics = metrics.find(m => m.employeeId === employeeId);
        const currentAllocatedHours = employeeMetrics?.totalAllocatedHours || 0;
        const utilizationRate = ((currentAllocatedHours + allocatedHours) / maxCapacityHours) * 100;
        if (utilizationRate > 100) {
            warnings.push(`Over-allocation detected: ${utilizationRate.toFixed(1)}% capacity (${currentAllocatedHours + allocatedHours}/${maxCapacityHours} hours)`);
        }
        else if (utilizationRate > 80) {
            warnings.push(`High utilization: ${utilizationRate.toFixed(1)}% capacity`);
        }
        const conflicts = await allocation_model_1.AllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
        if (conflicts.length > 0) {
            warnings.push(`${conflicts.length} scheduling conflict(s) detected`);
        }
        return {
            isValid: utilizationRate <= 100 && conflicts.length === 0,
            warnings,
            maxCapacityHours,
            currentAllocatedHours,
            utilizationRate
        };
    }
    static async getUtilizationSummary(startDate, endDate) {
        const metrics = await allocation_model_1.AllocationModel.getUtilizationMetrics(undefined, startDate, endDate);
        const totalEmployees = metrics.length;
        const averageUtilization = metrics.reduce((sum, m) => sum + m.utilizationRate, 0) / totalEmployees;
        const overutilizedCount = metrics.filter(m => m.utilizationRate > 100).length;
        const underutilizedCount = metrics.filter(m => m.utilizationRate < 70).length;
        const totalAllocations = metrics.reduce((sum, m) => sum + m.activeAllocations, 0);
        const conflictsCount = metrics.reduce((sum, m) => sum + m.conflictCount, 0);
        return {
            totalEmployees: totalEmployees || 0,
            averageUtilization: averageUtilization || 0,
            overutilizedCount,
            underutilizedCount,
            totalAllocations,
            conflictsCount
        };
    }
    static async getCapacityMetrics(employeeId, startDate, endDate) {
        return allocation_model_1.AllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
    }
    static async confirmAllocation(id) {
        return allocation_model_1.AllocationModel.updateStatus(id, allocation_model_1.AllocationStatus.CONFIRMED);
    }
    static async completeAllocation(id, actualHours) {
        if (actualHours !== undefined) {
            await allocation_model_1.AllocationModel.update(id, { actualHours });
        }
        return allocation_model_1.AllocationModel.updateStatus(id, allocation_model_1.AllocationStatus.COMPLETED);
    }
    static async cancelAllocation(id) {
        return allocation_model_1.AllocationModel.updateStatus(id, allocation_model_1.AllocationStatus.CANCELLED);
    }
    static validateAllocationInput(input) {
        const errors = [];
        if (!input.employeeId) {
            errors.push({
                field: 'employeeId',
                message: 'Employee ID is required',
                value: input.employeeId
            });
        }
        if (!input.projectId) {
            errors.push({
                field: 'projectId',
                message: 'Project ID is required',
                value: input.projectId
            });
        }
        if (!input.startDate) {
            errors.push({
                field: 'startDate',
                message: 'Start date is required',
                value: input.startDate
            });
        }
        if (!input.endDate) {
            errors.push({
                field: 'endDate',
                message: 'End date is required',
                value: input.endDate
            });
        }
        if (input.startDate && input.endDate && input.startDate >= input.endDate) {
            errors.push({
                field: 'endDate',
                message: 'End date must be after start date',
                value: input.endDate
            });
        }
        if (input.allocatedHours <= 0) {
            errors.push({
                field: 'allocatedHours',
                message: 'Allocated hours must be greater than 0',
                value: input.allocatedHours
            });
        }
        if (input.allocatedHours > 1000) {
            errors.push({
                field: 'allocatedHours',
                message: 'Allocated hours seems unreasonably high (>1000)',
                value: input.allocatedHours
            });
        }
        if (!input.roleOnProject || input.roleOnProject.trim().length === 0) {
            errors.push({
                field: 'roleOnProject',
                message: 'Role on project is required',
                value: input.roleOnProject
            });
        }
        return errors;
    }
    static async validateBusinessRules(input) {
        const project = await Project_1.ProjectModel.findById(input.projectId);
        if (project) {
            if (input.startDate < project.startDate) {
                throw new types_1.DatabaseError('Allocation start date cannot be before project start date');
            }
            if (input.endDate > project.endDate) {
                throw new types_1.DatabaseError('Allocation end date cannot be after project end date');
            }
        }
        const employee = await Employee_1.EmployeeModel.findById(input.employeeId);
        if (employee && !employee.isActive) {
            throw new types_1.DatabaseError('Cannot allocate to inactive employee');
        }
    }
}
exports.AllocationService = AllocationService;
//# sourceMappingURL=allocation.service.js.map