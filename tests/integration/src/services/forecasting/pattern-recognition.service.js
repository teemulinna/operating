"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternRecognitionService = void 0;
const tf = require("@tensorflow/tfjs");
/**
 * Advanced Pattern Recognition Service for Capacity Analysis
 * Uses machine learning algorithms to identify patterns and anomalies in resource data
 */
class PatternRecognitionService {
    constructor(dataAggregator, config) {
        this.patternModel = null;
        this.anomalyModel = null;
        this.recognizedPatterns = new Map();
        this.dataAggregator = dataAggregator;
        this.config = {
            windowSize: 30,
            minPatternLength: 3,
            maxPatternLength: 21,
            similarityThreshold: 0.8,
            minOccurrences: 3,
            ...config
        };
    }
    /**
     * Train pattern recognition models on historical data
     */
    async trainModels(historicalData) {
        await Promise.all([
            this.trainPatternDetectionModel(historicalData),
            this.trainAnomalyDetectionModel(historicalData)
        ]);
    }
    /**
     * Recognize patterns in capacity data
     */
    async recognizePatterns(data) {
        if (!this.patternModel || data.length < this.config.minPatternLength) {
            return [];
        }
        const patterns = [];
        // Extract potential patterns using sliding window
        const candidatePatterns = await this.extractCandidatePatterns(data);
        // Classify patterns using ML model
        for (const candidate of candidatePatterns) {
            const classification = await this.classifyPattern(candidate);
            if (classification.confidence > 0.6) {
                patterns.push(classification);
            }
        }
        // Store recognized patterns
        patterns.forEach(pattern => {
            this.recognizedPatterns.set(pattern.id, pattern);
        });
        return patterns;
    }
    /**
     * Generate capacity insights from analyzed data
     */
    async generateCapacityInsights(utilizationData, demandData, resourceData) {
        const insights = [];
        // Utilization efficiency insights
        const utilizationInsights = await this.analyzeUtilizationEfficiency(utilizationData);
        insights.push(...utilizationInsights);
        // Demand pattern insights
        const demandInsights = await this.analyzeDemandPatterns(demandData);
        insights.push(...demandInsights);
        // Resource allocation insights
        const allocationInsights = await this.analyzeResourceAllocation(resourceData);
        insights.push(...allocationInsights);
        // Capacity planning insights
        const planningInsights = await this.analyzeCapacityPlanning(utilizationData, demandData);
        insights.push(...planningInsights);
        return insights.sort((a, b) => this.getInsightPriority(b) - this.getInsightPriority(a));
    }
    /**
     * Detect anomalies in capacity data
     */
    async detectAnomalies(data) {
        if (!this.anomalyModel || data.length < 7) {
            return this.createDefaultAnomalyResult();
        }
        const values = data.map(d => d.value);
        const timestamps = data.map(d => d.timestamp);
        // Prepare data for anomaly detection
        const sequences = this.createSequences(values, 7); // 7-day windows
        const predictions = await this.predictExpectedValues(sequences);
        const anomalies = [];
        let totalDeviation = 0;
        for (let i = 7; i < data.length; i++) {
            const actual = values[i];
            const expected = predictions[i - 7] || actual;
            const deviation = Math.abs(actual - expected);
            const normalizedDeviation = expected > 0 ? deviation / expected : 0;
            totalDeviation += normalizedDeviation;
            if (normalizedDeviation > 0.3) { // 30% deviation threshold
                const severity = this.calculateAnomalySeverity(normalizedDeviation);
                const type = this.classifyAnomalyType(actual, expected, i > 0 ? values[i - 1] : actual);
                anomalies.push({
                    timestamp: timestamps[i],
                    value: actual,
                    expectedValue: expected,
                    deviation: normalizedDeviation,
                    severity,
                    type,
                    explanation: this.generateAnomalyExplanation(type, actual, expected)
                });
            }
        }
        // Trend analysis
        const trendAnalysis = this.analyzeTrendChanges(values, timestamps);
        return {
            anomalies,
            overallScore: Math.min(1, totalDeviation / (data.length - 7)),
            trendAnalysis
        };
    }
    /**
     * Predict future patterns based on recognized patterns
     */
    async predictPatternOccurrence(patternId, forecastHorizon) {
        const pattern = this.recognizedPatterns.get(patternId);
        if (!pattern) {
            throw new Error(`Pattern ${patternId} not found`);
        }
        const predictions = [];
        const occurrenceTimes = pattern.occurrences.map(o => o.startDate.getTime());
        // Calculate interval patterns
        const intervals = [];
        for (let i = 1; i < occurrenceTimes.length; i++) {
            intervals.push(occurrenceTimes[i] - occurrenceTimes[i - 1]);
        }
        if (intervals.length === 0) {
            return predictions;
        }
        // Predict next occurrences based on historical intervals
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const lastOccurrence = Math.max(...occurrenceTimes);
        for (let i = 1; i <= Math.ceil(forecastHorizon / (avgInterval / (1000 * 60 * 60 * 24))); i++) {
            const predictedTime = lastOccurrence + (avgInterval * i);
            const predictedDate = new Date(predictedTime);
            if (predictedDate.getTime() - Date.now() <= forecastHorizon * 24 * 60 * 60 * 1000) {
                const probability = Math.max(0.1, pattern.predictiveValue * Math.exp(-i * 0.2));
                const confidence = Math.max(0.3, pattern.strength * Math.exp(-i * 0.15));
                predictions.push({
                    date: predictedDate,
                    probability,
                    confidence
                });
            }
        }
        return predictions;
    }
    /**
     * Get recommendations based on recognized patterns
     */
    generatePatternRecommendations(patterns) {
        const recommendations = [];
        for (const pattern of patterns) {
            switch (pattern.type) {
                case 'workload_peak':
                    recommendations.push({
                        priority: (pattern.strength > 0.8 ? 'high' : 'medium'),
                        category: 'Capacity Planning',
                        recommendation: 'Prepare for upcoming workload peaks by pre-allocating resources',
                        rationale: `Pattern shows ${pattern.occurrences.length} historical peaks with ${(pattern.strength * 100).toFixed(0)}% consistency`,
                        estimatedImpact: 'Reduce peak period stress by 30-50%'
                    });
                    break;
                case 'skill_shortage':
                    recommendations.push({
                        priority: 'high',
                        category: 'Skills Management',
                        recommendation: 'Initiate training programs or hiring for identified skill gaps',
                        rationale: `Recurring skill shortage pattern detected with ${pattern.predictiveValue.toFixed(2)} predictive accuracy`,
                        estimatedImpact: 'Improve project delivery timelines by 20-40%'
                    });
                    break;
                case 'project_overlap':
                    recommendations.push({
                        priority: (pattern.strength > 0.7 ? 'high' : 'medium'),
                        category: 'Project Scheduling',
                        recommendation: 'Stagger project timelines to minimize resource conflicts',
                        rationale: `Historical data shows ${pattern.occurrences.length} instances of problematic project overlap`,
                        estimatedImpact: 'Reduce resource conflicts by 40-60%'
                    });
                    break;
                case 'seasonal_demand':
                    recommendations.push({
                        priority: 'medium',
                        category: 'Demand Forecasting',
                        recommendation: 'Adjust capacity planning for seasonal demand variations',
                        rationale: `Seasonal pattern identified with ${(pattern.strength * 100).toFixed(0)}% consistency across historical data`,
                        estimatedImpact: 'Optimize resource utilization by 15-25%'
                    });
                    break;
                case 'resource_bottleneck':
                    recommendations.push({
                        priority: 'critical',
                        category: 'Resource Optimization',
                        recommendation: 'Address identified bottleneck resources through capacity expansion or process improvement',
                        rationale: `Bottleneck pattern significantly impacts overall capacity with ${pattern.strength.toFixed(2)} strength score`,
                        estimatedImpact: 'Increase overall throughput by 25-50%'
                    });
                    break;
            }
        }
        return recommendations.sort((a, b) => {
            const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    // Private helper methods
    async trainPatternDetectionModel(data) {
        const trainingData = this.preparePatternTrainingData(data);
        if (trainingData.features.length === 0) {
            console.warn('No training data available for pattern detection model');
            return;
        }
        const features = tf.tensor2d(trainingData.features);
        const labels = tf.tensor1d(trainingData.labels);
        this.patternModel = tf.sequential({
            layers: [
                tf.layers.dense({ units: 64, activation: 'relu', inputShape: [trainingData.features[0].length] }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({ units: 32, activation: 'relu' }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ units: 5, activation: 'softmax' }) // 5 pattern types
            ]
        });
        this.patternModel.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'sparseCategoricalCrossentropy',
            metrics: ['accuracy']
        });
        await this.patternModel.fit(features, labels, {
            epochs: 50,
            batchSize: 16,
            validationSplit: 0.2,
            verbose: 0
        });
        features.dispose();
        labels.dispose();
    }
    async trainAnomalyDetectionModel(data) {
        const trainingData = this.prepareAnomalyTrainingData(data);
        if (trainingData.sequences.length === 0) {
            console.warn('No training data available for anomaly detection model');
            return;
        }
        const sequences = tf.tensor3d(trainingData.sequences);
        const targets = tf.tensor2d(trainingData.targets);
        this.anomalyModel = tf.sequential({
            layers: [
                tf.layers.lstm({ units: 32, returnSequences: false, inputShape: [trainingData.sequences[0].length, trainingData.sequences[0][0].length] }),
                tf.layers.dropout({ rate: 0.2 }),
                tf.layers.dense({ units: 16, activation: 'relu' }),
                tf.layers.dense({ units: trainingData.targets[0].length, activation: 'linear' })
            ]
        });
        this.anomalyModel.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });
        await this.anomalyModel.fit(sequences, targets, {
            epochs: 30,
            batchSize: 8,
            validationSplit: 0.2,
            verbose: 0
        });
        sequences.dispose();
        targets.dispose();
    }
    preparePatternTrainingData(data) {
        const features = [];
        const labels = [];
        for (const resource of data) {
            const utilizationValues = resource.utilizationHistory.map(u => u.value);
            // Create sliding windows
            for (let i = 0; i <= utilizationValues.length - this.config.windowSize; i++) {
                const window = utilizationValues.slice(i, i + this.config.windowSize);
                const windowFeatures = this.extractWindowFeatures(window);
                // Simulate pattern classification (in production, this would be based on labeled data)
                const patternType = this.simulatePatternLabel(window);
                features.push(windowFeatures);
                labels.push(patternType);
            }
        }
        return { features, labels };
    }
    prepareAnomalyTrainingData(data) {
        const sequences = [];
        const targets = [];
        for (const resource of data) {
            const utilizationValues = resource.utilizationHistory.map(u => u.value);
            // Create sequences for LSTM
            const sequenceLength = 7; // 7-day sequences
            for (let i = 0; i <= utilizationValues.length - sequenceLength - 1; i++) {
                const sequence = [];
                for (let j = 0; j < sequenceLength; j++) {
                    sequence.push([utilizationValues[i + j]]);
                }
                sequences.push(sequence);
                targets.push([utilizationValues[i + sequenceLength]]);
            }
        }
        return { sequences, targets };
    }
    extractWindowFeatures(window) {
        const features = [];
        // Statistical features
        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
        const std = Math.sqrt(variance);
        const min = Math.min(...window);
        const max = Math.max(...window);
        features.push(mean, std, min, max, max - min);
        // Trend features
        const trend = this.calculateLinearTrend(window);
        features.push(trend.slope, trend.correlation);
        // Seasonal features (simplified)
        const firstHalf = window.slice(0, Math.floor(window.length / 2));
        const secondHalf = window.slice(Math.floor(window.length / 2));
        const firstMean = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondMean = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        features.push(secondMean - firstMean);
        // Autocorrelation features
        const autocorr = this.calculateAutocorrelation(window, Math.floor(window.length / 4));
        features.push(autocorr);
        return features;
    }
    simulatePatternLabel(window) {
        const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
        const max = Math.max(...window);
        const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
        // Simulate pattern classification based on window characteristics
        if (max > mean * 2 && variance > mean * 0.5)
            return 0; // workload_peak
        if (mean < 0.3 && variance < 0.1)
            return 1; // skill_shortage
        if (variance > mean && max > mean * 1.5)
            return 2; // project_overlap
        if (this.calculateAutocorrelation(window, 7) > 0.7)
            return 3; // seasonal_demand
        return 4; // resource_bottleneck
    }
    async extractCandidatePatterns(data) {
        const candidates = [];
        const values = data.map(d => d.value);
        // Extract patterns of various lengths
        for (let length = this.config.minPatternLength; length <= Math.min(this.config.maxPatternLength, values.length); length++) {
            for (let start = 0; start <= values.length - length; start++) {
                const pattern = values.slice(start, start + length);
                candidates.push({
                    pattern,
                    startIndex: start,
                    endIndex: start + length - 1,
                    metadata: {
                        startDate: data[start].timestamp,
                        endDate: data[start + length - 1].timestamp,
                        length
                    }
                });
            }
        }
        return candidates;
    }
    async classifyPattern(candidate) {
        const features = this.extractWindowFeatures(candidate.pattern);
        const featureTensor = tf.tensor2d([features]);
        const prediction = this.patternModel.predict(featureTensor);
        const probabilities = await prediction.data();
        const maxProb = Math.max(...probabilities);
        const patternTypeIndex = probabilities.indexOf(maxProb);
        featureTensor.dispose();
        prediction.dispose();
        const patternTypes = ['workload_peak', 'skill_shortage', 'project_overlap', 'seasonal_demand', 'resource_bottleneck'];
        const patternType = patternTypes[patternTypeIndex];
        return {
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: patternType,
            pattern: candidate.pattern,
            confidence: maxProb,
            occurrences: [{
                    startDate: candidate.metadata.startDate,
                    endDate: candidate.metadata.endDate,
                    confidence: maxProb,
                    context: candidate.metadata
                }],
            strength: maxProb,
            description: this.generatePatternDescription(patternType, candidate.pattern),
            predictiveValue: this.calculatePredictiveValue(candidate.pattern),
            recommendations: this.generatePatternRecommendations([{ type: patternType, strength: maxProb, confidence: maxProb }])
                .map(r => r.recommendation)
        };
    }
    async analyzeUtilizationEfficiency(data) {
        const insights = [];
        const values = data.map(d => d.value);
        const avgUtilization = values.reduce((sum, val) => sum + val, 0) / values.length;
        // Low utilization insight
        if (avgUtilization < 0.6) {
            insights.push({
                id: `utilization_low_${Date.now()}`,
                category: 'utilization',
                title: 'Low Resource Utilization Detected',
                description: `Average utilization is ${(avgUtilization * 100).toFixed(1)}%, indicating potential underutilization of resources.`,
                impact: avgUtilization < 0.4 ? 'high' : 'medium',
                confidence: 0.9,
                dataPoints: data,
                recommendations: [
                    {
                        action: 'Review resource allocation strategies',
                        priority: 'high',
                        effort: 'medium',
                        impact: 'Increase utilization by 20-30%'
                    },
                    {
                        action: 'Consider temporary resource reallocation',
                        priority: 'medium',
                        effort: 'low',
                        impact: 'Optimize current capacity usage'
                    }
                ]
            });
        }
        // High variability insight
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avgUtilization, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        if (std > 0.3) {
            insights.push({
                id: `utilization_variability_${Date.now()}`,
                category: 'efficiency',
                title: 'High Utilization Variability',
                description: `Resource utilization varies significantly (σ=${std.toFixed(2)}), indicating inconsistent demand patterns.`,
                impact: 'medium',
                confidence: 0.8,
                dataPoints: data,
                recommendations: [
                    {
                        action: 'Implement demand smoothing strategies',
                        priority: 'medium',
                        effort: 'high',
                        impact: 'Reduce variability by 40-50%'
                    }
                ]
            });
        }
        return insights;
    }
    async analyzeDemandPatterns(data) {
        const insights = [];
        const patterns = await this.dataAggregator.detectPatterns(data);
        for (const pattern of patterns) {
            if (pattern.strength > 0.7) {
                insights.push({
                    id: `demand_pattern_${pattern.patternType}_${Date.now()}`,
                    category: 'planning',
                    title: `${pattern.patternType.charAt(0).toUpperCase() + pattern.patternType.slice(1)} Pattern Detected`,
                    description: pattern.description,
                    impact: pattern.strength > 0.9 ? 'high' : 'medium',
                    confidence: pattern.confidence,
                    dataPoints: data,
                    recommendations: [
                        {
                            action: `Plan capacity adjustments for ${pattern.patternType} patterns`,
                            priority: (pattern.strength > 0.8 ? 'high' : 'medium'),
                            effort: 'medium',
                            impact: 'Improve demand prediction accuracy'
                        }
                    ]
                });
            }
        }
        return insights;
    }
    async analyzeResourceAllocation(data) {
        const insights = [];
        // Analyze skill distribution
        const skillUtilization = new Map();
        for (const resource of data) {
            const utilization = resource.utilizationHistory.map(u => u.value);
            const avgUtilization = utilization.reduce((sum, val) => sum + val, 0) / utilization.length;
            if (!skillUtilization.has(resource.skill)) {
                skillUtilization.set(resource.skill, []);
            }
            skillUtilization.get(resource.skill).push(avgUtilization);
        }
        // Identify underutilized skills
        for (const [skill, utilizations] of skillUtilization.entries()) {
            const avgSkillUtilization = utilizations.reduce((sum, val) => sum + val, 0) / utilizations.length;
            if (avgSkillUtilization < 0.5 && utilizations.length > 2) {
                insights.push({
                    id: `skill_underutilization_${skill}_${Date.now()}`,
                    category: 'efficiency',
                    title: `Underutilized Skill: ${skill}`,
                    description: `${skill} resources are underutilized at ${(avgSkillUtilization * 100).toFixed(1)}% average capacity.`,
                    impact: 'medium',
                    confidence: 0.8,
                    dataPoints: [], // Would include relevant time series data
                    recommendations: [
                        {
                            action: `Cross-train other team members in ${skill}`,
                            priority: 'low',
                            effort: 'high',
                            impact: 'Increase skill flexibility'
                        },
                        {
                            action: `Consider reassigning ${skill} resources`,
                            priority: 'medium',
                            effort: 'medium',
                            impact: 'Optimize resource allocation'
                        }
                    ]
                });
            }
        }
        return insights;
    }
    async analyzeCapacityPlanning(utilizationData, demandData) {
        const insights = [];
        // Compare utilization vs demand trends
        const utilizationValues = utilizationData.map(d => d.value);
        const demandValues = demandData.map(d => d.value);
        const utilizationTrend = this.calculateLinearTrend(utilizationValues);
        const demandTrend = this.calculateLinearTrend(demandValues);
        // Capacity gap analysis
        if (demandTrend.slope > utilizationTrend.slope && demandTrend.correlation > 0.6) {
            insights.push({
                id: `capacity_gap_${Date.now()}`,
                category: 'planning',
                title: 'Growing Capacity Gap',
                description: 'Demand is increasing faster than utilization capacity, indicating a potential capacity shortage.',
                impact: 'high',
                confidence: Math.min(demandTrend.correlation, 0.9),
                dataPoints: demandData,
                recommendations: [
                    {
                        action: 'Plan capacity expansion',
                        priority: 'high',
                        effort: 'high',
                        impact: 'Prevent future bottlenecks'
                    },
                    {
                        action: 'Optimize current resource usage',
                        priority: 'high',
                        effort: 'medium',
                        impact: 'Bridge capacity gap temporarily'
                    }
                ]
            });
        }
        return insights;
    }
    createSequences(data, windowSize) {
        const sequences = [];
        for (let i = 0; i <= data.length - windowSize; i++) {
            sequences.push(data.slice(i, i + windowSize));
        }
        return sequences;
    }
    async predictExpectedValues(sequences) {
        if (!this.anomalyModel || sequences.length === 0) {
            return new Array(sequences.length).fill(0);
        }
        const sequenceTensor = tf.tensor3d(sequences.map(seq => seq.map(val => [val])));
        const predictions = this.anomalyModel.predict(sequenceTensor);
        const predictionData = await predictions.data();
        sequenceTensor.dispose();
        predictions.dispose();
        return Array.from(predictionData);
    }
    calculateAnomalySeverity(deviation) {
        if (deviation > 1.0)
            return 'high';
        if (deviation > 0.5)
            return 'medium';
        return 'low';
    }
    classifyAnomalyType(actual, expected, previous) {
        const ratio = actual / expected;
        const previousRatio = previous / expected;
        if (ratio > 1.5)
            return 'spike';
        if (ratio < 0.5)
            return 'drop';
        if (Math.abs(ratio - previousRatio) > 0.5)
            return 'trend_change';
        return 'seasonal_anomaly';
    }
    generateAnomalyExplanation(type, actual, expected) {
        const difference = ((actual - expected) / expected * 100).toFixed(1);
        switch (type) {
            case 'spike':
                return `Utilization spike: ${difference}% above expected levels`;
            case 'drop':
                return `Utilization drop: ${Math.abs(parseFloat(difference))}% below expected levels`;
            case 'trend_change':
                return `Significant trend change detected`;
            case 'seasonal_anomaly':
                return `Unusual pattern compared to historical seasonality`;
            default:
                return 'Anomalous behavior detected';
        }
    }
    analyzeTrendChanges(values, timestamps) {
        const trend = this.calculateLinearTrend(values);
        const direction = trend.slope > 0.1 ? 'increasing' : trend.slope < -0.1 ? 'decreasing' : 'stable';
        // Simplified change point detection
        const changePoints = [];
        const windowSize = Math.min(10, Math.floor(values.length / 4));
        for (let i = windowSize; i < values.length - windowSize; i++) {
            const beforeTrend = this.calculateLinearTrend(values.slice(i - windowSize, i));
            const afterTrend = this.calculateLinearTrend(values.slice(i, i + windowSize));
            if (Math.abs(afterTrend.slope - beforeTrend.slope) > 0.1) {
                changePoints.push(timestamps[i]);
            }
        }
        return {
            direction,
            strength: Math.abs(trend.correlation),
            changePoints
        };
    }
    calculateLinearTrend(values) {
        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = values.reduce((sum, val) => sum + val * val, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const correlation = (n * sumXY - sumX * sumY) /
            Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return { slope: slope || 0, correlation: correlation || 0 };
    }
    calculateAutocorrelation(values, lag) {
        if (values.length <= lag)
            return 0;
        const n = values.length - lag;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (values[i] - mean) * (values[i + lag] - mean);
        }
        for (let i = 0; i < values.length; i++) {
            denominator += Math.pow(values[i] - mean, 2);
        }
        return denominator > 0 ? numerator / denominator : 0;
    }
    generatePatternDescription(type, pattern) {
        const mean = pattern.reduce((sum, val) => sum + val, 0) / pattern.length;
        const max = Math.max(...pattern);
        const min = Math.min(...pattern);
        switch (type) {
            case 'workload_peak':
                return `Workload peak pattern with ${(max / mean).toFixed(1)}x average intensity`;
            case 'skill_shortage':
                return `Skill shortage pattern with ${(mean * 100).toFixed(1)}% average utilization`;
            case 'project_overlap':
                return `Project overlap pattern causing ${((max - mean) * 100).toFixed(1)}% utilization spike`;
            case 'seasonal_demand':
                return `Seasonal demand pattern with ${((max - min) / mean * 100).toFixed(1)}% variation`;
            case 'resource_bottleneck':
                return `Resource bottleneck pattern limiting capacity to ${(max * 100).toFixed(1)}%`;
            default:
                return `Pattern with ${pattern.length} data points`;
        }
    }
    calculatePredictiveValue(pattern) {
        // Simplified predictive value calculation based on pattern consistency
        const variance = pattern.reduce((sum, val, i, arr) => {
            const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
            return sum + Math.pow(val - mean, 2);
        }, 0) / pattern.length;
        const mean = pattern.reduce((sum, val) => sum + val, 0) / pattern.length;
        const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
        return Math.max(0.1, 1 - cv); // Higher consistency = higher predictive value
    }
    createDefaultAnomalyResult() {
        return {
            anomalies: [],
            overallScore: 0,
            trendAnalysis: {
                direction: 'stable',
                strength: 0,
                changePoints: []
            }
        };
    }
    getInsightPriority(insight) {
        const impactScore = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 }[insight.impact];
        const confidenceScore = insight.confidence;
        return impactScore * confidenceScore;
    }
    /**
     * Dispose of model resources
     */
    dispose() {
        if (this.patternModel) {
            this.patternModel.dispose();
            this.patternModel = null;
        }
        if (this.anomalyModel) {
            this.anomalyModel.dispose();
            this.anomalyModel = null;
        }
        this.recognizedPatterns.clear();
    }
}
exports.PatternRecognitionService = PatternRecognitionService;
