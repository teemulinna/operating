import { DatabaseService } from '../database/database.service';
import { PaginatedResponse } from '../types/employee.types';

export interface RoleTemplate {
  id?: number;
  name: string;
  description?: string;
  department?: string;
  level: 'Entry' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Executive';
  standardHourlyRate?: number;
  estimatedSalaryMin?: number;
  estimatedSalaryMax?: number;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: number;
}

export interface RoleTemplateSkill {
  id?: number;
  templateId: number;
  skillId: number;
  minProficiency: number; // 1-5
  isRequired: boolean;
  weight?: number; // For matching algorithms
  skillName?: string;
  skillCategory?: string;
}

export interface PlaceholderResource {
  id?: number;
  projectId: number;
  templateId: number;
  quantity: number;
  startDate?: Date;
  endDate?: Date;
  allocationPercentage: number;
  customHourlyRate?: number;
  isPlaceholder: boolean;
  status: 'planned' | 'recruiting' | 'filled' | 'cancelled';
  notes?: string;
  template?: RoleTemplate;
}

export interface EmployeeTemplateMatch {
  employee: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    position: string;
    department: string;
  };
  matchScore: number; // 0-100
  skillMatches: Array<{
    skillName: string;
    required: boolean;
    hasSkill: boolean;
    currentProficiency?: number;
    requiredProficiency: number;
    gap: number;
  }>;
  strengths: string[];
  gaps: string[];
  overallAssessment: string;
}

export interface TemplateLibrary {
  categories: Array<{
    id: number;
    name: string;
    description: string;
    templateCount: number;
  }>;
  popularTemplates: RoleTemplate[];
  recentTemplates: RoleTemplate[];
  totalTemplates: number;
}

