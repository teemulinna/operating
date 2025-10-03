export const __esModule: boolean;
export class PatternRecognitionService {
    constructor(dataAggregator: any, config: any);
    patternModel: tf.Sequential | null;
    anomalyModel: tf.Sequential | null;
    recognizedPatterns: Map<any, any>;
    dataAggregator: any;
    config: any;
    trainModels(historicalData: any): Promise<void>;
    recognizePatterns(data: any): Promise<{
        id: string;
        type: string;
        pattern: any;
        confidence: number;
        occurrences: {
            startDate: any;
            endDate: any;
            confidence: number;
            context: any;
        }[];
        strength: number;
        description: string;
        predictiveValue: number;
        recommendations: string[];
    }[]>;
    generateCapacityInsights(utilizationData: any, demandData: any, resourceData: any): Promise<{
        id: string;
        category: string;
        title: string;
        description: any;
        impact: string;
        confidence: any;
        dataPoints: any;
        recommendations: {
            action: string;
            priority: string;
            effort: string;
            impact: string;
        }[];
    }[]>;
    detectAnomalies(data: any): Promise<{
        anomalies: {
            timestamp: any;
            value: any;
            expectedValue: any;
            deviation: number;
            severity: string;
            type: string;
            explanation: string;
        }[];
        overallScore: number;
        trendAnalysis: {
            direction: string;
            strength: number;
            changePoints: any[];
        };
    }>;
    predictPatternOccurrence(patternId: any, forecastHorizon: any): Promise<any[]>;
    generatePatternRecommendations(patterns: any): {
        priority: string;
        category: string;
        recommendation: string;
        rationale: string;
        estimatedImpact: string;
    }[];
    trainPatternDetectionModel(data: any): Promise<void>;
    trainAnomalyDetectionModel(data: any): Promise<void>;
    preparePatternTrainingData(data: any): {
        features: number[][];
        labels: number[];
    };
    prepareAnomalyTrainingData(data: any): {
        sequences: any[][][];
        targets: any[][];
    };
    extractWindowFeatures(window: any): number[];
    simulatePatternLabel(window: any): 0 | 1 | 2 | 3 | 4;
    extractCandidatePatterns(data: any): Promise<{
        pattern: any;
        startIndex: number;
        endIndex: number;
        metadata: {
            startDate: any;
            endDate: any;
            length: any;
        };
    }[]>;
    classifyPattern(candidate: any): Promise<{
        id: string;
        type: string;
        pattern: any;
        confidence: number;
        occurrences: {
            startDate: any;
            endDate: any;
            confidence: number;
            context: any;
        }[];
        strength: number;
        description: string;
        predictiveValue: number;
        recommendations: string[];
    }>;
    analyzeUtilizationEfficiency(data: any): Promise<{
        id: string;
        category: string;
        title: string;
        description: string;
        impact: string;
        confidence: number;
        dataPoints: any;
        recommendations: {
            action: string;
            priority: string;
            effort: string;
            impact: string;
        }[];
    }[]>;
    analyzeDemandPatterns(data: any): Promise<{
        id: string;
        category: string;
        title: string;
        description: any;
        impact: string;
        confidence: any;
        dataPoints: any;
        recommendations: {
            action: string;
            priority: string;
            effort: string;
            impact: string;
        }[];
    }[]>;
    analyzeResourceAllocation(data: any): Promise<{
        id: string;
        category: string;
        title: string;
        description: string;
        impact: string;
        confidence: number;
        dataPoints: never[];
        recommendations: {
            action: string;
            priority: string;
            effort: string;
            impact: string;
        }[];
    }[]>;
    analyzeCapacityPlanning(utilizationData: any, demandData: any): Promise<{
        id: string;
        category: string;
        title: string;
        description: string;
        impact: string;
        confidence: number;
        dataPoints: any;
        recommendations: {
            action: string;
            priority: string;
            effort: string;
            impact: string;
        }[];
    }[]>;
    createSequences(data: any, windowSize: any): any[];
    predictExpectedValues(sequences: any): Promise<any[]>;
    calculateAnomalySeverity(deviation: any): "low" | "medium" | "high";
    classifyAnomalyType(actual: any, expected: any, previous: any): "spike" | "drop" | "trend_change" | "seasonal_anomaly";
    generateAnomalyExplanation(type: any, actual: any, expected: any): string;
    analyzeTrendChanges(values: any, timestamps: any): {
        direction: string;
        strength: number;
        changePoints: any[];
    };
    calculateLinearTrend(values: any): {
        slope: number;
        correlation: number;
    };
    calculateAutocorrelation(values: any, lag: any): number;
    generatePatternDescription(type: any, pattern: any): string;
    calculatePredictiveValue(pattern: any): number;
    createDefaultAnomalyResult(): {
        anomalies: never[];
        overallScore: number;
        trendAnalysis: {
            direction: string;
            strength: number;
            changePoints: never[];
        };
    };
    getInsightPriority(insight: any): number;
    dispose(): void;
}
import tf = require("@tensorflow/tfjs");
//# sourceMappingURL=pattern-recognition.service.d.ts.map