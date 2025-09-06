import { Pool } from 'pg';
import { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectWithDetails,
  ProjectStatus,
  ProjectPriority,
  ProjectFilters,
  PaginatedResponse,
  DatabaseError
} from '../types';

export class ProjectModel {
  private static pool: Pool;

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  static async create(input: CreateProjectInput): Promise<Project> {
    try {
      const query = `
        INSERT INTO projects (name, description, status, priority, client_id, start_date, end_date, estimated_hours, budget, manager_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        input.name,
        input.description || null,
        input.status,
        input.priority,
        input.clientId || null,
        input.startDate,
        input.endDate,
        input.estimatedHours,
        input.budget || null,
        input.managerId,
        true
      ];

      const result = await this.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Project with name '${input.name}' already exists`);
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new DatabaseError('Invalid manager ID or client ID');
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects 
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  static async findByIdWithDetails(id: string): Promise<ProjectWithDetails | null> {
    const query = `
      SELECT 
        p.*,
        json_build_object(
          'id', m.id,
          'firstName', m.first_name,
          'lastName', m.last_name,
          'email', m.email,
          'position', m.position
        ) AS manager,
        COALESCE(
          json_agg(
            CASE 
              WHEN ra.id IS NOT NULL THEN
                json_build_object(
                  'id', ra.id,
                  'projectId', ra.project_id,
                  'employeeId', ra.employee_id,
                  'allocatedHours', ra.allocated_hours,
                  'hourlyRate', ra.hourly_rate,
                  'roleOnProject', ra.role_on_project,
                  'startDate', ra.start_date,
                  'endDate', ra.end_date,
                  'actualHours', ra.actual_hours,
                  'notes', ra.notes,
                  'isActive', ra.is_active,
                  'employee', json_build_object(
                    'id', e.id,
                    'firstName', e.first_name,
                    'lastName', e.last_name,
                    'email', e.email,
                    'position', e.position
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE ra.id IS NOT NULL),
          '[]'::json
        ) AS allocations,
        COALESCE(
          json_agg(
            CASE 
              WHEN sr.id IS NOT NULL THEN
                json_build_object(
                  'id', sr.id,
                  'projectId', sr.project_id,
                  'skillId', sr.skill_id,
                  'minimumProficiency', sr.minimum_proficiency,
                  'requiredCount', sr.required_count,
                  'fulfilled', sr.fulfilled,
                  'priority', sr.priority,
                  'skill', json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'description', s.description,
                    'category', s.category
                  )
                )
              ELSE NULL
            END
          ) FILTER (WHERE sr.id IS NOT NULL),
          '[]'::json
        ) AS skill_requirements
      FROM projects p
      JOIN employees m ON p.manager_id = m.id AND m.is_active = true
      LEFT JOIN resource_allocations ra ON p.id = ra.project_id AND ra.is_active = true
      LEFT JOIN employees e ON ra.employee_id = e.id AND e.is_active = true
      LEFT JOIN skill_requirements sr ON p.id = sr.project_id
      LEFT JOIN skills s ON sr.skill_id = s.id AND s.is_active = true
      WHERE p.id = $1 AND p.is_active = true
      GROUP BY p.id, m.id, m.first_name, m.last_name, m.email, m.position
    `;

    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const project = this.mapRow(row);

    return {
      ...project,
      manager: row.manager,
      allocations: row.allocations || [],
      skillRequirements: row.skill_requirements || []
    } as ProjectWithDetails;
  }

  static async findAll(
    filters: ProjectFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<Project>> {
    let whereConditions = ['p.is_active = true'];
    const values: any[] = [];

    if (filters.status) {
      values.push(filters.status);
      whereConditions.push(`p.status = $${values.length}`);
    }

    if (filters.priority) {
      values.push(filters.priority);
      whereConditions.push(`p.priority = $${values.length}`);
    }

    if (filters.managerId) {
      values.push(filters.managerId);
      whereConditions.push(`p.manager_id = $${values.length}`);
    }

    if (filters.clientId) {
      values.push(filters.clientId);
      whereConditions.push(`p.client_id = $${values.length}`);
    }

    if (filters.startDateFrom) {
      values.push(filters.startDateFrom);
      whereConditions.push(`p.start_date >= $${values.length}`);
    }

    if (filters.startDateTo) {
      values.push(filters.startDateTo);
      whereConditions.push(`p.start_date <= $${values.length}`);
    }

    if (filters.endDateFrom) {
      values.push(filters.endDateFrom);
      whereConditions.push(`p.end_date >= $${values.length}`);
    }

    if (filters.endDateTo) {
      values.push(filters.endDateTo);
      whereConditions.push(`p.end_date <= $${values.length}`);
    }

    if (filters.isActive !== undefined) {
      values.push(filters.isActive);
      whereConditions.push(`p.is_active = $${values.length}`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM projects p
      WHERE ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT DISTINCT p.*
      FROM projects p
      WHERE ${whereClause}
      ORDER BY p.priority DESC, p.start_date ASC, p.name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataResult = await this.pool.query(dataQuery, values);
    const projects = dataResult.rows.map(row => this.mapRow(row));

    const totalPages = Math.ceil(total / limit);

    return {
      data: projects,
      total,
      page,
      limit,
      totalPages
    };
  }

  static async update(id: string, updates: UpdateProjectInput): Promise<Project> {
    const updateFields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      values.push(updates.name);
      updateFields.push(`name = $${values.length}`);
    }

    if (updates.description !== undefined) {
      values.push(updates.description);
      updateFields.push(`description = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      updateFields.push(`status = $${values.length}`);
    }

    if (updates.priority !== undefined) {
      values.push(updates.priority);
      updateFields.push(`priority = $${values.length}`);
    }

    if (updates.clientId !== undefined) {
      values.push(updates.clientId);
      updateFields.push(`client_id = $${values.length}`);
    }

    if (updates.startDate !== undefined) {
      values.push(updates.startDate);
      updateFields.push(`start_date = $${values.length}`);
    }

    if (updates.endDate !== undefined) {
      values.push(updates.endDate);
      updateFields.push(`end_date = $${values.length}`);
    }

    if (updates.estimatedHours !== undefined) {
      values.push(updates.estimatedHours);
      updateFields.push(`estimated_hours = $${values.length}`);
    }

    if (updates.actualHours !== undefined) {
      values.push(updates.actualHours);
      updateFields.push(`actual_hours = $${values.length}`);
    }

    if (updates.budget !== undefined) {
      values.push(updates.budget);
      updateFields.push(`budget = $${values.length}`);
    }

    if (updates.costToDate !== undefined) {
      values.push(updates.costToDate);
      updateFields.push(`cost_to_date = $${values.length}`);
    }

    if (updates.managerId !== undefined) {
      values.push(updates.managerId);
      updateFields.push(`manager_id = $${values.length}`);
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
      UPDATE projects 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} AND is_active = true
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Project not found or already deleted');
      }

      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Project with name '${updates.name}' already exists`);
      }
      if (error.code === '23503') { // Foreign key constraint violation
        throw new DatabaseError('Invalid manager ID or client ID');
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<Project> {
    const query = `
      UPDATE projects 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Project not found or already deleted');
    }

    return this.mapRow(result.rows[0]);
  }

  static async getProjectStatistics(): Promise<{
    totalProjects: number;
    activeProjects: number;
    projectsByStatus: Record<ProjectStatus, number>;
    averageEstimatedHours: number;
    averageCompletionRate: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status IN ('planning', 'active')) as active_projects,
        json_object_agg(
          status, 
          status_count
        ) as projects_by_status,
        AVG(estimated_hours) as avg_estimated_hours,
        AVG(
          CASE 
            WHEN actual_hours IS NOT NULL AND estimated_hours > 0 
            THEN actual_hours::numeric / estimated_hours::numeric 
            ELSE NULL 
          END
        ) as avg_completion_rate
      FROM (
        SELECT 
          status,
          estimated_hours,
          actual_hours,
          COUNT(*) OVER (PARTITION BY status) as status_count
        FROM projects 
        WHERE is_active = true
      ) p
    `;

    const result = await this.pool.query(query);
    const row = result.rows[0];

    return {
      totalProjects: parseInt(row.total_projects) || 0,
      activeProjects: parseInt(row.active_projects) || 0,
      projectsByStatus: JSON.parse(row.projects_by_status) || {},
      averageEstimatedHours: parseFloat(row.avg_estimated_hours) || 0,
      averageCompletionRate: parseFloat(row.avg_completion_rate) || 0
    };
  }

  static async getResourceAllocationSummary(projectId: string): Promise<Array<{
    employeeId: string;
    employeeName: string;
    allocatedHours: number;
    actualHours: number;
    hourlyRate: number;
    totalCost: number;
  }>> {
    const query = `
      SELECT 
        e.id as employee_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        ra.allocated_hours,
        ra.actual_hours,
        ra.hourly_rate,
        (COALESCE(ra.actual_hours, ra.allocated_hours) * COALESCE(ra.hourly_rate, 0)) as total_cost
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.project_id = $1 AND ra.is_active = true AND e.is_active = true
      ORDER BY total_cost DESC
    `;

    const result = await this.pool.query(query, [projectId]);
    
    return result.rows.map(row => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      allocatedHours: parseFloat(row.allocated_hours) || 0,
      actualHours: parseFloat(row.actual_hours) || 0,
      hourlyRate: parseFloat(row.hourly_rate) || 0,
      totalCost: parseFloat(row.total_cost) || 0
    }));
  }

  static async getProjectTimeline(projectId: string): Promise<Array<{
    date: Date;
    milestone: string;
    description: string;
    completed: boolean;
  }>> {
    // This would be extended with a project_milestones table in a full implementation
    const query = `
      SELECT 
        ra.start_date as date,
        'Resource Allocation Start' as milestone,
        CONCAT(e.first_name, ' ', e.last_name, ' - ', ra.role_on_project) as description,
        ra.actual_hours IS NOT NULL as completed
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.project_id = $1 AND ra.is_active = true
      
      UNION ALL
      
      SELECT 
        ra.end_date as date,
        'Resource Allocation End' as milestone,
        CONCAT(e.first_name, ' ', e.last_name, ' - ', ra.role_on_project) as description,
        ra.actual_hours IS NOT NULL as completed
      FROM resource_allocations ra
      JOIN employees e ON ra.employee_id = e.id
      WHERE ra.project_id = $1 AND ra.is_active = true
      
      ORDER BY date ASC
    `;

    const result = await this.pool.query(query, [projectId]);
    
    return result.rows.map(row => ({
      date: row.date,
      milestone: row.milestone,
      description: row.description,
      completed: row.completed
    }));
  }

  private static mapRow(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as ProjectStatus,
      priority: row.priority as ProjectPriority,
      clientId: row.client_id,
      startDate: row.start_date,
      endDate: row.end_date,
      estimatedHours: parseFloat(row.estimated_hours) || 0,
      actualHours: row.actual_hours ? parseFloat(row.actual_hours) : undefined,
      budget: row.budget ? parseFloat(row.budget) : undefined,
      costToDate: row.cost_to_date ? parseFloat(row.cost_to_date) : undefined,
      managerId: row.manager_id,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}