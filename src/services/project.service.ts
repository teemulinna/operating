import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
// import { logger } from '../utils/logger';

interface ProjectData {
  name: string;
  description?: string;
  client_name?: string;
  start_date: string;
  end_date?: string;
  status?: string;
  priority?: string;
  budget?: number;
  estimated_hours?: number;
}

interface ProjectRoleData {
  project_id: number;
  role_name: string;
  description?: string;
  required_skills?: string[];
  minimum_experience_level?: string;
  start_date: string;
  end_date?: string;
  planned_allocation_percentage: number;
  estimated_hours?: number;
  hourly_rate?: number;
  max_assignments?: number;
}

interface ProjectFilters {
  status?: string;
  priority?: string;
  clientName?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

export class ProjectService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async createProject(projectData: ProjectData): Promise<any> {
    try {
      // Validate required fields
      if (!projectData.name || !projectData.start_date) {
        throw new ApiError(400, 'Project name and start date are required');
      }

      // Validate date logic
      if (projectData.end_date && projectData.start_date >= projectData.end_date) {
        throw new ApiError(400, 'End date must be after start date');
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
        projectData.name,
        projectData.description,
        projectData.client_name,
        projectData.start_date,
        projectData.end_date,
        projectData.status || 'planning',
        projectData.priority || 'medium',
        projectData.budget,
        projectData.estimated_hours
      ];

      const result = await this.db.query(query, values);

      if (!result.rows.length) {
        throw new ApiError(500, 'Failed to create project');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error creating project:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to create project');
    }
  }

  async getProjects(filters: ProjectFilters, pagination: PaginationParams): Promise<any> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
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

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM projects ${whereClause}`;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Calculate pagination
      const offset = (pagination.page - 1) * pagination.limit;
      const totalPages = Math.ceil(total / pagination.limit);

      // Get projects with roles and assignments summary
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
        ORDER BY ${pagination.sortBy} ${pagination.sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(pagination.limit, offset);

      const result = await this.db.query(query, queryParams);

      return {
        projects: result.rows,
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
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new ApiError(500, 'Failed to fetch projects');
    }
  }

  async getProjectById(projectId: number): Promise<any> {
    try {
      const query = `
        SELECT * FROM projects WHERE id = $1
      `;

      const result = await this.db.query(query, [projectId]);

      if (!result.rows.length) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new ApiError(500, 'Failed to fetch project');
    }
  }

  async updateProject(projectId: number, updateData: Partial<ProjectData>): Promise<any> {
    try {
      // Get current project
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject) {
        throw new ApiError(404, 'Project not found');
      }

      // Build update fields
      const updateFields: string[] = [];
      const queryParams: any[] = [];
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
      return result.rows[0];
    } catch (error) {
      console.error('Error updating project:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to update project');
    }
  }

  async deleteProject(projectId: number): Promise<void> {
    try {
      const query = `
        DELETE FROM projects WHERE id = $1
      `;

      const result = await this.db.query(query, [projectId]);

      if (result.rowCount === 0) {
        throw new ApiError(404, 'Project not found');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to delete project');
    }
  }

  async addProjectRole(roleData: ProjectRoleData): Promise<any> {
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
    } catch (error) {
      console.error('Error adding project role:', error);
      throw new ApiError(500, 'Failed to add project role');
    }
  }

  async getProjectRoles(projectId: number): Promise<any[]> {
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
    } catch (error) {
      console.error('Error fetching project roles:', error);
      throw new ApiError(500, 'Failed to fetch project roles');
    }
  }
}