import request from 'supertest';
import app from '../../src/app';
import path from 'path';
import fs from 'fs';

describe('Bulk Operations Endpoints', () => {
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

  describe('GET /api/bulk/template', () => {
    it('should download CSV template', async () => {
      const response = await request(app)
        .get('/api/bulk/template')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('firstName,lastName,email');
    });
  });

  describe('POST /api/bulk/import', () => {
    it('should import employees from valid CSV', async () => {
      // Create a valid CSV content
      const csvContent = `firstName,lastName,email,position,departmentId,salary,hireDate,status
Alice,Johnson,alice.johnson@company.com,Developer,1,75000,2023-01-15,active
Bob,Wilson,bob.wilson@company.com,Designer,2,65000,2023-02-01,active`;

      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvContent), 'employees.csv')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          success: true,
          processed: 2,
          errors: []
        }
      });
    });

    it('should handle invalid CSV format', async () => {
      const invalidCsv = 'invalid,csv,content\nwithout,proper,headers';

      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
        .expect(207); // Multi-Status for partial errors

      expect(response.body).toMatchObject({
        success: false,
        data: {
          success: false,
          processed: 0,
          errors: expect.any(Array)
        }
      });
    });

    it('should reject non-CSV files', async () => {
      const textContent = 'This is not a CSV file';

      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(textContent), 'test.txt')
        .expect(500); // Multer error for file type

      // Response will be a multer error, not our standard format
    });

    it('should require file upload', async () => {
      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('upload a CSV file')
      });
    });

    it('should handle CSV with missing required fields', async () => {
      const csvWithMissingFields = `firstName,lastName,email
John,Doe,john@company.com
Jane,Smith,`;

      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvWithMissingFields), 'missing-fields.csv')
        .expect(207);

      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    it('should handle duplicate emails in import', async () => {
      const csvWithDuplicates = `firstName,lastName,email,position,departmentId,salary,hireDate,status
John,Duplicate,john.doe@company.com,Developer,1,75000,2023-01-15,active`;

      const response = await request(app)
        .post('/api/bulk/import')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvWithDuplicates), 'duplicates.csv')
        .expect(207);

      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('already exists')
          })
        ])
      );
    });
  });

  describe('GET /api/bulk/export', () => {
    it('should export all employees to CSV', async () => {
      const response = await request(app)
        .get('/api/bulk/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('firstName,lastName,email');
    });

    it('should export employees with department filter', async () => {
      const response = await request(app)
        .get('/api/bulk/export?department=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should export employees with status filter', async () => {
      const response = await request(app)
        .get('/api/bulk/export?status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should reject unsupported format', async () => {
      const response = await request(app)
        .get('/api/bulk/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('CSV format')
      });
    });
  });

  describe('PUT /api/bulk/update', () => {
    it('should bulk update employees', async () => {
      const updateData = {
        employeeIds: ['1'],
        updates: {
          status: 'inactive',
          salary: 85000
        }
      };

      const response = await request(app)
        .put('/api/bulk/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          success: true,
          processed: 1,
          errors: []
        }
      });
    });

    it('should handle non-existent employee IDs', async () => {
      const updateData = {
        employeeIds: ['999', '998'],
        updates: {
          status: 'inactive'
        }
      };

      const response = await request(app)
        .put('/api/bulk/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(207);

      expect(response.body.data.errors.length).toBe(2);
    });

    it('should require employee IDs array', async () => {
      const updateData = {
        updates: {
          status: 'inactive'
        }
      };

      const response = await request(app)
        .put('/api/bulk/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Employee IDs')
      });
    });

    it('should require updates object', async () => {
      const updateData = {
        employeeIds: ['1']
      };

      const response = await request(app)
        .put('/api/bulk/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Updates must be an object')
      });
    });

    it('should reject empty employee IDs array', async () => {
      const updateData = {
        employeeIds: [],
        updates: {
          status: 'inactive'
        }
      };

      const response = await request(app)
        .put('/api/bulk/update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });
  });

  describe('DELETE /api/bulk/delete', () => {
    it('should bulk delete employees', async () => {
      const deleteData = {
        employeeIds: ['1']
      };

      const response = await request(app)
        .delete('/api/bulk/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deleteData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          success: true,
          processed: 1,
          errors: []
        }
      });
    });

    it('should handle non-existent employee IDs in deletion', async () => {
      const deleteData = {
        employeeIds: ['999', '998']
      };

      const response = await request(app)
        .delete('/api/bulk/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deleteData)
        .expect(207);

      expect(response.body.data.errors.length).toBe(2);
    });

    it('should require employee IDs array for deletion', async () => {
      const response = await request(app)
        .delete('/api/bulk/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Employee IDs')
      });
    });
  });
});