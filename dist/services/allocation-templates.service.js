"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationTemplatesService = void 0;
const database_service_1 = require("../database/database.service");
const api_error_1 = require("../utils/api-error");
const resource_assignment_service_1 = require("./resource-assignment.service");
class AllocationTemplatesService {
    constructor() {
        this.db = database_service_1.DatabaseService.getInstance();
        this.assignmentService = new resource_assignment_service_1.ResourceAssignmentService();
    }
    async createTemplate(templateData, createdBy) {
        try {
            if (!templateData.name || !templateData.category) {
                throw new api_error_1.ApiError(400, 'Template name and category are required');
            }
            if (templateData.name.length < 3) {
                throw new api_error_1.ApiError(400, 'Template name must be at least 3 characters long');
            }
            const duplicateCheck = await this.db.query('SELECT id FROM allocation_templates WHERE name = $1 AND created_by = $2 AND status != $3', [templateData.name, createdBy, 'archived']);
            if (duplicateCheck.rows.length > 0) {
                throw new api_error_1.ApiError(409, 'Template with this name already exists');
            }
            const query = `
        INSERT INTO allocation_templates (
          name, description, category, tags, created_by, visibility, 
          default_duration_weeks, default_budget_range, default_priority, organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
            const values = [
                templateData.name,
                templateData.description,
                templateData.category,
                templateData.tags || [],
                createdBy,
                templateData.visibility || 'private',
                templateData.default_duration_weeks,
                templateData.default_budget_range,
                templateData.default_priority || 'medium',
                templateData.organization_id
            ];
            const result = await this.db.query(query, values);
            if (!result.rows.length) {
                throw new api_error_1.ApiError(500, 'Failed to create template');
            }
            return await this.getTemplateById(result.rows[0].id, createdBy);
        }
        catch (error) {
            console.error('Error creating template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to create template');
        }
    }
    async getTemplates(filters, userId, pagination) {
        try {
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            whereConditions.push(`(
        visibility = 'public' OR 
        (visibility = 'organization' AND organization_id IS NOT NULL) OR 
        (visibility = 'private' AND created_by = $${paramIndex})
      )`);
            queryParams.push(userId);
            paramIndex++;
            whereConditions.push(`status = $${paramIndex}`);
            queryParams.push(filters.status || 'active');
            paramIndex++;
            if (filters.category) {
                whereConditions.push(`category = $${paramIndex}`);
                queryParams.push(filters.category);
                paramIndex++;
            }
            if (filters.search) {
                whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
                queryParams.push(`%${filters.search}%`);
                paramIndex++;
            }
            if (filters.tags && filters.tags.length > 0) {
                whereConditions.push(`tags && $${paramIndex}`);
                queryParams.push(filters.tags);
                paramIndex++;
            }
            if (filters.created_by) {
                whereConditions.push(`created_by = $${paramIndex}`);
                queryParams.push(filters.created_by);
                paramIndex++;
            }
            const whereClause = whereConditions.join(' AND ');
            const countQuery = `SELECT COUNT(*) FROM allocation_templates WHERE ${whereClause}`;
            const countResult = await this.db.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);
            const offset = (pagination.page - 1) * pagination.limit;
            const totalPages = Math.ceil(total / pagination.limit);
            const query = `
        SELECT 
          t.*,
          CASE 
            WHEN e.id IS NOT NULL THEN e.first_name || ' ' || e.last_name
            ELSE 'Unknown Creator'
          END as creator_name,
          COALESCE(role_count.total_roles, 0) as total_roles,
          COALESCE(milestone_count.total_milestones, 0) as total_milestones,
          COALESCE(t.usage_count, 0) as usage_count
        FROM allocation_templates t
        LEFT JOIN employees e ON t.created_by = e.id
        LEFT JOIN (
          SELECT template_id, COUNT(*) as total_roles
          FROM template_roles
          GROUP BY template_id
        ) role_count ON t.id = role_count.template_id
        LEFT JOIN (
          SELECT template_id, COUNT(*) as total_milestones
          FROM template_milestones
          GROUP BY template_id
        ) milestone_count ON t.id = milestone_count.template_id
        WHERE ${whereClause}
        ORDER BY t.usage_count DESC, t.last_used_at DESC NULLS LAST, t.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(pagination.limit, offset);
            const result = await this.db.query(query, queryParams);
            return {
                templates: result.rows,
                pagination: {
                    currentPage: pagination.page,
                    totalPages,
                    totalItems: total,
                    limit: pagination.limit,
                    hasNext: pagination.page < totalPages,
                    hasPrev: pagination.page > 1
                },
                total
            };
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch templates');
        }
    }
    async getTemplateById(templateId, userId) {
        try {
            const templateQuery = `
        SELECT 
          t.*,
          CASE 
            WHEN e.id IS NOT NULL THEN e.first_name || ' ' || e.last_name
            ELSE 'Unknown Creator'
          END as creator_name,
          e.email as creator_email
        FROM allocation_templates t
        LEFT JOIN employees e ON t.created_by = e.id
        WHERE t.id = $1 
          AND (
            t.visibility = 'public' OR 
            (t.visibility = 'organization' AND t.organization_id IS NOT NULL) OR 
            (t.visibility = 'private' AND t.created_by = $2)
          )
      `;
            const templateResult = await this.db.query(templateQuery, [templateId, userId]);
            if (!templateResult.rows.length) {
                throw new api_error_1.ApiError(404, 'Template not found or access denied');
            }
            const template = templateResult.rows[0];
            const rolesQuery = `
        SELECT 
          tr.*,
          CASE 
            WHEN tr.required_skills IS NOT NULL AND array_length(tr.required_skills, 1) > 0 THEN
              (
                SELECT json_agg(
                  json_build_object('id', s.id, 'name', s.name, 'category', s.category)
                )
                FROM skills s
                WHERE s.id = ANY(tr.required_skills)
              )
            ELSE '[]'::json
          END as skills_details,
          CASE 
            WHEN tr.preferred_skills IS NOT NULL AND array_length(tr.preferred_skills, 1) > 0 THEN
              (
                SELECT json_agg(
                  json_build_object('id', s.id, 'name', s.name, 'category', s.category)
                )
                FROM skills s
                WHERE s.id = ANY(tr.preferred_skills)
              )
            ELSE '[]'::json
          END as preferred_skills_details
        FROM template_roles tr
        WHERE tr.template_id = $1
        ORDER BY tr.display_order, tr.created_at
      `;
            const rolesResult = await this.db.query(rolesQuery, [templateId]);
            const milestonesQuery = `
        SELECT * FROM template_milestones
        WHERE template_id = $1
        ORDER BY week_offset, display_order, created_at
      `;
            const milestonesResult = await this.db.query(milestonesQuery, [templateId]);
            const usageQuery = `
        SELECT 
          COUNT(*) as total_uses,
          AVG(success_rating) as avg_rating,
          COUNT(CASE WHEN success_rating >= 4 THEN 1 END) as positive_ratings,
          MAX(used_at) as last_used
        FROM template_usage_history
        WHERE template_id = $1
      `;
            const usageResult = await this.db.query(usageQuery, [templateId]);
            const usage = usageResult.rows[0];
            return {
                ...template,
                roles: rolesResult.rows,
                milestones: milestonesResult.rows,
                usage_stats: {
                    total_uses: parseInt(usage.total_uses || 0),
                    average_rating: parseFloat(usage.avg_rating || 0),
                    positive_ratings: parseInt(usage.positive_ratings || 0),
                    last_used: usage.last_used
                }
            };
        }
        catch (error) {
            console.error('Error fetching template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to fetch template');
        }
    }
    async updateTemplate(templateId, updateData, userId) {
        try {
            const existingTemplate = await this.getTemplateById(templateId, userId);
            if (existingTemplate.created_by !== userId) {
                throw new api_error_1.ApiError(403, 'Access denied: You can only update your own templates');
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
                return existingTemplate;
            }
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            const query = `
        UPDATE allocation_templates 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            queryParams.push(templateId);
            const result = await this.db.query(query, queryParams);
            return await this.getTemplateById(result.rows[0].id, userId);
        }
        catch (error) {
            console.error('Error updating template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to update template');
        }
    }
    async deleteTemplate(templateId, userId) {
        try {
            const template = await this.getTemplateById(templateId, userId);
            if (template.created_by !== userId) {
                throw new api_error_1.ApiError(403, 'Access denied: You can only delete your own templates');
            }
            const query = `
        UPDATE allocation_templates 
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
            const result = await this.db.query(query, [templateId]);
            if (result.rowCount === 0) {
                throw new api_error_1.ApiError(404, 'Template not found');
            }
        }
        catch (error) {
            console.error('Error deleting template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to delete template');
        }
    }
    async addTemplateRole(templateId, roleData, userId) {
        try {
            await this.getTemplateById(templateId, userId);
            const query = `
        INSERT INTO template_roles (
          template_id, role_name, description, required_skills, minimum_experience_level,
          preferred_skills, planned_allocation_percentage, estimated_hours_per_week,
          duration_weeks, hourly_rate_range, max_assignments, is_critical,
          can_be_remote, display_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
            const values = [
                templateId,
                roleData.role_name,
                roleData.description,
                roleData.required_skills || [],
                roleData.minimum_experience_level || 'junior',
                roleData.preferred_skills || [],
                roleData.planned_allocation_percentage,
                roleData.estimated_hours_per_week,
                roleData.duration_weeks,
                roleData.hourly_rate_range,
                roleData.max_assignments || 1,
                roleData.is_critical || false,
                roleData.can_be_remote !== false,
                roleData.display_order || 0
            ];
            const result = await this.db.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error adding template role:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to add template role');
        }
    }
    async applyTemplateToProject(templateId, options, userId) {
        const client = await this.db.getClient();
        try {
            await client.query('BEGIN');
            const template = await this.getTemplateById(templateId, userId);
            if (!template) {
                throw new api_error_1.ApiError(404, 'Template not found');
            }
            const projectCheck = await client.query('SELECT * FROM projects WHERE id = $1', [options.project_id]);
            if (!projectCheck.rows.length) {
                throw new api_error_1.ApiError(404, 'Project not found');
            }
            const project = projectCheck.rows[0];
            const results = {
                template_applied: template.name,
                project_id: options.project_id,
                roles_created: [],
                assignments_created: [],
                milestones_created: []
            };
            for (const templateRole of template.roles) {
                if (options.skip_roles && options.skip_roles.includes(templateRole.role_name)) {
                    continue;
                }
                let roleData = { ...templateRole };
                if (options.customizations?.role_modifications?.[templateRole.id]) {
                    roleData = {
                        ...roleData,
                        ...options.customizations.role_modifications[templateRole.id]
                    };
                }
                const projectStartDate = new Date(project.start_date);
                const roleStartDate = new Date(projectStartDate);
                let roleEndDate = null;
                if (roleData.duration_weeks && options.scale_duration) {
                    const scaledDuration = Math.round(roleData.duration_weeks * options.scale_duration);
                    roleEndDate = new Date(roleStartDate);
                    roleEndDate.setDate(roleEndDate.getDate() + (scaledDuration * 7));
                }
                else if (roleData.duration_weeks) {
                    roleEndDate = new Date(roleStartDate);
                    roleEndDate.setDate(roleEndDate.getDate() + (roleData.duration_weeks * 7));
                }
                const projectRoleQuery = `
          INSERT INTO project_roles (
            project_id, role_name, description, required_skills, minimum_experience_level,
            start_date, end_date, planned_allocation_percentage, estimated_hours,
            hourly_rate, max_assignments
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
                const roleValues = [
                    options.project_id,
                    roleData.role_name,
                    roleData.description,
                    roleData.required_skills || [],
                    roleData.minimum_experience_level,
                    roleStartDate.toISOString().split('T')[0],
                    roleEndDate ? roleEndDate.toISOString().split('T')[0] : null,
                    roleData.planned_allocation_percentage,
                    roleData.estimated_hours_per_week ? Math.round(roleData.estimated_hours_per_week * (roleData.duration_weeks || 1)) : null,
                    roleData.hourly_rate_range ? roleData.hourly_rate_range[0] : null,
                    roleData.max_assignments || 1
                ];
                const projectRoleResult = await client.query(projectRoleQuery, roleValues);
                results.roles_created.push(projectRoleResult.rows[0]);
            }
            if (template.default_duration_weeks && options.scale_duration) {
                const scaledDuration = Math.round(template.default_duration_weeks * options.scale_duration);
                const projectStartDate = new Date(project.start_date);
                const newEndDate = new Date(projectStartDate);
                newEndDate.setDate(newEndDate.getDate() + (scaledDuration * 7));
                await client.query('UPDATE projects SET end_date = $1, estimated_hours = $2 WHERE id = $3', [
                    newEndDate.toISOString().split('T')[0],
                    template.roles.reduce((total, role) => total + (role.estimated_hours_per_week || 0) * (role.duration_weeks || 0), 0),
                    options.project_id
                ]);
            }
            await client.query(`UPDATE allocation_templates 
         SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP 
         WHERE id = $1`, [templateId]);
            await client.query(`INSERT INTO template_usage_history (
          template_id, project_id, used_by, customizations_applied
        ) VALUES ($1, $2, $3, $4)`, [
                templateId,
                options.project_id,
                userId,
                JSON.stringify(options.customizations || {})
            ]);
            await client.query('COMMIT');
            return results;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error applying template to project:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to apply template to project');
        }
        finally {
            client.release();
        }
    }
    async getPopularTemplates(limit = 10) {
        try {
            const query = `
        SELECT 
          t.*,
          e.first_name || ' ' || e.last_name as creator_name,
          COALESCE(t.usage_count, 0) as usage_count,
          COALESCE(AVG(uth.success_rating), 0) as avg_rating,
          COUNT(DISTINCT uth.project_id) as projects_count
        FROM allocation_templates t
        LEFT JOIN employees e ON t.created_by = e.id
        LEFT JOIN template_usage_history uth ON t.id = uth.template_id
        WHERE t.status = 'active' AND t.visibility IN ('public', 'organization')
        GROUP BY t.id, e.first_name, e.last_name
        ORDER BY t.usage_count DESC, avg_rating DESC
        LIMIT $1
      `;
            const result = await this.db.query(query, [limit]);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching popular templates:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch popular templates');
        }
    }
    async getTemplateCategories() {
        try {
            const query = `
        SELECT 
          category,
          COUNT(*) as template_count,
          AVG(usage_count) as avg_usage
        FROM allocation_templates
        WHERE status = 'active' AND visibility IN ('public', 'organization')
        GROUP BY category
        ORDER BY template_count DESC, avg_usage DESC
      `;
            const result = await this.db.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching template categories:', error);
            throw new api_error_1.ApiError(500, 'Failed to fetch template categories');
        }
    }
    async cloneTemplate(templateId, newName, userId) {
        const client = await this.db.getClient();
        try {
            await client.query('BEGIN');
            const originalTemplate = await this.getTemplateById(templateId, userId);
            const newTemplateData = {
                ...originalTemplate,
                name: newName,
                visibility: 'private',
                status: 'draft',
                parent_template_id: templateId
            };
            delete newTemplateData.id;
            delete newTemplateData.created_at;
            delete newTemplateData.updated_at;
            delete newTemplateData.usage_count;
            delete newTemplateData.last_used_at;
            const clonedTemplate = await this.createTemplate(newTemplateData, userId);
            for (const role of originalTemplate.roles) {
                const roleData = { ...role };
                delete roleData.id;
                delete roleData.created_at;
                await this.addTemplateRole(clonedTemplate.id, roleData, userId);
            }
            for (const milestone of originalTemplate.milestones || []) {
                const milestoneData = {
                    name: milestone.name,
                    description: milestone.description,
                    week_offset: milestone.week_offset,
                    duration_weeks: milestone.duration_weeks,
                    required_roles: milestone.required_roles,
                    deliverables: milestone.deliverables,
                    depends_on: milestone.depends_on,
                    is_critical: milestone.is_critical,
                    display_order: milestone.display_order
                };
                await client.query(`INSERT INTO template_milestones (
            template_id, name, description, week_offset, duration_weeks,
            required_roles, deliverables, depends_on, is_critical, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    clonedTemplate.id, milestoneData.name, milestoneData.description,
                    milestoneData.week_offset, milestoneData.duration_weeks,
                    milestoneData.required_roles || [], milestoneData.deliverables || [],
                    milestoneData.depends_on || [], milestoneData.is_critical || false,
                    milestoneData.display_order || 0
                ]);
            }
            await client.query('COMMIT');
            return await this.getTemplateById(clonedTemplate.id, userId);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error cloning template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to clone template');
        }
        finally {
            client.release();
        }
    }
    async rateTemplate(templateId, projectId, rating, feedback, userId) {
        try {
            if (rating < 1 || rating > 5) {
                throw new api_error_1.ApiError(400, 'Rating must be between 1 and 5');
            }
            const query = `
        UPDATE template_usage_history
        SET success_rating = $1, feedback = $2
        WHERE template_id = $3 AND project_id = $4 AND used_by = $5
      `;
            const result = await this.db.query(query, [rating, feedback, templateId, projectId, userId]);
            if (result.rowCount === 0) {
                throw new api_error_1.ApiError(404, 'Template usage record not found');
            }
        }
        catch (error) {
            console.error('Error rating template:', error);
            if (error instanceof api_error_1.ApiError) {
                throw error;
            }
            throw new api_error_1.ApiError(500, 'Failed to rate template');
        }
    }
}
exports.AllocationTemplatesService = AllocationTemplatesService;
//# sourceMappingURL=allocation-templates.service.js.map