export class RoleTemplatesService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Template CRUD operations
  async createTemplate(templateData: RoleTemplate): Promise<RoleTemplate> {
    const query = `
      INSERT INTO role_templates 
      (name, description, department, level, standard_hourly_rate, estimated_salary_min, 
       estimated_salary_max, responsibilities, requirements, preferred_qualifications, 
       is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      templateData.name,
      templateData.description || null,
      templateData.department || null,
      templateData.level,
      templateData.standardHourlyRate || null,
      templateData.estimatedSalaryMin || null,
      templateData.estimatedSalaryMax || null,
      JSON.stringify(templateData.responsibilities || []),
      JSON.stringify(templateData.requirements || []),
      JSON.stringify(templateData.preferredQualifications || []),
      templateData.isActive ?? true,
      templateData.createdBy || null
    ]);

    return this.mapTemplateRow(result.rows[0]);
  }

  async getTemplates(filters?: {
    department?: string;
    level?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<RoleTemplate>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.department) {
      whereConditions.push(`department = $${paramIndex}`);
      params.push(filters.department);
      paramIndex++;
    }

    if (filters?.level) {
      whereConditions.push(`level = $${paramIndex}`);
      params.push(filters.level);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(filters.isActive);
      paramIndex++;
    }

    if (filters?.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM role_templates ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Get data
    const dataQuery = `
      SELECT * FROM role_templates 
      ${whereClause}
      ORDER BY department, level, name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.db.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows.map(this.mapTemplateRow),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
        hasNext: page < Math.ceil(totalItems / limit),
        hasPrev: page > 1
      }
    };
  }

  async getTemplateById(id: number): Promise<RoleTemplate | null> {
    const query = `
      SELECT rt.*, 
             COALESCE(rts.skills, '[]'::jsonb) as template_skills
      FROM role_templates rt
      LEFT JOIN (
        SELECT 
          template_id,
          jsonb_agg(
            jsonb_build_object(
              'skillId', skill_id,
              'skillName', s.name,
              'skillCategory', s.category,
              'minProficiency', min_proficiency,
              'isRequired', is_required,
              'weight', weight
            )
          ) as skills
        FROM role_template_skills rts
        JOIN skills s ON rts.skill_id = s.id
        GROUP BY template_id
      ) rts ON rt.id = rts.template_id
      WHERE rt.id = $1
    `;

    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const template = this.mapTemplateRow(result.rows[0]);
    template['requiredSkills'] = result.rows[0].template_skills;
    return template;
  }

  async updateTemplate(id: number, updates: Partial<RoleTemplate>): Promise<RoleTemplate> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fieldMappings = {
      name: 'name',
      description: 'description',
      department: 'department',
      level: 'level',
      standardHourlyRate: 'standard_hourly_rate',
      estimatedSalaryMin: 'estimated_salary_min',
      estimatedSalaryMax: 'estimated_salary_max',
      isActive: 'is_active'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && fieldMappings[key as keyof typeof fieldMappings]) {
        const dbField = fieldMappings[key as keyof typeof fieldMappings];
        updateFields.push(`${dbField} = $${paramIndex}`);
        
        if (key === 'responsibilities' || key === 'requirements' || key === 'preferredQualifications') {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `
      UPDATE role_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('Template not found');
    }

    return this.mapTemplateRow(result.rows[0]);
  }

  async cloneTemplate(templateId: number, cloneData: {
    name: string;
    modifications?: Partial<RoleTemplate>;
  }): Promise<RoleTemplate> {
    const originalTemplate = await this.getTemplateById(templateId);
    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    // Create new template with modifications
    const newTemplateData: RoleTemplate = {
      ...originalTemplate,
      ...cloneData.modifications,
      name: cloneData.name,
      id: undefined // Ensure new ID is generated
    };

    return this.createTemplate(newTemplateData);
  }

  // Project Template Application
  async applyTemplateToProject(projectId: number, application: {
    templateId: number;
    quantity: number;
    startDate?: Date;
    endDate?: Date;
    allocation: number;
    customizations?: {
      hourlyRate?: number;
      specificRequirements?: string;
    };
  }): Promise<{ placeholderResources: PlaceholderResource[] }> {
    const placeholderResources: PlaceholderResource[] = [];

    for (let i = 0; i < application.quantity; i++) {
      const query = `
        INSERT INTO project_template_assignments
        (project_id, template_id, quantity, start_date, end_date, allocation_percentage, 
         custom_hourly_rate, is_placeholder, status, notes)
        VALUES ($1, $2, 1, $3, $4, $5, $6, true, 'planned', $7)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        projectId,
        application.templateId,
        application.startDate || null,
        application.endDate || null,
        application.allocation,
        application.customizations?.hourlyRate || null,
        application.customizations?.specificRequirements || null
      ]);

      placeholderResources.push(this.mapPlaceholderResourceRow(result.rows[0]));
    }

    return { placeholderResources };
  }

  // Employee Template Matching
  async findMatchingEmployees(templateId: number, options?: {
    minMatchScore?: number;
    limit?: number;
    includeUnavailable?: boolean;
  }): Promise<{ matches: EmployeeTemplateMatch[] }> {
    const minScore = options?.minMatchScore || 60;
    const limit = options?.limit || 10;

    // Get template skills requirements
    const templateSkillsQuery = `
      SELECT 
        rts.skill_id,
        rts.min_proficiency,
        rts.is_required,
        rts.weight,
        s.name as skill_name,
        s.category as skill_category
      FROM role_template_skills rts
      JOIN skills s ON rts.skill_id = s.id
      WHERE rts.template_id = $1
    `;
    
    const templateSkills = await this.db.query(templateSkillsQuery, [templateId]);
    const requiredSkills = templateSkills.rows;

    if (requiredSkills.length === 0) {
      return { matches: [] };
    }

    // Get all active employees with their skills
    const employeesQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        d.name as department_name,
        COALESCE(
          jsonb_agg(
            CASE WHEN es.skill_id IS NOT NULL THEN
              jsonb_build_object(
                'skillId', es.skill_id,
                'proficiencyLevel', es.proficiency_level,
                'skillName', s.name
              )
            END
          ) FILTER (WHERE es.skill_id IS NOT NULL), 
          '[]'::jsonb
        ) as employee_skills
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employee_skills es ON e.id = es.employee_id
      LEFT JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true
      GROUP BY e.id, e.first_name, e.last_name, e.email, e.position, d.name
    `;

    const employees = await this.db.query(employeesQuery);
    const matches: EmployeeTemplateMatch[] = [];

    for (const employee of employees.rows) {
      const employeeSkillMap = new Map();
      employee.employee_skills.forEach((skill: any) => {
        employeeSkillMap.set(skill.skillId, skill.proficiencyLevel);
      });

      const skillMatches = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const requiredSkill of requiredSkills) {
        const employeeLevel = employeeSkillMap.get(requiredSkill.skill_id) || 0;
        const requiredLevel = requiredSkill.min_proficiency;
        const weight = requiredSkill.weight || 1.0;
        const gap = Math.max(0, requiredLevel - employeeLevel);

        skillMatches.push({
          skillName: requiredSkill.skill_name,
          required: requiredSkill.is_required,
          hasSkill: employeeLevel > 0,
          currentProficiency: employeeLevel > 0 ? employeeLevel : undefined,
          requiredProficiency: requiredLevel,
          gap
        });

        // Calculate score for this skill
        let skillScore = 0;
        if (employeeLevel >= requiredLevel) {
          skillScore = 100; // Perfect match
        } else if (employeeLevel > 0) {
          skillScore = (employeeLevel / requiredLevel) * 80; // Partial match
        } else {
          skillScore = 0; // No skill
        }

        // Apply penalties for required skills
        if (requiredSkill.is_required && employeeLevel < requiredLevel) {
          skillScore *= 0.5; // Heavy penalty for missing required skills
        }

        totalScore += skillScore * weight;
        totalWeight += weight;
      }

      const matchScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      if (matchScore >= minScore) {
        const strengths = skillMatches
          .filter(sm => sm.hasSkill && sm.gap === 0)
          .map(sm => sm.skillName);

        const gaps = skillMatches
          .filter(sm => sm.gap > 0)
          .map(sm => `${sm.skillName} (gap: ${sm.gap})`);

        matches.push({
          employee: {
            id: employee.id,
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email,
            position: employee.position,
            department: employee.department_name
          },
          matchScore: Math.round(matchScore),
          skillMatches,
          strengths,
          gaps,
          overallAssessment: this.generateAssessment(matchScore, strengths.length, gaps.length)
        });
      }
    }

    // Sort by match score and limit results
    matches.sort((a, b) => b.matchScore - a.matchScore);
    return { matches: matches.slice(0, limit) };
  }

  // Template Library
  async getTemplateLibrary(): Promise<TemplateLibrary> {
    const [categoriesResult, popularResult, recentResult, totalResult] = await Promise.all([
      // Categories with template counts
      this.db.query(`
        SELECT 
          tc.id,
          tc.name,
          tc.description,
          COUNT(rt.id) as template_count
        FROM template_categories tc
        LEFT JOIN role_template_categories rtc ON tc.id = rtc.category_id
        LEFT JOIN role_templates rt ON rtc.template_id = rt.id AND rt.is_active = true
        GROUP BY tc.id, tc.name, tc.description
        ORDER BY tc.display_order, tc.name
      `),
      
      // Popular templates (most used)
      this.db.query(`
        SELECT rt.*, COUNT(pta.id) as usage_count
        FROM role_templates rt
        LEFT JOIN project_template_assignments pta ON rt.id = pta.template_id
        WHERE rt.is_active = true
        GROUP BY rt.id
        ORDER BY usage_count DESC
        LIMIT 10
      `),
      
      // Recent templates
      this.db.query(`
        SELECT * FROM role_templates
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 10
      `),
      
      // Total count
      this.db.query(`
        SELECT COUNT(*) as total FROM role_templates WHERE is_active = true
      `)
    ]);

    return {
      categories: categoriesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        templateCount: parseInt(row.template_count)
      })),
      popularTemplates: popularResult.rows.map(this.mapTemplateRow),
      recentTemplates: recentResult.rows.map(this.mapTemplateRow),
      totalTemplates: parseInt(totalResult.rows[0].total)
    };
  }

  // Skills Management for Templates
  async addSkillToTemplate(templateId: number, skillData: {
    skillId: number;
    minProficiency: number;
    isRequired: boolean;
    weight?: number;
  }): Promise<RoleTemplateSkill> {
    const query = `
      INSERT INTO role_template_skills (template_id, skill_id, min_proficiency, is_required, weight)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      templateId,
      skillData.skillId,
      skillData.minProficiency,
      skillData.isRequired,
      skillData.weight || 1.0
    ]);

    return this.mapTemplateSkillRow(result.rows[0]);
  }

  async updateTemplateSkill(templateId: number, skillId: number, updates: {
    minProficiency?: number;
    isRequired?: boolean;
    weight?: number;
  }): Promise<RoleTemplateSkill> {
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(templateId, skillId);
    const query = `
      UPDATE role_template_skills 
      SET ${updateFields.join(', ')}
      WHERE template_id = $${paramIndex} AND skill_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('Template skill not found');
    }

    return this.mapTemplateSkillRow(result.rows[0]);
  }

  // Private helper methods
  private mapTemplateRow(row: any): RoleTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      department: row.department,
      level: row.level,
      standardHourlyRate: parseFloat(row.standard_hourly_rate),
      estimatedSalaryMin: parseFloat(row.estimated_salary_min),
      estimatedSalaryMax: parseFloat(row.estimated_salary_max),
      responsibilities: row.responsibilities ? JSON.parse(row.responsibilities) : [],
      requirements: row.requirements ? JSON.parse(row.requirements) : [],
      preferredQualifications: row.preferred_qualifications ? JSON.parse(row.preferred_qualifications) : [],
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by
    };
  }

  private mapPlaceholderResourceRow(row: any): PlaceholderResource {
    return {
      id: row.id,
      projectId: row.project_id,
      templateId: row.template_id,
      quantity: row.quantity,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      allocationPercentage: row.allocation_percentage,
      customHourlyRate: parseFloat(row.custom_hourly_rate),
      isPlaceholder: row.is_placeholder,
      status: row.status,
      notes: row.notes
    };
  }

  private mapTemplateSkillRow(row: any): RoleTemplateSkill {
    return {
      id: row.id,
      templateId: row.template_id,
      skillId: row.skill_id,
      minProficiency: row.min_proficiency,
      isRequired: row.is_required,
      weight: parseFloat(row.weight)
    };
  }

  private generateAssessment(matchScore: number, strengthsCount: number, gapsCount: number): string {
    if (matchScore >= 90) {
      return 'Excellent match - ready to start immediately';
    } else if (matchScore >= 80) {
      return 'Very good match - minor training may be needed';
    } else if (matchScore >= 70) {
      return 'Good match - some skill development required';
    } else if (matchScore >= 60) {
      return 'Acceptable match - significant training needed';
    } else {
      return 'Poor match - extensive training required';
    }
  }
}