/**
 * Availability Patterns Service - Phase 1 Week 2
 * Following plan.md lines 61-70 specifications
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Cache } from '../utils/cache';
import { ApiError } from '../utils/api-error';

export interface PatternConfig {
  monday?: WorkDayConfig;
  tuesday?: WorkDayConfig;
  wednesday?: WorkDayConfig;
  thursday?: WorkDayConfig;
  friday?: WorkDayConfig;
  saturday?: WorkDayConfig;
  sunday?: WorkDayConfig;
  weekly_hours?: number;
  timezone?: string;
}

interface WorkDayConfig {
  available: boolean;
  hours: number;
  start?: string;
  end?: string;
}

export interface AvailabilityPattern {
  id: string;
  employee_id: string;
  pattern_name: string;
  pattern_type: 'standard' | 'flexible' | 'part_time' | 'custom';
  pattern_config: PatternConfig;
  is_active: boolean;
  effective_from: Date;
  effective_until?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AvailabilityException {
  id: string;
  employee_id: string;
  exception_date: Date;
  exception_type: string;
  available_hours: number;
  start_time?: string;
  end_time?: string;
  reason?: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Holiday {
  id: string;
  holiday_date: Date;
  holiday_name: string;
  holiday_type: 'national' | 'company' | 'regional' | 'optional';
  country_code?: string;
  working_hours: number;
  applies_to_departments: string[];
  is_recurring: boolean;
  recurrence_month?: number;
  recurrence_day?: number;
  created_at: Date;
  updated_at: Date;
}

export interface DailyCapacity {
  employee_id: string;
  date: Date;
  base_hours: number;
  available_hours: number;
  is_working_day: boolean;
  pattern_applied?: string;
  exceptions?: string[];
  holiday?: string;
}

export class AvailabilityPatternsService {
  private cache: Cache;
  private cachePrefix = 'availability';

  constructor(private pool: Pool) {
    this.cache = new Cache(); // Cache with default TTL
  }

  /**
   * Create availability pattern for an employee
   */
  async createPattern(data: Partial<AvailabilityPattern>): Promise<AvailabilityPattern> {
    const query = `
      INSERT INTO availability_patterns (
        employee_id, pattern_name, pattern_type, pattern_config,
        is_active, effective_from, effective_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      data.employee_id,
      data.pattern_name,
      data.pattern_type || 'standard',
      JSON.stringify(data.pattern_config),
      data.is_active !== false,
      data.effective_from,
      data.effective_until || (data as any).effective_to
    ];

    try {
      const result = await this.pool.query(query, values);
      await this.invalidateCacheForEmployee(data.employee_id!);
      return this.formatPattern(result.rows[0]);
    } catch (error: any) {
      throw new ApiError(500, 'Failed to create availability pattern', error);
    }
  }

  /**
   * Get availability pattern by ID
   */
  async getPatternById(patternId: string): Promise<AvailabilityPattern | null> {
    const cacheKey = `${this.cachePrefix}:pattern:id:${patternId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as AvailabilityPattern;

    const query = `
      SELECT * FROM availability_patterns
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [patternId]);
      if (result.rows.length === 0) return null;

      const pattern = this.formatPattern(result.rows[0]);
      this.cache.set(cacheKey, pattern);
      return pattern;
    } catch (error: any) {
      throw new ApiError(500, 'Failed to fetch availability pattern by ID', error);
    }
  }

  /**
   * Get availability pattern for an employee
   */
  async getPatternByEmployeeId(employeeId: string): Promise<AvailabilityPattern | null> {
    const cacheKey = `${this.cachePrefix}:pattern:${employeeId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as AvailabilityPattern;

    const query = `
      SELECT * FROM availability_patterns
      WHERE employee_id = $1 AND is_active = true
      ORDER BY effective_from DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [employeeId]);
      if (result.rows.length === 0) return null;

      const pattern = this.formatPattern(result.rows[0]);
      this.cache.set(cacheKey, pattern);
      return pattern;
    } catch (error: any) {
      throw new ApiError(500, 'Failed to fetch availability pattern', error);
    }
  }

  /**
   * Update availability pattern
   */
  async updatePattern(patternId: string, data: Partial<AvailabilityPattern>): Promise<AvailabilityPattern> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.pattern_name !== undefined) {
      fields.push(`pattern_name = $${paramCount}`);
      values.push(data.pattern_name);
      paramCount++;
    }

    if (data.pattern_type !== undefined) {
      fields.push(`pattern_type = $${paramCount}`);
      values.push(data.pattern_type);
      paramCount++;
    }

    if (data.pattern_config !== undefined) {
      fields.push(`pattern_config = $${paramCount}`);
      values.push(JSON.stringify(data.pattern_config));
      paramCount++;
    }

    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      values.push(data.is_active);
      paramCount++;
    }

    if (data.effective_from !== undefined) {
      fields.push(`effective_from = $${paramCount}`);
      values.push(data.effective_from);
      paramCount++;
    }

    if (data.effective_until !== undefined) {
      fields.push(`effective_until = $${paramCount}`);
      values.push(data.effective_until);
      paramCount++;
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      values.push(data.notes);
      paramCount++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(patternId);

    const query = `
      UPDATE availability_patterns
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Pattern not found');
      }

      const pattern = this.formatPattern(result.rows[0]);
      await this.invalidateCacheForEmployee(pattern.employee_id);
      return pattern;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to update availability pattern', error);
    }
  }

  /**
   * Create availability exception
   */
  async createException(data: Partial<AvailabilityException>): Promise<AvailabilityException> {
    const query = `
      INSERT INTO availability_exceptions (
        employee_id, exception_date, exception_type, available_hours,
        start_time, end_time, reason, is_approved, approved_by, approved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.employee_id,
      data.exception_date,
      data.exception_type,
      data.available_hours || 0,
      data.start_time,
      data.end_time,
      data.reason,
      data.is_approved || false,
      data.approved_by,
      data.approved_at
    ];

    try {
      const result = await this.pool.query(query, values);
      await this.invalidateCacheForEmployee(data.employee_id!);
      return this.formatException(result.rows[0]);
    } catch (error: any) {
      throw new ApiError(500, 'Failed to create availability exception', error);
    }
  }

  /**
   * Get exceptions for an employee within a date range
   */
  async getExceptionsByEmployee(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AvailabilityException[]> {
    const query = `
      SELECT * FROM availability_exceptions
      WHERE employee_id = $1
        AND exception_date >= $2
        AND exception_date <= $3
      ORDER BY exception_date ASC
    `;

    try {
      const result = await this.pool.query(query, [employeeId, startDate, endDate]);
      return result.rows.map(row => this.formatException(row));
    } catch (error: any) {
      throw new ApiError(500, 'Failed to fetch availability exceptions', error);
    }
  }

  /**
   * Approve availability exception
   */
  async approveException(exceptionId: string, approvedBy: string): Promise<AvailabilityException> {
    const query = `
      UPDATE availability_exceptions
      SET is_approved = true,
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, [approvedBy, exceptionId]);
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Exception not found');
      }

      const exception = this.formatException(result.rows[0]);
      await this.invalidateCacheForEmployee(exception.employee_id);
      return exception;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'Failed to approve exception', error);
    }
  }

  /**
   * Create holiday
   */
  async createHoliday(data: Partial<Holiday>): Promise<Holiday> {
    const query = `
      INSERT INTO holiday_calendar (
        holiday_date, holiday_name, holiday_type, country_code,
        working_hours, applies_to_departments, is_recurring,
        recurrence_month, recurrence_day
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.holiday_date,
      data.holiday_name,
      data.holiday_type || 'company',
      data.country_code,
      data.working_hours || 0,
      data.applies_to_departments || [],
      data.is_recurring || false,
      data.recurrence_month,
      data.recurrence_day
    ];

    try {
      const result = await this.pool.query(query, values);
      await this.invalidateAllCache();
      return this.formatHoliday(result.rows[0]);
    } catch (error: any) {
      throw new ApiError(500, 'Failed to create holiday', error);
    }
  }

  /**
   * Get holidays within a date range
   */
  async getHolidays(startDate: Date, endDate: Date): Promise<Holiday[]> {
    const cacheKey = `${this.cachePrefix}:holidays:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as Holiday[];

    const query = `
      SELECT * FROM holiday_calendar
      WHERE holiday_date >= $1 AND holiday_date <= $2
      ORDER BY holiday_date ASC
    `;

    try {
      const result = await this.pool.query(query, [startDate, endDate]);
      const holidays = result.rows.map(row => this.formatHoliday(row));
      this.cache.set(cacheKey, holidays);
      return holidays;
    } catch (error: any) {
      throw new ApiError(500, 'Failed to fetch holidays', error);
    }
  }

  /**
   * Calculate daily capacity for an employee considering patterns, exceptions, and holidays
   */
  async calculateDailyCapacity(employeeId: string, date: Date): Promise<DailyCapacity> {
    const cacheKey = `${this.cachePrefix}:capacity:${employeeId}:${date.toISOString()}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as DailyCapacity;

    try {
      // Use the enhanced function from our migration if it exists
      const query = `
        SELECT * FROM calculate_daily_capacity_enhanced($1, $2)
      `;

      const result = await this.pool.query(query, [employeeId, date]);

      if (result.rows.length > 0) {
        const capacity = this.formatCapacity(result.rows[0]);
        this.cache.set(cacheKey, capacity);
        return capacity;
      }
    } catch (error) {
      // Fall back to basic calculation if function doesn't exist
      console.warn('Enhanced capacity calculation not available, using basic calculation');
    }

    // Basic capacity calculation fallback
    const pattern = await this.getPatternByEmployeeId(employeeId);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof PatternConfig;

    let baseHours = 8; // Default
    let isWorkingDay = true;

    if (pattern?.pattern_config[dayOfWeek]) {
      const dayConfig = pattern.pattern_config[dayOfWeek] as WorkDayConfig;
      baseHours = dayConfig.hours || 0;
      isWorkingDay = dayConfig.available || false;
    }

    // Check for exceptions
    const exceptions = await this.getExceptionsByEmployee(employeeId, date, date);
    let availableHours = baseHours;

    if (exceptions.length > 0) {
      const exception = exceptions[0];
      availableHours = exception.available_hours;
    }

    // Check for holidays
    const holidays = await this.getHolidays(date, date);
    let holiday = undefined;

    if (holidays.length > 0) {
      holiday = holidays[0].holiday_name;
      availableHours = holidays[0].working_hours;
    }

    const capacity: DailyCapacity = {
      employee_id: employeeId,
      date,
      base_hours: baseHours,
      available_hours: availableHours,
      is_working_day: isWorkingDay && availableHours > 0,
      pattern_applied: pattern?.pattern_name,
      exceptions: exceptions.map(e => e.exception_type),
      holiday
    };

    this.cache.set(cacheKey, capacity);
    return capacity;
  }

  /**
   * Get capacity for date range
   */
  async getCapacityForRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyCapacity[]> {
    const capacities: DailyCapacity[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const capacity = await this.calculateDailyCapacity(employeeId, new Date(current));
      capacities.push(capacity);
      current.setDate(current.getDate() + 1);
    }

    return capacities;
  }

  /**
   * Helper methods
   */
  private formatPattern(row: any): AvailabilityPattern {
    return {
      id: row.id,
      employee_id: row.employee_id,
      pattern_name: row.pattern_name,
      pattern_type: row.pattern_type,
      pattern_config: typeof row.pattern_config === 'string'
        ? JSON.parse(row.pattern_config)
        : row.pattern_config,
      is_active: row.is_active,
      effective_from: row.effective_from,
      // effective_to: row.effective_until, // Removed duplicate property
      effective_until: row.effective_until,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private formatException(row: any): AvailabilityException {
    return {
      id: row.id,
      employee_id: row.employee_id,
      exception_date: row.exception_date,
      exception_type: row.exception_type,
      available_hours: parseFloat(row.available_hours || 0),
      start_time: row.start_time,
      end_time: row.end_time,
      reason: row.reason,
      is_approved: row.is_approved,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private formatHoliday(row: any): Holiday {
    return {
      id: row.id,
      holiday_date: row.holiday_date,
      holiday_name: row.holiday_name,
      holiday_type: row.holiday_type,
      country_code: row.country_code,
      working_hours: parseFloat(row.working_hours || 0),
      applies_to_departments: row.applies_to_departments || [],
      is_recurring: row.is_recurring,
      recurrence_month: row.recurrence_month,
      recurrence_day: row.recurrence_day,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private formatCapacity(row: any): DailyCapacity {
    return {
      employee_id: row.employee_id,
      date: row.date,
      base_hours: parseFloat(row.base_hours || 0),
      available_hours: parseFloat(row.available_hours || 0),
      is_working_day: row.is_working_day,
      pattern_applied: row.pattern_applied,
      exceptions: row.exceptions || [],
      holiday: row.holiday
    };
  }

  private async invalidateCacheForEmployee(employeeId: string): Promise<void> {
    const keysToInvalidate = [
      `${this.cachePrefix}:pattern:${employeeId}`,
      `${this.cachePrefix}:capacity:${employeeId}:*`
    ];

    keysToInvalidate.forEach(pattern => {
      if (pattern.includes('*')) {
        // Clear all keys matching pattern
        this.cache.clear();
      } else {
        this.cache.delete(pattern);
      }
    });
  }

  private async invalidateAllCache(): Promise<void> {
    this.cache.clear();
  }
}