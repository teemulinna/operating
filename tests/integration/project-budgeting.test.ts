import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { ProjectBudgetingService } from '../../src/services/project-budgeting.service';

describe('Project Budgeting API', () => {
  let db: DatabaseService;
  let budgetingService: ProjectBudgetingService;

  beforeAll(async () => {
    db = DatabaseService.getInstance();
    budgetingService = new ProjectBudgetingService();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM budget_forecasts WHERE project_id >= 9000');
    await db.query('DELETE FROM project_budgets WHERE project_id >= 9000');
    await db.query('DELETE FROM rate_cards WHERE id >= 9000');
    await db.query('DELETE FROM project_assignments WHERE project_id >= 9000');
    await db.query('DELETE FROM projects WHERE id >= 9000');
  });

  describe('POST /api/projects/:id/budget', () => {
    it('should create project budget with detailed breakdown', async () => {
      // Create test project
      await db.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, budget, created_by)
        VALUES (9001, 'Test Project', 'Test Description', '2024-01-01', '2024-12-31', 'planning', 100000, 1)
      `);

      const budgetData = {
        totalBudget: 150000,
        laborBudget: 120000,
        nonLaborBudget: 30000,
        contingencyPercentage: 10,
        budgetCategories: [
          {
            category: 'Development',
            amount: 80000,
            description: 'Software development costs'
          },
          {
            category: 'Testing',
            amount: 25000,
            description: 'QA and testing costs'
          },
          {
            category: 'Infrastructure',
            amount: 15000,
            description: 'Cloud and infrastructure costs'
          }
        ],
        rateCards: [
          {
            role: 'Senior Developer',
            hourlyRate: 85,
            estimatedHours: 800
          },
          {
            role: 'Junior Developer',
            hourlyRate: 45,
            estimatedHours: 600
          }
        ]
      };

      const response = await request(app)
        .post('/api/projects/9001/budget')
        .send(budgetData)
        .expect(201);

      expect(response.body).toMatchObject({
        projectId: 9001,
        totalBudget: 150000,
        laborBudget: 120000,
        nonLaborBudget: 30000
      });
      expect(response.body.budgetCategories).toHaveLength(3);
      expect(response.body.rateCards).toHaveLength(2);
    });

    it('should validate budget totals consistency', async () => {
      await db.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, budget, created_by)
        VALUES (9002, 'Test Project 2', 'Test Description', '2024-01-01', '2024-12-31', 'planning', 100000, 1)
      `);

      const invalidBudgetData = {
        totalBudget: 100000,
        laborBudget: 80000,
        nonLaborBudget: 30000 // This adds up to 110000, exceeding totalBudget
      };

      const response = await request(app)
        .post('/api/projects/9002/budget')
        .send(invalidBudgetData)
        .expect(400);

      expect(response.body.message).toContain('budget totals do not match');
    });
  });

  describe('GET /api/projects/:id/budget', () => {
    it('should return detailed budget information with current spending', async () => {
      // Setup test data
      await db.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, budget, created_by)
        VALUES (9003, 'Budget Test Project', 'Test Description', '2024-01-01', '2024-12-31', 'active', 100000, 1)
      `);
      await db.query(`
        INSERT INTO project_budgets (project_id, total_budget, labor_budget, non_labor_budget, contingency_percentage, created_at)
        VALUES (9003, 100000, 80000, 20000, 10, NOW())
      `);

      const response = await request(app)
        .get('/api/projects/9003/budget')
        .expect(200);

      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('currentSpending');
      expect(response.body).toHaveProperty('remainingBudget');
      expect(response.body).toHaveProperty('burnRate');
      expect(response.body.budget.totalBudget).toBe(100000);
    });
  });

  describe('POST /api/projects/:id/budget-forecast', () => {
    it('should generate budget forecast based on current trends', async () => {
      await db.query(`
        INSERT INTO projects (id, name, description, start_date, end_date, status, budget, created_by)
        VALUES (9004, 'Forecast Project', 'Test Description', '2024-01-01', '2024-12-31', 'active', 100000, 1)
      `);

      const forecastRequest = {
        forecastPeriod: 'next_quarter',
        includeRiskFactors: true,
        scenarios: ['optimistic', 'realistic', 'pessimistic']
      };

      const response = await request(app)
        .post('/api/projects/9004/budget-forecast')
        .send(forecastRequest)
        .expect(200);

      expect(response.body).toHaveProperty('forecast');
      expect(response.body).toHaveProperty('scenarios');
      expect(response.body).toHaveProperty('riskFactors');
      expect(response.body.scenarios).toHaveLength(3);
    });
  });

  describe('GET /api/projects/:id/cost-tracking', () => {
    it('should return detailed cost tracking with planned vs actual', async () => {
      const response = await request(app)
        .get('/api/projects/9004/cost-tracking?period=monthly')
        .expect(200);

      expect(response.body).toHaveProperty('costBreakdown');
      expect(response.body).toHaveProperty('plannedVsActual');
      expect(response.body).toHaveProperty('variance');
      expect(response.body).toHaveProperty('trends');
    });
  });

  describe('PUT /api/rate-cards/:id', () => {
    it('should update hourly rates for roles', async () => {
      await db.query(`
        INSERT INTO rate_cards (id, role, hourly_rate, effective_date, is_active)
        VALUES (9001, 'Senior Developer', 80, '2024-01-01', true)
      `);

      const rateUpdate = {
        hourlyRate: 90,
        effectiveDate: '2024-02-01',
        reason: 'Annual rate adjustment'
      };

      const response = await request(app)
        .put('/api/rate-cards/9001')
        .send(rateUpdate)
        .expect(200);

      expect(response.body.hourlyRate).toBe(90);
      expect(response.body.effectiveDate).toBe('2024-02-01');
    });
  });

  describe('GET /api/projects/:id/margin-analysis', () => {
    it('should calculate project margins and profitability', async () => {
      const response = await request(app)
        .get('/api/projects/9003/margin-analysis')
        .expect(200);

      expect(response.body).toHaveProperty('grossMargin');
      expect(response.body).toHaveProperty('netMargin');
      expect(response.body).toHaveProperty('profitability');
      expect(response.body).toHaveProperty('costEfficiency');
      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('GET /api/budget-analytics/summary', () => {
    it('should return organization-wide budget analytics', async () => {
      const response = await request(app)
        .get('/api/budget-analytics/summary?timeframe=quarter')
        .expect(200);

      expect(response.body).toHaveProperty('totalBudgets');
      expect(response.body).toHaveProperty('totalSpending');
      expect(response.body).toHaveProperty('averageBurnRate');
      expect(response.body).toHaveProperty('projectPerformance');
      expect(response.body).toHaveProperty('costTrends');
    });
  });

  describe('POST /api/projects/:id/budget-revision', () => {
    it('should handle budget revision requests with approval workflow', async () => {
      const revisionData = {
        newTotalBudget: 120000,
        reason: 'Additional requirements discovered',
        justification: 'Client requested additional features that require more development time',
        impactAnalysis: {
          schedule: 'No impact expected',
          scope: 'Additional features added',
          resources: 'Need one additional developer for 2 months'
        }
      };

      const response = await request(app)
        .post('/api/projects/9003/budget-revision')
        .send(revisionData)
        .expect(201);

      expect(response.body).toHaveProperty('revisionId');
      expect(response.body).toHaveProperty('status', 'pending_approval');
      expect(response.body.newTotalBudget).toBe(120000);
    });
  });

  describe('GET /api/rate-cards/market-comparison', () => {
    it('should provide market rate comparison and recommendations', async () => {
      const response = await request(app)
        .get('/api/rate-cards/market-comparison?role=Senior Developer')
        .expect(200);

      expect(response.body).toHaveProperty('currentRate');
      expect(response.body).toHaveProperty('marketRange');
      expect(response.body).toHaveProperty('percentile');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('competitiveAnalysis');
    });
  });
});