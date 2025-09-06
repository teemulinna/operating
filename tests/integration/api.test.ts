import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseService } from '../../src/database/database.service';
import { testData } from '../fixtures/test-data';

describe('Employee Management API', () => {
  let dbService: DatabaseService;

  beforeAll(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.connect();
    await dbService.runMigrations();
  });

  beforeEach(async () => {
    await dbService.clearTestData();
    await dbService.seedTestData(testData);
  });

  afterAll(async () => {
    await dbService.disconnect();
  });

  describe('POST /api/employees', () => {
    it('should create a new employee with valid data', async () => {
      const newEmployee = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        position: 'Software Engineer',
        departmentId: 1,
        salary: 75000,
        skills: ['JavaScript', 'TypeScript', 'React']
      };

      const response = await request(app)
        .post('/api/employees')
        .send(newEmployee)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        position: 'Software Engineer',
        departmentId: 1,
        salary: 75000,
        skills: ['JavaScript', 'TypeScript', 'React']
      });
    });

    it('should validate required fields', async () => {
      const invalidEmployee = {
        firstName: 'John'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/employees')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidEmployee = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        position: 'Engineer',
        departmentId: 1,
        salary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body.error).toContain('email');
    });

    it('should prevent duplicate email addresses', async () => {
      const employee = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'existing@company.com', // This email exists in test data
        position: 'Designer',
        departmentId: 2,
        salary: 60000
      };

      await request(app)
        .post('/api/employees')
        .send(employee)
        .expect(409);
    });
  });

  describe('GET /api/employees', () => {
    it('should return all employees with pagination', async () => {
      const response = await request(app)
        .get('/api/employees?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        currentPage: 1,
        totalPages: expect.any(Number),
        totalItems: expect.any(Number),
        limit: 10
      });
    });

    it('should filter employees by department', async () => {
      const response = await request(app)
        .get('/api/employees?departmentId=1')
        .expect(200);

      expect(response.body.data.every((emp: any) => emp.departmentId === 1)).toBe(true);
    });

    it('should search employees by name', async () => {
      const response = await request(app)
        .get('/api/employees?search=Alice')
        .expect(200);

      expect(response.body.data.some((emp: any) => 
        emp.firstName.includes('Alice') || emp.lastName.includes('Alice')
      )).toBe(true);
    });

    it('should filter employees by skills', async () => {
      const response = await request(app)
        .get('/api/employees?skills=JavaScript,React')
        .expect(200);

      expect(response.body.data.every((emp: any) => 
        emp.skills.includes('JavaScript') || emp.skills.includes('React')
      )).toBe(true);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return employee by ID', async () => {
      const response = await request(app)
        .get('/api/employees/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
    });

    it('should return 404 for non-existent employee', async () => {
      await request(app)
        .get('/api/employees/999')
        .expect(404);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        position: 'Senior Engineer',
        salary: 90000
      };

      const response = await request(app)
        .put('/api/employees/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
    });

    it('should return 404 for non-existent employee', async () => {
      await request(app)
        .put('/api/employees/999')
        .send({ firstName: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete employee', async () => {
      await request(app)
        .delete('/api/employees/1')
        .expect(204);

      await request(app)
        .get('/api/employees/1')
        .expect(404);
    });
  });

  describe('POST /api/employees/bulk-import', () => {
    it('should import employees from CSV', async () => {
      const csvContent = `firstName,lastName,email,position,departmentId,salary,skills
John,Doe,john@test.com,Engineer,1,75000,"JavaScript,React"
Jane,Smith,jane@test.com,Designer,2,65000,"Figma,Adobe"`;

      const response = await request(app)
        .post('/api/employees/bulk-import')
        .attach('file', Buffer.from(csvContent), 'employees.csv')
        .expect(200);

      expect(response.body.imported).toBe(2);
      expect(response.body.errors).toHaveLength(0);
    });

    it('should handle CSV parsing errors', async () => {
      const invalidCsv = 'invalid,csv,data';

      const response = await request(app)
        .post('/api/employees/bulk-import')
        .attach('file', Buffer.from(invalidCsv), 'invalid.csv')
        .expect(400);

      expect(response.body.error).toContain('CSV');
    });
  });

  describe('GET /api/employees/export', () => {
    it('should export employees as CSV', async () => {
      const response = await request(app)
        .get('/api/employees/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('employees.csv');
      expect(response.text).toContain('firstName,lastName,email');
    });
  });

  describe('Departments API', () => {
    describe('GET /api/departments', () => {
      it('should return all departments', async () => {
        const response = await request(app)
          .get('/api/departments')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
      });
    });

    describe('POST /api/departments', () => {
      it('should create a new department', async () => {
        const newDepartment = {
          name: 'New Department',
          description: 'A new department for testing'
        };

        const response = await request(app)
          .post('/api/departments')
          .send(newDepartment)
          .expect(201);

        expect(response.body).toMatchObject(newDepartment);
      });
    });
  });

  describe('Skills API', () => {
    describe('GET /api/skills', () => {
      it('should return all unique skills', async () => {
        const response = await request(app)
          .get('/api/skills')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body).toContain('JavaScript');
      });
    });

    describe('GET /api/skills/popular', () => {
      it('should return skills sorted by usage count', async () => {
        const response = await request(app)
          .get('/api/skills/popular')
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        expect(response.body[0]).toHaveProperty('skill');
        expect(response.body[0]).toHaveProperty('count');
      });
    });
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for protected endpoints', async () => {
      await request(app)
        .post('/api/employees')
        .send({})
        .expect(401);
    });

    it('should accept valid API key', async () => {
      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer valid-api-key')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle internal server errors', async () => {
      // Mock a database error
      jest.spyOn(dbService, 'query').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/employees')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});