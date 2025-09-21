"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationModel = exports.AllocationStatus = void 0;
const types_1 = require("../types");
var AllocationStatus;
(function (AllocationStatus) {
    AllocationStatus["TENTATIVE"] = "tentative";
    AllocationStatus["CONFIRMED"] = "confirmed";
    AllocationStatus["COMPLETED"] = "completed";
    AllocationStatus["CANCELLED"] = "cancelled";
})(AllocationStatus || (exports.AllocationStatus = AllocationStatus = {}));
class AllocationModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const overlaps = await this.checkOverlaps(input.employeeId, input.startDate, input.endDate);
            if (overlaps.length > 0) {
                throw new types_1.DatabaseError(`Allocation conflicts detected with ${overlaps.length} existing allocation(s). Use force parameter to override.`);
            }
            const query = `
        INSERT INTO allocations (
          employee_id, project_id, start_date, end_date, 
          allocated_hours, role, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'tentative')
        RETURNING *
      `;
            const values = [
                input.employeeId,
                input.projectId,
                input.startDate,
                input.endDate,
                input.allocatedHours,
                input.roleOnProject,
                input.notes || null
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23503') {
                throw new types_1.DatabaseError('Invalid employee ID or project ID');
            }
            if (error.code === '23514') {
                throw new types_1.DatabaseError('Invalid allocation data - check dates and hours');
            }
            throw error;
        }
    }
    static async createForced(input) {
        try {
            const query = `
        INSERT INTO allocations (
          employee_id, project_id, start_date, end_date, 
          allocated_hours, role, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'tentative')
        RETURNING *
      `;
            const values = [
                input.employeeId,
                input.projectId,
                input.startDate,
                input.endDate,
                input.allocatedHours,
                input.roleOnProject,
                input.notes || null
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23503') {
                throw new types_1.DatabaseError('Invalid employee ID or project ID');
            }
            if (error.code === '23514') {
                throw new types_1.DatabaseError('Invalid allocation data - check dates and hours');
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT * FROM allocations 
      WHERE id = $1
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByIdWithDetails(id) {
        const query = `
      SELECT 
        a.*,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name,
          'email', e.email,
          'position', e.position,
          'departmentId', e.department_id
        ) AS employee,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'status', p.status,
          'priority', p.priority,
          'startDate', p.start_date,
          'endDate', p.end_date
        ) AS project
      FROM allocations a
      JOIN employees e ON a.employee_id = e.id
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = $1
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const allocation = this.mapRow(row);
        return {
            ...allocation,
            employee: row.employee,
            project: row.project
        };
    }
    static async findByEmployeeId(employeeId, filters = {}, page = 1, limit = 50) {
        let whereConditions = ['a.employee_id = $1'];
        const values = [employeeId];
        if (filters.startDateFrom) {
            values.push(filters.startDateFrom);
            whereConditions.push(`a.start_date >= $${values.length}`);
        }
        if (filters.startDateTo) {
            values.push(filters.startDateTo);
            whereConditions.push(`a.start_date <= $${values.length}`);
        }
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            whereConditions.push(`(a.status = CASE WHEN $${values.length} THEN 'confirmed' ELSE 'cancelled' END)`);
        }
        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM allocations a
      WHERE ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        values.push(limit, offset);
        const dataQuery = `
      SELECT a.*
      FROM allocations a
      WHERE ${whereClause}
      ORDER BY a.start_date DESC, a.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const dataResult = await this.pool.query(dataQuery, values);
        const allocations = dataResult.rows.map(row => this.mapRow(row));
        const totalPages = Math.ceil(total / limit);
        return {
            data: allocations,
            total,
            page,
            limit,
            totalPages
        };
    }
    static async findByProjectId(projectId, filters = {}, page = 1, limit = 50) {
        let whereConditions = ['a.project_id = $1'];
        const values = [projectId];
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            whereConditions.push(`(a.status = CASE WHEN $${values.length} THEN 'confirmed' ELSE 'cancelled' END)`);
        }
        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM allocations a
      WHERE ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        values.push(limit, offset);
        const dataQuery = `
      SELECT a.*
      FROM allocations a
      WHERE ${whereClause}
      ORDER BY a.start_date ASC, a.role
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const dataResult = await this.pool.query(dataQuery, values);
        const allocations = dataResult.rows.map(row => this.mapRow(row));
        const totalPages = Math.ceil(total / limit);
        return {
            data: allocations,
            total,
            page,
            limit,
            totalPages
        };
    }
    static async findAll(filters = {}, page = 1, limit = 50) {
        let whereConditions = [];
        const values = [];
        if (filters.employeeId) {
            values.push(filters.employeeId);
            whereConditions.push(`a.employee_id = $${values.length}`);
        }
        if (filters.projectId) {
            values.push(filters.projectId);
            whereConditions.push(`a.project_id = $${values.length}`);
        }
        if (filters.startDateFrom) {
            values.push(filters.startDateFrom);
            whereConditions.push(`a.start_date >= $${values.length}`);
        }
        if (filters.startDateTo) {
            values.push(filters.startDateTo);
            whereConditions.push(`a.start_date <= $${values.length}`);
        }
        if (filters.endDateFrom) {
            values.push(filters.endDateFrom);
            whereConditions.push(`a.end_date >= $${values.length}`);
        }
        if (filters.endDateTo) {
            values.push(filters.endDateTo);
            whereConditions.push(`a.end_date <= $${values.length}`);
        }
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            whereConditions.push(`(a.status = CASE WHEN $${values.length} THEN 'confirmed' ELSE 'cancelled' END)`);
        }
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        const offset = (page - 1) * limit;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM allocations a
      ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        values.push(limit, offset);
        const dataQuery = `
      SELECT a.*
      FROM allocations a
      ${whereClause}
      ORDER BY a.start_date DESC, a.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const dataResult = await this.pool.query(dataQuery, values);
        const allocations = dataResult.rows.map(row => this.mapRow(row));
        const totalPages = Math.ceil(total / limit);
        return {
            data: allocations,
            total,
            page,
            limit,
            totalPages
        };
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.allocatedHours !== undefined) {
            values.push(updates.allocatedHours);
            updateFields.push(`allocated_hours = $${values.length}`);
        }
        if (updates.actualHours !== undefined) {
            values.push(updates.actualHours);
            updateFields.push(`actual_hours = $${values.length}`);
        }
        if (updates.roleOnProject !== undefined) {
            values.push(updates.roleOnProject);
            updateFields.push(`role = $${values.length}`);
        }
        if (updates.startDate !== undefined) {
            values.push(updates.startDate);
            updateFields.push(`start_date = $${values.length}`);
        }
        if (updates.endDate !== undefined) {
            values.push(updates.endDate);
            updateFields.push(`end_date = $${values.length}`);
        }
        if (updates.notes !== undefined) {
            values.push(updates.notes);
            updateFields.push(`notes = $${values.length}`);
        }
        if (updates.isActive !== undefined) {
            values.push(updates.isActive ? 'confirmed' : 'cancelled');
            updateFields.push(`status = $${values.length}`);
        }
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        const query = `
      UPDATE allocations 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;
        try {
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Allocation not found');
            }
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23514') {
                throw new types_1.DatabaseError('Invalid allocation data - check dates and hours');
            }
            throw error;
        }
    }
    static async delete(id) {
        const query = `
      UPDATE allocations 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Allocation not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static async checkOverlaps(employeeId, startDate, endDate, excludeAllocationId) {
        const query = `
      SELECT * FROM check_allocation_overlap($1, $2, $3, $4)
    `;
        const values = [employeeId, startDate, endDate, excludeAllocationId || null];
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            allocationId: row.overlapping_allocation_id,
            projectName: row.overlapping_project_name,
            startDate: row.overlapping_start_date,
            endDate: row.overlapping_end_date,
            allocatedHours: parseFloat(row.overlapping_allocated_hours)
        }));
    }
    static async getUtilizationMetrics(employeeId, startDate, endDate) {
        let whereConditions = ['a.status IN (\'tentative\', \'confirmed\')'];
        const values = [];
        if (employeeId) {
            values.push(employeeId);
            whereConditions.push(`a.employee_id = $${values.length}`);
        }
        if (startDate && endDate) {
            values.push(startDate, endDate);
            whereConditions.push(`(a.start_date <= $${values.length} AND a.end_date >= $${values.length - 1})`);
        }
        const whereClause = whereConditions.join(' AND ');
        const query = `
      SELECT 
        e.id as employee_id,
        COALESCE(SUM(a.allocated_hours), 0) as total_allocated_hours,
        COALESCE(AVG(a.allocated_hours), 0) as avg_allocated_hours,
        COUNT(DISTINCT a.id) as active_allocations,
        -- Calculate utilization rate (assuming 40 hours/week standard)
        (COALESCE(SUM(a.allocated_hours), 0) / 40.0 * 100) as utilization_rate,
        -- Count conflicts using window function
        COUNT(CASE 
          WHEN EXISTS (
            SELECT 1 FROM allocations a2 
            WHERE a2.employee_id = a.employee_id 
            AND a2.id != a.id
            AND a2.status IN ('tentative', 'confirmed')
            AND ((a2.start_date <= a.start_date AND a2.end_date >= a.start_date) 
                 OR (a2.start_date <= a.end_date AND a2.end_date >= a.end_date)
                 OR (a2.start_date >= a.start_date AND a2.end_date <= a.end_date))
          ) THEN 1 
        END) as conflict_count
      FROM employees e
      LEFT JOIN allocations a ON e.id = a.employee_id AND ${whereClause}
      WHERE e.is_active = true
      GROUP BY e.id
      ORDER BY utilization_rate DESC
    `;
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            utilizationRate: parseFloat(row.utilization_rate) || 0,
            conflictCount: parseInt(row.conflict_count) || 0,
            activeAllocations: parseInt(row.active_allocations) || 0
        }));
    }
    static async updateStatus(id, status) {
        const query = `
      UPDATE allocations 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
        const result = await this.pool.query(query, [status, id]);
        if (result.rows.length === 0) {
            throw new Error('Allocation not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static mapRow(row) {
        const allocation = {
            id: row.id,
            projectId: row.project_id,
            employeeId: row.employee_id,
            allocatedHours: parseFloat(row.allocated_hours) || 0,
            roleOnProject: row.role,
            startDate: row.start_date,
            endDate: row.end_date,
            isActive: row.status === 'confirmed',
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
        if (row.actual_hours !== null && row.actual_hours !== undefined) {
            allocation.actualHours = parseFloat(row.actual_hours);
        }
        if (row.hourly_rate !== null && row.hourly_rate !== undefined) {
            allocation.hourlyRate = parseFloat(row.hourly_rate);
        }
        if (row.notes !== null && row.notes !== undefined) {
            allocation.notes = row.notes;
        }
        return allocation;
    }
}
exports.AllocationModel = AllocationModel;
//# sourceMappingURL=allocation.model.js.map