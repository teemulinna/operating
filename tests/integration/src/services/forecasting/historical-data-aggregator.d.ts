export const __esModule: boolean;
export class HistoricalDataAggregator {
    constructor(dbService: any);
    cache: Map<any, any>;
    dbService: any;
    aggregateResourceUtilization(config: any): Promise<any>;
    aggregateProjectPerformance(config: any): Promise<any>;
    getResourceHistory(employeeId: any, timeRange: any): Promise<{
        employeeId: any;
        skill: any;
        utilizationHistory: any;
        projectHistory: any;
        performanceMetrics: any;
    }>;
    detectPatterns(data: any, patternTypes?: string[]): Promise<{
        patternType: string;
        description: string;
        strength: number;
        frequency: number;
        amplitude: number;
        phase: number;
        confidence: number;
    }[]>;
    aggregateSkillDemand(skills: any, timeRange: any): Promise<{}>;
    calculateCapacityTrends(timeRange: any): Promise<{
        totalCapacity: any;
        availableCapacity: any;
        utilizationRate: any;
        bySkill: {};
    }>;
    generateTrainingDataset(config: any): Promise<{
        features: number[][];
        targets: number[];
        metadata: {
            timestamp: Date;
            features: any;
        }[];
    }>;
    buildUtilizationQuery(config: any): {
        sql: string;
        params: any[];
    };
    buildProjectQuery(config: any): {
        sql: string;
        params: any[];
    };
    processRawData(rawData: any, config: any): any;
    processProjectData(rawData: any, config: any): any;
    getResourceUtilizationHistory(employeeId: any, timeRange: any): Promise<any>;
    getResourceProjectHistory(employeeId: any, timeRange: any): Promise<any>;
    getResourcePerformanceHistory(employeeId: any, timeRange: any): Promise<any>;
    getResourceSkills(employeeId: any): Promise<any>;
    detectSeasonalPattern(data: any): Promise<{
        patternType: string;
        description: string;
        strength: number;
        frequency: number;
        amplitude: number;
        phase: number;
        confidence: number;
    } | null>;
    detectTrendPattern(data: any): Promise<{
        patternType: string;
        description: string;
        strength: number;
        frequency: number;
        amplitude: number;
        phase: number;
        confidence: number;
    } | null>;
    detectCyclicalPattern(data: any): Promise<{
        patternType: string;
        description: string;
        strength: number;
        frequency: number;
        amplitude: number;
        phase: number;
        confidence: number;
    } | null>;
    calculateSeasonalStrength(values: any, period: any): number;
    calculateLinearTrend(values: any): {
        slope: number;
        correlation: number;
    };
    calculateAmplitude(values: any, period: any): number;
    calculatePhase(values: any, period: any): number;
    findCycles(values: any): {
        start: number;
        end: number;
        length: number;
    }[];
    calculateCyclicalStrength(values: any, cycleLength: any): number;
    calculateCorrelation(x: any, y: any): number;
    getDateTrunc(window: any, column: any): string;
    getAggregationFunction(method: any, column: any): string;
    calculateConfidence(sampleSize: any): 0.5 | 0.85 | 0.95 | 0.75 | 0.65;
    buildFeatureQueries(features: any, timeRange: any, frequency: any): Promise<{
        sql: string;
        params: any[];
    }[]>;
    buildTargetQuery(target: any, timeRange: any, frequency: any): Promise<{
        sql: string;
        params: any[];
    }>;
    createTimeIndex(timeRange: any, frequency: any): Date[];
    findValueForTimestamp(data: any, timestampStr: any): number | null;
    getCachedData(key: any): any;
    setCachedData(key: any, data: any, ttl: any): void;
}
//# sourceMappingURL=historical-data-aggregator.d.ts.map