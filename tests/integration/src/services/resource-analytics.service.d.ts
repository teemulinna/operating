export const __esModule: boolean;
export class ResourceAnalyticsService {
    constructor(pool: any);
    pool: any;
    generateUtilizationReport(startDate: any, endDate: any): Promise<{
        overallUtilization: number;
        employeeUtilization: {
            employeeId: string;
            employeeName: any;
            totalCapacity: number;
            allocatedHours: any;
            actualHours: any;
            utilizationRate: number;
            efficiency: number;
            projects: any;
        }[];
        projectUtilization: {
            projectId: any;
            projectName: any;
            plannedHours: any;
            actualHours: any;
            efficiency: number;
            teamSize: number;
            avgUtilization: number;
        }[];
        underUtilized: {
            employeeId: string;
            employeeName: any;
            totalCapacity: number;
            allocatedHours: any;
            actualHours: any;
            utilizationRate: number;
            efficiency: number;
            projects: any;
        }[];
        overUtilized: {
            employeeId: string;
            employeeName: any;
            totalCapacity: number;
            allocatedHours: any;
            actualHours: any;
            utilizationRate: number;
            efficiency: number;
            projects: any;
        }[];
        trends: {
            period: any;
            utilization: number;
            change: any;
        }[];
    }>;
    analyzeSkillGaps(projects: any, employees: any): Promise<{
        skillGaps: {
            skill: any;
            demandCount: any;
            availableCount: any;
            gapSize: number;
            criticalityScore: number;
        }[];
        recommendations: {
            type: string;
            skill: any;
            priority: string;
            estimatedCost: number;
            timeline: string;
            reasoning: string;
        }[];
        criticalMissingSkills: any[];
        trainingNeeds: {
            employeeId: any;
            employeeName: any;
            skillsToTrain: any[];
            priority: number;
            estimatedDuration: string;
            cost: number;
        }[];
    }>;
    generateForecast(historicalData: any, forecastPeriods: any): Promise<{
        predictions: {
            period: string;
            predictedHours: number;
            confidence: number;
            upperBound: number;
            lowerBound: number;
        }[];
        confidence: number;
        trend: string;
        seasonalPattern: {
            pattern: string;
            peakPeriods: string[];
            lowPeriods: string[];
        } | undefined;
    }>;
    optimizeAllocation(currentAllocations: any): Promise<{
        suggestions: ({
            type: string;
            employeeId: any;
            adjustment: number;
            reason: string;
            expectedImprovement: number;
            confidence: number;
            riskLevel: string;
            fromProjectId?: undefined;
        } | {
            type: string;
            employeeId: any;
            fromProjectId: number;
            reason: string;
            expectedImprovement: number;
            confidence: number;
            riskLevel: string;
            adjustment?: undefined;
        })[];
        expectedImprovement: number;
        riskAssessment: {
            overallRisk: string;
            risks: {
                type: string;
                description: string;
                impact: string;
                probability: number;
            }[];
            mitigationStrategies: string[];
        };
        implementation: {
            phases: {
                phase: number;
                description: string;
                actions: any;
                duration: string;
            }[];
            timeline: string;
            dependencies: string[];
        };
    }>;
    calculateEmployeeUtilization(employeeMap: any, startDate: any, endDate: any): Promise<{
        employeeId: string;
        employeeName: any;
        totalCapacity: number;
        allocatedHours: any;
        actualHours: any;
        utilizationRate: number;
        efficiency: number;
        projects: any;
    }[]>;
    calculateProjectUtilization(projectMap: any): Promise<{
        projectId: any;
        projectName: any;
        plannedHours: any;
        actualHours: any;
        efficiency: number;
        teamSize: number;
        avgUtilization: number;
    }[]>;
    calculateUtilizationTrends(startDate: any, endDate: any): Promise<{
        period: any;
        utilization: number;
        change: any;
    }[]>;
    calculateCriticalityScore(skill: any, demand: any, highPriorityDemand: any): number;
    generateSkillRecommendations(skillGaps: any): Promise<{
        type: string;
        skill: any;
        priority: string;
        estimatedCost: number;
        timeline: string;
        reasoning: string;
    }[]>;
    identifyTrainingNeeds(skillGaps: any, employees: any): Promise<{
        employeeId: any;
        employeeName: any;
        skillsToTrain: any[];
        priority: number;
        estimatedDuration: string;
        cost: number;
    }[]>;
    canEmployeeLearnSkill(employeeSkills: any, skill: any): any;
    calculateTrend(values: any): number;
    detectSeasonality(historicalData: any): {
        pattern: string;
        peakPeriods: string[];
        lowPeriods: string[];
    } | undefined;
    getSeasonalFactor(period: any, pattern: any): number;
    calculateVariance(values: any): number;
    calculateForecastConfidence(values: any, trend: any): number;
    classifyTrend(trend: any): "increasing" | "stable" | "decreasing";
    calculateSkillMatchScore(employeeSkills: any, requiredSkills: any): number;
    assessOptimizationRisks(suggestions: any): {
        overallRisk: string;
        risks: {
            type: string;
            description: string;
            impact: string;
            probability: number;
        }[];
        mitigationStrategies: string[];
    };
    createImplementationPlan(suggestions: any): {
        phases: {
            phase: number;
            description: string;
            actions: any;
            duration: string;
        }[];
        timeline: string;
        dependencies: string[];
    };
}
//# sourceMappingURL=resource-analytics.service.d.ts.map