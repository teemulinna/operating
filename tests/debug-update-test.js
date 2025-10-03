#!/usr/bin/env node

const request = require('supertest');
const { app } = require('../dist/app');
const { Pool } = require('pg');

async function debugUpdateTest() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/resource_management'
  });

  try {
    // First find an existing pattern
    const patternsResult = await db.query(
      `SELECT id, employee_id, pattern_name, is_active
       FROM availability_patterns
       LIMIT 1`
    );

    console.log('Existing patterns:', patternsResult.rows);

    if (patternsResult.rows.length === 0) {
      console.log('No patterns found in database!');
      // Create one for testing
      const deptResult = await db.query('SELECT id FROM departments LIMIT 1');
      const departmentId = deptResult.rows[0]?.id;

      const empResult = await db.query(
        `INSERT INTO employees (name, first_name, last_name, email, department_id, role, status)
         VALUES ('Debug Test', 'Debug', 'Test', 'debug.test@example.com', $1, 'Developer', 'active')
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
    }

    const patternId = patternsResult.rows[0]?.id || (await db.query('SELECT id FROM availability_patterns LIMIT 1')).rows[0].id;

    console.log('Testing update with pattern ID:', patternId);

    // Try the update
    const updates = {
      name: 'Updated Pattern Name',
      isActive: true,
      notes: 'Updated notes'
    };

    console.log('Sending update:', updates);

    const response = await request(app)
      .put(`/api/availability/patterns/${patternId}`)
      .send(updates);

    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(response.body, null, 2));

    if (response.status === 400) {
      console.log('VALIDATION ERROR DETAILS:', response.body);
    }

  } catch (error) {
    console.error('Error in debug test:', error);
  } finally {
    await db.end();
  }
}

debugUpdateTest();