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
            employeeId: number;
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
export interface ProjectSuccessCorrelations {
    correlations: Array<{
        factor: string;
        correlationCoefficient: number;
        significance: number;
        description: string;
        recommendation: string;
    }>;
    successFactors: Array<{
        factor: string;
        impact: number;
        frequency: number;
        actionable: boolean;
    }>;
    riskFactors: Array<{
        factor: string;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        frequency: number;
        mitigation: string;
    }>;
    recommendations: Array<{
        category: 'team_composition' | 'process' | 'tools' | 'communication';
        recommendation: string;
        expectedImpact: number;
        implementationEffort: 'low' | 'medium' | 'high';
    }>;
}
export interface DepartmentEfficiency {
    departments: Array<{
        name: string;
        efficiencyScore: number;
        metrics: {
            productivity: number;
            quality: number;
            collaboration: number;
            innovation: number;
        };
        rank: number;
        strengths: string[];
        improvementAreas: string[];
        trend: 'improving' | 'declining' | 'stable';
    }>;
    overallRanking: Array<{
        rank: number;
        department: string;
        score: number;
        change: number;
    }>;
    efficiencyTrends: Array<{
        period: string;
        departmentScores: Array<{
            department: string;
            score: number;
        }>;
    }>;
    benchmarkComparison: {
        internalBenchmark: number;
        industryBenchmark?: number;
        bestPractices: string[];
    };
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
        employeeId: number;
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
export interface WorkforceOptimization {
    currentState: {
        totalCapacity: number;
        utilizationRate: number;
        skillDistribution: Array<{
            skill: string;
            count: number;
            utilization: number;
        }>;
        departmentBalance: Array<{
            department: string;
            headcount: number;
            optimalSize: number;
            variance: number;
        }>;
    };
    optimizationOpportunities: Array<{
        type: 'skill_rebalancing' | 'role_optimization' | 'team_restructuring' | 'workload_distribution';
        impact: number;
        effort: 'low' | 'medium' | 'high';
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        affectedEmployees: number;
        timeframe: string;
    }>;
    skillRealignments: Array<{
        skill: string;
        currentDemand: number;
        optimalDemand: number;
        action: 'hire' | 'train' | 'reassign' | 'reduce';
        priority: number;
    }>;
    teamRestructuring: Array<{
        department: string;
        currentStructure: string;
        recommendedStructure: string;
        benefits: string[];
        risks: string[];
        implementationPlan: string;
    }>;
    capacityOptimization: {
        underutilizedCapacity: number;
        overallocatedCapacity: number;
        optimizationPotential: number;
        recommendedActions: string[];
    };
}
export declare class TeamAnalyticsService {
    private db;
    constructor();
    getTeamAnalyticsDashboard(filters?: {
        timeframe?: string;
        department?: string;
    }): Promise<TeamAnalyticsDashboard>;
    getDetailedPerformanceAnalytics(options?: {
        metrics?: string[];
        timeframe?: string;
    }): Promise<PerformanceAnalytics>;
    analyzeResourceUtilizationPatterns(granularity?: string): Promise<ResourceUtilizationPatterns>;
    analyzeProjectSuccessCorrelations(): Promise<ProjectSuccessCorrelations>;
    analyzeDepartmentEfficiency(compare?: boolean): Promise<DepartmentEfficiency>;
    assessBurnoutRisk(): Promise<BurnoutRiskAssessment>;
    analyzeWorkforceOptimization(): Promise<WorkforceOptimization>;
    private getOverviewMetrics;
    private getUtilizationMetrics;
    private getPerformanceMetrics;
    private getProjectSuccessRates;
    private getSkillUtilization;
    private getTeamEfficiency;
    private getDefaultProductivityMetrics;
    private getDefaultQualityMetrics;
    private getDefaultEfficiencyMetrics;
    private getProductivityMetrics;
    private getQualityMetrics;
    private getEfficiencyMetrics;
    private getPerformanceTrends;
    private getBenchmarkComparisons;
    private getUtilizationPatterns;
    private identifyPeakUtilizationPeriods;
    private identifyUnderutilizedResources;
    private identifyOverutilizedResources;
    private generateUtilizationRecommendations;
    private calculateProjectCorrelations;
    private identifySuccessFactors;
    private generateProjectRecommendations;
    private calculateDepartmentMetrics;
    private calculateEfficiencyScore;
    private identifyDepartmentStrengths;
    private identifyImprovementAreas;
    private calculateDepartmentTrend;
    private getDepartmentEfficiencyTrends;
    private getBenchmarkComparison;
    private calculateBurnoutRisk;
    private getRiskLevel;
    private getRecommendedActions;
    private calculateDepartmentRisks;
    private calculateDepartmentRiskLevel;
    private calculateOverallRiskLevel;
    private getEarlyWarningIndicators;
    private generateInterventionRecommendations;
    private getCurrentWorkforceState;
    private identifyOptimizationOpportunities;
    private analyzeSkillRealignments;
    private evaluateTeamRestructuring;
    private analyzeCapacityOptimization;
}
//# sourceMappingURL=team-analytics.service.d.ts.map