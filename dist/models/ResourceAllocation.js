"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceAllocationModel = void 0;
const types_1 = require("../types");
class ResourceAllocationModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO resource_allocations (project_id, employee_id, allocated_hours, hourly_rate, role_on_project, start_date, end_date, notes, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const values = [
                input.projectId,
                input.employeeId,
                input.allocatedHours,
                input.hourlyRate || null,
                input.roleOnProject,
                input.startDate,
                input.endDate,
                input.notes || null,
                true
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError('Employee is already allocated to this project for overlapping dates');
            }
            if (error.code === '23503') { // Foreign key constraint violation
                throw new types_1.DatabaseError('Invalid project ID or employee ID');
            }
            if (error.code === '23P01') { // Serialization failure (custom check for overlapping)
                throw new types_1.DatabaseError('Employee has overlapping resource allocation for the specified period');
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT * FROM resource_allocations 
      WHERE id = $1 AND is_active = true
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByIdWithDetails(id) {
        const query = `
      SELECT 
        ra.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'status', p.status,
          'priority', p.priority,
          'startDate', p.start_date,
          'endDate', p.end_date,
          'managerId', p.manager_id
        ) AS project,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name,
          'email', e.email,
          'position', e.position,
          'departmentId', e.department_id
        ) AS employee
      FROM resource_allocations ra
      JOIN projects p ON ra.project_id = p.id AND p.is_active = true
      JOIN employees e ON ra.employee_id = e.id AND e.is_active = true
      WHERE ra.id = $1 AND ra.is_active = true
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const allocation = this.mapRow(row);
        return {
            ...allocation,
            project: row.project,
            employee: row.employee
        };
    }
    static async findByProject(projectId) {
        const query = `
      SELECT 
        ra.*,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name,
          'email', e.email,
          'position', e.position,
          'departmentId', e.department_id,
          'hireDate', e.hire_date,
          'isActive', e.is_active
        ) AS employee
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.project_id = $1 AND ra.is_active = true AND e.is_active = true
      ORDER BY ra.start_date ASC, e.last_name, e.first_name
    `;
        const result = await this.pool.query(query, [projectId]);
        return result.rows.map(row => ({
            ...this.mapRow(row),
            employee: {
                id: row.employee.id,
                firstName: row.employee.firstName,
                lastName: row.employee.lastName,
                email: row.employee.email,
                departmentId: row.employee.departmentId,
                position: row.employee.position,
                hireDate: row.employee.hireDate,
                isActive: row.employee.isActive,
                defaultHours: row.employee.defaultHours || 40,
                createdAt: row.employee.createdAt || new Date(),
                updatedAt: row.employee.updatedAt || new Date()
            }
        }));
    }
    static async findByEmployee(employeeId) {
        const query = `
      SELECT 
        ra.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'status', p.status,
          'priority', p.priority,
          'startDate', p.start_date,
          'endDate', p.end_date,
          'estimatedHours', p.estimated_hours,
          'actualHours', p.actual_hours,
          'budget', p.budget,
          'managerId', p.manager_id,
          'isActive', p.is_active
        ) AS project
      FROM resource_allocations ra
      JOIN projects p ON ra.project_id = p.id
      WHERE ra.employee_id = $1 AND ra.is_active = true AND p.is_active = true
      ORDER BY ra.start_date DESC
    `;
        const result = await this.pool.query(query, [employeeId]);
        return result.rows.map(row => ({
            ...this.mapRow(row),
            project: {
                id: row.project.id,
                name: row.project.name,
                description: row.project.description,
                status: row.project.status,
                priority: row.project.priority,
                clientId: row.project.clientId,
                startDate: row.project.startDate,
                endDate: row.project.endDate,
                estimatedHours: row.project.estimatedHours,
                actualHours: row.project.actualHours,
                budget: row.project.budget,
                costToDate: row.project.costToDate,
                managerId: row.project.managerId,
                isActive: row.project.isActive,
                createdAt: row.project.createdAt || new Date(),
                updatedAt: row.project.updatedAt || new Date()
            }
        }));
    }
    static async findOverlapping(employeeId, startDate, endDate, excludeAllocationId) {
        let query = `
      SELECT * FROM resource_allocations
      WHERE employee_id = $1 
      AND is_active = true
      AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
    `;
        const values = [employeeId, startDate, endDate];
        if (excludeAllocationId) {
            values.push(excludeAllocationId);
            query += ` AND id != $${values.length}`;
        }
        query += ' ORDER BY start_date';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRow(row));
    }
    static async findAll(filters = {}, page = 1, limit = 50) {
        let whereConditions = ['ra.is_active = true'];
        const values = [];
        if (filters.projectId) {
            values.push(filters.projectId);
            whereConditions.push(`ra.project_id = $${values.length}`);
        }
        if (filters.employeeId) {
            values.push(filters.employeeId);
            whereConditions.push(`ra.employee_id = $${values.length}`);
        }
        if (filters.startDateFrom) {
            values.push(filters.startDateFrom);
            whereConditions.push(`ra.start_date >= $${values.length}`);
        }
        if (filters.startDateTo) {
            values.push(filters.startDateTo);
            whereConditions.push(`ra.start_date <= $${values.length}`);
        }
        if (filters.endDateFrom) {
            values.push(filters.endDateFrom);
            whereConditions.push(`ra.end_date >= $${values.length}`);
        }
        if (filters.endDateTo) {
            values.push(filters.endDateTo);
            whereConditions.push(`ra.end_date <= $${values.length}`);
        }
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            whereConditions.push(`ra.is_active = $${values.length}`);
        }
        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;
        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM resource_allocations ra
      WHERE ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        values.push(limit, offset);
        const dataQuery = `
      SELECT ra.*
      FROM resource_allocations ra
      WHERE ${whereClause}
      ORDER BY ra.start_date DESC, ra.created_at DESC
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
        if (updates.hourlyRate !== undefined) {
            values.push(updates.hourlyRate);
            updateFields.push(`hourly_rate = $${values.length}`);
        }
        if (updates.roleOnProject !== undefined) {
            values.push(updates.roleOnProject);
            updateFields.push(`role_on_project = $${values.length}`);
        }
        if (updates.startDate !== undefined) {
            values.push(updates.startDate);
            updateFields.push(`start_date = $${values.length}`);
        }
        if (updates.endDate !== undefined) {
            values.push(updates.endDate);
            updateFields.push(`end_date = $${values.length}`);
        }
        if (updates.actualHours !== undefined) {
            values.push(updates.actualHours);
            updateFields.push(`actual_hours = $${values.length}`);
        }
        if (updates.notes !== undefined) {
            values.push(updates.notes);
            updateFields.push(`notes = $${values.length}`);
        }
        if (updates.isActive !== undefined) {
            values.push(updates.isActive);
            updateFields.push(`is_active = $${values.length}`);
        }
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        const query = `
      UPDATE resource_allocations 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Resource allocation not found or already deleted');
        }
        return this.mapRow(result.rows[0]);
    }
    static async delete(id) {
        const query = `
      UPDATE resource_allocations 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Resource allocation not found or already deleted');
        }
        return this.mapRow(result.rows[0]);
    }
    static async getUtilizationByEmployee(dateFrom, dateTo, departmentId) {
        let query = `
      SELECT 
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        SUM(ra.allocated_hours) as total_allocated_hours,
        SUM(COALESCE(ra.actual_hours, 0)) as total_actual_hours,
        COUNT(DISTINCT ra.project_id) as active_projects,
        CASE 
          WHEN SUM(ra.allocated_hours) > 0 
          THEN SUM(COALESCE(ra.actual_hours, 0))::numeric / SUM(ra.allocated_hours)::numeric
          ELSE 0 
        END as utilization_rate
      FROM employees e
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id 
        AND ra.is_active = true
        AND ra.start_date <= $2 
        AND ra.end_date >= $1
      WHERE e.is_active = true
    `;
        const values = [dateFrom, dateTo];
        if (departmentId) {
            values.push(departmentId);
            query += ` AND e.department_id = $${values.length}`;
        }
        query += `
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY utilization_rate DESC, employee_name
    `;
        const result = await this.pool.query(query, values);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            totalActualHours: parseFloat(row.total_actual_hours) || 0,
            activeProjects: parseInt(row.active_projects) || 0,
            utilizationRate: parseFloat(row.utilization_rate) || 0
        }));
    }
    static async getCapacityConflicts(dateFrom, dateTo) {
        const query = `
      WITH daily_allocations AS (
        SELECT 
          e.id as employee_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          generate_series(ra.start_date, ra.end_date, '1 day'::interval)::date as allocation_date,
          ra.allocated_hours / (ra.end_date - ra.start_date + 1) as daily_hours,
          COALESCE(ch.available_hours, 40) as max_capacity_hours
        FROM resource_allocations ra
        JOIN employees e ON ra.employee_id = e.id
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id 
          AND ch.date = generate_series(ra.start_date, ra.end_date, '1 day'::interval)::date
        WHERE ra.is_active = true 
        AND e.is_active = true
        AND generate_series(ra.start_date, ra.end_date, '1 day'::interval)::date BETWEEN $1 AND $2
      )
      SELECT 
        employee_id,
        employee_name,
        allocation_date as conflict_date,
        SUM(daily_hours) as total_allocated_hours,
        MAX(max_capacity_hours) as max_capacity_hours,
        SUM(daily_hours) - MAX(max_capacity_hours) as over_allocation
      FROM daily_allocations
      GROUP BY employee_id, employee_name, allocation_date
      HAVING SUM(daily_hours) > MAX(max_capacity_hours)
      ORDER BY over_allocation DESC, allocation_date
    `;
        const result = await this.pool.query(query, [dateFrom, dateTo]);
        return result.rows.map(row => ({
            employeeId: row.employee_id,
            employeeName: row.employee_name,
            conflictDate: row.conflict_date,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            maxCapacityHours: parseFloat(row.max_capacity_hours) || 40,
            overAllocation: parseFloat(row.over_allocation) || 0
        }));
    }
    static async getBillableHoursSummary(dateFrom, dateTo) {
        const query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        SUM(ra.allocated_hours) as total_allocated_hours,
        SUM(COALESCE(ra.actual_hours, 0)) as total_actual_hours,
        SUM(COALESCE(ra.actual_hours, ra.allocated_hours) * COALESCE(ra.hourly_rate, 0)) as total_billable_amount,
        CASE 
          WHEN SUM(ra.allocated_hours) > 0 
          THEN SUM(COALESCE(ra.actual_hours, 0))::numeric / SUM(ra.allocated_hours)::numeric
          ELSE 0 
        END as completion_rate
      FROM projects p
      JOIN resource_allocations ra ON p.id = ra.project_id
      WHERE ra.is_active = true 
      AND p.is_active = true
      AND ra.start_date <= $2 
      AND ra.end_date >= $1
      GROUP BY p.id, p.name
      ORDER BY total_billable_amount DESC
    `;
        const result = await this.pool.query(query, [dateFrom, dateTo]);
        return result.rows.map(row => ({
            projectId: row.project_id,
            projectName: row.project_name,
            totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
            totalActualHours: parseFloat(row.total_actual_hours) || 0,
            totalBillableAmount: parseFloat(row.total_billable_amount) || 0,
            completionRate: parseFloat(row.completion_rate) || 0
        }));
    }
    static mapRow(row) {
        const allocation = {
            id: row.id,
            projectId: row.project_id,
            employeeId: row.employee_id,
            allocatedHours: parseFloat(row.allocated_hours) || 0,
            roleOnProject: row.role_on_project,
            startDate: row.start_date,
            endDate: row.end_date,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
        // Only set optional properties if they have values
        if (row.hourly_rate !== null && row.hourly_rate !== undefined) {
            allocation.hourlyRate = parseFloat(row.hourly_rate);
        }
        if (row.actual_hours !== null && row.actual_hours !== undefined) {
            allocation.actualHours = parseFloat(row.actual_hours);
        }
        if (row.notes !== null && row.notes !== undefined) {
            allocation.notes = row.notes;
        }
        return allocation;
    }
}
exports.ResourceAllocationModel = ResourceAllocationModel;
