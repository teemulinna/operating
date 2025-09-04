import { BaseModel, BaseEntity, QueryOptions, WhereClause } from './BaseModel';

export interface Skill extends BaseEntity {
  name: string;
  description?: string;
  category: string;
  is_technical: boolean;
  proficiency_levels: string[];
  is_active: boolean;
}

export interface SkillWithEmployeeCount extends Skill {
  employee_count: number;
}

export interface CreateSkillData {
  name: string;
  description?: string;
  category: string;
  is_technical?: boolean;
  proficiency_levels?: string[];
  is_active?: boolean;
}

export interface UpdateSkillData {
  name?: string;
  description?: string;
  category?: string;
  is_technical?: boolean;
  proficiency_levels?: string[];
  is_active?: boolean;
}

export class SkillModel extends BaseModel<Skill> {
  constructor() {
    super('skills');
  }

  async findByName(name: string, options: QueryOptions = {}): Promise<Skill | null> {
    return await this.findOne({ name }, options);
  }

  async findByCategory(category: string, options: QueryOptions = {}): Promise<Skill[]> {
    return await this.findWhere({ category }, options);
  }

  async findTechnicalSkills(options: QueryOptions = {}): Promise<Skill[]> {
    return await this.findWhere({ is_technical: true }, options);
  }

  async findSoftSkills(options: QueryOptions = {}): Promise<Skill[]> {
    return await this.findWhere({ is_technical: false }, options);
  }

  async findActiveSkills(options: QueryOptions = {}): Promise<Skill[]> {
    return await this.findWhere({ is_active: true }, options);
  }

  async findWithEmployeeCount(id: string): Promise<SkillWithEmployeeCount | null> {
    try {
      const query = `
        SELECT 
          s.*,
          COALESCE(emp_count.count, 0)::integer as employee_count
        FROM skills s
        LEFT JOIN (
          SELECT skill_id, COUNT(DISTINCT employee_id) as count
          FROM employee_skills es
          JOIN employees e ON es.employee_id = e.id
          WHERE es.deleted_at IS NULL AND e.deleted_at IS NULL AND e.is_active = true
          GROUP BY skill_id
        ) emp_count ON s.id = emp_count.skill_id
        WHERE s.id = $1 AND s.deleted_at IS NULL
      `;
      
      const rows = await this.db.query<SkillWithEmployeeCount>(query, [id]);
      return rows[0] || null;
    } catch (error) {
      this.logger.error('Error finding skill with employee count:', error);
      throw error;
    }
  }

  async findAllWithEmployeeCount(options: QueryOptions = {}): Promise<SkillWithEmployeeCount[]> {
    try {
      let query = `
        SELECT 
          s.*,
          COALESCE(emp_count.count, 0)::integer as employee_count
        FROM skills s
        LEFT JOIN (
          SELECT skill_id, COUNT(DISTINCT employee_id) as count
          FROM employee_skills es
          JOIN employees e ON es.employee_id = e.id
          WHERE es.deleted_at IS NULL AND e.deleted_at IS NULL AND e.is_active = true
          GROUP BY skill_id
        ) emp_count ON s.id = emp_count.skill_id
      `;
      
      if (!options.includeDeleted) {
        query += ' WHERE s.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY s.${options.orderBy}`;
      } else {
        query += ' ORDER BY s.category, s.name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query += ` OFFSET ${options.offset}`;
      }
      
      return await this.db.query<SkillWithEmployeeCount>(query);
    } catch (error) {
      this.logger.error('Error finding skills with employee count:', error);
      throw error;
    }
  }

  async findCategories(options: { includeDeleted?: boolean } = {}): Promise<Array<{ category: string; count: number }>> {
    try {
      let query = `
        SELECT 
          category,
          COUNT(*) as count
        FROM skills
      `;
      
      if (!options.includeDeleted) {
        query += ' WHERE deleted_at IS NULL AND is_active = true';
      }
      
      query += `
        GROUP BY category
        ORDER BY category
      `;
      
      const rows = await this.db.query<{ category: string; count: string }>(query);
      return rows.map(row => ({
        category: row.category,
        count: parseInt(row.count, 10)
      }));
    } catch (error) {
      this.logger.error('Error finding skill categories:', error);
      throw error;
    }
  }

  async findMostInDemandSkills(limit: number = 10): Promise<Array<{
    skill_id: string;
    skill_name: string;
    category: string;
    employee_count: number;
    avg_proficiency_score: number;
  }>> {
    try {
      const query = `
        SELECT 
          s.id as skill_id,
          s.name as skill_name,
          s.category,
          COUNT(DISTINCT es.employee_id) as employee_count,
          AVG(
            CASE es.proficiency_level
              WHEN 'Beginner' THEN 1
              WHEN 'Intermediate' THEN 2
              WHEN 'Advanced' THEN 3
              WHEN 'Expert' THEN 4
              ELSE 1
            END
          ) as avg_proficiency_score
        FROM skills s
        JOIN employee_skills es ON s.id = es.skill_id
        JOIN employees e ON es.employee_id = e.id
        WHERE s.deleted_at IS NULL 
          AND es.deleted_at IS NULL 
          AND e.deleted_at IS NULL 
          AND s.is_active = true
          AND e.is_active = true
        GROUP BY s.id, s.name, s.category
        ORDER BY employee_count DESC, avg_proficiency_score DESC
        LIMIT $1
      `;
      
      const rows = await this.db.query<{
        skill_id: string;
        skill_name: string;
        category: string;
        employee_count: string;
        avg_proficiency_score: string;
      }>(query, [limit]);
      
      return rows.map(row => ({
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        category: row.category,
        employee_count: parseInt(row.employee_count, 10),
        avg_proficiency_score: Math.round(parseFloat(row.avg_proficiency_score) * 100) / 100
      }));
    } catch (error) {
      this.logger.error('Error finding most in-demand skills:', error);
      throw error;
    }
  }

