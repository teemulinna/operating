import { BaseModel, BaseEntity, QueryOptions, WhereClause } from './BaseModel';
import { Employee } from './Employee';
import { Skill } from './Skill';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface EmployeeSkill extends BaseEntity {
  employee_id: string;
  skill_id: string;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  is_certified: boolean;
  certification_date?: Date;
  certification_body?: string;
  last_used_date?: Date;
  notes?: string;
}

export interface EmployeeSkillWithDetails extends EmployeeSkill {
  employee?: Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number' | 'position_title'>;
  skill?: Pick<Skill, 'id' | 'name' | 'category' | 'is_technical'>;
}

export interface CreateEmployeeSkillData {
  employee_id: string;
  skill_id: string;
  proficiency_level?: ProficiencyLevel;
  years_experience?: number;
  is_certified?: boolean;
  certification_date?: Date;
  certification_body?: string;
  last_used_date?: Date;
  notes?: string;
}

export interface UpdateEmployeeSkillData {
  proficiency_level?: ProficiencyLevel;
  years_experience?: number;
  is_certified?: boolean;
  certification_date?: Date;
  certification_body?: string;
  last_used_date?: Date;
  notes?: string;
}

export interface SkillProficiencyDistribution {
  skill_id: string;
  skill_name: string;
  category: string;
  beginner_count: number;
  intermediate_count: number;
  advanced_count: number;
  expert_count: number;
  total_count: number;
  avg_years_experience: number;
  certification_rate: number;
}

export class EmployeeSkillModel extends BaseModel<EmployeeSkill> {
  constructor() {
    super('employee_skills');
  }

  async findByEmployee(employeeId: string, options: QueryOptions = {}): Promise<EmployeeSkill[]> {
    return await this.findWhere({ employee_id: employeeId }, options);
  }

  async findBySkill(skillId: string, options: QueryOptions = {}): Promise<EmployeeSkill[]> {
    return await this.findWhere({ skill_id: skillId }, options);
  }

  async findEmployeeSkill(employeeId: string, skillId: string): Promise<EmployeeSkill | null> {
    return await this.findOne({ employee_id: employeeId, skill_id: skillId });
  }

  async findByEmployeeWithDetails(employeeId: string, options: QueryOptions = {}): Promise<EmployeeSkillWithDetails[]> {
    try {
      let query = `
        SELECT 
          es.*,
          json_build_object(
            'id', s.id,
            'name', s.name,
            'category', s.category,
            'is_technical', s.is_technical
          ) as skill
        FROM employee_skills es
        JOIN skills s ON es.skill_id = s.id AND s.deleted_at IS NULL
        WHERE es.employee_id = $1
      `;
      
      if (!options.includeDeleted) {
        query += ' AND es.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY s.category, s.name';
      }
      
      return await this.db.query<EmployeeSkillWithDetails>(query, [employeeId]);
    } catch (error) {
      this.logger.error('Error finding employee skills with details:', error);
      throw error;
    }
  }

