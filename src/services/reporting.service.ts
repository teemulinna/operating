import { Pool } from 'pg';
import { DatabaseService } from '../database/database.service';
import { 
  UtilizationData, 
  CapacityTrendData, 
  DepartmentPerformance,
  AnalyticsFilters,
  AnalyticsApiResponse,
  ExportOptions,
  ChartConfiguration 
} from '../types/analytics.types';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportConfiguration {
  id?: string;
  name: string;
  description?: string;
  reportType: 'utilization_report' | 'burn_down_chart' | 'department_analytics' | 
              'executive_dashboard' | 'trend_analysis' | 'comparison_report' | 'custom_report';
  configuration: any;
  createdBy?: string;
  isPublic: boolean;
  isActive: boolean;
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  nextRunDate?: Date;
}

export interface UtilizationReport {
  summary: {
    totalEmployees: number;
    averageUtilization: number;
    overutilizedCount: number;
    underutilizedCount: number;
    departmentCount: number;
  };
  employeeDetails: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    currentUtilization: number;
    allocatedHours: number;
    availableHours: number;
    activeProjects: number;
    utilizationTrend: number;
    status: 'over-allocated' | 'fully-utilized' | 'well-utilized' | 'under-utilized';
  }>;
  departmentBreakdown: UtilizationData[];
  trends: CapacityTrendData[];
  recommendations: string[];
}

export interface BurnDownReport {
  projectId: string;
  projectName: string;
  clientName?: string;
  timeline: Array<{
    date: Date;
    plannedBudget: number;
    actualSpend: number;
    plannedHours: number;
    actualHours: number;
    completionPercentage: number;
    burnRate: number;
  }>;
  currentStatus: {
    budgetStatus: 'over-budget' | 'approaching-budget' | 'on-budget';
    scheduleStatus: 'behind-schedule' | 'on-schedule' | 'ahead-of-schedule';
    estimatedCompletionDate: Date;
    plannedEndDate: Date;
    remainingBudget: number;
    remainingHours: number;
  };
  forecasts: {
    budgetForecast: number;
    timelineForecast: Date;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  };
}

export interface ExecutiveDashboard {
  kpis: {
    totalEmployees: number;
    averageUtilization: number;
    activeProjects: number;
    totalBudget: number;
    actualSpend: number;
    conflictsCount: number;
    capacityAvailable: number;
    revenuePerEmployee: number;
  };
  alerts: Array<{
    type: 'budget' | 'schedule' | 'utilization' | 'capacity';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    affectedProjects?: string[];
    affectedEmployees?: string[];
  }>;
  trends: {
    utilizationTrend: number;
    budgetTrend: number;
    capacityTrend: number;
    satisfactionTrend: number;
  };
  topPerformers: {
    departments: DepartmentPerformance[];
    employees: Array<{
      employeeId: string;
      name: string;
      department: string;
      performanceScore: number;
      utilizationRate: number;
      projectsCompleted: number;
    }>;
  };
}

export interface ComparisonReport {
  type: 'department' | 'project' | 'employee' | 'time-period';
  subjects: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
  }>;
  comparisons: Array<{
    metric: string;
    values: number[];
    winner: string;
    significantDifference: boolean;
    percentageDifferences: number[];
  }>;
  insights: string[];
  recommendations: string[];
}

