"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityController = void 0;
const CapacityHistory_1 = require("../models/CapacityHistory");
const api_error_1 = require("../utils/api-error");
const async_handler_1 = require("../middleware/async-handler");
const express_validator_1 = require("express-validator");
class CapacityController {
}
exports.CapacityController = CapacityController;
_a = CapacityController;
CapacityController.getAllCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Invalid request parameters', errors.array());
    }
    const { employeeId, dateFrom, dateTo, minUtilization, maxUtilization } = req.query;
    const filters = {};
    if (employeeId)
        filters.employeeId = employeeId;
    if (dateFrom)
        filters.dateFrom = new Date(dateFrom);
    if (dateTo)
        filters.dateTo = new Date(dateTo);
    if (minUtilization)
        filters.minUtilizationRate = parseFloat(minUtilization);
    if (maxUtilization)
        filters.maxUtilizationRate = parseFloat(maxUtilization);
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findAll(filters);
    res.json({
        success: true,
        data: capacityData,
        count: capacityData.length,
        filters: filters,
        timestamp: new Date().toISOString()
    });
});
CapacityController.getEmployeeCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId } = req.params;
    const { dateFrom, dateTo } = req.query;
    if (!employeeId) {
        throw new api_error_1.ApiError(400, 'Employee ID is required');
    }
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findByEmployee(employeeId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    const summary = await CapacityHistory_1.CapacityHistoryModel.getUtilizationSummary(employeeId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    res.json({
        success: true,
        data: {
            capacity: capacityData,
            summary: summary
        },
        employeeId,
        timestamp: new Date().toISOString()
    });
});
CapacityController.createCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { employeeId, date, availableHours, allocatedHours, notes } = req.body;
    const capacityEntry = await CapacityHistory_1.CapacityHistoryModel.create({
        employeeId,
        date: new Date(date),
        availableHours,
        allocatedHours,
        notes
    });
    res.status(201).json({
        success: true,
        data: capacityEntry,
        message: 'Capacity entry created successfully',
        timestamp: new Date().toISOString()
    });
});
CapacityController.updateCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { id } = req.params;
    const { availableHours, allocatedHours, notes } = req.body;
    const updatedEntry = await CapacityHistory_1.CapacityHistoryModel.update(id, {
        availableHours,
        allocatedHours,
        notes
    });
    res.json({
        success: true,
        data: updatedEntry,
        message: 'Capacity entry updated successfully',
        timestamp: new Date().toISOString()
    });
});
CapacityController.deleteCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { id } = req.params;
    if (!id) {
        throw new api_error_1.ApiError(400, 'Capacity entry ID is required');
    }
    const deletedEntry = await CapacityHistory_1.CapacityHistoryModel.delete(id);
    res.json({
        success: true,
        data: deletedEntry,
        message: 'Capacity entry deleted successfully',
        timestamp: new Date().toISOString()
    });
});
CapacityController.bulkCreateCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new api_error_1.ApiError(400, 'Entries array is required and cannot be empty');
    }
    const processedEntries = entries.map(entry => ({
        ...entry,
        date: new Date(entry.date)
    }));
    const createdEntries = await CapacityHistory_1.CapacityHistoryModel.bulkCreate(processedEntries);
    res.status(201).json({
        success: true,
        data: createdEntries,
        count: createdEntries.length,
        message: `${createdEntries.length} capacity entries created successfully`,
        timestamp: new Date().toISOString()
    });
});
CapacityController.getUtilizationSummary = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId, dateFrom, dateTo } = req.query;
    const summary = await CapacityHistory_1.CapacityHistoryModel.getUtilizationSummary(employeeId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    res.json({
        success: true,
        data: summary,
        filters: { employeeId, dateFrom, dateTo },
        timestamp: new Date().toISOString()
    });
});
CapacityController.getTeamCapacityTrends = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { departmentId, dateFrom, dateTo } = req.query;
    const trends = await CapacityHistory_1.CapacityHistoryModel.getTeamCapacityTrends(departmentId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    res.json({
        success: true,
        data: trends,
        count: trends.length,
        filters: { departmentId, dateFrom, dateTo },
        timestamp: new Date().toISOString()
    });
});
CapacityController.getOverutilizedEmployees = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { threshold = 0.9, dateFrom, dateTo } = req.query;
    const overutilizedEmployees = await CapacityHistory_1.CapacityHistoryModel.getOverutilizedEmployees(parseFloat(threshold), dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    res.json({
        success: true,
        data: overutilizedEmployees,
        count: overutilizedEmployees.length,
        threshold: parseFloat(threshold),
        filters: { dateFrom, dateTo },
        timestamp: new Date().toISOString()
    });
});
CapacityController.getCapacityByDate = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId, date } = req.params;
    if (!employeeId || !date) {
        throw new api_error_1.ApiError(400, 'Employee ID and date are required');
    }
    const capacityEntry = await CapacityHistory_1.CapacityHistoryModel.findByEmployeeAndDate(employeeId, new Date(date));
    if (!capacityEntry) {
        throw new api_error_1.ApiError(404, 'Capacity entry not found for this employee and date');
    }
    res.json({
        success: true,
        data: capacityEntry,
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=capacity.controller.backup.js.map