export const __esModule: boolean;
export class BudgetService {
    static createBudget(input: any): Promise<{
        id: any;
        projectId: any;
        totalBudget: number;
        allocatedBudget: number;
        spentBudget: number;
        committedBudget: number;
        costCategories: any;
        currency: any;
        status: any;
        budgetPeriods: any;
        contingencyPercentage: number;
        approvalWorkflow: any;
        costCenters: any;
        notes: any;
        exchangeRates: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    }>;
    static calculateProjectCost(projectId: any): Promise<{
        estimatedCost: number;
        actualCost: number;
        costBreakdown: {
            category: any;
            budgeted: number;
            allocated: number;
            spent: number;
            variance: number;
            percentage: number;
        }[];
        resourceCosts: {
            employeeId: any;
            employeeName: any;
            baseRate: number;
            billableRate: number;
            totalHours: number;
            totalCost: number;
            budgetedCost: number;
            variance: number;
            utilizationRate: number;
        }[];
    }>;
    static trackResourceCosts(projectId: any, startDate: any, endDate: any): Promise<{
        totalCost: number;
        dailyCosts: {
            date: string;
            cost: any;
        }[];
        resourceBreakdown: {
            employeeId: any;
            employeeName: any;
            baseRate: number;
            billableRate: number;
            totalHours: number;
            totalCost: number;
            budgetedCost: number;
            variance: number;
            utilizationRate: number;
        }[];
    }>;
    static generateCostReports(projectId: any): Promise<{
        budgetAnalytics: {
            totalBudget: number;
            allocatedBudget: number;
            spentBudget: number;
            remainingBudget: number;
            utilizationPercentage: number;
            burnRate: number;
            forecastedCompletion: Date | null;
            costVariance: number;
            healthStatus: string;
        };
        costBreakdown: {
            category: any;
            budgeted: number;
            allocated: number;
            spent: number;
            variance: number;
            percentage: number;
        }[];
        varianceReport: {
            projectId: number;
            projectName: any;
            originalBudget: number;
            revisedBudget: number;
            actualCost: number;
            variance: number;
            variancePercentage: number;
            majorVariances: {
                category: any;
                variance: number;
                reason: string;
            }[];
        };
        resourceCosts: {
            employeeId: any;
            employeeName: any;
            baseRate: number;
            billableRate: number;
            totalHours: number;
            totalCost: number;
            budgetedCost: number;
            variance: number;
            utilizationRate: number;
        }[];
    }>;
    static budgetForecasting(projectId: any, forecastPeriods?: number): Promise<any>;
    static costVarianceAnalysis(projectId: any): Promise<{
        overallVariance: number;
        categoryVariances: {
            category: any;
            variance: number;
            percentage: number;
        }[];
        timeVariances: any;
        recommendations: string[];
    }>;
    static updateBudget(budgetId: any, updates: any): Promise<{
        id: any;
        projectId: any;
        totalBudget: number;
        allocatedBudget: number;
        spentBudget: number;
        committedBudget: number;
        costCategories: any;
        currency: any;
        status: any;
        budgetPeriods: any;
        contingencyPercentage: number;
        approvalWorkflow: any;
        costCenters: any;
        notes: any;
        exchangeRates: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    }>;
    static updateBudgetSpending(projectId: any, spentAmount: any, category: any, description: any): Promise<{
        id: any;
        projectId: any;
        totalBudget: number;
        allocatedBudget: number;
        spentBudget: number;
        committedBudget: number;
        costCategories: any;
        currency: any;
        status: any;
        budgetPeriods: any;
        contingencyPercentage: number;
        approvalWorkflow: any;
        costCenters: any;
        notes: any;
        exchangeRates: any;
        createdAt: any;
        updatedAt: any;
        createdBy: any;
        updatedBy: any;
    }>;
    static getWorkingDaysBetween(startDate: any, endDate: any): number;
    static calculateBurnRate(projectId: any): Promise<number>;
}
export namespace BudgetService {
    let db: any;
}
//# sourceMappingURL=budget.service.d.ts.map