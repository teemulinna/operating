import { DatabaseService } from '../database/database.service';

export interface ProjectBudget {
  id?: number;
  projectId: number;
  version: number;
  totalBudget: number;
  laborBudget: number;
  nonLaborBudget: number;
  contingencyPercentage: number;
  currency: string;
  approvedBy?: number;
  approvedAt?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revised';
  effectiveDate: Date;
  budgetCategories?: BudgetCategory[];
  rateCards?: RateCard[];
}

export interface BudgetCategory {
  id?: number;
  budgetId: number;
  category: string;
  subcategory?: string;
  amount: number;
  percentageOfTotal: number;
  description?: string;
  isFixedCost: boolean;
}

export interface RateCard {
  id?: number;
  role?: string;
  skill?: string;
  level?: string;
  department?: string;
  hourlyRate: number;
  currency: string;
  effectiveDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdBy?: number;
  approvedBy?: number;
  notes?: string;
}

export interface ProjectCost {
  id?: number;
  projectId: number;
  budgetId?: number;
  category: string;
  subcategory?: string;
  costType: 'labor' | 'material' | 'overhead' | 'external' | 'travel' | 'other';
  amount: number;
  currency: string;
  costDate: Date;
  employeeId: string;
  hoursWorked?: number;
  hourlyRate?: number;
  description?: string;
  invoiceReference?: string;
  isBillable: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: number;
  approvedAt?: Date;
}

export interface BudgetForecast {
  forecast: {
    forecastedTotalCost: number;
    forecastedLaborCost: number;
    forecastedNonLaborCost: number;
    confidenceLevel: number;
  };
  scenarios: {
    optimistic: { totalCost: number; probability: number };
    realistic: { totalCost: number; probability: number };
    pessimistic: { totalCost: number; probability: number };
  };
  riskFactors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    likelihood: number;
    mitigation: string;
  }>;
}

