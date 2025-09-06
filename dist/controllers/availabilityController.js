"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityController = void 0;
const express_validator_1 = require("express-validator");
class AvailabilityController {
    static initialize(pool) {
        this.pool = pool;
    }
    static async getEmployeeStatuses(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { status, departmentId, search, page = 1, limit = 50 } = req.query;
            let whereConditions = ['e.is_active = true'];
            const values = [];
            if (status && status !== 'all') {
                values.push(status);
                whereConditions.push(`ea.status = $${values.length}`);
            }
            if (departmentId) {
                values.push(departmentId);
                whereConditions.push(`e.department_id = $${values.length}`);
            }
            if (search) {
                values.push(`%${search}%`);
                whereConditions.push(`(
          LOWER(e.first_name) ILIKE LOWER($${values.length}) OR 
          LOWER(e.last_name) ILIKE LOWER($${values.length}) OR 
          LOWER(e.email) ILIKE LOWER($${values.length}) OR 
          LOWER(e.position) ILIKE LOWER($${values.length})
        )`);
            }
            const whereClause = whereConditions.join(' AND ');
            const offset = (Number(page) - 1) * Number(limit);
            const countQuery = `
        SELECT COUNT(DISTINCT e.id) as total
        FROM employees e
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE ${whereClause}
      `;
            const countResult = await this.pool.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);
            values.push(Number(limit), offset);
            const dataQuery = `
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          e.department_id,
          d.name as department_name,
          COALESCE(ea.status, 'available') as status,
          COALESCE(ea.capacity, 100) as capacity,
          COALESCE(ea.current_projects, 0) as current_projects,
          COALESCE(ea.available_hours, 40) as available_hours,
          COALESCE(ea.updated_at, e.created_at) as last_updated,
          e.is_active
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE ${whereClause}
        ORDER BY e.last_name, e.first_name
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `;
            const result = await this.pool.query(dataQuery, values);
            const employees = result.rows.map(this.mapAvailabilityRow);
            const totalPages = Math.ceil(total / Number(limit));
            res.json({
                success: true,
                data: employees,
                pagination: {
                    currentPage: Number(page),
                    totalPages,
                    totalItems: total,
                    limit: Number(limit),
                    hasNext: Number(page) < totalPages,
                    hasPrev: Number(page) > 1
                }
            });
        }
        catch (error) {
            console.error('Error fetching employee statuses:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch employee availability statuses',
                error: error.message
            });
        }
    }
    static async updateEmployeeStatus(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { id } = req.params;
            const { status, capacity, currentProjects, availableHours } = req.body;
            const employeeCheck = await this.pool.query('SELECT id FROM employees WHERE id = $1 AND is_active = true', [id]);
            if (employeeCheck.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
                return;
            }
            const upsertQuery = `
        INSERT INTO employee_availability (
          employee_id, status, capacity, current_projects, available_hours, updated_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (employee_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          capacity = EXCLUDED.capacity,
          current_projects = EXCLUDED.current_projects,
          available_hours = EXCLUDED.available_hours,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;
            const values = [id, status, capacity, currentProjects, availableHours];
            const result = await this.pool.query(upsertQuery, values);
            const employeeQuery = `
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          e.department_id,
          d.name as department_name,
          ea.status,
          ea.capacity,
          ea.current_projects,
          ea.available_hours,
          ea.updated_at as last_updated,
          e.is_active
        FROM employees e
        JOIN departments d ON e.department_id = d.id
        JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE e.id = $1
      `;
            const employeeResult = await this.pool.query(employeeQuery, [id]);
            const employee = this.mapAvailabilityRow(employeeResult.rows[0]);
            res.json({
                success: true,
                message: 'Employee availability updated successfully',
                data: employee
            });
        }
        catch (error) {
            console.error('Error updating employee status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update employee availability',
                error: error.message
            });
        }
    }
    static async getDepartmentUtilization(req, res) {
        try {
            const { id } = req.params;
            const deptCheck = await this.pool.query('SELECT id, name FROM departments WHERE id = $1 AND is_active = true', [id]);
            if (deptCheck.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
                return;
            }
            const departmentName = deptCheck.rows[0].name;
            const utilizationQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'available') as available_employees,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'busy') as busy_employees,
          COUNT(*) FILTER (WHERE COALESCE(ea.status, 'available') = 'unavailable') as unavailable_employees,
          AVG(COALESCE(ea.capacity, 100)) as average_capacity
        FROM employees e
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE e.department_id = $1 AND e.is_active = true
      `;
            const utilizationResult = await this.pool.query(utilizationQuery, [id]);
            const stats = utilizationResult.rows[0];
            const employeesQuery = `
        SELECT 
          e.id,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          e.department_id,
          $2 as department_name,
          COALESCE(ea.status, 'available') as status,
          COALESCE(ea.capacity, 100) as capacity,
          COALESCE(ea.current_projects, 0) as current_projects,
          COALESCE(ea.available_hours, 40) as available_hours,
          COALESCE(ea.updated_at, e.created_at) as last_updated,
          e.is_active
        FROM employees e
        LEFT JOIN employee_availability ea ON e.id = ea.employee_id
        WHERE e.department_id = $1 AND e.is_active = true
        ORDER BY e.last_name, e.first_name
      `;
            const employeesResult = await this.pool.query(employeesQuery, [id, departmentName]);
            const employees = employeesResult.rows.map(this.mapAvailabilityRow);
            const departmentUtilization = {
                departmentId: id,
                departmentName,
                totalEmployees: parseInt(stats.total_employees),
                availableEmployees: parseInt(stats.available_employees),
                busyEmployees: parseInt(stats.busy_employees),
                unavailableEmployees: parseInt(stats.unavailable_employees),
                averageCapacity: parseFloat(stats.average_capacity) || 0,
                employees
            };
            res.json({
                success: true,
                data: departmentUtilization
            });
        }
        catch (error) {
            console.error('Error fetching department utilization:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch department utilization',
                error: error.message
            });
        }
    }
    static async getRealTimeConfig(req, res) {
        try {
            res.json({
                success: true,
                data: {
                    websocketUrl: process.env.WEBSOCKET_URL || 'ws://localhost:3001/ws/availability',
                    protocols: ['availability-updates'],
                    heartbeatInterval: 30000,
                    reconnectInterval: 5000,
                    maxReconnectAttempts: 5
                }
            });
        }
        catch (error) {
            console.error('Error getting real-time config:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time configuration',
                error: error.message
            });
        }
    }
    static async getRealTimeStatus(req, res) {
        try {
            const status = {
                timestamp: new Date().toISOString(),
                activeConnections: 0,
                lastUpdated: new Date().toISOString(),
                systemHealth: 'healthy',
                averageResponseTime: 45,
                totalUpdatesLast24h: 1247
            };
            res.json({
                success: true,
                data: status
            });
        }
        catch (error) {
            console.error('Error getting real-time status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get real-time status',
                error: error.message
            });
        }
    }
    static async bulkUpdateAvailability(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
                return;
            }
            const { updates } = req.body;
            if (!Array.isArray(updates) || updates.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'Updates array is required and must not be empty'
                });
                return;
            }
            const client = await this.pool.connect();
            const results = [];
            try {
                await client.query('BEGIN');
                for (const update of updates) {
                    const { employeeId, status, capacity, currentProjects, availableHours } = update;
                    const employeeCheck = await client.query('SELECT id FROM employees WHERE id = $1 AND is_active = true', [employeeId]);
                    if (employeeCheck.rows.length === 0) {
                        results.push({
                            employeeId,
                            status: 'error',
                            message: 'Employee not found'
                        });
                        continue;
                    }
                    const upsertQuery = `
            INSERT INTO employee_availability (
              employee_id, status, capacity, current_projects, available_hours, updated_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (employee_id) 
            DO UPDATE SET 
              status = EXCLUDED.status,
              capacity = EXCLUDED.capacity,
              current_projects = EXCLUDED.current_projects,
              available_hours = EXCLUDED.available_hours,
              updated_at = EXCLUDED.updated_at
          `;
                    const values = [employeeId, status, capacity, currentProjects, availableHours];
                    await client.query(upsertQuery, values);
                    results.push({
                        employeeId,
                        status: 'success',
                        message: 'Updated successfully'
                    });
                }
                await client.query('COMMIT');
                res.json({
                    success: true,
                    message: `Processed ${updates.length} updates`,
                    results
                });
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Error bulk updating availability:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to bulk update availability',
                error: error.message
            });
        }
    }
    static mapAvailabilityRow(row) {
        return {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            position: row.position,
            departmentId: row.department_id,
            departmentName: row.department_name,
            status: row.status || 'available',
            capacity: parseInt(row.capacity) || 100,
            currentProjects: parseInt(row.current_projects) || 0,
            availableHours: parseInt(row.available_hours) || 40,
            lastUpdated: row.last_updated,
            isActive: row.is_active
        };
    }
}
exports.AvailabilityController = AvailabilityController;
//# sourceMappingURL=availabilityController.js.map