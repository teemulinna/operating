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
        optimistic: {
            totalCost: number;
            probability: number;
        };
        realistic: {
            totalCost: number;
            probability: number;
        };
        pessimistic: {
            totalCost: number;
            probability: number;
        };
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
        labor: {
            planned: number;
            actual: number;
            variance: number;
        };
        nonLabor: {
            planned: number;
            actual: number;
            variance: number;
        };
        total: {
            planned: number;
            actual: number;
            variance: number;
        };
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
        score: number;
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
export declare class ProjectBudgetingService {
    private db;
    constructor();
    createProjectBudget(budgetData: ProjectBudget): Promise<ProjectBudget>;
    getProjectBudget(projectId: number): Promise<{
        budget: ProjectBudget;
        currentSpending: number;
        remainingBudget: number;
        burnRate: number;
    } | null>;
    generateBudgetForecast(projectId: number, forecastRequest: {
        forecastPeriod: string;
        includeRiskFactors: boolean;
        scenarios: string[];
    }): Promise<BudgetForecast>;
    getCostTracking(projectId: number, period?: string): Promise<CostTracking>;
    getMarginAnalysis(projectId: number): Promise<MarginAnalysis>;
    updateRateCard(rateCardId: number, updates: {
        hourlyRate?: number;
        effectiveDate?: Date;
        reason?: string;
    }): Promise<RateCard>;
    private mapBudgetRow;
    private mapRateCardRow;
}
//# sourceMappingURL=project-budgeting.service.d.ts.map