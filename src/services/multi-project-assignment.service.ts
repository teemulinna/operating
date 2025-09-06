/**
 * Multi-Project Assignment Service
 * Enables employees to be assigned to multiple projects simultaneously
 * with allocation percentage tracking and validation
 */

import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';

export interface ProjectAllocation {
  projectId: number;
  roleId: number;
  allocationPercentage: number;
  startDate: string;
  endDate?: string;
}

export interface MultiProjectAssignmentData {
  employeeId: number;
  projectAllocations: ProjectAllocation[];
  startDate: string;
  endDate?: string;
  status: 'active' | 'planned' | 'completed' | 'cancelled';
}

export interface MultiProjectAssignment {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  totalAllocation: number;
  startDate: string;
  endDate?: string;
  status: string;
  allocations: Array<{
    id: number;
    projectId: number;
    projectName: string;
    roleId: number;
    roleName: string;
    allocationPercentage: number;
    startDate: string;
    endDate?: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeUtilization {
  employeeId: number;
  employeeName: string;
  totalAllocation: number;
  availableCapacity: number;
  projectCount: number;
  allocations: Array<{
    projectId: number;
    projectName: string;
    roleId: number;
    roleName: string;
    allocationPercentage: number;
    startDate: string;
    endDate?: string;
  }>;
}

export class MultiProjectAssignmentService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Create a new multi-project assignment with allocation validation
   */
  async createMultiProjectAssignment(data: MultiProjectAssignmentData): Promise<MultiProjectAssignment> {
    try {
      // Validate input data
      this.validateAssignmentData(data);

      // Validate total allocation doesn't exceed 100%
      const totalAllocation = data.projectAllocations.reduce(
        (sum, allocation) => sum + allocation.allocationPercentage, 
        0
      );

      if (totalAllocation > 100) {
        throw new ApiError(400, 'Total allocation percentage cannot exceed 100%');
      }

      // Check if employee exists
      const employee = await this.db.query(
        'SELECT id, first_name, last_name, email FROM employees WHERE id = $1 AND is_active = true',
        [data.employeeId]
      );

      if (!employee.rows.length) {
        throw new ApiError(404, 'Employee not found');
      }

      // Validate projects and roles exist
      await this.validateProjectsAndRoles(data.projectAllocations);

      // Check for conflicting assignments (overlapping periods with over 100% allocation)
      await this.validateNoConflicts(data);

      // Start transaction
      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Create main resource assignment record
        const assignmentQuery = `
          INSERT INTO resource_assignments (
            employee_id, project_id, role_id, assignment_type, start_date, end_date,
            planned_allocation_percentage, planned_hours_per_week, status
          )
          VALUES ($1, $2, $3, 'employee', $4, $5, $6, $7, $8)
          RETURNING id
        `;

        // Use first project as the primary assignment
        const primaryAllocation = data.projectAllocations[0];
        const plannedHours = Math.round((totalAllocation / 100) * 40); // Assuming 40-hour work week

        const assignmentResult = await client.query(assignmentQuery, [
          data.employeeId,
          primaryAllocation.projectId,
          primaryAllocation.roleId,
          data.startDate,
          data.endDate,
          totalAllocation,
          plannedHours,
          data.status
        ]);

        const assignmentId = assignmentResult.rows[0].id;

        // Create allocation records for each project
        const allocationPromises = data.projectAllocations.map(async (allocation) => {
          const allocationQuery = `
            INSERT INTO assignment_allocations (
              assignment_id, project_id, role_id, allocation_percentage, 
              start_date, end_date, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `;

          return client.query(allocationQuery, [
            assignmentId,
            allocation.projectId,
            allocation.roleId,
            allocation.allocationPercentage,
            allocation.startDate || data.startDate,
            allocation.endDate || data.endDate,
            data.status
          ]);
        });

        await Promise.all(allocationPromises);

        await client.query('COMMIT');

        // Return the complete assignment
        return this.getMultiProjectAssignmentById(assignmentId);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error creating multi-project assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to create multi-project assignment');
    }
  }

  /**
   * Update an existing multi-project assignment
   */
  async updateMultiProjectAssignment(
    assignmentId: number, 
    updateData: Partial<MultiProjectAssignmentData>
  ): Promise<MultiProjectAssignment> {
    try {
      // Check if assignment exists
      const existing = await this.getMultiProjectAssignmentById(assignmentId);
      if (!existing) {
        throw new ApiError(404, 'Multi-project assignment not found');
      }

      // If updating allocations, validate total doesn't exceed 100%
      if (updateData.projectAllocations) {
        const totalAllocation = updateData.projectAllocations.reduce(
          (sum, allocation) => sum + allocation.allocationPercentage, 
          0
        );

        if (totalAllocation > 100) {
          throw new ApiError(400, 'Total allocation percentage cannot exceed 100%');
        }

        await this.validateProjectsAndRoles(updateData.projectAllocations);
      }

      const client = await this.db.getClient();
      await client.query('BEGIN');

      try {
        // Update main assignment if needed
        if (updateData.startDate || updateData.endDate || updateData.status) {
          const updateFields: string[] = [];
          const updateValues: any[] = [];
          let paramIndex = 1;

          if (updateData.startDate) {
            updateFields.push(`start_date = $${paramIndex}`);
            updateValues.push(updateData.startDate);
            paramIndex++;
          }

          if (updateData.endDate !== undefined) {
            updateFields.push(`end_date = $${paramIndex}`);
            updateValues.push(updateData.endDate);
            paramIndex++;
          }

          if (updateData.status) {
            updateFields.push(`status = $${paramIndex}`);
            updateValues.push(updateData.status);
            paramIndex++;
          }

          if (updateFields.length > 0) {
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            const updateQuery = `
              UPDATE resource_assignments 
              SET ${updateFields.join(', ')}
              WHERE id = $${paramIndex}
            `;
            updateValues.push(assignmentId);
            await client.query(updateQuery, updateValues);
          }
        }

        // Update allocations if provided
        if (updateData.projectAllocations) {
          // Delete existing allocations
          await client.query(
            'DELETE FROM assignment_allocations WHERE assignment_id = $1',
            [assignmentId]
          );

          // Create new allocations
          const allocationPromises = updateData.projectAllocations.map(async (allocation) => {
            const allocationQuery = `
              INSERT INTO assignment_allocations (
                assignment_id, project_id, role_id, allocation_percentage, 
                start_date, end_date, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            return client.query(allocationQuery, [
              assignmentId,
              allocation.projectId,
              allocation.roleId,
              allocation.allocationPercentage,
              allocation.startDate || updateData.startDate || existing.startDate,
              allocation.endDate || updateData.endDate || existing.endDate,
              updateData.status || existing.status
            ]);
          });

          await Promise.all(allocationPromises);

          // Update total allocation in main assignment
          const totalAllocation = updateData.projectAllocations.reduce(
            (sum, allocation) => sum + allocation.allocationPercentage, 
            0
          );

          await client.query(
            `UPDATE resource_assignments 
             SET planned_allocation_percentage = $1, 
                 planned_hours_per_week = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [totalAllocation, Math.round((totalAllocation / 100) * 40), assignmentId]
          );
        }

        await client.query('COMMIT');

        return this.getMultiProjectAssignmentById(assignmentId);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error updating multi-project assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to update multi-project assignment');
    }
  }

  /**
   * Get multi-project assignment by ID
   */
  async getMultiProjectAssignmentById(assignmentId: number): Promise<MultiProjectAssignment> {
    try {
      const query = `
        SELECT * FROM multi_project_assignments 
        WHERE assignment_id = $1
      `;

      const result = await this.db.query(query, [assignmentId]);

      if (!result.rows.length) {
        throw new ApiError(404, 'Multi-project assignment not found');
      }

      const row = result.rows[0];
      
      return {
        id: row.assignment_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeEmail: row.employee_email,
        totalAllocation: row.total_allocation,
        startDate: row.assignment_start,
        endDate: row.assignment_end,
        status: row.assignment_status,
        allocations: row.allocations || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

    } catch (error) {
      console.error('Error getting multi-project assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to get multi-project assignment');
    }
  }

  /**
   * Get assignments by employee ID
   */
  async getAssignmentsByEmployee(employeeId: number): Promise<MultiProjectAssignment[]> {
    try {
      const query = `
        SELECT * FROM multi_project_assignments 
        WHERE employee_id = $1
        ORDER BY assignment_start DESC
      `;

      const result = await this.db.query(query, [employeeId]);

      return result.rows.map(row => ({
        id: row.assignment_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeEmail: row.employee_email,
        totalAllocation: row.total_allocation,
        startDate: row.assignment_start,
        endDate: row.assignment_end,
        status: row.assignment_status,
        allocations: row.allocations || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      console.error('Error getting assignments by employee:', error);
      throw new ApiError(500, 'Failed to get assignments by employee');
    }
  }

  /**
   * Get assignments by project ID
   */
  async getAssignmentsByProject(projectId: number): Promise<MultiProjectAssignment[]> {
    try {
      const query = `
        SELECT DISTINCT mpa.* 
        FROM multi_project_assignments mpa
        WHERE mpa.allocations @> $1::jsonb
        ORDER BY mpa.assignment_start DESC
      `;

      const projectFilter = JSON.stringify([{ project_id: projectId }]);
      const result = await this.db.query(query, [projectFilter]);

      return result.rows.map(row => ({
        id: row.assignment_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeEmail: row.employee_email,
        totalAllocation: row.total_allocation,
        startDate: row.assignment_start,
        endDate: row.assignment_end,
        status: row.assignment_status,
        allocations: row.allocations || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      console.error('Error getting assignments by project:', error);
      throw new ApiError(500, 'Failed to get assignments by project');
    }
  }

  /**
   * Get assignments with filtering options
   */
  async getAssignments(filters: {
    status?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: number;
    projectId?: number;
  } = {}): Promise<MultiProjectAssignment[]> {
    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereConditions.push(`assignment_status = $${paramIndex}`);
        queryParams.push(filters.status);
        paramIndex++;
      }

      if (filters.employeeId) {
        whereConditions.push(`employee_id = $${paramIndex}`);
        queryParams.push(filters.employeeId);
        paramIndex++;
      }

      if (filters.startDate) {
        whereConditions.push(`assignment_start >= $${paramIndex}`);
        queryParams.push(filters.startDate);
        paramIndex++;
      }

      if (filters.endDate) {
        whereConditions.push(`assignment_end <= $${paramIndex}`);
        queryParams.push(filters.endDate);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      let query = `
        SELECT * FROM multi_project_assignments 
        ${whereClause}
        ORDER BY assignment_start DESC
      `;

      // Handle project filter separately due to JSON structure
      if (filters.projectId) {
        query = `
          SELECT DISTINCT mpa.* 
          FROM multi_project_assignments mpa
          ${whereClause ? whereClause + ' AND' : 'WHERE'} 
          mpa.allocations @> $${paramIndex}::jsonb
          ORDER BY mpa.assignment_start DESC
        `;
        queryParams.push(JSON.stringify([{ project_id: filters.projectId }]));
      }

      const result = await this.db.query(query, queryParams);

      return result.rows.map(row => ({
        id: row.assignment_id,
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        employeeEmail: row.employee_email,
        totalAllocation: row.total_allocation,
        startDate: row.assignment_start,
        endDate: row.assignment_end,
        status: row.assignment_status,
        allocations: row.allocations || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      console.error('Error getting filtered assignments:', error);
      throw new ApiError(500, 'Failed to get assignments');
    }
  }

  /**
   * Calculate employee utilization across all projects
   */
  async getEmployeeUtilization(employeeId: number): Promise<EmployeeUtilization> {
    try {
      const employee = await this.db.query(
        'SELECT first_name, last_name FROM employees WHERE id = $1',
        [employeeId]
      );

      if (!employee.rows.length) {
        throw new ApiError(404, 'Employee not found');
      }

      const employeeName = `${employee.rows[0].first_name} ${employee.rows[0].last_name}`;

      // Get current active allocations
      const allocationsQuery = `
        SELECT 
          aa.project_id,
          p.name as project_name,
          aa.role_id,
          pr.role_name,
          aa.allocation_percentage,
          aa.start_date,
          aa.end_date
        FROM assignment_allocations aa
        JOIN resource_assignments ra ON aa.assignment_id = ra.id
        JOIN projects p ON aa.project_id = p.id
        JOIN project_roles pr ON aa.role_id = pr.id
        WHERE ra.employee_id = $1 
          AND aa.status = 'active'
          AND aa.start_date <= CURRENT_DATE
          AND (aa.end_date IS NULL OR aa.end_date >= CURRENT_DATE)
        ORDER BY aa.allocation_percentage DESC
      `;

      const allocationsResult = await this.db.query(allocationsQuery, [employeeId]);

      const totalAllocation = allocationsResult.rows.reduce(
        (sum, allocation) => sum + parseFloat(allocation.allocation_percentage), 
        0
      );

      return {
        employeeId,
        employeeName,
        totalAllocation,
        availableCapacity: Math.max(0, 100 - totalAllocation),
        projectCount: allocationsResult.rows.length,
        allocations: allocationsResult.rows.map(row => ({
          projectId: row.project_id,
          projectName: row.project_name,
          roleId: row.role_id,
          roleName: row.role_name,
          allocationPercentage: parseFloat(row.allocation_percentage),
          startDate: row.start_date,
          endDate: row.end_date
        }))
      };

    } catch (error) {
      console.error('Error getting employee utilization:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to get employee utilization');
    }
  }

  /**
   * Validate assignment data
   */
  private validateAssignmentData(data: MultiProjectAssignmentData): void {
    if (!data.employeeId) {
      throw new ApiError(400, 'Employee ID is required');
    }

    if (!data.projectAllocations || data.projectAllocations.length === 0) {
      throw new ApiError(400, 'At least one project allocation is required');
    }

    if (!data.startDate) {
      throw new ApiError(400, 'Start date is required');
    }

    // Validate each allocation
    data.projectAllocations.forEach((allocation, index) => {
      if (!allocation.projectId) {
        throw new ApiError(400, `Project ID is required for allocation ${index + 1}`);
      }

      if (!allocation.roleId) {
        throw new ApiError(400, `Role ID is required for allocation ${index + 1}`);
      }

      if (!allocation.allocationPercentage || allocation.allocationPercentage <= 0 || allocation.allocationPercentage > 100) {
        throw new ApiError(400, `Allocation percentage must be between 1-100 for allocation ${index + 1}`);
      }
    });
  }

  /**
   * Validate that projects and roles exist
   */
  private async validateProjectsAndRoles(allocations: ProjectAllocation[]): Promise<void> {
    for (const allocation of allocations) {
      // Check project exists
      const project = await this.db.query(
        'SELECT id FROM projects WHERE id = $1',
        [allocation.projectId]
      );

      if (!project.rows.length) {
        throw new ApiError(404, `Project not found: ${allocation.projectId}`);
      }

      // Check role exists and belongs to the project
      const role = await this.db.query(
        'SELECT id FROM project_roles WHERE id = $1 AND project_id = $2',
        [allocation.roleId, allocation.projectId]
      );

      if (!role.rows.length) {
        throw new ApiError(404, `Project role not found or doesn't belong to project: ${allocation.roleId}`);
      }
    }
  }

  /**
   * Validate no conflicting assignments (simplified version - basic overlap check)
   */
  private async validateNoConflicts(data: MultiProjectAssignmentData): Promise<void> {
    // This is a simplified validation - the conflict detection service will handle more complex scenarios
    const existingQuery = `
      SELECT SUM(aa.allocation_percentage) as total_allocation
      FROM assignment_allocations aa
      JOIN resource_assignments ra ON aa.assignment_id = ra.id
      WHERE ra.employee_id = $1
        AND aa.status = 'active'
        AND aa.start_date <= $2
        AND (aa.end_date IS NULL OR aa.end_date >= $3)
    `;

    const endDate = data.endDate || '2099-12-31';
    const result = await this.db.query(existingQuery, [
      data.employeeId,
      endDate,
      data.startDate
    ]);

    const existingAllocation = parseFloat(result.rows[0].total_allocation || 0);
    const newAllocation = data.projectAllocations.reduce(
      (sum, allocation) => sum + allocation.allocationPercentage, 
      0
    );

    if (existingAllocation + newAllocation > 100) {
      throw new ApiError(409, 
        `Allocation conflict: Total allocation would be ${existingAllocation + newAllocation}% (exceeds 100%)`
      );
    }
  }
}