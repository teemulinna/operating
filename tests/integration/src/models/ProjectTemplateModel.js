"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTemplateModel = void 0;
class ProjectTemplateModel {
    static initialize(pool) {
        this.pool = pool;
    }
    /**
     * Create a new template
     */
    static async create(templateData) {
        const client = await this.pool.connect();
        try {
            const query = `
        INSERT INTO project_templates (
          name, description, category, default_tasks, default_milestones, 
          default_budget, default_duration, required_skills, default_team_size,
          metadata, is_active, is_built_in, is_public, version, created_by_id,
          usage_count, average_rating, custom_fields
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        ) RETURNING *
      `;
            const values = [
                templateData.name,
                templateData.description,
                templateData.category,
                JSON.stringify(templateData.defaultTasks),
                JSON.stringify(templateData.defaultMilestones),
                templateData.defaultBudget,
                templateData.defaultDuration,
                JSON.stringify(templateData.requiredSkills),
                templateData.defaultTeamSize,
                templateData.metadata ? JSON.stringify(templateData.metadata) : null,
                templateData.isActive,
                templateData.isBuiltIn,
                templateData.isPublic,
                templateData.version,
                templateData.createdById,
                templateData.usageCount,
                templateData.averageRating,
                templateData.customFields ? JSON.stringify(templateData.customFields) : null
            ];
            const result = await client.query(query, values);
            return this.mapRowToTemplate(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Get template by ID
     */
    static async findById(templateId) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT pt.*, e.name as created_by_name, e.email as created_by_email
        FROM project_templates pt
        LEFT JOIN employees e ON pt.created_by_id = e.id::text
        WHERE pt.template_id = $1
      `;
            const result = await client.query(query, [templateId]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToTemplate(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Search templates with filters
     */
    static async search(filters, limit = 20, offset = 0) {
        const client = await this.pool.connect();
        try {
            let whereConditions = ['pt.is_active = true'];
            const values = [];
            let paramCount = 0;
            if (filters.category) {
                whereConditions.push(`pt.category = $${++paramCount}`);
                values.push(filters.category);
            }
            if (filters.isPublic !== undefined) {
                whereConditions.push(`pt.is_public = $${++paramCount}`);
                values.push(filters.isPublic);
            }
            if (filters.createdById) {
                whereConditions.push(`pt.created_by_id = $${++paramCount}`);
                values.push(filters.createdById);
            }
            if (filters.minRating) {
                whereConditions.push(`pt.average_rating >= $${++paramCount}`);
                values.push(filters.minRating);
            }
            if (filters.industry) {
                whereConditions.push(`pt.metadata->>'industry' = $${++paramCount}`);
                values.push(filters.industry);
            }
            if (filters.complexity) {
                whereConditions.push(`pt.metadata->>'complexity' = $${++paramCount}`);
                values.push(filters.complexity);
            }
            if (filters.methodology) {
                whereConditions.push(`pt.metadata->>'methodology' = $${++paramCount}`);
                values.push(filters.methodology);
            }
            if (filters.tags && filters.tags.length > 0) {
                const tagConditions = filters.tags.map(tag => {
                    whereConditions.push(`pt.metadata->'tags' @> $${++paramCount}`);
                    values.push(JSON.stringify([tag]));
                    return `pt.metadata->'tags' @> $${paramCount}`;
                });
            }
            if (filters.search) {
                whereConditions.push(`(
          pt.name ILIKE $${++paramCount} OR 
          pt.description ILIKE $${++paramCount} OR 
          pt.category ILIKE $${++paramCount}
        )`);
                const searchTerm = `%${filters.search}%`;
                values.push(searchTerm, searchTerm, searchTerm);
                paramCount += 2; // We added 3 parameters but already incremented once
            }
            const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
            // Count query
            const countQuery = `
        SELECT COUNT(*) as total
        FROM project_templates pt
        ${whereClause}
      `;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);
            // Main query
            const query = `
        SELECT pt.*, e.name as created_by_name, e.email as created_by_email
        FROM project_templates pt
        LEFT JOIN employees e ON pt.created_by_id = e.id::text
        ${whereClause}
        ORDER BY pt.usage_count DESC, pt.average_rating DESC, pt.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
            values.push(limit, offset);
            const result = await client.query(query, values);
            const templates = result.rows.map(row => this.mapRowToTemplate(row));
            return { templates, total };
        }
        finally {
            client.release();
        }
    }
    /**
     * Get popular templates
     */
    static async getPopular(limit = 10) {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT pt.*, e.name as created_by_name, e.email as created_by_email
        FROM project_templates pt
        LEFT JOIN employees e ON pt.created_by_id = e.id::text
        WHERE pt.is_active = true AND pt.is_public = true
        ORDER BY pt.usage_count DESC, pt.average_rating DESC
        LIMIT $1
      `;
            const result = await client.query(query, [limit]);
            return result.rows.map(row => this.mapRowToTemplate(row));
        }
        finally {
            client.release();
        }
    }
    /**
     * Get template categories
     */
    static async getCategories() {
        const client = await this.pool.connect();
        try {
            const query = `
        SELECT category, COUNT(*) as count
        FROM project_templates
        WHERE is_active = true
        GROUP BY category
        ORDER BY count DESC
      `;
            const result = await client.query(query);
            return result.rows.map(row => ({
                category: row.category,
                count: parseInt(row.count)
            }));
        }
        finally {
            client.release();
        }
    }
    /**
     * Update template
     */
    static async update(templateId, updates) {
        const client = await this.pool.connect();
        try {
            const setClause = [];
            const values = [];
            let paramCount = 0;
            // Build dynamic update query
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined && key !== 'templateId' && key !== 'createdAt') {
                    paramCount++;
                    switch (key) {
                        case 'defaultTasks':
                            setClause.push(`default_tasks = $${paramCount}`);
                            values.push(JSON.stringify(value));
                            break;
                        case 'defaultMilestones':
                            setClause.push(`default_milestones = $${paramCount}`);
                            values.push(JSON.stringify(value));
                            break;
                        case 'requiredSkills':
                            setClause.push(`required_skills = $${paramCount}`);
                            values.push(JSON.stringify(value));
                            break;
                        case 'metadata':
                            setClause.push(`metadata = $${paramCount}`);
                            values.push(JSON.stringify(value));
                            break;
                        case 'customFields':
                            setClause.push(`custom_fields = $${paramCount}`);
                            values.push(JSON.stringify(value));
                            break;
                        case 'defaultBudget':
                            setClause.push(`default_budget = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'defaultDuration':
                            setClause.push(`default_duration = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'defaultTeamSize':
                            setClause.push(`default_team_size = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'isActive':
                            setClause.push(`is_active = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'isBuiltIn':
                            setClause.push(`is_built_in = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'isPublic':
                            setClause.push(`is_public = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'usageCount':
                            setClause.push(`usage_count = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'averageRating':
                            setClause.push(`average_rating = $${paramCount}`);
                            values.push(value);
                            break;
                        case 'version':
                            setClause.push(`version = $${paramCount}`);
                            values.push(value);
                            break;
                        default:
                            setClause.push(`${this.camelToSnake(key)} = $${paramCount}`);
                            values.push(value);
                    }
                }
            });
            if (setClause.length === 0) {
                return this.findById(templateId);
            }
            // Always update the updated_at timestamp
            setClause.push(`updated_at = CURRENT_TIMESTAMP`);
            const query = `
        UPDATE project_templates 
        SET ${setClause.join(', ')}
        WHERE template_id = $${++paramCount}
        RETURNING *
      `;
            values.push(templateId);
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToTemplate(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete template (soft delete)
     */
    static async delete(templateId) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE project_templates 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $1
      `;
            const result = await client.query(query, [templateId]);
            return (result.rowCount || 0) > 0;
        }
        finally {
            client.release();
        }
    }
    /**
     * Increment usage count
     */
    static async incrementUsage(templateId) {
        const client = await this.pool.connect();
        try {
            const query = `
        UPDATE project_templates 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $1
      `;
            await client.query(query, [templateId]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Update rating
     */
    static async updateRating(templateId, newRating) {
        const client = await this.pool.connect();
        try {
            // Simple rating update - in production you'd want to track individual ratings
            const query = `
        UPDATE project_templates 
        SET average_rating = (average_rating * usage_count + $2) / (usage_count + 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE template_id = $1
        RETURNING *
      `;
            const result = await client.query(query, [templateId, newRating]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToTemplate(result.rows[0]);
        }
        finally {
            client.release();
        }
    }
    /**
     * Map database row to ProjectTemplate object
     */
    static mapRowToTemplate(row) {
        return {
            templateId: row.template_id,
            name: row.name,
            description: row.description,
            category: row.category,
            defaultTasks: row.default_tasks ? JSON.parse(row.default_tasks) : [],
            defaultMilestones: row.default_milestones ? JSON.parse(row.default_milestones) : [],
            defaultBudget: row.default_budget,
            defaultDuration: row.default_duration,
            requiredSkills: row.required_skills ? JSON.parse(row.required_skills) : [],
            defaultTeamSize: row.default_team_size,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            isActive: row.is_active,
            isBuiltIn: row.is_built_in,
            isPublic: row.is_public,
            version: row.version,
            createdById: row.created_by_id,
            usageCount: row.usage_count,
            averageRating: parseFloat(row.average_rating),
            customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
    /**
     * Convert camelCase to snake_case
     */
    static camelToSnake(str) {
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }
    /**
     * Helper methods for template business logic
     */
    static getEstimatedProjectDuration(template) {
        if (template.defaultDuration)
            return template.defaultDuration;
        // Calculate from tasks if no explicit duration
        const maxTaskEnd = template.defaultTasks.reduce((max, task) => {
            const taskEnd = task.duration + Math.max(...task.dependencies.map(dep => template.defaultTasks.find(t => t.id === dep)?.duration || 0), 0);
            return Math.max(max, taskEnd);
        }, 0);
        return maxTaskEnd || 30; // Default to 30 days
    }
    static getEstimatedBudget(template, hourlyRate = 100) {
        if (template.defaultBudget)
            return template.defaultBudget;
        // Calculate from tasks
        const totalHours = template.defaultTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
        return totalHours * hourlyRate;
    }
    static validateTemplate(template) {
        const errors = [];
        if (!template.name?.trim())
            errors.push('Template name is required');
        if (!template.description?.trim())
            errors.push('Template description is required');
        if (!template.category?.trim())
            errors.push('Template category is required');
        if (!template.defaultTasks?.length)
            errors.push('At least one default task is required');
        if ((template.defaultTeamSize || 0) < 1)
            errors.push('Default team size must be at least 1');
        // Validate tasks
        template.defaultTasks?.forEach((task, index) => {
            if (!task.name?.trim())
                errors.push(`Task ${index + 1}: name is required`);
            if (task.duration < 0)
                errors.push(`Task ${index + 1}: duration must be positive`);
            if (task.estimatedHours < 0)
                errors.push(`Task ${index + 1}: estimated hours must be positive`);
        });
        // Validate milestones
        template.defaultMilestones?.forEach((milestone, index) => {
            if (!milestone.name?.trim())
                errors.push(`Milestone ${index + 1}: name is required`);
            if (milestone.daysFromStart < 0)
                errors.push(`Milestone ${index + 1}: days from start must be positive`);
        });
        return errors;
    }
}
exports.ProjectTemplateModel = ProjectTemplateModel;
