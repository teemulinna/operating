"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const database_service_1 = require("../database/database.service");
const database_factory_1 = require("../database/database-factory");
class EmployeeService {
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
    }
    static async create() {
        const db = await database_factory_1.DatabaseFactory.getDatabaseService();
        return new EmployeeService(db);
    }
    async getEmployees(query) {
        const page = query.page || 1;
        const limit = Math.min(query.limit || 10, 100);
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        if (query.search) {
            whereConditions.push(`(
        e.first_name ILIKE $${paramIndex} OR 
        e.last_name ILIKE $${paramIndex} OR 
        e.email ILIKE $${paramIndex} OR 
        e.position ILIKE $${paramIndex}
      )`);
            params.push(`%${query.search}%`);
            paramIndex++;
        }
        if (query.departmentId) {
            whereConditions.push(`e.department_id = $${paramIndex}`);
            params.push(query.departmentId);
            paramIndex++;
        }
        if (query.position) {
            whereConditions.push(`e.position ILIKE $${paramIndex}`);
            params.push(`%${query.position}%`);
            paramIndex++;
        }
        if (query.skills) {
            const skillsArray = query.skills.split(',').map(s => s.trim());
            whereConditions.push(`e.skills && $${paramIndex}`);
            params.push(skillsArray);
            paramIndex++;
        }
        if (query.salaryMin !== undefined) {
            whereConditions.push(`e.salary >= $${paramIndex}`);
            params.push(query.salaryMin);
            paramIndex++;
        }
        if (query.salaryMax !== undefined) {
            whereConditions.push(`e.salary <= $${paramIndex}`);
            params.push(query.salaryMax);
            paramIndex++;
        }
        if (query.isActive !== undefined) {
            whereConditions.push(`e.is_active = $${paramIndex}`);
            params.push(query.isActive);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const validSortFields = {
            firstName: 'e.first_name',
            lastName: 'e.last_name',
            salary: 'e.salary',
            hireDate: 'e.hire_date'
        };
        const sortField = validSortFields[query.sortBy || 'lastName'] || 'e.last_name';
        const sortOrder = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
        const countQuery = `
      SELECT COUNT(*) as total
      FROM employees e
      ${whereClause}
    `;
        const countResult = await this.db.query(countQuery, params);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limit);
        const dataQuery = `
      SELECT
        e.id,
        e.first_name as "firstName",
        e.last_name as "lastName",
        e.email,
        e.position,
        e.department_id as "departmentId",
        d.name as "departmentName",
        e.weekly_capacity as "weeklyCapacity",
        e.salary,
        e.hire_date as "hireDate",
        e.skills,
        e.is_active as "isActive",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const result = await this.db.query(dataQuery, params);
        return {
            data: result.rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems,
                limit,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
    async getEmployeeById(id) {
        const query = `
      SELECT
        e.id,
        e.first_name as "firstName",
        e.last_name as "lastName",
        e.email,
        e.position,
        e.department_id as "departmentId",
        d.name as "departmentName",
        e.weekly_capacity as "weeklyCapacity",
        e.salary,
        e.hire_date as "hireDate",
        e.skills,
        e.is_active as "isActive",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `;
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }
    async getEmployeeByEmail(email) {
        const query = `
      SELECT
        e.id,
        e.first_name as "firstName",
        e.last_name as "lastName",
        e.email,
        e.position,
        e.department_id as "departmentId",
        d.name as "departmentName",
        e.weekly_capacity as "weeklyCapacity",
        e.salary,
        e.hire_date as "hireDate",
        e.skills,
        e.is_active as "isActive",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.email = $1
    `;
        const result = await this.db.query(query, [email]);
        return result.rows[0] || null;
    }
    async createEmployee(employeeData) {
        const query = `
      INSERT INTO employees (
        first_name, last_name, email, position, department_id, weekly_capacity, salary, skills, hire_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
      RETURNING
        id,
        first_name as "firstName",
        last_name as "lastName",
        email,
        position,
        department_id as "departmentId",
        weekly_capacity as "weeklyCapacity",
        salary,
        hire_date as "hireDate",
        skills,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        const params = [
            employeeData.firstName,
            employeeData.lastName,
            employeeData.email,
            employeeData.position,
            employeeData.departmentId,
            employeeData.weeklyCapacity || 40,
            employeeData.salary,
            employeeData.skills || []
        ];
        const result = await this.db.query(query, params);
        return result.rows[0];
    }
    async updateEmployee(id, updateData) {
        const fields = [];
        const params = [];
        let paramIndex = 1;
        if (updateData.firstName !== undefined) {
            fields.push(`first_name = $${paramIndex++}`);
            params.push(updateData.firstName);
        }
        if (updateData.lastName !== undefined) {
            fields.push(`last_name = $${paramIndex++}`);
            params.push(updateData.lastName);
        }
        if (updateData.email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            params.push(updateData.email);
        }
        if (updateData.position !== undefined) {
            fields.push(`position = $${paramIndex++}`);
            params.push(updateData.position);
        }
        if (updateData.departmentId !== undefined) {
            fields.push(`department_id = $${paramIndex++}`);
            params.push(updateData.departmentId);
        }
        if (updateData.salary !== undefined) {
            fields.push(`salary = $${paramIndex++}`);
            params.push(updateData.salary);
        }
        if (updateData.weeklyCapacity !== undefined) {
            fields.push(`weekly_capacity = $${paramIndex++}`);
            params.push(updateData.weeklyCapacity);
        }
        if (updateData.skills !== undefined) {
            fields.push(`skills = $${paramIndex++}`);
            params.push(updateData.skills);
        }
        if (updateData.isActive !== undefined) {
            fields.push(`is_active = $${paramIndex++}`);
            params.push(updateData.isActive);
        }
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        const query = `
      UPDATE employees
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        first_name as "firstName",
        last_name as "lastName",
        email,
        position,
        department_id as "departmentId",
        weekly_capacity as "weeklyCapacity",
        salary,
        hire_date as "hireDate",
        skills,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
        const result = await this.db.query(query, params);
        return result.rows[0];
    }
    async checkEmployeeDeletionConstraints(id) {
        try {
            const employeeCheck = await this.db.query('SELECT id, first_name, last_name FROM employees WHERE id = $1', [id]);
            if (employeeCheck.rowCount === 0) {
                return { canDelete: false, blockers: ['Employee not found'], warnings: [] };
            }
            const employee = employeeCheck.rows[0];
            const dependencyChecks = await Promise.all([
                this.db.query(`
          SELECT COUNT(*) as count
          FROM allocation_templates
          WHERE EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'allocation_templates' AND column_name = 'created_by'
          ) AND created_by = $1
        `, [id]).catch(() => ({ rows: [{ count: '0' }] })),
                this.db.query(`
          SELECT COUNT(*) as count
          FROM allocations a
          JOIN projects p ON a.project_id = p.id
          WHERE a.employee_id = $1 AND a.status IN ('confirmed', 'tentative') AND p.status = 'active'
        `, [id]),
                this.db.query(`
          SELECT COUNT(*) as count
          FROM allocations a
          WHERE a.employee_id = $1 AND a.start_date > CURRENT_DATE
        `, [id])
            ]);
            const [templatesResult, activeAllocationsResult, futureAllocationsResult] = dependencyChecks;
            const templateCount = parseInt(templatesResult.rows[0]?.count || '0');
            const activeAllocationCount = parseInt(activeAllocationsResult.rows[0]?.count || '0');
            const futureAllocationCount = parseInt(futureAllocationsResult.rows[0]?.count || '0');
            const blockers = [];
            const warnings = [];
            if (templateCount > 0) {
                blockers.push(`${templateCount} allocation template(s) created by this employee must be reassigned first`);
            }
            if (activeAllocationCount > 0) {
                blockers.push(`${activeAllocationCount} active project allocation(s) must be resolved first`);
            }
            if (futureAllocationCount > 0) {
                warnings.push(`${futureAllocationCount} future allocation(s) will be cancelled`);
            }
            return {
                canDelete: blockers.length === 0,
                blockers,
                warnings
            };
        }
        catch (error) {
            return {
                canDelete: false,
                blockers: ['Unable to check dependencies due to database error'],
                warnings: []
            };
        }
    }
    async deleteEmployee(id) {
        const client = await this.db.getClient();
        try {
            await client.query('BEGIN');
            const employeeCheck = await client.query('SELECT id, first_name, last_name FROM employees WHERE id = $1', [id]);
            if (employeeCheck.rowCount === 0) {
                throw new Error('Employee not found');
            }
            const employee = employeeCheck.rows[0];
            const dependencyChecks = await Promise.all([
                client.query(`
          SELECT COUNT(*) as count
          FROM allocation_templates
          WHERE EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'allocation_templates' AND column_name = 'created_by'
          ) AND created_by = $1
        `, [id]).catch(() => ({ rows: [{ count: '0' }] })),
                client.query(`
          SELECT COUNT(*) as count
          FROM allocations a
          JOIN projects p ON a.project_id = p.id
          WHERE a.employee_id = $1 AND a.status IN ('confirmed', 'tentative') AND p.status = 'active'
        `, [id]),
                client.query(`
          SELECT COUNT(*) as count
          FROM employees e
          WHERE e.department_id = (SELECT department_id FROM employees WHERE id = $1)
        `, [id])
            ]);
            const [templatesResult, activeAllocationsResult, deptSizeResult] = dependencyChecks;
            const templateCount = parseInt(templatesResult.rows[0]?.count || '0');
            const activeAllocationCount = parseInt(activeAllocationsResult.rows[0]?.count || '0');
            const deptSize = parseInt(deptSizeResult.rows[0]?.count || '0');
            const blockers = [];
            if (templateCount > 0) {
                blockers.push(`${templateCount} allocation template(s) created by this employee`);
            }
            if (activeAllocationCount > 0) {
                blockers.push(`${activeAllocationCount} active project allocation(s)`);
            }
            if (blockers.length > 0) {
                throw new Error(`Cannot delete employee ${employee.first_name} ${employee.last_name}. Please resolve the following dependencies first: ${blockers.join(', ')}.`);
            }
            const cleanupOperations = [
                {
                    query: 'DELETE FROM employee_skills WHERE employee_id = $1',
                    name: 'employee skills'
                },
                {
                    query: 'DELETE FROM capacity_history WHERE employee_id = $1',
                    name: 'capacity history'
                },
                {
                    query: `
            UPDATE allocations SET created_by = NULL
            WHERE EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'allocations' AND column_name = 'created_by'
            ) AND created_by = $1
          `,
                    name: 'allocation creator references'
                },
                {
                    query: `
            UPDATE resource_allocations SET created_by = NULL
            WHERE EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'resource_allocations' AND column_name = 'created_by'
            ) AND created_by = $1
          `,
                    name: 'resource allocation creator references'
                },
                {
                    query: `DELETE FROM notifications WHERE target_user = $1 OR data::jsonb @> '{"employeeId": "${id}"}'`,
                    name: 'employee notifications'
                }
            ];
            for (const operation of cleanupOperations) {
                const result = await client.query(operation.query, [id]);
                console.log(`✅ Cleaned up ${result.rowCount} ${operation.name} records for employee ${id}`);
            }
            const deleteResult = await client.query('DELETE FROM employees WHERE id = $1', [id]);
            if (deleteResult.rowCount === 0) {
                throw new Error('Failed to delete employee record');
            }
            await client.query('COMMIT');
            console.log(`✅ Successfully deleted employee ${employee.first_name} ${employee.last_name} (${id}) and all related records`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to delete employee due to database constraints');
        }
        finally {
            client.release();
        }
    }
    async bulkImportEmployees(employees) {
        const response = {
            imported: 0,
            errors: [],
            duplicates: 0
        };
        for (let i = 0; i < employees.length; i++) {
            const employee = employees[i];
            try {
                const existingEmployee = await this.getEmployeeByEmail(employee.email);
                if (existingEmployee) {
                    response.duplicates++;
                    response.errors.push({
                        row: i + 1,
                        error: 'Duplicate email address',
                        data: employee
                    });
                    continue;
                }
                await this.createEmployee(employee);
                response.imported++;
            }
            catch (error) {
                response.errors.push({
                    row: i + 1,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: employee
                });
            }
        }
        return response;
    }
    async getEmployeeAnalytics() {
        const queries = [
            'SELECT COUNT(*) as total_employees FROM employees WHERE is_active = true',
            `SELECT d.name as department, COUNT(e.id) as count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
       GROUP BY d.id, d.name
       ORDER BY count DESC`,
            `SELECT d.name as department, ROUND(AVG(e.salary), 2) as avg_salary
       FROM departments d
       JOIN employees e ON d.id = e.department_id AND e.is_active = true
       GROUP BY d.id, d.name
       ORDER BY avg_salary DESC`,
            `SELECT skill, COUNT(*) as count
       FROM employees e, unnest(e.skills) as skill
       WHERE e.is_active = true
       GROUP BY skill
       ORDER BY count DESC
       LIMIT 10`,
            `SELECT 
         DATE_TRUNC('month', hire_date) as month,
         COUNT(*) as hires
       FROM employees
       WHERE hire_date >= CURRENT_DATE - INTERVAL '12 months'
       GROUP BY month
       ORDER BY month`
        ];
        const [totalResult, deptResult, salaryResult, skillsResult, hiringResult] = await Promise.all(queries.map(query => this.db.query(query)));
        return {
            totalEmployees: parseInt(totalResult.rows[0].total_employees),
            employeesByDepartment: deptResult.rows,
            averageSalaryByDepartment: salaryResult.rows,
            topSkills: skillsResult.rows,
            hiringTrends: hiringResult.rows
        };
    }
}
exports.EmployeeService = EmployeeService;
//# sourceMappingURL=employee.service.js.map