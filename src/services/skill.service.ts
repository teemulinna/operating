import { DatabaseService } from '../database/database.service';
import { Skill, PaginatedResponse } from '../types/employee.types';

export class SkillService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async getSkills(search?: string, limit?: number): Promise<string[]> {
    let query = `
      SELECT DISTINCT skill
      FROM employees e, unnest(e.skills) as skill
      WHERE e.is_active = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND skill ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY skill`;

    if (limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => row.skill);
  }

  async getPopularSkills(limit: number = 20): Promise<Skill[]> {
    const query = `
      SELECT skill, COUNT(*) as count
      FROM employees e, unnest(e.skills) as skill
      WHERE e.is_active = true
      GROUP BY skill
      ORDER BY count DESC, skill
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows.map((row: any) => ({
      name: row.skill,
      count: parseInt(row.count)
    }));
  }

  async getEmployeesBySkill(skill: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM employees e
      WHERE e.is_active = true AND $1 = ANY(e.skills)
    `;

    const countResult = await this.db.query(countQuery, [skill]);
    const totalItems = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalItems / limit);

    // Get employees
    const dataQuery = `
      SELECT 
        e.id,
        e.first_name as "firstName",
        e.last_name as "lastName",
        e.email,
        e.position,
        e.department_id as "departmentId",
        d.name as "departmentName",
        e.salary,
        e.hire_date as "hireDate",
        e.skills
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.is_active = true AND $1 = ANY(e.skills)
      ORDER BY e.last_name, e.first_name
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(dataQuery, [skill, limit, offset]);

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

  async getSkillRecommendations(employeeId: number, limit: number = 5): Promise<Skill[]> {
    // Get skills of employees in the same department and position
    const query = `
      WITH employee_context AS (
        SELECT department_id, position
        FROM employees
        WHERE id = $1
      ),
      peer_skills AS (
        SELECT skill, COUNT(*) as skill_count
        FROM employees e
        JOIN employee_context ec ON e.department_id = ec.department_id
        CROSS JOIN unnest(e.skills) as skill
        WHERE e.is_active = true
          AND e.id != $1
          AND (e.position = ec.position OR e.department_id = ec.department_id)
          AND skill NOT IN (
            SELECT unnest(skills)
            FROM employees
            WHERE id = $1
          )
        GROUP BY skill
        ORDER BY skill_count DESC
        LIMIT $2
      )
      SELECT skill as name, skill_count as count
      FROM peer_skills
    `;

    const result = await this.db.query(query, [employeeId, limit]);
    return result.rows.map((row: any) => ({
      name: row.name,
      count: parseInt(row.count)
    }));
  }

  async getSkillAnalytics() {
    const queries = [
      // Top skills
      `SELECT skill as name, COUNT(*) as count
       FROM employees e, unnest(e.skills) as skill
       WHERE e.is_active = true
       GROUP BY skill
       ORDER BY count DESC
       LIMIT 20`,
      
      // Skills by department
      `SELECT 
         d.name as department,
         skill,
         COUNT(*) as count
       FROM departments d
       JOIN employees e ON d.id = e.department_id
       CROSS JOIN unnest(e.skills) as skill
       WHERE e.is_active = true
       GROUP BY d.id, d.name, skill
       ORDER BY d.name, count DESC`,
      
      // Skill trends (new skills added in last 6 months)
      `SELECT 
         skill,
         COUNT(*) as new_employees_with_skill
       FROM employees e
       CROSS JOIN unnest(e.skills) as skill
       WHERE e.hire_date >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY skill
       ORDER BY new_employees_with_skill DESC
       LIMIT 15`,
      
      // Skill diversity by department
      `SELECT 
         d.name as department,
         COUNT(DISTINCT skill) as unique_skills
       FROM departments d
       JOIN employees e ON d.id = e.department_id
       CROSS JOIN unnest(e.skills) as skill
       WHERE e.is_active = true
       GROUP BY d.id, d.name
       ORDER BY unique_skills DESC`
    ];

    const [topSkillsResult, skillsByDeptResult, skillTrendsResult, skillDiversityResult] = await Promise.all(
      queries.map(query => this.db.query(query))
    );

    return {
      topSkills: topSkillsResult!.rows,
      skillsByDepartment: skillsByDeptResult!.rows,
      emergingSkills: skillTrendsResult!.rows,
      skillDiversityByDepartment: skillDiversityResult!.rows
    };
  }
}