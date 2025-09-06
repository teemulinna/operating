import { DatabaseService } from '../database/database.service';
import { PaginatedResponse } from '../types/employee.types';

export interface Skill {
  id?: number;
  name: string;
  category: 'Technical' | 'Soft' | 'Domain' | 'Certifications' | 'Language';
  description?: string;
  isActive?: boolean;
}

export interface EmployeeSkill {
  id?: number;
  employeeId: number;
  skillId: number;
  proficiencyLevel: number; // 1-5
  certificationLevel?: string;
  yearsOfExperience?: number;
  lastUsed?: Date;
  validatedBy?: number;
  validationDate?: Date;
  notes?: string;
  skill?: Skill;
}

export interface SkillGapAnalysis {
  missingSkills: Array<{
    skillId: number;
    skillName: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
  }>;
  skillsToImprove: Array<{
    skillId: number;
    skillName: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
  }>;
  recommendations: Array<{
    skillId: number;
    skillName: string;
    recommendationType: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    reason: string;
    suggestedResources: Array<{
      type: string;
      name: string;
      url?: string;
      estimatedHours?: number;
      cost?: number;
    }>;
  }>;
}

export interface SkillAnalytics {
  skillDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  proficiencyLevels: Array<{
    level: number;
    count: number;
    percentage: number;
  }>;
  skillsByCategory: Array<{
    category: string;
    skills: Array<{
      name: string;
      count: number;
      avgProficiency: number;
    }>;
  }>;
  emergingSkills: Array<{
    name: string;
    growth: number;
    newEmployees: number;
  }>;
  skillGaps: Array<{
    skill: string;
    demand: number;
    supply: number;
    gap: number;
  }>;
}

export interface TrainingRecommendation {
  skillName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  suggestedResources: Array<{
    type: 'online_course' | 'book' | 'certification' | 'mentoring' | 'project';
    name: string;
    provider?: string;
    url?: string;
    estimatedHours: number;
    estimatedCost?: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  }>;
  estimatedTimeToComplete: number; // in hours
  expectedOutcome: string;
}

