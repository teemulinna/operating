"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationService = void 0;
const types_1 = require("../types");
const working_allocation_model_1 = require("../models/working-allocation.model");
const Project_1 = require("../models/Project");
const over_allocation_warning_service_1 = require("./over-allocation-warning.service");
class AllocationService {
    constructor(db) {
        this.db = db;
    }
    async createAllocation(input, force = false) {
        const validationErrors = this.validateAllocationInput(input);
        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
        }
        const employeeResult = await this.db.query('SELECT id FROM employees WHERE id = $1', [input.employeeId]);
        if (employeeResult.rows.length === 0) {
            throw new Error('Employee not found');
        }
        const projectResult = await this.db.query('SELECT id FROM projects WHERE id = $1', [input.projectId]);
        if (projectResult.rows.length === 0) {
            throw new Error('Project not found');
        }
        if (!force) {
            await this.validateBusinessRules(input);
        }
        const query = `
      INSERT INTO resource_allocations (
        employee_id, project_id, start_date, end_date,
        allocation_percentage, role, billable_rate, status,
        notes, utilization_target, allocated_hours
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
        const values = [
            input.employeeId,
            input.projectId,
            input.startDate,
            input.endDate,
            input.allocationPercentage || 100,
            input.role || input.roleOnProject || 'Team Member',
            input.billableRate || input.hourlyRate,
            input.status || 'active',
            input.notes,
            input.utilizationTarget,
            input.allocatedHours || 40
        ];
        const result = await this.db.query(query, values);
        if (!result.rows.length) {
            throw new Error('Failed to create allocation');
        }
        return result.rows[0];
    }
    async getAllocationById(id) {
        const result = await this.db.query('SELECT * FROM resource_allocations WHERE id = $1', [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    async getAllocationWithDetails(id) {
        return working_allocation_model_1.WorkingAllocationModel.findByIdWithDetails(id);
    }
    async getAllocations(filters = {}) {
        const { employeeId, page = 1, limit = 50 } = filters;
        if (employeeId) {
            const result = await this.db.query('SELECT * FROM resource_allocations WHERE employee_id = $1 ORDER BY start_date', [employeeId]);
            return {
                data: result.rows,
                total: result.rows.length,
                page,
                limit
            };
        }
        const result = await this.db.query('SELECT * FROM resource_allocations ORDER BY start_date LIMIT $1 OFFSET $2', [limit, (page - 1) * limit]);
        return {
            data: result.rows,
            total: result.rows.length,
            page,
            limit
        };
    }
    static async getProjectAllocations(projectId, filters = {}, page = 1, limit = 50) {
        const project = await Project_1.ProjectModel.findById(projectId);
        if (!project) {
            throw new types_1.DatabaseError('Project not found');
        }
        return working_allocation_model_1.WorkingAllocationModel.findByProjectId(projectId, filters, page, limit);
    }
    static async getAllAllocations(filters = {}, page = 1, limit = 50) {
        return working_allocation_model_1.WorkingAllocationModel.findAll(filters, page, limit);
    }
    async updateAllocation(id, updates) {
        const updateFields = [];
        const queryParams = [];
        let paramIndex = 1;
        const fieldMapping = {
            allocationPercentage: 'allocation_percentage',
            billableRate: 'billable_rate',
            roleOnProject: 'role',
            allocatedHours: 'allocated_hours',
            actualHours: 'actual_hours',
            startDate: 'start_date',
            endDate: 'end_date',
            utilizationTarget: 'utilization_target'
        };
        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                const dbField = fieldMapping[key] || key;
                updateFields.push(`${dbField} = $${paramIndex}`);
                queryParams.push(value);
                paramIndex++;
            }
        });
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        const query = `
      UPDATE resource_allocations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        queryParams.push(id);
        const result = await this.db.query(query, queryParams);
        if (!result.rows.length) {
            throw new Error('Allocation not found');
        }
        return result.rows[0];
    }
    async deleteAllocation(id) {
        const result = await this.db.query('DELETE FROM resource_allocations WHERE id = $1 RETURNING *', [id]);
        if (!result.rows.length) {
            throw new Error('Allocation not found');
        }
        return result.rows[0];
    }
    static async checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId) {
        const conflicts = await working_allocation_model_1.WorkingAllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
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
        const metrics = await working_allocation_model_1.WorkingAllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
        const employeeMetrics = metrics.find(m => m.employeeId === employeeId);
        const currentAllocatedHours = employeeMetrics?.totalAllocatedHours || 0;
        const utilizationRate = ((currentAllocatedHours + allocatedHours) / maxCapacityHours) * 100;
        if (utilizationRate > 100) {
            warnings.push(`Over-allocation detected: ${utilizationRate.toFixed(1)}% capacity (${currentAllocatedHours + allocatedHours}/${maxCapacityHours} hours)`);
        }
        else if (utilizationRate > 80) {
            warnings.push(`High utilization: ${utilizationRate.toFixed(1)}% capacity`);
        }
        const conflicts = await working_allocation_model_1.WorkingAllocationModel.checkOverlaps(employeeId, startDate, endDate, excludeAllocationId);
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
        const metrics = await working_allocation_model_1.WorkingAllocationModel.getUtilizationMetrics(undefined, startDate, endDate);
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
        return working_allocation_model_1.WorkingAllocationModel.getUtilizationMetrics(employeeId, startDate, endDate);
    }
    static async confirmAllocation(id) {
        return working_allocation_model_1.WorkingAllocationModel.updateStatus(id, working_allocation_model_1.AllocationStatus.ACTIVE);
    }
    static async completeAllocation(id, actualHours) {
        if (actualHours !== undefined) {
            await working_allocation_model_1.WorkingAllocationModel.update(id, { actualHours });
        }
        return working_allocation_model_1.WorkingAllocationModel.updateStatus(id, working_allocation_model_1.AllocationStatus.COMPLETED);
    }
    static async cancelAllocation(id) {
        return working_allocation_model_1.WorkingAllocationModel.updateStatus(id, working_allocation_model_1.AllocationStatus.CANCELLED);
    }
    validateAllocationInput(input) {
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
        if (input.allocatedHours !== undefined && input.allocatedHours <= 0) {
            errors.push({
                field: 'allocatedHours',
                message: 'Allocated hours must be greater than 0',
                value: input.allocatedHours
            });
        }
        if (input.allocatedHours !== undefined && input.allocatedHours > 1000) {
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
    async validateBusinessRules(input) {
        const projectResult = await this.db.query('SELECT start_date, end_date FROM projects WHERE id = $1', [input.projectId]);
        if (projectResult.rows.length > 0) {
            const project = projectResult.rows[0];
            if (input.startDate < new Date(project.start_date)) {
                throw new Error('Allocation start date cannot be before project start date');
            }
            if (project.end_date && input.endDate > new Date(project.end_date)) {
                throw new Error('Allocation end date cannot be after project end date');
            }
        }
        const employeeResult = await this.db.query('SELECT is_active FROM employees WHERE id = $1', [input.employeeId]);
        if (employeeResult.rows.length > 0) {
            const employee = employeeResult.rows[0];
            if (!employee.is_active) {
                throw new Error('Cannot allocate to inactive employee');
            }
        }
        if (input.startDate && input.endDate) {
            const overlapResult = await this.db.query(`
        SELECT id FROM resource_allocations
        WHERE employee_id = $1
        AND status IN ('active', 'planned')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
      `, [input.employeeId, input.startDate, input.endDate]);
            if (overlapResult.rows.length > 0) {
                throw new Error('Employee has overlapping allocations in this date range');
            }
        }
    }
    static async checkOverAllocationWarnings(employeeId, startDate, endDate, allocatedHours) {
        const warningService = new over_allocation_warning_service_1.OverAllocationWarningService();
        const warnings = [];
        const weeks = over_allocation_warning_service_1.OverAllocationWarningService['getWeeksBetween'](startDate, endDate);
        for (const week of weeks) {
            const warning = await warningService.checkWeeklyOverAllocation(employeeId, week.weekStartDate, week.weekEndDate);
            if (warning) {
                warnings.push(warning);
            }
        }
        return warnings;
    }
    static async getOverAllocationSummary(startDate, endDate) {
        const warningService = new over_allocation_warning_service_1.OverAllocationWarningService();
        return warningService.getScheduleViewWarnings(startDate, endDate);
    }
    static async exportAllocationsToCSV(options = {}) {
        const { AllocationCSVExportService } = await Promise.resolve().then(() => __importStar(require('./allocation-csv-export.service')));
        return AllocationCSVExportService.exportAllocationsToCSV(options);
    }
    static async getEmployeeAllocations(employeeId, filters = {}, page = 1, limit = 50) {
        return working_allocation_model_1.WorkingAllocationModel.findByEmployeeId(employeeId, filters, page, limit);
    }
    static async getAllocation(id) {
        return working_allocation_model_1.WorkingAllocationModel.findById(id);
    }
    static async getAllocationWithDetails(id) {
        return working_allocation_model_1.WorkingAllocationModel.findByIdWithDetails(id);
    }
    static async createAllocation(input, force = false) {
        return working_allocation_model_1.WorkingAllocationModel.create(input);
    }
    static async updateAllocation(id, updates) {
        return working_allocation_model_1.WorkingAllocationModel.update(id, updates);
    }
    static async deleteAllocation(id) {
        return working_allocation_model_1.WorkingAllocationModel.delete(id);
    }
}
exports.AllocationService = AllocationService;
//# sourceMappingURL=allocation.service.js.map