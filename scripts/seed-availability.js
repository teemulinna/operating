#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'employee_management',
  user: 'teemulinna',
  password: ''
});

async function seedAvailabilityPatterns() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // First, get some employee IDs
    const employeesResult = await client.query(`
      SELECT id, first_name, last_name
      FROM employees
      LIMIT 5
    `);

    if (employeesResult.rows.length === 0) {
      console.log('No employees found. Creating test employees first...');

      // Create test employees
      const testEmployees = [
        ['John', 'Doe', 'john.doe@example.com', 'Senior Developer'],
        ['Jane', 'Smith', 'jane.smith@example.com', 'Project Manager'],
        ['Bob', 'Johnson', 'bob.johnson@example.com', 'Developer'],
        ['Alice', 'Williams', 'alice.williams@example.com', 'Designer'],
        ['Charlie', 'Brown', 'charlie.brown@example.com', 'Analyst']
      ];

      for (const [firstName, lastName, email, role] of testEmployees) {
        await client.query(`
          INSERT INTO employees (first_name, last_name, email, role, status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (email) DO NOTHING
        `, [firstName, lastName, email, role]);
      }

      const newEmployees = await client.query(`
        SELECT id, first_name, last_name
        FROM employees
        LIMIT 5
      `);
      employeesResult.rows = newEmployees.rows;
    }

    console.log(`Found ${employeesResult.rows.length} employees`);

    // Create availability patterns for each employee
    for (const employee of employeesResult.rows) {
      console.log(`Creating availability pattern for ${employee.first_name} ${employee.last_name}`);

      // Create weekly pattern
      await client.query(`
        INSERT INTO availability_patterns (
          employee_id,
          pattern_type,
          name,
          description,
          start_date,
          end_date,
          is_active,
          weekly_hours,
          metadata
        ) VALUES (
          $1,
          'weekly',
          'Standard Work Week',
          'Regular Monday-Friday schedule',
          '2024-01-01',
          '2024-12-31',
          true,
          $2,
          $3
        )
        ON CONFLICT (employee_id) WHERE is_active = true
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `, [
        employee.id,
        JSON.stringify({
          monday: 8,
          tuesday: 8,
          wednesday: 8,
          thursday: 8,
          friday: 8,
          saturday: 0,
          sunday: 0
        }),
        JSON.stringify({
          timezone: 'UTC',
          notes: 'Standard 40-hour work week'
        })
      ]);

      // Add some exceptions
      const exceptions = [
        {
          exception_date: '2024-07-04',
          exception_type: 'holiday',
          hours_affected: 8,
          reason: 'Independence Day',
          status: 'approved'
        },
        {
          exception_date: '2024-12-25',
          exception_type: 'holiday',
          hours_affected: 8,
          reason: 'Christmas',
          status: 'approved'
        },
        {
          exception_date: '2024-07-15',
          exception_type: 'leave',
          hours_affected: 8,
          reason: 'Vacation',
          status: 'approved'
        }
      ];

      for (const exception of exceptions) {
        await client.query(`
          INSERT INTO availability_exceptions (
            employee_id,
            exception_date,
            exception_type,
            hours_affected,
            reason,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT DO NOTHING
        `, [
          employee.id,
          exception.exception_date,
          exception.exception_type,
          exception.hours_affected,
          exception.reason,
          exception.status
        ]);
      }
    }

    // Add some holidays
    const holidays = [
      ['2024-01-01', 'New Year\'s Day'],
      ['2024-07-04', 'Independence Day'],
      ['2024-11-28', 'Thanksgiving'],
      ['2024-12-25', 'Christmas']
    ];

    for (const [date, name] of holidays) {
      await client.query(`
        INSERT INTO holidays (holiday_date, name, is_recurring)
        VALUES ($1, $2, false)
        ON CONFLICT DO NOTHING
      `, [date, name]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed data created successfully');

    // Show the data
    const patterns = await client.query(`
      SELECT
        ap.id,
        ap.name,
        ap.pattern_type,
        e.first_name || ' ' || e.last_name as employee_name,
        ap.start_date,
        ap.end_date,
        ap.is_active
      FROM availability_patterns ap
      JOIN employees e ON ap.employee_id = e.id
      ORDER BY ap.created_at DESC
    `);

    console.log('\n📊 Created patterns:');
    console.table(patterns.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAvailabilityPatterns().catch(console.error);