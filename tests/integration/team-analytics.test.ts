import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { TeamAnalyticsService } from '../../src/services/team-analytics.service';

describe('Team Analytics API', () => {
  let db: DatabaseService;
  let analyticsService: TeamAnalyticsService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    analyticsService = new TeamAnalyticsService();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM team_performance_metrics WHERE id >= 9000');
    await db.query('DELETE FROM project_success_factors WHERE project_id >= 9000');
  });

  describe('GET /api/analytics/team', () => {
    it('should return comprehensive team analytics dashboard', async () => {
      const response = await request(app)
        .get('/api/analytics/team?timeframe=last_quarter')
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('utilizationMetrics');
      expect(response.body).toHaveProperty('performanceMetrics');
      expect(response.body).toHaveProperty('projectSuccessRates');
      expect(response.body).toHaveProperty('skillUtilization');
      expect(response.body).toHaveProperty('teamEfficiency');

      // Validate overview structure
      expect(response.body.overview).toHaveProperty('totalProjects');
      expect(response.body.overview).toHaveProperty('activeEmployees');
      expect(response.body.overview).toHaveProperty('averageUtilization');
      expect(response.body.overview).toHaveProperty('completedProjects');
    });

    it('should filter team analytics by department', async () => {
      const response = await request(app)
        .get('/api/analytics/team?department=Engineering&timeframe=ytd')
        .expect(200);

      // Should return filtered results for Engineering department
      expect(response.body.overview).toBeDefined();
    });
  });

  describe('GET /api/analytics/performance', () => {
    it('should return detailed performance analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/performance?metrics=productivity,quality,efficiency')
        .expect(200);

      expect(response.body).toHaveProperty('productivityMetrics');
      expect(response.body).toHaveProperty('qualityMetrics');
      expect(response.body).toHaveProperty('efficiencyMetrics');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('benchmarks');

      // Validate productivity metrics
      expect(response.body.productivityMetrics).toHaveProperty('tasksCompleted');
      expect(response.body.productivityMetrics).toHaveProperty('averageTaskDuration');
      expect(response.body.productivityMetrics).toHaveProperty('outputPerEmployee');
    });
  });

  describe('GET /api/analytics/resource-utilization-patterns', () => {
    it('should analyze resource utilization patterns', async () => {
      const response = await request(app)
        .get('/api/analytics/resource-utilization-patterns?granularity=weekly')
        .expect(200);

      expect(response.body).toHaveProperty('utilizationPatterns');
      expect(response.body).toHaveProperty('peakUtilizationPeriods');
      expect(response.body).toHaveProperty('underutilizedResources');
      expect(response.body).toHaveProperty('overutilizedResources');
      expect(response.body).toHaveProperty('recommendations');

      const pattern = response.body.utilizationPatterns[0];
      expect(pattern).toHaveProperty('period');
      expect(pattern).toHaveProperty('averageUtilization');
      expect(pattern).toHaveProperty('departmentBreakdown');
    });
  });

  describe('GET /api/analytics/project-success-correlations', () => {
    it('should analyze factors correlating with project success', async () => {
      const response = await request(app)
        .get('/api/analytics/project-success-correlations')
        .expect(200);

      expect(response.body).toHaveProperty('correlations');
      expect(response.body).toHaveProperty('successFactors');
      expect(response.body).toHaveProperty('riskFactors');
      expect(response.body).toHaveProperty('recommendations');

      const correlation = response.body.correlations[0];
      expect(correlation).toHaveProperty('factor');
      expect(correlation).toHaveProperty('correlationCoefficient');
      expect(correlation).toHaveProperty('significance');
      expect(correlation).toHaveProperty('description');
    });
  });

  describe('GET /api/analytics/department-efficiency', () => {
    it('should return department efficiency scores', async () => {
      const response = await request(app)
        .get('/api/analytics/department-efficiency?compare=true')
        .expect(200);

      expect(response.body).toHaveProperty('departments');
      expect(response.body).toHaveProperty('overallRanking');
      expect(response.body).toHaveProperty('efficiencyTrends');
      expect(response.body).toHaveProperty('benchmarkComparison');

      const department = response.body.departments[0];
      expect(department).toHaveProperty('name');
      expect(department).toHaveProperty('efficiencyScore');
      expect(department).toHaveProperty('metrics');
      expect(department).toHaveProperty('rank');
    });
  });

  describe('GET /api/analytics/skill-performance-correlation', () => {
    it('should analyze correlation between skills and performance', async () => {
      const response = await request(app)
        .get('/api/analytics/skill-performance-correlation')
        .expect(200);

      expect(response.body).toHaveProperty('skillCorrelations');
      expect(response.body).toHaveProperty('highPerformingSkills');
      expect(response.body).toHaveProperty('underPerformingSkills');
      expect(response.body).toHaveProperty('skillGapImpact');

      const skillCorrelation = response.body.skillCorrelations[0];
      expect(skillCorrelation).toHaveProperty('skill');
      expect(skillCorrelation).toHaveProperty('performanceImpact');
      expect(skillCorrelation).toHaveProperty('confidence');
    });
  });

  describe('POST /api/analytics/custom-report', () => {
    it('should generate custom analytics reports', async () => {
      const reportConfig = {
        name: 'Q1 Performance Review',
        metrics: [\n          'team_productivity',\n          'project_completion_rate',\n          'resource_utilization',\n          'skill_distribution'\n        ],\n        filters: {\n          timeframe: {\n            start: '2024-01-01',\n            end: '2024-03-31'\n          },\n          departments: ['Engineering', 'Design'],\n          projectStatuses: ['completed', 'in_progress']\n        },\n        groupBy: ['department', 'month'],\n        visualizations: [\n          {\n            type: 'line_chart',\n            metric: 'team_productivity',\n            title: 'Productivity Trend Over Time'\n          },\n          {\n            type: 'bar_chart',\n            metric: 'resource_utilization',\n            title: 'Utilization by Department'\n          }\n        ]\n      };\n\n      const response = await request(app)\n        .post('/api/analytics/custom-report')\n        .send(reportConfig)\n        .expect(201);\n\n      expect(response.body).toHaveProperty('reportId');\n      expect(response.body).toHaveProperty('data');\n      expect(response.body).toHaveProperty('visualizations');\n      expect(response.body).toHaveProperty('summary');\n    });\n  });\n\n  describe('GET /api/analytics/predictive-insights', () => {\n    it('should provide predictive insights for team performance', async () => {\n      const response = await request(app)\n        .get('/api/analytics/predictive-insights?horizon=next_quarter')\n        .expect(200);\n\n      expect(response.body).toHaveProperty('predictions');\n      expect(response.body).toHaveProperty('riskFactors');\n      expect(response.body).toHaveProperty('opportunities');\n      expect(response.body).toHaveProperty('recommendations');\n\n      const prediction = response.body.predictions[0];\n      expect(prediction).toHaveProperty('metric');\n      expect(prediction).toHaveProperty('predictedValue');\n      expect(prediction).toHaveProperty('confidence');\n      expect(prediction).toHaveProperty('trend');\n    });\n  });\n\n  describe('GET /api/analytics/team-collaboration-metrics', () => {\n    it('should analyze team collaboration effectiveness', async () => {\n      const response = await request(app)\n        .get('/api/analytics/team-collaboration-metrics')\n        .expect(200);\n\n      expect(response.body).toHaveProperty('collaborationScore');\n      expect(response.body).toHaveProperty('crossFunctionalProjects');\n      expect(response.body).toHaveProperty('knowledgeSharing');\n      expect(response.body).toHaveProperty('communicationEfficiency');\n      expect(response.body).toHaveProperty('teamDynamics');\n    });\n  });\n\n  describe('GET /api/analytics/burnout-risk-assessment', () => {\n    it('should assess burnout risk across teams', async () => {\n      const response = await request(app)\n        .get('/api/analytics/burnout-risk-assessment')\n        .expect(200);\n\n      expect(response.body).toHaveProperty('riskAssessment');\n      expect(response.body).toHaveProperty('highRiskEmployees');\n      expect(response.body).toHaveProperty('departmentRisks');\n      expect(response.body).toHaveProperty('earlyWarningIndicators');\n      expect(response.body).toHaveProperty('interventionRecommendations');\n\n      if (response.body.highRiskEmployees.length > 0) {\n        const riskEmployee = response.body.highRiskEmployees[0];\n        expect(riskEmployee).toHaveProperty('employeeId');\n        expect(riskEmployee).toHaveProperty('riskScore');\n        expect(riskEmployee).toHaveProperty('riskFactors');\n      }\n    });\n  });\n\n  describe('GET /api/analytics/workforce-optimization', () => {\n    it('should provide workforce optimization recommendations', async () => {\n      const response = await request(app)\n        .get('/api/analytics/workforce-optimization')\n        .expect(200);\n\n      expect(response.body).toHaveProperty('currentState');\n      expect(response.body).toHaveProperty('optimizationOpportunities');\n      expect(response.body).toHaveProperty('skillRealignments');\n      expect(response.body).toHaveProperty('teamRestructuring');\n      expect(response.body).toHaveProperty('capacityOptimization');\n\n      const opportunity = response.body.optimizationOpportunities[0];\n      expect(opportunity).toHaveProperty('type');\n      expect(opportunity).toHaveProperty('impact');\n      expect(opportunity).toHaveProperty('effort');\n      expect(opportunity).toHaveProperty('priority');\n    });\n  });\n\n  describe('GET /api/analytics/project-health-indicators', () => {\n    it('should provide real-time project health indicators', async () => {\n      const response = await request(app)\n        .get('/api/analytics/project-health-indicators')\n        .expect(200);\n\n      expect(response.body).toHaveProperty('healthOverview');\n      expect(response.body).toHaveProperty('riskProjects');\n      expect(response.body).toHaveProperty('performingProjects');\n      expect(response.body).toHaveProperty('healthTrends');\n      expect(response.body).toHaveProperty('alertsAndRecommendations');\n    });\n  });\n\n  describe('POST /api/analytics/benchmark-comparison', () => {\n    it('should compare team metrics against industry benchmarks', async () => {\n      const benchmarkRequest = {\n        industry: 'Technology',\n        companySize: 'Mid-size (100-500 employees)',\n        metrics: [\n          'average_utilization',\n          'project_success_rate',\n          'employee_satisfaction',\n          'productivity_index'\n        ]\n      };\n\n      const response = await request(app)\n        .post('/api/analytics/benchmark-comparison')\n        .send(benchmarkRequest)\n        .expect(200);\n\n      expect(response.body).toHaveProperty('comparisons');\n      expect(response.body).toHaveProperty('rankings');\n      expect(response.body).toHaveProperty('improvementAreas');\n      expect(response.body).toHaveProperty('strengths');\n\n      const comparison = response.body.comparisons[0];\n      expect(comparison).toHaveProperty('metric');\n      expect(comparison).toHaveProperty('ourValue');\n      expect(comparison).toHaveProperty('benchmarkValue');\n      expect(comparison).toHaveProperty('percentile');\n    });\n  });\n});"