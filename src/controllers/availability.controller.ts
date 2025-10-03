import { Request, Response } from 'express';
import { AvailabilityPatternService } from '../services/availability-pattern.service';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';
import { parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, isWithinInterval, differenceInDays, format } from 'date-fns';
import { Pool } from 'pg';
import { CacheService } from '../services/cache.service';
import { WebSocketService } from '../websocket/websocket.service';
import * as XLSX from 'xlsx';
import * as csv from 'csv-stringify/sync';

export class AvailabilityController {
  private availabilityService!: AvailabilityPatternService;
  private db!: Pool;
  private cacheService!: CacheService;
  private wsService!: WebSocketService;

  // Initialize services from request context
  private getServices(req: Request) {
    const services = (req as any).services;
    if (!this.availabilityService && services) {
      this.availabilityService = services.availabilityPattern || services.availabilityService;
      this.db = services.db || services.database?.getPool();
      this.cacheService = services.cache || services.cacheService;
      this.wsService = services.websocket || services.wsService;
    }
  }

  // ============================================
  // PATTERN MANAGEMENT
  // ============================================

  async getPatterns(req: Request, res: Response) {
    try {
      this.getServices(req);
      const {
        employeeId,
        departmentId,
        isActive,
        patternType,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let query = `
        SELECT
          ap.*,
          e.first_name,
          e.last_name,
          e.email,
          d.name as department_name
        FROM availability_patterns ap
        JOIN employees e ON ap.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE 1=1
      `;

      const params: any[] = [];
      let paramCount = 0;

      if (employeeId) {
        query += ` AND ap.employee_id = $${++paramCount}`;
        params.push(employeeId);
      }

      if (departmentId) {
        query += ` AND e.department_id = $${++paramCount}`;
        params.push(departmentId);
      }

      if (isActive !== undefined) {
        query += ` AND ap.is_active = $${++paramCount}`;
        params.push(isActive === 'true');
      }

      if (patternType) {
        query += ` AND ap.pattern_type = $${++paramCount}`;
        params.push(patternType);
      }

      // Get total count
      const countQuery = query.replace('SELECT ap.*,', 'SELECT COUNT(*) as total FROM (SELECT ap.id');
      const countResult = await this.db.query(countQuery + ') as subquery', params);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination
      query += ` ORDER BY ap.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      const patterns = result.rows.map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        employeeName: `${row.first_name} ${row.last_name}`,
        employeeEmail: row.email,
        departmentName: row.department_name,
        patternType: row.pattern_type,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        isActive: row.is_active,
        weeklyHours: row.weekly_hours,
        customDates: row.custom_dates,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return res.json({
        success: true,
        data: {
          patterns,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching availability patterns:', error);
      throw new ApiError(500, 'Failed to fetch availability patterns');
    }
  }

  async getPattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pattern = await this.availabilityService.getPatternById(id);

      if (!pattern) {
        throw new ApiError(404, 'Availability pattern not found');
      }

      return res.json({
        success: true,
        data: pattern
      });
    } catch (error) {
      logger.error('Error fetching pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch pattern');
    }
  }

  async createPattern(req: Request, res: Response) {
    try {
      const pattern = await this.availabilityService.createPattern(req.body);

      // Send WebSocket notification
      this.wsService.broadcast('availability:pattern:created', {
        pattern,
        employeeId: pattern.employeeId,
        timestamp: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Availability pattern created successfully',
        data: pattern
      });
    } catch (error) {
      logger.error('Error creating pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create pattern');
    }
  }

  async updatePattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pattern = await this.availabilityService.updatePattern(id, req.body);

      // Send WebSocket notification
      this.wsService.broadcast('availability:pattern:updated', {
        pattern,
        employeeId: pattern.employeeId,
        timestamp: new Date()
      });

      return res.json({
        success: true,
        message: 'Availability pattern updated successfully',
        data: pattern
      });
    } catch (error) {
      logger.error('Error updating pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update pattern');
    }
  }

  async deletePattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.availabilityService.deletePattern(id);

      return res.json({
        success: true,
        message: 'Availability pattern deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete pattern');
    }
  }

  async activatePattern(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Deactivate all other patterns for this employee
      const patternResult = await this.db.query(
        'SELECT employee_id FROM availability_patterns WHERE id = $1',
        [id]
      );

      if (patternResult.rows.length === 0) {
        throw new ApiError(404, 'Pattern not found');
      }

      const employeeId = patternResult.rows[0].employee_id;

      // Start transaction
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        // Deactivate all patterns for employee
        await client.query(
          'UPDATE availability_patterns SET is_active = false WHERE employee_id = $1',
          [employeeId]
        );

        // Activate the specified pattern
        await client.query(
          'UPDATE availability_patterns SET is_active = true WHERE id = $1',
          [id]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      // Clear cache
      await this.cacheService.delete(`availability:employee:${employeeId}:*`);

      return res.json({
        success: true,
        message: 'Pattern activated successfully'
      });
    } catch (error) {
      logger.error('Error activating pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to activate pattern');
    }
  }

  async clonePattern(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { employeeId, name } = req.body;

      // Get source pattern
      const sourcePattern = await this.availabilityService.getPatternById(id);
      if (!sourcePattern) {
        throw new ApiError(404, 'Source pattern not found');
      }

      // Create cloned pattern with proper camelCase properties
      const clonedPattern = await this.availabilityService.createPattern({
        employeeId,
        patternType: sourcePattern.patternType,
        configuration: sourcePattern.configuration,
        effectiveFrom: sourcePattern.effectiveFrom,
        effectiveTo: sourcePattern.effectiveTo,
        isActive: false,
        notes: name ? `Cloned: ${name}` : `Cloned from ${sourcePattern.id}`
      } as any);

      return res.status(201).json({
        success: true,
        message: 'Pattern cloned successfully',
        data: clonedPattern
      });
    } catch (error) {
      logger.error('Error cloning pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to clone pattern');
    }
  }

  // ============================================
  // EXCEPTION MANAGEMENT
  // ============================================

  async getExceptions(req: Request, res: Response) {
    try {
      const {
        employeeId,
        exceptionType,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      // Get exceptions with date range
      const parsedStartDate = startDate ? parseISO(startDate as string) : undefined;
      const parsedEndDate = endDate ? parseISO(endDate as string) : undefined;

      const exceptions = await this.availabilityService.getExceptions(
        employeeId as string,
        parsedStartDate,
        parsedEndDate
      );

      // Filter by exception type and status if provided
      let filteredExceptions = exceptions;
      if (exceptionType) {
        filteredExceptions = filteredExceptions.filter(e => e.exceptionType === exceptionType);
      }
      if (status) {
        filteredExceptions = filteredExceptions.filter(e => (e as any).status === status);
      }

      // Apply pagination
      const offset = (Number(page) - 1) * Number(limit);
      const paginatedExceptions = filteredExceptions.slice(offset, offset + Number(limit));

      return res.json({
        success: true,
        data: {
          exceptions: paginatedExceptions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: exceptions.length,
            totalPages: Math.ceil(exceptions.length / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching exceptions:', error);
      throw new ApiError(500, 'Failed to fetch exceptions');
    }
  }

  async getException(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.db.query(
        'SELECT * FROM availability_exceptions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Exception not found');
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch exception');
    }
  }

  async createException(req: Request, res: Response) {
    try {
      const exception = await this.availabilityService.createException(req.body);

      // Send notification
      this.wsService.broadcast('availability:exception:created', {
        exception,
        employeeId: exception.employeeId,
        timestamp: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Exception created successfully',
        data: exception
      });
    } catch (error) {
      logger.error('Error creating exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create exception');
    }
  }

  async updateException(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const exception = await this.availabilityService.updateException(id, req.body);

      return res.json({
        success: true,
        message: 'Exception updated successfully',
        data: exception
      });
    } catch (error) {
      logger.error('Error updating exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update exception');
    }
  }

  async deleteException(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.availabilityService.deleteException(id);

      return res.json({
        success: true,
        message: 'Exception deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete exception');
    }
  }

  async approveException(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { approvedBy, comments } = req.body;

      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query(
          `UPDATE availability_exceptions
           SET status = 'approved',
               approved_by = $1,
               approved_at = CURRENT_TIMESTAMP,
               metadata = jsonb_set(
                 COALESCE(metadata, '{}'),
                 '{approvalComments}',
                 $2::jsonb
               ),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING *`,
          [approvedBy, JSON.stringify(comments || ''), id]
        );

        if (result.rows.length === 0) {
          throw new ApiError(404, 'Exception not found');
        }

        await client.query('COMMIT');

        // Clear cache for affected employee
        const exception = result.rows[0];
        await this.cacheService.delete(`availability:employee:${exception.employee_id}:*`);

        // Send notification
        this.wsService.broadcast('availability:exception:approved', {
          exception: result.rows[0],
          approvedBy,
          timestamp: new Date()
        });

        return res.json({
          success: true,
          message: 'Exception approved successfully',
          data: result.rows[0]
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error approving exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to approve exception');
    }
  }

  async rejectException(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectedBy, reason } = req.body;

      const result = await this.db.query(
        `UPDATE availability_exceptions
         SET status = 'rejected',
             metadata = jsonb_set(
               jsonb_set(
                 COALESCE(metadata, '{}'),
                 '{rejectedBy}',
                 $1::jsonb
               ),
               '{rejectionReason}',
               $2::jsonb
             ),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [JSON.stringify(rejectedBy), JSON.stringify(reason), id]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Exception not found');
      }

      // Send notification
      this.wsService.broadcast('availability:exception:rejected', {
        exception: result.rows[0],
        rejectedBy,
        reason,
        timestamp: new Date()
      });

      return res.json({
        success: true,
        message: 'Exception rejected',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error rejecting exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to reject exception');
    }
  }

  // ============================================
  // HOLIDAY MANAGEMENT
  // ============================================

  async getHolidays(req: Request, res: Response) {
    try {
      const { year, country, region, includeOptional } = req.query;

      // Build date range from year parameter
      const targetYear = year ? Number(year) : new Date().getFullYear();
      const startDate = new Date(targetYear, 0, 1); // January 1st
      const endDate = new Date(targetYear, 11, 31); // December 31st

      const holidays = await this.availabilityService.getHolidays(startDate, endDate);

      return res.json({
        success: true,
        data: holidays
      });
    } catch (error) {
      logger.error('Error fetching holidays:', error);
      throw new ApiError(500, 'Failed to fetch holidays');
    }
  }

  async getHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.db.query(
        'SELECT * FROM holidays WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new ApiError(404, 'Holiday not found');
      }

      return res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error fetching holiday:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch holiday');
    }
  }

