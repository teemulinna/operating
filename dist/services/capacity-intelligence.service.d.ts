export interface CapacityIntelligence {
    currentUtilization: {
        overall: number;
        byDepartment: Array<{
            department: string;
            utilization: number;
            available: number;
            committed: number;
        }>;
        bySkill: Array<{
            skill: string;
            utilization: number;
            availableResources: number;
        }>;
    };
    capacityTrends: Array<{
        period: string;
        utilization: number;
        capacity: number;
        demand: number;
    }>;
    bottleneckAnalysis: {
        current: CapacityBottleneck[];
        predicted: CapacityBottleneck[];
        historical: CapacityBottleneck[];
    };
    predictions: CapacityPrediction[];
    recommendations: CapacityRecommendation[];
    riskFactors: Array<{
        factor: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        impact: string;
        mitigation: string;
    }>;
}
export interface CapacityPrediction {
    period: string;
    predictedCapacity: number;
    demandForecast: number;
    utilizationRate: number;
    confidence: number;
    scenario: 'optimistic' | 'realistic' | 'pessimistic';
    keyFactors: string[];
}
export interface CapacityBottleneck {
    type: 'skill' | 'department' | 'resource' | 'time';
    affectedResource: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    affectedProjects: number[];
    estimatedDuration: number;
    rootCauses: string[];
    recommendedActions: string[];
    status: 'active' | 'mitigated' | 'resolved';
}
export interface CapacityRecommendation {
    type: 'hiring' | 'training' | 'reallocation' | 'process_improvement' | 'tool_adoption';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    expectedImpact: number;
    implementationCost: number;
    implementationTime: number;
    affectedDepartments: string[];
    affectedSkills: string[];
    successMetrics: string[];
    roi: number;
}
export interface ScenarioAnalysis {
    scenarioId: string;
    analysis: {
        capacityImpact: {
            totalCapacityChange: number;
            departmentImpacts: Array<{
                department: string;
                capacityChange: number;
                utilizationChange: number;
            }>;
        };
        bottleneckAnalysis: {
            newBottlenecks: CapacityBottleneck[];
            resolvedBottlenecks: CapacityBottleneck[];
            impactSummary: string;
        };
        recommendations: CapacityRecommendation[];
        riskAssessment: {
            riskLevel: 'low' | 'medium' | 'high' | 'critical';
            risks: Array<{
                risk: string;
                probability: number;
                impact: string;
                mitigation: string;
            }>;
        };
    };
}
export interface UtilizationPatterns {
    patterns: {
        peakPeriods: Array<{
            period: string;
            utilizationRate: number;
        }>;
        lowUtilizationPeriods: Array<{
            period: string;
            utilizationRate: number;
        }>;
        averageUtilization: number;
    };
    seasonality: {
        hasSeasonality: boolean;
        peakMonths: string[];
        lowMonths: string[];
        seasonalityStrength: number;
    };
    trends: {
        direction: 'increasing' | 'decreasing' | 'stable';
        rate: number;
        confidence: number;
    };
    anomalies: Array<{
        period: string;
        actualUtilization: number;
        expectedUtilization: number;
        deviation: number;
        possibleCauses: string[];
    }>;
}
export interface SkillDemandForecast {
    skillDemand: Array<{
        skill: string;
        currentSupply: number;
        forecastedDemand: number;
        gap: number;
        confidence: number;
        trendDirection: 'increasing' | 'decreasing' | 'stable';
    }>;
    skillGaps: Array<{
        skill: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        timeToFill: number;
        businessImpact: string;
    }>;
    hiringRecommendations: Array<{
        skill: string;
        recommendedHires: number;
        urgency: 'low' | 'medium' | 'high' | 'critical';
        justification: string;
    }>;
    trainingRecommendations: Array<{
        skill: string;
        candidateEmployees: number;
        estimatedTime: number;
        priority: 'low' | 'medium' | 'high' | 'critical';
    }>;
}
export declare class CapacityIntelligenceService {
    private db;
    constructor();
    getCapacityIntelligence(filters?: {
        department?: string;
        timeframe?: string;
    }): Promise<CapacityIntelligence>;
    getCapacityPredictions(options?: {
        horizon?: string;
        confidence?: number;
        scenarios?: string[];
    }): Promise<CapacityPrediction[]>;
    identifyBottlenecks(severity?: string): Promise<{
        current: CapacityBottleneck[];
        predicted: CapacityBottleneck[];
        historical: CapacityBottleneck[];
    }>;
    runScenarioAnalysis(scenarioData: {
        scenario: {
            name: string;
            description: string;
            changes: Array<{
                type: 'add_project' | 'add_resources' | 'remove_resources' | 'change_demand';
                details: any;
            }>;
        };
        analysisOptions: {
            includeRiskAnalysis: boolean;
            optimizationSuggestions: boolean;
            costImpact: boolean;
        };
    }): Promise<ScenarioAnalysis>;
    analyzeUtilizationPatterns(options?: {
        period?: string;
        granularity?: string;
    }): Promise<UtilizationPatterns>;
    forecastSkillDemand(horizon?: string): Promise<SkillDemandForecast>;
    private getCurrentUtilization;
    private getCapacityTrends;
    private getBottleneckAnalysis;
    private getCapacityRecommendations;
    private assessRiskFactors;
    private mapBottleneckRow;
    private calculateTrend;
    private getScenarioMultiplier;
    private getPeriodsCount;
    private getPeriodName;
    private generateDefaultPredictions;
    private generateTimeframePeriods;
    private estimateProjectDemand;
    private estimateResourceCapacity;
    private predictBottlenecks;
    private generateScenarioRecommendations;
    private assessScenarioRisks;
    private generateBottleneckSummary;
    private analyzeSeasonality;
    private calculateUtilizationTrend;
    private identifyAnomalies;
    private analyzeDemandTrend;
    private estimateTimeToFill;
    private assessBusinessImpact;
    private findTrainingCandidates;
    private estimateTrainingTime;
}
//# sourceMappingURL=capacity-intelligence.service.d.ts.map