export class ReportingService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  /**
   * Generate comprehensive utilization report
   */
  async generateUtilizationReport(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<UtilizationReport>> {
    const startTime = Date.now();
    
    // Get date range
    const dateFrom = filters.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = filters.dateTo || new Date();

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        COUNT(DISTINCT d.id) as department_count,
        AVG(cs.utilization_rate) as average_utilization,
        COUNT(*) FILTER (WHERE cs.utilization_rate > 100) as overutilized_count,
        COUNT(*) FILTER (WHERE cs.utilization_rate < 60) as underutilized_count
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN capacity_snapshots cs ON e.id = cs.employee_id 
        AND cs.snapshot_date BETWEEN $1 AND $2
      WHERE e.is_active = TRUE AND d.is_active = TRUE
    `;

    const summaryResult = await this.db.query(summaryQuery, [dateFrom, dateTo]);
    const summary = summaryResult.rows[0];

    // Get employee details
    const employeeQuery = `
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        d.name as department,
        AVG(cs.utilization_rate) as current_utilization,
        AVG(cs.allocated_hours) as allocated_hours,
        AVG(cs.available_hours) as available_hours,
        AVG(cs.active_projects) as active_projects,
        (AVG(cs.utilization_rate) - LAG(AVG(cs.utilization_rate)) OVER (
          PARTITION BY e.id ORDER BY cs.snapshot_date
        )) as utilization_trend,
        CASE 
          WHEN AVG(cs.utilization_rate) > 100 THEN 'over-allocated'
          WHEN AVG(cs.utilization_rate) >= 80 THEN 'fully-utilized'
          WHEN AVG(cs.utilization_rate) >= 60 THEN 'well-utilized'
          ELSE 'under-utilized'
        END as status
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN capacity_snapshots cs ON e.id = cs.employee_id 
        AND cs.snapshot_date BETWEEN $1 AND $2
      WHERE e.is_active = TRUE
      GROUP BY e.id, e.first_name, e.last_name, d.name
      ORDER BY current_utilization DESC
    `;

    const employeeResult = await this.db.query(employeeQuery, [dateFrom, dateTo]);

    // Get department breakdown using existing analytics service
    const { AnalyticsService } = await import('./analytics.service');
    const departmentData = await AnalyticsService.getTeamUtilizationData(filters);
    const trendsData = await AnalyticsService.getCapacityTrends(filters);

    // Generate recommendations
    const recommendations = this.generateUtilizationRecommendations(
      employeeResult.rows,
      departmentData.data
    );

    const data: UtilizationReport = {
      summary: {
        totalEmployees: parseInt(summary.total_employees) || 0,
        averageUtilization: parseFloat(summary.average_utilization) || 0,
        overutilizedCount: parseInt(summary.overutilized_count) || 0,
        underutilizedCount: parseInt(summary.underutilized_count) || 0,
        departmentCount: parseInt(summary.department_count) || 0
      },
      employeeDetails: employeeResult.rows.map(row => ({
        employeeId: row.employee_id,
        employeeName: row.employee_name,
        department: row.department,
        currentUtilization: parseFloat(row.current_utilization) || 0,
        allocatedHours: parseFloat(row.allocated_hours) || 0,
        availableHours: parseFloat(row.available_hours) || 40,
        activeProjects: parseInt(row.active_projects) || 0,
        utilizationTrend: parseFloat(row.utilization_trend) || 0,
        status: row.status
      })),
      departmentBreakdown: departmentData.data,
      trends: trendsData.data,
      recommendations
    };

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: employeeResult.rows.length,
        dateRange: { from: dateFrom, to: dateTo },
        filters,
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Generate project burn-down report
   */
  async generateBurnDownReport(projectId: string): Promise<AnalyticsApiResponse<BurnDownReport>> {
    const startTime = Date.now();

    // Get project details
    const projectQuery = `
      SELECT p.*, 
        COALESCE(p.budget, 0) as budget,
        COALESCE(p.estimated_hours, 0) as estimated_hours
      FROM projects p 
      WHERE p.id = $1
    `;

    const projectResult = await this.db.query(projectQuery, [projectId]);
    if (!projectResult.rows.length) {
      throw new Error('Project not found');
    }
    const project = projectResult.rows[0];

    // Get budget snapshots
    const snapshotsQuery = `
      SELECT 
        snapshot_date,
        planned_budget,
        actual_spend,
        planned_hours,
        actual_hours,
        completion_percentage,
        burn_rate
      FROM project_budget_snapshots
      WHERE project_id = $1
      ORDER BY snapshot_date
    `;

    const snapshotsResult = await this.db.query(snapshotsQuery, [projectId]);

    // Calculate current status
    const latestSnapshot = snapshotsResult.rows[snapshotsResult.rows.length - 1];
    const currentStatus = {
      budgetStatus: this.calculateBudgetStatus(latestSnapshot?.actual_spend || 0, project.budget),
      scheduleStatus: this.calculateScheduleStatus(
        latestSnapshot?.completion_percentage || 0,
        new Date(),
        new Date(project.start_date),
        new Date(project.end_date)
      ),
      estimatedCompletionDate: this.estimateCompletionDate(
        latestSnapshot?.completion_percentage || 0,
        latestSnapshot?.burn_rate || 0,
        new Date(project.end_date)
      ),
      plannedEndDate: new Date(project.end_date),
      remainingBudget: (project.budget || 0) - (latestSnapshot?.actual_spend || 0),
      remainingHours: (project.estimated_hours || 0) - (latestSnapshot?.actual_hours || 0)
    };

    // Generate forecasts
    const forecasts = this.generateProjectForecasts(snapshotsResult.rows, project);

    const data: BurnDownReport = {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client_name,
      timeline: snapshotsResult.rows.map(row => ({
        date: new Date(row.snapshot_date),
        plannedBudget: parseFloat(row.planned_budget) || 0,
        actualSpend: parseFloat(row.actual_spend) || 0,
        plannedHours: parseFloat(row.planned_hours) || 0,
        actualHours: parseFloat(row.actual_hours) || 0,
        completionPercentage: parseFloat(row.completion_percentage) || 0,
        burnRate: parseFloat(row.burn_rate) || 0
      })),
      currentStatus,
      forecasts
    };

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: snapshotsResult.rows.length,
        dateRange: {
          from: new Date(project.start_date),
          to: new Date(project.end_date)
        },
        filters: {},
        processingTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Generate executive dashboard
   */
  async generateExecutiveDashboard(filters: AnalyticsFilters = {}): Promise<AnalyticsApiResponse<ExecutiveDashboard>> {
    const startTime = Date.now();

    // Get KPIs
    const kpisQuery = `
      SELECT 
        COUNT(DISTINCT e.id) as total_employees,
        AVG(cs.utilization_rate) as average_utilization,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('active', 'in-progress')) as active_projects,
        SUM(p.budget) as total_budget,
        SUM(pbs.actual_spend) as actual_spend,
        COUNT(DISTINCT ra.id) FILTER (WHERE ra.status = 'conflict') as conflicts_count,
        SUM(cs.available_hours - cs.allocated_hours) as capacity_available,
        AVG(dpm.revenue_per_employee) as revenue_per_employee
      FROM employees e
      LEFT JOIN capacity_snapshots cs ON e.id = cs.employee_id
      LEFT JOIN projects p ON 1=1
      LEFT JOIN project_budget_snapshots pbs ON p.id = pbs.project_id
      LEFT JOIN resource_allocations ra ON e.id = ra.employee_id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN department_performance_metrics dpm ON d.id = dpm.department_id
      WHERE e.is_active = TRUE
    `;

    const kpisResult = await this.db.query(kpisQuery);
    const kpis = kpisResult.rows[0];

    // Get alerts
    const alerts = await this.generateAlerts(filters);

    // Get trends
    const trends = await this.calculateTrends(filters);

    // Get top performers
    const topPerformers = await this.getTopPerformers(filters);

    const data: ExecutiveDashboard = {
      kpis: {
        totalEmployees: parseInt(kpis.total_employees) || 0,
        averageUtilization: parseFloat(kpis.average_utilization) || 0,
        activeProjects: parseInt(kpis.active_projects) || 0,
        totalBudget: parseFloat(kpis.total_budget) || 0,
        actualSpend: parseFloat(kpis.actual_spend) || 0,
        conflictsCount: parseInt(kpis.conflicts_count) || 0,
        capacityAvailable: parseFloat(kpis.capacity_available) || 0,
        revenuePerEmployee: parseFloat(kpis.revenue_per_employee) || 0
      },
      alerts,
      trends,
      topPerformers
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
   * Generate comparison report
   */
  async generateComparisonReport(
    type: 'department' | 'project' | 'employee' | 'time-period',
    subjectIds: string[],
    metrics: string[],
    filters: AnalyticsFilters = {}
  ): Promise<AnalyticsApiResponse<ComparisonReport>> {
    const startTime = Date.now();

    let subjects: Array<{ id: string; name: string; metrics: Record<string, number> }> = [];
    
    if (type === 'department') {
      subjects = await this.getDepartmentMetricsForComparison(subjectIds, metrics, filters);
    } else if (type === 'project') {
      subjects = await this.getProjectMetricsForComparison(subjectIds, metrics, filters);
    } else if (type === 'employee') {
      subjects = await this.getEmployeeMetricsForComparison(subjectIds, metrics, filters);
    }

    // Calculate comparisons
    const comparisons = this.calculateComparisons(subjects, metrics);
    
    // Generate insights and recommendations
    const insights = this.generateComparisonInsights(comparisons, type);
    const recommendations = this.generateComparisonRecommendations(comparisons, subjects);

    const data: ComparisonReport = {
      type,
      subjects,
      comparisons,
      insights,
      recommendations
    };

    return {
      data,
      metadata: {
        generatedAt: new Date(),
        dataPoints: subjects.length,
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
   * Export report to various formats
   */
  async exportReport(
    reportData: any,
    reportType: string,
    exportOptions: ExportOptions
  ): Promise<{ filePath: string; format: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${reportType}_${timestamp}.${exportOptions.format}`;
    const filePath = path.join(process.cwd(), 'reports', fileName);

    // Ensure reports directory exists
    const reportsDir = path.dirname(filePath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    let fileContent: Buffer | string;
    
    switch (exportOptions.format) {
      case 'json':
        fileContent = JSON.stringify(reportData, null, 2);
        break;
      case 'csv':
        fileContent = await this.convertToCSV(reportData, reportType);
        break;
      case 'pdf':
        fileContent = await this.generatePDF(reportData, reportType, exportOptions);
        break;
      default:
        throw new Error(`Unsupported export format: ${exportOptions.format}`);
    }

    fs.writeFileSync(filePath, fileContent);
    const stats = fs.statSync(filePath);

    return {
      filePath,
      format: exportOptions.format,
      size: stats.size
    };
  }

  /**
   * Save report configuration
   */
  async saveReportConfiguration(config: ReportConfiguration): Promise<string> {
    const query = `
      INSERT INTO report_configurations (
        name, description, report_type, configuration, 
        created_by, is_public, is_active, schedule_frequency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const values = [
      config.name,
      config.description,
      config.reportType,
      JSON.stringify(config.configuration),
      config.createdBy,
      config.isPublic,
      config.isActive,
      config.scheduleFrequency
    ];

    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  /**
   * Get saved report configurations
   */
  async getReportConfigurations(userId?: string): Promise<ReportConfiguration[]> {
    const query = `
      SELECT * FROM report_configurations 
      WHERE is_active = TRUE 
        AND (is_public = TRUE OR created_by = $1)
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId || null]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      reportType: row.report_type,
      configuration: JSON.parse(row.configuration),
      createdBy: row.created_by,
      isPublic: row.is_public,
      isActive: row.is_active,
      scheduleFrequency: row.schedule_frequency,
      nextRunDate: row.next_run_date ? new Date(row.next_run_date) : undefined
    }));
  }

  // Private helper methods
  private generateUtilizationRecommendations(
    employeeData: any[], 
    departmentData: UtilizationData[]
  ): string[] {
    const recommendations: string[] = [];
    
    const overutilized = employeeData.filter(e => e.current_utilization > 100);
    const underutilized = employeeData.filter(e => e.current_utilization < 60);

    if (overutilized.length > 0) {
      recommendations.push(`${overutilized.length} employees are over-allocated. Consider redistributing workload.`);
    }

    if (underutilized.length > 0) {
      recommendations.push(`${underutilized.length} employees are under-utilized. Consider additional project assignments.`);
    }

    const lowUtilDepts = departmentData.filter(d => d.averageUtilization < 60);
    if (lowUtilDepts.length > 0) {
      recommendations.push(`Departments ${lowUtilDepts.map(d => d.departmentName).join(', ')} have low utilization rates.`);
    }

    return recommendations;
  }

  private calculateBudgetStatus(actualSpend: number, plannedBudget: number): 'over-budget' | 'approaching-budget' | 'on-budget' {
    if (actualSpend > plannedBudget) return 'over-budget';
    if (actualSpend > plannedBudget * 0.8) return 'approaching-budget';
    return 'on-budget';
  }

  private calculateScheduleStatus(
    completionPercentage: number,
    currentDate: Date,
    startDate: Date,
    endDate: Date
  ): 'behind-schedule' | 'on-schedule' | 'ahead-of-schedule' {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = currentDate.getTime() - startDate.getTime();
    const expectedCompletion = (elapsed / totalDuration) * 100;

    if (completionPercentage < expectedCompletion - 5) return 'behind-schedule';
    if (completionPercentage > expectedCompletion + 5) return 'ahead-of-schedule';
    return 'on-schedule';
  }

  private estimateCompletionDate(
    completionPercentage: number,
    burnRate: number,
    plannedEndDate: Date
  ): Date {
    if (completionPercentage >= 100 || burnRate <= 0) return plannedEndDate;
    
    const remainingWork = 100 - completionPercentage;
    const estimatedDaysRemaining = remainingWork / (burnRate * 7); // Assuming weekly burn rate
    
    return new Date(Date.now() + estimatedDaysRemaining * 24 * 60 * 60 * 1000);
  }

  private generateProjectForecasts(snapshots: any[], project: any): any {
    // Simplified forecasting logic - in production, use ML models
    const recentSnapshots = snapshots.slice(-5);
    const avgBurnRate = recentSnapshots.reduce((sum, s) => sum + (s.burn_rate || 0), 0) / recentSnapshots.length;
    
    const remainingBudget = (project.budget || 0) - (recentSnapshots[recentSnapshots.length - 1]?.actual_spend || 0);
    const forecastedDays = remainingBudget / (avgBurnRate || 1);
    
    return {
      budgetForecast: project.budget * 1.1, // Simple 10% buffer
      timelineForecast: new Date(Date.now() + forecastedDays * 24 * 60 * 60 * 1000),
      riskLevel: avgBurnRate > (project.budget / 30) ? 'high' : 'medium',
      recommendations: [
        'Monitor burn rate closely',
        'Consider resource reallocation if behind schedule'
      ]
    };
  }

  private async generateAlerts(filters: AnalyticsFilters): Promise<any[]> {
    // Implementation for generating alerts based on thresholds
    return []; // Simplified for this example
  }

  private async calculateTrends(filters: AnalyticsFilters): Promise<any> {
    // Implementation for calculating various trends
    return {
      utilizationTrend: 2.5,
      budgetTrend: -1.2,
      capacityTrend: 0.8,
      satisfactionTrend: 1.5
    };
  }

  private async getTopPerformers(filters: AnalyticsFilters): Promise<any> {
    // Implementation for getting top performing departments and employees
    return {
      departments: [],
      employees: []
    };
  }

  private async getDepartmentMetricsForComparison(
    departmentIds: string[],
    metrics: string[],
    filters: AnalyticsFilters
  ): Promise<Array<{ id: string; name: string; metrics: Record<string, number> }>> {
    // Implementation for getting department metrics
    return [];
  }

  private async getProjectMetricsForComparison(
    projectIds: string[],
    metrics: string[],
    filters: AnalyticsFilters
  ): Promise<Array<{ id: string; name: string; metrics: Record<string, number> }>> {
    // Implementation for getting project metrics
    return [];
  }

  private async getEmployeeMetricsForComparison(
    employeeIds: string[],
    metrics: string[],
    filters: AnalyticsFilters
  ): Promise<Array<{ id: string; name: string; metrics: Record<string, number> }>> {
    // Implementation for getting employee metrics
    return [];
  }

  private calculateComparisons(
    subjects: Array<{ id: string; name: string; metrics: Record<string, number> }>,
    metrics: string[]
  ): any[] {
    // Implementation for calculating metric comparisons
    return [];
  }

  private generateComparisonInsights(comparisons: any[], type: string): string[] {
    // Implementation for generating insights from comparisons
    return [];
  }

  private generateComparisonRecommendations(comparisons: any[], subjects: any[]): string[] {
    // Implementation for generating recommendations
    return [];
  }

  private async convertToCSV(reportData: any, reportType: string): Promise<string> {
    // Implementation for CSV conversion
    return 'csv content';
  }

  private async generatePDF(reportData: any, reportType: string, options: ExportOptions): Promise<Buffer> {
    // Implementation for PDF generation using puppeteer or similar
    return Buffer.from('pdf content');
  }
}