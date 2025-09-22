import { Pool } from 'pg';
export interface TeamAnalyticsDashboard {
    overview: {
        totalProjects: number;
        activeEmployees: number;
        averageUtilization: number;
        completedProjects: number;
    };
    utilizationMetrics: {
        byDepartment: Array<{
            department: string;
            utilization: number;
            efficiency: number;
            trend: 'up' | 'down' | 'stable';
        }>;
        byEmployee: Array<{
            employeeId: string;
            name: string;
            utilization: number;
            productivity: number;
            satisfaction?: number;
        }>;
    };
    performanceMetrics: {
        productivity: {
            tasksCompleted: number;
            averageTaskDuration: number;
            outputPerEmployee: number;
            velocityTrend: number;
        };
        quality: {
            defectRate: number;
            reworkPercentage: number;
            customerSatisfaction: number;
            codeQualityScore: number;
        };
        efficiency: {
            resourceUtilization: number;
            processEfficiency: number;
            timeToMarket: number;
            costPerDeliverable: number;
        };
    };
    projectSuccessRates: {
        onTime: number;
        onBudget: number;
        scopeCompliance: number;
        overallSuccess: number;
    };
    skillUtilization: Array<{
        skill: string;
        demandVsSupply: number;
        utilizationRate: number;
        growthTrend: 'increasing' | 'stable' | 'decreasing';
    }>;
    teamEfficiency: {
        collaborationScore: number;
        communicationEfficiency: number;
        knowledgeSharing: number;
        crossFunctionalWork: number;
    };
}
export interface PerformanceAnalytics {
    productivityMetrics: {
        tasksCompleted: number;
        averageTaskDuration: number;
        outputPerEmployee: number;
        velocityTrend: number;
        burnoutRisk: number;
    };
    qualityMetrics: {
        defectDensity: number;
        testCoverage: number;
        codeReviewEfficiency: number;
        customerSatisfactionScore: number;
    };
    efficiencyMetrics: {
        processEfficiency: number;
        resourceOptimization: number;
        automationIndex: number;
        wasteReduction: number;
    };
    trends: Array<{
        metric: string;
        direction: 'improving' | 'declining' | 'stable';
        rate: number;
        confidence: number;
    }>;
    benchmarks: {
        industryComparison: Array<{
            metric: string;
            ourValue: number;
            industryAverage: number;
            percentile: number;
        }>;
    };
}
export interface ResourceUtilizationPatterns {
    utilizationPatterns: Array<{
        period: string;
        averageUtilization: number;
        departmentBreakdown: Array<{
            department: string;
            utilization: number;
        }>;
    }>;
    peakUtilizationPeriods: Array<{
        period: string;
        peakUtilization: number;
        duration: number;
        causesIdentified: string[];
    }>;
    underutilizedResources: Array<{
        resourceType: 'employee' | 'skill' | 'department';
        identifier: string;
        utilizationRate: number;
        potentialCapacity: number;
        recommendations: string[];
    }>;
    overutilizedResources: Array<{
        resourceType: 'employee' | 'skill' | 'department';
        identifier: string;
        utilizationRate: number;
        burnoutRisk: number;
        mitigationActions: string[];
    }>;
    recommendations: Array<{
        type: 'rebalancing' | 'training' | 'hiring' | 'process_improvement';
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        expectedImpact: number;
    }>;
}
export interface BurnoutRiskAssessment {
    riskAssessment: {
        overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
        affectedEmployeeCount: number;
        departmentRisks: Array<{
            department: string;
            riskLevel: 'low' | 'medium' | 'high' | 'critical';
            affectedCount: number;
        }>;
    };
    highRiskEmployees: Array<{
        employeeId: string;
        name: string;
        riskScore: number;
        riskFactors: Array<{
            factor: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
        }>;
        recommendedActions: string[];
    }>;
    departmentRisks: Array<{
        department: string;
        averageRiskScore: number;
        riskDistribution: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
    }>;
    earlyWarningIndicators: Array<{
        indicator: string;
        currentValue: number;
        threshold: number;
        trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    interventionRecommendations: Array<{
        intervention: string;
        targetGroup: string;
        expectedImpact: number;
        timeline: string;
        priority: 'immediate' | 'short_term' | 'long_term';
    }>;
}
export declare class TeamAnalyticsService {
    private pool;
    constructor(pool: Pool);
    getTeamAnalyticsDashboard(filters?: {
        timeframe?: string;
        department?: string;
    }): Promise<TeamAnalyticsDashboard>;
    getDetailedPerformanceAnalytics(options?: {
        metrics?: string[];
        timeframe?: string;
    }): Promise<PerformanceAnalytics>;
    analyzeResourceUtilizationPatterns(granularity?: string): Promise<ResourceUtilizationPatterns>;
    assessBurnoutRisk(): Promise<BurnoutRiskAssessment>;
    private getOverviewMetricsReal;
    private getUtilizationMetricsReal;
    private getPerformanceMetricsReal;
    private getProjectSuccessRatesReal;
    private getSkillUtilizationReal;
    private getTeamEfficiencyReal;
    private getActiveEmployeesCount;
    private calculateVelocityTrend;
    private calculateDefectRate;
    private calculateReworkPercentage;
    private getCustomerSatisfactionScore;
    private calculateCostPerDeliverable;
    private getDateRangeCondition;
    private determineSkillGrowthTrend;
    private getRiskLevel;
    private identifyEmployeeRiskFactors;
    private getRecommendedActions;
    private calculateDepartmentRisks;
    private calculateOverallRiskLevel;
    private getEarlyWarningIndicatorsReal;
    private getAverageOvertimeHours;
    private getProjectDelayRate;
    private getEmployeeTurnoverTrend;
    private generateInterventionRecommendations;
    private getDefaultProductivityMetrics;
    private getDefaultQualityMetrics;
    private getDefaultEfficiencyMetrics;
    private getProductivityMetricsReal;
    private getQualityMetricsReal;
    private getEfficiencyMetricsReal;
    private getPerformanceTrendsReal;
    private getBenchmarkComparisonsReal;
    private getUtilizationPatternsReal;
    private identifyPeakUtilizationPeriodsReal;
    private identifyUnderutilizedResourcesReal;
    private identifyOverutilizedResourcesReal;
    private generateUtilizationRecommendations;
}
//# sourceMappingURL=team-analytics.service.d.ts.map