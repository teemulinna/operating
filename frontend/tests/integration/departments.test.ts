import request from 'supertest';
import app from '../../src/app';

describe('Department Endpoints', () => {
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

  describe('GET /api/departments', () => {
    it('should get all departments with authentication', async () => {
      const response = await request(app)
        .get('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: expect.any(Object)
      });
    });

    it('should support search filtering', async () => {
      const response = await request(app)
        .get('/api/departments?search=engineering')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should support location filtering', async () => {
      const response = await request(app)
        .get('/api/departments?location=New York')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/departments/:id', () => {
    it('should get department by valid ID', async () => {
      const response = await request(app)
        .get('/api/departments/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: '1',
          name: expect.any(String)
        }
      });
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .get('/api/departments/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('POST /api/departments', () => {
    const validDepartment = {
      name: 'Quality Assurance',
      description: 'Software testing and quality assurance team',
      budget: 400000,
      location: 'San Francisco'
    };

    it('should create department with valid data', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validDepartment)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          name: validDepartment.name,
          description: validDepartment.description,
          budget: validDepartment.budget,
          location: validDepartment.location
        },
        message: expect.stringContaining('created successfully')
      });
    });

    it('should reject department creation with missing name', async () => {
      const incompleteDepartment = {
        description: 'Test department'
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteDepartment)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('name is required')
      });
    });

    it('should reject duplicate department names', async () => {
      const duplicateDepartment = {
        name: 'Engineering' // Existing department
      };

      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateDepartment)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('already exists')
      });
    });
  });

  describe('PUT /api/departments/:id', () => {
    it('should update department with valid data', async () => {
      const updates = {
        name: 'Engineering Updated',
        budget: 600000
      };

      const response = await request(app)
        .put('/api/departments/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: '1',
          name: updates.name,
          budget: updates.budget
        },
        message: expect.stringContaining('updated successfully')
      });
    });

    it('should return 404 for non-existent department', async () => {
      const updates = { name: 'Test Department' };

      const response = await request(app)
        .put('/api/departments/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('should delete existing department', async () => {
      const response = await request(app)
        .delete('/api/departments/3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.stringContaining('deleted successfully')
      });
    });

    it('should return 404 for non-existent department', async () => {
      const response = await request(app)
        .delete('/api/departments/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('GET /api/departments/stats', () => {
    it('should return department statistics', async () => {
      const response = await request(app)
        .get('/api/departments/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          total: expect.any(Number),
          totalBudget: expect.any(Number),
          averageBudget: expect.any(Number),
          locationsCount: expect.any(Number),
          locations: expect.any(Object)
        }
      });
    });
  });
});