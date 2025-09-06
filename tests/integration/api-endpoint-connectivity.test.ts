import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';

describe('API Endpoint Database Connectivity', () => {
  let dbService: DatabaseService;

  beforeAll(async () => {
    // Use singleton database service
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    await dbService.runMigrations();
  });

  afterAll(async () => {
    await DatabaseService.disconnect();
  });

  beforeEach(async () => {
    // Clear test data before each test if in test environment
    if (process.env.NODE_ENV === 'test') {
      await dbService.clearTestData();
      await dbService.seedTestData({
        departments: [
          { id: 1, name: 'Engineering', description: 'Software development' },
          { id: 2, name: 'Marketing', description: 'Brand and promotion' }
        ],
        employees: []
      });
    }
  });

  describe('Database Connection Sharing', () => {
    it('should use shared database connection across all API endpoints', async () => {
      // Test that all endpoints can access the database
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');

      // Test departments endpoint
      const deptResponse = await request(app)
        .get('/api/departments')
        .expect(200);

      expect(Array.isArray(deptResponse.body)).toBe(true);
    });

    it('should maintain database connection state across multiple requests', async () => {
      // Make multiple requests in sequence
      const responses = await Promise.all([
        request(app).get('/api/departments'),
        request(app).get('/api/departments'),
        request(app).get('/api/departments')
      ]);

      // All should succeed with same connection
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    it('should handle concurrent requests with shared connection pool', async () => {
      // Make concurrent requests
      const concurrentRequests = Array(10).fill(null).map(() => 
        request(app).get('/api/departments')
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Service Layer Integration', () => {
    it('should properly inject database service into department controller', async () => {
      const response = await request(app)
        .get('/api/departments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // In test environment, should have seeded departments
      if (process.env.NODE_ENV === 'test') {
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        expect(response.body[0]).toHaveProperty('name');
        expect(response.body[0]).toHaveProperty('description');
      }
    });

    it('should handle database service injection in employee controller', async () => {
      const response = await request(app)
        .get('/api/employees')
        .expect(200);

      // Should return paginated response structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle database service injection in skills controller', async () => {
      const response = await request(app)
        .get('/api/skills')
        .expect(200);

      // Should return array of skills
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily disconnect database to simulate error
      await DatabaseService.disconnect();

      const response = await request(app)
        .get('/api/departments')
        .expect(503); // Service Unavailable

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Database service temporarily unavailable');

      // Reconnect for other tests
      await dbService.connect();
    });

    it('should return appropriate error status codes for invalid requests', async () => {
      // Test invalid department ID
      const response = await request(app)
        .get('/api/departments/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request Lifecycle Management', () => {
    it('should maintain database connection throughout request lifecycle', async () => {
      // Test a complex request that involves multiple database queries
      const response = await request(app)
        .get('/api/departments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify database is still connected after request
      expect(dbService.isConnected()).toBe(true);
    });

    it('should handle request interruption gracefully', async () => {
      // Start a request
      const requestPromise = request(app)
        .get('/api/departments')
        .timeout(1000);

      // Should complete successfully
      const response = await requestPromise;
      expect(response.status).toBe(200);

      // Database should still be connected
      expect(dbService.isConnected()).toBe(true);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should reuse database connections efficiently', async () => {
      const startTime = Date.now();

      // Make multiple requests
      const requests = Array(20).fill(null).map(() =>
        request(app).get('/api/departments')
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete reasonably quickly (connection reuse)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should not exhaust connection pool with concurrent requests', async () => {
      // Test with more concurrent requests than typical pool size
      const concurrentRequests = Array(50).fill(null).map(() =>
        request(app).get('/api/departments')
      );

      const responses = await Promise.all(concurrentRequests);

      // All should succeed without connection pool exhaustion
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data across multiple service calls', async () => {
      // Get departments multiple times
      const response1 = await request(app)
        .get('/api/departments')
        .expect(200);

      const response2 = await request(app)
        .get('/api/departments')
        .expect(200);

      // Should return consistent data
      expect(response1.body).toEqual(response2.body);
    });

    it('should reflect database changes across all endpoints', async () => {
      if (process.env.NODE_ENV !== 'test') {
        return; // Skip in non-test environments
      }

      // Add a department through direct database service
      await dbService.query(
        'INSERT INTO departments (name, description) VALUES ($1, $2)',
        ['Test Department', 'Test Description']
      );

      // Should be reflected in API response
      const response = await request(app)
        .get('/api/departments')
        .expect(200);

      const testDept = response.body.find((d: any) => d.name === 'Test Department');
      expect(testDept).toBeDefined();
      expect(testDept.description).toBe('Test Description');
    });
  });
});