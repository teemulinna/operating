"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModel = void 0;
const types_1 = require("../types");
class EmployeeModel {
    static pool;
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
            const values = [
                input.firstName,
                input.lastName,
                input.email,
                input.departmentId,
                input.position,
                input.hireDate,
                true
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError(`Employee with email '${input.email}' already exists`);
            }
            if (error.code === '23503') { // Foreign key constraint violation
                throw new types_1.DatabaseError('Invalid department ID');
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT * FROM employees 
      WHERE id = $1 AND is_active = true
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByIdWithDetails(id) {
        const query = `
      SELECT 
        e.*,
        json_build_object(
          'id', d.id,
          'name', d.name,
          'description', d.description,
          'isActive', d.is_active
        ) AS department,
        COALESCE(
          json_agg(
            CASE 
              WHEN es.id IS NOT NULL THEN
                json_build_object(
                  'id', es.id,
                  'employeeId', es.employee_id,
                  'skillId', es.skill_id,
                  'proficiencyLevel', es.proficiency_level::integer,
                  'yearsOfExperience', es.years_of_experience,
                  'lastAssessed', es.last_assessed,
                  'isActive', es.is_active,
                  'createdAt', es.created_at,
                  'updatedAt', es.updated_at,
                  'skill', json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'description', s.description,
                    'category', s.category,
                    'isActive', s.is_active
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE es.id IS NOT NULL),
          '[]'::json
        ) AS skills
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      LEFT JOIN skills s ON es.skill_id = s.id AND s.is_active = true
      WHERE e.id = $1 AND e.is_active = true
      GROUP BY e.id, d.id, d.name, d.description, d.is_active
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const employee = this.mapRow(row);
        return {
            ...employee,
            department: row.department,
            skills: row.skills || []
        };
    }
    static async findByEmail(email) {
        const query = `
      SELECT * FROM employees 
      WHERE LOWER(email) = LOWER($1) AND is_active = true
    `;
        const result = await this.pool.query(query, [email]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findAll(filters = {}, page = 1, limit = 50) {
        let whereConditions = ['e.is_active = true'];
        const values = [];
        if (filters.departmentId) {
            values.push(filters.departmentId);
            whereConditions.push(`e.department_id = $${values.length}`);
        }
        if (filters.position) {
            values.push(`%${filters.position}%`);
            whereConditions.push(`LOWER(e.position) ILIKE LOWER($${values.length})`);
        }
        if (filters.isActive !== undefined) {
            values.push(filters.isActive);
            whereConditions.push(`e.is_active = $${values.length}`);
        }
        if (filters.skillIds && filters.skillIds.length > 0) {
            const minProficiency = filters.minProficiencyLevel || 1;
            values.push(filters.skillIds, minProficiency);
            whereConditions.push(`
        EXISTS (
          SELECT 1 FROM employee_skills es 
          WHERE es.employee_id = e.id 
          AND es.skill_id = ANY($${values.length - 1})
          AND es.proficiency_level::integer >= $${values.length}
          AND es.is_active = true
        )
      `);
        }
        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;
        // Get total count
        const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM employees e
      WHERE ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        values.push(limit, offset);
        const dataQuery = `
      SELECT DISTINCT e.*
      FROM employees e
      WHERE ${whereClause}
      ORDER BY e.last_name, e.first_name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const dataResult = await this.pool.query(dataQuery, values);
        const employees = dataResult.rows.map(row => this.mapRow(row));
        const totalPages = Math.ceil(total / limit);
        return {
            data: employees,
            total,
            page,
            limit,
            totalPages
        };
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.firstName !== undefined) {
            values.push(updates.firstName);
            updateFields.push(`first_name = $${values.length}`);
        }
        if (updates.lastName !== undefined) {
            values.push(updates.lastName);
            updateFields.push(`last_name = $${values.length}`);
        }
        if (updates.email !== undefined) {
            values.push(updates.email);
            updateFields.push(`email = $${values.length}`);
        }
        if (updates.departmentId !== undefined) {
            values.push(updates.departmentId);
            updateFields.push(`department_id = $${values.length}`);
        }
        if (updates.position !== undefined) {
            values.push(updates.position);
            updateFields.push(`position = $${values.length}`);
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
      UPDATE employees 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;
        try {
            const result = await this.pool.query(query, values);
            if (result.rows.length === 0) {
                throw new Error('Employee not found or already deleted');
            }
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError(`Employee with email '${updates.email}' already exists`);
            }
            if (error.code === '23503') { // Foreign key constraint violation
                throw new types_1.DatabaseError('Invalid department ID');
            }
            throw error;
        }
    }
    static async delete(id) {
        const query = `
      UPDATE employees 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Employee not found or already deleted');
        }
        return this.mapRow(result.rows[0]);
    }
    static async search(searchTerm, filters = {}, page = 1, limit = 50) {
        let whereConditions = [
            'e.is_active = true',
            `(
        LOWER(e.first_name) ILIKE LOWER($1) OR 
        LOWER(e.last_name) ILIKE LOWER($1) OR 
        LOWER(e.email) ILIKE LOWER($1) OR 
        LOWER(e.position) ILIKE LOWER($1) OR
        LOWER(CONCAT(e.first_name, ' ', e.last_name)) ILIKE LOWER($1)
      )`
        ];
        const values = [`%${searchTerm}%`];
        // Apply additional filters
        if (filters.departmentId) {
            values.push(filters.departmentId);
            whereConditions.push(`e.department_id = $${values.length}`);
        }
        const whereClause = whereConditions.join(' AND ');
        const offset = (page - 1) * limit;
        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM employees e
      WHERE ${whereClause}
    `;
        const countResult = await this.pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total);
        // Get paginated results
        values.push(limit, offset);
        const dataQuery = `
      SELECT e.*
      FROM employees e
      WHERE ${whereClause}
      ORDER BY e.last_name, e.first_name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const dataResult = await this.pool.query(dataQuery, values);
        const employees = dataResult.rows.map(row => this.mapRow(row));
        const totalPages = Math.ceil(total / limit);
        return {
            data: employees,
            total,
            page,
            limit,
            totalPages
        };
    }
    static async getStatistics() {
        const query = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE e.is_active = true) as active_employees,
        AVG(EXTRACT(days FROM CURRENT_DATE - e.hire_date)) as avg_tenure_days
      FROM employees e
    `;
        const result = await this.pool.query(query);
        const stats = result.rows[0];
        // Get employees by department
        const deptQuery = `
      SELECT 
        d.name as department_name,
        COUNT(e.id) as count
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      WHERE d.is_active = true
      GROUP BY d.id, d.name
      ORDER BY count DESC
    `;
        const deptResult = await this.pool.query(deptQuery);
        const employeesByDepartment = deptResult.rows.map(row => ({
            departmentName: row.department_name,
            count: parseInt(row.count)
        }));
        // Get newest employee
        const newestQuery = `
      SELECT * FROM employees 
      WHERE is_active = true 
      ORDER BY hire_date DESC, created_at DESC 
      LIMIT 1
    `;
        const newestResult = await this.pool.query(newestQuery);
        const newestEmployee = newestResult.rows.length > 0
            ? this.mapRow(newestResult.rows[0])
            : null;
        return {
            totalEmployees: parseInt(stats.total_employees),
            activeEmployees: parseInt(stats.active_employees),
            employeesByDepartment,
            averageTenure: parseFloat(stats.avg_tenure_days) || 0,
            newestEmployee
        };
    }
    static mapRow(row) {
        return {
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            departmentId: row.department_id,
            position: row.position,
            hireDate: row.hire_date,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.EmployeeModel = EmployeeModel;
//# sourceMappingURL=Employee.js.map