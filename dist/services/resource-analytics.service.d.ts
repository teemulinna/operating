import { Pool } from 'pg';
export interface UtilizationReport {
    overallUtilization: number;
    employeeUtilization: EmployeeUtilization[];
    projectUtilization: ProjectUtilization[];
    underUtilized: EmployeeUtilization[];
    overUtilized: EmployeeUtilization[];
    trends: UtilizationTrend[];
}
export interface EmployeeUtilization {
    employeeId: string;
    employeeName: string;
    totalCapacity: number;
    allocatedHours: number;
    actualHours: number;
    utilizationRate: number;
    efficiency: number;
    projects: ProjectAllocation[];
}
export interface ProjectUtilization {
    projectId: number;
    projectName: string;
    plannedHours: number;
    actualHours: number;
    efficiency: number;
    teamSize: number;
    avgUtilization: number;
}
export interface ProjectAllocation {
    projectId: number;
    projectName: string;
    allocatedHours: number;
    role: string;
}
export interface UtilizationTrend {
    period: string;
    utilization: number;
    change: number;
}
export interface SkillGapAnalysis {
    skillGaps: SkillGap[];
    recommendations: SkillRecommendation[];
    criticalMissingSkills: string[];
    trainingNeeds: TrainingNeed[];
}
export interface SkillGap {
    skill: string;
    demandCount: number;
    availableCount: number;
    gapSize: number;
    criticalityScore: number;
}
export interface SkillRecommendation {
    type: 'hire' | 'train' | 'contract';
    skill: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedCost: number;
    timeline: string;
    reasoning: string;
}
export interface TrainingNeed {
    employeeId: string;
    employeeName: string;
    skillsToTrain: string[];
    priority: number;
    estimatedDuration: string;
    cost: number;
}
export interface ForecastResult {
    predictions: ForecastPrediction[];
    confidence: number;
    trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal';
    seasonalPattern?: SeasonalPattern;
}
export interface ForecastPrediction {
    period: string;
    predictedHours: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
}
export interface SeasonalPattern {
    pattern: 'quarterly' | 'monthly' | 'yearly';
    peakPeriods: string[];
    lowPeriods: string[];
}
export interface AllocationOptimization {
    suggestions: OptimizationSuggestion[];
    expectedImprovement: number;
    riskAssessment: RiskAssessment;
    implementation: ImplementationPlan;
}
export interface OptimizationSuggestion {
    type: 'reassignment' | 'capacity_adjustment' | 'skill_development' | 'hiring';
    employeeId: string;
    fromProjectId?: number;
    toProjectId?: number;
    adjustment?: number;
    reason: string;
    expectedImprovement: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
}
export interface RiskAssessment {
    overallRisk: 'low' | 'medium' | 'high';
    risks: Risk[];
    mitigationStrategies: string[];
}
export interface Risk {
    type: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    probability: number;
}
export interface ImplementationPlan {
    phases: ImplementationPhase[];
    timeline: string;
    dependencies: string[];
}
export interface ImplementationPhase {
    phase: number;
    description: string;
    actions: string[];
    duration: string;
}
export declare class ResourceAnalyticsService {
    private pool;
    constructor(pool: Pool);
    generateUtilizationReport(startDate: Date, endDate: Date): Promise<UtilizationReport>;
    analyzeSkillGaps(projects: any[], employees: any[]): Promise<SkillGapAnalysis>;
    generateForecast(historicalData: any[], forecastPeriods: number): Promise<ForecastResult>;
    optimizeAllocation(currentAllocations: any[]): Promise<AllocationOptimization>;
    private calculateEmployeeUtilization;
    private calculateProjectUtilization;
    private calculateUtilizationTrends;
    private calculateCriticalityScore;
    private generateSkillRecommendations;
    private identifyTrainingNeeds;
    private canEmployeeLearnSkill;
    private calculateTrend;
    private detectSeasonality;
    private getSeasonalFactor;
    private calculateVariance;
    private calculateForecastConfidence;
    private classifyTrend;
    private calculateSkillMatchScore;
    private assessOptimizationRisks;
    private createImplementationPlan;
}
//# sourceMappingURL=resource-analytics.service.d.ts.map