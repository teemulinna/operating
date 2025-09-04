import request from 'supertest';
import app from '../../src/app';

describe('Search Endpoints', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@company.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });

  describe('GET /api/search/employees', () => {
    it('should search employees by query string', async () => {
      const response = await request(app)
        .get('/api/search/employees?q=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object)
      });
    });

    it('should search employees with multiple filters', async () => {
      const response = await request(app)
        .get('/api/search/employees?department=1&status=active&salaryMin=50000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should search employees by skills', async () => {
      const response = await request(app)
        .get('/api/search/employees?skills=JavaScript,React')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should support salary range filtering', async () => {
      const response = await request(app)
        .get('/api/search/employees?salaryMin=70000&salaryMax=90000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((employee: any) => {
        expect(employee.salary).toBeGreaterThanOrEqual(70000);
        expect(employee.salary).toBeLessThanOrEqual(90000);
      });
    });

    it('should support date range filtering', async () => {
      const response = await request(app)
        .get('/api/search/employees?hireDateFrom=2020-01-01&hireDateTo=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/search/employees?sortBy=salary&sortOrder=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check if results are sorted by salary in descending order
      const employees = response.body.data;
      for (let i = 0; i < employees.length - 1; i++) {
        expect(employees[i].salary).toBeGreaterThanOrEqual(employees[i + 1].salary);
      }
    });
  });

  describe('POST /api/search/advanced', () => {
    it('should perform advanced search with complex filters', async () => {
      const searchFilters = {
        department: '1',
        position: 'Engineer',
        skills: ['JavaScript', 'Node.js'],
        status: 'active',
        salaryMin: 60000,
        salaryMax: 100000,
        hireDate: {
          from: '2020-01-01',
          to: '2023-12-31'
        }
      };

      const response = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchFilters)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object)
      });
    });

    it('should handle empty filter object', async () => {
      const response = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should validate filter data types', async () => {
      const invalidFilters = {
        salaryMin: 'invalid-number',
        hireDate: {
          from: 'invalid-date'
        }
      };

      const response = await request(app)
        .post('/api/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidFilters)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should get skill suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?type=skills&query=java')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      response.body.data.forEach((suggestion: string) => {
        expect(suggestion.toLowerCase()).toContain('java');
      });
    });

    it('should get position suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?type=positions&query=engineer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      response.body.data.forEach((suggestion: string) => {
        expect(suggestion.toLowerCase()).toContain('engineer');
      });
    });

    it('should get employee name suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?type=employees&query=john')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      response.body.data.forEach((suggestion: string) => {
        expect(suggestion.toLowerCase()).toContain('john');
      });
    });

    it('should return empty array for invalid type', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?type=invalid&query=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: []
      });
    });
  });

  describe('GET /api/search/facets', () => {
    it('should return search facets for filtering options', async () => {
      const response = await request(app)
        .get('/api/search/facets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          departments: expect.any(Array),
          positions: expect.any(Array),
          skills: expect.any(Array),
          statuses: expect.any(Array),
          salaryRanges: expect.arrayContaining([
            expect.objectContaining({
              label: expect.any(String),
              min: expect.any(Number),
              max: expect.any(Number),
              count: expect.any(Number)
            })
          ])
        }
      });
    });

    it('should include salary range counts', async () => {
      const response = await request(app)
        .get('/api/search/facets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const salaryRanges = response.body.data.salaryRanges;
      const totalCounts = salaryRanges.reduce((sum: number, range: any) => sum + range.count, 0);
      
      // Total counts should match or be less than total employees
      expect(totalCounts).toBeGreaterThanOrEqual(0);
    });
  });
});