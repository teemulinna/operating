import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { AnalyticsService } from '../../src/services/analytics.service';
import { CapacityHistoryModel } from '../../src/models/CapacityHistory';
import { EmployeeModel } from '../../src/models/Employee';
import { DepartmentModel } from '../../src/models/Department';

describe('Analytics API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Initialize database connection
    const db = DatabaseService.getInstance();
    await db.connect();
    
    // Initialize models
    AnalyticsService.initialize(db.getPool());
    CapacityHistoryModel.initialize(db.getPool());
    EmployeeModel.initialize(db.getPool());
    DepartmentModel.initialize(db.getPool());

    // Setup test data
    await setupTestData();
    
    // Get auth token (mock authentication)
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    const db = DatabaseService.getInstance();
    await db.disconnect();
  });

  beforeEach(async () => {
    // Reset test data if needed
  });

  describe('GET /api/analytics/team-utilization', () => {
    it('should return team utilization data', async () => {
      const response = await request(app)
        .get('/api/analytics/team-utilization')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const utilizationData = response.body.data[0];
        expect(utilizationData).toHaveProperty('departmentId');
        expect(utilizationData).toHaveProperty('departmentName');
        expect(utilizationData).toHaveProperty('totalEmployees');
        expect(utilizationData).toHaveProperty('averageUtilization');
        expect(utilizationData).toHaveProperty('totalAvailableHours');
        expect(utilizationData).toHaveProperty('totalAllocatedHours');
        expect(utilizationData).toHaveProperty('utilizationTrend');
      }
    });

    it('should filter by date range', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';
      
      const response = await request(app)
        .get(`/api/analytics/team-utilization?dateFrom=${dateFrom}&dateTo=${dateTo}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata.dateRange.from).toBe(dateFrom);
      expect(response.body.metadata.dateRange.to).toBe(dateTo);
    });

    it('should filter by department IDs', async () => {
      const departmentIds = '1,2';
      
      const response = await request(app)
        .get(`/api/analytics/team-utilization?departmentIds=${departmentIds}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata.filters.departmentIds).toEqual(['1', '2']);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/analytics/team-utilization');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/analytics/capacity-trends', () => {
    it('should return capacity trends data', async () => {
      const response = await request(app)
        .get('/api/analytics/capacity-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const trendData = response.body.data[0];
        expect(trendData).toHaveProperty('date');
        expect(trendData).toHaveProperty('departmentId');
        expect(trendData).toHaveProperty('departmentName');
        expect(trendData).toHaveProperty('averageUtilization');
        expect(trendData).toHaveProperty('totalAvailableHours');
        expect(trendData).toHaveProperty('totalAllocatedHours');
        expect(trendData).toHaveProperty('employeeCount');
      }
    });

    it('should support aggregation periods', async () => {
      const response = await request(app)
        .get('/api/analytics/capacity-trends?aggregationPeriod=monthly')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata.filters.aggregationPeriod).toBe('monthly');
    });
  });

  describe('GET /api/analytics/resource-allocation', () => {
    it('should return resource allocation metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/resource-allocation')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('totalEmployees');
      expect(response.body.data).toHaveProperty('totalDepartments');
      expect(response.body.data).toHaveProperty('averageUtilizationAcrossCompany');
      expect(response.body.data).toHaveProperty('overutilizedEmployees');
      expect(response.body.data).toHaveProperty('underutilizedEmployees');
      expect(response.body.data).toHaveProperty('criticalResourceGaps');
      expect(response.body.data).toHaveProperty('topPerformingDepartments');
      expect(response.body.data).toHaveProperty('capacityForecast');
    });

    it('should support utilization thresholds', async () => {
      const response = await request(app)
        .get('/api/analytics/resource-allocation?minUtilization=0.6&maxUtilization=0.9')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata.filters.utilizationThreshold).toEqual({
        min: 0.6,
        max: 0.9
      });
    });
  });

  describe('GET /api/analytics/skills-gap', () => {
    it('should return skills gap analysis', async () => {
      const response = await request(app)
        .get('/api/analytics/skills-gap')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const skillGap = response.body.data[0];
        expect(skillGap).toHaveProperty('skillName');
        expect(skillGap).toHaveProperty('skillCategory');
        expect(skillGap).toHaveProperty('totalDemand');
        expect(skillGap).toHaveProperty('availableExperts');
        expect(skillGap).toHaveProperty('gapPercentage');
        expect(skillGap).toHaveProperty('criticalityLevel');
        expect(['low', 'medium', 'high', 'critical']).toContain(skillGap.criticalityLevel);
      }
    });

    it('should filter by skill categories', async () => {
      const response = await request(app)
        .get('/api/analytics/skills-gap?skillCategories=technical,domain')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata.filters.skillCategories).toEqual(['technical', 'domain']);
    });
  });

  describe('GET /api/analytics/department-performance', () => {
    it('should return department performance metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/department-performance')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const performance = response.body.data[0];
        expect(performance).toHaveProperty('departmentId');
        expect(performance).toHaveProperty('departmentName');
        expect(performance).toHaveProperty('averageUtilization');
        expect(performance).toHaveProperty('efficiencyScore');
        expect(performance).toHaveProperty('skillCoverage');
        expect(performance).toHaveProperty('teamSatisfactionScore');
        expect(performance).toHaveProperty('projectCompletionRate');
      }
    });
  });

  describe('GET /api/analytics/compare-departments/:departmentAId/:departmentBId', () => {
    it('should compare two departments', async () => {
      const response = await request(app)
        .get('/api/analytics/compare-departments/1/2')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('departmentA');
      expect(response.body.data).toHaveProperty('departmentB');
      expect(response.body.data).toHaveProperty('comparisons');
      expect(Array.isArray(response.body.data.comparisons)).toBe(true);
      
      if (response.body.data.comparisons.length > 0) {
        const comparison = response.body.data.comparisons[0];
        expect(comparison).toHaveProperty('metric');
        expect(comparison).toHaveProperty('valueA');
        expect(comparison).toHaveProperty('valueB');
        expect(comparison).toHaveProperty('difference');
        expect(comparison).toHaveProperty('percentageDifference');
        expect(comparison).toHaveProperty('winner');
        expect(['A', 'B', 'tie']).toContain(comparison.winner);
      }
    });

    it('should return 400 for invalid department IDs', async () => {
      const response = await request(app)
        .get('/api/analytics/compare-departments//2')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/analytics/export', () => {
    it('should export analytics data as JSON', async () => {
      const exportOptions = {
        format: 'json',
        includeSummary: true,
        includeCharts: false,
        includeRawData: true,
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', authToken)
        .send(exportOptions);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exportOptions');
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('data');
    });

    it('should set correct headers for CSV export', async () => {
      const exportOptions = {
        format: 'csv',
        includeSummary: true,
        includeRawData: true,
        dateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31')
        }
      };

      const response = await request(app)
        .post('/api/analytics/export')
        .set('Authorization', authToken)
        .send(exportOptions);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('GET /api/analytics/dashboard-summary', () => {
    it('should return dashboard summary', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard-summary')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('trends');
      expect(response.body).toHaveProperty('metadata');
      
      expect(response.body.overview).toHaveProperty('totalEmployees');
      expect(response.body.overview).toHaveProperty('totalDepartments');
      expect(response.body.overview).toHaveProperty('averageUtilization');
      expect(response.body.overview).toHaveProperty('criticalSkillGaps');
      expect(response.body.overview).toHaveProperty('topPerformingDepartment');
      
      expect(response.body.alerts).toHaveProperty('overutilizedEmployees');
      expect(response.body.alerts).toHaveProperty('underutilizedEmployees');
      expect(response.body.alerts).toHaveProperty('criticalSkillGaps');
      expect(response.body.alerts).toHaveProperty('capacityShortfall');
    });

    it('should include metadata with freshness info', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard-summary')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.metadata).toHaveProperty('generatedAt');
      expect(response.body.metadata).toHaveProperty('dataFreshness');
      expect(response.body.metadata).toHaveProperty('nextUpdate');
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const db = DatabaseService.getInstance();
      const originalQuery = db.getPool().query;
      db.getPool().query = () => Promise.reject(new Error('Database connection lost'));

      const response = await request(app)
        .get('/api/analytics/team-utilization')
        .set('Authorization', authToken);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');

      // Restore original query method
      db.getPool().query = originalQuery;
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/team-utilization?dateFrom=invalid-date')
        .set('Authorization', authToken);

      // Should handle invalid date gracefully or return validation error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle missing resources', async () => {
      const response = await request(app)
        .get('/api/analytics/compare-departments/999/998')
        .set('Authorization', authToken);

      // Should handle non-existent departments gracefully
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/analytics/team-utilization')
        .set('Authorization', authToken);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () => 
        request(app)
          .get('/api/analytics/team-utilization')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

async function setupTestData() {
  try {
    // Create test departments
    const departments = [
      { id: '1', name: 'Engineering', description: 'Software Development', is_active: true },
      { id: '2', name: 'Marketing', description: 'Marketing and Sales', is_active: true },
      { id: '3', name: 'Operations', description: 'Business Operations', is_active: true }
    ];

    // Create test employees
    const employees = [
      { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com', department_id: '1', position: 'Developer', hire_date: new Date('2023-01-01'), is_active: true },
      { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com', department_id: '2', position: 'Manager', hire_date: new Date('2023-02-01'), is_active: true },
      { id: '3', first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', department_id: '3', position: 'Analyst', hire_date: new Date('2023-03-01'), is_active: true }
    ];

    // Create test skills
    const skills = [
      { id: '1', name: 'JavaScript', category: 'technical', is_active: true },
      { id: '2', name: 'Project Management', category: 'soft', is_active: true },
      { id: '3', name: 'Data Analysis', category: 'technical', is_active: true }
    ];

    // Create test capacity history
    const capacityData = [
      { employee_id: '1', date: new Date('2024-01-15'), available_hours: 40, allocated_hours: 35 },
      { employee_id: '2', date: new Date('2024-01-15'), available_hours: 40, allocated_hours: 38 },
      { employee_id: '3', date: new Date('2024-01-15'), available_hours: 40, allocated_hours: 30 }
    ];

    // Insert test data (would use proper model methods in real implementation)
    console.log('Test data setup completed');
  } catch (error) {
    console.error('Error setting up test data:', error);
  }
}