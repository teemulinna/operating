import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { Pool } from 'pg';
import app from '../src/app';
import { DatabaseService } from '../src/database/database.service';

describe('Employee Weekly Capacity Feature', () => {
  let pool: Pool;
  let testEmployeeId: string;
  let testDepartmentId: string;

  beforeAll(async () => {
    // Connect to test database
    const dbService = DatabaseService.getInstance();
    pool = dbService.getPool();

    // Create test department
    const deptResult = await pool.query(
      `INSERT INTO departments (name, description)
       VALUES ($1, $2)
       RETURNING id`,
      ['Test Department', 'Department for testing weekly capacity']
    );
    testDepartmentId = deptResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testEmployeeId) {
      await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
    }
    await pool.query('DELETE FROM departments WHERE id = $1', [testDepartmentId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up any test employees from previous tests
    if (testEmployeeId) {
      await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);
      testEmployeeId = '';
    }
  });

  describe('Database Schema', () => {
    it('should have weekly_capacity column in employees table', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'employees' AND column_name = 'weekly_capacity'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].column_name).toBe('weekly_capacity');
      expect(result.rows[0].data_type).toBe('numeric');
      expect(result.rows[0].column_default).toContain('40');
    });

    it('should enforce weekly_capacity constraints (0-168 hours)', async () => {
      // Test negative value
      await expect(pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
        ['Test', 'User', 'test1@example.com', testDepartmentId, 'Developer', -1]
      )).rejects.toThrow();

      // Test value over 168 hours (max hours in a week)
      await expect(pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
        ['Test', 'User', 'test2@example.com', testDepartmentId, 'Developer', 169]
      )).rejects.toThrow();
    });
  });

  describe('POST /api/employees', () => {
    it('should create employee with specified weekly_capacity', async () => {
      const newEmployee = {
        firstName: 'John',
        lastName: 'Capacity',
        email: 'john.capacity@example.com',
        position: 'Part-Time Developer',
        departmentId: testDepartmentId,
        weeklyCapacity: 20,
        salary: 50000
      };

      const response = await request(app)
        .post('/api/employees')
        .send(newEmployee)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.weeklyCapacity).toBe(20);
      testEmployeeId = response.body.id;

      // Verify in database
      const dbResult = await pool.query(
        'SELECT weekly_capacity FROM employees WHERE id = $1',
        [testEmployeeId]
      );
      expect(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(20);
    });

    it('should use default 40 hours when weekly_capacity not specified', async () => {
      const newEmployee = {
        firstName: 'Jane',
        lastName: 'Default',
        email: 'jane.default@example.com',
        position: 'Full-Time Developer',
        departmentId: testDepartmentId,
        salary: 60000
        // weeklyCapacity not specified
      };

      const response = await request(app)
        .post('/api/employees')
        .send(newEmployee)
        .expect(201);

      expect(response.body.weeklyCapacity).toBe(40);
      testEmployeeId = response.body.id;

      // Verify in database
      const dbResult = await pool.query(
        'SELECT weekly_capacity FROM employees WHERE id = $1',
        [testEmployeeId]
      );
      expect(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(40);
    });

    it('should reject invalid weekly_capacity values', async () => {
      const invalidEmployee = {
        firstName: 'Invalid',
        lastName: 'Hours',
        email: 'invalid@example.com',
        position: 'Developer',
        departmentId: testDepartmentId,
        weeklyCapacity: 200, // Invalid: more than 168 hours
        salary: 60000
      };

      const response = await request(app)
        .post('/api/employees')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('weekly_capacity');
    });
  });

  describe('PUT /api/employees/:id', () => {
    beforeEach(async () => {
      // Create test employee
      const result = await pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`,
        ['Update', 'Test', 'update.test@example.com', testDepartmentId, 'Developer', 40, 60000]
      );
      testEmployeeId = result.rows[0].id;
    });

    it('should update employee weekly_capacity', async () => {
      const updateData = {
        firstName: 'Update',
        lastName: 'Test',
        email: 'update.test@example.com',
        position: 'Part-Time Developer',
        departmentId: testDepartmentId,
        weeklyCapacity: 25,
        salary: 60000
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.weeklyCapacity).toBe(25);

      // Verify in database
      const dbResult = await pool.query(
        'SELECT weekly_capacity FROM employees WHERE id = $1',
        [testEmployeeId]
      );
      expect(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(25);
    });

    it('should maintain weekly_capacity when not included in update', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Test',
        email: 'update.test@example.com',
        position: 'Senior Developer',
        departmentId: testDepartmentId,
        salary: 70000
        // weeklyCapacity not included
      };

      const response = await request(app)
        .put(`/api/employees/${testEmployeeId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.weeklyCapacity).toBe(40);

      // Verify in database
      const dbResult = await pool.query(
        'SELECT weekly_capacity FROM employees WHERE id = $1',
        [testEmployeeId]
      );
      expect(parseFloat(dbResult.rows[0].weekly_capacity)).toBe(40);
    });
  });

  describe('GET /api/employees', () => {
    beforeEach(async () => {
      // Create test employees with different capacities
      const result1 = await pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`,
        ['Part', 'Timer', 'part.timer@example.com', testDepartmentId, 'Developer', 20, 40000]
      );

      const result2 = await pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`,
        ['Full', 'Timer', 'full.timer@example.com', testDepartmentId, 'Developer', 40, 60000]
      );

      testEmployeeId = result1.rows[0].id; // For cleanup
    });

    it('should return weekly_capacity in employee list', async () => {
      const response = await request(app)
        .get('/api/employees')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);

      const partTimer = response.body.data.find((e: any) => e.email === 'part.timer@example.com');
      const fullTimer = response.body.data.find((e: any) => e.email === 'full.timer@example.com');

      expect(partTimer).toBeDefined();
      expect(partTimer.weeklyCapacity).toBe(20);

      expect(fullTimer).toBeDefined();
      expect(fullTimer.weeklyCapacity).toBe(40);
    });
  });

  describe('GET /api/employees/:id', () => {
    beforeEach(async () => {
      const result = await pool.query(
        `INSERT INTO employees (first_name, last_name, email, department_id, position, weekly_capacity, salary, hire_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         RETURNING id`,
        ['Single', 'Employee', 'single@example.com', testDepartmentId, 'Developer', 30, 55000]
      );
      testEmployeeId = result.rows[0].id;
    });

    it('should return weekly_capacity for single employee', async () => {
      const response = await request(app)
        .get(`/api/employees/${testEmployeeId}`)
        .expect(200);

      expect(response.body.weeklyCapacity).toBe(30);
      expect(response.body.email).toBe('single@example.com');
    });
  });

  describe('Capacity Validation', () => {
    it('should validate weekly_capacity is between 0 and 168', async () => {
      // Test valid part-time hours
      const partTimeEmployee = {
        firstName: 'Part',
        lastName: 'Time',
        email: 'parttime@example.com',
        position: 'Part-Time Developer',
        departmentId: testDepartmentId,
        weeklyCapacity: 15,
        salary: 30000
      };

      const response1 = await request(app)
        .post('/api/employees')
        .send(partTimeEmployee)
        .expect(201);

      expect(response1.body.weeklyCapacity).toBe(15);
      testEmployeeId = response1.body.id;

      // Test maximum valid hours
      await pool.query('DELETE FROM employees WHERE id = $1', [testEmployeeId]);

      const maxHoursEmployee = {
        firstName: 'Max',
        lastName: 'Hours',
        email: 'maxhours@example.com',
        position: 'Workaholic Developer',
        departmentId: testDepartmentId,
        weeklyCapacity: 168,
        salary: 100000
      };

      const response2 = await request(app)
        .post('/api/employees')
        .send(maxHoursEmployee)
        .expect(201);

      expect(response2.body.weeklyCapacity).toBe(168);
      testEmployeeId = response2.body.id;
    });
  });
});