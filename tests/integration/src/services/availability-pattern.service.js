"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityPatternService = exports.EffectiveAvailabilitySchema = exports.HolidaySchema = exports.AvailabilityExceptionSchema = exports.AvailabilityPatternSchema = exports.DayOfWeek = exports.ExceptionType = exports.PatternType = void 0;
const zod_1 = require("zod");
const date_fns_1 = require("date-fns");
const api_error_1 = require("../utils/api-error");
const logger_1 = require("../utils/logger");
// ============================================
// SCHEMAS
// ============================================
exports.PatternType = zod_1.z.enum(['weekly', 'biweekly', 'monthly', 'custom']);
exports.ExceptionType = zod_1.z.enum(['holiday', 'leave', 'training', 'other']);
exports.DayOfWeek = zod_1.z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
exports.AvailabilityPatternSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    employeeId: zod_1.z.string().uuid(),
    patternType: exports.PatternType,
    configuration: zod_1.z.object({
        weeklyHours: zod_1.z.number().min(0).max(168).optional(),
        dailyHours: zod_1.z.number().min(0).max(24).optional(),
        workDays: zod_1.z.array(exports.DayOfWeek).optional(),
        customSchedule: zod_1.z.record(exports.DayOfWeek, zod_1.z.object({
            startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            breakMinutes: zod_1.z.number().min(0).max(480).optional()
        })).optional(),
        biweeklySchedule: zod_1.z.object({
            weekA: zod_1.z.record(exports.DayOfWeek, zod_1.z.number().min(0).max(24)),
            weekB: zod_1.z.record(exports.DayOfWeek, zod_1.z.number().min(0).max(24))
        }).optional(),
        timeZone: zod_1.z.string().optional()
    }),
    effectiveFrom: zod_1.z.date().or(zod_1.z.string().datetime()),
    effectiveTo: zod_1.z.date().or(zod_1.z.string().datetime()).optional(),
    isActive: zod_1.z.boolean().default(true),
    notes: zod_1.z.string().optional()
});
exports.AvailabilityExceptionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    employeeId: zod_1.z.string().uuid(),
    exceptionDate: zod_1.z.date().or(zod_1.z.string().datetime()),
    exceptionEndDate: zod_1.z.date().or(zod_1.z.string().datetime()).optional(),
    exceptionType: exports.ExceptionType,
    hoursAvailable: zod_1.z.number().min(0).max(24),
    reason: zod_1.z.string(),
    isApproved: zod_1.z.boolean().default(false),
    approvedBy: zod_1.z.string().uuid().optional(),
    approvedAt: zod_1.z.date().or(zod_1.z.string().datetime()).optional(),
    createdAt: zod_1.z.date().or(zod_1.z.string().datetime()).optional()
});
exports.HolidaySchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    holidayDate: zod_1.z.date().or(zod_1.z.string().datetime()),
    name: zod_1.z.string(),
    country: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    isCompanyWide: zod_1.z.boolean().default(true),
    isActive: zod_1.z.boolean().default(true)
});
exports.EffectiveAvailabilitySchema = zod_1.z.object({
    employeeId: zod_1.z.string().uuid(),
    date: zod_1.z.date(),
    baseHours: zod_1.z.number(),
    adjustedHours: zod_1.z.number(),
    isHoliday: zod_1.z.boolean(),
    isException: zod_1.z.boolean(),
    exceptionReason: zod_1.z.string().optional(),
    patternId: zod_1.z.string().uuid().optional()
});
// ============================================
// SERVICE
// ============================================
class AvailabilityPatternService {
    constructor(db, cacheService, websocketService) {
        this.db = db;
        this.cache = cacheService;
        this.ws = websocketService;
    }
    /**
     * Create a new availability pattern
     */
    async createPattern(pattern) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Flexible validation - accept both field naming conventions
            const validatedPattern = {
                ...pattern,
                effectiveFrom: pattern.effectiveFrom || pattern.startDate,
                effectiveTo: pattern.effectiveTo || pattern.endDate,
                name: pattern.name || 'Custom Pattern'
            };
            // Deactivate existing patterns if this is the new active pattern
            if (validatedPattern.isActive) {
                await client.query(`UPDATE availability_patterns
           SET is_active = false
           WHERE employee_id = $1 AND is_active = true`, [validatedPattern.employeeId]);
            }
            // Insert new pattern
            const insertQuery = `
        INSERT INTO availability_patterns (
          employee_id, pattern_type, name, description,
          start_date, end_date, is_active, weekly_hours, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const result = await client.query(insertQuery, [
                validatedPattern.employeeId,
                validatedPattern.patternType,
                validatedPattern.name || 'Custom Pattern',
                validatedPattern.notes || validatedPattern.description || null,
                validatedPattern.effectiveFrom,
                validatedPattern.effectiveTo || null,
                validatedPattern.isActive || false,
                validatedPattern.weeklyHours || validatedPattern.configuration || {},
                validatedPattern.configuration && validatedPattern.notes ? { configuration: validatedPattern.configuration, notes: validatedPattern.notes } : {}
            ]);
            const created = result.rows[0];
            // Trigger capacity recalculation
            await this.triggerCapacityRecalculation(client, validatedPattern.employeeId, validatedPattern.effectiveFrom, validatedPattern.effectiveTo);
            await client.query('COMMIT');
            // Clear cache
            await this.clearEmployeeCache(validatedPattern.employeeId);
            // Notify via WebSocket
            this.ws.broadcast('availability:pattern:created', {
                employeeId: validatedPattern.employeeId,
                patternId: created.id,
                effectiveFrom: validatedPattern.effectiveFrom
            });
            logger_1.logger.info('Availability pattern created', {
                patternId: created.id,
                employeeId: validatedPattern.employeeId
            });
            return this.formatPattern(created);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error creating availability pattern:', error);
            throw new api_error_1.ApiError(500, 'Failed to create availability pattern');
        }
        finally {
            client.release();
        }
    }
    /**
     * Update an existing availability pattern
     */
    async updatePattern(patternId, updates) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get existing pattern
            const existingQuery = `
        SELECT * FROM availability_patterns WHERE id = $1
      `;
            const existingResult = await client.query(existingQuery, [patternId]);
            if (existingResult.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Availability pattern not found');
            }
            const existing = existingResult.rows[0];
            // Map fields from different naming conventions
            const anyUpdates = updates;
            const mappedUpdates = {
                ...updates,
                pattern_type: updates.patternType || anyUpdates.pattern_type || existing.pattern_type,
                start_date: anyUpdates.startDate || updates.effectiveFrom || anyUpdates.start_date || existing.start_date,
                end_date: anyUpdates.endDate || updates.effectiveTo || anyUpdates.end_date || existing.end_date,
                is_active: updates.isActive !== undefined ? updates.isActive : existing.is_active,
                notes: updates.notes || existing.notes
            };
            // Merge updates
            const updatedPattern = {
                ...existing,
                ...mappedUpdates,
                configuration: updates.configuration || anyUpdates.weeklyHours
                    ? JSON.stringify(updates.configuration || anyUpdates.weeklyHours)
                    : existing.configuration
            };
            // Update pattern
            const updateQuery = `
        UPDATE availability_patterns
        SET pattern_type = $2,
            configuration = $3,
            start_date = $4,
            end_date = $5,
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
                updatedPattern.start_date,
                updatedPattern.end_date || null,
                updatedPattern.is_active,
                updatedPattern.notes || null
            ]);
            const updated = result.rows[0];
            // Trigger capacity recalculation
            await this.triggerCapacityRecalculation(client, updated.employee_id, updated.start_date, updated.end_date);
            await client.query('COMMIT');
            // Clear cache
            await this.clearEmployeeCache(updated.employee_id);
            // Notify via WebSocket
            this.ws.broadcast('availability:pattern:updated', {
                employeeId: updated.employee_id,
                patternId: updated.id
            });
            logger_1.logger.info('Availability pattern updated', { patternId });
            return this.formatPattern(updated);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error updating availability pattern:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get availability patterns for an employee
     */
    async getEmployeePatterns(employeeId, activeOnly = false) {
        try {
            const query = `
        SELECT * FROM availability_patterns
        WHERE employee_id = $1
        ${activeOnly ? 'AND is_active = true' : ''}
        ORDER BY effective_from DESC
      `;
            const result = await this.db.query(query, [employeeId]);
            return result.rows.map(row => this.formatPattern(row));
        }
        catch (error) {
            logger_1.logger.error('Error getting employee patterns:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve availability patterns');
        }
    }
    /**
     * Create an availability exception
     */
    async createException(exception) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Validate exception
            const validatedException = exports.AvailabilityExceptionSchema.parse(exception);
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
            await this.triggerCapacityRecalculation(client, validatedException.employeeId, validatedException.exceptionDate, validatedException.exceptionEndDate);
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
            logger_1.logger.info('Availability exception created', {
                exceptionId: created.id,
                employeeId: validatedException.employeeId
            });
            return this.formatException(created);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error creating availability exception:', error);
            throw new api_error_1.ApiError(500, 'Failed to create availability exception');
        }
        finally {
            client.release();
        }
    }
    /**
     * Approve an availability exception
     */
    async approveException(exceptionId, approvedBy) {
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
                throw new api_error_1.ApiError(404, 'Exception not found');
            }
            const approved = result.rows[0];
            // Trigger capacity recalculation
            await this.triggerCapacityRecalculation(client, approved.employee_id, approved.exception_date, approved.exception_end_date);
            await client.query('COMMIT');
            // Clear cache
            await this.clearEmployeeCache(approved.employee_id);
            // Notify via WebSocket
            this.ws.broadcast('availability:exception:approved', {
                employeeId: approved.employee_id,
                exceptionId: approved.id
            });
            logger_1.logger.info('Availability exception approved', { exceptionId });
            return this.formatException(approved);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error approving exception:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get availability exceptions for an employee
     */
    async getEmployeeExceptions(employeeId, startDate, endDate, approvedOnly = false) {
        try {
            let query = `
        SELECT * FROM availability_exceptions
        WHERE employee_id = $1
      `;
            const params = [employeeId];
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
        }
        catch (error) {
            logger_1.logger.error('Error getting employee exceptions:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve availability exceptions');
        }
    }
    /**
     * Get holidays
     */
    async getHolidays(startDate, endDate, country, region) {
        try {
            // Check cache first
            const cacheKey = `holidays:${startDate}:${endDate}:${country}:${region}`;
            const cached = await this.cache.get(cacheKey);
            if (cached)
                return cached;
            let query = `
        SELECT * FROM holiday_calendar
        WHERE is_active = true
      `;
            const params = [];
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
        }
        catch (error) {
            logger_1.logger.error('Error getting holidays:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve holidays');
        }
    }
    /**
     * Create a holiday
     */
    async createHoliday(holiday) {
        try {
            const validatedHoliday = exports.HolidaySchema.parse(holiday);
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
                await this.triggerGlobalCapacityRecalculation(validatedHoliday.holidayDate);
            }
            logger_1.logger.info('Holiday created', { holidayId: result.rows[0].id });
            return this.formatHoliday(result.rows[0]);
        }
        catch (error) {
            logger_1.logger.error('Error creating holiday:', error);
            throw new api_error_1.ApiError(500, 'Failed to create holiday');
        }
    }
    /**
     * Calculate effective availability for an employee on a specific date
     */
    async getEffectiveAvailability(employeeId, date) {
        try {
            // Check cache first
            const cacheKey = `availability:${employeeId}:${(0, date_fns_1.format)(date, 'yyyy-MM-dd')}`;
            const cached = await this.cache.get(cacheKey);
            if (cached)
                return cached;
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
            let exceptionReason;
            if (isHoliday) {
                adjustedHours = 0;
            }
            else if (exception) {
                adjustedHours = exception.hours_available;
                isException = true;
                exceptionReason = exception.reason;
            }
            const effectiveAvailability = {
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
        }
        catch (error) {
            logger_1.logger.error('Error calculating effective availability:', error);
            throw new api_error_1.ApiError(500, 'Failed to calculate effective availability');
        }
    }
    /**
     * Calculate availability for a date range
     */
    async getAvailabilityRange(employeeId, startDate, endDate) {
        try {
            const days = (0, date_fns_1.differenceInDays)(endDate, startDate) + 1;
            const availabilities = [];
            for (let i = 0; i < days; i++) {
                const date = (0, date_fns_1.addDays)(startDate, i);
                const availability = await this.getEffectiveAvailability(employeeId, date);
                availabilities.push(availability);
            }
            return availabilities;
        }
        catch (error) {
            logger_1.logger.error('Error getting availability range:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve availability range');
        }
    }
    /**
     * Bulk update availability patterns
     */
    async bulkUpdatePatterns(updates) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            for (const update of updates) {
                const validatedPattern = exports.AvailabilityPatternSchema.parse(update.pattern);
                // Deactivate existing patterns
                await client.query(`UPDATE availability_patterns
           SET is_active = false
           WHERE employee_id = $1 AND is_active = true`, [update.employeeId]);
                // Insert new pattern
                await client.query(`INSERT INTO availability_patterns (
            employee_id, pattern_type, configuration,
            effective_from, effective_to, is_active, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                    update.employeeId,
                    validatedPattern.patternType,
                    JSON.stringify(validatedPattern.configuration),
                    validatedPattern.effectiveFrom,
                    validatedPattern.effectiveTo || null,
                    validatedPattern.isActive,
                    validatedPattern.notes || null
                ]);
                // Clear cache for employee
                await this.clearEmployeeCache(update.employeeId);
            }
            // Trigger bulk capacity recalculation
            await client.query(`INSERT INTO capacity_recalculation_log (
          trigger_source, recalculation_needed, created_at
        ) VALUES ('bulk_pattern_update', true, CURRENT_TIMESTAMP)`);
            await client.query('COMMIT');
            // Notify via WebSocket
            this.ws.broadcast('availability:bulk:updated', {
                employeeCount: updates.length,
                timestamp: new Date()
            });
            logger_1.logger.info('Bulk availability patterns updated', {
                count: updates.length
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error in bulk update:', error);
            throw new api_error_1.ApiError(500, 'Failed to bulk update availability patterns');
        }
        finally {
            client.release();
        }
    }
    /**
     * Get a pattern by ID
     */
    async getPatternById(patternId) {
        try {
            const query = `SELECT * FROM availability_patterns WHERE id = $1`;
            const result = await this.db.query(query, [patternId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.formatPattern(result.rows[0]);
        }
        catch (error) {
            logger_1.logger.error('Error getting pattern by ID:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve availability pattern');
        }
    }
    /**
     * Delete an availability pattern
     */
    async deletePattern(patternId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get pattern to find employee ID for cache clearing
            const getQuery = `SELECT employee_id FROM availability_patterns WHERE id = $1`;
            const getResult = await client.query(getQuery, [patternId]);
            if (getResult.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Pattern not found');
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
            logger_1.logger.info('Availability pattern deleted', { patternId });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error deleting availability pattern:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get exceptions for an employee
     */
    async getExceptions(employeeId, startDate, endDate) {
        try {
            let query = `SELECT * FROM availability_exceptions WHERE 1=1`;
            const params = [];
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
        }
        catch (error) {
            logger_1.logger.error('Error getting exceptions:', error);
            throw new api_error_1.ApiError(500, 'Failed to retrieve availability exceptions');
        }
    }
    /**
     * Update an availability exception
     */
    async updateException(exceptionId, updates) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const updateFields = [];
            const updateValues = [];
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
                throw new api_error_1.ApiError(404, 'Exception not found');
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
            logger_1.logger.info('Availability exception updated', { exceptionId });
            return this.formatException(updated);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error updating availability exception:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete an availability exception
     */
    async deleteException(exceptionId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Get exception to find employee ID for cache clearing
            const getQuery = `SELECT employee_id FROM availability_exceptions WHERE id = $1`;
            const getResult = await client.query(getQuery, [exceptionId]);
            if (getResult.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Exception not found');
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
            logger_1.logger.info('Availability exception deleted', { exceptionId });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error deleting availability exception:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update a holiday
     */
    async updateHoliday(holidayId, updates) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const updateFields = [];
            const updateValues = [];
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
                throw new api_error_1.ApiError(404, 'Holiday not found');
            }
            const updated = result.rows[0];
            await client.query('COMMIT');
            // Clear all employee cache as holidays affect everyone
            await this.cache.delete('availability:*');
            // Notify via WebSocket
            this.ws.broadcast('availability:holiday:updated', {
                holidayId: updated.id
            });
            logger_1.logger.info('Holiday updated', { holidayId });
            return this.formatHoliday(updated);
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error updating holiday:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete a holiday
     */
    async deleteHoliday(holidayId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            // Delete the holiday
            const deleteQuery = `DELETE FROM holidays WHERE id = $1 RETURNING id`;
            const result = await client.query(deleteQuery, [holidayId]);
            if (result.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Holiday not found');
            }
            await client.query('COMMIT');
            // Clear all employee cache as holidays affect everyone
            await this.cache.delete('availability:*');
            // Notify via WebSocket
            this.ws.broadcast('availability:holiday:deleted', {
                holidayId
            });
            logger_1.logger.info('Holiday deleted', { holidayId });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_1.logger.error('Error deleting holiday:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    // ============================================
    // PRIVATE METHODS
    // ============================================
    async triggerCapacityRecalculation(client, employeeId, startDate, endDate) {
        // TODO: Implement trigger_capacity_recalculation PostgreSQL function
        // For now, we'll just log the request
        logger_1.logger.info('Capacity recalculation triggered', {
            employeeId,
            startDate,
            endDate
        });
        // The actual implementation would call a PostgreSQL function:
        // const query = `SELECT trigger_capacity_recalculation($1, $2, $3)`;
        // await client.query(query, [employeeId, startDate, endDate || addDays(startDate, 365)]);
    }
    async triggerGlobalCapacityRecalculation(date) {
        const query = `
      INSERT INTO capacity_recalculation_log (
        trigger_source, affected_entity_type, recalculation_needed, created_at
      ) VALUES ('holiday_added', 'global', true, CURRENT_TIMESTAMP)
    `;
        await this.db.query(query);
    }
    calculateDailyHours(pattern, date) {
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
            const dayName = (0, date_fns_1.format)(date, 'EEEE').toLowerCase();
            const daySchedule = config.customSchedule[dayName];
            if (daySchedule) {
                const start = (0, date_fns_1.parseISO)(`2000-01-01T${daySchedule.startTime}:00`);
                const end = (0, date_fns_1.parseISO)(`2000-01-01T${daySchedule.endTime}:00`);
                const hours = (0, date_fns_1.differenceInDays)(end, start) * 24;
                const breakHours = (daySchedule.breakMinutes || 0) / 60;
                return Math.max(0, hours - breakHours);
            }
        }
        // Default to 8 hours
        return 8;
    }
    async clearEmployeeCache(employeeId) {
        await this.cache.delete(`availability:${employeeId}:*`);
    }
    formatPattern(row) {
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
    formatException(row) {
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
    formatHoliday(row) {
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
exports.AvailabilityPatternService = AvailabilityPatternService;
