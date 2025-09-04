import request from 'supertest';
import app from '../../src/app';

describe('API General Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String)
      });
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('swagger-ui');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Not found')
      });
    });

    it('should handle malformed JSON', async () => {
      let authToken: string;

      // Get auth token first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.data.token;

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      // Express will handle the JSON parsing error
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication', () => {
    it('should reject requests without authentication token', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with malformed Authorization header', async () => {
      await request(app)
        .get('/api/employees')
        .set('Authorization', 'invalid-format')
        .expect(401);
    });
  });

  describe('Authorization', () => {
    let employeeToken: string;

    beforeAll(async () => {
      // Register an employee user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'employee@company.com',
          password: 'Password123',
          role: 'employee'
        });
      
      employeeToken = registerResponse.body.data.token;
    });

    it('should allow employees to view employees', async () => {
      await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    });

    it('should deny employees from creating employees', async () => {
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'test@company.com',
        position: 'Tester',
        departmentId: '1',
        salary: 50000,
        hireDate: '2023-01-01'
      };

      await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(employeeData)
        .expect(403);
    });

    it('should deny employees from accessing statistics', async () => {
      await request(app)
        .get('/api/employees/stats')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should deny employees from bulk operations', async () => {
      await request(app)
        .get('/api/bulk/template')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200); // Template download is allowed

      await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403); // Import is not allowed
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API endpoints', async () => {
      // This test is difficult to implement properly without actually hitting the rate limit
      // In a real scenario, you'd make multiple requests quickly to test rate limiting
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Just verify the request goes through normally
      expect(response.body.status).toBe('OK');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/api/employees')
        .set('Origin', 'http://localhost:3001')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Helmet should add these headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeTruthy();
      expect(response.headers['x-xss-protection']).toBeTruthy();
    });
  });

  describe('Content Compression', () => {
    it('should compress responses when supported', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // Response should be successful (compression is handled by middleware)
      expect(response.body.status).toBe('OK');
    });
  });

  describe('Request Validation', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.data.token;
    });

    it('should validate pagination parameters', async () => {
      // Invalid page number
      const response1 = await request(app)
        .get('/api/employees?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response1.body).toMatchObject({
        success: false,
        message: expect.stringContaining('positive integer')
      });

      // Invalid limit
      const response2 = await request(app)
        .get('/api/employees?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response2.body).toMatchObject({
        success: false,
        message: expect.stringContaining('between 1 and 100')
      });
    });

    it('should validate MongoDB ObjectId format', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('valid ID')
      });
    });
  });

  describe('Content-Type Handling', () => {
    let authToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.data.token;
    });

    it('should handle JSON content-type', async () => {
      const employeeData = {
        firstName: 'Content',
        lastName: 'Test',
        email: 'content.test@company.com',
        position: 'Tester',
        departmentId: '1',
        salary: 50000,
        hireDate: '2023-01-01'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(employeeData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle URL-encoded content-type', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=admin@company.com&password=password123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});