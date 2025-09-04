import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios from 'axios';
import { Pool } from 'pg';

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3001/api';

describe('API-Database Integration Tests', () => {
  let dbPool: Pool;
  let testEmployeeId: string;

  beforeAll(async () => {
    // Setup database connection
    dbPool = new Pool({
      user: process.env.TEST_DB_USER || 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      database: process.env.TEST_DB_NAME || 'employee_management_test',
      password: process.env.TEST_DB_PASSWORD || 'password',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
    });

    // Ensure clean test environment
    await dbPool.query('DELETE FROM employees WHERE email LIKE \'%test-integration%\'');
  });

  afterAll(async () => {
    // Cleanup test data
    if (dbPool) {
      await dbPool.query('DELETE FROM employees WHERE email LIKE \'%test-integration%\'');
      await dbPool.end();
    }
  });

  beforeEach(async () => {
    // Clean up any test employees before each test
    await dbPool.query('DELETE FROM employees WHERE email LIKE \'%test-integration%\'');
  });

  describe('Employee CRUD Operations', () => {
    it('should create employee via API and verify in database', async () => {
      const employeeData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe.test-integration@example.com',
        phoneNumber: '+1-555-0101',
        position: 'Software Engineer',
        department: 'Engineering',
        salary: 75000,
        hireDate: '2023-01-15',
        status: 'active'
      };

      // Create employee via API
      const response = await axios.post(`${API_BASE_URL}/employees`, employeeData);
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      
      testEmployeeId = response.data.id;

      // Verify employee exists in database
      const dbResult = await dbPool.query(
        'SELECT * FROM employees WHERE id = $1',
        [testEmployeeId]
      );
      
      expect(dbResult.rows).toHaveLength(1);
      const dbEmployee = dbResult.rows[0];
      
      expect(dbEmployee.first_name).toBe(employeeData.firstName);
      expect(dbEmployee.last_name).toBe(employeeData.lastName);
      expect(dbEmployee.email).toBe(employeeData.email);
      expect(dbEmployee.position).toBe(employeeData.position);
      expect(dbEmployee.department).toBe(employeeData.department);
      expect(parseInt(dbEmployee.salary)).toBe(employeeData.salary);
    });

    it('should retrieve employee via API and match database data', async () => {
      // First create employee directly in database
      const dbResult = await dbPool.query(`
        INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, ['Jane', 'Smith', 'jane.smith.test-integration@example.com', '+1-555-0102', 'Senior Developer', 'Engineering', 85000, '2023-02-15', 'active']);
      
      const employeeId = dbResult.rows[0].id;

      // Retrieve via API
      const response = await axios.get(`${API_BASE_URL}/employees/${employeeId}`);
      expect(response.status).toBe(200);
      
      const apiEmployee = response.data;
      expect(apiEmployee.id).toBe(employeeId);
      expect(apiEmployee.firstName).toBe('Jane');
      expect(apiEmployee.lastName).toBe('Smith');
      expect(apiEmployee.email).toBe('jane.smith.test-integration@example.com');
      expect(apiEmployee.position).toBe('Senior Developer');
    });

    it('should update employee via API and verify database changes', async () => {
      // Create employee in database
      const dbResult = await dbPool.query(`
        INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, ['Mike', 'Johnson', 'mike.johnson.test-integration@example.com', '+1-555-0103', 'Product Manager', 'Product', 90000, '2023-03-15', 'active']);
      
      const employeeId = dbResult.rows[0].id;

      // Update via API
      const updateData = {
        position: 'Senior Product Manager',
        salary: 95000,
        department: 'Product Management'
      };

      const response = await axios.put(`${API_BASE_URL}/employees/${employeeId}`, updateData);
      expect(response.status).toBe(200);

      // Verify database was updated
      const updatedResult = await dbPool.query(
        'SELECT position, salary, department FROM employees WHERE id = $1',
        [employeeId]
      );
      
      const updatedEmployee = updatedResult.rows[0];
      expect(updatedEmployee.position).toBe('Senior Product Manager');
      expect(parseInt(updatedEmployee.salary)).toBe(95000);
      expect(updatedEmployee.department).toBe('Product Management');
    });

    it('should delete employee via API and verify database removal', async () => {
      // Create employee in database
      const dbResult = await dbPool.query(`
        INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, ['Sarah', 'Wilson', 'sarah.wilson.test-integration@example.com', '+1-555-0104', 'Designer', 'Design', 70000, '2023-04-15', 'active']);
      
      const employeeId = dbResult.rows[0].id;

      // Delete via API
      const response = await axios.delete(`${API_BASE_URL}/employees/${employeeId}`);
      expect(response.status).toBe(204);

      // Verify employee is removed from database
      const checkResult = await dbPool.query(
        'SELECT * FROM employees WHERE id = $1',
        [employeeId]
      );
      
      expect(checkResult.rows).toHaveLength(0);
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(async () => {
      // Create test employees for search tests
      const employees = [
        ['Alice', 'Engineer', 'alice.engineer.test-integration@example.com', 'Engineering', 'Software Engineer'],
        ['Bob', 'Designer', 'bob.designer.test-integration@example.com', 'Design', 'UI Designer'],
        ['Charlie', 'Manager', 'charlie.manager.test-integration@example.com', 'Product', 'Product Manager'],
      ];

      for (const [firstName, lastName, email, department, position] of employees) {
        await dbPool.query(`
          INSERT INTO employees (first_name, last_name, email, phone_number, position, department, salary, hire_date, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [firstName, lastName, email, '+1-555-0000', position, department, 75000, '2023-01-01', 'active']);
      }
    });

    it('should search employees by name via API and match database results', async () => {
      // Search via API
      const response = await axios.get(`${API_BASE_URL}/employees?search=Alice`);
      expect(response.status).toBe(200);
      expect(response.data.employees).toHaveLength(1);
      expect(response.data.employees[0].firstName).toBe('Alice');

      // Verify same result from database
      const dbResult = await dbPool.query(
        "SELECT * FROM employees WHERE first_name ILIKE '%Alice%' OR last_name ILIKE '%Alice%'"
      );
      expect(dbResult.rows).toHaveLength(1);
    });

    it('should filter employees by department via API and match database results', async () => {
      // Filter via API
      const response = await axios.get(`${API_BASE_URL}/employees?department=Engineering`);
      expect(response.status).toBe(200);
      
      const engineeringEmployees = response.data.employees.filter(
        emp => emp.email.includes('test-integration')
      );
      expect(engineeringEmployees).toHaveLength(1);

      // Verify same result from database
      const dbResult = await dbPool.query(
        "SELECT * FROM employees WHERE department = 'Engineering' AND email LIKE '%test-integration%'"
      );
      expect(dbResult.rows).toHaveLength(1);
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should enforce email uniqueness constraint', async () => {
      const employeeData = {
        firstName: 'Duplicate',
        lastName: 'Email',
        email: 'duplicate.email.test-integration@example.com',
        phoneNumber: '+1-555-0105',
        position: 'Developer',
        department: 'Engineering',
        salary: 70000,
        hireDate: '2023-01-15',
        status: 'active'
      };

      // Create first employee
      await axios.post(`${API_BASE_URL}/employees`, employeeData);

      // Try to create second employee with same email
      try {
        await axios.post(`${API_BASE_URL}/employees`, employeeData);
        expect.fail('Should have thrown an error for duplicate email');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('error');
      }

      // Verify only one employee exists in database
      const dbResult = await dbPool.query(
        'SELECT * FROM employees WHERE email = $1',
        [employeeData.email]
      );
      expect(dbResult.rows).toHaveLength(1);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        firstName: 'Incomplete',
        // Missing required fields
      };

      try {
        await axios.post(`${API_BASE_URL}/employees`, incompleteData);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    it('should validate salary is positive number', async () => {
      const invalidSalaryData = {
        firstName: 'Invalid',
        lastName: 'Salary',
        email: 'invalid.salary.test-integration@example.com',
        phoneNumber: '+1-555-0106',
        position: 'Developer',
        department: 'Engineering',
        salary: -1000, // Invalid negative salary
        hireDate: '2023-01-15',
        status: 'active'
      };

      try {
        await axios.post(`${API_BASE_URL}/employees`, invalidSalaryData);
        expect.fail('Should have thrown validation error for negative salary');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });

  describe('Transaction Integrity', () => {
    it('should maintain data consistency during bulk operations', async () => {
      const employees = [
        { firstName: 'Bulk1', lastName: 'Test', email: 'bulk1.test-integration@example.com' },
        { firstName: 'Bulk2', lastName: 'Test', email: 'bulk2.test-integration@example.com' },
        { firstName: 'Bulk3', lastName: 'Test', email: 'bulk3.test-integration@example.com' },
      ];

      // Create multiple employees
      const promises = employees.map(emp => 
        axios.post(`${API_BASE_URL}/employees`, {
          ...emp,
          phoneNumber: '+1-555-0000',
          position: 'Test Position',
          department: 'Test Department',
          salary: 50000,
          hireDate: '2023-01-01',
          status: 'active'
        })
      );

      const responses = await Promise.all(promises);
      expect(responses.every(r => r.status === 201)).toBe(true);

      // Verify all employees exist in database
      const dbResult = await dbPool.query(
        "SELECT * FROM employees WHERE email LIKE '%bulk%.test-integration%'"
      );
      expect(dbResult.rows).toHaveLength(3);
    });
  });
});