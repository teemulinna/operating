import { Pool } from 'pg';
import { 
  Budget, 
  BudgetModel, 
  CreateBudgetInput, 
  UpdateBudgetInput, 
  BudgetStatus,
  CostCategory,
  Currency
} from '../models/Budget';
import { 
  ResourceCost, 
  ResourceCostModel
} from '../models/ResourceCost';
import { DatabaseService } from '../database/database.service';
import { DatabaseError } from '../types';

export interface BudgetAnalytics {
  totalBudget: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  utilizationPercentage: number;
  burnRate: number;
  forecastedCompletion: Date | null;
  costVariance: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

export interface CostBreakdown {
  category: CostCategory;
  budgeted: number;
  allocated: number;
  spent: number;
  variance: number;
  percentage: number;
}

export interface ResourceCostSummary {
  employeeId: string;
  employeeName: string;
  baseRate: number;
  billableRate?: number;
  totalHours: number;
  totalCost: number;
  budgetedCost: number;
  variance: number;
  utilizationRate: number;
}

export interface BudgetForecast {
  period: string;
  forecastedCost: number;
  actualCost: number;
  variance: number;
  trendAnalysis: 'improving' | 'stable' | 'deteriorating';
}

export interface CostVarianceReport {
  projectId: number;
  projectName: string;
  originalBudget: number;
  revisedBudget: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  majorVariances: {
    category: CostCategory;
    variance: number;
    reason?: string;
  }[];
}

export class BudgetService {
  private static db = DatabaseService.getInstance();

