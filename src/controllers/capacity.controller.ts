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

    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);
    if (minUtilization) filters.minUtilizationRate = parseFloat(minUtilization as string);
    if (maxUtilization) filters.maxUtilizationRate = parseFloat(maxUtilization as string);

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

    const updatedEntry = await CapacityHistoryModel.update(id!, {
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

  /**
   * Get capacity data by department name
   */
  static getDepartmentCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { departmentName } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!departmentName) {
      throw new ApiError(400, 'Department name is required');
    }

    const departmentCapacity = await CapacityHistoryModel.getDepartmentCapacityByName(
      departmentName,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

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
  static updateEmployeeCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { employeeId } = req.params;
    const { date, availableHours, allocatedHours, notes } = req.body;

    if (!employeeId) {
      throw new ApiError(400, 'Employee ID is required');
    }

    // Check if capacity entry exists for this employee and date
    const existingEntry = await CapacityHistoryModel.findByEmployeeAndDate(
      employeeId,
      new Date(date)
    );

    let updatedEntry;
    if (existingEntry) {
      // Update existing entry
      updatedEntry = await CapacityHistoryModel.update(existingEntry.id, {
        availableHours,
        allocatedHours,
        notes
      });
    } else {
      // Create new entry
      updatedEntry = await CapacityHistoryModel.create({
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
  static bulkImportCapacity = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { entries, options = {} } = req.body;
    const { skipDuplicates = true, updateExisting = false } = options;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new ApiError(400, 'Entries array is required and cannot be empty');
    }

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ index: number; error: string }>
    };

    const client = await (CapacityHistoryModel as any).pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        try {
          // Check if entry exists
          const existingEntry = await CapacityHistoryModel.findByEmployeeAndDate(
            entry.employeeId,
            new Date(entry.date)
          );

          if (existingEntry) {
            if (updateExisting) {
              await CapacityHistoryModel.update(existingEntry.id, {
                availableHours: entry.availableHours,
                allocatedHours: entry.allocatedHours,
                notes: entry.notes
              });
              results.updated++;
            } else if (skipDuplicates) {
              results.skipped++;
            } else {
              throw new Error('Duplicate entry found');
            }
          } else {
            await CapacityHistoryModel.create({
              employeeId: entry.employeeId,
              date: new Date(entry.date),
              availableHours: entry.availableHours,
              allocatedHours: entry.allocatedHours,
              notes: entry.notes
            });
            results.created++;
          }
        } catch (error: any) {
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
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  /**
   * Export capacity data to CSV format
   */
  static exportCapacityCSV = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { employeeId, departmentId, dateFrom, dateTo } = req.query;

    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const capacityData = await CapacityHistoryModel.getCapacityWithEmployeeDetails(filters, departmentId as string);

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

  // ============================================
  // HEAT MAP CONTROLLER METHODS
  // ============================================

  /**
   * Get heat map data for capacity visualization
   */
  static getHeatmap = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const {
      startDate,
      endDate,
      departmentId,
      employeeIds,
      granularity,
      includeInactive,
      includeWeekends
    } = req.query;

    // Get service from request (injected by middleware)
    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    const filters = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      departmentId: departmentId as string | undefined,
      employeeIds: employeeIds ? (Array.isArray(employeeIds) ? employeeIds as string[] : [employeeIds as string]) : undefined,
      granularity: (granularity as string) || 'daily',
      includeInactive: includeInactive === 'true',
      includeWeekends: includeWeekends === 'true'
    };

    const heatmapData = await heatmapService.getHeatmap(filters);

    res.json({
      success: true,
      data: heatmapData,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get capacity bottlenecks
   */
  static getBottlenecks = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { startDate, endDate, departmentId } = req.query;

    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    const bottlenecks = await heatmapService.getBottlenecks(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
      departmentId as string | undefined
    );

    res.json({
      success: true,
      data: bottlenecks,
      count: bottlenecks.length,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get capacity trends for an employee
   */
  static getCapacityTrends = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { employeeId } = req.params;
    const { periods } = req.query;

    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    const trends = await heatmapService.getCapacityTrends(
      employeeId,
      periods ? parseInt(periods as string, 10) : 12
    );

    res.json({
      success: true,
      data: trends,
      employeeId,
      periods: periods || 12,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Export heat map data to CSV
   */
  static exportHeatmapCSV = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { startDate, endDate, departmentId, granularity } = req.query;

    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    const filters = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
      departmentId: departmentId as string | undefined,
      granularity: (granularity as string) || 'daily'
    };

    const csvContent = await heatmapService.exportToCSV(filters);

    // Set headers for file download
    const filename = `heatmap-${filters.granularity}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent));

    res.send(csvContent);
  });

  /**
   * Refresh heat map materialized views
   */
  static refreshHeatmapViews = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { concurrent } = req.body;

    // Check authorization - this should be admin only
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      throw new ApiError(401, 'Unauthorized - admin access required');
    }

    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    await heatmapService.refreshViews(concurrent !== false);

    res.json({
      success: true,
      message: 'Heat map views refreshed successfully',
      concurrent: concurrent !== false,
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get department capacity summary
   */
  static getDepartmentCapacitySummary = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Invalid request parameters', errors.array());
    }

    const { departmentId } = req.params;
    const { date } = req.query;

    const heatmapService = (req as any).services?.capacityHeatmapService;
    if (!heatmapService) {
      throw new ApiError(500, 'Heat map service not initialized');
    }

    const summary = await heatmapService.getDepartmentSummary(
      departmentId,
      date ? new Date(date as string) : undefined
    );

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  });
}