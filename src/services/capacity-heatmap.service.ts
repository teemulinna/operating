import { Pool } from 'pg';
import { z } from 'zod';
import { startOfWeek, endOfWeek, format, addDays, differenceInDays } from 'date-fns';
import { DatabaseService } from '../database/database.service';
import { WebSocketService } from '../websocket/websocket.service';
import { CacheService } from './cache.service';
import { ApiError } from '../utils/api-error';
import { logger } from '../utils/logger';

// ============================================
// SCHEMAS
// ============================================

export const HeatmapGranularity = z.enum(['daily', 'weekly', 'monthly']);
export type HeatmapGranularity = z.infer<typeof HeatmapGranularity>;

export const HeatLevel = z.enum(['available', 'green', 'blue', 'yellow', 'red', 'unavailable']);
export type HeatLevel = z.infer<typeof HeatLevel>;

export const HeatmapFilterSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  departmentId: z.string().uuid().optional(),
  employeeIds: z.array(z.string().uuid()).optional(),
  teamIds: z.array(z.string().uuid()).optional(),
  granularity: HeatmapGranularity.default('daily'),
  includeInactive: z.boolean().default(false),
  includeWeekends: z.boolean().default(false)
});

export type HeatmapFilter = z.infer<typeof HeatmapFilterSchema>;

export const HeatmapCellSchema = z.object({
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  department: z.string(),
  date: z.date(),
  availableHours: z.number(),
  allocatedHours: z.number(),
  utilizationPercentage: z.number(),
  heatLevel: HeatLevel,
  projectCount: z.number(),
  projectNames: z.array(z.string()),
  isHoliday: z.boolean().optional(),
  hasException: z.boolean().optional()
});

export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const HeatmapDataSchema = z.object({
  cells: z.array(HeatmapCellSchema),
  summary: z.object({
    totalEmployees: z.number(),
    totalAvailableHours: z.number(),
    totalAllocatedHours: z.number(),
    avgUtilization: z.number(),
    peakUtilization: z.number(),
    overAllocatedDays: z.number(),
    underUtilizedDays: z.number()
  }),
  metadata: z.object({
    startDate: z.date(),
    endDate: z.date(),
    granularity: HeatmapGranularity,
    lastRefreshed: z.date(),
    cached: z.boolean()
  })
});

export type HeatmapData = z.infer<typeof HeatmapDataSchema>;

