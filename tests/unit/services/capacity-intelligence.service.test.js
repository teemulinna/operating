"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const capacity_intelligence_service_1 = require("../../../src/services/capacity-intelligence.service");
const database_service_1 = require("../../../src/database/database.service");
(0, globals_1.describe)('CapacityIntelligenceService - Real Functional Tests', () => {
    let service;
    let db;
    (0, globals_1.beforeAll)(async () => {
        db = database_service_1.DatabaseService.getInstance();
        await db.connect();
        service = new capacity_intelligence_service_1.CapacityIntelligenceService();
    });
    (0, globals_1.afterAll)(async () => {
        await db.disconnect();
    });
    (0, globals_1.describe)('Capacity Intelligence Analysis', () => {
        (0, globals_1.it)('should get comprehensive capacity intelligence', async () => {
            const intelligence = await service.getCapacityIntelligence();
            (0, globals_1.expect)(intelligence).toBeDefined();
            (0, globals_1.expect)(intelligence.currentUtilization).toBeDefined();
            (0, globals_1.expect)(intelligence.currentUtilization.overall).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(intelligence.currentUtilization.overall).toBeLessThanOrEqual(100);
            (0, globals_1.expect)(Array.isArray(intelligence.currentUtilization.byDepartment)).toBe(true);
            (0, globals_1.expect)(Array.isArray(intelligence.currentUtilization.bySkill)).toBe(true);
            (0, globals_1.expect)(Array.isArray(intelligence.capacityTrends)).toBe(true);
            (0, globals_1.expect)(intelligence.predictions).toBeDefined();
            (0, globals_1.expect)(Array.isArray(intelligence.predictions)).toBe(true);
        });
        (0, globals_1.it)('should get capacity predictions with different scenarios', async () => {
            const predictions = await service.getCapacityPredictions({
                horizon: '6_months',
                scenarios: ['realistic', 'optimistic', 'pessimistic']
            });
            (0, globals_1.expect)(Array.isArray(predictions)).toBe(true);
            predictions.forEach(pred => {
                (0, globals_1.expect)(pred).toHaveProperty('period');
                (0, globals_1.expect)(pred).toHaveProperty('predictedCapacity');
                (0, globals_1.expect)(pred).toHaveProperty('demandForecast');
                (0, globals_1.expect)(pred).toHaveProperty('utilizationRate');
                (0, globals_1.expect)(pred).toHaveProperty('confidence');
                (0, globals_1.expect)(['optimistic', 'realistic', 'pessimistic']).toContain(pred.scenario);
                (0, globals_1.expect)(pred.confidence).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(pred.confidence).toBeLessThanOrEqual(100);
            });
        });
        (0, globals_1.it)('should identify capacity bottlenecks', async () => {
            const bottlenecks = await service.identifyBottlenecks();
            (0, globals_1.expect)(bottlenecks).toBeDefined();
            (0, globals_1.expect)(bottlenecks).toHaveProperty('current');
            (0, globals_1.expect)(bottlenecks).toHaveProperty('predicted');
            (0, globals_1.expect)(bottlenecks).toHaveProperty('historical');
            (0, globals_1.expect)(Array.isArray(bottlenecks.current)).toBe(true);
            bottlenecks.current.forEach(bottleneck => {
                (0, globals_1.expect)(bottleneck).toHaveProperty('type');
                (0, globals_1.expect)(['skill', 'department', 'resource', 'time']).toContain(bottleneck.type);
                (0, globals_1.expect)(bottleneck).toHaveProperty('severity');
                (0, globals_1.expect)(['low', 'medium', 'high', 'critical']).toContain(bottleneck.severity);
                (0, globals_1.expect)(bottleneck).toHaveProperty('impact');
                (0, globals_1.expect)(bottleneck.impact).toBeGreaterThanOrEqual(0);
                (0, globals_1.expect)(bottleneck.impact).toBeLessThanOrEqual(100);
            });
        });
        (0, globals_1.it)('should run scenario analysis for capacity planning', async () => {
            const scenarioData = {
                scenario: {
                    name: 'Q4 Growth',
                    description: 'Planning for Q4 growth with new projects',
                    changes: [
                        {
                            type: 'add_project',
                            details: {
                                name: 'New Product Launch',
                                estimatedHours: 500,
                                requiredSkills: ['React', 'Node.js'],
                                priority: 'high',
                                teamSize: 3,
                                duration: 3
                            }
                        },
                        {
                            type: 'add_resources',
                            details: {
                                count: 2,
                                skills: ['React'],
                                hoursPerWeek: 40
                            }
                        }
                    ]
                },
                analysisOptions: {
                    includeRiskAnalysis: true,
                    optimizationSuggestions: true,
                    costImpact: true
                }
            };
            const analysis = await service.runScenarioAnalysis(scenarioData);
            (0, globals_1.expect)(analysis).toBeDefined();
            (0, globals_1.expect)(analysis).toHaveProperty('scenarioId');
            (0, globals_1.expect)(analysis.analysis).toHaveProperty('capacityImpact');
            (0, globals_1.expect)(analysis.analysis.capacityImpact).toHaveProperty('totalCapacityChange');
            (0, globals_1.expect)(analysis.analysis).toHaveProperty('bottleneckAnalysis');
            (0, globals_1.expect)(analysis.analysis).toHaveProperty('recommendations');
            (0, globals_1.expect)(analysis.analysis).toHaveProperty('riskAssessment');
        });
        (0, globals_1.it)('should analyze utilization patterns over time', async () => {
            const patterns = await service.analyzeUtilizationPatterns({
                period: 'last_year',
                granularity: 'monthly'
            });
            (0, globals_1.expect)(patterns).toBeDefined();
            (0, globals_1.expect)(patterns.patterns).toBeDefined();
            (0, globals_1.expect)(patterns.patterns.averageUtilization).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(Array.isArray(patterns.patterns.peakPeriods)).toBe(true);
            (0, globals_1.expect)(Array.isArray(patterns.patterns.lowUtilizationPeriods)).toBe(true);
            (0, globals_1.expect)(patterns.seasonality).toBeDefined();
            (0, globals_1.expect)(typeof patterns.seasonality.hasSeasonality).toBe('boolean');
            (0, globals_1.expect)(patterns.trends).toBeDefined();
            (0, globals_1.expect)(['increasing', 'decreasing', 'stable']).toContain(patterns.trends.direction);
            (0, globals_1.expect)(Array.isArray(patterns.anomalies)).toBe(true);
        });
        (0, globals_1.it)('should forecast skill demand', async () => {
            const forecast = await service.forecastSkillDemand('12_months');
            (0, globals_1.expect)(forecast).toBeDefined();
            (0, globals_1.expect)(Array.isArray(forecast.skillDemand)).toBe(true);
            (0, globals_1.expect)(Array.isArray(forecast.skillGaps)).toBe(true);
            (0, globals_1.expect)(Array.isArray(forecast.hiringRecommendations)).toBe(true);
            (0, globals_1.expect)(Array.isArray(forecast.trainingRecommendations)).toBe(true);
            forecast.skillDemand.forEach(demand => {
                (0, globals_1.expect)(demand).toHaveProperty('skill');
                (0, globals_1.expect)(demand).toHaveProperty('currentSupply');
                (0, globals_1.expect)(demand).toHaveProperty('forecastedDemand');
                (0, globals_1.expect)(demand).toHaveProperty('gap');
                (0, globals_1.expect)(demand).toHaveProperty('confidence');
                (0, globals_1.expect)(demand).toHaveProperty('trendDirection');
                (0, globals_1.expect)(['increasing', 'decreasing', 'stable']).toContain(demand.trendDirection);
            });
        });
    });
});
//# sourceMappingURL=capacity-intelligence.service.test.js.map