export class SkillsManagementService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Skills CRUD operations
  async createSkill(skillData: Skill): Promise<Skill> {
    const query = `
      INSERT INTO skills (name, category, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await this.db.query(query, [
      skillData.name,
      skillData.category,
      skillData.description || null,
      skillData.isActive ?? true
    ]);

    return this.mapSkillRow(result.rows[0]);
  }

  async getSkills(filters?: {
    category?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Skill>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      whereConditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters?.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters?.isActive !== undefined) {
      whereConditions.push(`is_active = $${paramIndex}`);
      params.push(filters.isActive);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM skills ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Get data
    const dataQuery = `
      SELECT * FROM skills 
      ${whereClause}
      ORDER BY category, name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.db.query(dataQuery, [...params, limit, offset]);

    return {
      data: dataResult.rows.map(this.mapSkillRow),
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

  // Employee Skills Management
  async assignSkillToEmployee(employeeId: number, skillAssignment: {
    skillId: number;
    proficiencyLevel: number;
    certificationLevel?: string;
    yearsOfExperience?: number;
    lastUsed?: Date;
    notes?: string;
  }): Promise<EmployeeSkill> {
    if (skillAssignment.proficiencyLevel < 1 || skillAssignment.proficiencyLevel > 5) {
      throw new Error('Proficiency level must be between 1 and 5');
    }

    const query = `
      INSERT INTO employee_skills 
      (employee_id, skill_id, proficiency_level, certification_level, years_of_experience, last_used, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      employeeId,
      skillAssignment.skillId,
      skillAssignment.proficiencyLevel,
      skillAssignment.certificationLevel || null,
      skillAssignment.yearsOfExperience || null,
      skillAssignment.lastUsed || null,
      skillAssignment.notes || null
    ]);

    return this.mapEmployeeSkillRow(result.rows[0]);
  }

  async getEmployeeSkills(employeeId: number): Promise<EmployeeSkill[]> {
    const query = `
      SELECT 
        es.*,
        s.name as skill_name,
        s.category as skill_category,
        s.description as skill_description
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      WHERE es.employee_id = $1
      ORDER BY s.category, s.name
    `;

    const result = await this.db.query(query, [employeeId]);
    return result.rows.map(this.mapEmployeeSkillWithSkill);
  }

  async updateEmployeeSkill(employeeId: number, skillId: number, updates: {
    proficiencyLevel?: number;
    certificationLevel?: string;
    yearsOfExperience?: number;
    lastUsed?: Date;
    notes?: string;
  }): Promise<EmployeeSkill> {
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

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(employeeId, skillId);

    const query = `
      UPDATE employee_skills 
      SET ${updateFields.join(', ')}
      WHERE employee_id = $${paramIndex} AND skill_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    if (result.rows.length === 0) {
      throw new Error('Employee skill not found');
    }

    return this.mapEmployeeSkillRow(result.rows[0]);
  }

  // Skill Gap Analysis
  async performSkillGapAnalysis(employeeId: number): Promise<SkillGapAnalysis> {
    // Get employee's current position and department
    const employeeQuery = `
      SELECT position, department_id FROM employees WHERE id = $1
    `;
    const employeeResult = await this.db.query(employeeQuery, [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const { position, department_id } = employeeResult.rows[0];

    // Get current employee skills
    const currentSkillsQuery = `
      SELECT skill_id, proficiency_level 
      FROM employee_skills 
      WHERE employee_id = $1
    `;
    const currentSkills = await this.db.query(currentSkillsQuery, [employeeId]);
    const currentSkillMap = new Map(
      currentSkills.rows.map(row => [row.skill_id, row.proficiency_level])
    );

    // Analyze skills of peers in similar roles and departments
    const peerSkillsQuery = `
      WITH peer_employees AS (
        SELECT id FROM employees 
        WHERE (position = $1 OR department_id = $2)
        AND id != $3
        AND is_active = true
      ),
      peer_skills AS (
        SELECT 
          es.skill_id,
          s.name as skill_name,
          s.category,
          AVG(es.proficiency_level) as avg_proficiency,
          COUNT(*) as peer_count
        FROM employee_skills es
        JOIN skills s ON es.skill_id = s.id
        JOIN peer_employees pe ON es.employee_id = pe.id
        GROUP BY es.skill_id, s.name, s.category
        HAVING COUNT(*) >= 2 -- At least 2 peers have this skill
      )
      SELECT * FROM peer_skills
      ORDER BY peer_count DESC, avg_proficiency DESC
    `;

    const peerSkills = await this.db.query(peerSkillsQuery, [position, department_id, employeeId]);

    const missingSkills: SkillGapAnalysis['missingSkills'] = [];
    const skillsToImprove: SkillGapAnalysis['skillsToImprove'] = [];
    const recommendations: SkillGapAnalysis['recommendations'] = [];

    for (const peerSkill of peerSkills.rows) {
      const currentLevel = currentSkillMap.get(peerSkill.skill_id) || 0;
      const recommendedLevel = Math.ceil(peerSkill.avg_proficiency);
      
      if (currentLevel === 0) {
        // Missing skill
        missingSkills.push({
          skillId: peerSkill.skill_id,
          skillName: peerSkill.skill_name,
          category: peerSkill.category,
          priority: this.calculatePriority(peerSkill.peer_count, recommendedLevel),
          reason: `${peerSkill.peer_count} peers in similar roles have this skill`
        });

        recommendations.push({
          skillId: peerSkill.skill_id,
          skillName: peerSkill.skill_name,
          recommendationType: 'learn_new_skill',
          priority: this.calculatePriority(peerSkill.peer_count, recommendedLevel),
          reason: `Essential skill for your role - ${peerSkill.peer_count} peers have this skill`,
          suggestedResources: await this.getSuggestedResources(peerSkill.skill_name, 'beginner')
        });
      } else if (currentLevel < recommendedLevel) {
        // Skill needs improvement
        skillsToImprove.push({
          skillId: peerSkill.skill_id,
          skillName: peerSkill.skill_name,
          currentLevel,
          requiredLevel: recommendedLevel,
          gap: recommendedLevel - currentLevel
        });

        recommendations.push({
          skillId: peerSkill.skill_id,
          skillName: peerSkill.skill_name,
          recommendationType: 'improve_skill',
          priority: this.calculatePriority(peerSkill.peer_count, recommendedLevel - currentLevel),
          reason: `Peers have higher proficiency (${recommendedLevel.toFixed(1)} vs ${currentLevel})`,
          suggestedResources: await this.getSuggestedResources(
            peerSkill.skill_name, 
            currentLevel < 3 ? 'intermediate' : 'advanced'
          )
        });
      }
    }

    return {
      missingSkills,
      skillsToImprove,
      recommendations
    };
  }

  // Skill Analytics
  async getSkillAnalytics(): Promise<SkillAnalytics> {
    const analyticsQueries = [
      // Skill distribution by category
      `SELECT 
         s.category,
         COUNT(DISTINCT es.employee_id) as count,
         ROUND(COUNT(DISTINCT es.employee_id) * 100.0 / 
           (SELECT COUNT(DISTINCT employee_id) FROM employee_skills), 2) as percentage
       FROM skills s
       JOIN employee_skills es ON s.id = es.skill_id
       GROUP BY s.category
       ORDER BY count DESC`,

      // Proficiency levels distribution
      `SELECT 
         proficiency_level as level,
         COUNT(*) as count,
         ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employee_skills), 2) as percentage
       FROM employee_skills
       GROUP BY proficiency_level
       ORDER BY proficiency_level`,

      // Skills by category with details
      `SELECT 
         s.category,
         s.name,
         COUNT(es.employee_id) as count,
         ROUND(AVG(es.proficiency_level), 2) as avg_proficiency
       FROM skills s
       JOIN employee_skills es ON s.id = es.skill_id
       GROUP BY s.category, s.name
       ORDER BY s.category, count DESC`,

      // Emerging skills (based on recent additions)
      `SELECT 
         s.name,
         COUNT(es.employee_id) as new_employees,
         ROUND((COUNT(es.employee_id) * 100.0 / 
           NULLIF((SELECT COUNT(es2.employee_id) 
                   FROM employee_skills es2 
                   JOIN skills s2 ON es2.skill_id = s2.id 
                   WHERE s2.name = s.name), 0)), 2) as growth
       FROM skills s
       JOIN employee_skills es ON s.id = es.skill_id
       WHERE es.created_at >= CURRENT_DATE - INTERVAL '6 months'
       GROUP BY s.name
       HAVING COUNT(es.employee_id) >= 2
       ORDER BY new_employees DESC
       LIMIT 10`
    ];

    const [distResult, proficiencyResult, categoryResult, emergingResult] = 
      await Promise.all(analyticsQueries.map(query => this.db.query(query)));

    // Process skills by category
    const skillsByCategory = this.groupSkillsByCategory(categoryResult.rows);

    return {
      skillDistribution: distResult.rows,
      proficiencyLevels: proficiencyResult.rows,
      skillsByCategory,
      emergingSkills: emergingResult.rows,
      skillGaps: await this.calculateSkillGaps()
    };
  }

  // Training Recommendations
  async getTrainingRecommendations(employeeId: number): Promise<{ recommendations: TrainingRecommendation[] }> {
    const gapAnalysis = await this.performSkillGapAnalysis(employeeId);
    const recommendations: TrainingRecommendation[] = [];

    for (const rec of gapAnalysis.recommendations) {
      const trainingRec: TrainingRecommendation = {
        skillName: rec.skillName,
        priority: rec.priority,
        reason: rec.reason,
        suggestedResources: rec.suggestedResources.map(resource => ({
          type: resource.type as any,
          name: resource.name,
          provider: resource.url?.includes('coursera') ? 'Coursera' : 
                   resource.url?.includes('udemy') ? 'Udemy' : 
                   resource.url?.includes('pluralsight') ? 'Pluralsight' : 'Various',
          url: resource.url,
          estimatedHours: resource.estimatedHours || 20,
          estimatedCost: resource.cost,
          difficulty: 'intermediate' as const
        })),
        estimatedTimeToComplete: rec.suggestedResources.reduce((sum, r) => sum + (r.estimatedHours || 0), 0),
        expectedOutcome: `Achieve proficiency level 3+ in ${rec.skillName}`
      };
      
      recommendations.push(trainingRec);
    }

    return { recommendations };
  }

  // Private helper methods
  private mapSkillRow(row: any): Skill {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      isActive: row.is_active
    };
  }

  private mapEmployeeSkillRow(row: any): EmployeeSkill {
    return {
      id: row.id,
      employeeId: row.employee_id,
      skillId: row.skill_id,
      proficiencyLevel: row.proficiency_level,
      certificationLevel: row.certification_level,
      yearsOfExperience: parseFloat(row.years_of_experience),
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      validatedBy: row.validated_by,
      validationDate: row.validation_date ? new Date(row.validation_date) : undefined,
      notes: row.notes
    };
  }

  private mapEmployeeSkillWithSkill(row: any): EmployeeSkill {
    const employeeSkill = this.mapEmployeeSkillRow(row);
    employeeSkill.skill = {
      id: row.skill_id,
      name: row.skill_name,
      category: row.skill_category,
      description: row.skill_description
    };
    return employeeSkill;
  }

  private calculatePriority(peerCount: number, level: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = peerCount * level;
    if (score >= 15) return 'critical';
    if (score >= 10) return 'high';
    if (score >= 5) return 'medium';
    return 'low';
  }

  private async getSuggestedResources(skillName: string, difficulty: string) {
    // This would typically connect to a learning resource database
    // For now, return some default resources
    const resources = [
      {
        type: 'online_course',
        name: `${skillName} ${difficulty} course`,
        url: `https://example.com/courses/${skillName.toLowerCase()}`,
        estimatedHours: difficulty === 'beginner' ? 20 : difficulty === 'intermediate' ? 30 : 40,
        cost: difficulty === 'beginner' ? 49 : difficulty === 'intermediate' ? 79 : 129
      },
      {
        type: 'book',
        name: `Learning ${skillName}`,
        estimatedHours: 15,
        cost: 35
      }
    ];

    return resources;
  }

  private groupSkillsByCategory(rows: any[]): SkillAnalytics['skillsByCategory'] {
    const categoryMap = new Map<string, any[]>();
    
    rows.forEach(row => {
      if (!categoryMap.has(row.category)) {
        categoryMap.set(row.category, []);
      }
      categoryMap.get(row.category)!.push({
        name: row.name,
        count: row.count,
        avgProficiency: parseFloat(row.avg_proficiency)
      });
    });

    return Array.from(categoryMap.entries()).map(([category, skills]) => ({
      category,
      skills
    }));
  }

  private async calculateSkillGaps(): Promise<SkillAnalytics['skillGaps']> {
    // This would calculate demand vs supply for each skill
    // For now, return placeholder data
    return [
      { skill: 'React', demand: 10, supply: 8, gap: 2 },
      { skill: 'Node.js', demand: 8, supply: 6, gap: 2 },
      { skill: 'Python', demand: 6, supply: 4, gap: 2 }
    ];
  }
}