import { Request, Response, NextFunction } from 'express';
import { CapacityHistoryModel } from '../models/CapacityHistory';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../middleware/async-handler';
import { validationResult } from 'express-validator';

export class CapacityController {
  /**
   * Get capacity data for all employees
   */
  static getAllCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { employeeId, dateFrom, dateTo, minUtilization, maxUtilization } = req.query;

    const filters = {
      employeeId: employeeId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      minUtilizationRate: minUtilization ? parseFloat(minUtilization as string) : undefined,
      maxUtilizationRate: maxUtilization ? parseFloat(maxUtilization as string) : undefined,
    };

    const capacityData = await CapacityHistoryModel.findAll(filters);

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
  static getEmployeeCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employeeId } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!employeeId) {
      throw new ApiError(400, 'Employee ID is required');
    }

    const capacityData = await CapacityHistoryModel.findByEmployee(
      employeeId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    // Get utilization summary for the employee
    const summary = await CapacityHistoryModel.getUtilizationSummary(
      employeeId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

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
  static createCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { employeeId, date, availableHours, allocatedHours, notes } = req.body;

    const capacityEntry = await CapacityHistoryModel.create({
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
  static updateCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { id } = req.params;
    const { availableHours, allocatedHours, notes } = req.body;

    const updatedEntry = await CapacityHistoryModel.update(id, {
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
  static deleteCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, 'Capacity entry ID is required');
    }

    const deletedEntry = await CapacityHistoryModel.delete(id);

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
  static bulkCreateCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new ApiError(400, 'Entries array is required and cannot be empty');
    }

    // Process entries and convert date strings
    const processedEntries = entries.map(entry => ({
      ...entry,
      date: new Date(entry.date)
    }));

    const createdEntries = await CapacityHistoryModel.bulkCreate(processedEntries);

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
  static getUtilizationSummary = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employeeId, dateFrom, dateTo } = req.query;

    const summary = await CapacityHistoryModel.getUtilizationSummary(
      employeeId as string,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

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
  static getTeamCapacityTrends = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { departmentId, dateFrom, dateTo } = req.query;

    const trends = await CapacityHistoryModel.getTeamCapacityTrends(
      departmentId as string,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

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
  static getOverutilizedEmployees = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { threshold = 0.9, dateFrom, dateTo } = req.query;

    const overutilizedEmployees = await CapacityHistoryModel.getOverutilizedEmployees(
      parseFloat(threshold as string),
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: overutilizedEmployees,
      count: overutilizedEmployees.length,
      threshold: parseFloat(threshold as string),
      filters: { dateFrom, dateTo },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get capacity data for a specific date
   */
  static getCapacityByDate = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employeeId, date } = req.params;

    if (!employeeId || !date) {
      throw new ApiError(400, 'Employee ID and date are required');
    }

    const capacityEntry = await CapacityHistoryModel.findByEmployeeAndDate(
      employeeId,
      new Date(date)
    );

    if (!capacityEntry) {
      throw new ApiError(404, 'Capacity entry not found for this employee and date');
    }

    res.json({
      success: true,
      data: capacityEntry,
      timestamp: new Date().toISOString()
    });
  });
}