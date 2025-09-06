"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapacityHistoryModel = void 0;
const types_1 = require("../types");
class CapacityHistoryModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO capacity_history (employee_id, date, available_hours, allocated_hours, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *, utilization_rate
      `;
            const values = [
                input.employeeId,
                input.date,
                input.availableHours,
                input.allocatedHours,
                input.notes || null
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') {
                throw new types_1.DatabaseError('Capacity entry for this employee and date already exists');
            }
            if (error.code === '23503') {
                throw new types_1.DatabaseError('Invalid employee ID');
            }
            if (error.code === '23514') {
                throw new types_1.DatabaseError('Allocated hours cannot exceed available hours');
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT *, utilization_rate FROM capacity_history 
      WHERE id = $1
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByEmployee(employeeId, dateFrom, dateTo) {
        let query = `
      SELECT *, utilization_rate FROM capacity_history 
      WHERE employee_id = $1
    `;
        const values = [employeeId];
        if (dateFrom) {
            values.push(dateFrom);
            query += ` AND date >= $${values.length}`;
        }
        if (dateTo) {
            values.push(dateTo);
            query += ` AND date <= $${values.length}`;
        }
        query += ' ORDER BY date DESC';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRow(row));
    }
    static async findByEmployeeAndDate(employeeId, date) {
        const query = `
      SELECT *, utilization_rate FROM capacity_history 
      WHERE employee_id = $1 AND date = $2
    `;
        const result = await this.pool.query(query, [employeeId, date]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findAll(filters = {}) {
        let query = 'SELECT *, utilization_rate FROM capacity_history WHERE 1=1';
        const values = [];
        if (filters.employeeId) {
            values.push(filters.employeeId);
            query += ` AND employee_id = $${values.length}`;
        }
        if (filters.dateFrom) {
            values.push(filters.dateFrom);
            query += ` AND date >= $${values.length}`;
        }
        if (filters.dateTo) {
            values.push(filters.dateTo);
            query += ` AND date <= $${values.length}`;
        }
        if (filters.minUtilizationRate !== undefined) {
            values.push(filters.minUtilizationRate);
            query += ` AND utilization_rate >= $${values.length}`;
        }
        if (filters.maxUtilizationRate !== undefined) {
            values.push(filters.maxUtilizationRate);
            query += ` AND utilization_rate <= $${values.length}`;
        }
        query += ' ORDER BY date DESC, employee_id';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRow(row));
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.availableHours !== undefined) {
            values.push(updates.availableHours);
            updateFields.push(`available_hours = $${values.length}`);
        }
        if (updates.allocatedHours !== undefined) {
            values.push(updates.allocatedHours);
            updateFields.push(`allocated_hours = $${values.length}`);
        }
        if (updates.notes !== undefined) {
            values.push(updates.notes);
            updateFields.push(`notes = $${values.length}`);
        }
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        const query = `
      UPDATE capacity_history 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *, utilization_rate
    `;
        try {
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Capacity history entry not found');
            }
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23514') {
                throw new types_1.DatabaseError('Allocated hours cannot exceed available hours');
            }
            throw error;
        }
    }
    static async delete(id) {
        const query = `
      DELETE FROM capacity_history 
      WHERE id = $1
      RETURNING *, utilization_rate
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Capacity history entry not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static async bulkCreate(entries) {
        if (entries.length === 0) {
            return [];
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const results = [];
            for (const entry of entries) {
                const query = `
          INSERT INTO capacity_history (employee_id, date, available_hours, allocated_hours, notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *, utilization_rate
        `;
                const values = [
                    entry.employeeId,
                    entry.date,
                    entry.availableHours,
                    entry.allocatedHours,
                    entry.notes || null
                ];
                const result = await client.query(query, values);
                results.push(this.mapRow(result.rows[0]));
            }
            await client.query('COMMIT');
            return results;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async getUtilizationSummary(employeeId, dateFrom, dateTo) {
        let query = `
      SELECT 
        AVG(utilization_rate) as average_utilization,
        SUM(available_hours) as total_available_hours,
        SUM(allocated_hours) as total_allocated_hours,
        MAX(utilization_rate) as peak_utilization,
        MIN(utilization_rate) as low_utilization,
        COUNT(*) as entries_count
      FROM capacity_history 
      WHERE 1=1
    `;
        const values = [];
        if (employeeId) {
            values.push(employeeId);
            query += ` AND employee_id = $${values.length}`;
        }
        if (dateFrom) {
            values.push(dateFrom);
            query += ` AND date >= $${values.length}`;
        }
        if (dateTo) {
            values.push(dateTo);
            query += ` AND date <= $${values.length}`;
        }
        const result = await this.pool.query(query, values);
        const row = result.rows[0];
        return {
            averageUtilization: parseFloat(row.average_utilization) || 0,
            totalAvailableHours: parseFloat(row.total_available_hours) || 0,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            peakUtilization: parseFloat(row.peak_utilization) || 0,
            lowUtilization: parseFloat(row.low_utilization) || 0,
            entriesCount: parseInt(row.entries_count) || 0
        };
    }
    static async getTeamCapacityTrends(departmentId, dateFrom, dateTo) {
        let query = `
      SELECT 
        ch.date,
        AVG(ch.utilization_rate) as average_utilization,
        SUM(ch.available_hours) as total_available_hours,
        SUM(ch.allocated_hours) as total_allocated_hours,
        COUNT(DISTINCT ch.employee_id) as employee_count
      FROM capacity_history ch
      JOIN employees e ON ch.employee_id = e.id
      WHERE e.is_active = true
    `;
        const values = [];
        if (departmentId) {
            values.push(departmentId);
            query += ` AND e.department_id = $${values.length}`;
        }
        if (dateFrom) {
            values.push(dateFrom);
            query += ` AND ch.date >= $${values.length}`;
        }
        if (dateTo) {
            values.push(dateTo);
            query += ` AND ch.date <= $${values.length}`;
        }
        query += `
      GROUP BY ch.date
      ORDER BY ch.date DESC
    `;
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            date: row.date,
            averageUtilization: parseFloat(row.average_utilization) || 0,
            totalAvailableHours: parseFloat(row.total_available_hours) || 0,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            employeeCount: parseInt(row.employee_count) || 0
        }));
    }
    static async getOverutilizedEmployees(threshold = 0.9, dateFrom, dateTo) {
        let query = `
      SELECT 
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        AVG(ch.utilization_rate) as average_utilization,
        MAX(ch.utilization_rate) as peak_utilization,
        COUNT(*) FILTER (WHERE ch.utilization_rate > $1) as days_over_threshold
      FROM capacity_history ch
      JOIN employees e ON ch.employee_id = e.id
      WHERE e.is_active = true
    `;
        const values = [threshold];
        if (dateFrom) {
            values.push(dateFrom);
            query += ` AND ch.date >= $${values.length}`;
        }
        if (dateTo) {
            values.push(dateTo);
            query += ` AND ch.date <= $${values.length}`;
        }
        query += `
      GROUP BY e.id, e.first_name, e.last_name
      HAVING AVG(ch.utilization_rate) > $1 OR COUNT(*) FILTER (WHERE ch.utilization_rate > $1) > 0
      ORDER BY average_utilization DESC
    `;
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            averageUtilization: parseFloat(row.average_utilization) || 0,
            peakUtilization: parseFloat(row.peak_utilization) || 0,
            daysOverThreshold: parseInt(row.days_over_threshold) || 0
        }));
    }
    static async getDepartmentCapacityByName(departmentName, dateFrom, dateTo) {
        let query = `
      SELECT 
        ch.date,
        d.name as department_name,
        AVG(ch.utilization_rate) as average_utilization,
        SUM(ch.available_hours) as total_available_hours,
        SUM(ch.allocated_hours) as total_allocated_hours,
        COUNT(DISTINCT ch.employee_id) as employee_count
      FROM capacity_history ch
      JOIN employees e ON ch.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true AND LOWER(d.name) = LOWER($1)
    `;
        const values = [departmentName];
        if (dateFrom) {
            values.push(dateFrom);
            query += ` AND ch.date >= $${values.length}`;
        }
        if (dateTo) {
            values.push(dateTo);
            query += ` AND ch.date <= $${values.length}`;
        }
        query += `
      GROUP BY ch.date, d.name
      ORDER BY ch.date DESC
    `;
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            date: row.date,
            departmentName: row.department_name,
            averageUtilization: parseFloat(row.average_utilization) || 0,
            totalAvailableHours: parseFloat(row.total_available_hours) || 0,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            employeeCount: parseInt(row.employee_count) || 0
        }));
    }
    static async getCapacityWithEmployeeDetails(filters = {}, departmentId) {
        let query = `
      SELECT 
        ch.*,
        ch.utilization_rate,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        d.name as department_name
      FROM capacity_history ch
      JOIN employees e ON ch.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true
    `;
        const values = [];
        if (filters.employeeId) {
            values.push(filters.employeeId);
            query += ` AND ch.employee_id = $${values.length}`;
        }
        if (departmentId) {
            values.push(departmentId);
            query += ` AND e.department_id = $${values.length}`;
        }
        if (filters.dateFrom) {
            values.push(filters.dateFrom);
            query += ` AND ch.date >= $${values.length}`;
        }
        if (filters.dateTo) {
            values.push(filters.dateTo);
            query += ` AND ch.date <= $${values.length}`;
        }
        if (filters.minUtilizationRate !== undefined) {
            values.push(filters.minUtilizationRate);
            query += ` AND ch.utilization_rate >= $${values.length}`;
        }
        if (filters.maxUtilizationRate !== undefined) {
            values.push(filters.maxUtilizationRate);
            query += ` AND ch.utilization_rate <= $${values.length}`;
        }
        query += ' ORDER BY ch.date DESC, e.first_name, e.last_name';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            departmentName: row.department_name || 'N/A',
            date: row.date,
            availableHours: parseFloat(row.available_hours),
            allocatedHours: parseFloat(row.allocated_hours),
            utilizationRate: parseFloat(row.utilization_rate),
            notes: row.notes || '',
            createdAt: row.created_at
        }));
    }
    static mapRow(row) {
        return {
            id: row.id,
            employeeId: row.employee_id,
            date: row.date,
            availableHours: parseFloat(row.available_hours),
            allocatedHours: parseFloat(row.allocated_hours),
            utilizationRate: parseFloat(row.utilization_rate),
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.CapacityHistoryModel = CapacityHistoryModel;
//# sourceMappingURL=CapacityHistory.enhanced.js.map