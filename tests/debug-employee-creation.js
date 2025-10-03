#!/usr/bin/env node

const { Pool } = require('pg');
const { DatabaseService } = require('../dist/database/database.service');

async function testEmployeeCreation() {
  const dbService = new DatabaseService();
  await dbService.connect();
  const db = dbService.getPool();

  try {
    // First, check if departments table has any data
    const deptCheck = await db.query('SELECT id FROM departments LIMIT 1');
    console.log('Existing departments:', deptCheck.rows);

    let departmentId;
    if (deptCheck.rows.length === 0) {
      const deptResult = await db.query(
        `INSERT INTO departments (name, description, is_active)
         VALUES ('Test Department', 'Test department for integration tests', true)
         RETURNING id`
      );
      departmentId = deptResult.rows[0].id;
      console.log('Created department:', departmentId);
    } else {
      departmentId = deptCheck.rows[0].id;
      console.log('Using existing department:', departmentId);
    }

    // Check if test employee already exists
    const existingEmployee = await db.query(
      `SELECT id FROM employees WHERE email = 'test.availability@test.com' LIMIT 1`
    );
    console.log('Existing test employee:', existingEmployee.rows);

    if (existingEmployee.rows.length === 0) {
      // Create test employee
      const employeeResult = await db.query(
        `INSERT INTO employees (name, first_name, last_name, email, department_id, role, status)
         VALUES ('Test Employee', 'Test', 'Employee', 'test.availability@test.com', $1, 'Developer', 'active')
         RETURNING id`,
        [departmentId]
      );
      console.log('Created test employee:', employeeResult.rows[0].id);
    } else {
      console.log('Test employee already exists:', existingEmployee.rows[0].id);
    }

    // Verify the employee exists
    const verification = await db.query(
      `SELECT * FROM employees WHERE email = 'test.availability@test.com'`
    );
    console.log('\nEmployee verification:', verification.rows[0]);

    // Test creating a pattern with this employee ID
    const testEmployeeId = verification.rows[0].id;
    const patternResult = await db.query(
      `INSERT INTO availability_patterns
       (employee_id, pattern_type, name, start_date, end_date, is_active)
       VALUES ($1, 'weekly', 'Debug Test Pattern', '2025-01-01', '2025-12-31', false)
       RETURNING *`,
      [testEmployeeId]
    );
    console.log('\nCreated test pattern:', patternResult.rows[0]);

    // Clean up
    await db.query('DELETE FROM availability_patterns WHERE id = $1', [patternResult.rows[0].id]);
    console.log('Cleaned up test pattern');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

testEmployeeCreation();