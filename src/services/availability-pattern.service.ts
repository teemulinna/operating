import { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  differenceInDays,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO
} from 'date-fns';
import { WebSocketService } from '../websocket/websocket.service';
import { CacheService } from './cache.service';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

// ============================================
// SCHEMAS
// ============================================

export const PatternType = z.enum(['weekly', 'biweekly', 'monthly', 'custom']);
export type PatternType = z.infer<typeof PatternType>;

export const ExceptionType = z.enum(['holiday', 'leave', 'training', 'other']);
export type ExceptionType = z.infer<typeof ExceptionType>;

export const DayOfWeek = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
export type DayOfWeek = z.infer<typeof DayOfWeek>;

export const AvailabilityPatternSchema = z.object({
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  patternType: PatternType,
  configuration: z.object({
    weeklyHours: z.number().min(0).max(168).optional(),
    dailyHours: z.number().min(0).max(24).optional(),
    workDays: z.array(DayOfWeek).optional(),
    customSchedule: z.record(DayOfWeek, z.object({
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      breakMinutes: z.number().min(0).max(480).optional()
    })).optional(),
    biweeklySchedule: z.object({
      weekA: z.record(DayOfWeek, z.number().min(0).max(24)),
      weekB: z.record(DayOfWeek, z.number().min(0).max(24))
    }).optional(),
    timeZone: z.string().optional()
  }),
  effectiveFrom: z.date().or(z.string().datetime()),
  effectiveTo: z.date().or(z.string().datetime()).optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional()
});

export type AvailabilityPattern = z.infer<typeof AvailabilityPatternSchema>;

export const AvailabilityExceptionSchema = z.object({
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  exceptionDate: z.date().or(z.string().datetime()),
  exceptionEndDate: z.date().or(z.string().datetime()).optional(),
  exceptionType: ExceptionType,
  hoursAvailable: z.number().min(0).max(24),
  reason: z.string(),
  isApproved: z.boolean().default(false),
  approvedBy: z.string().uuid().optional(),
  approvedAt: z.date().or(z.string().datetime()).optional(),
  createdAt: z.date().or(z.string().datetime()).optional()
});

export type AvailabilityException = z.infer<typeof AvailabilityExceptionSchema>;

export const HolidaySchema = z.object({
  id: z.string().uuid().optional(),
  holidayDate: z.date().or(z.string().datetime()),
  name: z.string(),
  country: z.string().optional(),
  region: z.string().optional(),
  isCompanyWide: z.boolean().default(true),
  isActive: z.boolean().default(true)
});

export type Holiday = z.infer<typeof HolidaySchema>;

export const EffectiveAvailabilitySchema = z.object({
  employeeId: z.string().uuid(),
  date: z.date(),
  baseHours: z.number(),
  adjustedHours: z.number(),
  isHoliday: z.boolean(),
  isException: z.boolean(),
  exceptionReason: z.string().optional(),
  patternId: z.string().uuid().optional()
});

export type EffectiveAvailability = z.infer<typeof EffectiveAvailabilitySchema>;

// ============================================
// SERVICE
// ============================================

export class AvailabilityPatternService {
  private db: Pool;
  private cache: CacheService;
  private ws: WebSocketService;

  constructor(
    db: Pool,
    cacheService: CacheService,
    websocketService: WebSocketService
  ) {
    this.db = db;
    this.cache = cacheService;
    this.ws = websocketService;
  }

  /**
   * Create a new availability pattern
   */
  async createPattern(pattern: AvailabilityPattern): Promise<AvailabilityPattern> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Validate pattern
      const validatedPattern = AvailabilityPatternSchema.parse(pattern);

      // Deactivate existing patterns if this is the new active pattern
      if (validatedPattern.isActive) {
        await client.query(
          `UPDATE availability_patterns
           SET is_active = false
           WHERE employee_id = $1 AND is_active = true`,
          [validatedPattern.employeeId]
        );
      }

