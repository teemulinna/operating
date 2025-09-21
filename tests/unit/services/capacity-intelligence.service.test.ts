import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CapacityIntelligenceService } from '../../../src/services/capacity-intelligence.service';
import { DatabaseService } from '../../../src/database/database.service';

describe('CapacityIntelligenceService - Real Functional Tests', () => {
  let service: CapacityIntelligenceService;
  let db: DatabaseService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.connect();
    service = new CapacityIntelligenceService();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  describe('Capacity Intelligence Analysis', () => {
    it('should get comprehensive capacity intelligence', async () => {
      const intelligence = await service.getCapacityIntelligence();

      expect(intelligence).toBeDefined();
      expect(intelligence.currentUtilization).toBeDefined();
      expect(intelligence.currentUtilization.overall).toBeGreaterThanOrEqual(0);
      expect(intelligence.currentUtilization.overall).toBeLessThanOrEqual(100);
      expect(Array.isArray(intelligence.currentUtilization.byDepartment)).toBe(true);
      expect(Array.isArray(intelligence.currentUtilization.bySkill)).toBe(true);
      expect(Array.isArray(intelligence.capacityTrends)).toBe(true);
      expect(intelligence.predictions).toBeDefined();
      expect(Array.isArray(intelligence.predictions)).toBe(true);
    });

    it('should get capacity predictions with different scenarios', async () => {
      const predictions = await service.getCapacityPredictions({
        horizon: '6_months',
        scenarios: ['realistic', 'optimistic', 'pessimistic']
      });

      expect(Array.isArray(predictions)).toBe(true);
      predictions.forEach(pred => {
        expect(pred).toHaveProperty('period');
        expect(pred).toHaveProperty('predictedCapacity');
        expect(pred).toHaveProperty('demandForecast');
        expect(pred).toHaveProperty('utilizationRate');
        expect(pred).toHaveProperty('confidence');
        expect(['optimistic', 'realistic', 'pessimistic']).toContain(pred.scenario);
        expect(pred.confidence).toBeGreaterThanOrEqual(0);
        expect(pred.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should identify capacity bottlenecks', async () => {
      const bottlenecks = await service.identifyBottlenecks();

      expect(bottlenecks).toBeDefined();
      expect(bottlenecks).toHaveProperty('current');
      expect(bottlenecks).toHaveProperty('predicted');
      expect(bottlenecks).toHaveProperty('historical');
      expect(Array.isArray(bottlenecks.current)).toBe(true);

      bottlenecks.current.forEach(bottleneck => {
        expect(bottleneck).toHaveProperty('type');
        expect(['skill', 'department', 'resource', 'time']).toContain(bottleneck.type);
        expect(bottleneck).toHaveProperty('severity');
        expect(['low', 'medium', 'high', 'critical']).toContain(bottleneck.severity);
        expect(bottleneck).toHaveProperty('impact');
        expect(bottleneck.impact).toBeGreaterThanOrEqual(0);
        expect(bottleneck.impact).toBeLessThanOrEqual(100);
      });
    });

    it('should run scenario analysis for capacity planning', async () => {
      const scenarioData = {
        scenario: {
          name: 'Q4 Growth',
          description: 'Planning for Q4 growth with new projects',
          changes: [
            {
              type: 'add_project' as const,
              details: {
                name: 'New Product Launch',
                estimatedHours: 500,
                requiredSkills: ['React', 'Node.js'],
                priority: 'high' as const,
                teamSize: 3,
                duration: 3
              }
            },
            {
              type: 'add_resources' as const,
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

      expect(analysis).toBeDefined();
      expect(analysis).toHaveProperty('scenarioId');
      expect(analysis.analysis).toHaveProperty('capacityImpact');
      expect(analysis.analysis.capacityImpact).toHaveProperty('totalCapacityChange');
      expect(analysis.analysis).toHaveProperty('bottleneckAnalysis');
      expect(analysis.analysis).toHaveProperty('recommendations');
      expect(analysis.analysis).toHaveProperty('riskAssessment');
    });

    it('should analyze utilization patterns over time', async () => {
      const patterns = await service.analyzeUtilizationPatterns({
        period: 'last_year',
        granularity: 'monthly'
      });

      expect(patterns).toBeDefined();
      expect(patterns.patterns).toBeDefined();
      expect(patterns.patterns.averageUtilization).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(patterns.patterns.peakPeriods)).toBe(true);
      expect(Array.isArray(patterns.patterns.lowUtilizationPeriods)).toBe(true);

      expect(patterns.seasonality).toBeDefined();
      expect(typeof patterns.seasonality.hasSeasonality).toBe('boolean');

      expect(patterns.trends).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(patterns.trends.direction);

      expect(Array.isArray(patterns.anomalies)).toBe(true);
    });

    it('should forecast skill demand', async () => {
      const forecast = await service.forecastSkillDemand('12_months');

      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast.skillDemand)).toBe(true);
      expect(Array.isArray(forecast.skillGaps)).toBe(true);
      expect(Array.isArray(forecast.hiringRecommendations)).toBe(true);
      expect(Array.isArray(forecast.trainingRecommendations)).toBe(true);

      forecast.skillDemand.forEach(demand => {
        expect(demand).toHaveProperty('skill');
        expect(demand).toHaveProperty('currentSupply');
        expect(demand).toHaveProperty('forecastedDemand');
        expect(demand).toHaveProperty('gap');
        expect(demand).toHaveProperty('confidence');
        expect(demand).toHaveProperty('trendDirection');
        expect(['increasing', 'decreasing', 'stable']).toContain(demand.trendDirection);
      });
    });
  });
});