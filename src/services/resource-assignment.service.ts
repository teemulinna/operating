import { DatabaseService } from '../database/database.service';
import { ApiError } from '../utils/api-error';
// import { logger } from '../utils/logger';

interface ResourceAssignmentData {
  project_id: number;
  employee_id: string;
  project_role_id?: string;
  assignment_type?: string;
  start_date: string;
  end_date?: string;
  planned_allocation_percentage: number;
  hourly_rate?: number;
  confidence_level?: string;
  notes?: string;
}

export class ResourceAssignmentService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async createAssignment(assignmentData: ResourceAssignmentData): Promise<any> {
    try {
      // Validate required fields
      if (!assignmentData.project_id || !assignmentData.employee_id || !assignmentData.start_date) {
        throw new ApiError(400, 'Project ID, employee ID, and start date are required');
      }

      // Validate allocation percentage
      if (assignmentData.planned_allocation_percentage <= 0 || assignmentData.planned_allocation_percentage > 100) {
        throw new ApiError(400, 'Planned allocation percentage must be between 1 and 100');
      }

      // Check for capacity conflicts
      await this.validateEmployeeCapacity(
        assignmentData.employee_id,
        assignmentData.start_date,
        assignmentData.end_date,
        assignmentData.planned_allocation_percentage
      );

      // Calculate planned hours per week
      const plannedHoursPerWeek = (assignmentData.planned_allocation_percentage / 100) * 40;

      const query = `
        INSERT INTO resource_assignments (
          project_id, employee_id, project_role_id, assignment_type,
          start_date, end_date, planned_allocation_percentage,
          planned_hours_per_week, hourly_rate, confidence_level, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        assignmentData.project_id,
        assignmentData.employee_id,
        assignmentData.project_role_id,
        assignmentData.assignment_type || 'employee',
        assignmentData.start_date,
        assignmentData.end_date,
        assignmentData.planned_allocation_percentage,
        plannedHoursPerWeek,
        assignmentData.hourly_rate,
        assignmentData.confidence_level || 'confirmed',
        assignmentData.notes
      ];

      const result = await this.db.query(query, values);

      if (!result.rows.length) {
        throw new ApiError(500, 'Failed to create assignment');
      }

      // Get assignment with employee and project details
      return await this.getAssignmentWithDetails(result.rows[0].id);
    } catch (error) {
      console.error('Error creating assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to create assignment');
    }
  }

  async validateEmployeeCapacity(
    employeeId: string, 
    startDate: string, 
    endDate: string | undefined, 
    plannedAllocation: number,
    excludeAssignmentId?: string
  ): Promise<void> {
    try {
      // Get employee's base capacity
      const employeeQuery = `
        SELECT weekly_hours, first_name, last_name 
        FROM employees 
        WHERE id = $1 AND status = 'active'
      `;
      const employeeResult = await this.db.query(employeeQuery, [employeeId]);
      
      if (!employeeResult.rows.length) {
        throw new ApiError(404, 'Employee not found or inactive');
      }

      const employee = employeeResult.rows[0];
      const baseCapacity = employee.weekly_hours || 40;

      // Calculate existing allocations during the same period
      const conflictQuery = `
        SELECT 
          SUM(planned_allocation_percentage) as total_allocation,
          COUNT(*) as assignment_count
        FROM resource_assignments
        WHERE employee_id = $1
          AND status IN ('planned', 'active')
          AND start_date <= $3
          AND COALESCE(end_date, '9999-12-31') >= $2
          ${excludeAssignmentId ? 'AND id != $4' : ''}
      `;

      const conflictParams = [
        employeeId,
        startDate,
        endDate || '9999-12-31',
        ...(excludeAssignmentId ? [excludeAssignmentId] : [])
      ];

      const conflictResult = await this.db.query(conflictQuery, conflictParams);
      const existingAllocation = parseFloat(conflictResult.rows[0].total_allocation) || 0;
      const totalAllocation = existingAllocation + plannedAllocation;

      // Check for over-allocation
      if (totalAllocation > 105) {
        throw new ApiError(409, 
          `Assignment would exceed employee capacity. ` +
          `Current allocation: ${existingAllocation}%, ` +
          `Requested: ${plannedAllocation}%, ` +
          `Total: ${totalAllocation}% (Max allowed: 105%)`
        );
      }

      // Warning for over 100% allocation
      if (totalAllocation > 100) {
        console.warn(
          `Employee ${employee.first_name} ${employee.last_name} will be over-allocated: ${totalAllocation}%`
        );
      }

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error validating capacity:', error);
      throw new ApiError(500, 'Failed to validate employee capacity');
    }
  }

  async getEmployeeAssignments(employeeId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          ra.*,
          p.name as project_name,
          p.code as project_code,
          p.status as project_status,
          p.start_date as project_start_date,
          p.end_date as project_end_date,
          pr.role_name,
          e.first_name,
          e.last_name,
          e.weekly_hours as employee_capacity
        FROM resource_assignments ra
        JOIN projects p ON ra.project_id = p.id
        JOIN employees e ON ra.employee_id = e.id
        LEFT JOIN project_roles pr ON ra.project_role_id = pr.id
        WHERE ra.employee_id = $1
        ORDER BY ra.start_date DESC, ra.created_at DESC
      `;

      const result = await this.db.query(query, [employeeId]);

      // Calculate utilization summary
      const utilizationQuery = `
        SELECT 
          COALESCE(SUM(planned_allocation_percentage), 0) as total_allocation,
          COUNT(*) as active_assignments,
          COALESCE(SUM(planned_hours_per_week), 0) as total_hours
        FROM resource_assignments
        WHERE employee_id = $1
          AND status IN ('planned', 'active')
          AND start_date <= CURRENT_DATE + INTERVAL '30 days'
          AND COALESCE(end_date, '9999-12-31') >= CURRENT_DATE
      `;

      const utilizationResult = await this.db.query(utilizationQuery, [employeeId]);
      const utilization = utilizationResult.rows[0];

      return {
        employeeId,
        assignments: result.rows,
        summary: {
          totalAssignments: result.rows.length,
          activeAssignments: result.rows.filter(a => a.status === 'active').length,
          totalAllocation: parseFloat(utilization.total_allocation),
          totalHours: parseFloat(utilization.total_hours),
          utilizationStatus: this.getUtilizationStatus(parseFloat(utilization.total_allocation))
        }
      };
    } catch (error) {
      console.error('Error fetching employee assignments:', error);
      throw new ApiError(500, 'Failed to fetch employee assignments');
    }
  }

  async getProjectAssignments(projectId: number): Promise<any[]> {
    try {
      const query = `
        SELECT 
          ra.*,
          e.first_name,
          e.last_name,
          e.email,
          e.position,
          pr.role_name,
          (
            SELECT json_agg(
              json_build_object('name', s.name, 'category', s.category)
            )
            FROM employee_skills es
            JOIN skills s ON es.skill_id = s.id
            WHERE es.employee_id = e.id
          ) as employee_skills
        FROM resource_assignments ra
        JOIN employees e ON ra.employee_id = e.id
        LEFT JOIN project_roles pr ON ra.project_role_id = pr.id
        WHERE ra.project_id = $1
        ORDER BY ra.created_at DESC
      `;

      const result = await this.db.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching project assignments:', error);
      throw new ApiError(500, 'Failed to fetch project assignments');
    }
  }

  async getActiveAssignments(projectId: number): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM resource_assignments
        WHERE project_id = $1 AND status IN ('planned', 'active')
      `;

      const result = await this.db.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active assignments:', error);
      throw new ApiError(500, 'Failed to fetch active assignments');
    }
  }

  async updateAssignment(assignmentId: string, updateData: Partial<ResourceAssignmentData>): Promise<any> {
    try {
      // Get current assignment
      const currentAssignment = await this.getAssignmentById(assignmentId);
      if (!currentAssignment) {
        throw new ApiError(404, 'Assignment not found');
      }

      // If allocation percentage is being updated, validate capacity
      if (updateData.planned_allocation_percentage) {
        await this.validateEmployeeCapacity(
          currentAssignment.employee_id,
          updateData.start_date || currentAssignment.start_date,
          updateData.end_date || currentAssignment.end_date,
          updateData.planned_allocation_percentage,
          assignmentId
        );
      }

      // Build update query
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
        return currentAssignment;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE resource_assignments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      queryParams.push(assignmentId);

      const result = await this.db.query(query, queryParams);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to update assignment');
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      const query = `DELETE FROM resource_assignments WHERE id = $1`;
      const result = await this.db.query(query, [assignmentId]);

      if (result.rowCount === 0) {
        throw new ApiError(404, 'Assignment not found');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Failed to delete assignment');
    }
  }

  private async getAssignmentById(assignmentId: string): Promise<any> {
    const query = `SELECT * FROM resource_assignments WHERE id = $1`;
    const result = await this.db.query(query, [assignmentId]);
    return result.rows[0] || null;
  }

  private async getAssignmentWithDetails(assignmentId: string): Promise<any> {
    const query = `
      SELECT 
        ra.*,
        p.name as project_name,
        p.code as project_code,
        e.first_name,
        e.last_name,
        e.email,
        pr.role_name
      FROM resource_assignments ra
      JOIN projects p ON ra.project_id = p.id
      JOIN employees e ON ra.employee_id = e.id
      LEFT JOIN project_roles pr ON ra.project_role_id = pr.id
      WHERE ra.id = $1
    `;

    const result = await this.db.query(query, [assignmentId]);
    return result.rows[0];
  }

  private getUtilizationStatus(allocation: number): string {
    if (allocation > 100) return 'over-allocated';
    if (allocation === 100) return 'fully-allocated';
    if (allocation > 80) return 'highly-utilized';
    return 'available';
  }

  async getResourceConflicts(): Promise<any[]> {
    try {
      const query = `
        WITH employee_allocations AS (
          SELECT 
            employee_id,
            start_date,
            end_date,
            SUM(planned_allocation_percentage) as total_allocation,
            array_agg(id) as assignment_ids
          FROM resource_assignments
          WHERE status IN ('planned', 'active')
          GROUP BY employee_id, start_date, end_date
          HAVING SUM(planned_allocation_percentage) > 100
        )
        SELECT 
          ea.employee_id,
          e.first_name || ' ' || e.last_name as employee_name,
          ea.start_date,
          ea.end_date,
          ea.total_allocation,
          ea.assignment_ids as conflicting_assignments
        FROM employee_allocations ea
        JOIN employees e ON ea.employee_id = e.id
        ORDER BY ea.total_allocation DESC, ea.start_date
      `;

      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error fetching resource conflicts:', error);
      throw new ApiError(500, 'Failed to fetch resource conflicts');
    }
  }
}