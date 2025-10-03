"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetService = void 0;
const Budget_1 = require("../models/Budget");
const database_service_1 = require("../database/database.service");
const types_1 = require("../types");
class BudgetService {
    // Create a new budget for a project
    static async createBudget(input) {
        try {
            // Validate that project exists and doesn't already have an active budget
            const existingBudget = await Budget_1.BudgetModel.findByProjectId(input.projectId.toString());
            if (existingBudget && existingBudget.status !== Budget_1.BudgetStatus.CANCELLED) {
                throw new types_1.DatabaseError('Project already has an active budget');
            }
            return await Budget_1.BudgetModel.create(input);
        }
        catch (error) {
            if (error instanceof types_1.DatabaseError) {
                throw error;
            }
            throw new types_1.DatabaseError(`Failed to create budget: ${error.message}`);
        }
    }
    // Calculate project cost based on resource allocations and rates
    static async calculateProjectCost(projectId) {
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
            const resourceCosts = [];
            // Initialize cost breakdown
            const costBreakdown = {
                [Budget_1.CostCategory.LABOR]: {
                    category: Budget_1.CostCategory.LABOR,
                    budgeted: 0,
                    allocated: 0,
                    spent: 0,
                    variance: 0,
                    percentage: 0
                },
                [Budget_1.CostCategory.MATERIALS]: {
                    category: Budget_1.CostCategory.MATERIALS,
                    budgeted: 0,
                    allocated: 0,
                    spent: 0,
                    variance: 0,
                    percentage: 0
                },
                [Budget_1.CostCategory.OVERHEAD]: {
                    category: Budget_1.CostCategory.OVERHEAD,
                    budgeted: 0,
                    allocated: 0,
                    spent: 0,
                    variance: 0,
                    percentage: 0
                },
                [Budget_1.CostCategory.EQUIPMENT]: {
                    category: Budget_1.CostCategory.EQUIPMENT,
                    budgeted: 0,
                    allocated: 0,
                    spent: 0,
                    variance: 0,
                    percentage: 0
                },
                [Budget_1.CostCategory.TRAVEL]: {
                    category: Budget_1.CostCategory.TRAVEL,
                    budgeted: 0,
                    allocated: 0,
                    spent: 0,
                    variance: 0,
                    percentage: 0
                },
                [Budget_1.CostCategory.OTHER]: {
                    category: Budget_1.CostCategory.OTHER,
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
                costBreakdown[Budget_1.CostCategory.LABOR].allocated += resourceEstimatedCost;
                costBreakdown[Budget_1.CostCategory.LABOR].spent += resourceActualCost;
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
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to calculate project cost: ${error.message}`);
        }
    }
    // Track resource costs for a specific time period
    static async trackResourceCosts(projectId, startDate, endDate) {
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
            const resourceBreakdown = [];
            const dailyCosts = {};
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
                const workingDays = this.getWorkingDaysBetween(new Date(Math.max(new Date(row.start_date).getTime(), startDate.getTime())), new Date(Math.min(row.end_date ? new Date(row.end_date).getTime() : endDate.getTime(), endDate.getTime())));
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
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to track resource costs: ${error.message}`);
        }
    }
    // Generate comprehensive cost reports
    static async generateCostReports(projectId) {
        try {
            const budget = await Budget_1.BudgetModel.findByProjectId(projectId);
            if (!budget) {
                throw new types_1.DatabaseError('No budget found for this project');
            }
            const costCalculation = await this.calculateProjectCost(projectId);
            // Get project details
            const projectQuery = `SELECT name FROM projects WHERE id = $1`;
            const projectResult = await this.db.query(projectQuery, [projectId]);
            const projectName = projectResult.rows[0]?.name || 'Unknown Project';
            const remainingBudget = Budget_1.BudgetModel.getRemainingBudget(budget);
            const utilizationPercentage = Budget_1.BudgetModel.getUtilizationPercentage(budget);
            // Calculate burn rate (cost per day)
            const burnRate = await this.calculateBurnRate(projectId);
            // Forecast completion date
            const forecastedCompletion = remainingBudget > 0 && burnRate > 0
                ? new Date(Date.now() + (remainingBudget / burnRate) * 24 * 60 * 60 * 1000)
                : null;
            const budgetAnalytics = {
                totalBudget: Number(budget.totalBudget),
                allocatedBudget: Number(budget.allocatedBudget),
                spentBudget: Number(budget.spentBudget),
                remainingBudget,
                utilizationPercentage,
                burnRate,
                forecastedCompletion,
                costVariance: Number(budget.totalBudget) - costCalculation.actualCost,
                healthStatus: Budget_1.BudgetModel.getHealthStatus(budget)
            };
            // Create variance report
            const majorVariances = costCalculation.costBreakdown
                .filter(cb => Math.abs(cb.variance) > (Number(budget.totalBudget) * 0.1)) // >10% variance
                .map(cb => ({
                category: cb.category,
                variance: cb.variance,
                reason: cb.variance > 0 ? 'Under budget' : 'Over budget'
            }));
            const varianceReport = {
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
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to generate cost reports: ${error.message}`);
        }
    }
    // Budget forecasting based on historical data and trends
    static async budgetForecasting(projectId, forecastPeriods = 6) {
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
            const forecasts = result.rows.map(row => {
                const forecastedCost = parseFloat(row.forecasted_cost) || 0;
                const actualCost = parseFloat(row.actual_cost) || 0;
                const variance = forecastedCost - actualCost;
                let trendAnalysis = 'stable';
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
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to generate budget forecast: ${error.message}`);
        }
    }
    // Cost variance analysis
    static async costVarianceAnalysis(projectId) {
        try {
            const budget = await Budget_1.BudgetModel.findByProjectId(projectId);
            if (!budget) {
                throw new types_1.DatabaseError('No budget found for this project');
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
            const recommendations = [];
            if (overallVariance < 0) {
                recommendations.push('Project is over budget. Consider reviewing resource allocations and scope.');
            }
            categoryVariances.forEach(cv => {
                if (cv.variance < -cv.percentage * 0.2) { // 20% over in category
                    recommendations.push(`${cv.category} category is significantly over budget. Review spending in this area.`);
                }
            });
            const utilizationRate = Budget_1.BudgetModel.getUtilizationPercentage(budget);
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
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to perform cost variance analysis: ${error.message}`);
        }
    }
    // Update budget
    static async updateBudget(budgetId, updates) {
        try {
            return await Budget_1.BudgetModel.update(budgetId, updates);
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to update budget: ${error.message}`);
        }
    }
    // Update budget with new spending
    static async updateBudgetSpending(projectId, spentAmount, category, description) {
        try {
            const budget = await Budget_1.BudgetModel.findByProjectId(projectId);
            if (!budget) {
                throw new types_1.DatabaseError('No budget found for this project');
            }
            const updatedSpentBudget = Number(budget.spentBudget) + spentAmount;
            const updatedCategories = { ...budget.costCategories };
            if (updatedCategories[category]) {
                updatedCategories[category].spent += spentAmount;
            }
            else {
                updatedCategories[category] = {
                    budgeted: 0,
                    allocated: 0,
                    spent: spentAmount,
                    committed: 0
                };
            }
            // Update status if over budget
            let newStatus = budget.status;
            if (updatedSpentBudget > Number(budget.totalBudget) && budget.status === Budget_1.BudgetStatus.ACTIVE) {
                newStatus = Budget_1.BudgetStatus.OVERBUDGET;
            }
            return await Budget_1.BudgetModel.update(budget.id.toString(), {
                spentBudget: updatedSpentBudget,
                costCategories: updatedCategories,
                status: newStatus
            });
        }
        catch (error) {
            throw new types_1.DatabaseError(`Failed to update budget spending: ${error.message}`);
        }
    }
    // Private helper methods
    static getWorkingDaysBetween(startDate, endDate) {
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
    static async calculateBurnRate(projectId) {
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
exports.BudgetService = BudgetService;
BudgetService.db = database_service_1.DatabaseService.getInstance();
