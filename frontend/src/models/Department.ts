import { BaseModel, BaseEntity, QueryOptions, WhereClause } from './BaseModel';
import { Employee } from './Employee';

export interface Department extends BaseEntity {
  name: string;
  description?: string;
  manager_id?: string;
  budget?: number;
  location?: string;
  is_active: boolean;
}

export interface DepartmentWithManager extends Department {
  manager?: Employee;
}

export interface DepartmentWithEmployeeCount extends Department {
  employee_count: number;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  manager_id?: string;
  budget?: number;
  location?: string;
  is_active?: boolean;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  manager_id?: string;
  budget?: number;
  location?: string;
  is_active?: boolean;
}

export class DepartmentModel extends BaseModel<Department> {
  constructor() {
    super('departments');
  }

  async findByName(name: string, options: QueryOptions = {}): Promise<Department | null> {
    return await this.findOne({ name }, options);
  }

  async findActiveRaw(options: QueryOptions = {}): Promise<Department[]> {
    return await this.findWhere({ is_active: true }, options);
  }

  async findWithManager(id: string): Promise<DepartmentWithManager | null> {
    try {
      const query = `
        SELECT 
          d.*,
          json_build_object(
            'id', e.id,
            'employee_number', e.employee_number,
            'first_name', e.first_name,
            'last_name', e.last_name,
            'email', e.email,
            'position_title', e.position_title
          ) as manager
        FROM departments d
        LEFT JOIN employees e ON d.manager_id = e.id AND e.deleted_at IS NULL
        WHERE d.id = $1 AND d.deleted_at IS NULL
      `;
      
      const rows = await this.db.query<DepartmentWithManager>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding department with manager:', error);
      throw error;
    }
  }

  async findAllWithManagers(options: QueryOptions = {}): Promise<DepartmentWithManager[]> {
    try {
      let query = `
        SELECT 
          d.*,
          json_build_object(
            'id', e.id,
            'employee_number', e.employee_number,
            'first_name', e.first_name,
            'last_name', e.last_name,
            'email', e.email,
            'position_title', e.position_title
          ) as manager
        FROM departments d
        LEFT JOIN employees e ON d.manager_id = e.id AND e.deleted_at IS NULL
      `;
      
      if (!options.includeDeleted) {
        query += ' WHERE d.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY d.${options.orderBy}`;
      } else {
        query += ' ORDER BY d.name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      return await this.db.query<DepartmentWithManager>(query);
    } catch (error) {
      this.logger.error('Error finding departments with managers:', error);
      throw error;
    }
  }

  async findWithEmployeeCount(id: string): Promise<DepartmentWithEmployeeCount | null> {
    try {
      const query = `
        SELECT 
          d.*,
          COALESCE(emp_count.count, 0)::integer as employee_count
        FROM departments d
        LEFT JOIN (
          SELECT department_id, COUNT(*) as count
          FROM employees
          WHERE deleted_at IS NULL AND is_active = true
          GROUP BY department_id
        ) emp_count ON d.id = emp_count.department_id
        WHERE d.id = $1 AND d.deleted_at IS NULL
      `;
      
      const rows = await this.db.query<DepartmentWithEmployeeCount>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding department with employee count:', error);
      throw error;
    }
  }

  async findAllWithEmployeeCount(options: QueryOptions = {}): Promise<DepartmentWithEmployeeCount[]> {
    try {
      let query = `
        SELECT 
          d.*,
          COALESCE(emp_count.count, 0)::integer as employee_count
        FROM departments d
        LEFT JOIN (
          SELECT department_id, COUNT(*) as count
          FROM employees
          WHERE deleted_at IS NULL AND is_active = true
          GROUP BY department_id
        ) emp_count ON d.id = emp_count.department_id
      `;
      
      if (!options.includeDeleted) {
        query += ' WHERE d.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY d.${options.orderBy}`;
      } else {
        query += ' ORDER BY d.name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      return await this.db.query<DepartmentWithEmployeeCount>(query);
    } catch (error) {
      this.logger.error('Error finding departments with employee count:', error);
      throw error;
    }
  }

  async findByLocation(location: string, options: QueryOptions = {}): Promise<Department[]> {
    return await this.findWhere({ location }, options);
  }

  async findByBudgetRange(minBudget: number, maxBudget: number, options: QueryOptions = {}): Promise<Department[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      if (whereClause) {
        whereClause += ` AND budget BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      } else {
        whereClause = ` WHERE budget BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      }
      
      params.push(minBudget, maxBudget);
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }
      
      return await this.db.query<Department>(query, params);
    } catch (error) {
      this.logger.error('Error finding departments by budget range:', error);
      throw error;
    }
  }

  async updateManager(departmentId: string, managerId: string | null, userId?: string): Promise<Department | null> {
    return await this.update(departmentId, { manager_id: managerId }, userId);
  }

  async getTotalBudget(options: QueryOptions = {}): Promise<number> {
    try {
      let query = `SELECT SUM(budget) as total_budget FROM departments`;
      
      if (!options.includeDeleted) {
        query += ' WHERE deleted_at IS NULL';
      }
      
      const rows = await this.db.query<{ total_budget: string | null }>(query);
      return parseFloat(rows[0].total_budget || '0');
    } catch (error) {
      this.logger.error('Error calculating total budget:', error);
      throw error;
    }
  }

  async getDepartmentStats(): Promise<{
    total_departments: number;
    active_departments: number;
    total_budget: number;
    departments_with_managers: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_departments,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_departments,
          COALESCE(SUM(budget), 0) as total_budget,
          COUNT(CASE WHEN manager_id IS NOT NULL THEN 1 END) as departments_with_managers
        FROM departments
        WHERE deleted_at IS NULL
      `;
      
      const rows = await this.db.query<{
        total_departments: string;
        active_departments: string;
        total_budget: string;
        departments_with_managers: string;
      }>(query);
      
      const result = rows[0];
      return {
        total_departments: parseInt(result.total_departments, 10),
        active_departments: parseInt(result.active_departments, 10),
        total_budget: parseFloat(result.total_budget),
        departments_with_managers: parseInt(result.departments_with_managers, 10),
      };
    } catch (error) {
      this.logger.error('Error getting department stats:', error);
      throw error;
    }
  }

  // Helper methods for common operations
  async activate(id: string, userId?: string): Promise<Department | null> {
    return await this.update(id, { is_active: true }, userId);
  }

  async deactivate(id: string, userId?: string): Promise<Department | null> {
    return await this.update(id, { is_active: false }, userId);
  }

  async search(searchTerm: string, options: QueryOptions = {}): Promise<Department[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const searchCondition = `(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR location ILIKE $${params.length + 1})`;
      params.push(`%${searchTerm}%`);
      
      if (whereClause) {
        whereClause += ` AND ${searchCondition}`;
      } else {
        whereClause = ` WHERE ${searchCondition}`;
      }
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      return await this.db.query<Department>(query, params);
    } catch (error) {
      this.logger.error('Error searching departments:', error);
      throw error;
    }
  }
}

export const departmentModel = new DepartmentModel();