  async findSkillGaps(departmentId?: string): Promise<Array<{
    skill_id: string;
    skill_name: string;
    category: string;
    total_employees: number;
    employees_with_skill: number;
    gap_percentage: number;
  }>> {
    try {
      let departmentFilter = '';
      const params: any[] = [];
      
      if (departmentId) {
        departmentFilter = 'WHERE e.department_id = $1';
        params.push(departmentId);
      }
      
      const query = `
        WITH skill_coverage AS (
          SELECT 
            s.id as skill_id,
            s.name as skill_name,
            s.category,
            COUNT(DISTINCT e.id) as total_employees,
            COUNT(DISTINCT es.employee_id) as employees_with_skill
          FROM skills s
          CROSS JOIN employees e
          LEFT JOIN employee_skills es ON s.id = es.skill_id 
            AND e.id = es.employee_id 
            AND es.deleted_at IS NULL
          ${departmentFilter}
          WHERE s.deleted_at IS NULL 
            AND s.is_active = true
            AND e.deleted_at IS NULL 
            AND e.is_active = true
          GROUP BY s.id, s.name, s.category
        )
        SELECT 
          skill_id,
          skill_name,
          category,
          total_employees,
          employees_with_skill,
          ROUND(
            ((total_employees - employees_with_skill) * 100.0 / total_employees), 2
          ) as gap_percentage
        FROM skill_coverage
        WHERE total_employees > 0
        ORDER BY gap_percentage DESC, skill_name
      `;
      
      const rows = await this.db.query<{
        skill_id: string;
        skill_name: string;
        category: string;
        total_employees: string;
        employees_with_skill: string;
        gap_percentage: string;
      }>(query, params);
      
      return rows.map(row => ({
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        category: row.category,
        total_employees: parseInt(row.total_employees, 10),
        employees_with_skill: parseInt(row.employees_with_skill, 10),
        gap_percentage: parseFloat(row.gap_percentage)
      }));
    } catch (error) {
      this.logger.error('Error finding skill gaps:', error);
      throw error;
    }
  }

  async search(searchTerm: string, options: QueryOptions = {}): Promise<Skill[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const searchCondition = `(name ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR category ILIKE $${params.length + 1})`;
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
        query += ' ORDER BY category, name';
      }
      
      if (options.limit) {
        query += ` LIMIT ${options.limit}`;
      }
      
      return await this.db.query<Skill>(query, params);
    } catch (error) {
      this.logger.error('Error searching skills:', error);
      throw error;
    }
  }

  async getSkillStats(): Promise<{
    total_skills: number;
    active_skills: number;
    technical_skills: number;
    soft_skills: number;
    categories_count: number;
    most_popular_category: string;
  }> {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_skills,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_skills,
          COUNT(CASE WHEN is_technical = true THEN 1 END) as technical_skills,
          COUNT(CASE WHEN is_technical = false THEN 1 END) as soft_skills,
          COUNT(DISTINCT category) as categories_count
        FROM skills
        WHERE deleted_at IS NULL
      `;
      
      const categoryQuery = `
        SELECT category, COUNT(*) as count
        FROM skills
        WHERE deleted_at IS NULL AND is_active = true
        GROUP BY category
        ORDER BY count DESC
        LIMIT 1
      `;
      
      const [statsRows, categoryRows] = await Promise.all([
        this.db.query<{
          total_skills: string;
          active_skills: string;
          technical_skills: string;
          soft_skills: string;
          categories_count: string;
        }>(statsQuery),
        this.db.query<{ category: string; count: string }>(categoryQuery)
      ]);
      
      const stats = statsRows[0];
      return {
        total_skills: parseInt(stats.total_skills, 10),
        active_skills: parseInt(stats.active_skills, 10),
        technical_skills: parseInt(stats.technical_skills, 10),
        soft_skills: parseInt(stats.soft_skills, 10),
        categories_count: parseInt(stats.categories_count, 10),
        most_popular_category: categoryRows[0]?.category || 'N/A'
      };
    } catch (error) {
      this.logger.error('Error getting skill stats:', error);
      throw error;
    }
  }

  // Helper methods
  async activate(id: string, userId?: string): Promise<Skill | null> {
    return await this.update(id, { is_active: true }, userId);
  }

  async deactivate(id: string, userId?: string): Promise<Skill | null> {
    return await this.update(id, { is_active: false }, userId);
  }

  async updateProficiencyLevels(id: string, proficiencyLevels: string[], userId?: string): Promise<Skill | null> {
    return await this.update(id, { proficiency_levels: proficiencyLevels }, userId);
  }
}

export const skillModel = new SkillModel();