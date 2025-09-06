import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/api';
import { AppError, catchAsync } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { db } from '../database/connection';

/**
 * Capacity Controller - Manages employee capacity tracking
 * Provides endpoints for capacity management while maintaining
 * compatibility with existing employee API
 */

interface CapacityRecord {
  id: string;
  employee_id: string;
  date: Date;
  available_hours: number;
  allocated_hours: number;
  utilization_rate: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

interface CapacityWithEmployee extends CapacityRecord {
  employee_name: string;
  employee_position: string;
  department_name?: string;
}

interface TeamCapacityOverview {
  employee_id: string;
  employee_name: string;
  position_title: string;
  department_name: string;
  available_hours: number;
  allocated_hours: number;
  utilization_rate: number;
  date: Date;
}

// Get capacity data for specific employee
export const getEmployeeCapacity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: employeeId } = req.params;
  const { startDate, endDate, limit = 30 } = req.query;

  // Verify employee exists
  const employees = await db.query(
    'SELECT id FROM employees WHERE id = $1',
    [employeeId]
  );

  if (employees.length === 0) {
    return next(new AppError('Employee not found', 404));
  }

  // Build query with date filtering
  let query = `
    SELECT ch.*, 
           e.first_name || ' ' || e.last_name as employee_name,
           e.position_title as employee_position,
           d.name as department_name
    FROM capacity_history ch
    JOIN employees e ON ch.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ch.employee_id = $1
  `;
  
  const queryParams = [employeeId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND ch.date >= $${paramIndex}`;
    queryParams.push(startDate as string);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND ch.date <= $${paramIndex}`;
    queryParams.push(endDate as string);
    paramIndex++;
  }

  query += ` ORDER BY ch.date DESC LIMIT $${paramIndex}`;
  queryParams.push(limit as string);

  const capacityData = await db.query<CapacityWithEmployee>(query, queryParams);

  const response: ApiResponse<CapacityWithEmployee[]> = {
    success: true,
    data: capacityData,
    timestamp: new Date().toISOString()
  };

  logger.info('Employee capacity retrieved', { 
    employeeId, 
    recordCount: capacityData.length,
    startDate,
    endDate
  });

  res.status(200).json(response);
});

