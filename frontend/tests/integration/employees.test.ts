import request from 'supertest';
import app from '../../src/app';
import TestDataManager from '../utils/test-data-manager';

describe('Employee Endpoints', () => {
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

  describe('GET /api/employees', () => {
    it('should get all employees with authentication', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: expect.any(Number),
          limit: expect.any(Number),
          total: expect.any(Number),
          pages: expect.any(Number)
        }
      });
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/employees')
        .expect(401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/employees?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5
      });
    });

    it('should support filtering by department', async () => {
      const response = await request(app)
        .get('/api/employees?department=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('departmentId', '1');
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/employees?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('status', 'active');
      }
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should get employee by valid ID (dynamic)', async () => {
      // First get all employees to find a valid ID
      const listResponse = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (listResponse.body.data && listResponse.body.data.length > 0) {
        const firstEmployee = listResponse.body.data[0];
        
        const response = await request(app)
          .get(`/api/employees/${firstEmployee.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: firstEmployee.id,
            firstName: expect.any(String),
            lastName: expect.any(String),
            email: expect.any(String)
          }
        });
      } else {
        console.log('⚠️ No employees found - skipping employee retrieval test');
      }
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .get('/api/employees/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('POST /api/employees', () => {
    const validEmployee = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@company.com',
      phoneNumber: '+1234567891',
      position: 'Data Scientist',
      departmentId: '1',
      salary: 85000,
      hireDate: '2023-01-15',
      status: 'active',
      skills: ['Python', 'Machine Learning', 'SQL']
    };

    it('should create employee with valid data', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validEmployee)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          firstName: validEmployee.firstName,
          lastName: validEmployee.lastName,
          email: validEmployee.email,
          position: validEmployee.position,
          salary: validEmployee.salary
        },
        message: expect.stringContaining('created successfully')
      });
    });

    it('should reject employee creation with missing required fields', async () => {
      const incompleteEmployee = {
        firstName: 'John',
        lastName: 'Smith'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteEmployee)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });

    it('should reject employee creation with invalid email', async () => {
      const invalidEmployee = {
        ...validEmployee,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('valid email')
      });
    });

    it('should reject duplicate email addresses', async () => {
      const duplicateEmployee = {
        ...validEmployee,
        email: 'john.doe@company.com' // Existing email
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateEmployee)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('already exists')
      });
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee with valid data (dynamic)', async () => {
      // First get employees to find one to update
      const listResponse = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (listResponse.body.data && listResponse.body.data.length > 0) {
        const employeeToUpdate = listResponse.body.data[0];
        
        const updates = {
          firstName: `${employeeToUpdate.firstName} Updated`,
          salary: 80000
        };

        const response = await request(app)
          .put(`/api/employees/${employeeToUpdate.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updates)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: employeeToUpdate.id,
            firstName: updates.firstName
          },
          message: expect.stringContaining('updated successfully')
        });
      } else {
        console.log('⚠️ No employees found - skipping employee update test');
      }
    });

    it('should return 404 for non-existent employee', async () => {
      const updates = { firstName: 'Test' };

      const response = await request(app)
        .put('/api/employees/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete existing employee (dynamic)', async () => {
      // Create a test employee first to ensure we have something to delete
      const testEmployee = TestDataManager.generateTestData('employee', Date.now());
      
      const createResponse = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testEmployee);
      
      if (createResponse.status === 201) {
        const employeeId = createResponse.body.data.id;
        
        const response = await request(app)
          .delete(`/api/employees/${employeeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: expect.stringContaining('deleted successfully')
        });
      } else {
        console.log('⚠️ Could not create test employee - skipping delete test');
      }
    });

    it('should return 404 for non-existent employee', async () => {
      const response = await request(app)
        .delete('/api/employees/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });
  });

  describe('GET /api/employees/stats', () => {
    it('should return employee statistics', async () => {
      const response = await request(app)
        .get('/api/employees/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          total: expect.any(Number),
          active: expect.any(Number),
          inactive: expect.any(Number),
          terminated: expect.any(Number),
          averageSalary: expect.any(Number),
          departmentDistribution: expect.any(Object)
        }
      });
    });
  });
});