export const BottleneckSchema = z.object({
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  department: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  consecutiveDays: z.number(),
  avgUtilization: z.number(),
  peakUtilization: z.number(),
  totalOverAllocatedHours: z.number(),
  affectedProjects: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

export type Bottleneck = z.infer<typeof BottleneckSchema>;

export const CapacityTrendSchema = z.object({
  employeeId: z.string().uuid(),
  period: z.string(),
  utilizationPercentage: z.number(),
  allocatedHours: z.number(),
  availableHours: z.number(),
  trend: z.enum(['increasing', 'stable', 'decreasing'])
});

export type CapacityTrend = z.infer<typeof CapacityTrendSchema>;

// ============================================
// SERVICE
// ============================================

export class CapacityHeatmapService {
  private db: Pool;
  private cache: CacheService;
  private ws: WebSocketService;

  constructor(
    private databaseService: DatabaseService,
    private cacheService: CacheService,
    private websocketService: WebSocketService
  ) {
    this.db = databaseService.getPool();
    this.cache = cacheService;
    this.ws = websocketService;
  }

  /**
   * Get heatmap data for specified filters
   */
  async getHeatmap(filters: HeatmapFilter): Promise<HeatmapData> {
    try {
      // Validate filters
      const validatedFilters = HeatmapFilterSchema.parse(filters);

      // Check cache first
      const cacheKey = this.generateCacheKey('heatmap', validatedFilters);
      const cached = await this.cache.get<HeatmapData>(cacheKey);

      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true
          }
        };
      }

      // Query database
      const cells = await this.queryHeatmapData(validatedFilters);
      const summary = this.calculateSummary(cells);

      const heatmapData: HeatmapData = {
        cells,
        summary,
        metadata: {
          startDate: new Date(validatedFilters.startDate),
          endDate: new Date(validatedFilters.endDate),
          granularity: validatedFilters.granularity,
          lastRefreshed: new Date(),
          cached: false
        }
      };

      // Cache for 15 minutes
      await this.cache.set(cacheKey, heatmapData, 900);

      return heatmapData;
    } catch (error) {
      logger.error('Error getting heatmap data:', error);
      throw new ApiError('Failed to retrieve heatmap data', 500);
    }
  }

  /**
   * Get capacity bottlenecks
   */
  async getBottlenecks(
    startDate?: Date,
    endDate?: Date,
    departmentId?: string
  ): Promise<Bottleneck[]> {
    try {
      const query = `
        SELECT
          employee_id,
          first_name || ' ' || last_name as employee_name,
          department_name as department,
          bottleneck_start_date as start_date,
          bottleneck_end_date as end_date,
          consecutive_days,
          avg_utilization,
          peak_utilization,
          total_over_allocated_hours,
          affected_projects,
          bottleneck_severity as severity
        FROM mv_capacity_bottlenecks
        WHERE ($1::date IS NULL OR bottleneck_start_date >= $1)
          AND ($2::date IS NULL OR bottleneck_end_date <= $2)
          AND ($3::uuid IS NULL OR department_name IN (
            SELECT name FROM departments WHERE id = $3
          ))
        ORDER BY bottleneck_severity DESC, bottleneck_start_date
        LIMIT 50
      `;

      const result = await this.db.query(query, [startDate, endDate, departmentId]);

      return result.rows.map(row => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        department: row.department,
        startDate: row.start_date,
        endDate: row.end_date,
        consecutiveDays: row.consecutive_days,
        avgUtilization: parseFloat(row.avg_utilization),
        peakUtilization: parseFloat(row.peak_utilization),
        totalOverAllocatedHours: parseFloat(row.total_over_allocated_hours),
        affectedProjects: row.affected_projects || [],
        severity: row.severity
      }));
    } catch (error) {
      logger.error('Error getting bottlenecks:', error);
      throw new ApiError('Failed to retrieve capacity bottlenecks', 500);
    }
  }

  /**
   * Get capacity trends for an employee
   */
  async getCapacityTrends(
    employeeId: string,
    periods: number = 12
  ): Promise<CapacityTrend[]> {
    try {
      const query = `
        WITH weekly_trends AS (
          SELECT
            employee_id,
            year || '-W' || LPAD(week_number::text, 2, '0') as period,
            avg_utilization_percentage as utilization,
            weekly_allocated_hours as allocated,
            weekly_available_hours as available,
            week_start_date
          FROM mv_weekly_capacity_heatmap
          WHERE employee_id = $1
            AND week_start_date >= CURRENT_DATE - INTERVAL '${periods} weeks'
          ORDER BY year DESC, week_number DESC
          LIMIT $2
        ),
        trend_calc AS (
          SELECT
            *,
            LAG(utilization, 1) OVER (ORDER BY week_start_date) as prev_utilization,
            LAG(utilization, 2) OVER (ORDER BY week_start_date) as prev2_utilization
          FROM weekly_trends
        )
        SELECT
          employee_id,
          period,
          utilization,
          allocated,
          available,
          CASE
            WHEN prev_utilization IS NULL THEN 'stable'
            WHEN utilization > prev_utilization AND
                 (prev2_utilization IS NULL OR prev_utilization > prev2_utilization)
            THEN 'increasing'
            WHEN utilization < prev_utilization AND
                 (prev2_utilization IS NULL OR prev_utilization < prev2_utilization)
            THEN 'decreasing'
            ELSE 'stable'
          END as trend
        FROM trend_calc
        ORDER BY week_start_date DESC
      `;

      const result = await this.db.query(query, [employeeId, periods]);

      return result.rows.map(row => ({
        employeeId: row.employee_id,
        period: row.period,
        utilizationPercentage: parseFloat(row.utilization),
        allocatedHours: parseFloat(row.allocated),
        availableHours: parseFloat(row.available),
        trend: row.trend
      }));
    } catch (error) {
      logger.error('Error getting capacity trends:', error);
      throw new ApiError('Failed to retrieve capacity trends', 500);
    }
  }

  /**
   * Export heatmap data to CSV
   */
  async exportToCSV(filters: HeatmapFilter): Promise<string> {
    try {
      const data = await this.getHeatmap(filters);

      const headers = [
        'Employee Name',
        'Department',
        'Date',
        'Available Hours',
        'Allocated Hours',
        'Utilization %',
        'Heat Level',
        'Projects'
      ];

      const rows = data.cells.map(cell => [
        cell.employeeName,
        cell.department,
        format(cell.date, 'yyyy-MM-dd'),
        cell.availableHours.toString(),
        cell.allocatedHours.toString(),
        cell.utilizationPercentage.toFixed(2),
        cell.heatLevel,
        cell.projectNames.join('; ')
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return csv;
    } catch (error) {
      logger.error('Error exporting heatmap to CSV:', error);
      throw new ApiError('Failed to export heatmap data', 500);
    }
  }

  /**
   * Refresh materialized views
   */
  async refreshViews(concurrent: boolean = true): Promise<void> {
    try {
      const query = `SELECT * FROM refresh_heatmap_views($1)`;
      const result = await this.db.query(query, [concurrent]);

      logger.info('Heatmap views refreshed:', result.rows);

      // Clear cache after refresh
      await this.cache.delete('heatmap:*');

      // Notify clients of refresh
      this.ws.broadcast('capacity:refreshed', {
        timestamp: new Date(),
        views: result.rows
      });
    } catch (error) {
      logger.error('Error refreshing heatmap views:', error);
      throw new ApiError('Failed to refresh heatmap views', 500);
    }
  }

  /**
   * Get department capacity summary
   */
  async getDepartmentSummary(
    departmentId: string,
    date?: Date
  ): Promise<any> {
    try {
      const targetDate = date || new Date();

      const query = `
        SELECT
          department_id,
          department_name,
          capacity_date,
          total_employees,
          total_available_hours,
          total_allocated_hours,
          avg_utilization_percentage,
          department_heat_level,
          green_count,
          blue_count,
          yellow_count,
          red_count,
          available_count,
          unavailable_count,
          unique_projects
        FROM mv_department_capacity_summary
        WHERE department_id = $1
          AND capacity_date = $2::date
      `;

      const result = await this.db.query(query, [departmentId, targetDate]);

      if (result.rows.length === 0) {
        throw new ApiError('Department summary not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting department summary:', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async queryHeatmapData(filters: HeatmapFilter): Promise<HeatmapCell[]> {
    const query = `
      SELECT * FROM get_heatmap_data(
        $1::date,
        $2::date,
        $3::uuid,
        $4::uuid[],
        $5::text
      )
    `;

    const result = await this.db.query(query, [
      filters.startDate,
      filters.endDate,
      filters.departmentId || null,
      filters.employeeIds || null,
      filters.granularity
    ]);

    return result.rows.map(row => ({
      employeeId: row.entity_id,
      employeeName: row.entity_name,
      department: row.department_name || 'Unassigned',
      date: row.period_date,
      availableHours: parseFloat(row.available_hours),
      allocatedHours: parseFloat(row.allocated_hours),
      utilizationPercentage: parseFloat(row.utilization_percentage),
      heatLevel: row.heat_level as HeatLevel,
      projectCount: row.project_count,
      projectNames: row.project_names || [],
      isHoliday: row.holiday_name ? true : false,
      hasException: row.has_exception || false
    }));
  }

  private calculateSummary(cells: HeatmapCell[]) {
    const employeeSet = new Set(cells.map(c => c.employeeId));
    const totalAvailable = cells.reduce((sum, c) => sum + c.availableHours, 0);
    const totalAllocated = cells.reduce((sum, c) => sum + c.allocatedHours, 0);

    const utilizations = cells.map(c => c.utilizationPercentage);
    const avgUtilization = utilizations.length > 0
      ? utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length
      : 0;

    return {
      totalEmployees: employeeSet.size,
      totalAvailableHours: totalAvailable,
      totalAllocatedHours: totalAllocated,
      avgUtilization: Math.round(avgUtilization * 100) / 100,
      peakUtilization: Math.max(...utilizations, 0),
      overAllocatedDays: cells.filter(c => c.heatLevel === 'red').length,
      underUtilizedDays: cells.filter(c => c.heatLevel === 'available' || c.heatLevel === 'green').length
    };
  }

  private generateCacheKey(prefix: string, filters: any): string {
    const key = `${prefix}:${JSON.stringify(filters)}`;
    return key;
  }

  /**
   * Subscribe to real-time capacity updates
   */
  subscribeToUpdates(callback: (data: any) => void): () => void {
    const handler = (event: any) => {
      if (event.type === 'capacity:updated') {
        callback(event.data);
      }
    };

    this.ws.on('capacity:updated', handler);

    // Return unsubscribe function
    return () => {
      this.ws.off('capacity:updated', handler);
    };
  }
}