  // Create a new budget for a project
  static async createBudget(input: CreateBudgetInput): Promise<Budget> {
    try {
      // Validate that project exists and doesn't already have an active budget
      const existingBudget = await BudgetModel.findByProjectId(input.projectId.toString());
      if (existingBudget && existingBudget.status !== BudgetStatus.CANCELLED) {
        throw new DatabaseError('Project already has an active budget');
      }

      return await BudgetModel.create(input);
    } catch (error: any) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Failed to create budget: ${error.message}`);
    }
  }

  // Calculate project cost based on resource allocations and rates
  static async calculateProjectCost(projectId: string): Promise<{
    estimatedCost: number;
    actualCost: number;
    costBreakdown: CostBreakdown[];
    resourceCosts: ResourceCostSummary[];
  }> {
    try {
      const query = `
        SELECT 
          e.id as employee_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          ra.allocated_hours,
          ra.actual_hours,
          ra.hourly_rate as allocation_rate,
          rc.base_rate,
          rc.billable_rate,
          rc.cost_type,
          ra.role_on_project
        FROM resource_allocations ra
        JOIN employees e ON ra.employee_id = e.id
        LEFT JOIN resource_costs rc ON e.id = rc.employee_id 
          AND rc.is_active = true 
          AND rc.effective_date <= CURRENT_DATE
          AND (rc.end_date IS NULL OR rc.end_date >= CURRENT_DATE)
        WHERE ra.project_id = $1 AND ra.is_active = true
        ORDER BY ra.allocated_hours DESC
      `;

      const result = await this.db.query(query, [projectId]);
      
      let estimatedCost = 0;
      let actualCost = 0;
      const resourceCosts: ResourceCostSummary[] = [];
      
      // Initialize cost breakdown
      const costBreakdown: { [key in CostCategory]: CostBreakdown } = {
        [CostCategory.LABOR]: {
          category: CostCategory.LABOR,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        },
        [CostCategory.MATERIALS]: {
          category: CostCategory.MATERIALS,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        },
        [CostCategory.OVERHEAD]: {
          category: CostCategory.OVERHEAD,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        },
        [CostCategory.EQUIPMENT]: {
          category: CostCategory.EQUIPMENT,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        },
        [CostCategory.TRAVEL]: {
          category: CostCategory.TRAVEL,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        },
        [CostCategory.OTHER]: {
          category: CostCategory.OTHER,
          budgeted: 0,
          allocated: 0,
          spent: 0,
          variance: 0,
          percentage: 0
        }
      };

      for (const row of result.rows) {
        const allocatedHours = parseFloat(row.allocated_hours) || 0;
        const actualHours = parseFloat(row.actual_hours) || 0;
        const rate = parseFloat(row.allocation_rate) || parseFloat(row.base_rate) || 0;
        const billableRate = parseFloat(row.billable_rate) || rate;

        const resourceEstimatedCost = allocatedHours * rate;
        const resourceActualCost = actualHours * rate;

        estimatedCost += resourceEstimatedCost;
        actualCost += resourceActualCost;

        // Add to labor category
        costBreakdown[CostCategory.LABOR].allocated += resourceEstimatedCost;
        costBreakdown[CostCategory.LABOR].spent += resourceActualCost;

        resourceCosts.push({
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          baseRate: parseFloat(row.base_rate) || 0,
          billableRate: parseFloat(row.billable_rate),
          totalHours: allocatedHours,
          totalCost: resourceEstimatedCost,
          budgetedCost: resourceEstimatedCost,
          variance: resourceEstimatedCost - resourceActualCost,
          utilizationRate: allocatedHours > 0 ? (actualHours / allocatedHours) * 100 : 0
        });
      }

      // Calculate percentages and variances
      const totalBudget = estimatedCost;
      Object.values(costBreakdown).forEach(breakdown => {
        breakdown.variance = breakdown.allocated - breakdown.spent;
        breakdown.percentage = totalBudget > 0 ? (breakdown.allocated / totalBudget) * 100 : 0;
      });

      return {
        estimatedCost,
        actualCost,
        costBreakdown: Object.values(costBreakdown).filter(cb => cb.allocated > 0 || cb.spent > 0),
        resourceCosts
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to calculate project cost: ${error.message}`);
    }
  }

  // Track resource costs for a specific time period
  static async trackResourceCosts(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCost: number;
    dailyCosts: { date: string; cost: number }[];
    resourceBreakdown: ResourceCostSummary[];
  }> {
    try {
      const query = `
        SELECT 
          e.id as employee_id,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          ra.allocated_hours,
          ra.actual_hours,
          ra.hourly_rate,
          rc.base_rate,
          rc.billable_rate,
          ra.start_date,
          ra.end_date
        FROM resource_allocations ra
        JOIN employees e ON ra.employee_id = e.id
        LEFT JOIN resource_costs rc ON e.id = rc.employee_id 
          AND rc.is_active = true
          AND rc.effective_date <= ra.start_date
          AND (rc.end_date IS NULL OR rc.end_date >= ra.start_date)
        WHERE ra.project_id = $1 
          AND ra.is_active = true
          AND ra.start_date <= $3
          AND (ra.end_date IS NULL OR ra.end_date >= $2)
        ORDER BY e.last_name, e.first_name
      `;

      const result = await this.db.query(query, [projectId, startDate, endDate]);
      
      let totalCost = 0;
      const resourceBreakdown: ResourceCostSummary[] = [];
      const dailyCosts: { [date: string]: number } = {};

      // Generate daily cost tracking
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        dailyCosts[dateStr] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const row of result.rows) {
        const rate = parseFloat(row.hourly_rate) || parseFloat(row.base_rate) || 0;
        const allocatedHours = parseFloat(row.allocated_hours) || 0;
        const actualHours = parseFloat(row.actual_hours) || 0;
        
        // Calculate cost for the period
        const workingDays = this.getWorkingDaysBetween(
          new Date(Math.max(new Date(row.start_date).getTime(), startDate.getTime())),
          new Date(Math.min(row.end_date ? new Date(row.end_date).getTime() : endDate.getTime(), endDate.getTime()))
        );
        
        const dailyRate = (allocatedHours * rate) / Math.max(workingDays, 1);
        const resourceTotalCost = workingDays * dailyRate;
        
        totalCost += resourceTotalCost;

        // Distribute cost across working days
        const periodStart = new Date(Math.max(new Date(row.start_date).getTime(), startDate.getTime()));
        const periodEnd = new Date(Math.min(row.end_date ? new Date(row.end_date).getTime() : endDate.getTime(), endDate.getTime()));
        
        const currentDay = new Date(periodStart);
        while (currentDay <= periodEnd) {
          const dayOfWeek = currentDay.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
            const dateStr = currentDay.toISOString().split('T')[0];
            if (dailyCosts[dateStr] !== undefined) {
              dailyCosts[dateStr] += dailyRate;
            }
          }
          currentDay.setDate(currentDay.getDate() + 1);
        }

        resourceBreakdown.push({
          employeeId: row.employee_id,
          employeeName: row.employee_name,
          baseRate: parseFloat(row.base_rate) || 0,
          billableRate: parseFloat(row.billable_rate),
          totalHours: allocatedHours,
          totalCost: resourceTotalCost,
          budgetedCost: allocatedHours * rate,
          variance: (allocatedHours * rate) - resourceTotalCost,
          utilizationRate: allocatedHours > 0 ? (actualHours / allocatedHours) * 100 : 0
        });
      }

      return {
        totalCost,
        dailyCosts: Object.entries(dailyCosts).map(([date, cost]) => ({ date, cost })),
        resourceBreakdown
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to track resource costs: ${error.message}`);
    }
  }

  // Generate comprehensive cost reports
  static async generateCostReports(projectId: string): Promise<{
    budgetAnalytics: BudgetAnalytics;
    costBreakdown: CostBreakdown[];
    varianceReport: CostVarianceReport;
    resourceCosts: ResourceCostSummary[];
  }> {
    try {
      const budget = await BudgetModel.findByProjectId(projectId);
      if (!budget) {
        throw new DatabaseError('No budget found for this project');
      }

      const costCalculation = await this.calculateProjectCost(projectId);
      
      // Get project details
      const projectQuery = `SELECT name FROM projects WHERE id = $1`;
      const projectResult = await this.db.query(projectQuery, [projectId]);
      const projectName = projectResult.rows[0]?.name || 'Unknown Project';

      const remainingBudget = BudgetModel.getRemainingBudget(budget);
      const utilizationPercentage = BudgetModel.getUtilizationPercentage(budget);
      
      // Calculate burn rate (cost per day)
      const burnRate = await this.calculateBurnRate(projectId);
      
      // Forecast completion date
      const forecastedCompletion = remainingBudget > 0 && burnRate > 0 
        ? new Date(Date.now() + (remainingBudget / burnRate) * 24 * 60 * 60 * 1000)
        : null;

      const budgetAnalytics: BudgetAnalytics = {
        totalBudget: Number(budget.totalBudget),
        allocatedBudget: Number(budget.allocatedBudget),
        spentBudget: Number(budget.spentBudget),
        remainingBudget,
        utilizationPercentage,
        burnRate,
        forecastedCompletion,
        costVariance: Number(budget.totalBudget) - costCalculation.actualCost,
        healthStatus: BudgetModel.getHealthStatus(budget)
      };

      // Create variance report
      const majorVariances = costCalculation.costBreakdown
        .filter(cb => Math.abs(cb.variance) > (Number(budget.totalBudget) * 0.1)) // >10% variance
        .map(cb => ({
          category: cb.category,
          variance: cb.variance,
          reason: cb.variance > 0 ? 'Under budget' : 'Over budget'
        }));

      const varianceReport: CostVarianceReport = {
        projectId: Number(projectId),
        projectName,
        originalBudget: Number(budget.totalBudget),
        revisedBudget: Number(budget.totalBudget), // Could be different if budget was revised
        actualCost: costCalculation.actualCost,
        variance: Number(budget.totalBudget) - costCalculation.actualCost,
        variancePercentage: Number(budget.totalBudget) > 0 
          ? ((Number(budget.totalBudget) - costCalculation.actualCost) / Number(budget.totalBudget)) * 100
          : 0,
        majorVariances
      };

      return {
        budgetAnalytics,
        costBreakdown: costCalculation.costBreakdown,
        varianceReport,
        resourceCosts: costCalculation.resourceCosts
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to generate cost reports: ${error.message}`);
    }
  }

  // Budget forecasting based on historical data and trends
  static async budgetForecasting(
    projectId: string,
    forecastPeriods: number = 6
  ): Promise<BudgetForecast[]> {
    try {
      const query = `
        SELECT 
          DATE_TRUNC('month', ra.start_date) as month,
          SUM(ra.allocated_hours * COALESCE(ra.hourly_rate, rc.base_rate, 0)) as forecasted_cost,
          SUM(COALESCE(ra.actual_hours, 0) * COALESCE(ra.hourly_rate, rc.base_rate, 0)) as actual_cost
        FROM resource_allocations ra
        LEFT JOIN resource_costs rc ON ra.employee_id = rc.employee_id 
          AND rc.is_active = true
          AND rc.effective_date <= ra.start_date
        WHERE ra.project_id = $1 AND ra.is_active = true
        GROUP BY DATE_TRUNC('month', ra.start_date)
        ORDER BY month DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [projectId, forecastPeriods]);
      
      const forecasts: BudgetForecast[] = result.rows.map(row => {
        const forecastedCost = parseFloat(row.forecasted_cost) || 0;
        const actualCost = parseFloat(row.actual_cost) || 0;
        const variance = forecastedCost - actualCost;
        
        let trendAnalysis: 'improving' | 'stable' | 'deteriorating' = 'stable';
        if (Math.abs(variance) > forecastedCost * 0.1) {
          trendAnalysis = variance > 0 ? 'improving' : 'deteriorating';
        }

        return {
          period: row.month.toISOString().substring(0, 7), // YYYY-MM format
          forecastedCost,
          actualCost,
          variance,
          trendAnalysis
        };
      });

      return forecasts;
    } catch (error: any) {
      throw new DatabaseError(`Failed to generate budget forecast: ${error.message}`);
    }
  }

  // Cost variance analysis
  static async costVarianceAnalysis(projectId: string): Promise<{
    overallVariance: number;
    categoryVariances: { category: CostCategory; variance: number; percentage: number }[];
    timeVariances: { period: string; variance: number }[];
    recommendations: string[];
  }> {
    try {
      const budget = await BudgetModel.findByProjectId(projectId);
      if (!budget) {
        throw new DatabaseError('No budget found for this project');
      }

      const costCalculation = await this.calculateProjectCost(projectId);
      const overallVariance = Number(budget.totalBudget) - costCalculation.actualCost;
      
      // Category variances
      const categoryVariances = costCalculation.costBreakdown.map(cb => ({
        category: cb.category,
        variance: cb.variance,
        percentage: cb.allocated > 0 ? (cb.variance / cb.allocated) * 100 : 0
      }));

      // Time-based variances (monthly)
      const timeVariances = await this.budgetForecasting(projectId, 12);
      
      // Generate recommendations based on analysis
      const recommendations: string[] = [];
      
      if (overallVariance < 0) {
        recommendations.push('Project is over budget. Consider reviewing resource allocations and scope.');
      }
      
      categoryVariances.forEach(cv => {
        if (cv.variance < -cv.percentage * 0.2) { // 20% over in category
          recommendations.push(`${cv.category} category is significantly over budget. Review spending in this area.`);
        }
      });
      
      const utilizationRate = BudgetModel.getUtilizationPercentage(budget);
      if (utilizationRate > 90) {
        recommendations.push('High budget utilization detected. Consider increasing contingency or reducing scope.');
      }

      return {
        overallVariance,
        categoryVariances,
        timeVariances: timeVariances.map(tv => ({
          period: tv.period,
          variance: tv.variance
        })),
        recommendations
      };
    } catch (error: any) {
      throw new DatabaseError(`Failed to perform cost variance analysis: ${error.message}`);
    }
  }

  // Update budget
  static async updateBudget(budgetId: string, updates: UpdateBudgetInput): Promise<Budget> {
    try {
      return await BudgetModel.update(budgetId, updates);
    } catch (error: any) {
      throw new DatabaseError(`Failed to update budget: ${error.message}`);
    }
  }

  // Update budget with new spending
  static async updateBudgetSpending(
    projectId: string,
    spentAmount: number,
    category: CostCategory,
    description?: string
  ): Promise<Budget> {
    try {
      const budget = await BudgetModel.findByProjectId(projectId);
      if (!budget) {
        throw new DatabaseError('No budget found for this project');
      }

      const updatedSpentBudget = Number(budget.spentBudget) + spentAmount;
      const updatedCategories = { ...budget.costCategories };
      
      if (updatedCategories[category]) {
        updatedCategories[category].spent += spentAmount;
      } else {
        updatedCategories[category] = {
          budgeted: 0,
          allocated: 0,
          spent: spentAmount,
          committed: 0
        };
      }

      // Update status if over budget
      let newStatus = budget.status;
      if (updatedSpentBudget > Number(budget.totalBudget) && budget.status === BudgetStatus.ACTIVE) {
        newStatus = BudgetStatus.OVERBUDGET;
      }

      return await BudgetModel.update(budget.id.toString(), {
        spentBudget: updatedSpentBudget,
        costCategories: updatedCategories,
        status: newStatus
      });
    } catch (error: any) {
      throw new DatabaseError(`Failed to update budget spending: ${error.message}`);
    }
  }

  // Private helper methods
  private static getWorkingDaysBetween(startDate: Date, endDate: Date): number {
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  private static async calculateBurnRate(projectId: string): Promise<number> {
    const query = `
      SELECT 
        AVG(daily_cost) as avg_daily_cost
      FROM (
        SELECT 
          DATE(ra.start_date) as date,
          SUM(ra.allocated_hours * COALESCE(ra.hourly_rate, rc.base_rate, 0) / 
              NULLIF(EXTRACT(days FROM ra.end_date - ra.start_date + INTERVAL '1 day'), 0)) as daily_cost
        FROM resource_allocations ra
        LEFT JOIN resource_costs rc ON ra.employee_id = rc.employee_id 
          AND rc.is_active = true
        WHERE ra.project_id = $1 
          AND ra.is_active = true 
          AND ra.start_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(ra.start_date)
      ) daily_costs
    `;

    const result = await this.db.query(query, [projectId]);
    return parseFloat(result.rows[0]?.avg_daily_cost) || 0;
  }
}