  async findBySkillWithDetails(skillId: string, options: QueryOptions = {}): Promise<EmployeeSkillWithDetails[]> {
    try {
      let query = `
        SELECT 
          es.*,
          json_build_object(
            'id', e.id,
            'first_name', e.first_name,
            'last_name', e.last_name,
            'employee_number', e.employee_number,
            'position_title', e.position_title
          ) as employee
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id AND e.deleted_at IS NULL AND e.is_active = true
        WHERE es.skill_id = $1
      `;
      
      if (!options.includeDeleted) {
        query += ' AND es.deleted_at IS NULL';
      }
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      } else {
        query += ' ORDER BY es.proficiency_level DESC, es.years_experience DESC';
      }
      
      return await this.db.query<EmployeeSkillWithDetails>(query, [skillId]);
    } catch (error) {
      this.logger.error('Error finding skill employees with details:', error);
      throw error;
    }
  }

  async findByProficiencyLevel(proficiencyLevel: ProficiencyLevel, options: QueryOptions = {}): Promise<EmployeeSkill[]> {
    return await this.findWhere({ proficiency_level: proficiencyLevel }, options);
  }

  async findCertifiedSkills(options: QueryOptions = {}): Promise<EmployeeSkill[]> {
    return await this.findWhere({ is_certified: true }, options);
  }

  async findByExperienceRange(minYears: number, maxYears: number, options: QueryOptions = {}): Promise<EmployeeSkill[]> {
    try {
      const { query: baseWhereClause, params: baseParams } = this.buildWhereClause({}, options);
      
      let whereClause = baseWhereClause;
      const params = [...baseParams];
      
      const experienceCondition = `years_experience BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(minYears, maxYears);
      
      if (whereClause) {
        whereClause += ` AND ${experienceCondition}`;
      } else {
        whereClause = ` WHERE ${experienceCondition}`;
      }
      
      let query = `SELECT * FROM ${this.tableName}${whereClause}`;
      
      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }
      
      return await this.db.query<EmployeeSkill>(query, params);
    } catch (error) {
      this.logger.error('Error finding employee skills by experience range:', error);
      throw error;
    }
  }

  async getSkillProficiencyDistribution(skillId?: string): Promise<SkillProficiencyDistribution[]> {
    try {
      let query = `
        SELECT 
          s.id as skill_id,
          s.name as skill_name,
          s.category,
          COUNT(CASE WHEN es.proficiency_level = 'Beginner' THEN 1 END) as beginner_count,
          COUNT(CASE WHEN es.proficiency_level = 'Intermediate' THEN 1 END) as intermediate_count,
          COUNT(CASE WHEN es.proficiency_level = 'Advanced' THEN 1 END) as advanced_count,
          COUNT(CASE WHEN es.proficiency_level = 'Expert' THEN 1 END) as expert_count,
          COUNT(*) as total_count,
          AVG(es.years_experience) as avg_years_experience,
          ROUND(
            (COUNT(CASE WHEN es.is_certified = true THEN 1 END) * 100.0 / COUNT(*)), 2
          ) as certification_rate
        FROM skills s
        LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.deleted_at IS NULL
        LEFT JOIN employees e ON es.employee_id = e.id AND e.deleted_at IS NULL AND e.is_active = true
        WHERE s.deleted_at IS NULL AND s.is_active = true
      `;
      
      const params: any[] = [];
      if (skillId) {
        query += ` AND s.id = $1`;
        params.push(skillId);
      }
      
      query += `
        GROUP BY s.id, s.name, s.category
        HAVING COUNT(es.id) > 0
        ORDER BY s.category, s.name
      `;
      
      const rows = await this.db.query<{
        skill_id: string;
        skill_name: string;
        category: string;
        beginner_count: string;
        intermediate_count: string;
        advanced_count: string;
        expert_count: string;
        total_count: string;
        avg_years_experience: string;
        certification_rate: string;
      }>(query, params);
      
      return rows.map(row => ({
        skill_id: row.skill_id,
        skill_name: row.skill_name,
        category: row.category,
        beginner_count: parseInt(row.beginner_count, 10),
        intermediate_count: parseInt(row.intermediate_count, 10),
        advanced_count: parseInt(row.advanced_count, 10),
        expert_count: parseInt(row.expert_count, 10),
        total_count: parseInt(row.total_count, 10),
        avg_years_experience: Math.round(parseFloat(row.avg_years_experience || '0') * 10) / 10,
        certification_rate: parseFloat(row.certification_rate || '0')
      }));
    } catch (error) {
      this.logger.error('Error getting skill proficiency distribution:', error);
      throw error;
    }
  }

  async findEmployeesWithSkillLevel(skillId: string, minProficiencyLevel: ProficiencyLevel): Promise<EmployeeSkillWithDetails[]> {
    const proficiencyOrder = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    const minLevel = proficiencyOrder.indexOf(minProficiencyLevel);
    const allowedLevels = proficiencyOrder.slice(minLevel);
    
    return await this.findBySkillWithDetails(skillId, {
      orderBy: `CASE es.proficiency_level 
        WHEN 'Expert' THEN 4
        WHEN 'Advanced' THEN 3
        WHEN 'Intermediate' THEN 2
        WHEN 'Beginner' THEN 1
        END DESC, es.years_experience DESC`
    });
  }

  async addOrUpdateEmployeeSkill(data: CreateEmployeeSkillData, userId?: string): Promise<EmployeeSkill> {
    try {
      const existing = await this.findEmployeeSkill(data.employee_id, data.skill_id);
      
      if (existing) {
        return await this.update(existing.id, {
          proficiency_level: data.proficiency_level,
          years_experience: data.years_experience,
          is_certified: data.is_certified,
          certification_date: data.certification_date,
          certification_body: data.certification_body,
          last_used_date: data.last_used_date,
          notes: data.notes
        }, userId) as EmployeeSkill;
      } else {
        return await this.create(data, userId);
      }
    } catch (error) {
      this.logger.error('Error adding or updating employee skill:', error);
      throw error;
    }
  }

  async removeEmployeeSkill(employeeId: string, skillId: string, userId?: string, hard: boolean = false): Promise<boolean> {
    try {
      const employeeSkill = await this.findEmployeeSkill(employeeId, skillId);
      if (!employeeSkill) {
        return false;
      }
      
      return await this.delete(employeeSkill.id, userId, hard);
    } catch (error) {
      this.logger.error('Error removing employee skill:', error);
      throw error;
    }
  }

  async updateProficiency(
    employeeId: string,
    skillId: string,
    proficiencyLevel: ProficiencyLevel,
    yearsExperience?: number,
    userId?: string
  ): Promise<EmployeeSkill | null> {
    try {
      const employeeSkill = await this.findEmployeeSkill(employeeId, skillId);
      if (!employeeSkill) {
        throw new Error('Employee skill not found');
      }
      
      const updateData: UpdateEmployeeSkillData = { proficiency_level: proficiencyLevel };
      if (yearsExperience !== undefined) {
        updateData.years_experience = yearsExperience;
      }
      
      return await this.update(employeeSkill.id, updateData, userId);
    } catch (error) {
      this.logger.error('Error updating skill proficiency:', error);
      throw error;
    }
  }

  async addCertification(
    employeeId: string,
    skillId: string,
    certificationBody: string,
    certificationDate: Date,
    userId?: string
  ): Promise<EmployeeSkill | null> {
    try {
      const employeeSkill = await this.findEmployeeSkill(employeeId, skillId);
      if (!employeeSkill) {
        throw new Error('Employee skill not found');
      }
      
      return await this.update(employeeSkill.id, {
        is_certified: true,
        certification_date: certificationDate,
        certification_body: certificationBody
      }, userId);
    } catch (error) {
      this.logger.error('Error adding certification:', error);
      throw error;
    }
  }

  async getEmployeeSkillStats(employeeId?: string): Promise<{
    total_skills: number;
    technical_skills: number;
    soft_skills: number;
    certifications: number;
    proficiency_breakdown: Record<ProficiencyLevel, number>;
    avg_years_experience: number;
  }> {
    try {
      let whereClause = 'WHERE es.deleted_at IS NULL AND e.deleted_at IS NULL AND s.deleted_at IS NULL';
      const params: any[] = [];
      
      if (employeeId) {
        whereClause += ' AND es.employee_id = $1';
        params.push(employeeId);
      }
      
      const query = `
        SELECT 
          COUNT(*) as total_skills,
          COUNT(CASE WHEN s.is_technical = true THEN 1 END) as technical_skills,
          COUNT(CASE WHEN s.is_technical = false THEN 1 END) as soft_skills,
          COUNT(CASE WHEN es.is_certified = true THEN 1 END) as certifications,
          COUNT(CASE WHEN es.proficiency_level = 'Beginner' THEN 1 END) as beginner_count,
          COUNT(CASE WHEN es.proficiency_level = 'Intermediate' THEN 1 END) as intermediate_count,
          COUNT(CASE WHEN es.proficiency_level = 'Advanced' THEN 1 END) as advanced_count,
          COUNT(CASE WHEN es.proficiency_level = 'Expert' THEN 1 END) as expert_count,
          AVG(es.years_experience) as avg_years_experience
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        JOIN skills s ON es.skill_id = s.id
        ${whereClause}
      `;
      
      const rows = await this.db.query<{
        total_skills: string;
        technical_skills: string;
        soft_skills: string;
        certifications: string;
        beginner_count: string;
        intermediate_count: string;
        advanced_count: string;
        expert_count: string;
        avg_years_experience: string;
      }>(query, params);
      
      const result = rows[0];
      return {
        total_skills: parseInt(result.total_skills, 10),
        technical_skills: parseInt(result.technical_skills, 10),
        soft_skills: parseInt(result.soft_skills, 10),
        certifications: parseInt(result.certifications, 10),
        proficiency_breakdown: {
          'Beginner': parseInt(result.beginner_count, 10),
          'Intermediate': parseInt(result.intermediate_count, 10),
          'Advanced': parseInt(result.advanced_count, 10),
          'Expert': parseInt(result.expert_count, 10)
        },
        avg_years_experience: Math.round(parseFloat(result.avg_years_experience || '0') * 10) / 10
      };
    } catch (error) {
      this.logger.error('Error getting employee skill stats:', error);
      throw error;
    }
  }
}

export const employeeSkillModel = new EmployeeSkillModel();