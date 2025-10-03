"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityController = void 0;
const api_error_1 = require("../utils/api-error");
const logger_1 = require("../utils/logger");
const date_fns_1 = require("date-fns");
const XLSX = require("xlsx");
const csv = require("csv-stringify/sync");
class AvailabilityController {
    // Initialize services from request context
    getServices(req) {
        const services = req.services;
        console.log('Services object:', services ? Object.keys(services) : 'undefined');
        if (!this.availabilityService && services) {
            this.availabilityService = services.availabilityPattern || services.availabilityService;
            this.db = services.db || services.database?.getPool();
            this.cacheService = services.cache || services.cacheService;
            this.wsService = services.websocket || services.wsService;
            console.log('Availability service initialized:', !!this.availabilityService);
        }
    }
    // ============================================
    // PATTERN MANAGEMENT
    // ============================================
    async getPatterns(req, res) {
        try {
            this.getServices(req);
            const { employeeId, departmentId, isActive, patternType, page = 1, limit = 20 } = req.query;
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
            const params = [];
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
            const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
            console.log('Count Query:', countQuery); // Debug log
            console.log('Params:', params); // Debug log
            const countResult = await this.db.query(countQuery, params);
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
                description: row.description,
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching availability patterns:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch availability patterns');
        }
    }
    async getPattern(req, res) {
        try {
            const { id } = req.params;
            const pattern = await this.availabilityService.getPatternById(id);
            if (!pattern) {
                throw new api_error_1.ApiError(404, 'Availability pattern not found');
            }
            return res.json({
                success: true,
                data: pattern
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch pattern');
        }
    }
    async createPattern(req, res) {
        try {
            this.getServices(req); // Initialize services from request
            console.log('Creating pattern with body:', req.body); // Debug log
            if (!this.availabilityService) {
                logger_1.logger.error('Availability service not initialized');
                throw new api_error_1.ApiError(500, 'Service not initialized');
            }
            // Map the request body to match service expectations
            // Support both field naming conventions
            const startDate = req.body.effectiveFrom || req.body.startDate;
            const endDate = req.body.effectiveTo || req.body.endDate;
            // Validate date order if both dates are provided
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (end < start) {
                    return res.status(400).json({
                        success: false,
                        message: 'Validation failed: End date cannot be before start date'
                    });
                }
            }
            const patternData = {
                ...req.body,
                effectiveFrom: startDate ? new Date(startDate) : undefined,
                effectiveTo: endDate ? new Date(endDate) : undefined,
                configuration: req.body.configuration || req.body.weeklyHours
            };
            const pattern = await this.availabilityService.createPattern(patternData);
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
        }
        catch (error) {
            console.error('Error creating pattern:', error); // Debug log
            logger_1.logger.error('Error creating pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to create pattern');
        }
    }
    async updatePattern(req, res) {
        try {
            const { id } = req.params;
            this.getServices(req); // Initialize services from request
            if (!this.availabilityService) {
                logger_1.logger.error('Availability service not initialized');
                throw new api_error_1.ApiError(500, 'Service not initialized');
            }
            // Map the update fields to match service expectations (snake_case)
            const updateData = {};
            if (req.body.name !== undefined)
                updateData.pattern_name = req.body.name;
            if (req.body.patternType !== undefined)
                updateData.pattern_type = req.body.patternType;
            if (req.body.isActive !== undefined)
                updateData.is_active = req.body.isActive;
            if (req.body.notes !== undefined)
                updateData.notes = req.body.notes;
            if (req.body.configuration !== undefined)
                updateData.pattern_config = req.body.configuration;
            if (req.body.weeklyHours !== undefined)
                updateData.pattern_config = req.body.weeklyHours;
            // Handle date fields
            if (req.body.startDate !== undefined)
                updateData.effective_from = req.body.startDate;
            if (req.body.effectiveFrom !== undefined)
                updateData.effective_from = req.body.effectiveFrom;
            if (req.body.endDate !== undefined)
                updateData.effective_until = req.body.endDate;
            if (req.body.effectiveTo !== undefined)
                updateData.effective_until = req.body.effectiveTo;
            if (req.body.effectiveUntil !== undefined)
                updateData.effective_until = req.body.effectiveUntil;
            const pattern = await this.availabilityService.updatePattern(id, updateData);
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
        }
        catch (error) {
            logger_1.logger.error('Error updating pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to update pattern');
        }
    }
    async deletePattern(req, res) {
        try {
            const { id } = req.params;
            await this.availabilityService.deletePattern(id);
            return res.json({
                success: true,
                message: 'Availability pattern deleted successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to delete pattern');
        }
    }
    async activatePattern(req, res) {
        try {
            this.getServices(req);
            const { id } = req.params;
            // Deactivate all other patterns for this employee
            const patternResult = await this.db.query('SELECT employee_id FROM availability_patterns WHERE id = $1', [id]);
            if (patternResult.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Pattern not found');
            }
            const employeeId = patternResult.rows[0].employee_id;
            // Start transaction
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                // Deactivate all patterns for employee
                await client.query('UPDATE availability_patterns SET is_active = false WHERE employee_id = $1', [employeeId]);
                // Activate the specified pattern
                await client.query('UPDATE availability_patterns SET is_active = true WHERE id = $1', [id]);
                await client.query('COMMIT');
            }
            catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
            finally {
                client.release();
            }
            // Clear cache
            await this.cacheService.delete(`availability:employee:${employeeId}:*`);
            return res.json({
                success: true,
                message: 'Pattern activated successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error activating pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to activate pattern');
        }
    }
    async clonePattern(req, res) {
        try {
            const { id } = req.params;
            const { employeeId, name } = req.body;
            // Get source pattern
            const sourcePattern = await this.availabilityService.getPatternById(id);
            if (!sourcePattern) {
                throw new api_error_1.ApiError(404, 'Source pattern not found');
            }
            // Create cloned pattern
            const clonedPattern = await this.availabilityService.createPattern({
                ...sourcePattern,
                id: undefined,
                employeeId,
                notes: name || `${sourcePattern.notes || 'Pattern'} (Copy)`,
                isActive: false
            });
            return res.status(201).json({
                success: true,
                message: 'Pattern cloned successfully',
                data: clonedPattern
            });
        }
        catch (error) {
            logger_1.logger.error('Error cloning pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to clone pattern');
        }
    }
    // ============================================
    // EXCEPTION MANAGEMENT
    // ============================================
    async getExceptions(req, res) {
        try {
            const { employeeId, exceptionType, status, startDate, endDate, page = 1, limit = 20 } = req.query;
            const exceptions = await this.availabilityService.getExceptions(employeeId, startDate ? (0, date_fns_1.parseISO)(startDate) : undefined, endDate ? (0, date_fns_1.parseISO)(endDate) : undefined);
            // Filter by type and status if provided
            let filteredExceptions = exceptions;
            if (exceptionType) {
                filteredExceptions = filteredExceptions.filter(e => e.exceptionType === exceptionType);
            }
            if (status) {
                // Map status to isApproved for filtering
                if (status === 'approved') {
                    filteredExceptions = filteredExceptions.filter(e => e.isApproved === true);
                }
                else if (status === 'pending' || status === 'rejected') {
                    filteredExceptions = filteredExceptions.filter(e => e.isApproved === false);
                }
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching exceptions:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch exceptions');
        }
    }
    async getException(req, res) {
        try {
            this.getServices(req);
            const { id } = req.params;
            const result = await this.db.query('SELECT * FROM availability_exceptions WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Exception not found');
            }
            return res.json({
                success: true,
                data: result.rows[0]
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch exception');
        }
    }
    async createException(req, res) {
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
        }
        catch (error) {
            logger_1.logger.error('Error creating exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to create exception');
        }
    }
    async updateException(req, res) {
        try {
            const { id } = req.params;
            const exception = await this.availabilityService.updateException(id, req.body);
            return res.json({
                success: true,
                message: 'Exception updated successfully',
                data: exception
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to update exception');
        }
    }
    async deleteException(req, res) {
        try {
            const { id } = req.params;
            await this.availabilityService.deleteException(id);
            return res.json({
                success: true,
                message: 'Exception deleted successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to delete exception');
        }
    }
    async approveException(req, res) {
        try {
            this.getServices(req);
            const { id } = req.params;
            const { approvedBy, comments } = req.body;
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                const result = await client.query(`UPDATE availability_exceptions
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
           RETURNING *`, [approvedBy, JSON.stringify(comments || ''), id]);
                if (result.rows.length === 0) {
                    throw new api_error_1.ApiError(404, 'Exception not found');
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
            }
            catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Error approving exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to approve exception');
        }
    }
    async rejectException(req, res) {
        try {
            this.getServices(req);
            const { id } = req.params;
            const { rejectedBy, reason } = req.body;
            const result = await this.db.query(`UPDATE availability_exceptions
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
         RETURNING *`, [JSON.stringify(rejectedBy), JSON.stringify(reason), id]);
            if (result.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Exception not found');
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
        }
        catch (error) {
            logger_1.logger.error('Error rejecting exception:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to reject exception');
        }
    }
    // ============================================
    // HOLIDAY MANAGEMENT
    // ============================================
    async getHolidays(req, res) {
        try {
            const { year, country, region, includeOptional } = req.query;
            // Calculate date range from year
            const startDate = year ? new Date(Number(year), 0, 1) : undefined;
            const endDate = year ? new Date(Number(year), 11, 31) : undefined;
            const holidays = await this.availabilityService.getHolidays(startDate, endDate, country, region);
            return res.json({
                success: true,
                data: holidays
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching holidays:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch holidays');
        }
    }
    async getHoliday(req, res) {
        try {
            this.getServices(req);
            const { id } = req.params;
            const result = await this.db.query('SELECT * FROM holidays WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Holiday not found');
            }
            return res.json({
                success: true,
                data: result.rows[0]
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching holiday:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch holiday');
        }
    }
    async createHoliday(req, res) {
        try {
            const holiday = await this.availabilityService.createHoliday(req.body);
            return res.status(201).json({
                success: true,
                message: 'Holiday created successfully',
                data: holiday
            });
        }
        catch (error) {
            logger_1.logger.error('Error creating holiday:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to create holiday');
        }
    }
    async updateHoliday(req, res) {
        try {
            const { id } = req.params;
            const holiday = await this.availabilityService.updateHoliday(id, req.body);
            return res.json({
                success: true,
                message: 'Holiday updated successfully',
                data: holiday
            });
        }
        catch (error) {
            logger_1.logger.error('Error updating holiday:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to update holiday');
        }
    }
    async deleteHoliday(req, res) {
        try {
            const { id } = req.params;
            await this.availabilityService.deleteHoliday(id);
            return res.json({
                success: true,
                message: 'Holiday deleted successfully'
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting holiday:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to delete holiday');
        }
    }
    async bulkImportHolidays(req, res) {
        try {
            this.getServices(req);
            const { holidays, replaceExisting } = req.body;
            const client = await this.db.connect();
            try {
                await client.query('BEGIN');
                if (replaceExisting) {
                    await client.query('TRUNCATE TABLE holidays');
                }
                const imported = [];
                for (const holiday of holidays) {
                    const result = await client.query(`INSERT INTO holidays (name, holiday_date, is_recurring, country, region, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (holiday_date, COALESCE(country, ''), COALESCE(region, ''))
             DO UPDATE SET
               name = EXCLUDED.name,
               is_recurring = EXCLUDED.is_recurring,
               metadata = EXCLUDED.metadata,
               updated_at = CURRENT_TIMESTAMP
             RETURNING *`, [
                        holiday.name,
                        holiday.holidayDate,
                        holiday.isRecurring || false,
                        holiday.country || null,
                        holiday.region || null,
                        holiday.metadata || {}
                    ]);
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
            }
            catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Error bulk importing holidays:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to bulk import holidays');
        }
    }
    // ============================================
    // EFFECTIVE AVAILABILITY
    // ============================================
    async getEffectiveAvailability(req, res) {
        try {
            const { employeeId, date } = req.params;
            const availability = await this.availabilityService.getEffectiveAvailability(employeeId, (0, date_fns_1.parseISO)(date));
            return res.json({
                success: true,
                data: availability
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching effective availability:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch effective availability');
        }
    }
    async getAvailabilityRange(req, res) {
        try {
            const { employeeId } = req.params;
            const { startDate, endDate } = req.query;
            const start = (0, date_fns_1.parseISO)(startDate);
            const end = (0, date_fns_1.parseISO)(endDate);
            if ((0, date_fns_1.differenceInDays)(end, start) > 365) {
                throw new api_error_1.ApiError(400, 'Date range cannot exceed 365 days');
            }
            const availabilities = [];
            let currentDate = start;
            while (currentDate <= end) {
                const availability = await this.availabilityService.getEffectiveAvailability(employeeId, currentDate);
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching availability range:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch availability range');
        }
    }
    async getDepartmentAvailability(req, res) {
        try {
            this.getServices(req);
            const { departmentId } = req.params;
            const { date, startDate, endDate } = req.query;
            // Get all employees in department
            const employeeResult = await this.db.query('SELECT id, first_name, last_name FROM employees WHERE department_id = $1 AND is_active = true', [departmentId]);
            const targetDate = date ? (0, date_fns_1.parseISO)(date) : new Date();
            const rangeStart = startDate ? (0, date_fns_1.parseISO)(startDate) : (0, date_fns_1.startOfWeek)(targetDate);
            const rangeEnd = endDate ? (0, date_fns_1.parseISO)(endDate) : (0, date_fns_1.endOfWeek)(targetDate);
            const departmentAvailability = {
                departmentId,
                date: targetDate,
                dateRange: { start: rangeStart, end: rangeEnd },
                employees: [],
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
                const availability = await this.availabilityService.getEffectiveAvailability(employee.id, targetDate);
                const employeeData = {
                    id: employee.id,
                    name: `${employee.first_name} ${employee.last_name}`,
                    ...availability
                };
                departmentAvailability.employees.push(employeeData);
                departmentAvailability.summary.totalAvailableHours += availability.adjustedHours;
                if (availability.adjustedHours >= 8) {
                    departmentAvailability.summary.fullyAvailable++;
                }
                else if (availability.adjustedHours > 0) {
                    departmentAvailability.summary.partiallyAvailable++;
                }
                else {
                    departmentAvailability.summary.unavailable++;
                }
            }
            departmentAvailability.summary.averageUtilization =
                departmentAvailability.summary.totalAvailableHours / (employeeResult.rows.length * 8);
            return res.json({
                success: true,
                data: departmentAvailability
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching department availability:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch department availability');
        }
    }
    async getTeamAvailability(req, res) {
        try {
            this.getServices(req);
            const { teamId } = req.params;
            const { date, startDate, endDate } = req.query;
            // Get all employees in team
            const employeeResult = await this.db.query(`SELECT e.id, e.first_name, e.last_name
         FROM employees e
         JOIN team_members tm ON e.id = tm.employee_id
         WHERE tm.team_id = $1 AND e.is_active = true`, [teamId]);
            const targetDate = date ? (0, date_fns_1.parseISO)(date) : new Date();
            const rangeStart = startDate ? (0, date_fns_1.parseISO)(startDate) : (0, date_fns_1.startOfWeek)(targetDate);
            const rangeEnd = endDate ? (0, date_fns_1.parseISO)(endDate) : (0, date_fns_1.endOfWeek)(targetDate);
            const teamAvailability = {
                teamId,
                date: targetDate,
                dateRange: { start: rangeStart, end: rangeEnd },
                members: [],
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
                const availability = await this.availabilityService.getEffectiveAvailability(employee.id, targetDate);
                const memberData = {
                    id: employee.id,
                    name: `${employee.first_name} ${employee.last_name}`,
                    ...availability
                };
                teamAvailability.members.push(memberData);
                teamAvailability.summary.totalAvailableHours += availability.adjustedHours;
                if (availability.adjustedHours >= 8) {
                    teamAvailability.summary.fullyAvailable++;
                }
                else if (availability.adjustedHours > 0) {
                    teamAvailability.summary.partiallyAvailable++;
                }
                else {
                    teamAvailability.summary.unavailable++;
                }
            }
            teamAvailability.summary.averageUtilization =
                teamAvailability.summary.totalAvailableHours / (employeeResult.rows.length * 8);
            return res.json({
                success: true,
                data: teamAvailability
            });
        }
        catch (error) {
            logger_1.logger.error('Error fetching team availability:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch team availability');
        }
    }
    // ============================================
    // BULK OPERATIONS
    // ============================================
    async bulkCreatePatterns(req, res) {
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
        }
        catch (error) {
            logger_1.logger.error('Error bulk creating patterns:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to bulk create patterns');
        }
    }
    async bulkUpdatePatterns(req, res) {
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
        }
        catch (error) {
            logger_1.logger.error('Error bulk updating patterns:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to bulk update patterns');
        }
    }
    async copyWeekPattern(req, res) {
        try {
            const { sourceWeekStart, targetWeekStart, employeeIds } = req.body;
            const sourceStart = (0, date_fns_1.parseISO)(sourceWeekStart);
            const targetStart = (0, date_fns_1.parseISO)(targetWeekStart);
            // Get patterns for source week
            let query = `
        SELECT DISTINCT ap.*, e.id as employee_id
        FROM availability_patterns ap
        JOIN employees e ON ap.employee_id = e.id
        WHERE ap.is_active = true
          AND ap.start_date <= $1
          AND (ap.end_date IS NULL OR ap.end_date >= $2)
      `;
            const params = [(0, date_fns_1.endOfWeek)(sourceStart), (0, date_fns_1.startOfWeek)(sourceStart)];
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
                    endDate: (0, date_fns_1.endOfWeek)(targetStart),
                    name: `${pattern.name} (Week of ${(0, date_fns_1.format)(targetStart, 'MMM dd, yyyy')})`,
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
                    sourceWeek: (0, date_fns_1.format)(sourceStart, 'yyyy-MM-dd'),
                    targetWeek: (0, date_fns_1.format)(targetStart, 'yyyy-MM-dd'),
                    copied: copied.length,
                    patterns: copied
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error copying week pattern:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to copy week pattern');
        }
    }
    // ============================================
    // ANALYTICS & REPORTS
    // ============================================
    async getUtilizationAnalytics(req, res) {
        try {
            const { startDate, endDate, departmentId, teamId, granularity = 'daily' } = req.query;
            const start = (0, date_fns_1.parseISO)(startDate);
            const end = (0, date_fns_1.parseISO)(endDate);
            // Get employees based on filters
            let employeeQuery = 'SELECT id, first_name, last_name FROM employees WHERE is_active = true';
            const employeeParams = [];
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
                    dataPoints: []
                };
                let currentDate = start;
                while (currentDate <= end) {
                    const availability = await this.availabilityService.getEffectiveAvailability(employee.id, currentDate);
                    // Get actual allocations
                    const allocationResult = await this.db.query(`SELECT COALESCE(SUM(allocated_hours), 0) as total_hours
             FROM resource_allocations
             WHERE employee_id = $1
               AND allocation_date = $2`, [employee.id, (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd')]);
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
            const aggregatedData = this.aggregateByGranularity(utilizationData, granularity);
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching utilization analytics:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch utilization analytics');
        }
    }
    async getCoverageAnalysis(req, res) {
        try {
            const { date, shiftStart = '09:00', shiftEnd = '17:00', requiredCoverage = 5 } = req.query;
            const targetDate = (0, date_fns_1.parseISO)(date);
            // Get all available employees for the date
            const employeeResult = await this.db.query('SELECT id, first_name, last_name FROM employees WHERE is_active = true');
            const coverage = {
                date: targetDate,
                shift: { start: shiftStart, end: shiftEnd },
                requiredCoverage: Number(requiredCoverage),
                availableEmployees: [],
                coverageByHour: {},
                gaps: []
            };
            // Calculate coverage for each hour
            for (let hour = parseInt(shiftStart.split(':')[0]); hour < parseInt(shiftEnd.split(':')[0]); hour++) {
                coverage.coverageByHour[`${hour}:00`] = {
                    available: 0,
                    required: Number(requiredCoverage),
                    gap: 0,
                    employees: []
                };
            }
            // Check each employee's availability
            for (const employee of employeeResult.rows) {
                const availability = await this.availabilityService.getEffectiveAvailability(employee.id, targetDate);
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
        }
        catch (error) {
            logger_1.logger.error('Error analyzing coverage:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to analyze coverage');
        }
    }
    async getAvailabilityForecast(req, res) {
        try {
            const { weeks = 4, departmentId, includeSeasonality = false } = req.query;
            const forecastWeeks = Number(weeks);
            const forecast = {
                weeks: forecastWeeks,
                startDate: new Date(),
                endDate: (0, date_fns_1.addWeeks)(new Date(), forecastWeeks),
                predictions: [],
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
            const historicalResult = await this.db.query(historicalQuery, departmentId ? [departmentId] : []);
            // Generate predictions
            for (let week = 0; week < forecastWeeks; week++) {
                const weekStart = (0, date_fns_1.startOfWeek)((0, date_fns_1.addWeeks)(new Date(), week));
                const weekEnd = (0, date_fns_1.endOfWeek)(weekStart);
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
        }
        catch (error) {
            logger_1.logger.error('Error generating forecast:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to generate forecast');
        }
    }
    async exportAvailability(req, res) {
        try {
            this.getServices(req);
            const { format: exportFormat, startDate, endDate, departmentId, includeExceptions = false } = req.query;
            const start = (0, date_fns_1.parseISO)(startDate);
            const end = (0, date_fns_1.parseISO)(endDate);
            // Get data to export
            let employeeQuery = `
        SELECT e.*, d.name as department_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.is_active = true
      `;
            const params = [];
            if (departmentId) {
                employeeQuery += ` AND e.department_id = $${params.length + 1}`;
                params.push(departmentId);
            }
            const employees = await this.db.query(employeeQuery, params);
            const exportData = [];
            for (const employee of employees.rows) {
                let currentDate = start;
                while (currentDate <= end) {
                    const availability = await this.availabilityService.getEffectiveAvailability(employee.id, currentDate);
                    const row = {
                        date: (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd'),
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
        }
        catch (error) {
            logger_1.logger.error('Error exporting availability:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to export availability');
        }
    }
    // ============================================
    // ALERTS & NOTIFICATIONS
    // ============================================
    async configureAlerts(req, res) {
        try {
            this.getServices(req);
            const { alertType, threshold, recipients, enabled = true } = req.body;
            const result = await this.db.query(`INSERT INTO availability_alerts (alert_type, threshold, recipients, enabled)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (alert_type)
         DO UPDATE SET
           threshold = EXCLUDED.threshold,
           recipients = EXCLUDED.recipients,
           enabled = EXCLUDED.enabled,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`, [alertType, threshold, recipients, enabled]);
            return res.json({
                success: true,
                message: 'Alert configuration saved',
                data: result.rows[0]
            });
        }
        catch (error) {
            logger_1.logger.error('Error configuring alerts:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to configure alerts');
        }
    }
    async getPendingAlerts(req, res) {
        try {
            const { alertType, severity } = req.query;
            let query = `
        SELECT * FROM availability_alerts_queue
        WHERE processed = false
      `;
            const params = [];
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching pending alerts:', error);
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError(500, 'Failed to fetch pending alerts');
        }
    }
    // ============================================
    // HELPER METHODS
    // ============================================
    aggregateByGranularity(data, granularity) {
        // Implementation depends on granularity
        if (granularity === 'weekly') {
            // Group by week
            return data.map(employee => ({
                ...employee,
                dataPoints: this.groupByWeek(employee.dataPoints)
            }));
        }
        else if (granularity === 'monthly') {
            // Group by month
            return data.map(employee => ({
                ...employee,
                dataPoints: this.groupByMonth(employee.dataPoints)
            }));
        }
        return data;
    }
    groupByWeek(dataPoints) {
        const weeks = {};
        dataPoints.forEach(point => {
            const weekKey = (0, date_fns_1.format)((0, date_fns_1.startOfWeek)(point.date), 'yyyy-MM-dd');
            if (!weeks[weekKey]) {
                weeks[weekKey] = {
                    weekStart: (0, date_fns_1.startOfWeek)(point.date),
                    availableHours: 0,
                    allocatedHours: 0,
                    days: 0
                };
            }
            weeks[weekKey].availableHours += point.availableHours;
            weeks[weekKey].allocatedHours += point.allocatedHours;
            weeks[weekKey].days++;
        });
        return Object.values(weeks).map((week) => ({
            ...week,
            utilization: week.availableHours > 0
                ? (week.allocatedHours / week.availableHours) * 100
                : 0
        }));
    }
    groupByMonth(dataPoints) {
        const months = {};
        dataPoints.forEach(point => {
            const monthKey = (0, date_fns_1.format)((0, date_fns_1.startOfMonth)(point.date), 'yyyy-MM');
            if (!months[monthKey]) {
                months[monthKey] = {
                    monthStart: (0, date_fns_1.startOfMonth)(point.date),
                    availableHours: 0,
                    allocatedHours: 0,
                    days: 0
                };
            }
            months[monthKey].availableHours += point.availableHours;
            months[monthKey].allocatedHours += point.allocatedHours;
            months[monthKey].days++;
        });
        return Object.values(months).map((month) => ({
            ...month,
            utilization: month.availableHours > 0
                ? (month.allocatedHours / month.availableHours) * 100
                : 0
        }));
    }
    calculateAverageUtilization(data) {
        let totalUtilization = 0;
        let count = 0;
        data.forEach(employee => {
            employee.dataPoints.forEach((point) => {
                if (point.availableHours > 0) {
                    totalUtilization += point.utilization;
                    count++;
                }
            });
        });
        return count > 0 ? totalUtilization / count : 0;
    }
    calculatePeakUtilization(data) {
        let peak = 0;
        data.forEach(employee => {
            employee.dataPoints.forEach((point) => {
                if (point.utilization > peak) {
                    peak = point.utilization;
                }
            });
        });
        return peak;
    }
    countUnderutilizedDays(data) {
        let count = 0;
        data.forEach(employee => {
            employee.dataPoints.forEach((point) => {
                if (point.availableHours > 0 && point.utilization < 50) {
                    count++;
                }
            });
        });
        return count;
    }
    countOverutilizedDays(data) {
        let count = 0;
        data.forEach(employee => {
            employee.dataPoints.forEach((point) => {
                if (point.utilization > 100) {
                    count++;
                }
            });
        });
        return count;
    }
}
exports.AvailabilityController = AvailabilityController;
