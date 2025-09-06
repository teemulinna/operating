import { Pool } from 'pg';
import { 
  Skill, 
  CreateSkillInput, 
  UpdateSkillInput,
  SkillCategory,
  SkillFilters,
  DatabaseError
} from '../types';

export class SkillModel {
  private static pool: Pool;

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  static async create(input: CreateSkillInput): Promise<Skill> {
    try {
      const query = `
        INSERT INTO skills (name, description, category, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [
        input.name,
        input.description || null,
        input.category,
        true
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Skill with name '${input.name}' already exists`);
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Skill | null> {
    const query = `
      SELECT * FROM skills 
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findAll(filters: SkillFilters = {}): Promise<Skill[]> {
    let query = 'SELECT * FROM skills WHERE 1=1';
    const values: any[] = [];

    if (filters.category !== undefined) {
      values.push(filters.category);
      query += ` AND category = $${values.length}`;
    }

    if (filters.isActive !== undefined) {
      values.push(filters.isActive);
      query += ` AND is_active = $${values.length}`;
    }

    query += ' ORDER BY category, name';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRow(row));
  }

  static async findByCategory(category: SkillCategory): Promise<Skill[]> {
    return this.findAll({ category, isActive: true });
  }

  static async findByName(name: string): Promise<Skill | null> {
    const query = `
      SELECT * FROM skills 
      WHERE LOWER(name) = LOWER($1) AND is_active = true
    `;

    const result = await this.pool.query(query, [name]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async search(searchTerm: string, category?: SkillCategory): Promise<Skill[]> {
    let query = `
      SELECT * FROM skills 
      WHERE is_active = true 
      AND (
        LOWER(name) ILIKE LOWER($1) 
        OR LOWER(description) ILIKE LOWER($1)
      )
    `;
    const values: any[] = [`%${searchTerm}%`];

    if (category) {
      values.push(category);
      query += ` AND category = $${values.length}`;
    }

    query += ' ORDER BY name';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => this.mapRow(row));
  }

  static async update(id: string, updates: UpdateSkillInput): Promise<Skill> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      values.push(updates.name);
      updateFields.push(`name = $${values.length}`);
    }

    if (updates.description !== undefined) {
      values.push(updates.description);
      updateFields.push(`description = $${values.length}`);
    }

    if (updates.category !== undefined) {
      values.push(updates.category);
      updateFields.push(`category = $${values.length}`);
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
      UPDATE skills 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Skill not found or already deleted');
      }

      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Skill with name '${updates.name}' already exists`);
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<Skill> {
    // Check if skill is being used by employees
    const usageCheck = await this.pool.query(
      'SELECT COUNT(*) FROM employee_skills WHERE skill_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new DatabaseError('Cannot delete skill that is assigned to employees');
    }

    const query = `
      UPDATE skills 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Skill not found or already deleted');
    }

    return this.mapRow(result.rows[0]);
  }

  static async getStatistics(): Promise<{
    totalSkills: number;
    skillsByCategory: Record<SkillCategory, number>;
    mostUsedSkills: Array<{ skill: Skill; employeeCount: number }>;
  }> {
    // Get total skills and skills by category
    const categoryQuery = `
      SELECT 
        COUNT(*) as total_skills,
        category,
        COUNT(*) as category_count
      FROM skills 
      WHERE is_active = true
      GROUP BY ROLLUP(category)
      ORDER BY category NULLS FIRST
    `;

    const categoryResult = await this.pool.query(categoryQuery);
    
    const totalSkills = categoryResult.rows[0]?.total_skills || 0;
    const skillsByCategory = {} as Record<SkillCategory, number>;
    
    categoryResult.rows.slice(1).forEach(row => {
      if (row.category) {
        skillsByCategory[row.category as SkillCategory] = parseInt(row.category_count);
      }
    });

    // Get most used skills
    const mostUsedQuery = `
      SELECT 
        s.*,
        COUNT(es.employee_id) as employee_count
      FROM skills s
      LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY employee_count DESC, s.name
      LIMIT 10
    `;

    const mostUsedResult = await this.pool.query(mostUsedQuery);
    const mostUsedSkills = mostUsedResult.rows.map(row => ({
      skill: this.mapRow(row),
      employeeCount: parseInt(row.employee_count)
    }));

    return {
      totalSkills: parseInt(totalSkills),
      skillsByCategory,
      mostUsedSkills
    };
  }

  static async getEmployeeSkillGaps(requiredSkillIds: string[]): Promise<{
    skillId: string;
    skill: Skill;
    employeeCount: number;
    proficiencyDistribution: Record<number, number>;
  }[]> {
    if (requiredSkillIds.length === 0) {
      return [];
    }

    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.category,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(es.employee_id) as employee_count,
        json_object_agg(
          COALESCE(es.proficiency_level::text, '0'), 
          COUNT(es.proficiency_level)
        ) as proficiency_distribution
      FROM skills s
      LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
      WHERE s.id = ANY($1) AND s.is_active = true
      GROUP BY s.id
      ORDER BY employee_count ASC, s.name
    `;

    const result = await this.pool.query(query, [requiredSkillIds]);
    
    return result.rows.map(row => ({
      skillId: row.id,
      skill: this.mapRow(row),
      employeeCount: parseInt(row.employee_count),
      proficiencyDistribution: row.proficiency_distribution || {}
    }));
  }

  private static mapRow(row: any): Skill {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as SkillCategory,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}