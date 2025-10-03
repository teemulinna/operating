export const __esModule: boolean;
export class ResourceController {
    static calculateResourceMetrics(employees: any, capacityData: any): {
        totalEmployees: any;
        totalCapacity: any;
        totalAllocated: any;
        availableCapacity: number;
        avgUtilization: number;
        utilizationDistribution: {
            overUtilized: any;
            optimal: number;
            underUtilized: any;
        };
        efficiency: number;
    };
    static getDepartmentSummary(employees: any, capacityData: any): Promise<any[]>;
    static generateOptimizationSuggestions(employees: any, capacityData: any, mode: any): {
        type: string;
        priority: string;
        description: string;
        currentState: string;
        suggestedState: string;
        expectedImpact: string;
        confidence: number;
        affectedEmployees: any;
        implementation: {
            steps: string[];
            timeframe: string;
            effort: string;
        };
    }[];
    static detectResourceConflicts(capacityData: any): any[];
    static calculateUtilizationTrends(capacityData: any): {
        date: string;
        utilization: number;
        capacity: any;
        allocated: any;
    }[];
    static analyzeSkillsDistribution(employees: any): {
        skill: string;
        count: any;
    }[];
    static calculateCostAnalysis(employees: any, capacityData: any): {
        totalSalaries: any;
        avgSalary: number;
        projectedRevenue: number;
        grossProfit: number;
        profitMargin: number;
    };
    static calculateProjections(capacityData: any): {
        utilizationTrend: string;
        projectedGrowth: number;
        capacityForecast: string;
        recommendations: string[];
    };
    static getPeriodStartDate(period: any): Date;
}
export namespace ResourceController {
    let getResourceAllocation: (req: any, res: any, next: any) => void;
    let getOptimizationSuggestions: (req: any, res: any, next: any) => void;
    let createAllocation: (req: any, res: any, next: any) => void;
    let getConflicts: (req: any, res: any, next: any) => void;
    let resolveConflict: (req: any, res: any, next: any) => void;
    let getResourceAnalytics: (req: any, res: any, next: any) => void;
}
//# sourceMappingURL=resource.controller.d.ts.map