      // Insert new pattern
      const insertQuery = `
        INSERT INTO availability_patterns (
          employee_id, pattern_type, configuration,
          effective_from, effective_to, is_active, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        validatedPattern.employeeId,
        validatedPattern.patternType,
        JSON.stringify(validatedPattern.configuration),
        validatedPattern.effectiveFrom,
        validatedPattern.effectiveTo || null,
        validatedPattern.isActive,
        validatedPattern.notes || null
      ]);

      const created = result.rows[0];

      // Trigger capacity recalculation
      await this.triggerCapacityRecalculation(
        client,
        validatedPattern.employeeId,
        validatedPattern.effectiveFrom as Date,
        validatedPattern.effectiveTo as Date | undefined
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(validatedPattern.employeeId);

      // Notify via WebSocket
      this.ws.broadcast('availability:pattern:created', {
        employeeId: validatedPattern.employeeId,
        patternId: created.id,
        effectiveFrom: validatedPattern.effectiveFrom
      });

      logger.info('Availability pattern created', {
        patternId: created.id,
        employeeId: validatedPattern.employeeId
      });

      return this.formatPattern(created);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating availability pattern:', error);
      throw new ApiError('Failed to create availability pattern', 500);
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing availability pattern
   */
  async updatePattern(
    patternId: string,
    updates: Partial<AvailabilityPattern>
  ): Promise<AvailabilityPattern> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get existing pattern
      const existingQuery = `
        SELECT * FROM availability_patterns WHERE id = $1
      `;
      const existingResult = await client.query(existingQuery, [patternId]);

      if (existingResult.rows.length === 0) {
        throw new ApiError('Availability pattern not found', 404);
      }

      const existing = existingResult.rows[0];

      // Merge updates
      const updatedPattern = {
        ...existing,
        ...updates,
        configuration: updates.configuration
          ? JSON.stringify(updates.configuration)
          : existing.configuration
      };

      // Update pattern
      const updateQuery = `
        UPDATE availability_patterns
        SET pattern_type = $2,
            configuration = $3,
            effective_from = $4,
            effective_to = $5,
            is_active = $6,
            notes = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        patternId,
        updatedPattern.pattern_type,
        updatedPattern.configuration,
        updatedPattern.effective_from,
        updatedPattern.effective_to || null,
        updatedPattern.is_active,
        updatedPattern.notes || null
      ]);

      const updated = result.rows[0];

      // Trigger capacity recalculation
      await this.triggerCapacityRecalculation(
        client,
        updated.employee_id,
        updated.effective_from,
        updated.effective_to
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(updated.employee_id);

      // Notify via WebSocket
      this.ws.broadcast('availability:pattern:updated', {
        employeeId: updated.employee_id,
        patternId: updated.id
      });

      logger.info('Availability pattern updated', { patternId });

      return this.formatPattern(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating availability pattern:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get availability patterns for an employee
   */
  async getEmployeePatterns(
    employeeId: string,
    activeOnly: boolean = false
  ): Promise<AvailabilityPattern[]> {
    try {
      const query = `
        SELECT * FROM availability_patterns
        WHERE employee_id = $1
        ${activeOnly ? 'AND is_active = true' : ''}
        ORDER BY effective_from DESC
      `;

      const result = await this.db.query(query, [employeeId]);
      return result.rows.map(row => this.formatPattern(row));
    } catch (error) {
      logger.error('Error getting employee patterns:', error);
      throw new ApiError('Failed to retrieve availability patterns', 500);
    }
  }

  /**
   * Create an availability exception
   */
  async createException(exception: AvailabilityException): Promise<AvailabilityException> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Validate exception
      const validatedException = AvailabilityExceptionSchema.parse(exception);

      // Insert exception
      const insertQuery = `
        INSERT INTO availability_exceptions (
          employee_id, exception_date, exception_end_date,
          exception_type, hours_available, reason,
          is_approved, approved_by, approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        validatedException.employeeId,
        validatedException.exceptionDate,
        validatedException.exceptionEndDate || validatedException.exceptionDate,
        validatedException.exceptionType,
        validatedException.hoursAvailable,
        validatedException.reason,
        validatedException.isApproved,
        validatedException.approvedBy || null,
        validatedException.approvedAt || null
      ]);

      const created = result.rows[0];

      // Trigger capacity recalculation for exception period
      await this.triggerCapacityRecalculation(
        client,
        validatedException.employeeId,
        validatedException.exceptionDate as Date,
        validatedException.exceptionEndDate as Date | undefined
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(validatedException.employeeId);

      // Notify via WebSocket
      this.ws.broadcast('availability:exception:created', {
        employeeId: validatedException.employeeId,
        exceptionId: created.id,
        dates: {
          start: validatedException.exceptionDate,
          end: validatedException.exceptionEndDate
        }
      });

      logger.info('Availability exception created', {
        exceptionId: created.id,
        employeeId: validatedException.employeeId
      });

      return this.formatException(created);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating availability exception:', error);
      throw new ApiError('Failed to create availability exception', 500);
    } finally {
      client.release();
    }
  }

  /**
   * Approve an availability exception
   */
  async approveException(
    exceptionId: string,
    approvedBy: string
  ): Promise<AvailabilityException> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Update exception
      const updateQuery = `
        UPDATE availability_exceptions
        SET is_approved = true,
            approved_by = $2,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [exceptionId, approvedBy]);

      if (result.rows.length === 0) {
        throw new ApiError('Exception not found', 404);
      }

      const approved = result.rows[0];

      // Trigger capacity recalculation
      await this.triggerCapacityRecalculation(
        client,
        approved.employee_id,
        approved.exception_date,
        approved.exception_end_date
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(approved.employee_id);

      // Notify via WebSocket
      this.ws.broadcast('availability:exception:approved', {
        employeeId: approved.employee_id,
        exceptionId: approved.id
      });

      logger.info('Availability exception approved', { exceptionId });

      return this.formatException(approved);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error approving exception:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get availability exceptions for an employee
   */
  async getEmployeeExceptions(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
    approvedOnly: boolean = false
  ): Promise<AvailabilityException[]> {
    try {
      let query = `
        SELECT * FROM availability_exceptions
        WHERE employee_id = $1
      `;
      const params: any[] = [employeeId];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND exception_end_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND exception_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (approvedOnly) {
        query += ` AND is_approved = true`;
      }

      query += ` ORDER BY exception_date DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.formatException(row));
    } catch (error) {
      logger.error('Error getting employee exceptions:', error);
      throw new ApiError('Failed to retrieve availability exceptions', 500);
    }
  }

  /**
   * Get holidays
   */
  async getHolidays(
    startDate?: Date,
    endDate?: Date,
    country?: string,
    region?: string
  ): Promise<Holiday[]> {
    try {
      // Check cache first
      const cacheKey = `holidays:${startDate}:${endDate}:${country}:${region}`;
      const cached = await this.cache.get<Holiday[]>(cacheKey);
      if (cached) return cached;

      let query = `
        SELECT * FROM holiday_calendar
        WHERE is_active = true
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        query += ` AND holiday_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND holiday_date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (country) {
        query += ` AND (country = $${paramIndex} OR country IS NULL)`;
        params.push(country);
        paramIndex++;
      }

      if (region) {
        query += ` AND (region = $${paramIndex} OR region IS NULL)`;
        params.push(region);
        paramIndex++;
      }

      query += ` ORDER BY holiday_date`;

      const result = await this.db.query(query, params);
      const holidays = result.rows.map(row => this.formatHoliday(row));

      // Cache for 24 hours
      await this.cache.set(cacheKey, holidays, 86400);

      return holidays;
    } catch (error) {
      logger.error('Error getting holidays:', error);
      throw new ApiError('Failed to retrieve holidays', 500);
    }
  }

  /**
   * Create a holiday
   */
  async createHoliday(holiday: Holiday): Promise<Holiday> {
    try {
      const validatedHoliday = HolidaySchema.parse(holiday);

      const insertQuery = `
        INSERT INTO holiday_calendar (
          holiday_date, name, country, region, is_company_wide, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.db.query(insertQuery, [
        validatedHoliday.holidayDate,
        validatedHoliday.name,
        validatedHoliday.country || null,
        validatedHoliday.region || null,
        validatedHoliday.isCompanyWide,
        validatedHoliday.isActive
      ]);

      // Clear holiday cache
      await this.cache.delete('holidays:*');

      // Trigger capacity recalculation for all employees if company-wide
      if (validatedHoliday.isCompanyWide) {
        await this.triggerGlobalCapacityRecalculation(
          validatedHoliday.holidayDate as Date
        );
      }

      logger.info('Holiday created', { holidayId: result.rows[0].id });

      return this.formatHoliday(result.rows[0]);
    } catch (error) {
      logger.error('Error creating holiday:', error);
      throw new ApiError('Failed to create holiday', 500);
    }
  }

  /**
   * Calculate effective availability for an employee on a specific date
   */
  async getEffectiveAvailability(
    employeeId: string,
    date: Date
  ): Promise<EffectiveAvailability> {
    try {
      // Check cache first
      const cacheKey = `availability:${employeeId}:${format(date, 'yyyy-MM-dd')}`;
      const cached = await this.cache.get<EffectiveAvailability>(cacheKey);
      if (cached) return cached;

      // Get effective pattern
      const patternQuery = `
        SELECT * FROM get_effective_availability_pattern($1, $2)
      `;
      const patternResult = await this.db.query(patternQuery, [employeeId, date]);

      if (patternResult.rows.length === 0) {
        // No pattern found, use default
        return {
          employeeId,
          date,
          baseHours: 8,
          adjustedHours: 8,
          isHoliday: false,
          isException: false
        };
      }

      const pattern = patternResult.rows[0];
      let baseHours = this.calculateDailyHours(pattern, date);

      // Check for holiday
      const holidayQuery = `
        SELECT * FROM holiday_calendar
        WHERE holiday_date = $1
        AND is_active = true
        AND is_company_wide = true
        LIMIT 1
      `;
      const holidayResult = await this.db.query(holidayQuery, [date]);
      const isHoliday = holidayResult.rows.length > 0;

      // Check for exception
      const exceptionQuery = `
        SELECT * FROM availability_exceptions
        WHERE employee_id = $1
        AND $2 BETWEEN exception_date AND exception_end_date
        AND is_approved = true
        LIMIT 1
      `;
      const exceptionResult = await this.db.query(exceptionQuery, [employeeId, date]);
      const exception = exceptionResult.rows[0];

      let adjustedHours = baseHours;
      let isException = false;
      let exceptionReason: string | undefined;

      if (isHoliday) {
        adjustedHours = 0;
      } else if (exception) {
        adjustedHours = exception.hours_available;
        isException = true;
        exceptionReason = exception.reason;
      }

      const effectiveAvailability: EffectiveAvailability = {
        employeeId,
        date,
        baseHours,
        adjustedHours,
        isHoliday,
        isException,
        exceptionReason,
        patternId: pattern.id
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, effectiveAvailability, 3600);

      return effectiveAvailability;
    } catch (error) {
      logger.error('Error calculating effective availability:', error);
      throw new ApiError('Failed to calculate effective availability', 500);
    }
  }

  /**
   * Calculate availability for a date range
   */
  async getAvailabilityRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<EffectiveAvailability[]> {
    try {
      const days = differenceInDays(endDate, startDate) + 1;
      const availabilities: EffectiveAvailability[] = [];

      for (let i = 0; i < days; i++) {
        const date = addDays(startDate, i);
        const availability = await this.getEffectiveAvailability(employeeId, date);
        availabilities.push(availability);
      }

      return availabilities;
    } catch (error) {
      logger.error('Error getting availability range:', error);
      throw new ApiError('Failed to retrieve availability range', 500);
    }
  }

  /**
   * Bulk update availability patterns
   */
  async bulkUpdatePatterns(
    updates: Array<{ employeeId: string; pattern: AvailabilityPattern }>
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      for (const update of updates) {
        const validatedPattern = AvailabilityPatternSchema.parse(update.pattern);

        // Deactivate existing patterns
        await client.query(
          `UPDATE availability_patterns
           SET is_active = false
           WHERE employee_id = $1 AND is_active = true`,
          [update.employeeId]
        );

        // Insert new pattern
        await client.query(
          `INSERT INTO availability_patterns (
            employee_id, pattern_type, configuration,
            effective_from, effective_to, is_active, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            update.employeeId,
            validatedPattern.patternType,
            JSON.stringify(validatedPattern.configuration),
            validatedPattern.effectiveFrom,
            validatedPattern.effectiveTo || null,
            validatedPattern.isActive,
            validatedPattern.notes || null
          ]
        );

        // Clear cache for employee
        await this.clearEmployeeCache(update.employeeId);
      }

      // Trigger bulk capacity recalculation
      await client.query(
        `INSERT INTO capacity_recalculation_log (
          trigger_source, recalculation_needed, created_at
        ) VALUES ('bulk_pattern_update', true, CURRENT_TIMESTAMP)`
      );

      await client.query('COMMIT');

      // Notify via WebSocket
      this.ws.broadcast('availability:bulk:updated', {
        employeeCount: updates.length,
        timestamp: new Date()
      });

      logger.info('Bulk availability patterns updated', {
        count: updates.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error in bulk update:', error);
      throw new ApiError('Failed to bulk update availability patterns', 500);
    } finally {
      client.release();
    }
  }

  /**
   * Get a pattern by ID
   */
  async getPatternById(patternId: string): Promise<AvailabilityPattern | null> {
    try {
      const query = `SELECT * FROM availability_patterns WHERE id = $1`;
      const result = await this.db.query(query, [patternId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatPattern(result.rows[0]);
    } catch (error) {
      logger.error('Error getting pattern by ID:', error);
      throw new ApiError('Failed to retrieve availability pattern', 500);
    }
  }

  /**
   * Delete an availability pattern
   */
  async deletePattern(patternId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get pattern to find employee ID for cache clearing
      const getQuery = `SELECT employee_id FROM availability_patterns WHERE id = $1`;
      const getResult = await client.query(getQuery, [patternId]);

      if (getResult.rows.length === 0) {
        throw new ApiError('Pattern not found', 404);
      }

      const employeeId = getResult.rows[0].employee_id;

      // Delete the pattern
      const deleteQuery = `DELETE FROM availability_patterns WHERE id = $1`;
      await client.query(deleteQuery, [patternId]);

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(employeeId);

      // Notify via WebSocket
      this.ws.broadcast('availability:pattern:deleted', {
        employeeId,
        patternId
      });

      logger.info('Availability pattern deleted', { patternId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting availability pattern:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get exceptions for an employee
   */
  async getExceptions(
    employeeId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AvailabilityException[]> {
    try {
      let query = `SELECT * FROM availability_exceptions WHERE 1=1`;
      const params: any[] = [];
      let paramCount = 0;

      if (employeeId) {
        paramCount++;
        query += ` AND employee_id = $${paramCount}`;
        params.push(employeeId);
      }

      if (startDate) {
        paramCount++;
        query += ` AND exception_date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND exception_date <= $${paramCount}`;
        params.push(endDate);
      }

      query += ` ORDER BY exception_date DESC`;

      const result = await this.db.query(query, params);
      return result.rows.map(row => this.formatException(row));
    } catch (error) {
      logger.error('Error getting exceptions:', error);
      throw new ApiError('Failed to retrieve availability exceptions', 500);
    }
  }

  /**
   * Update an availability exception
   */
  async updateException(
    exceptionId: string,
    updates: Partial<AvailabilityException>
  ): Promise<AvailabilityException> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      if (updates.exceptionDate !== undefined) {
        paramCount++;
        updateFields.push(`exception_date = $${paramCount}`);
        updateValues.push(updates.exceptionDate);
      }

      if (updates.exceptionEndDate !== undefined) {
        paramCount++;
        updateFields.push(`exception_end_date = $${paramCount}`);
        updateValues.push(updates.exceptionEndDate);
      }

      if (updates.exceptionType !== undefined) {
        paramCount++;
        updateFields.push(`exception_type = $${paramCount}`);
        updateValues.push(updates.exceptionType);
      }

      if (updates.hoursAvailable !== undefined) {
        paramCount++;
        updateFields.push(`hours_available = $${paramCount}`);
        updateValues.push(updates.hoursAvailable);
      }

      if (updates.reason !== undefined) {
        paramCount++;
        updateFields.push(`reason = $${paramCount}`);
        updateValues.push(updates.reason);
      }

      if (updates.isApproved !== undefined) {
        paramCount++;
        updateFields.push(`is_approved = $${paramCount}`);
        updateValues.push(updates.isApproved);
      }

      paramCount++;
      updateValues.push(exceptionId);

      const updateQuery = `
        UPDATE availability_exceptions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new ApiError('Exception not found', 404);
      }

      const updated = result.rows[0];

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(updated.employee_id);

      // Notify via WebSocket
      this.ws.broadcast('availability:exception:updated', {
        employeeId: updated.employee_id,
        exceptionId: updated.id
      });

      logger.info('Availability exception updated', { exceptionId });

      return this.formatException(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating availability exception:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete an availability exception
   */
  async deleteException(exceptionId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Get exception to find employee ID for cache clearing
      const getQuery = `SELECT employee_id FROM availability_exceptions WHERE id = $1`;
      const getResult = await client.query(getQuery, [exceptionId]);

      if (getResult.rows.length === 0) {
        throw new ApiError('Exception not found', 404);
      }

      const employeeId = getResult.rows[0].employee_id;

      // Delete the exception
      const deleteQuery = `DELETE FROM availability_exceptions WHERE id = $1`;
      await client.query(deleteQuery, [exceptionId]);

      await client.query('COMMIT');

      // Clear cache
      await this.clearEmployeeCache(employeeId);

      // Notify via WebSocket
      this.ws.broadcast('availability:exception:deleted', {
        employeeId,
        exceptionId
      });

      logger.info('Availability exception deleted', { exceptionId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting availability exception:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a holiday
   */
  async updateHoliday(
    holidayId: string,
    updates: Partial<Holiday>
  ): Promise<Holiday> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      if (updates.holidayDate !== undefined) {
        paramCount++;
        updateFields.push(`holiday_date = $${paramCount}`);
        updateValues.push(updates.holidayDate);
      }

      if (updates.name !== undefined) {
        paramCount++;
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(updates.name);
      }

      if (updates.country !== undefined) {
        paramCount++;
        updateFields.push(`country = $${paramCount}`);
        updateValues.push(updates.country);
      }

      if (updates.region !== undefined) {
        paramCount++;
        updateFields.push(`region = $${paramCount}`);
        updateValues.push(updates.region);
      }

      if (updates.isCompanyWide !== undefined) {
        paramCount++;
        updateFields.push(`is_company_wide = $${paramCount}`);
        updateValues.push(updates.isCompanyWide);
      }

      if (updates.isActive !== undefined) {
        paramCount++;
        updateFields.push(`is_active = $${paramCount}`);
        updateValues.push(updates.isActive);
      }

      paramCount++;
      updateValues.push(holidayId);

      const updateQuery = `
        UPDATE holidays
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new ApiError('Holiday not found', 404);
      }

      const updated = result.rows[0];

      await client.query('COMMIT');

      // Clear all employee cache as holidays affect everyone
      await this.cache.delete('availability:*');

      // Notify via WebSocket
      this.ws.broadcast('availability:holiday:updated', {
        holidayId: updated.id
      });

      logger.info('Holiday updated', { holidayId });

      return this.formatHoliday(updated);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating holiday:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a holiday
   */
  async deleteHoliday(holidayId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Delete the holiday
      const deleteQuery = `DELETE FROM holidays WHERE id = $1 RETURNING id`;
      const result = await client.query(deleteQuery, [holidayId]);

      if (result.rows.length === 0) {
        throw new ApiError('Holiday not found', 404);
      }

      await client.query('COMMIT');

      // Clear all employee cache as holidays affect everyone
      await this.cache.delete('availability:*');

      // Notify via WebSocket
      this.ws.broadcast('availability:holiday:deleted', {
        holidayId
      });

      logger.info('Holiday deleted', { holidayId });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error deleting holiday:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async triggerCapacityRecalculation(
    client: PoolClient,
    employeeId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<void> {
    const query = `
      SELECT trigger_capacity_recalculation($1, $2, $3)
    `;
    await client.query(query, [
      employeeId,
      startDate,
      endDate || addDays(startDate, 365)
    ]);
  }

  private async triggerGlobalCapacityRecalculation(date: Date): Promise<void> {
    const query = `
      INSERT INTO capacity_recalculation_log (
        trigger_source, affected_entity_type, recalculation_needed, created_at
      ) VALUES ('holiday_added', 'global', true, CURRENT_TIMESTAMP)
    `;
    await this.db.query(query);
  }

  private calculateDailyHours(pattern: any, date: Date): number {
    const config = typeof pattern.configuration === 'string'
      ? JSON.parse(pattern.configuration)
      : pattern.configuration;

    // Default daily hours
    if (config.dailyHours) {
      return config.dailyHours;
    }

    // Weekly hours divided by work days
    if (config.weeklyHours && config.workDays) {
      return config.weeklyHours / config.workDays.length;
    }

    // Custom schedule
    if (config.customSchedule) {
      const dayName = format(date, 'EEEE').toLowerCase();
      const daySchedule = config.customSchedule[dayName];
      if (daySchedule) {
        const start = parseISO(`2000-01-01T${daySchedule.startTime}:00`);
        const end = parseISO(`2000-01-01T${daySchedule.endTime}:00`);
        const hours = differenceInDays(end, start) * 24;
        const breakHours = (daySchedule.breakMinutes || 0) / 60;
        return Math.max(0, hours - breakHours);
      }
    }

    // Default to 8 hours
    return 8;
  }

  private async clearEmployeeCache(employeeId: string): Promise<void> {
    await this.cache.delete(`availability:${employeeId}:*`);
  }

  private formatPattern(row: any): AvailabilityPattern {
    return {
      id: row.id,
      employeeId: row.employee_id,
      patternType: row.pattern_type,
      configuration: typeof row.configuration === 'string'
        ? JSON.parse(row.configuration)
        : row.configuration,
      effectiveFrom: row.effective_from,
      effectiveTo: row.effective_to,
      isActive: row.is_active,
      notes: row.notes
    };
  }

  private formatException(row: any): AvailabilityException {
    return {
      id: row.id,
      employeeId: row.employee_id,
      exceptionDate: row.exception_date,
      exceptionEndDate: row.exception_end_date,
      exceptionType: row.exception_type,
      hoursAvailable: parseFloat(row.hours_available),
      reason: row.reason,
      isApproved: row.is_approved,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    };
  }

  private formatHoliday(row: any): Holiday {
    return {
      id: row.id,
      holidayDate: row.holiday_date,
      name: row.name,
      country: row.country,
      region: row.region,
      isCompanyWide: row.is_company_wide,
      isActive: row.is_active
    };
  }
}