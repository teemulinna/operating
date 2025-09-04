import { BaseModel, BaseEntity, QueryOptions, WhereClause } from './BaseModel';
import { Department } from './Department';
import { EmployeeSkill } from './EmployeeSkill';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface Employee extends BaseEntity {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: Date;
  termination_date?: Date;
  department_id?: string;
  position_title: string;
  employment_type: EmploymentType;
  salary?: number;
  hourly_rate?: number;
  weekly_capacity_hours: number;
  is_active: boolean;
  manager_id?: string;
}

export interface EmployeeWithDepartment extends Employee {
  department?: Department;
}

export interface EmployeeWithManager extends Employee {
  manager?: Omit<Employee, 'manager'>;
}

export interface EmployeeWithSkills extends Employee {
  skills: EmployeeSkill[];
}

export interface EmployeeDetails extends EmployeeWithDepartment {
  manager?: Omit<Employee, 'manager'>;
  skills: EmployeeSkill[];
  direct_reports?: Employee[];
}

export interface CreateEmployeeData {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  hire_date: Date;
  department_id?: string;
  position_title: string;
  employment_type: EmploymentType;
  salary?: number;
  hourly_rate?: number;
  weekly_capacity_hours?: number;
  manager_id?: string;
}

export interface UpdateEmployeeData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  position_title?: string;
  employment_type?: EmploymentType;
  salary?: number;
  hourly_rate?: number;
  weekly_capacity_hours?: number;
  manager_id?: string;
  is_active?: boolean;
}

export class EmployeeModel extends BaseModel<Employee> {
  constructor() {
    super('employees');
  }

  async findByEmployeeNumber(employeeNumber: string, options: QueryOptions = {}): Promise<Employee | null> {
    return await this.findOne({ employee_number: employeeNumber }, options);
  }

  async findByEmail(email: string, options: QueryOptions = {}): Promise<Employee | null> {
    return await this.findOne({ email }, options);
  }

  async findByDepartment(departmentId: string, options: QueryOptions = {}): Promise<Employee[]> {
    return await this.findWhere({ department_id: departmentId }, options);
  }

  async findActiveEmployees(options: QueryOptions = {}): Promise<Employee[]> {
    return await this.findWhere({ is_active: true }, options);
  }

  async findWithDepartment(id: string): Promise<EmployeeWithDepartment | null> {
    try {
      const query = `
        SELECT 
          e.*,
          json_build_object(
            'id', d.id,
            'name', d.name,
            'description', d.description,
            'location', d.location,
            'is_active', d.is_active
          ) as department
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id AND d.deleted_at IS NULL
        WHERE e.id = $1 AND e.deleted_at IS NULL
      `;
      
      const rows = await this.db.query<EmployeeWithDepartment>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding employee with department:', error);
      throw error;
    }
  }

  async findWithManager(id: string): Promise<EmployeeWithManager | null> {
    try {
      const query = `
        SELECT 
          e.*,
          json_build_object(
            'id', m.id,
            'employee_number', m.employee_number,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email,
            'position_title', m.position_title
          ) as manager
        FROM employees e
        LEFT JOIN employees m ON e.manager_id = m.id AND m.deleted_at IS NULL
        WHERE e.id = $1 AND e.deleted_at IS NULL
      `;
      
      const rows = await this.db.query<EmployeeWithManager>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding employee with manager:', error);
      throw error;
    }
  }

  async findDirectReports(managerId: string, options: QueryOptions = {}): Promise<Employee[]> {
    return await this.findWhere({ manager_id: managerId }, options);
  }

  async findEmployeeDetails(id: string): Promise<EmployeeDetails | null> {
    try {
      const query = `
        SELECT 
          e.*,
          json_build_object(
            'id', d.id,
            'name', d.name,
            'description', d.description,
            'location', d.location
          ) as department,
          json_build_object(
            'id', m.id,
            'employee_number', m.employee_number,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email,
            'position_title', m.position_title
          ) as manager,
          COALESCE(
            json_agg(
              json_build_object(
                'id', es.id,
                'skill_id', es.skill_id,
                'skill_name', s.name,
                'skill_category', s.category,
                'proficiency_level', es.proficiency_level,
                'years_experience', es.years_experience,
                'is_certified', es.is_certified
              )
            ) FILTER (WHERE es.id IS NOT NULL), 
            '[]'::json
          ) as skills,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', dr.id,
                  'employee_number', dr.employee_number,
                  'first_name', dr.first_name,
                  'last_name', dr.last_name,
                  'position_title', dr.position_title
                )
              )
              FROM employees dr
              WHERE dr.manager_id = e.id AND dr.deleted_at IS NULL
            ),
            '[]'::json
          ) as direct_reports
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id AND d.deleted_at IS NULL
        LEFT JOIN employees m ON e.manager_id = m.id AND m.deleted_at IS NULL
        LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.deleted_at IS NULL
        LEFT JOIN skills s ON es.skill_id = s.id AND s.deleted_at IS NULL
        WHERE e.id = $1 AND e.deleted_at IS NULL
        GROUP BY e.id, d.id, m.id
      `;
      
      const rows = await this.db.query<EmployeeDetails>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding employee details:', error);
      throw error;
    }
  }

  async findByEmploymentType(employmentType: EmploymentType, options: QueryOptions = {}): Promise<Employee[]> {
    return await this.findWhere({ employment_type: employmentType }, options);
  }

