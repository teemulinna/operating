import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { CapacityIntelligenceService } from '../../src/services/capacity-intelligence.service';

describe('Capacity Intelligence API', () => {
  let db: DatabaseService;
  let capacityService: CapacityIntelligenceService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    capacityService = new CapacityIntelligenceService();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM capacity_predictions WHERE id >= 9000');
    await db.query('DELETE FROM capacity_bottlenecks WHERE id >= 9000');
    await db.query('DELETE FROM capacity_recommendations WHERE id >= 9000');
  });

  describe('GET /api/capacity/intelligence', () => {
    it('should return comprehensive capacity intelligence dashboard', async () => {
      const response = await request(app)
        .get('/api/capacity/intelligence')
        .expect(200);

      expect(response.body).toHaveProperty('currentUtilization');
      expect(response.body).toHaveProperty('capacityTrends');
      expect(response.body).toHaveProperty('bottleneckAnalysis');
      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('riskFactors');

      // Validate structure
      expect(response.body.currentUtilization).toHaveProperty('overall');
      expect(response.body.currentUtilization).toHaveProperty('byDepartment');
      expect(response.body.currentUtilization).toHaveProperty('bySkill');
    });

    it('should filter capacity intelligence by department', async () => {
      const response = await request(app)
        .get('/api/capacity/intelligence?department=Engineering&timeframe=next_quarter')
        .expect(200);

      expect(response.body.currentUtilization.byDepartment).toBeDefined();
      // Should focus on Engineering department data
    });
  });

  describe('GET /api/capacity/predictions', () => {
    it('should generate predictive capacity analysis', async () => {
      const response = await request(app)
        .get('/api/capacity/predictions?horizon=6_months&confidence=0.8')
        .expect(200);

      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body).toHaveProperty('confidenceIntervals');
      expect(response.body).toHaveProperty('keyFactors');

      const prediction = response.body.predictions[0];
      expect(prediction).toHaveProperty('period');
      expect(prediction).toHaveProperty('predictedCapacity');
      expect(prediction).toHaveProperty('demandForecast');
      expect(prediction).toHaveProperty('utilizationRate');
      expect(prediction).toHaveProperty('confidence');
    });

    it('should handle different prediction scenarios', async () => {
      const response = await request(app)
        .get('/api/capacity/predictions?scenarios=optimistic,realistic,pessimistic')
        .expect(200);

      expect(response.body.scenarios).toHaveProperty('optimistic');
      expect(response.body.scenarios).toHaveProperty('realistic');
      expect(response.body.scenarios).toHaveProperty('pessimistic');
    });
  });

  describe('GET /api/capacity/bottlenecks', () => {
    it('should identify current and potential bottlenecks', async () => {
      const response = await request(app)
        .get('/api/capacity/bottlenecks?severity=high')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('predicted');
      expect(response.body).toHaveProperty('historical');
      expect(Array.isArray(response.body.current)).toBe(true);

      if (response.body.current.length > 0) {
        const bottleneck = response.body.current[0];
        expect(bottleneck).toHaveProperty('type'); // skill, department, or resource
        expect(bottleneck).toHaveProperty('severity');
        expect(bottleneck).toHaveProperty('impact');
        expect(bottleneck).toHaveProperty('affectedProjects');
        expect(bottleneck).toHaveProperty('recommendedActions');
      }
    });
  });

  describe('GET /api/capacity/optimization-suggestions', () => {
    it('should provide capacity optimization recommendations', async () => {
      const response = await request(app)
        .get('/api/capacity/optimization-suggestions')
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('quickWins');
      expect(response.body).toHaveProperty('strategicActions');
      expect(response.body).toHaveProperty('costBenefitAnalysis');

      const recommendation = response.body.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('description');
      expect(recommendation).toHaveProperty('expectedImpact');
      expect(recommendation).toHaveProperty('implementationCost');
    });
  });

  describe('POST /api/capacity/scenario-analysis', () => {
    it('should run what-if scenario analysis', async () => {
      const scenarioData = {
        scenario: {
          name: 'New Product Launch',
          description: 'Adding 3 new projects for Q2 product launch',
          changes: [
            {
              type: 'add_project',
              details: {
                name: 'Mobile App Development',
                requiredSkills: ['React Native', 'iOS', 'Android'],
                duration: 4, // months
                teamSize: 5
              }
            },
            {
              type: 'add_resources',
              details: {
                role: 'Senior Mobile Developer',
                count: 2,
                startDate: '2024-02-01'
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

      const response = await request(app)
        .post('/api/capacity/scenario-analysis')
        .send(scenarioData)
        .expect(200);

      expect(response.body).toHaveProperty('scenarioId');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('capacityImpact');
      expect(response.body.analysis).toHaveProperty('bottleneckAnalysis');
      expect(response.body.analysis).toHaveProperty('recommendations');
      expect(response.body.analysis).toHaveProperty('riskAssessment');
    });
  });

  describe('GET /api/capacity/utilization-patterns', () => {
    it('should analyze utilization patterns and trends', async () => {
      const response = await request(app)
        .get('/api/capacity/utilization-patterns?period=last_year&granularity=monthly')
        .expect(200);

      expect(response.body).toHaveProperty('patterns');
      expect(response.body).toHaveProperty('seasonality');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('anomalies');

      expect(response.body.patterns).toHaveProperty('peakPeriods');
      expect(response.body.patterns).toHaveProperty('lowUtilizationPeriods');
      expect(response.body.patterns).toHaveProperty('averageUtilization');
    });
  });

  describe('GET /api/capacity/skill-demand-forecast', () => {
    it('should forecast skill demand based on project pipeline', async () => {
      const response = await request(app)
        .get('/api/capacity/skill-demand-forecast?horizon=12_months')
        .expect(200);

      expect(response.body).toHaveProperty('skillDemand');
      expect(response.body).toHaveProperty('skillGaps');
      expect(response.body).toHaveProperty('hiringRecommendations');
      expect(response.body).toHaveProperty('trainingRecommendations');

      const skillDemand = response.body.skillDemand[0];
      expect(skillDemand).toHaveProperty('skill');
      expect(skillDemand).toHaveProperty('currentSupply');
      expect(skillDemand).toHaveProperty('forecastedDemand');
      expect(skillDemand).toHaveProperty('gap');
      expect(skillDemand).toHaveProperty('confidence');
    });
  });

  describe('GET /api/capacity/resource-allocation-optimizer', () => {
    it('should suggest optimal resource allocation', async () => {
      const response = await request(app)
        .get('/api/capacity/resource-allocation-optimizer?objective=maximize_utilization')
        .expect(200);

      expect(response.body).toHaveProperty('currentAllocation');
      expect(response.body).toHaveProperty('optimizedAllocation');
      expect(response.body).toHaveProperty('improvements');
      expect(response.body).toHaveProperty('constraints');

      expect(response.body.improvements).toHaveProperty('utilizationIncrease');
      expect(response.body.improvements).toHaveProperty('bottleneckReduction');
      expect(response.body.improvements).toHaveProperty('costEfficiency');
    });
  });

  describe('POST /api/capacity/alerts/configure', () => {
    it('should configure capacity monitoring alerts', async () => {
      const alertConfig = {
        alerts: [
          {
            name: 'High Utilization Warning',
            type: 'utilization_threshold',
            threshold: 85,
            scope: 'department',
            target: 'Engineering',
            notification: {
              email: ['manager@company.com'],
              slack: '#capacity-alerts'
            }
          },
          {
            name: 'Skill Bottleneck Alert',
            type: 'skill_shortage',
            skill: 'React',
            threshold: 2, // minimum available resources
            lookAhead: '2_weeks'
          }
        ]
      };

      const response = await request(app)
        .post('/api/capacity/alerts/configure')
        .send(alertConfig)
        .expect(201);

      expect(response.body).toHaveProperty('configurationId');
      expect(response.body).toHaveProperty('activeAlerts');
      expect(response.body.activeAlerts).toHaveLength(2);
    });
  });

  describe('GET /api/capacity/performance-metrics', () => {
    it('should return capacity management performance metrics', async () => {
      const response = await request(app)
        .get('/api/capacity/performance-metrics?period=quarterly')
        .expect(200);

      expect(response.body).toHaveProperty('kpis');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('benchmarks');

      expect(response.body.kpis).toHaveProperty('averageUtilization');
      expect(response.body.kpis).toHaveProperty('capacityEfficiency');
      expect(response.body.kpis).toHaveProperty('bottleneckFrequency');
      expect(response.body.kpis).toHaveProperty('predictionAccuracy');
    });
  });
});