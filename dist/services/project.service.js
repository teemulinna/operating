"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const database_service_1 = require("../database/database.service");
const database_factory_1 = require("../database/database-factory");
const api_error_1 = require("../utils/api-error");
const skill_matcher_service_1 = require("./skill-matcher.service");
const resource_recommendation_engine_service_1 = require("./resource-recommendation-engine.service");
class ProjectService {
    constructor(db) {
        this.db = db || database_service_1.DatabaseService.getInstance();
    }
    static async create() {
        const db = await database_factory_1.DatabaseFactory.getDatabaseService();
        return new ProjectService(db);
    }
    async createProject(projectData) {
        try {
            const dbData = {
                name: projectData.name,
                description: projectData.description,
                client_name: projectData.clientName,
                start_date: projectData.startDate || projectData.start_date,
                end_date: projectData.endDate || projectData.end_date,
                status: projectData.status,
                priority: projectData.priority,
                budget: projectData.budget,
                estimated_hours: projectData.estimatedHours || projectData.estimated_hours,
                team_size: projectData.teamSize,
                ...projectData
            };
            if (!dbData.name || !dbData.start_date) {
                throw new api_error_1.ApiError(400, 'Project name and start date are required');
            }
            if (dbData.end_date && dbData.start_date >= dbData.end_date) {
                throw new api_error_1.ApiError(400, 'End date must be after start date');
            }
            const query = `
        INSERT INTO projects (
          name, description, client_name, start_date, end_date, 
          status, priority, budget, estimated_hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const values = [
                dbData.name,
                dbData.description,
                dbData.client_name,
                dbData.start_date,
                dbData.end_date,
                dbData.status || 'planning',
                dbData.priority || 'medium',
                dbData.budget,
                dbData.estimated_hours
            ];
            const result = await this.db.query(query, values);
            if (!result.rows.length) {
                throw new api_error_1.ApiError(500, 'Failed to create project');
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error creating project:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to create project');
        }
    }
    async getAllProjects() {
        try {
            const query = `
        SELECT * FROM projects 
        WHERE status != 'deleted'
        ORDER BY created_at DESC
      `;
            const result = await this.db.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching all projects:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch projects');
        }
    }
    async getProjects(filters = {}, pagination) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            if (filters.status) {
                whereConditions.push(`status = $${paramIndex}`);
                queryParams.push(filters.status);
                paramIndex++;
            }
            if (filters.priority) {
                whereConditions.push(`priority = $${paramIndex}`);
                queryParams.push(filters.priority);
                paramIndex++;
            }
            if (filters.clientName) {
                whereConditions.push(`client_name ILIKE $${paramIndex}`);
                queryParams.push(`%${filters.clientName}%`);
                paramIndex++;
            }
            if (filters.search) {
                whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            if (filters.startDate) {
                whereConditions.push(`start_date >= $${paramIndex}`);
                queryParams.push(filters.startDate);
                paramIndex++;
            }
            if (filters.endDate) {
                whereConditions.push(`end_date <= $${paramIndex}`);
                queryParams.push(filters.endDate);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            const countQuery = `SELECT COUNT(*) FROM projects ${whereClause}`;
            const countResult = await this.db.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 50;
            const offset = (page - 1) * limit;
            const totalPages = Math.ceil(total / limit);
            const query = `
        SELECT 
          p.*,
          COALESCE(role_summary.total_roles, 0) as total_roles,
          COALESCE(role_summary.filled_roles, 0) as filled_roles,
          COALESCE(assignment_summary.assigned_employees, 0) as assigned_employees,
          COALESCE(assignment_summary.total_planned_hours, 0) as total_planned_hours
        FROM projects p
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(*) as total_roles,
            SUM(CASE WHEN current_assignments >= max_assignments THEN 1 ELSE 0 END) as filled_roles
          FROM project_roles
          GROUP BY project_id
        ) role_summary ON p.id = role_summary.project_id
        LEFT JOIN (
          SELECT 
            project_id,
            COUNT(DISTINCT employee_id) as assigned_employees,
            SUM(planned_hours_per_week) as total_planned_hours
          FROM resource_assignments
          WHERE status IN ('planned', 'active')
          GROUP BY project_id
        ) assignment_summary ON p.id = assignment_summary.project_id
        ${whereClause}
        ORDER BY ${pagination?.sortBy || 'created_at'} ${(pagination?.sortOrder || 'desc').toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const result = await this.db.query(query, queryParams);
            return {
                data: result.rows,
                projects: result.rows,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    limit: limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                total
            };
        }
        catch (error) {
            console.error('Error fetching projects:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch projects');
        }
    }
    async getProjectById(projectId) {
        try {
            const query = `
        SELECT * FROM projects WHERE id = $1
      `;
            const result = await this.db.query(query, [projectId]);
            if (!result.rows.length) {
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error fetching project:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch project');
        }
    }
    async updateProject(projectId, updateData) {
        try {
            const existingProject = await this.getProjectById(projectId);
            if (!existingProject) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            if (updateData.status && updateData.status !== existingProject.status) {
                this.validateStatusTransition(existingProject.status, updateData.status);
            }
            if (updateData.start_date || updateData.end_date) {
                const startDate = updateData.start_date || existingProject.start_date;
                const endDate = updateData.end_date || existingProject.end_date;
                if (endDate && startDate >= endDate) {
                    throw new api_error_1.ApiError(400, 'End date must be after start date');
                }
            }
            const updateFields = [];
            const queryParams = [];
            let paramIndex = 1;
            Object.entries(updateData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    updateFields.push(`${key} = $${paramIndex}`);
                    queryParams.push(value);
                    paramIndex++;
                }
            });
            if (updateFields.length === 0) {
                return existingProject;
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            const query = `
        UPDATE projects
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            queryParams.push(projectId);
            const result = await this.db.query(query, queryParams);
            const updatedProject = result.rows[0];
            if (updatedProject.budget) {
                updatedProject.budget = parseInt(updatedProject.budget).toString();
            }
            return updatedProject;
        }
        catch (error) {
            console.error('Error updating project:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to update project');
        }
    }
    async deleteProject(projectId) {
        try {
            const query = `
        DELETE FROM projects WHERE id = $1
      `;
            const result = await this.db.query(query, [projectId]);
            if (result.rowCount === 0) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
        }
        catch (error) {
            console.error('Error deleting project:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to delete project');
        }
    }
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'planning': ['active', 'completed', 'cancelled', 'on-hold'],
            'active': ['on-hold', 'completed', 'cancelled'],
            'on-hold': ['active', 'cancelled'],
            'completed': [],
            'cancelled': []
        };
        const allowedTransitions = validTransitions[currentStatus.toLowerCase()] || [];
        if (!allowedTransitions.includes(newStatus.toLowerCase())) {
            throw new api_error_1.ApiError(400, `Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
    async addProjectRole(roleData) {
        try {
            const query = `
        INSERT INTO project_roles (
          project_id, role_name, description, required_skills, 
          minimum_experience_level, start_date, end_date,
          planned_allocation_percentage, estimated_hours, hourly_rate, max_assignments
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                roleData.project_id,
                roleData.role_name,
                roleData.description,
                roleData.required_skills || [],
                roleData.minimum_experience_level,
                roleData.start_date,
                roleData.end_date,
                roleData.planned_allocation_percentage,
                roleData.estimated_hours,
                roleData.hourly_rate,
                roleData.max_assignments || 1
            ];
            const result = await this.db.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error adding project role:', error);
            throw new api_error_1.ApiError(500, 'Failed to add project role');
        }
    }
    async getProjectRoles(projectId) {
        try {
            const query = `
        SELECT 
          pr.*,
          CASE 
            WHEN pr.current_assignments >= pr.max_assignments THEN true 
            ELSE false 
          END as is_filled,
          (
            SELECT json_agg(
              json_build_object('id', s.id, 'name', s.name, 'category', s.category)
            )
            FROM skills s
            WHERE s.id = ANY(pr.required_skills)
          ) as skills_details
        FROM project_roles pr
        WHERE pr.project_id = $1
        ORDER BY pr.created_at
      `;
            const result = await this.db.query(query, [projectId]);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching project roles:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch project roles');
        }
    }
    async getSkillRequirements(projectId) {
        try {
            const project = await this.getProjectById(projectId);
            if (!project) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            const roles = await this.getProjectRoles(projectId);
            if (roles.length === 0) {
                return {
                    totalRequirements: 0,
                    skillBreakdown: [],
                    overallStatus: {
                        fulfillmentRate: 100,
                        criticalGaps: 0,
                        readinessScore: 100
                    }
                };
            }
            const skillMap = new Map();
            for (const role of roles) {
                const skillsDetails = role.skills_details || [];
                const minimumLevel = role.minimum_experience_level || 'intermediate';
                skillsDetails.forEach((skill) => {
                    const skillKey = skill.id;
                    if (!skillMap.has(skillKey)) {
                        skillMap.set(skillKey, {
                            skillId: skill.id,
                            skillName: skill.name,
                            category: skill.category,
                            minimumLevel: minimumLevel,
                            requiredCount: 0,
                            currentlyFilled: 0,
                            roles: [],
                            priority: this.determineSkillPriority(minimumLevel, role.role_name)
                        });
                    }
                    const skillReq = skillMap.get(skillKey);
                    skillReq.requiredCount += (role.max_assignments || 1);
                    skillReq.roles.push(role.role_name);
                    skillReq.currentlyFilled += role.current_assignments || 0;
                });
            }
            const skillBreakdown = Array.from(skillMap.values());
            const totalRequirements = skillBreakdown.length;
            const filledRequirements = skillBreakdown.filter(s => s.currentlyFilled >= s.requiredCount).length;
            const criticalGaps = skillBreakdown.filter(s => s.priority === 'critical' && s.currentlyFilled < s.requiredCount).length;
            const fulfillmentRate = totalRequirements > 0 ? Math.round((filledRequirements / totalRequirements) * 100) : 100;
            const readinessScore = Math.max(0, fulfillmentRate - (criticalGaps * 15));
            return {
                totalRequirements,
                skillBreakdown,
                overallStatus: {
                    fulfillmentRate,
                    criticalGaps,
                    readinessScore
                }
            };
        }
        catch (error) {
            console.error('Error getting skill requirements:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to get skill requirements');
        }
    }
    determineSkillPriority(minimumLevel, roleName) {
        const isLeadRole = roleName.toLowerCase().includes('lead') || roleName.toLowerCase().includes('manager');
        const isArchitectRole = roleName.toLowerCase().includes('architect');
        const isCoreRole = roleName.toLowerCase().includes('developer') || roleName.toLowerCase().includes('engineer');
        switch (minimumLevel.toLowerCase()) {
            case 'expert':
            case 'master':
                return isLeadRole || isArchitectRole ? 'critical' : 'high';
            case 'senior':
            case 'advanced':
                return isLeadRole ? 'high' : isCoreRole ? 'medium' : 'high';
            case 'intermediate':
            case 'mid':
                return isCoreRole ? 'medium' : 'low';
            case 'junior':
            case 'beginner':
            default:
                return 'low';
        }
    }
    async getResourceRecommendations(projectId, options = {}) {
        try {
            const project = await this.getProjectById(projectId);
            if (!project) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            const roles = await this.getProjectRoles(projectId);
            if (roles.length === 0) {
                throw new api_error_1.ApiError(400, 'No roles defined for this project');
            }
            const roleRequirements = roles.map(role => ({
                roleTitle: role.role_name,
                skillRequirements: (role.skills_details || []).map((skill) => ({
                    skillId: skill.id,
                    skillName: skill.name,
                    category: skill.category,
                    minimumProficiency: role.minimum_experience_level === 'junior' ? 2 :
                        role.minimum_experience_level === 'mid' ? 3 :
                            role.minimum_experience_level === 'senior' ? 4 : 5,
                    weight: 8,
                    isRequired: true
                })),
                experienceLevel: role.minimum_experience_level,
                count: role.max_assignments || 1,
                budget: role.hourly_rate ? role.estimated_hours * role.hourly_rate : undefined,
                preferredDepartments: options.preferredDepartments
            }));
            const request = {
                projectId: projectId.toString(),
                roleRequirements,
                projectConstraints: {
                    startDate: new Date(project.start_date),
                    endDate: project.end_date ? new Date(project.end_date) : undefined,
                    totalBudget: options.budgetConstraints || project.budget,
                    maxTeamSize: roles.reduce((sum, role) => sum + (role.max_assignments || 1), 0)
                },
                preferences: {
                    prioritizeSkillMatch: true,
                    prioritizeTeamChemistry: options.includeTeamChemistry !== false,
                    allowOverqualified: true
                }
            };
            const recommendationEngine = await resource_recommendation_engine_service_1.ResourceRecommendationEngine.create();
            const recommendations = await recommendationEngine.generateRecommendations(request, {
                maxRecommendations: options.maxRecommendations || 3,
                includeAlternatives: true,
                detailedAnalysis: true
            });
            return recommendations;
        }
        catch (error) {
            console.error('Error getting resource recommendations:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to generate resource recommendations');
        }
    }
    async findRoleMatches(projectId, roleId, options = {}) {
        try {
            const project = await this.getProjectById(projectId);
            if (!project) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            const roleQuery = `
        SELECT 
          pr.*,
          (
            SELECT json_agg(
              json_build_object(
                'id', s.id, 
                'name', s.name, 
                'category', s.category
              )
            )
            FROM skills s
            WHERE s.id = ANY(pr.required_skills)
          ) as skills_details
        FROM project_roles pr
        WHERE pr.id = $1 AND pr.project_id = $2
      `;
            const roleResult = await this.db.query(roleQuery, [roleId, projectId]);
            if (roleResult.rows.length === 0) {
                throw new api_error_1.ApiError(404, 'Role not found for this project');
            }
            const role = roleResult.rows[0];
            const criteria = {
                requiredSkills: (role.skills_details || []).map((skill) => ({
                    skillId: skill.id,
                    skillName: skill.name,
                    category: skill.category,
                    minimumProficiency: role.minimum_experience_level === 'junior' ? 2 :
                        role.minimum_experience_level === 'mid' ? 3 :
                            role.minimum_experience_level === 'senior' ? 4 : 5,
                    weight: 8,
                    isRequired: true
                })),
                projectId: projectId.toString(),
                roleTitle: role.role_name,
                experienceLevel: role.minimum_experience_level,
                startDate: new Date(project.start_date),
                endDate: project.end_date ? new Date(project.end_date) : undefined
            };
            const skillMatcher = await skill_matcher_service_1.SkillMatcherService.create();
            const matches = await skillMatcher.findResourceMatches(criteria, {
                maxResults: options.maxResults || 10,
                minimumMatchScore: options.minimumMatchScore || 30,
                includeBenchWarming: options.includeBenchWarming
            });
            return matches;
        }
        catch (error) {
            console.error('Error finding role matches:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to find role matches');
        }
    }
    async getProjectSkillGaps(projectId) {
        try {
            const project = await this.getProjectById(projectId);
            if (!project) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            const roles = await this.getProjectRoles(projectId);
            const skillMatcher = await skill_matcher_service_1.SkillMatcherService.create();
            const overallGaps = [];
            const roleGaps = [];
            let totalRequiredSkills = 0;
            let totalCoveredSkills = 0;
            let criticalGaps = 0;
            for (const role of roles) {
                const roleSkills = role.skills_details || [];
                totalRequiredSkills += roleSkills.length;
                const criteria = {
                    requiredSkills: roleSkills.map((skill) => ({
                        skillId: skill.id,
                        skillName: skill.name,
                        category: skill.category,
                        minimumProficiency: 3,
                        weight: 8,
                        isRequired: true
                    })),
                    projectId: projectId.toString(),
                    roleTitle: role.role_name
                };
                const statistics = await skillMatcher.getMatchStatistics(criteria);
                const roleCriticalGaps = [];
                const recommendations = [];
                for (const skillGap of statistics.topSkillGaps) {
                    if (skillGap.gap > 0) {
                        const gapInfo = {
                            skillName: skillGap.skillName,
                            category: 'Unknown',
                            requiredLevel: 3,
                            availableLevel: Math.max(0, 3 - skillGap.gap),
                            gap: skillGap.gap,
                            priority: skillGap.gap >= 1 ? 'critical' : skillGap.gap >= 0.5 ? 'high' : 'medium'
                        };
                        overallGaps.push(gapInfo);
                        if (gapInfo.priority === 'critical') {
                            roleCriticalGaps.push(skillGap.skillName);
                            criticalGaps++;
                        }
                    }
                    else {
                        totalCoveredSkills++;
                    }
                }
                if (roleCriticalGaps.length > 0) {
                    recommendations.push(`Critical hiring needed for: ${roleCriticalGaps.join(', ')}`);
                }
                roleGaps.push({
                    roleTitle: role.role_name,
                    gapsCount: roleCriticalGaps.length,
                    criticalGaps: roleCriticalGaps,
                    recommendations
                });
            }
            const coveragePercentage = totalRequiredSkills > 0 ?
                Math.round((totalCoveredSkills / totalRequiredSkills) * 100) : 100;
            const riskLevel = criticalGaps >= 3 ? 'high' :
                criticalGaps >= 1 ? 'medium' : 'low';
            return {
                overallGaps,
                roleGaps,
                summary: {
                    totalGaps: overallGaps.length,
                    criticalGaps,
                    coveragePercentage,
                    riskLevel
                }
            };
        }
        catch (error) {
            console.error('Error analyzing project skill gaps:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to analyze project skill gaps');
        }
    }
}
exports.ProjectService = ProjectService;
//# sourceMappingURL=project.service.js.map