export interface CostTracking {
  costBreakdown: {
    labor: { planned: number; actual: number; variance: number };
    nonLabor: { planned: number; actual: number; variance: number };
    total: { planned: number; actual: number; variance: number };
  };
  plannedVsActual: Array<{
    period: string;
    planned: number;
    actual: number;
    variance: number;
    variancePercentage: number;
  }>;
  variance: {
    costVariance: number;
    costVariancePercentage: number;
    scheduleVariance: number;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
  };
  trends: {
    burnRate: number;
    projectedCompletion: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface MarginAnalysis {
  grossMargin: {
    amount: number;
    percentage: number;
  };
  netMargin: {
    amount: number;
    percentage: number;
  };
  profitability: {
    score: number; // 1-100
    rating: 'poor' | 'fair' | 'good' | 'excellent';
  };
  costEfficiency: {
    laborEfficiency: number;
    overallEfficiency: number;
  };
  recommendations: Array<{
    type: 'cost_reduction' | 'revenue_optimization' | 'scope_adjustment';
    description: string;
    expectedImpact: number;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export class ProjectBudgetingService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // Budget CRUD operations
  async createProjectBudget(budgetData: ProjectBudget): Promise<ProjectBudget> {
    // Validate budget totals
    const calculatedTotal = budgetData.laborBudget + budgetData.nonLaborBudget;
    const tolerance = budgetData.totalBudget * 0.01; // 1% tolerance
    
    if (Math.abs(calculatedTotal - budgetData.totalBudget) > tolerance) {
      throw new Error('Labor and non-labor budget totals do not match total budget');
    }

    const client = await this.db.getClient();
    try {
      await client.query('BEGIN');

      // Create main budget record
      const budgetQuery = `
        INSERT INTO project_budgets 
        (project_id, version, total_budget, labor_budget, non_labor_budget, 
         contingency_percentage, currency, status, effective_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      // Get next version number
      const versionResult = await client.query(
        'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM project_budgets WHERE project_id = $1',
        [budgetData.projectId]
      );
      const nextVersion = versionResult.rows[0].next_version;

      const budgetResult = await client.query(budgetQuery, [
        budgetData.projectId,
        nextVersion,
        budgetData.totalBudget,
        budgetData.laborBudget,
        budgetData.nonLaborBudget,
        budgetData.contingencyPercentage || 10,
        budgetData.currency || 'USD',
        budgetData.status || 'draft',
        budgetData.effectiveDate || new Date()
      ]);

      const budget = budgetResult.rows[0];
      const budgetId = budget.id;

      // Create budget categories if provided
      if (budgetData.budgetCategories && budgetData.budgetCategories.length > 0) {
        for (const category of budgetData.budgetCategories) {
          await client.query(`
            INSERT INTO budget_categories 
            (budget_id, category, subcategory, amount, percentage_of_total, description, is_fixed_cost)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            budgetId,
            category.category,
            category.subcategory || null,
            category.amount,
            (category.amount / budgetData.totalBudget) * 100,
            category.description || null,
            category.isFixedCost || false
          ]);
        }
      }

      // Create rate cards if provided
      if (budgetData.rateCards && budgetData.rateCards.length > 0) {
        for (const rate of budgetData.rateCards) {
          await client.query(`
            INSERT INTO rate_cards 
            (role, hourly_rate, currency, effective_date, is_active)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            rate.role,
            rate.hourlyRate,
            rate.currency || 'USD',
            rate.effectiveDate || new Date(),
            true
          ]);
        }
      }

      await client.query('COMMIT');
      return this.mapBudgetRow(budget);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getProjectBudget(projectId: number): Promise<{
    budget: ProjectBudget;
    currentSpending: number;
    remainingBudget: number;
    burnRate: number;
  } | null> {
    // Get latest budget
    const budgetQuery = `
      SELECT pb.*, 
             COALESCE(bc.categories, '[]'::jsonb) as budget_categories
      FROM project_budgets pb
      LEFT JOIN (
        SELECT 
          budget_id,
          jsonb_agg(
            jsonb_build_object(
              'category', category,
              'subcategory', subcategory,
              'amount', amount,
              'percentageOfTotal', percentage_of_total,
              'description', description,
              'isFixedCost', is_fixed_cost
            )
          ) as categories
        FROM budget_categories
        GROUP BY budget_id
      ) bc ON pb.id = bc.budget_id
      WHERE pb.project_id = $1 AND pb.status = 'approved'
      ORDER BY pb.version DESC
      LIMIT 1
    `;

    const budgetResult = await this.db.query(budgetQuery, [projectId]);
    if (budgetResult.rows.length === 0) return null;

    const budget = this.mapBudgetRow(budgetResult.rows[0]);
    budget.budgetCategories = budgetResult.rows[0].budget_categories;

    // Calculate current spending
    const spendingQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_spending,
        COUNT(*) as transaction_count
      FROM project_costs
      WHERE project_id = $1 AND approval_status = 'approved'
    `;

    const spendingResult = await this.db.query(spendingQuery, [projectId]);
    const currentSpending = parseFloat(spendingResult.rows[0].total_spending);

    // Calculate burn rate (spending per day over last 30 days)
    const burnRateQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) / 30.0 as daily_burn_rate
      FROM project_costs
      WHERE project_id = $1 
        AND approval_status = 'approved'
        AND cost_date >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const burnRateResult = await this.db.query(burnRateQuery, [projectId]);
    const burnRate = parseFloat(burnRateResult.rows[0].daily_burn_rate);

    return {
      budget,
      currentSpending,
      remainingBudget: budget.totalBudget - currentSpending,
      burnRate
    };
  }

  async generateBudgetForecast(projectId: number, forecastRequest: {
    forecastPeriod: string;
    includeRiskFactors: boolean;
    scenarios: string[];
  }): Promise<BudgetForecast> {
    // Get current budget and spending
    const budgetInfo = await this.getProjectBudget(projectId);
    if (!budgetInfo) {
      throw new Error('No approved budget found for project');
    }

    const { budget, currentSpending, burnRate } = budgetInfo;

    // Calculate forecast based on current burn rate and project timeline
    const projectQuery = `
      SELECT start_date, end_date, status FROM projects WHERE id = $1
    `;
    const projectResult = await this.db.query(projectQuery, [projectId]);
    const project = projectResult.rows[0];

    const daysRemaining = project.end_date ? 
      Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 
      90; // Default to 90 days if no end date

    // Base forecast
    const forecastedTotalCost = currentSpending + (burnRate * daysRemaining);
    const forecastedLaborCost = forecastedTotalCost * (budget.laborBudget / budget.totalBudget);
    const forecastedNonLaborCost = forecastedTotalCost - forecastedLaborCost;

    // Scenario calculations
    const scenarios = {
      optimistic: {
        totalCost: forecastedTotalCost * 0.85, // 15% under forecast
        probability: 20
      },
      realistic: {
        totalCost: forecastedTotalCost,
        probability: 60
      },
      pessimistic: {
        totalCost: forecastedTotalCost * 1.25, // 25% over forecast
        probability: 20
      }
    };

    // Risk factors
    const riskFactors = [
      {
        factor: 'Resource Availability',
        impact: burnRate > budget.totalBudget / 100 ? 'high' as const : 'medium' as const,
        likelihood: 0.3,
        mitigation: 'Monitor resource allocation and adjust as needed'
      },
      {
        factor: 'Scope Creep',
        impact: 'medium' as const,
        likelihood: 0.4,
        mitigation: 'Maintain strict change control processes'
      },
      {
        factor: 'Market Rate Changes',
        impact: 'low' as const,
        likelihood: 0.2,
        mitigation: 'Lock in rates with contractors where possible'
      }
    ];

    return {
      forecast: {
        forecastedTotalCost,
        forecastedLaborCost,
        forecastedNonLaborCost,
        confidenceLevel: 75
      },
      scenarios,
      riskFactors
    };
  }

  async getCostTracking(projectId: number, period?: string): Promise<CostTracking> {
    const budgetInfo = await this.getProjectBudget(projectId);
    if (!budgetInfo) {
      throw new Error('No approved budget found for project');
    }

    const { budget, currentSpending } = budgetInfo;

    // Get labor vs non-labor actual costs
    const costBreakdownQuery = `
      SELECT 
        cost_type,
        SUM(amount) as actual_amount
      FROM project_costs
      WHERE project_id = $1 AND approval_status = 'approved'
      GROUP BY cost_type
    `;

    const breakdownResult = await this.db.query(costBreakdownQuery, [projectId]);
    const actualLaborCosts = breakdownResult.rows
      .filter(row => row.cost_type === 'labor')
      .reduce((sum, row) => sum + parseFloat(row.actual_amount), 0);
    
    const actualNonLaborCosts = currentSpending - actualLaborCosts;

    // Get time-series data for trends
    const timeSeriesQuery = `
      SELECT 
        DATE_TRUNC('month', cost_date) as period,
        SUM(amount) as actual
      FROM project_costs
      WHERE project_id = $1 AND approval_status = 'approved'
      GROUP BY DATE_TRUNC('month', cost_date)
      ORDER BY period
    `;

    const timeSeriesResult = await this.db.query(timeSeriesQuery, [projectId]);

    // Calculate planned monthly spending (simple linear distribution)
    const projectStartQuery = `SELECT start_date, end_date FROM projects WHERE id = $1`;
    const projectDates = await this.db.query(projectStartQuery, [projectId]);
    const startDate = new Date(projectDates.rows[0].start_date);
    const endDate = new Date(projectDates.rows[0].end_date);
    const projectDurationMonths = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const plannedMonthlySpending = budget.totalBudget / projectDurationMonths;

    const plannedVsActual = timeSeriesResult.rows.map(row => {
      const actual = parseFloat(row.actual);
      const planned = plannedMonthlySpending;
      const variance = actual - planned;
      
      return {
        period: row.period,
        planned,
        actual,
        variance,
        variancePercentage: planned > 0 ? (variance / planned) * 100 : 0
      };
    });

    // Calculate performance indices
    const earnedValue = currentSpending; // Simplified - would need work completion data
    const costVariance = earnedValue - currentSpending;
    const costVariancePercentage = budget.totalBudget > 0 ? (costVariance / budget.totalBudget) * 100 : 0;
    const costPerformanceIndex = currentSpending > 0 ? earnedValue / currentSpending : 1;

    return {
      costBreakdown: {
        labor: {
          planned: budget.laborBudget,
          actual: actualLaborCosts,
          variance: actualLaborCosts - budget.laborBudget
        },
        nonLabor: {
          planned: budget.nonLaborBudget,
          actual: actualNonLaborCosts,
          variance: actualNonLaborCosts - budget.nonLaborBudget
        },
        total: {
          planned: budget.totalBudget,
          actual: currentSpending,
          variance: currentSpending - budget.totalBudget
        }
      },
      plannedVsActual,
      variance: {
        costVariance,
        costVariancePercentage,
        scheduleVariance: 0, // Would need schedule data
        costPerformanceIndex,
        schedulePerformanceIndex: 1 // Would need schedule data
      },
      trends: {
        burnRate: budgetInfo.burnRate,
        projectedCompletion: currentSpending + (budgetInfo.burnRate * 30), // 30 days projection
        riskLevel: costVariancePercentage > 10 ? 'high' : costVariancePercentage > 5 ? 'medium' : 'low'
      }
    };
  }

  async getMarginAnalysis(projectId: number): Promise<MarginAnalysis> {
    const budgetInfo = await this.getProjectBudget(projectId);
    if (!budgetInfo) {
      throw new Error('No approved budget found for project');
    }

    // Get project revenue (would come from project contracts/billing)
    const revenueQuery = `
      SELECT COALESCE(budget, 0) as revenue FROM projects WHERE id = $1
    `;
    const revenueResult = await this.db.query(revenueQuery, [projectId]);
    const revenue = parseFloat(revenueResult.rows[0].revenue);

    const { budget, currentSpending } = budgetInfo;

    // Calculate margins
    const directCosts = currentSpending;
    const grossMargin = revenue - directCosts;
    const grossMarginPercentage = revenue > 0 ? (grossMargin / revenue) * 100 : 0;

    // Assume 15% overhead for net margin calculation
    const overhead = directCosts * 0.15;
    const netMargin = grossMargin - overhead;
    const netMarginPercentage = revenue > 0 ? (netMargin / revenue) * 100 : 0;

    // Profitability score (0-100)
    let profitabilityScore = Math.max(0, Math.min(100, netMarginPercentage + 50));
    let profitabilityRating: 'poor' | 'fair' | 'good' | 'excellent';
    
    if (profitabilityScore >= 80) profitabilityRating = 'excellent';
    else if (profitabilityScore >= 60) profitabilityRating = 'good';
    else if (profitabilityScore >= 40) profitabilityRating = 'fair';
    else profitabilityRating = 'poor';

    // Cost efficiency metrics
    const laborEfficiency = budget.laborBudget > 0 ? 
      Math.max(0, ((budget.laborBudget - directCosts * 0.7) / budget.laborBudget) * 100) : 100;
    const overallEfficiency = budget.totalBudget > 0 ?
      Math.max(0, ((budget.totalBudget - currentSpending) / budget.totalBudget) * 100) : 100;

    // Generate recommendations
    const recommendations = [];
    
    if (grossMarginPercentage < 20) {
      recommendations.push({
        type: 'cost_reduction' as const,
        description: 'Implement cost reduction measures to improve gross margin',
        expectedImpact: 5,
        priority: 'high' as const
      });
    }

    if (currentSpending > budget.totalBudget * 0.8) {
      recommendations.push({
        type: 'scope_adjustment' as const,
        description: 'Consider scope adjustments to stay within budget',
        expectedImpact: 10,
        priority: 'high' as const
      });
    }

    if (laborEfficiency < 80) {
      recommendations.push({
        type: 'cost_reduction' as const,
        description: 'Optimize resource allocation to improve labor efficiency',
        expectedImpact: 8,
        priority: 'medium' as const
      });
    }

    return {
      grossMargin: {
        amount: grossMargin,
        percentage: grossMarginPercentage
      },
      netMargin: {
        amount: netMargin,
        percentage: netMarginPercentage
      },
      profitability: {
        score: profitabilityScore,
        rating: profitabilityRating
      },
      costEfficiency: {
        laborEfficiency,
        overallEfficiency
      },
      recommendations
    };
  }

  async updateRateCard(rateCardId: number, updates: {
    hourlyRate?: number;
    effectiveDate?: Date;
    reason?: string;
  }): Promise<RateCard> {
    const query = `
      UPDATE rate_cards 
      SET 
        hourly_rate = COALESCE($1, hourly_rate),
        effective_date = COALESCE($2, effective_date),
        notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.db.query(query, [
      updates.hourlyRate,
      updates.effectiveDate,
      updates.reason,
      rateCardId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Rate card not found');
    }

    return this.mapRateCardRow(result.rows[0]);
  }

  // Private helper methods
  private mapBudgetRow(row: any): ProjectBudget {
    return {
      id: row.id,
      projectId: row.project_id,
      version: row.version,
      totalBudget: parseFloat(row.total_budget),
      laborBudget: parseFloat(row.labor_budget),
      nonLaborBudget: parseFloat(row.non_labor_budget),
      contingencyPercentage: parseFloat(row.contingency_percentage),
      currency: row.currency,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      status: row.status,
      effectiveDate: new Date(row.effective_date)
    };
  }

  private mapRateCardRow(row: any): RateCard {
    return {
      id: row.id,
      role: row.role,
      skill: row.skill,
      level: row.level,
      department: row.department,
      hourlyRate: parseFloat(row.hourly_rate),
      currency: row.currency,
      effectiveDate: new Date(row.effective_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      isActive: row.is_active,
      createdBy: row.created_by,
      approvedBy: row.approved_by,
      notes: row.notes
    };
  }
}