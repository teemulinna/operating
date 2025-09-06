import { Pool } from 'pg';
import {
  UtilizationData,
  CapacityTrendData,
  ResourceAllocationMetrics,
  SkillGap,
  DepartmentPerformance,
  CapacityForecast,
  DepartmentComparison,
  DepartmentMetrics,
  ComparisonMetric,
  AnalyticsFilters,
  PerformanceBenchmark,
  AnalyticsApiResponse
} from '../types/analytics.types';
import { SkillCategory } from '../types';

export class AnalyticsService {
  private static pool: Pool;

  static initialize(pool: Pool): void {
    this.pool = pool;
  }

  /**
   * Get team utilization data by department
   */
  static async getTeamUtilizationData(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<UtilizationData[]>> {
    const startTime = Date.now();
    
    let query = `
      WITH department_utilization AS (
        SELECT 
          d.id as department_id,
          d.name as department_name,
          COUNT(DISTINCT e.id) as total_employees,
          AVG(ch.utilization_rate) as average_utilization,
          SUM(ch.available_hours) as total_available_hours,
          SUM(ch.allocated_hours) as total_allocated_hours
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id
        WHERE d.is_active = true
    `;

    const values: any[] = [];

    if (filters.dateFrom) {
      values.push(filters.dateFrom);
      query += ` AND ch.date >= $${values.length}`;
    }

    if (filters.dateTo) {
      values.push(filters.dateTo);
      query += ` AND ch.date <= $${values.length}`;
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      values.push(filters.departmentIds);
      query += ` AND d.id = ANY($${values.length})`;
    }

    query += `
        GROUP BY d.id, d.name
      ),
      previous_period AS (
        SELECT 
          d.id as department_id,
          AVG(ch.utilization_rate) as prev_utilization
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id
        WHERE d.is_active = true
    `;

    // Calculate previous period dates
    if (filters.dateFrom && filters.dateTo) {
      const dateFrom = new Date(filters.dateFrom);
      const dateTo = new Date(filters.dateTo);
      const periodLength = dateTo.getTime() - dateFrom.getTime();
      const prevDateTo = new Date(dateFrom.getTime() - 1);
      const prevDateFrom = new Date(dateFrom.getTime() - periodLength);

      values.push(prevDateFrom, prevDateTo);
      query += ` AND ch.date >= $${values.length - 1} AND ch.date <= $${values.length}`;
    }

    query += `
        GROUP BY d.id
      )
      SELECT 
        du.*,
        COALESCE(
          CASE 
            WHEN pp.prev_utilization > 0 THEN 
              ((du.average_utilization - pp.prev_utilization) / pp.prev_utilization) * 100
            ELSE 0
          END, 0
        ) as utilization_trend
      FROM department_utilization du
      LEFT JOIN previous_period pp ON du.department_id = pp.department_id
      ORDER BY du.average_utilization DESC
    `;

    const result = await this.pool.query(query, values);
    
    const data: UtilizationData[] = result.rows.map(row => ({
      departmentId: row.department_id,
      departmentName: row.department_name,
      totalEmployees: parseInt(row.total_employees) || 0,
      averageUtilization: parseFloat(row.average_utilization) || 0,
      totalAvailableHours: parseFloat(row.total_available_hours) || 0,
      totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
      utilizationTrend: parseFloat(row.utilization_trend) || 0
    }));

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: data.length,
        dateRange: {
          from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: filters.dateTo || new Date()
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Get capacity trends over time
   */
  static async getCapacityTrends(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<CapacityTrendData[]>> {
    const startTime = Date.now();
    
    const aggregationPeriod = filters.aggregationPeriod || 'weekly';
    const dateFormat = this.getDateFormat(aggregationPeriod);
    
    let query = `
      SELECT 
        ${dateFormat} as period_date,
        d.id as department_id,
        d.name as department_name,
        AVG(ch.utilization_rate) as average_utilization,
        SUM(ch.available_hours) as total_available_hours,
        SUM(ch.allocated_hours) as total_allocated_hours,
        COUNT(DISTINCT ch.employee_id) as employee_count
      FROM capacity_history ch
      JOIN employees e ON ch.employee_id = e.id AND e.is_active = true
      JOIN departments d ON e.department_id = d.id AND d.is_active = true
      WHERE 1=1
    `;

    const values: any[] = [];

    if (filters.dateFrom) {
      values.push(filters.dateFrom);
      query += ` AND ch.date >= $${values.length}`;
    }

    if (filters.dateTo) {
      values.push(filters.dateTo);
      query += ` AND ch.date <= $${values.length}`;
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      values.push(filters.departmentIds);
      query += ` AND d.id = ANY($${values.length})`;
    }

    query += `
      GROUP BY ${dateFormat}, d.id, d.name
      ORDER BY period_date DESC, d.name
    `;

    const result = await this.pool.query(query, values);
    
    const data: CapacityTrendData[] = result.rows.map(row => ({
      date: row.period_date,
      departmentId: row.department_id,
      departmentName: row.department_name,
      averageUtilization: parseFloat(row.average_utilization) || 0,
      totalAvailableHours: parseFloat(row.total_available_hours) || 0,
      totalAllocatedHours: parseFloat(row.total_allocated_hours) || 0,
      employeeCount: parseInt(row.employee_count) || 0
    }));

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: data.length,
        dateRange: {
          from: filters.dateFrom || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          to: filters.dateTo || new Date()
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Get comprehensive resource allocation metrics
   */
  static async getResourceAllocationMetrics(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<ResourceAllocationMetrics>> {
    const startTime = Date.now();

    // Get basic company metrics
    const companyMetricsQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT d.id) as total_departments,
        AVG(ch.utilization_rate) as average_utilization
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN capacity_history ch ON e.id = ch.employee_id
      WHERE e.is_active = true AND d.is_active = true
    `;

    const companyResult = await this.pool.query(companyMetricsQuery);
    const companyMetrics = companyResult.rows[0];

    // Get over/under utilized employees
    const utilizationQuery = `
      WITH employee_utilization AS (
        SELECT 
          e.id,
          AVG(ch.utilization_rate) as avg_utilization
        FROM employees e
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id
        WHERE e.is_active = true
        GROUP BY e.id
      )
      SELECT 
        COUNT(*) FILTER (WHERE avg_utilization > 0.85) as overutilized,
        COUNT(*) FILTER (WHERE avg_utilization < 0.60) as underutilized
      FROM employee_utilization
    `;

    const utilizationResult = await this.pool.query(utilizationQuery);
    const utilizationStats = utilizationResult.rows[0];

    // Get skill gaps
    const skillGaps = await this.getSkillGapAnalysis(filters);

    // Get department performance
    const departmentPerformance = await this.getDepartmentPerformance(filters);

    // Generate capacity forecast (simplified mock data for now)
    const capacityForecast = await this.generateCapacityForecast(filters);

    const data: ResourceAllocationMetrics = {
      totalEmployees: parseInt(companyMetrics.total_employees) || 0,
      totalDepartments: parseInt(companyMetrics.total_departments) || 0,
      averageUtilizationAcrossCompany: parseFloat(companyMetrics.average_utilization) || 0,
      overutilizedEmployees: parseInt(utilizationStats.overutilized) || 0,
      underutilizedEmployees: parseInt(utilizationStats.underutilized) || 0,
      criticalResourceGaps: skillGaps.data,
      topPerformingDepartments: departmentPerformance.data.slice(0, 5),
      capacityForecast: capacityForecast.data
    };

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: 1,
        dateRange: {
          from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: filters.dateTo || new Date()
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Get skills gap analysis
   */
  static async getSkillGapAnalysis(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<SkillGap[]>> {
    const startTime = Date.now();

    const query = `
      WITH skill_demand AS (
        SELECT 
          s.id,
          s.name,
          s.category,
          COUNT(es.id) as current_professionals,
          COUNT(es.id) FILTER (WHERE es.proficiency_level >= 4) as experts,
          -- Mock demand calculation based on department needs
          CASE 
            WHEN s.category = 'technical' THEN COUNT(es.id) * 1.5
            WHEN s.category = 'domain' THEN COUNT(es.id) * 1.2
            ELSE COUNT(es.id) * 1.1
          END as estimated_demand
        FROM skills s
        LEFT JOIN employee_skills es ON s.id = es.skill_id AND es.is_active = true
        WHERE s.is_active = true
        GROUP BY s.id, s.name, s.category
      )
      SELECT 
        sd.*,
        CASE 
          WHEN estimated_demand = 0 THEN 0
          ELSE ((estimated_demand - experts) / estimated_demand) * 100
        END as gap_percentage,
        CASE 
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.7 THEN 'critical'
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.5 THEN 'high'
          WHEN ((estimated_demand - experts) / NULLIF(estimated_demand, 0)) > 0.3 THEN 'medium'
          ELSE 'low'
        END as criticality_level
      FROM skill_demand sd
      WHERE estimated_demand > experts
      ORDER BY gap_percentage DESC
      LIMIT 20
    `;

    const result = await this.pool.query(query);
    
    const data: SkillGap[] = result.rows.map(row => ({
      skillName: row.name,
      skillCategory: row.category,
      totalDemand: parseFloat(row.estimated_demand) || 0,
      availableExperts: parseInt(row.experts) || 0,
      gapPercentage: parseFloat(row.gap_percentage) || 0,
      criticalityLevel: row.criticality_level as 'low' | 'medium' | 'high' | 'critical',
      affectedDepartments: [] // Would need additional query to populate
    }));

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: data.length,
        dateRange: {
          from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: filters.dateTo || new Date()
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Get department performance metrics
   */
  static async getDepartmentPerformance(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<DepartmentPerformance[]>> {
    const startTime = Date.now();

    const query = `
      WITH department_metrics AS (
        SELECT 
          d.id,
          d.name,
          COUNT(DISTINCT e.id) as employee_count,
          AVG(ch.utilization_rate) as avg_utilization,
          COUNT(DISTINCT es.skill_id) as unique_skills,
          AVG(es.proficiency_level) as avg_proficiency
        FROM departments d
        LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
        LEFT JOIN capacity_history ch ON e.id = ch.employee_id
        LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
        WHERE d.is_active = true
        GROUP BY d.id, d.name
      )
      SELECT 
        *,
        -- Calculate efficiency score (mock formula)
        CASE 
          WHEN employee_count = 0 THEN 0
          ELSE (avg_utilization * 0.4 + (unique_skills::float / employee_count) * 20 * 0.3 + avg_proficiency * 20 * 0.3)
        END as efficiency_score,
        -- Mock additional metrics
        CASE 
          WHEN employee_count = 0 THEN 0
          ELSE (unique_skills::float / employee_count) * 20
        END as skill_coverage,
        75 + (RANDOM() * 20) as team_satisfaction_score,
        80 + (RANDOM() * 15) as project_completion_rate
      FROM department_metrics
      ORDER BY efficiency_score DESC
    `;

    const result = await this.pool.query(query);
    
    const data: DepartmentPerformance[] = result.rows.map(row => ({
      departmentId: row.id,
      departmentName: row.name,
      averageUtilization: parseFloat(row.avg_utilization) || 0,
      efficiencyScore: parseFloat(row.efficiency_score) || 0,
      skillCoverage: parseFloat(row.skill_coverage) || 0,
      teamSatisfactionScore: parseFloat(row.team_satisfaction_score) || 0,
      projectCompletionRate: parseFloat(row.project_completion_rate) || 0
    }));

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: data.length,
        dateRange: {
          from: filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: filters.dateTo || new Date()
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Compare two departments
   */
  static async compareDepartments(departmentAId: string, departmentBId: string, filters: AnalyticsFilters = {}): Promise<DepartmentComparison> {
    const departmentMetricsA = await this.getDepartmentMetrics(departmentAId, filters);
    const departmentMetricsB = await this.getDepartmentMetrics(departmentBId, filters);

    const comparisons: ComparisonMetric[] = [
      this.compareMetric('Employee Count', departmentMetricsA.metrics.employeeCount, departmentMetricsB.metrics.employeeCount),
      this.compareMetric('Average Utilization', departmentMetricsA.metrics.averageUtilization, departmentMetricsB.metrics.averageUtilization),
      this.compareMetric('Skill Diversity', departmentMetricsA.metrics.skillDiversity, departmentMetricsB.metrics.skillDiversity),
      this.compareMetric('Experience Level', departmentMetricsA.metrics.experienceLevel, departmentMetricsB.metrics.experienceLevel),
      this.compareMetric('Team Productivity', departmentMetricsA.metrics.teamProductivity, departmentMetricsB.metrics.teamProductivity),
      this.compareMetric('Retention Rate', departmentMetricsA.metrics.retentionRate, departmentMetricsB.metrics.retentionRate),
    ];

    return {
      departmentA: departmentMetricsA,
      departmentB: departmentMetricsB,
      comparisons
    };
  }

  /**
   * Generate capacity forecast (simplified implementation)
   */
  private static async generateCapacityForecast(filters: AnalyticsFilters): Promise<AnalyticsApiResponse<CapacityForecast[]>> {
    const startTime = Date.now();
    
    // This is a simplified forecast - in production you'd use ML models
    const data: CapacityForecast[] = [];
    const today = new Date();
    
    for (let i = 1; i <= 12; i++) {
      const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const baseDemand = 1000 + Math.sin(i / 12 * 2 * Math.PI) * 200;
      const availableCapacity = 900 + Math.random() * 200;
      
      data.push({
        period: futureDate,
        predictedDemand: baseDemand,
        availableCapacity,
        capacityGap: baseDemand - availableCapacity,
        recommendedActions: this.generateRecommendations(baseDemand - availableCapacity),
        confidence: 0.7 + Math.random() * 0.25
      });
    }

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: data.length,
        dateRange: {
          from: today,
          to: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
        },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Helper methods
   */
  private static getDateFormat(period: string): string {
    switch (period) {
      case 'daily':
        return 'DATE(ch.date)';
      case 'weekly':
        return 'DATE_TRUNC(\'week\', ch.date)';
      case 'monthly':
        return 'DATE_TRUNC(\'month\', ch.date)';
      case 'quarterly':
        return 'DATE_TRUNC(\'quarter\', ch.date)';
      default:
        return 'DATE_TRUNC(\'week\', ch.date)';
    }
  }

  private static async getDepartmentMetrics(departmentId: string, filters: AnalyticsFilters): Promise<{id: string; name: string; metrics: DepartmentMetrics}> {
    const query = `
      SELECT 
        d.id,
        d.name,
        COUNT(DISTINCT e.id) as employee_count,
        AVG(ch.utilization_rate) as avg_utilization,
        COUNT(DISTINCT es.skill_id) as skill_count,
        AVG(es.proficiency_level) as avg_experience,
        85 + (RANDOM() * 10) as team_productivity,
        90 + (RANDOM() * 8) as retention_rate
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      LEFT JOIN capacity_history ch ON e.id = ch.employee_id
      LEFT JOIN employee_skills es ON e.id = es.employee_id AND es.is_active = true
      WHERE d.id = $1 AND d.is_active = true
      GROUP BY d.id, d.name
    `;

    const result = await this.pool.query(query, [departmentId]);
    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      metrics: {
        employeeCount: parseInt(row.employee_count) || 0,
        averageUtilization: parseFloat(row.avg_utilization) || 0,
        skillDiversity: parseInt(row.skill_count) || 0,
        experienceLevel: parseFloat(row.avg_experience) || 0,
        teamProductivity: parseFloat(row.team_productivity) || 0,
        retentionRate: parseFloat(row.retention_rate) || 0
      }
    };
  }

  private static compareMetric(metric: string, valueA: number, valueB: number): ComparisonMetric {
    const difference = valueA - valueB;
    const percentageDifference = valueB !== 0 ? (difference / valueB) * 100 : 0;
    
    let winner: 'A' | 'B' | 'tie';
    if (Math.abs(difference) < 0.01) {
      winner = 'tie';
    } else {
      winner = valueA > valueB ? 'A' : 'B';
    }

    return {
      metric,
      valueA,
      valueB,
      difference,
      percentageDifference,
      winner
    };
  }

  private static generateRecommendations(capacityGap: number): string[] {
    const recommendations: string[] = [];
    
    if (capacityGap > 100) {
      recommendations.push('Consider hiring additional team members');
      recommendations.push('Evaluate outsourcing opportunities');
      recommendations.push('Prioritize high-impact projects');
    } else if (capacityGap > 50) {
      recommendations.push('Optimize current resource allocation');
      recommendations.push('Consider cross-training initiatives');
    } else if (capacityGap < -50) {
      recommendations.push('Identify opportunities for skill development');
      recommendations.push('Consider taking on additional projects');
    }

    return recommendations;
  }
}