// Update employee capacity hours
export const updateEmployeeCapacity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { id: employeeId } = req.params;
  const { date, availableHours, allocatedHours, notes } = req.body;

  // Verify employee exists
  const employees = await db.query(
    'SELECT id FROM employees WHERE id = $1',
    [employeeId]
  );

  if (employees.length === 0) {
    return next(new AppError('Employee not found', 404));
  }

  // Validate capacity data
  if (availableHours < 0 || allocatedHours < 0) {
    return next(new AppError('Hours cannot be negative', 400));
  }

  if (allocatedHours > availableHours) {
    return next(new AppError('Allocated hours cannot exceed available hours', 400));
  }

  const targetDate = new Date(date);

  // Check if capacity record exists for this date
  const existingCapacity = await db.query<CapacityRecord>(
    'SELECT * FROM capacity_history WHERE employee_id = $1 AND date = $2',
    [employeeId, targetDate]
  );

  let capacity: CapacityRecord;

  if (existingCapacity.length > 0) {
    // Update existing record
    const updated = await db.query<CapacityRecord>(
      `UPDATE capacity_history 
       SET available_hours = $1, allocated_hours = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $4 AND date = $5
       RETURNING *`,
      [availableHours, allocatedHours, notes || null, employeeId, targetDate]
    );
    capacity = updated[0];
  } else {
    // Create new record
    const created = await db.query<CapacityRecord>(
      `INSERT INTO capacity_history (employee_id, date, available_hours, allocated_hours, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [employeeId, targetDate, availableHours, allocatedHours, notes || null]
    );
    capacity = created[0];
  }

  const response: ApiResponse<CapacityRecord> = {
    success: true,
    data: capacity,
    timestamp: new Date().toISOString()
  };

  logger.info('Employee capacity updated', { 
    employeeId, 
    date: targetDate,
    availableHours,
    allocatedHours
  });

  res.status(200).json(response);
});

// Get team capacity overview
export const getTeamCapacity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { departmentId, date } = req.query;
  const targetDate = date ? new Date(date as string) : new Date().toISOString().split('T')[0];

  let query = `
    SELECT 
      ch.employee_id,
      e.first_name || ' ' || e.last_name as employee_name,
      e.position_title,
      d.name as department_name,
      ch.available_hours,
      ch.allocated_hours,
      ch.utilization_rate,
      ch.date
    FROM capacity_history ch
    JOIN employees e ON ch.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ch.date = $1
  `;

  const queryParams = [targetDate];
  let paramIndex = 2;

  if (departmentId) {
    query += ` AND e.department_id = $${paramIndex}`;
    queryParams.push(departmentId as string);
    paramIndex++;
  }

  query += ` ORDER BY d.name, e.first_name, e.last_name`;

  const teamCapacity = await db.query<TeamCapacityOverview>(query, queryParams);

  const response: ApiResponse<TeamCapacityOverview[]> = {
    success: true,
    data: teamCapacity,
    timestamp: new Date().toISOString()
  };

  logger.info('Team capacity overview retrieved', { 
    departmentId, 
    date: targetDate,
    teamSize: teamCapacity.length
  });

  res.status(200).json(response);
});

// Bulk capacity updates
export const bulkUpdateCapacity = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return next(new AppError('Updates array is required', 400));
  }

  const results = {
    successful: [] as CapacityRecord[],
    failed: [] as Array<{
      item: any;
      error: string;
    }>,
    total: updates.length,
    successCount: 0,
    failureCount: 0
  };

  // Process each update using transaction
  try {
    await db.transaction(async (client) => {
      for (const update of updates) {
        try {
          const { employeeId, date, availableHours, allocatedHours, notes } = update;

          // Validate required fields
          if (!employeeId || !date) {
            throw new Error('Employee ID and date are required');
          }

          // Validate capacity data
          if (availableHours < 0 || allocatedHours < 0) {
            throw new Error('Hours cannot be negative');
          }

          if (allocatedHours > availableHours) {
            throw new Error('Allocated hours cannot exceed available hours');
          }

          // Check if employee exists
          const employeeCheck = await client.query(
            'SELECT id FROM employees WHERE id = $1',
            [employeeId]
          );

          if (employeeCheck.rows.length === 0) {
            throw new Error('Employee not found');
          }

          const targetDate = new Date(date);

          // Check if capacity record exists
          const existingCapacity = await client.query(
            'SELECT * FROM capacity_history WHERE employee_id = $1 AND date = $2',
            [employeeId, targetDate]
          );

          let capacity: CapacityRecord;

          if (existingCapacity.rows.length > 0) {
            // Update existing
            const updated = await client.query(
              `UPDATE capacity_history 
               SET available_hours = $1, allocated_hours = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
               WHERE employee_id = $4 AND date = $5
               RETURNING *`,
              [availableHours, allocatedHours, notes || null, employeeId, targetDate]
            );
            capacity = updated.rows[0];
          } else {
            // Create new
            const created = await client.query(
              `INSERT INTO capacity_history (employee_id, date, available_hours, allocated_hours, notes)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING *`,
              [employeeId, targetDate, availableHours, allocatedHours, notes || null]
            );
            capacity = created.rows[0];
          }

          results.successful.push(capacity);
          results.successCount++;

        } catch (error) {
          results.failed.push({
            item: update,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          results.failureCount++;
        }
      }
    });
  } catch (error) {
    logger.error('Bulk capacity update transaction failed:', error);
    return next(new AppError('Bulk update failed', 500));
  }

  const response: ApiResponse<typeof results> = {
    success: results.successCount > 0,
    data: results,
    timestamp: new Date().toISOString()
  };

  logger.info('Bulk capacity update completed', { 
    total: results.total,
    successful: results.successCount,
    failed: results.failureCount
  });

  res.status(200).json(response);
});

// Get capacity analytics/trends
export const getCapacityAnalytics = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { employeeId, departmentId, period = '30d' } = req.query;

  let daysBack = 30;
  switch (period) {
    case '7d':
      daysBack = 7;
      break;
    case '30d':
      daysBack = 30;
      break;
    case '90d':
      daysBack = 90;
      break;
  }

  let query = `
    SELECT 
      DATE_TRUNC('week', ch.date) as week,
      AVG(ch.available_hours) as avg_available_hours,
      AVG(ch.allocated_hours) as avg_allocated_hours,
      AVG(ch.utilization_rate) as avg_utilization_rate,
      COUNT(*) as record_count
    FROM capacity_history ch
    JOIN employees e ON ch.employee_id = e.id
    WHERE ch.date >= CURRENT_DATE - INTERVAL '${daysBack} days'
  `;

  const queryParams: string[] = [];
  let paramIndex = 1;

  if (employeeId) {
    query += ` AND ch.employee_id = $${paramIndex}`;
    queryParams.push(employeeId as string);
    paramIndex++;
  }

  if (departmentId) {
    query += ` AND e.department_id = $${paramIndex}`;
    queryParams.push(departmentId as string);
    paramIndex++;
  }

  query += `
    GROUP BY DATE_TRUNC('week', ch.date)
    ORDER BY week DESC
    LIMIT 12
  `;

  const analytics = await db.query(query, queryParams);

  const response: ApiResponse<typeof analytics> = {
    success: true,
    data: analytics,
    timestamp: new Date().toISOString()
  };

  logger.info('Capacity analytics retrieved', { 
    employeeId,
    departmentId,
    period,
    recordCount: analytics.length
  });

  res.status(200).json(response);
});