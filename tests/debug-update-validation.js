#!/usr/bin/env node

const request = require('supertest');
const { app } = require('../dist/app');
const { Pool } = require('pg');

async function debugUpdateValidation() {
  // Use the same database as the app
  const dbName = process.env.NODE_ENV === 'test' ? 'employee_test' : 'employee_management';
  const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || dbName,
    user: process.env.DB_USER || 'teemulinna',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    // First create or get a department
    let departmentId;
    const deptResult = await db.query('SELECT id FROM departments LIMIT 1');
    if (deptResult.rows.length === 0) {
      const createDept = await db.query(
        `INSERT INTO departments (name, description, created_at, updated_at)
         VALUES ('Engineering', 'Test Department', NOW(), NOW())
         RETURNING id`
      );
      departmentId = createDept.rows[0].id;
      console.log('Created test department:', departmentId);
    } else {
      departmentId = deptResult.rows[0].id;
    }

    const empResult = await db.query(
      `INSERT INTO employees (first_name, last_name, email, department_id, position, hire_date, is_active)
       VALUES ('Debug', 'Test', 'debug.test@example.com', $1, 'Developer', CURRENT_DATE, true)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
       RETURNING id`,
      [departmentId]
    );
    const employeeId = empResult.rows[0].id;

    const patternResult = await db.query(
      `INSERT INTO availability_patterns
       (employee_id, pattern_type, pattern_name, effective_from, effective_until, is_active)
       VALUES ($1, 'weekly', 'Debug Pattern', '2025-01-01', '2025-12-31', false)
       RETURNING id`,
      [employeeId]
    );

    const patternId = patternResult.rows[0].id;
    console.log('Created test pattern:', patternId);

    // Try different update payloads to see what causes 400
    const testCases = [
      {
        description: 'Test 1: Only name',
        payload: { name: 'Updated Pattern Name' }
      },
      {
        description: 'Test 2: name + isActive',
        payload: { name: 'Updated Pattern Name', isActive: true }
      },
      {
        description: 'Test 3: name + isActive + notes (test payload)',
        payload: { name: 'Updated Pattern Name', isActive: true, notes: 'Updated notes' }
      },
      {
        description: 'Test 4: Empty name string',
        payload: { name: '', isActive: true }
      },
      {
        description: 'Test 5: Just isActive',
        payload: { isActive: true }
      },
      {
        description: 'Test 6: patternName instead of name',
        payload: { patternName: 'Updated Pattern Name', isActive: true }
      }
    ];

    for (const testCase of testCases) {
      console.log('\n' + '='.repeat(50));
      console.log(testCase.description);
      console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

      const response = await request(app)
        .put(`/api/availability/patterns/${patternId}`)
        .send(testCase.payload);

      console.log('Response status:', response.status);
      if (response.status === 400) {
        console.log('ERROR DETAILS:', JSON.stringify(response.body, null, 2));
      } else {
        console.log('SUCCESS:', response.body.message);
      }
    }

    // Cleanup
    await db.query('DELETE FROM availability_patterns WHERE id = $1', [patternId]);
    await db.query('DELETE FROM employees WHERE id = $1', [employeeId]);

  } catch (error) {
    console.error('Error in debug test:', error);
  } finally {
    await db.end();
  }
}

debugUpdateValidation();