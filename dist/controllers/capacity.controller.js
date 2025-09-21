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
/**
 * Get capacity data for all employees
 */
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
/**
 * Get capacity data for a specific employee
 */
CapacityController.getEmployeeCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId } = req.params;
    const { dateFrom, dateTo } = req.query;
    if (!employeeId) {
        throw new api_error_1.ApiError(400, 'Employee ID is required');
    }
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.findByEmployee(employeeId, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    // Get utilization summary for the employee
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
/**
 * Create new capacity entry
 */
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
/**
 * Update capacity entry
 */
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
/**
 * Delete capacity entry
 */
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
/**
 * Bulk create capacity entries
 */
CapacityController.bulkCreateCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new api_error_1.ApiError(400, 'Entries array is required and cannot be empty');
    }
    // Process entries and convert date strings
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
/**
 * Get capacity utilization summary
 */
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
/**
 * Get team capacity trends
 */
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
/**
 * Get overutilized employees
 */
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
/**
 * Get capacity data for a specific date
 */
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
/**
 * Get capacity data by department name
 */
CapacityController.getDepartmentCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { departmentName } = req.params;
    const { dateFrom, dateTo } = req.query;
    if (!departmentName) {
        throw new api_error_1.ApiError(400, 'Department name is required');
    }
    const departmentCapacity = await CapacityHistory_1.CapacityHistoryModel.getDepartmentCapacityByName(departmentName, dateFrom ? new Date(dateFrom) : undefined, dateTo ? new Date(dateTo) : undefined);
    res.json({
        success: true,
        data: departmentCapacity,
        department: departmentName,
        filters: { dateFrom, dateTo },
        timestamp: new Date().toISOString()
    });
});
/**
 * Update employee capacity by employee ID
 */
CapacityController.updateEmployeeCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { employeeId } = req.params;
    const { date, availableHours, allocatedHours, notes } = req.body;
    if (!employeeId) {
        throw new api_error_1.ApiError(400, 'Employee ID is required');
    }
    // Check if capacity entry exists for this employee and date
    const existingEntry = await CapacityHistory_1.CapacityHistoryModel.findByEmployeeAndDate(employeeId, new Date(date));
    let updatedEntry;
    if (existingEntry) {
        // Update existing entry
        updatedEntry = await CapacityHistory_1.CapacityHistoryModel.update(existingEntry.id, {
            availableHours,
            allocatedHours,
            notes
        });
    }
    else {
        // Create new entry
        updatedEntry = await CapacityHistory_1.CapacityHistoryModel.create({
            employeeId,
            date: new Date(date),
            availableHours,
            allocatedHours,
            notes
        });
    }
    res.json({
        success: true,
        data: updatedEntry,
        message: existingEntry ? 'Employee capacity updated successfully' : 'Employee capacity created successfully',
        timestamp: new Date().toISOString()
    });
});
/**
 * Bulk import capacity entries from CSV-like data
 */
CapacityController.bulkImportCapacity = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new api_error_1.ApiError(400, 'Validation failed', errors.array());
    }
    const { entries, options = {} } = req.body;
    const { skipDuplicates = true, updateExisting = false } = options;
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new api_error_1.ApiError(400, 'Entries array is required and cannot be empty');
    }
    const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: []
    };
    const client = await CapacityHistory_1.CapacityHistoryModel.pool.connect();
    try {
        await client.query('BEGIN');
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            try {
                // Check if entry exists
                const existingEntry = await CapacityHistory_1.CapacityHistoryModel.findByEmployeeAndDate(entry.employeeId, new Date(entry.date));
                if (existingEntry) {
                    if (updateExisting) {
                        await CapacityHistory_1.CapacityHistoryModel.update(existingEntry.id, {
                            availableHours: entry.availableHours,
                            allocatedHours: entry.allocatedHours,
                            notes: entry.notes
                        });
                        results.updated++;
                    }
                    else if (skipDuplicates) {
                        results.skipped++;
                    }
                    else {
                        throw new Error('Duplicate entry found');
                    }
                }
                else {
                    await CapacityHistory_1.CapacityHistoryModel.create({
                        employeeId: entry.employeeId,
                        date: new Date(entry.date),
                        availableHours: entry.availableHours,
                        allocatedHours: entry.allocatedHours,
                        notes: entry.notes
                    });
                    results.created++;
                }
            }
            catch (error) {
                results.errors.push({
                    index: i,
                    error: error.message || 'Unknown error'
                });
            }
        }
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            data: results,
            message: `Bulk import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
});
/**
 * Export capacity data to CSV format
 */
CapacityController.exportCapacityCSV = (0, async_handler_1.asyncHandler)(async (req, res, _next) => {
    const { employeeId, departmentId, dateFrom, dateTo } = req.query;
    const filters = {};
    if (employeeId)
        filters.employeeId = employeeId;
    if (dateFrom)
        filters.dateFrom = new Date(dateFrom);
    if (dateTo)
        filters.dateTo = new Date(dateTo);
    const capacityData = await CapacityHistory_1.CapacityHistoryModel.getCapacityWithEmployeeDetails(filters, departmentId);
    // Generate CSV content
    const csvHeaders = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Date',
        'Available Hours',
        'Allocated Hours',
        'Utilization Rate',
        'Notes',
        'Created At'
    ];
    const csvRows = capacityData.map(entry => [
        entry.employeeId,
        entry.employeeName || 'N/A',
        entry.departmentName || 'N/A',
        entry.date.toISOString().split('T')[0],
        entry.availableHours.toString(),
        entry.allocatedHours.toString(),
        (entry.utilizationRate * 100).toFixed(1) + '%',
        entry.notes || '',
        entry.createdAt.toISOString()
    ]);
    const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');
    // Set headers for file download
    const filename = `capacity-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));
    res.send(csvContent);
});
