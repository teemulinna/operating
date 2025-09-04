import request from 'supertest';
import app from '../../src/app';

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          user: {
            id: expect.any(String),
            email: userData.email,
            role: userData.role
          }
        }
      });
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('valid email')
      });
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('8 characters')
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const credentials = {
        email: 'admin@company.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          token: expect.any(String),
          user: {
            id: expect.any(String),
            email: credentials.email,
            role: 'admin'
          }
        }
      });
    });

    it('should reject login with invalid credentials', async () => {
      const credentials = {
        email: 'admin@company.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Incorrect')
      });
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Password is required')
      });
    });
  });
});