  async createHoliday(req: Request, res: Response) {
    try {
      const holiday = await this.availabilityService.createHoliday(req.body);

      return res.status(201).json({
        success: true,
        message: 'Holiday created successfully',
        data: holiday
      });
    } catch (error) {
      logger.error('Error creating holiday:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to create holiday');
    }
  }

  async updateHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const holiday = await this.availabilityService.updateHoliday(id, req.body);

      return res.json({
        success: true,
        message: 'Holiday updated successfully',
        data: holiday
      });
    } catch (error) {
      logger.error('Error updating holiday:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update holiday');
    }
  }

  async deleteHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.availabilityService.deleteHoliday(id);

      return res.json({
        success: true,
        message: 'Holiday deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting holiday:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to delete holiday');
    }
  }

  async bulkImportHolidays(req: Request, res: Response) {
    try {
      const { holidays, replaceExisting } = req.body;

      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        if (replaceExisting) {
          await client.query('TRUNCATE TABLE holidays');
        }

        const imported = [];
        for (const holiday of holidays) {
          const result = await client.query(
            `INSERT INTO holidays (name, holiday_date, is_recurring, country, region, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (holiday_date, COALESCE(country, ''), COALESCE(region, ''))
             DO UPDATE SET
               name = EXCLUDED.name,
               is_recurring = EXCLUDED.is_recurring,
               metadata = EXCLUDED.metadata,
               updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
              holiday.name,
              holiday.holidayDate,
              holiday.isRecurring || false,
              holiday.country || null,
              holiday.region || null,
              holiday.metadata || {}
            ]
          );
          imported.push(result.rows[0]);
        }

        await client.query('COMMIT');

        // Clear cache
        await this.cacheService.delete('holidays:*');

        return res.json({
          success: true,
          message: `Successfully imported ${imported.length} holidays`,
          data: {
            imported: imported.length,
            holidays: imported
          }
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error bulk importing holidays:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to bulk import holidays');
    }
  }

  // ============================================
  // EFFECTIVE AVAILABILITY
  // ============================================

  async getEffectiveAvailability(req: Request, res: Response) {
    try {
      const { employeeId, date } = req.params;
      const availability = await this.availabilityService.getEffectiveAvailability(
        employeeId,
        parseISO(date)
      );

      return res.json({
        success: true,
        data: availability
      });
    } catch (error) {
      logger.error('Error fetching effective availability:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch effective availability');
    }
  }

  async getAvailabilityRange(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { startDate, endDate } = req.query;

      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);

      if (differenceInDays(end, start) > 365) {
        throw new ApiError(400, 'Date range cannot exceed 365 days');
      }

      const availabilities = [];
      let currentDate = start;

      while (currentDate <= end) {
        const availability = await this.availabilityService.getEffectiveAvailability(
          employeeId,
          currentDate
        );
        availabilities.push(availability);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      return res.json({
        success: true,
        data: {
          employeeId,
          startDate: start,
          endDate: end,
          availabilities,
          summary: {
            totalDays: availabilities.length,
            totalAvailableHours: availabilities.reduce((sum, a) => sum + a.availableHours, 0),
            averageHoursPerDay: availabilities.reduce((sum, a) => sum + a.availableHours, 0) / availabilities.length,
            daysWithExceptions: availabilities.filter(a => a.isException).length,
            holidays: availabilities.filter(a => a.isHoliday).length
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching availability range:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch availability range');
    }
  }

  async getDepartmentAvailability(req: Request, res: Response) {
    try {
      const { departmentId } = req.params;
      const { date, startDate, endDate } = req.query;

      // Get all employees in department
      const employeeResult = await this.db.query(
        'SELECT id, first_name, last_name FROM employees WHERE department_id = $1 AND is_active = true',
        [departmentId]
      );

      const targetDate = date ? parseISO(date as string) : new Date();
      const rangeStart = startDate ? parseISO(startDate as string) : startOfWeek(targetDate);
      const rangeEnd = endDate ? parseISO(endDate as string) : endOfWeek(targetDate);

      const departmentAvailability = {
        departmentId,
        date: targetDate,
        dateRange: { start: rangeStart, end: rangeEnd },
        employees: [] as any[],
        summary: {
          totalEmployees: employeeResult.rows.length,
          totalAvailableHours: 0,
          averageUtilization: 0,
          fullyAvailable: 0,
          partiallyAvailable: 0,
          unavailable: 0
        }
      };

      for (const employee of employeeResult.rows) {
        const availability = await this.availabilityService.getEffectiveAvailability(
          employee.id,
          targetDate
        );

        const employeeData = {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          ...availability
        };

        departmentAvailability.employees.push(employeeData);
        departmentAvailability.summary.totalAvailableHours += availability.adjustedHours;

        if (availability.adjustedHours >= 8) {
          departmentAvailability.summary.fullyAvailable++;
        } else if (availability.adjustedHours > 0) {
          departmentAvailability.summary.partiallyAvailable++;
        } else {
          departmentAvailability.summary.unavailable++;
        }
      }

      departmentAvailability.summary.averageUtilization =
        departmentAvailability.summary.totalAvailableHours / (employeeResult.rows.length * 8);

      return res.json({
        success: true,
        data: departmentAvailability
      });
    } catch (error) {
      logger.error('Error fetching department availability:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch department availability');
    }
  }

  async getTeamAvailability(req: Request, res: Response) {
    try {
      const { teamId } = req.params;
      const { date, startDate, endDate } = req.query;

      // Get all employees in team
      const employeeResult = await this.db.query(
        `SELECT e.id, e.first_name, e.last_name
         FROM employees e
         JOIN team_members tm ON e.id = tm.employee_id
         WHERE tm.team_id = $1 AND e.is_active = true`,
        [teamId]
      );

      const targetDate = date ? parseISO(date as string) : new Date();
      const rangeStart = startDate ? parseISO(startDate as string) : startOfWeek(targetDate);
      const rangeEnd = endDate ? parseISO(endDate as string) : endOfWeek(targetDate);

      const teamAvailability = {
        teamId,
        date: targetDate,
        dateRange: { start: rangeStart, end: rangeEnd },
        members: [] as any[],
        summary: {
          totalMembers: employeeResult.rows.length,
          totalAvailableHours: 0,
          averageUtilization: 0,
          fullyAvailable: 0,
          partiallyAvailable: 0,
          unavailable: 0
        }
      };

      for (const employee of employeeResult.rows) {
        const availability = await this.availabilityService.getEffectiveAvailability(
          employee.id,
          targetDate
        );

        const memberData = {
          id: employee.id,
          name: `${employee.first_name} ${employee.last_name}`,
          ...availability
        };

        teamAvailability.members.push(memberData);
        teamAvailability.summary.totalAvailableHours += availability.adjustedHours;

        if (availability.adjustedHours >= 8) {
          teamAvailability.summary.fullyAvailable++;
        } else if (availability.adjustedHours > 0) {
          teamAvailability.summary.partiallyAvailable++;
        } else {
          teamAvailability.summary.unavailable++;
        }
      }

      teamAvailability.summary.averageUtilization =
        teamAvailability.summary.totalAvailableHours / (employeeResult.rows.length * 8);

      return res.json({
        success: true,
        data: teamAvailability
      });
    } catch (error) {
      logger.error('Error fetching team availability:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch team availability');
    }
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  async bulkCreatePatterns(req: Request, res: Response) {
    try {
      const { patterns } = req.body;
      const created = [];

      for (const pattern of patterns) {
        const result = await this.availabilityService.createPattern(pattern);
        created.push(result);
      }

      return res.status(201).json({
        success: true,
        message: `Successfully created ${created.length} patterns`,
        data: {
          created: created.length,
          patterns: created
        }
      });
    } catch (error) {
      logger.error('Error bulk creating patterns:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to bulk create patterns');
    }
  }

  async bulkUpdatePatterns(req: Request, res: Response) {
    try {
      const { patternIds, updates } = req.body;
      const updated = [];

      for (const patternId of patternIds) {
        const result = await this.availabilityService.updatePattern(patternId, updates);
        updated.push(result);
      }

      // Clear cache for affected employees
      const employeeIds = [...new Set(updated.map(p => p.employeeId))];
      for (const employeeId of employeeIds) {
        await this.cacheService.delete(`availability:employee:${employeeId}:*`);
      }

      return res.json({
        success: true,
        message: `Successfully updated ${updated.length} patterns`,
        data: {
          updated: updated.length,
          patterns: updated
        }
      });
    } catch (error) {
      logger.error('Error bulk updating patterns:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to bulk update patterns');
    }
  }

  async copyWeekPattern(req: Request, res: Response) {
    try {
      const { sourceWeekStart, targetWeekStart, employeeIds } = req.body;

      const sourceStart = parseISO(sourceWeekStart);
      const targetStart = parseISO(targetWeekStart);

      // Get patterns for source week
      let query = `
        SELECT DISTINCT ap.*, e.id as employee_id
        FROM availability_patterns ap
        JOIN employees e ON ap.employee_id = e.id
        WHERE ap.is_active = true
          AND ap.start_date <= $1
          AND (ap.end_date IS NULL OR ap.end_date >= $2)
      `;

      const params: any[] = [endOfWeek(sourceStart), startOfWeek(sourceStart)];

      if (employeeIds && employeeIds.length > 0) {
        query += ` AND e.id = ANY($3)`;
        params.push(employeeIds);
      }

      const sourcePatterns = await this.db.query(query, params);

      // Copy patterns to target week
      const copied = [];
      for (const pattern of sourcePatterns.rows) {
        // Adjust dates for target week
        const newPattern = {
          ...pattern,
          id: undefined,
          startDate: targetStart,
          endDate: endOfWeek(targetStart),
          name: `${pattern.name} (Week of ${format(targetStart, 'MMM dd, yyyy')})`,
          isActive: true,
          createdAt: undefined,
          updatedAt: undefined
        };

        const created = await this.availabilityService.createPattern(newPattern);
        copied.push(created);
      }

      return res.json({
        success: true,
        message: `Successfully copied ${copied.length} patterns`,
        data: {
          sourceWeek: format(sourceStart, 'yyyy-MM-dd'),
          targetWeek: format(targetStart, 'yyyy-MM-dd'),
          copied: copied.length,
          patterns: copied
        }
      });
    } catch (error) {
      logger.error('Error copying week pattern:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to copy week pattern');
    }
  }

  // ============================================
  // ANALYTICS & REPORTS
  // ============================================

  async getUtilizationAnalytics(req: Request, res: Response) {
    try {
      const {
        startDate,
        endDate,
        departmentId,
        teamId,
        granularity = 'daily'
      } = req.query;

      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);

      // Get employees based on filters
      let employeeQuery = 'SELECT id, first_name, last_name FROM employees WHERE is_active = true';
      const employeeParams: any[] = [];

      if (departmentId) {
        employeeQuery += ` AND department_id = $${employeeParams.length + 1}`;
        employeeParams.push(departmentId);
      }

      if (teamId) {
        employeeQuery = `
          SELECT e.id, e.first_name, e.last_name
          FROM employees e
          JOIN team_members tm ON e.id = tm.employee_id
          WHERE e.is_active = true AND tm.team_id = $${employeeParams.length + 1}
        `;
        employeeParams.push(teamId);
      }

      const employeeResult = await this.db.query(employeeQuery, employeeParams);

      // Calculate utilization for each employee
      const utilizationData = [];
      for (const employee of employeeResult.rows) {
        const employeeUtilization = {
          employeeId: employee.id,
          employeeName: `${employee.first_name} ${employee.last_name}`,
          dataPoints: [] as any[]
        };

        let currentDate = start;
        while (currentDate <= end) {
          const availability = await this.availabilityService.getEffectiveAvailability(
            employee.id,
            currentDate
          );

          // Get actual allocations
          const allocationResult = await this.db.query(
            `SELECT COALESCE(SUM(allocated_hours), 0) as total_hours
             FROM resource_allocations
             WHERE employee_id = $1
               AND allocation_date = $2`,
            [employee.id, format(currentDate, 'yyyy-MM-dd')]
          );

          const allocatedHours = parseFloat(allocationResult.rows[0].total_hours);
          const utilization = availability.adjustedHours > 0
            ? (allocatedHours / availability.adjustedHours) * 100
            : 0;

          employeeUtilization.dataPoints.push({
            date: currentDate,
            availableHours: availability.adjustedHours,
            allocatedHours,
            utilization,
            isHoliday: availability.isHoliday,
            isException: availability.isException
          });

          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }

        utilizationData.push(employeeUtilization);
      }

      // Aggregate by granularity if needed
      const aggregatedData = this.aggregateByGranularity(utilizationData, granularity as string);

      return res.json({
        success: true,
        data: {
          startDate: start,
          endDate: end,
          granularity,
          utilization: aggregatedData,
          summary: {
            averageUtilization: this.calculateAverageUtilization(aggregatedData),
            peakUtilization: this.calculatePeakUtilization(aggregatedData),
            underutilizedDays: this.countUnderutilizedDays(aggregatedData),
            overutilizedDays: this.countOverutilizedDays(aggregatedData)
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching utilization analytics:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch utilization analytics');
    }
  }

  async getCoverageAnalysis(req: Request, res: Response) {
    try {
      const {
        date,
        shiftStart = '09:00',
        shiftEnd = '17:00',
        requiredCoverage = 5
      } = req.query;

      const targetDate = parseISO(date as string);

      // Get all available employees for the date
      const employeeResult = await this.db.query(
        'SELECT id, first_name, last_name FROM employees WHERE is_active = true'
      );

      const coverage = {
        date: targetDate,
        shift: { start: shiftStart, end: shiftEnd },
        requiredCoverage: Number(requiredCoverage),
        availableEmployees: [] as any[],
        coverageByHour: {} as any,
        gaps: [] as any[]
      };

      // Calculate coverage for each hour
      for (let hour = parseInt((shiftStart as string).split(':')[0]);
           hour < parseInt((shiftEnd as string).split(':')[0]);
           hour++) {
        coverage.coverageByHour[`${hour}:00`] = {
          available: 0,
          required: Number(requiredCoverage),
          gap: 0,
          employees: []
        };
      }

      // Check each employee's availability
      for (const employee of employeeResult.rows) {
        const availability = await this.availabilityService.getEffectiveAvailability(
          employee.id,
          targetDate
        );

        if (availability.adjustedHours > 0) {
          coverage.availableEmployees.push({
            id: employee.id,
            name: `${employee.first_name} ${employee.last_name}`,
            availableHours: availability.adjustedHours
          });

          // Add to hourly coverage
          for (const hour in coverage.coverageByHour) {
            if (availability.adjustedHours >= 8) { // Assuming full day availability
              coverage.coverageByHour[hour].available++;
              coverage.coverageByHour[hour].employees.push(employee.id);
            }
          }
        }
      }

      // Identify gaps
      for (const hour in coverage.coverageByHour) {
        const hourData = coverage.coverageByHour[hour];
        hourData.gap = Math.max(0, hourData.required - hourData.available);

        if (hourData.gap > 0) {
          coverage.gaps.push({
            hour,
            required: hourData.required,
            available: hourData.available,
            gap: hourData.gap
          });
        }
      }

      return res.json({
        success: true,
        data: coverage
      });
    } catch (error) {
      logger.error('Error analyzing coverage:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to analyze coverage');
    }
  }

  async getAvailabilityForecast(req: Request, res: Response) {
    try {
      const {
        weeks = 4,
        departmentId,
        includeSeasonality = false
      } = req.query;

      const forecastWeeks = Number(weeks);
      const forecast = {
        weeks: forecastWeeks,
        startDate: new Date(),
        endDate: addWeeks(new Date(), forecastWeeks),
        predictions: [] as any[],
        assumptions: {
          includeSeasonality: includeSeasonality === 'true',
          historicalDataUsed: '3 months',
          confidenceLevel: 0.85
        }
      };

      // Get historical patterns
      const historicalQuery = `
        SELECT
          DATE_TRUNC('week', ap.start_date) as week,
          COUNT(DISTINCT ap.employee_id) as employees,
          AVG((ap.weekly_hours->>'monday')::float +
              (ap.weekly_hours->>'tuesday')::float +
              (ap.weekly_hours->>'wednesday')::float +
              (ap.weekly_hours->>'thursday')::float +
              (ap.weekly_hours->>'friday')::float) as avg_weekly_hours
        FROM availability_patterns ap
        JOIN employees e ON ap.employee_id = e.id
        WHERE ap.created_at >= CURRENT_DATE - INTERVAL '3 months'
          ${departmentId ? 'AND e.department_id = $1' : ''}
        GROUP BY week
        ORDER BY week DESC
      `;

      const historicalResult = await this.db.query(
        historicalQuery,
        departmentId ? [departmentId] : []
      );

      // Generate predictions
      for (let week = 0; week < forecastWeeks; week++) {
        const weekStart = startOfWeek(addWeeks(new Date(), week));
        const weekEnd = endOfWeek(weekStart);

        // Simple forecasting based on historical average
        const avgHours = historicalResult.rows.length > 0
          ? historicalResult.rows.reduce((sum, row) => sum + parseFloat(row.avg_weekly_hours || 0), 0) / historicalResult.rows.length
          : 40;

        forecast.predictions.push({
          week: week + 1,
          weekStart,
          weekEnd,
          predictedAvailableHours: avgHours * (historicalResult.rows[0]?.employees || 10),
          confidence: 0.85 - (week * 0.05), // Confidence decreases further out
          factors: {
            holidays: 0,
            plannedLeave: 0,
            seasonalAdjustment: includeSeasonality === 'true' ? 0.1 : 0
          }
        });
      }

      return res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Error generating forecast:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to generate forecast');
    }
  }

  async exportAvailability(req: Request, res: Response) {
    try {
      const {
        format: exportFormat,
        startDate,
        endDate,
        departmentId,
        includeExceptions = false
      } = req.query;

      const start = parseISO(startDate as string);
      const end = parseISO(endDate as string);

      // Get data to export
      let employeeQuery = `
        SELECT e.*, d.name as department_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.is_active = true
      `;
      const params: any[] = [];

      if (departmentId) {
        employeeQuery += ` AND e.department_id = $${params.length + 1}`;
        params.push(departmentId);
      }

      const employees = await this.db.query(employeeQuery, params);

      const exportData = [];
      for (const employee of employees.rows) {
        let currentDate = start;
        while (currentDate <= end) {
          const availability = await this.availabilityService.getEffectiveAvailability(
            employee.id,
            currentDate
          );

          const row: any = {
            date: format(currentDate, 'yyyy-MM-dd'),
            employeeId: employee.id,
            employeeName: `${employee.first_name} ${employee.last_name}`,
            department: employee.department_name,
            availableHours: availability.adjustedHours,
            isHoliday: availability.isHoliday,
            isException: availability.isException
          };

          if (includeExceptions === 'true' && availability.isException) {
            row.exceptionReason = availability.exceptionReason;
          }

          exportData.push(row);
          currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      // Format based on requested format
      switch (exportFormat) {
        case 'csv':
          const csvData = csv.stringify(exportData, { header: true });
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="availability.csv"');
          return res.send(csvData);

        case 'excel':
          const worksheet = XLSX.utils.json_to_sheet(exportData);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Availability');
          const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename="availability.xlsx"');
          return res.send(excelBuffer);

        case 'json':
        default:
          return res.json({
            success: true,
            data: exportData
          });
      }
    } catch (error) {
      logger.error('Error exporting availability:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to export availability');
    }
  }

  // ============================================
  // ALERTS & NOTIFICATIONS
  // ============================================

  async configureAlerts(req: Request, res: Response) {
    try {
      const { alertType, threshold, recipients, enabled = true } = req.body;

      const result = await this.db.query(
        `INSERT INTO availability_alerts (alert_type, threshold, recipients, enabled)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (alert_type)
         DO UPDATE SET
           threshold = EXCLUDED.threshold,
           recipients = EXCLUDED.recipients,
           enabled = EXCLUDED.enabled,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [alertType, threshold, recipients, enabled]
      );

      return res.json({
        success: true,
        message: 'Alert configuration saved',
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error configuring alerts:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to configure alerts');
    }
  }

  async getPendingAlerts(req: Request, res: Response) {
    try {
      const { alertType, severity } = req.query;

      let query = `
        SELECT * FROM availability_alerts_queue
        WHERE processed = false
      `;
      const params: any[] = [];

      if (alertType) {
        query += ` AND alert_type = $${params.length + 1}`;
        params.push(alertType);
      }

      if (severity) {
        query += ` AND severity = $${params.length + 1}`;
        params.push(severity);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';

      const result = await this.db.query(query, params);

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching pending alerts:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to fetch pending alerts');
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private aggregateByGranularity(data: any[], granularity: string) {
    // Implementation depends on granularity
    if (granularity === 'weekly') {
      // Group by week
      return data.map(employee => ({
        ...employee,
        dataPoints: this.groupByWeek(employee.dataPoints)
      }));
    } else if (granularity === 'monthly') {
      // Group by month
      return data.map(employee => ({
        ...employee,
        dataPoints: this.groupByMonth(employee.dataPoints)
      }));
    }
    return data;
  }

  private groupByWeek(dataPoints: any[]) {
    const weeks = {};
    dataPoints.forEach(point => {
      const weekKey = format(startOfWeek(point.date), 'yyyy-MM-dd');
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          weekStart: startOfWeek(point.date),
          availableHours: 0,
          allocatedHours: 0,
          days: 0
        };
      }
      weeks[weekKey].availableHours += point.availableHours;
      weeks[weekKey].allocatedHours += point.allocatedHours;
      weeks[weekKey].days++;
    });

    return Object.values(weeks).map((week: any) => ({
      ...week,
      utilization: week.availableHours > 0
        ? (week.allocatedHours / week.availableHours) * 100
        : 0
    }));
  }

  private groupByMonth(dataPoints: any[]) {
    const months = {};
    dataPoints.forEach(point => {
      const monthKey = format(startOfMonth(point.date), 'yyyy-MM');
      if (!months[monthKey]) {
        months[monthKey] = {
          monthStart: startOfMonth(point.date),
          availableHours: 0,
          allocatedHours: 0,
          days: 0
        };
      }
      months[monthKey].availableHours += point.availableHours;
      months[monthKey].allocatedHours += point.allocatedHours;
      months[monthKey].days++;
    });

    return Object.values(months).map((month: any) => ({
      ...month,
      utilization: month.availableHours > 0
        ? (month.allocatedHours / month.availableHours) * 100
        : 0
    }));
  }

  private calculateAverageUtilization(data: any[]) {
    let totalUtilization = 0;
    let count = 0;

    data.forEach(employee => {
      employee.dataPoints.forEach((point: any) => {
        if (point.availableHours > 0) {
          totalUtilization += point.utilization;
          count++;
        }
      });
    });

    return count > 0 ? totalUtilization / count : 0;
  }

  private calculatePeakUtilization(data: any[]) {
    let peak = 0;

    data.forEach(employee => {
      employee.dataPoints.forEach((point: any) => {
        if (point.utilization > peak) {
          peak = point.utilization;
        }
      });
    });

    return peak;
  }

  private countUnderutilizedDays(data: any[]) {
    let count = 0;

    data.forEach(employee => {
      employee.dataPoints.forEach((point: any) => {
        if (point.availableHours > 0 && point.utilization < 50) {
          count++;
        }
      });
    });

    return count;
  }

  private countOverutilizedDays(data: any[]) {
    let count = 0;

    data.forEach(employee => {
      employee.dataPoints.forEach((point: any) => {
        if (point.utilization > 100) {
          count++;
        }
      });
    });

    return count;
  }
}