"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRequirementModel = void 0;
const types_1 = require("../types");
class SkillRequirementModel {
    static initialize(pool) {
        this.pool = pool;
    }
    static async create(input) {
        try {
            const query = `
        INSERT INTO skill_requirements (project_id, skill_id, minimum_proficiency, required_count, priority, fulfilled)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
            const values = [
                input.projectId,
                input.skillId,
                input.minimumProficiency,
                input.requiredCount,
                input.priority,
                false
            ];
            const result = await this.pool.query(query, values);
            return this.mapRow(result.rows[0]);
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                throw new types_1.DatabaseError('Skill requirement already exists for this project and skill');
            }
            if (error.code === '23503') { // Foreign key constraint violation
                throw new types_1.DatabaseError('Invalid project ID or skill ID');
            }
            throw error;
        }
    }
    static async findById(id) {
        const query = `
      SELECT * FROM skill_requirements 
      WHERE id = $1
    `;
        const result = await this.pool.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }
    static async findByIdWithSkill(id) {
        const query = `
      SELECT 
        sr.*,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'category', s.category,
          'isActive', s.is_active,
          'createdAt', s.created_at,
          'updatedAt', s.updated_at
        ) AS skill
      FROM skill_requirements sr
      JOIN skills s ON sr.skill_id = s.id
      WHERE sr.id = $1 AND s.is_active = true
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        const requirement = this.mapRow(row);
        return {
            ...requirement,
            skill: row.skill
        };
    }
    static async findByProject(projectId) {
        const query = `
      SELECT 
        sr.*,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'description', s.description,
          'category', s.category,
          'isActive', s.is_active,
          'createdAt', s.created_at,
          'updatedAt', s.updated_at
        ) AS skill
      FROM skill_requirements sr
      JOIN skills s ON sr.skill_id = s.id
      WHERE sr.project_id = $1 AND s.is_active = true
      ORDER BY sr.priority DESC, s.name
    `;
        const result = await this.pool.query(query, [projectId]);
        return result.rows.map(row => ({
            ...this.mapRow(row),
            skill: row.skill
        }));
    }
    static async findBySkill(skillId) {
        const query = `
      SELECT 
        sr.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'status', p.status,
          'priority', p.priority
        ) AS project
      FROM skill_requirements sr
      JOIN projects p ON sr.project_id = p.id
      WHERE sr.skill_id = $1 AND p.is_active = true
      ORDER BY sr.priority DESC, p.start_date DESC
    `;
        const result = await this.pool.query(query, [skillId]);
        return result.rows.map(row => ({
            ...this.mapRow(row),
            project: row.project
        }));
    }
    static async findAll(filters = {}) {
        let query = 'SELECT * FROM skill_requirements WHERE 1=1';
        const values = [];
        if (filters.projectId) {
            values.push(filters.projectId);
            query += ` AND project_id = $${values.length}`;
        }
        if (filters.skillId) {
            values.push(filters.skillId);
            query += ` AND skill_id = $${values.length}`;
        }
        if (filters.minimumProficiency) {
            values.push(filters.minimumProficiency);
            query += ` AND minimum_proficiency >= $${values.length}`;
        }
        if (filters.fulfilled !== undefined) {
            values.push(filters.fulfilled);
            query += ` AND fulfilled = $${values.length}`;
        }
        if (filters.priority) {
            values.push(filters.priority);
            query += ` AND priority = $${values.length}`;
        }
        query += ' ORDER BY priority DESC, created_at DESC';
        const result = await this.pool.query(query, values);
        return result.rows.map(row => this.mapRow(row));
    }
    static async update(id, updates) {
        const updateFields = [];
        const values = [];
        if (updates.minimumProficiency !== undefined) {
            values.push(updates.minimumProficiency);
            updateFields.push(`minimum_proficiency = $${values.length}`);
        }
        if (updates.requiredCount !== undefined) {
            values.push(updates.requiredCount);
            updateFields.push(`required_count = $${values.length}`);
        }
        if (updates.fulfilled !== undefined) {
            values.push(updates.fulfilled);
            updateFields.push(`fulfilled = $${values.length}`);
        }
        if (updates.priority !== undefined) {
            values.push(updates.priority);
            updateFields.push(`priority = $${values.length}`);
        }
        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(id);
        const query = `
      UPDATE skill_requirements 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `;
        const result = await this.pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Skill requirement not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static async delete(id) {
        const query = `
      DELETE FROM skill_requirements 
      WHERE id = $1
      RETURNING *
    `;
        const result = await this.pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Skill requirement not found');
        }
        return this.mapRow(result.rows[0]);
    }
    static async getSkillGapAnalysis(projectId) {
        const query = `
      WITH project_requirements AS (
        SELECT 
          sr.*,
          s.name as skill_name,
          s.description as skill_description,
          s.category as skill_category
        FROM skill_requirements sr
        JOIN skills s ON sr.skill_id = s.id
        WHERE sr.project_id = $1 AND s.is_active = true
      ),
      employee_skills AS (
        SELECT 
          es.skill_id,
          es.employee_id,
          es.proficiency_level,
          es.years_of_experience,
          e.first_name,
          e.last_name,
          e.id as emp_id,
          -- Check if employee is available (not over-allocated)
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM resource_allocations ra 
              WHERE ra.employee_id = e.id 
              AND ra.is_active = true 
              AND ra.start_date <= (SELECT end_date FROM projects WHERE id = $1)
              AND ra.end_date >= (SELECT start_date FROM projects WHERE id = $1)
            ) THEN false
            ELSE true
          END as is_available
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        WHERE es.is_active = true AND e.is_active = true
      )
      SELECT 
        pr.id,
        pr.project_id,
        pr.skill_id,
        pr.minimum_proficiency,
        pr.required_count,
        pr.fulfilled,
        pr.priority,
        pr.created_at,
        pr.updated_at,
        pr.skill_name,
        pr.skill_description,
        pr.skill_category,
        COUNT(es.employee_id) as available_employees,
        COUNT(CASE WHEN es.proficiency_level::integer >= pr.minimum_proficiency THEN 1 END) as qualified_employees,
        GREATEST(0, pr.required_count - COUNT(CASE WHEN es.proficiency_level::integer >= pr.minimum_proficiency THEN 1 END)) as gap,
        json_agg(
          CASE 
            WHEN es.proficiency_level::integer >= pr.minimum_proficiency 
            THEN json_build_object(
              'employeeId', es.emp_id,
              'employeeName', CONCAT(es.first_name, ' ', es.last_name),
              'proficiencyLevel', es.proficiency_level::integer,
              'yearsOfExperience', es.years_of_experience,
              'isAvailable', es.is_available
            )
            ELSE NULL
          END
        ) FILTER (WHERE es.proficiency_level::integer >= pr.minimum_proficiency) as recommended_employees
      FROM project_requirements pr
      LEFT JOIN employee_skills es ON pr.skill_id = es.skill_id
      GROUP BY pr.id, pr.project_id, pr.skill_id, pr.minimum_proficiency, pr.required_count, 
               pr.fulfilled, pr.priority, pr.created_at, pr.updated_at, 
               pr.skill_name, pr.skill_description, pr.skill_category
      ORDER BY gap DESC, pr.priority DESC
    `;
        const result = await this.pool.query(query, [projectId]);
        return result.rows.map(row => ({
            requirement: {
                id: row.id,
                projectId: row.project_id,
                skillId: row.skill_id,
                minimumProficiency: row.minimum_proficiency,
                requiredCount: row.required_count,
                fulfilled: row.fulfilled,
                priority: row.priority,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                skill: {
                    id: row.skill_id,
                    name: row.skill_name,
                    description: row.skill_description,
                    category: row.skill_category,
                    isActive: true,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }
            },
            availableEmployees: parseInt(row.available_employees) || 0,
            qualifiedEmployees: parseInt(row.qualified_employees) || 0,
            gap: parseInt(row.gap) || 0,
            recommendedEmployees: row.recommended_employees || []
        }));
    }
    static async updateFulfillmentStatus(projectId) {
        const query = `
      UPDATE skill_requirements 
      SET fulfilled = (
        SELECT COUNT(*) >= sr.required_count
        FROM resource_allocations ra
        JOIN employee_skills es ON ra.employee_id = es.employee_id
        WHERE ra.project_id = sr.project_id 
        AND es.skill_id = sr.skill_id
        AND es.proficiency_level::integer >= sr.minimum_proficiency
        AND ra.is_active = true
        AND es.is_active = true
      ),
      updated_at = CURRENT_TIMESTAMP
      FROM skill_requirements sr
      WHERE skill_requirements.id = sr.id 
      AND sr.project_id = $1
    `;
        await this.pool.query(query, [projectId]);
    }
    static async getSkillDemandAnalysis() {
        const query = `
      WITH skill_demand AS (
        SELECT 
          s.id as skill_id,
          s.name,
          s.description,
          s.category,
          s.is_active,
          s.created_at,
          s.updated_at,
          SUM(sr.required_count) as total_demand,
          COUNT(CASE WHEN sr.priority = 'critical' THEN 1 END) as critical_projects,
          AVG(sr.minimum_proficiency::numeric) as avg_required_proficiency
        FROM skills s
        LEFT JOIN skill_requirements sr ON s.id = sr.skill_id
        LEFT JOIN projects p ON sr.project_id = p.id AND p.is_active = true
        WHERE s.is_active = true
        GROUP BY s.id, s.name, s.description, s.category, s.is_active, s.created_at, s.updated_at
      ),
      skill_supply AS (
        SELECT 
          skill_id,
          COUNT(*) as available_supply
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        WHERE es.is_active = true AND e.is_active = true
        GROUP BY skill_id
      )
      SELECT 
        sd.*,
        COALESCE(ss.available_supply, 0) as available_supply,
        CASE 
          WHEN COALESCE(ss.available_supply, 0) = 0 AND sd.total_demand > 0 THEN 'CRITICAL'
          WHEN COALESCE(ss.available_supply, 0)::numeric / NULLIF(sd.total_demand, 0) < 0.5 THEN 'HIGH'
          WHEN COALESCE(ss.available_supply, 0)::numeric / NULLIF(sd.total_demand, 0) < 1.0 THEN 'MEDIUM'
          ELSE 'LOW'
        END as shortage_risk
      FROM skill_demand sd
      LEFT JOIN skill_supply ss ON sd.skill_id = ss.skill_id
      WHERE sd.total_demand > 0
      ORDER BY 
        CASE shortage_risk 
          WHEN 'CRITICAL' THEN 4 
          WHEN 'HIGH' THEN 3 
          WHEN 'MEDIUM' THEN 2 
          ELSE 1 
        END DESC,
        sd.total_demand DESC
    `;
        const result = await this.pool.query(query);
        return result.rows.map(row => ({
            skill: {
                id: row.skill_id,
                name: row.name,
                description: row.description,
                category: row.category,
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            },
            totalDemand: parseInt(row.total_demand) || 0,
            availableSupply: parseInt(row.available_supply) || 0,
            criticalProjects: parseInt(row.critical_projects) || 0,
            avgRequiredProficiency: parseFloat(row.avg_required_proficiency) || 0,
            shortageRisk: row.shortage_risk
        }));
    }
    static mapRow(row) {
        return {
            id: row.id,
            projectId: row.project_id,
            skillId: row.skill_id,
            minimumProficiency: row.minimum_proficiency,
            requiredCount: row.required_count,
            fulfilled: row.fulfilled,
            priority: row.priority,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
exports.SkillRequirementModel = SkillRequirementModel;
