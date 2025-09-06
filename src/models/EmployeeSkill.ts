import { Pool } from 'pg';
import { 
  EmployeeSkill, 
  CreateEmployeeSkillInput, 
  UpdateEmployeeSkillInput,
  ProficiencyLevel,
  Skill,
  DatabaseError
} from '../types';

export class EmployeeSkillModel {
  private static pool: Pool;

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  static async create(input: CreateEmployeeSkillInput): Promise<EmployeeSkill> {
    try {
      const query = `
        INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience, last_assessed, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        input.employeeId,
        input.skillId,
        input.proficiencyLevel.toString(),
        input.yearsOfExperience,
        input.lastAssessed || null,
        true
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError('Employee already has this skill assigned');
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new DatabaseError('Invalid employee ID or skill ID');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<EmployeeSkill | null> {
    const query = `
      SELECT * FROM employee_skills 
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByEmployee(employeeId: string): Promise<Array<EmployeeSkill & { skill: Skill }>> {
    const query = `
      SELECT 
        es.*,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'category', s.category,
          'isActive', s.is_active,
          'createdAt', s.created_at,
          'updatedAt', s.updated_at
        ) AS skill
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = $1 AND es.is_active = true AND s.is_active = true
      ORDER BY s.category, s.name
    `;

    const result = await this.pool.query(query, [employeeId]);
    return result.rows.map(row => ({
      ...this.mapRow(row),
      skill: row.skill
    }));
  }

  static async findBySkill(skillId: string): Promise<Array<EmployeeSkill & { employee: { id: string; firstName: string; lastName: string; email: string; position: string } }>> {
    const query = `
      SELECT 
        es.*,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name,
          'email', e.email,
          'position', e.position
        ) AS employee
      FROM employee_skills es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = $1 AND es.is_active = true AND e.is_active = true
      ORDER BY es.proficiency_level::integer DESC, e.last_name, e.first_name
    `;

    const result = await this.pool.query(query, [skillId]);
    return result.rows.map(row => ({
      ...this.mapRow(row),
      employee: row.employee
    }));
  }

  static async findByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null> {
    const query = `
      SELECT * FROM employee_skills 
      WHERE employee_id = $1 AND skill_id = $2 AND is_active = true
    `;

    const result = await this.pool.query(query, [employeeId, skillId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByProficiencyLevel(
    proficiencyLevel: ProficiencyLevel,
    skillIds?: string[]
  ): Promise<Array<EmployeeSkill & { skill: Skill; employee: { id: string; firstName: string; lastName: string } }>> {
    let query = `
      SELECT 
        es.*,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'category', s.category,
          'isActive', s.is_active
        ) AS skill,
        json_build_object(
          'id', e.id,
          'firstName', e.first_name,
          'lastName', e.last_name
        ) AS employee
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      JOIN employees e ON es.employee_id = e.id
      WHERE es.proficiency_level::integer >= $1 
      AND es.is_active = true 
      AND s.is_active = true 
      AND e.is_active = true
    `;

    const values: any[] = [proficiencyLevel];

    if (skillIds && skillIds.length > 0) {
      values.push(skillIds);
      query += ` AND es.skill_id = ANY($${values.length})`;
    }

    query += ' ORDER BY es.proficiency_level::integer DESC, s.name, e.last_name';

    const result = await this.pool.query(query, values);
    return result.rows.map(row => ({
      ...this.mapRow(row),
      skill: row.skill,
      employee: row.employee
    }));
  }

  static async update(id: string, updates: UpdateEmployeeSkillInput): Promise<EmployeeSkill> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.proficiencyLevel !== undefined) {
      values.push(updates.proficiencyLevel.toString());
      updateFields.push(`proficiency_level = $${values.length}`);
    }

    if (updates.yearsOfExperience !== undefined) {
      values.push(updates.yearsOfExperience);
      updateFields.push(`years_of_experience = $${values.length}`);
    }

    if (updates.lastAssessed !== undefined) {
      values.push(updates.lastAssessed);
      updateFields.push(`last_assessed = $${values.length}`);
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
      UPDATE employee_skills 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Employee skill mapping not found or already deleted');
    }

    return this.mapRow(result.rows[0]);
  }

  static async delete(id: string): Promise<EmployeeSkill> {
    const query = `
      UPDATE employee_skills 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Employee skill mapping not found or already deleted');
    }

    return this.mapRow(result.rows[0]);
  }

  static async deleteByEmployeeAndSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null> {
    const query = `
      UPDATE employee_skills 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $1 AND skill_id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [employeeId, skillId]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async bulkUpdate(
    employeeId: string,
    skillUpdates: Array<{
      skillId: string;
      proficiencyLevel: ProficiencyLevel;
      yearsOfExperience: number;
      lastAssessed?: Date;
    }>
  ): Promise<EmployeeSkill[]> {
    if (skillUpdates.length === 0) {
      return [];
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const results: EmployeeSkill[] = [];

      for (const update of skillUpdates) {
        // Check if employee skill mapping exists
        const existingQuery = `
          SELECT id FROM employee_skills 
          WHERE employee_id = $1 AND skill_id = $2 AND is_active = true
        `;
        const existing = await client.query(existingQuery, [employeeId, update.skillId]);

        if (existing.rows.length > 0) {
          // Update existing mapping
          const updateQuery = `
            UPDATE employee_skills 
            SET proficiency_level = $1, years_of_experience = $2, last_assessed = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
          `;
          const result = await client.query(updateQuery, [
            update.proficiencyLevel.toString(),
            update.yearsOfExperience,
            update.lastAssessed || null,
            existing.rows[0].id
          ]);
          results.push(this.mapRow(result.rows[0]));
        } else {
          // Create new mapping
          const createQuery = `
            INSERT INTO employee_skills (employee_id, skill_id, proficiency_level, years_of_experience, last_assessed, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          const result = await client.query(createQuery, [
            employeeId,
            update.skillId,
            update.proficiencyLevel.toString(),
            update.yearsOfExperience,
            update.lastAssessed || null,
            true
          ]);
          results.push(this.mapRow(result.rows[0]));
        }
      }

      await client.query('COMMIT');
      return results;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSkillDistribution(skillId?: string): Promise<Array<{
    proficiencyLevel: ProficiencyLevel;
    count: number;
    averageExperience: number;
  }>> {
    let query = `
      SELECT 
        proficiency_level::integer as proficiency_level,
        COUNT(*) as count,
        AVG(years_of_experience) as average_experience
      FROM employee_skills es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.is_active = true AND e.is_active = true
    `;

    const values: any[] = [];

    if (skillId) {
      values.push(skillId);
      query += ` AND es.skill_id = $${values.length}`;
    }

    query += `
      GROUP BY proficiency_level
      ORDER BY proficiency_level
    `;

    const result = await this.pool.query(query, values);
    return result.rows.map(row => ({
      proficiencyLevel: row.proficiency_level as ProficiencyLevel,
      count: parseInt(row.count),
      averageExperience: parseFloat(row.average_experience) || 0
    }));
  }

  static async getTopSkillsForEmployee(employeeId: string, limit: number = 5): Promise<Array<{
    skill: Skill;
    proficiencyLevel: ProficiencyLevel;
    yearsOfExperience: number;
  }>> {
    const query = `
      SELECT 
        es.proficiency_level::integer as proficiency_level,
        es.years_of_experience,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'category', s.category,
          'isActive', s.is_active
        ) AS skill
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = $1 AND es.is_active = true AND s.is_active = true
      ORDER BY es.proficiency_level::integer DESC, es.years_of_experience DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [employeeId, limit]);
    return result.rows.map(row => ({
      skill: row.skill,
      proficiencyLevel: row.proficiency_level as ProficiencyLevel,
      yearsOfExperience: row.years_of_experience
    }));
  }

  private static mapRow(row: any): EmployeeSkill {
    return {
      id: row.id,
      employeeId: row.employee_id,
      skillId: row.skill_id,
      proficiencyLevel: parseInt(row.proficiency_level) as ProficiencyLevel,
      yearsOfExperience: row.years_of_experience,
      lastAssessed: row.last_assessed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}