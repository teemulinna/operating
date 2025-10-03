"use strict";
/**
 * Wrapper for AllocationService to make it compatible with dependency injection
 * Since AllocationService uses static methods, this wrapper provides instance methods
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationServiceWrapper = void 0;
const allocation_service_1 = require("./allocation.service");
class AllocationServiceWrapper {
    constructor() {
        // No database dependency needed since AllocationService manages its own dependencies
    }
    async createAllocation(input, force = false) {
        return allocation_service_1.AllocationService.createAllocation(input, force);
    }
    async getAllocation(id) {
        return allocation_service_1.AllocationService.getAllocation(id);
    }
    async getAllocationWithDetails(id) {
        return allocation_service_1.AllocationService.getAllocationWithDetails(id);
    }
    async getEmployeeAllocations(employeeId, filters = {}, page = 1, limit = 50) {
        return allocation_service_1.AllocationService.getEmployeeAllocations(employeeId, filters, page, limit);
    }
    async getProjectAllocations(projectId, filters = {}, page = 1, limit = 50) {
        return allocation_service_1.AllocationService.getProjectAllocations(projectId, filters, page, limit);
    }
    async getAllAllocations(filters = {}, page = 1, limit = 50) {
        return allocation_service_1.AllocationService.getAllAllocations(filters, page, limit);
    }
    async updateAllocation(id, updates) {
        return allocation_service_1.AllocationService.updateAllocation(id, updates);
    }
    async deleteAllocation(id) {
        return allocation_service_1.AllocationService.deleteAllocation(id);
    }
    async checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId) {
        return allocation_service_1.AllocationService.checkAllocationConflicts(employeeId, startDate, endDate, excludeAllocationId);
    }
    async validateCapacity(employeeId, allocatedHours, startDate, endDate, excludeAllocationId) {
        return allocation_service_1.AllocationService.validateCapacity(employeeId, allocatedHours, startDate, endDate, excludeAllocationId);
    }
    async getUtilizationSummary(startDate, endDate) {
        return allocation_service_1.AllocationService.getUtilizationSummary(startDate, endDate);
    }
    async getCapacityMetrics(employeeId, startDate, endDate) {
        return allocation_service_1.AllocationService.getCapacityMetrics(employeeId, startDate, endDate);
    }
    async confirmAllocation(id) {
        return allocation_service_1.AllocationService.confirmAllocation(id);
    }
    async completeAllocation(id, actualHours) {
        return allocation_service_1.AllocationService.completeAllocation(id, actualHours);
    }
    async cancelAllocation(id) {
        return allocation_service_1.AllocationService.cancelAllocation(id);
    }
    async checkOverAllocationWarnings(employeeId, startDate, endDate, allocatedHours) {
        return allocation_service_1.AllocationService.checkOverAllocationWarnings(employeeId, startDate, endDate, allocatedHours);
    }
    async getOverAllocationSummary(startDate, endDate) {
        return allocation_service_1.AllocationService.getOverAllocationSummary(startDate, endDate);
    }
    async exportAllocationsToCSV(options = {}) {
        return allocation_service_1.AllocationService.exportAllocationsToCSV(options);
    }
}
exports.AllocationServiceWrapper = AllocationServiceWrapper;