  async findBySalaryRange(minSalary: number, maxSalary: number, options: QueryOptions = {}): Promise<Employee[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const salaryCondition = `salary BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(minSalary, maxSalary);
      
      if (whereClause) {
        whereClause += ` AND ${salaryCondition}`;
      } else {
        whereClause = ` WHERE ${salaryCondition}`;
      }
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }
      
      return await this.db.query<Employee>(query, params);
    } catch (error) {
      this.logger.error('Error finding employees by salary range:', error);
      throw error;
    }
  }

  async findByHireDateRange(startDate: Date, endDate: Date, options: QueryOptions = {}): Promise<Employee[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const dateCondition = `hire_date BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
      
      if (whereClause) {
        whereClause += ` AND ${dateCondition}`;
      } else {
        whereClause = ` WHERE ${dateCondition}`;
      }
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY hire_date DESC';
      }
      
      return await this.db.query<Employee>(query, params);
    } catch (error) {
      this.logger.error('Error finding employees by hire date range:', error);
      throw error;
    }
  }

  async terminate(id: string, terminationDate: Date, userId?: string): Promise<Employee | null> {
    return await this.update(id, { 
      termination_date: terminationDate,
      is_active: false 
    }, userId);
  }

  async rehire(id: string, userId?: string): Promise<Employee | null> {
    return await this.update(id, {
      termination_date: undefined,
      is_active: true
    }, userId);
  }

  async updateCapacity(id: string, weeklyCapacityHours: number, userId?: string): Promise<Employee | null> {
    return await this.update(id, { weekly_capacity_hours: weeklyCapacityHours }, userId);
  }

  async search(searchTerm: string, options: QueryOptions = {}): Promise<Employee[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const searchCondition = `(
        first_name ILIKE $${params.length + 1} OR 
        last_name ILIKE $${params.length + 1} OR 
        email ILIKE $${params.length + 1} OR 
        employee_number ILIKE $${params.length + 1} OR
        position_title ILIKE $${params.length + 1}
      )`;
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
        query += ' ORDER BY last_name, first_name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      return await this.db.query<Employee>(query, params);
    } catch (error) {
      this.logger.error('Error searching employees:', error);
      throw error;
    }
  }

  async getEmployeeStats(): Promise<{
    total_employees: number;
    active_employees: number;
    by_employment_type: Record<EmploymentType, number>;
    by_department: Array<{ department_name: string; count: number }>;
    average_tenure_days: number;
  }> {
    try {
      const totalQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
          AVG(EXTRACT(DAYS FROM (COALESCE(termination_date, CURRENT_DATE) - hire_date))) as average_tenure_days
        FROM employees
        WHERE deleted_at IS NULL
      `;
      
      const typeQuery = `
        SELECT 
          employment_type,
          COUNT(*) as count
        FROM employees
        WHERE deleted_at IS NULL AND is_active = true
        GROUP BY employment_type
      `;
      
      const departmentQuery = `
        SELECT 
          COALESCE(d.name, 'Unassigned') as department_name,
          COUNT(*) as count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id AND d.deleted_at IS NULL
        WHERE e.deleted_at IS NULL AND e.is_active = true
        GROUP BY d.name
        ORDER BY count DESC
      `;
      
      const [totalRows, typeRows, departmentRows] = await Promise.all([
        this.db.query<{ total_employees: string; active_employees: string; average_tenure_days: string }>(totalQuery),
        this.db.query<{ employment_type: EmploymentType; count: string }>(typeQuery),
        this.db.query<{ department_name: string; count: string }>(departmentQuery)
      ]);
      
      const byEmploymentType = typeRows.reduce((acc, row) => {
        acc[row.employment_type] = parseInt(row.count, 10);
        return acc;
      }, {} as Record<EmploymentType, number>);
      
      const byDepartment = departmentRows.map(row => ({
        department_name: row.department_name,
        count: parseInt(row.count, 10)
      }));
      
      return {
        total_employees: parseInt(totalRows[0].total_employees, 10),
        active_employees: parseInt(totalRows[0].active_employees, 10),
        by_employment_type: byEmploymentType,
        by_department: byDepartment,
        average_tenure_days: Math.round(parseFloat(totalRows[0].average_tenure_days || '0'))
      };
    } catch (error) {
      this.logger.error('Error getting employee stats:', error);
      throw error;
    }
  }

  async generateEmployeeNumber(): Promise<string> {
    try {
      const query = `
        SELECT employee_number
        FROM employees
        WHERE employee_number ~ '^EMP[0-9]{6}$'
        ORDER BY employee_number DESC
        LIMIT 1
      `;
      
      const rows = await this.db.query<{ employee_number: string }>(query);
      
      if (rows.length === 0) {
        return 'EMP000001';
      }
      
      const lastNumber = parseInt(rows[0].employee_number.substring(3), 10);
      const nextNumber = lastNumber + 1;
      return `EMP${nextNumber.toString().padStart(6, '0')}`;
    } catch (error) {
      this.logger.error('Error generating employee number:', error);
      throw error;
    }
  }

  // Helper methods
  async activate(id: string, userId?: string): Promise<Employee | null> {
    return await this.update(id, { is_active: true }, userId);
  }

  async deactivate(id: string, userId?: string): Promise<Employee | null> {
    return await this.update(id, { is_active: false }, userId);
  }
}

export const employeeModel = new EmployeeModel();