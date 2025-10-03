/**
 * Dashboard Controller - Production Implementation
 * Provides aggregated statistics for dashboard views
 */

import { Request, Response, NextFunction } from 'express';
import { RequestWithServices } from '../middleware/service-injection.middleware';
import { ApiError } from '../utils/api-error';
import { asyncHandler } from '../middleware/async-handler';

export class DashboardController {
  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics for current state
   */
  getStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const services = (req as RequestWithServices).services;

    if (!services?.database) {
      throw new ApiError(500, 'Database service not initialized');
    }

    const db = services.database.getPool();

    try {
      // Get employee statistics
      const employeeStatsQuery = `
        SELECT
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT CASE WHEN e.is_active = true THEN e.id END) as active_employees,
          COUNT(DISTINCT d.id) as total_departments,
          COUNT(DISTINCT s.id) as total_skills
        FROM employees e
        LEFT JOIN departments d ON d.id IS NOT NULL
        LEFT JOIN skills s ON s.id IS NOT NULL
      `;

      // Get project statistics
      const projectStatsQuery = `
        SELECT
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'planning' THEN 1 END) as planning_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_projects
        FROM projects
      `;

      // Get allocation statistics for current month
      const allocationStatsQuery = `
        SELECT
          COUNT(*) as total_allocations,
          COUNT(DISTINCT employee_id) as allocated_employees,
          COUNT(DISTINCT project_id) as projects_with_allocations,
          AVG(allocated_hours) as avg_allocation_hours,
          SUM(allocated_hours) / COUNT(DISTINCT employee_id) as avg_employee_allocation
        FROM resource_allocations
        WHERE start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `;

      // Get utilization statistics (based on 40 hours per week = 100%)
      const utilizationStatsQuery = `
        WITH employee_utilization AS (
          SELECT
            e.id,
            COALESCE(SUM(ra.allocated_hours), 0) * 100.0 / 40.0 as total_allocation
          FROM employees e
          LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
            AND ra.start_date <= CURRENT_DATE
            AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
          WHERE e.is_active = true
          GROUP BY e.id
        )
        SELECT
          AVG(total_allocation) as avg_utilization,
          COUNT(CASE WHEN total_allocation > 100 THEN 1 END) as over_allocated_count,
          COUNT(CASE WHEN total_allocation = 100 THEN 1 END) as fully_allocated_count,
          COUNT(CASE WHEN total_allocation BETWEEN 70 AND 99 THEN 1 END) as well_allocated_count,
          COUNT(CASE WHEN total_allocation BETWEEN 1 AND 69 THEN 1 END) as under_allocated_count,
          COUNT(CASE WHEN total_allocation = 0 THEN 1 END) as unallocated_count
        FROM employee_utilization
      `;

      // Get upcoming milestone statistics (placeholder - templates don't have specific dates)
      const milestoneStatsQuery = `
        SELECT
          0 as upcoming_milestones_30_days
      `;

      // Get availability patterns statistics
      const availabilityStatsQuery = `
        SELECT
          COUNT(DISTINCT employee_id) as employees_with_patterns,
          COUNT(*) as total_patterns,
          COUNT(CASE WHEN pattern_type = 'reduced_hours' THEN 1 END) as reduced_hours_patterns,
          COUNT(CASE WHEN pattern_type = 'unavailable' THEN 1 END) as unavailable_patterns
        FROM availability_patterns
        WHERE is_active = true
          AND start_date <= CURRENT_DATE + INTERVAL '30 days'
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `;

      // Execute all queries in parallel
      const [
        employeeStats,
        projectStats,
        allocationStats,
        utilizationStats,
        milestoneStats,
        availabilityStats
      ] = await Promise.all([
        db.query(employeeStatsQuery),
        db.query(projectStatsQuery),
        db.query(allocationStatsQuery),
        db.query(utilizationStatsQuery),
        db.query(milestoneStatsQuery),
        db.query(availabilityStatsQuery)
      ]);

      // Compile response
      const stats = {
        employees: {
          total: parseInt(employeeStats.rows[0]?.total_employees) || 0,
          active: parseInt(employeeStats.rows[0]?.active_employees) || 0,
          departments: parseInt(employeeStats.rows[0]?.total_departments) || 0,
          skills: parseInt(employeeStats.rows[0]?.total_skills) || 0
        },
        projects: {
          total: parseInt(projectStats.rows[0]?.total_projects) || 0,
          active: parseInt(projectStats.rows[0]?.active_projects) || 0,
          planning: parseInt(projectStats.rows[0]?.planning_projects) || 0,
          completed: parseInt(projectStats.rows[0]?.completed_projects) || 0,
          onHold: parseInt(projectStats.rows[0]?.on_hold_projects) || 0
        },
        allocations: {
          total: parseInt(allocationStats.rows[0]?.total_allocations) || 0,
          allocatedEmployees: parseInt(allocationStats.rows[0]?.allocated_employees) || 0,
          projectsWithAllocations: parseInt(allocationStats.rows[0]?.projects_with_allocations) || 0,
          avgAllocationPercentage: parseFloat(allocationStats.rows[0]?.avg_allocation_percentage) || 0,
          avgEmployeeAllocation: parseFloat(allocationStats.rows[0]?.avg_employee_allocation) || 0
        },
        utilization: {
          avgUtilization: parseFloat(utilizationStats.rows[0]?.avg_utilization) || 0,
          overAllocated: parseInt(utilizationStats.rows[0]?.over_allocated_count) || 0,
          fullyAllocated: parseInt(utilizationStats.rows[0]?.fully_allocated_count) || 0,
          wellAllocated: parseInt(utilizationStats.rows[0]?.well_allocated_count) || 0,
          underAllocated: parseInt(utilizationStats.rows[0]?.under_allocated_count) || 0,
          unallocated: parseInt(utilizationStats.rows[0]?.unallocated_count) || 0
        },
        milestones: {
          upcoming30Days: parseInt(milestoneStats.rows[0]?.upcoming_milestones_30_days) || 0
        },
        availability: {
          employeesWithPatterns: parseInt(availabilityStats.rows[0]?.employees_with_patterns) || 0,
          totalPatterns: parseInt(availabilityStats.rows[0]?.total_patterns) || 0,
          reducedHoursPatterns: parseInt(availabilityStats.rows[0]?.reduced_hours_patterns) || 0,
          unavailablePatterns: parseInt(availabilityStats.rows[0]?.unavailable_patterns) || 0
        },
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes
      res.set({
        'Cache-Control': 'public, max-age=300',
        'ETag': `"dashboard-${Date.now()}"`
      });

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new ApiError(500, 'Failed to fetch dashboard statistics');
    }
  });

  /**
   * GET /api/dashboard/trends
   * Get trend data for dashboard charts
   */
  getTrends = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const services = (req as RequestWithServices).services;

    if (!services?.database) {
      throw new ApiError(500, 'Database service not initialized');
    }

    const db = services.database.getPool();
    const { period = '30days', metric = 'utilization' } = req.query;

    let intervalDays = 30;
    if (period === '7days') intervalDays = 7;
    else if (period === '90days') intervalDays = 90;
    else if (period === '1year') intervalDays = 365;

    try {
      let trendQuery = '';

      if (metric === 'utilization') {
        trendQuery = `
          WITH date_series AS (
            SELECT generate_series(
              CURRENT_DATE - INTERVAL '${intervalDays} days',
              CURRENT_DATE,
              '1 day'::interval
            )::date as date
          ),
          daily_utilization AS (
            SELECT
              ds.date,
              AVG(COALESCE(ra.allocation_percentage, 0)) as avg_utilization,
              COUNT(DISTINCT CASE WHEN ra.allocation_percentage > 0 THEN ra.employee_id END) as allocated_employees
            FROM date_series ds
            CROSS JOIN employees e
            LEFT JOIN resource_allocations ra
              ON e.id = ra.employee_id
              AND ds.date BETWEEN ra.start_date AND COALESCE(ra.end_date, CURRENT_DATE + INTERVAL '1 year')
            WHERE e.is_active = true
            GROUP BY ds.date
          )
          SELECT
            date,
            ROUND(avg_utilization, 2) as value,
            allocated_employees as count
          FROM daily_utilization
          ORDER BY date
        `;
      } else if (metric === 'projects') {
        trendQuery = `
          WITH date_series AS (
            SELECT generate_series(
              CURRENT_DATE - INTERVAL '${intervalDays} days',
              CURRENT_DATE,
              '1 day'::interval
            )::date as date
          )
          SELECT
            ds.date,
            COUNT(CASE WHEN p.status = 'active' AND p.created_at::date <= ds.date THEN 1 END) as value,
            COUNT(CASE WHEN p.created_at::date = ds.date THEN 1 END) as count
          FROM date_series ds
          LEFT JOIN projects p ON p.created_at::date <= ds.date
          GROUP BY ds.date
          ORDER BY ds.date
        `;
      }

      const result = await db.query(trendQuery);

      res.status(200).json({
        success: true,
        data: {
          metric,
          period,
          trends: result.rows,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard trends:', error);
      throw new ApiError(500, 'Failed to fetch dashboard trends');
    }
  });

  /**
   * GET /api/dashboard/alerts
   * Get current alerts and warnings
   */
  getAlerts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const services = (req as RequestWithServices).services;

    if (!services?.database) {
      throw new ApiError(500, 'Database service not initialized');
    }

    const db = services.database.getPool();

    try {
      // Check for over-allocated employees
      const overAllocatedQuery = `
        SELECT
          e.id,
          e.first_name || ' ' || e.last_name as employee_name,
          SUM(ra.allocation_percentage) as total_allocation
        FROM employees e
        JOIN resource_allocations ra ON e.id = ra.employee_id
        WHERE ra.start_date <= CURRENT_DATE
          AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
          AND e.is_active = true
        GROUP BY e.id, e.first_name, e.last_name
        HAVING SUM(ra.allocation_percentage) > 100
      `;

      // Check for approaching milestones
      const upcomingMilestonesQuery = `
        SELECT
          pm.id,
          pm.name as milestone_name,
          p.name as project_name,
          pm.milestone_date,
          pm.milestone_date - CURRENT_DATE as days_until
        FROM project_milestones pm
        JOIN projects p ON pm.project_id = p.id
        WHERE pm.milestone_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND pm.status != 'completed'
        ORDER BY pm.milestone_date
      `;

      // Check for unallocated active projects
      const unallocatedProjectsQuery = `
        SELECT
          p.id,
          p.name as project_name,
          p.start_date
        FROM projects p
        LEFT JOIN resource_allocations ra ON p.id = ra.project_id
          AND ra.start_date <= CURRENT_DATE
          AND (ra.end_date IS NULL OR ra.end_date >= CURRENT_DATE)
        WHERE p.status = 'active'
        GROUP BY p.id, p.name, p.start_date
        HAVING COUNT(ra.id) = 0
      `;

      const [overAllocated, upcomingMilestones, unallocatedProjects] = await Promise.all([
        db.query(overAllocatedQuery),
        db.query(upcomingMilestonesQuery),
        db.query(unallocatedProjectsQuery)
      ]);

      const alerts = [];

      // Add over-allocation alerts
      overAllocated.rows.forEach(row => {
        alerts.push({
          type: 'warning',
          category: 'allocation',
          title: 'Employee Over-allocated',
          message: `${row.employee_name} is allocated at ${row.total_allocation}%`,
          severity: row.total_allocation > 120 ? 'high' : 'medium',
          data: row
        });
      });

      // Add milestone alerts
      upcomingMilestones.rows.forEach(row => {
        alerts.push({
          type: 'info',
          category: 'milestone',
          title: 'Upcoming Milestone',
          message: `${row.milestone_name} for ${row.project_name} in ${row.days_until} days`,
          severity: row.days_until <= 3 ? 'high' : 'medium',
          data: row
        });
      });

      // Add unallocated project alerts
      unallocatedProjects.rows.forEach(row => {
        alerts.push({
          type: 'warning',
          category: 'project',
          title: 'Project Needs Resources',
          message: `${row.project_name} has no active resource allocations`,
          severity: 'medium',
          data: row
        });
      });

      res.status(200).json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard alerts:', error);
      throw new ApiError(500, 'Failed to fetch dashboard alerts');
    }
  });
}