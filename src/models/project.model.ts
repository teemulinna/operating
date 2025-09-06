import { Pool, QueryResult } from 'pg';
import { 
  Project, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectFilters,
  PaginatedResponse,
  ProjectStatistics,
  DatabaseError
} from '../types';

export class ProjectModel {
  private static pool: Pool;

  static initialize(pool: Pool): void {
    ProjectModel.pool = pool;
  }

  /**
   * Create a new project
   */
  static async create(input: CreateProjectInput): Promise<Project> {
    try {
      const query = `
        INSERT INTO projects (
          name, 
          description, 
          client_name, 
          status, 
          start_date, 
          end_date, 
          budget, 
          hourly_rate, 
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        input.name,
        input.description || null,
        input.clientName || null,
        input.status,
        input.startDate,
        input.endDate,
        input.budget || null,
        input.hourlyRate || null,
        input.createdBy || null
      ];

      const result = await ProjectModel.pool.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Project with name '${input.name}' already exists`);
      }
      if (error.code === '23514') { // Check constraint violation
        throw new DatabaseError('Invalid project data: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Find project by ID
   */
  static async findById(id: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects 
      WHERE id = $1
    `;

    const result = await ProjectModel.pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Find project by name
   */
  static async findByName(name: string): Promise<Project | null> {
    const query = `
      SELECT * FROM projects 
      WHERE name = $1
    `;

    const result = await ProjectModel.pool.query(query, [name]);
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Find all projects with filtering, pagination, and sorting
   */
  static async findAll(
    filters: ProjectFilters = {},
    page: number = 1,
    limit: number = 50,
    sortBy: string = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC'
  ): Promise<PaginatedResponse<Project>> {
    let whereConditions: string[] = [];
    const values: any[] = [];

    // Build WHERE conditions
    if (filters.status) {
      values.push(filters.status);
      whereConditions.push(`status = $${values.length}`);
    }

    if (filters.clientName) {
      values.push(filters.clientName);
      whereConditions.push(`client_name = $${values.length}`);
    }

    if (filters.startDateFrom) {
      values.push(filters.startDateFrom);
      whereConditions.push(`start_date >= $${values.length}`);
    }

    if (filters.startDateTo) {
      values.push(filters.startDateTo);
      whereConditions.push(`start_date <= $${values.length}`);
    }

    if (filters.endDateFrom) {
      values.push(filters.endDateFrom);
      whereConditions.push(`end_date >= $${values.length}`);
    }

    if (filters.endDateTo) {
      values.push(filters.endDateTo);
      whereConditions.push(`end_date <= $${values.length}`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['name', 'status', 'start_date', 'end_date', 'created_at', 'budget', 'client_name'];
    const validSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM projects
      ${whereClause}
    `;
    const countResult = await ProjectModel.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    values.push(limit, offset);
    const dataQuery = `
      SELECT *
      FROM projects
      ${whereClause}
      ORDER BY ${validSortBy} ${validSortOrder}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;

    const dataResult = await ProjectModel.pool.query(dataQuery, values);
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

  /**
   * Update project
   */
  static async update(id: string, updates: UpdateProjectInput): Promise<Project> {
    const updateFields: string[] = [];
    const values: any[] = [];

    // Build dynamic UPDATE query
    if (updates.name !== undefined) {
      values.push(updates.name);
      updateFields.push(`name = $${values.length}`);
    }

    if (updates.description !== undefined) {
      values.push(updates.description);
      updateFields.push(`description = $${values.length}`);
    }

    if (updates.clientName !== undefined) {
      values.push(updates.clientName);
      updateFields.push(`client_name = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      updateFields.push(`status = $${values.length}`);
    }

    if (updates.startDate !== undefined) {
      values.push(updates.startDate);
      updateFields.push(`start_date = $${values.length}`);
    }

    if (updates.endDate !== undefined) {
      values.push(updates.endDate);
      updateFields.push(`end_date = $${values.length}`);
    }

    if (updates.budget !== undefined) {
      values.push(updates.budget);
      updateFields.push(`budget = $${values.length}`);
    }

    if (updates.hourlyRate !== undefined) {
      values.push(updates.hourlyRate);
      updateFields.push(`hourly_rate = $${values.length}`);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const query = `
      UPDATE projects 
      SET ${updateFields.join(', ')}
      WHERE id = $${values.length}
      RETURNING *
    `;

    try {
      const result = await ProjectModel.pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Project not found');
      }

      return this.mapRow(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        throw new DatabaseError(`Project with name '${updates.name}' already exists`);
      }
      if (error.code === '23514') { // Check constraint violation
        throw new DatabaseError('Invalid project data: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Delete project (hard delete - in production you might want soft delete)
   */
  static async delete(id: string): Promise<Project> {
    const query = `
      DELETE FROM projects 
      WHERE id = $1
      RETURNING *
    `;

    const result = await ProjectModel.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get project statistics
   */
  static async getProjectStatistics(): Promise<ProjectStatistics> {
    const query = `
      SELECT 
        COUNT(*) as total_projects,
        COUNT(status) FILTER (WHERE status = 'planning') as planning_count,
        COUNT(status) FILTER (WHERE status = 'active') as active_count,
        COUNT(status) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(status) FILTER (WHERE status = 'on-hold') as on_hold_count,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(AVG(budget), 0) as average_budget,
        COALESCE(AVG(hourly_rate), 0) as average_hourly_rate
      FROM projects
    `;

    const result = await ProjectModel.pool.query(query);
    const row = result.rows[0];

    return {
      totalProjects: parseInt(row.total_projects) || 0,
      projectsByStatus: {
        planning: parseInt(row.planning_count) || 0,
        active: parseInt(row.active_count) || 0,
        completed: parseInt(row.completed_count) || 0,
        'on-hold': parseInt(row.on_hold_count) || 0
      },
      totalBudget: parseFloat(row.total_budget) || 0,
      averageBudget: parseFloat(row.average_budget) || 0,
      averageHourlyRate: parseFloat(row.average_hourly_rate) || 0
    };
  }

  /**
   * Map database row to Project object
   */
  private static mapRow(row: any): Project {
    return {
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      clientName: row.client_name,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      budget: row.budget ? parseFloat(row.budget) : undefined,
      hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Search projects by name (for autocomplete, etc.)
   */
  static async searchByName(searchTerm: string, limit: number = 10): Promise<Project[]> {
    const query = `
      SELECT * FROM projects
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT $2
    `;

    const result = await ProjectModel.pool.query(query, [`%${searchTerm}%`, limit]);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get projects by date range
   */
  static async getProjectsInDateRange(startDate: Date, endDate: Date): Promise<Project[]> {
    const query = `
      SELECT * FROM projects
      WHERE (start_date BETWEEN $1 AND $2) 
         OR (end_date BETWEEN $1 AND $2)
         OR (start_date <= $1 AND end_date >= $2)
      ORDER BY start_date ASC
    `;

    const result = await ProjectModel.pool.query(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get projects grouped by status
   */
  static async getProjectsGroupedByStatus(): Promise<Record<string, Project[]>> {
    const query = `
      SELECT * FROM projects
      ORDER BY status, name
    `;

    const result = await ProjectModel.pool.query(query);
    const projects = result.rows.map(row => this.mapRow(row));

    return projects.reduce((grouped, project) => {
      const status = project.status;
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(project);
      return grouped;
    }, {} as Record<string, Project[]>);
  }
}