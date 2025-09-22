"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentService = void 0;
const database_service_1 = require("../database/database.service");
const database_factory_1 = require("../database/database-factory");
class DepartmentService {
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
    }
    static async create() {
        const db = await database_factory_1.DatabaseFactory.getDatabaseService();
        return new DepartmentService(db);
    }
    async getDepartments() {
        const query = `
      SELECT 
        d.id,
        d.name,
        d.description,
        d.manager_id as "managerId",
        CONCAT(m.first_name, ' ', m.last_name) as "managerName",
        COUNT(e.id) as "employeeCount",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt"
      FROM departments d
      LEFT JOIN employees m ON d.manager_id = m.id
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      GROUP BY d.id, d.name, d.description, d.manager_id, m.first_name, m.last_name, d.created_at, d.updated_at
      ORDER BY d.name
    `;
        const result = await this.db.query(query);
        return result.rows;
    }
    async getDepartmentById(id) {
        const query = `
      SELECT 
        d.id,
        d.name,
        d.description,
        d.manager_id as "managerId",
        CONCAT(m.first_name, ' ', m.last_name) as "managerName",
        COUNT(e.id) as "employeeCount",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt"
      FROM departments d
      LEFT JOIN employees m ON d.manager_id = m.id
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      WHERE d.id = $1
      GROUP BY d.id, d.name, d.description, d.manager_id, m.first_name, m.last_name, d.created_at, d.updated_at
    `;
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }
    async getDepartmentByName(name) {
        const query = 'SELECT * FROM departments WHERE name = $1';
        const result = await this.db.query(query, [name]);
        return result.rows[0] || null;
    }
    async createDepartment(departmentData) {
        const query = `
      INSERT INTO departments (name, description, manager_id)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        name,
        description,
        manager_id as "managerId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        const params = [
            departmentData.name,
            departmentData.description || null,
            departmentData.managerId || null
        ];
        const result = await this.db.query(query, params);
        return result.rows[0];
    }
    async updateDepartment(id, updateData) {
        const fields = [];
        const params = [];
        let paramIndex = 1;
        if (updateData.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            params.push(updateData.name);
        }
        if (updateData.description !== undefined) {
            fields.push(`description = $${paramIndex++}`);
            params.push(updateData.description);
        }
        if (updateData.managerId !== undefined) {
            fields.push(`manager_id = $${paramIndex++}`);
            params.push(updateData.managerId);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        const query = `
      UPDATE departments 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        name,
        description,
        manager_id as "managerId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        const result = await this.db.query(query, params);
        return result.rows[0];
    }
    async deleteDepartment(id) {
        const query = 'DELETE FROM departments WHERE id = $1';
        await this.db.query(query, [id]);
    }
    async getDepartmentEmployeeCount(id) {
        const query = 'SELECT COUNT(*) as count FROM employees WHERE department_id = $1 AND is_active = true';
        const result = await this.db.query(query, [id]);
        return parseInt(result.rows[0].count);
    }
    async getDepartmentEmployees(id) {
        const query = `
      SELECT 
        id,
        first_name as "firstName",
        last_name as "lastName",
        email,
        position,
        salary,
        hire_date as "hireDate",
        skills,
        is_active as "isActive"
      FROM employees
      WHERE department_id = $1 AND is_active = true
      ORDER BY last_name, first_name
    `;
        const result = await this.db.query(query, [id]);
        return result.rows;
    }
    async getDepartmentAnalytics() {
        const queries = [
            `SELECT 
        d.id,
        d.name,
        COUNT(e.id) as employee_count,
        ROUND(AVG(e.salary), 2) as avg_salary,
        MIN(e.salary) as min_salary,
        MAX(e.salary) as max_salary
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      GROUP BY d.id, d.name
      ORDER BY employee_count DESC`,
            `SELECT 
        d.name as department,
        DATE_TRUNC('month', e.hire_date) as month,
        COUNT(e.id) as new_hires
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      WHERE e.hire_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY d.id, d.name, month
      ORDER BY d.name, month`,
            `SELECT 
        d.name as department,
        skill,
        COUNT(*) as skill_count
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      JOIN unnest(e.skills) as skill ON true
      WHERE e.is_active = true
      GROUP BY d.id, d.name, skill
      ORDER BY d.name, skill_count DESC`
        ];
        const [overviewResult, growthResult, skillsResult] = await Promise.all(queries.map(query => this.db.query(query)));
        return {
            departmentOverview: overviewResult.rows,
            departmentGrowth: growthResult.rows,
            skillsByDepartment: skillsResult.rows
        };
    }
}
exports.DepartmentService = DepartmentService;
//# sourceMappingURL=department.service.js.map