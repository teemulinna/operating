"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillService = void 0;
const Skill_1 = require("../models/Skill");
const EmployeeSkill_1 = require("../models/EmployeeSkill");
const database_service_1 = require("../database/database.service");
class SkillService {
    static initialize(pool) {
        this.pool = pool;
        Skill_1.SkillModel.initialize(pool);
        EmployeeSkill_1.EmployeeSkillModel.initialize(pool);
        this.initialized = true;
    }
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
    }
    static ensureInitialized() {
        if (!this.initialized || !this.pool) {
            throw new Error('SkillService not initialized. Call SkillService.initialize(pool) first.');
        }
    }
    async getSkills(search, category) {
        const filters = { isActive: true };
        if (category) {
            filters.category = category;
        }
        let skills = await Skill_1.SkillModel.findAll(filters);
        if (search) {
            skills = await Skill_1.SkillModel.search(search, category);
        }
        return skills;
    }
    async createSkill(skillData) {
        return await Skill_1.SkillModel.create(skillData);
    }
    async updateSkill(id, skillData) {
        return await Skill_1.SkillModel.update(id, skillData);
    }
    async deleteSkill(id) {
        return await Skill_1.SkillModel.delete(id);
    }
    async getSkillById(id) {
        return await Skill_1.SkillModel.findById(id);
    }
    async getPopularSkills(limit = 20) {
        SkillService.ensureInitialized();
        const query = `
      SELECT
        s.*,
        COUNT(es.employee_id) as employee_count
      FROM skills s
      LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY employee_count DESC, s.name
      LIMIT $1
    `;
        const result = await this.db.query(query, [limit]);
        return result.rows.map((row) => ({
            skill: {
                id: row.id,
                name: row.name,
                description: row.description,
                category: row.category,
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            },
            employeeCount: parseInt(row.employee_count)
        }));
    }
    async getEmployeesBySkill(skillId, page = 1, limit = 10) {
        SkillService.ensureInitialized();
        const offset = (page - 1) * limit;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM employee_skills es
      JOIN employees e ON es.employee_id = e.id
      WHERE es.skill_id = $1 AND es.is_active = true AND e.is_active = true
    `;
        const countResult = await this.db.query(countQuery, [skillId]);
        const totalItems = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalItems / limit);
        const dataQuery = `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.position_title,
        e.department_id,
        d.name as department_name,
        e.hire_date,
        es.proficiency_level,
        es.years_experience,
        es.is_certified
      FROM employee_skills es
      JOIN employees e ON es.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE es.skill_id = $1 AND es.is_active = true AND e.is_active = true
      ORDER BY es.proficiency_level DESC, e.last_name, e.first_name
      LIMIT $2 OFFSET $3
    `;
        const result = await this.db.query(dataQuery, [skillId, limit, offset]);
        return {
            data: result.rows.map(row => ({
                id: row.id,
                firstName: row.first_name,
                lastName: row.last_name,
                email: row.email,
                positionTitle: row.position_title,
                departmentId: row.department_id,
                departmentName: row.department_name,
                hireDate: row.hire_date,
                proficiencyLevel: row.proficiency_level,
                yearsExperience: row.years_experience,
                isCertified: row.is_certified
            })),
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
    async getSkillRecommendations(employeeId) {
        SkillService.ensureInitialized();
        const query = `
      WITH employee_context AS (
        SELECT department_id, position_title
        FROM employees
        WHERE id = $1
      ),
      employee_skills AS (
        SELECT skill_id
        FROM employee_skills
        WHERE employee_id = $1 AND is_active = true
      ),
      peer_skills AS (
        SELECT 
          s.id,
          s.name,
          s.description,
          s.category,
          s.is_active,
          s.created_at,
          s.updated_at,
          COUNT(es.employee_id) as peer_count,
          AVG(es.proficiency_level) as avg_proficiency
        FROM employees e
        JOIN employee_context ec ON e.department_id = ec.department_id
        JOIN employee_skills es ON e.id = es.employee_id
        JOIN skills s ON es.skill_id = s.id
        WHERE e.is_active = true
          AND es.is_active = true
          AND s.is_active = true
          AND e.id != $1
          AND s.id NOT IN (SELECT skill_id FROM employee_skills WHERE employee_id = $1 AND is_active = true)
        GROUP BY s.id, s.name, s.description, s.category, s.is_active, s.created_at, s.updated_at
        ORDER BY peer_count DESC, avg_proficiency DESC
        LIMIT $2
      )
      SELECT 
        *,
        (peer_count * 10 + avg_proficiency * 5) as relevance_score
      FROM peer_skills
    `;
        const result = await this.db.query(query, [employeeId]);
        return result.rows.map((row) => ({
            skill: {
                id: row.id,
                name: row.name,
                description: row.description,
                category: row.category,
                isActive: row.is_active,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            },
            relevanceScore: parseFloat(row.relevance_score)
        }));
    }
    async getSkillAnalytics() {
        SkillService.ensureInitialized();
        const statistics = await Skill_1.SkillModel.getStatistics();
        const skillsByDepartmentQuery = `
      SELECT 
        d.name as department_name,
        s.name as skill_name,
        s.category,
        COUNT(es.employee_id) as employee_count,
        AVG(es.proficiency_level) as avg_proficiency
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      JOIN employee_skills es ON e.id = es.employee_id
      JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true AND es.is_active = true AND s.is_active = true
      GROUP BY d.id, d.name, s.id, s.name, s.category
      ORDER BY d.name, employee_count DESC
    `;
        const skillTrendsQuery = `
      SELECT 
        s.name as skill_name,
        s.category,
        COUNT(es.employee_id) as recent_additions
      FROM employee_skills es
      JOIN skills s ON es.skill_id = s.id
      JOIN employees e ON es.employee_id = e.id
      WHERE es.created_at >= CURRENT_DATE - INTERVAL '6 months'
        AND es.is_active = true AND s.is_active = true AND e.is_active = true
      GROUP BY s.id, s.name, s.category
      ORDER BY recent_additions DESC
      LIMIT 15
    `;
        const skillDiversityQuery = `
      SELECT 
        d.name as department_name,
        COUNT(DISTINCT s.id) as unique_skills,
        AVG(es.proficiency_level) as avg_proficiency_level
      FROM departments d
      JOIN employees e ON d.id = e.department_id
      JOIN employee_skills es ON e.id = es.employee_id
      JOIN skills s ON es.skill_id = s.id
      WHERE e.is_active = true AND es.is_active = true AND s.is_active = true
      GROUP BY d.id, d.name
      ORDER BY unique_skills DESC
    `;
        const [skillsByDeptResult, skillTrendsResult, skillDiversityResult] = await Promise.all([
            SkillService.pool.query(skillsByDepartmentQuery),
            SkillService.pool.query(skillTrendsQuery),
            SkillService.pool.query(skillDiversityQuery)
        ]);
        return {
            totalSkills: statistics.totalSkills,
            skillsByCategory: statistics.skillsByCategory,
            mostUsedSkills: statistics.mostUsedSkills,
            skillsByDepartment: skillsByDeptResult.rows,
            emergingSkills: skillTrendsResult.rows,
            skillDiversityByDepartment: skillDiversityResult.rows
        };
    }
}
exports.SkillService = SkillService;
SkillService.initialized = false;
//# sourceMappingURL=skill.service.js.map