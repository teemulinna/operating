"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentModel = void 0;
const types_1 = require("../types");
class DepartmentModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO departments (name, description, manager_id, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
            const values = [
                input.name,
                input.description || null,
                input.managerId || null,
                true
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError(`Department with name '${input.name}' already exists`);
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT * FROM departments 
      WHERE id = $1 AND is_active = true
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByIdWithEmployees(id) {
        const query = `
      SELECT 
        d.*,
        json_agg(
          CASE 
            WHEN e.id IS NOT NULL THEN
              json_build_object(
                'id', e.id,
                'firstName', e.first_name,
                'lastName', e.last_name,
                'email', e.email,
                'position', e.position,
                'hireDate', e.hire_date,
                'isActive', e.is_active
              )
            ELSE NULL
          END
        ) FILTER (WHERE e.id IS NOT NULL) AS employees,
        json_build_object(
          'id', m.id,
          'firstName', m.first_name,
          'lastName', m.last_name,
          'email', m.email,
          'position', m.position
        ) AS manager
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN employees m ON d.manager_id = m.id AND m.is_active = true
      WHERE d.id = $1 AND d.is_active = true
      GROUP BY d.id, m.id, m.first_name, m.last_name, m.email, m.position
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const department = this.mapRow(row);
        return {
            ...department,
            employees: row.employees || [],
            manager: row.manager.id ? row.manager : undefined
        };
    }
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM departments WHERE 1=1';
        const values = [];
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            query += ` AND is_active = $${values.length}`;
        }
        query += ' ORDER BY name';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRow(row));
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.name !== undefined) {
            values.push(updates.name);
            updateFields.push(`name = $${values.length}`);
        }
        if (updates.description !== undefined) {
            values.push(updates.description);
            updateFields.push(`description = $${values.length}`);
        }
        if (updates.managerId !== undefined) {
            values.push(updates.managerId);
            updateFields.push(`manager_id = $${values.length}`);
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
      UPDATE departments 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;
        try {
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Department not found or already deleted');
            }
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError(`Department with name '${updates.name}' already exists`);
            }
            throw error;
        }
    }
    static async delete(id) {
        // Check if department has active employees
        const employeeCheck = await this.pool.query('SELECT COUNT(*) FROM employees WHERE department_id = $1 AND is_active = true', [id]);
        if (parseInt(employeeCheck.rows[0].count) > 0) {
            throw new types_1.DatabaseError('Cannot delete department with active employees');
        }
        const query = `
      UPDATE departments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Department not found or already deleted');
        }
        return this.mapRow(result.rows[0]);
    }
    static async getStatistics() {
        const query = `
      SELECT 
        COUNT(*) as total_departments,
        COUNT(*) FILTER (WHERE is_active = true) as active_departments,
        COUNT(*) FILTER (WHERE manager_id IS NOT NULL AND is_active = true) as departments_with_managers,
        COALESCE(AVG(employee_count), 0) as avg_employees_per_department
      FROM departments d
      LEFT JOIN (
        SELECT department_id, COUNT(*) as employee_count
        FROM employees 
        WHERE is_active = true
        GROUP BY department_id
      ) e ON d.id = e.department_id
    `;
        const result = await this.pool.query(query);
        const row = result.rows[0];
        return {
            totalDepartments: parseInt(row.total_departments),
            activeDepartments: parseInt(row.active_departments),
            departmentsWithManagers: parseInt(row.departments_with_managers),
            averageEmployeesPerDepartment: parseFloat(row.avg_employees_per_department) || 0
        };
    }
    static mapRow(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            managerId: row.manager_id,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.DepartmentModel = DepartmentModel;
