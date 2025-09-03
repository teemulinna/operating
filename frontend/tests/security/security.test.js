const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../../src/models');

describe('Security Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user for authentication tests
    const hashedPassword = await bcrypt.hash('testPassword123!', 10);
    const user = await User.create({
      email: 'security.test@example.com',
      password: hashedPassword,
      firstName: 'Security',
      lastName: 'Test',
      role: 'admin'
    });
    userId = user.id;
    authToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup test data
    if (userId) {
      await User.destroy({ where: { id: userId } });
    }
  });

  describe('Authentication Security', () => {
    test('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/employees')
        .expect(401);
      
      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toBe('Invalid token.');
    });

    test('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: 999, email: 'test@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
      
      expect(response.body.error).toBe('Invalid token.');
    });

    test('should accept valid tokens', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Input Validation Security', () => {
    test('should reject SQL injection attempts', async () => {
      const maliciousEmail = "admin@test.com'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousEmail,
          password: 'password'
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
    });

    test('should reject XSS attempts in employee data', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: xssPayload,
          lastName: 'Test',
          email: 'xss.test@example.com',
          position: 'Developer',
          department: 'IT',
          salary: 50000
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
    });

    test('should enforce password complexity requirements', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'weak.password@example.com',
          password: '123', // Weak password
          firstName: 'Test',
          lastName: 'User'
        })
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some(err => 
        err.field === 'password'
      )).toBe(true);
    });
  });

  describe('Authorization Security', () => {
    test('should enforce role-based access control', async () => {
      // Create regular user token
      const regularUserToken = jwt.sign(
        { userId: 999, email: 'regular@example.com', role: 'employee' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .delete('/api/employees/1')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);
      
      expect(response.body.error).toBe('Access denied. Insufficient permissions.');
    });

    test('should allow admin access to restricted endpoints', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Rate Limiting Security', () => {
    test('should implement rate limiting on login endpoint', async () => {
      const loginAttempts = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // Should have at least one 429 Too Many Requests response
      const rateLimited = responses.some(response => response.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Data Protection', () => {
    test('should not expose sensitive data in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(400);
      
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('hash');
      expect(response.body.error).not.toContain('database');
    });

    test('should hash passwords properly', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'password.test@example.com',
          password: 'SecurePassword123!',
          firstName: 'Password',
          lastName: 'Test'
        })
        .expect(201);

      const user = await User.findOne({ 
        where: { email: 'password.test@example.com' } 
      });
      
      expect(user.password).not.toBe('SecurePassword123!');
      expect(user.password.startsWith('$2b$')).toBe(true);
      
      // Cleanup
      await User.destroy({ where: { id: user.id } });
    });
  });

  describe('Headers Security', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});