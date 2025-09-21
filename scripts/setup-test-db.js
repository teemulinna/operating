
const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/employee_management_test'
  });

  try {
    // Add missing columns to employees table
    await pool.query(`
      ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS weekly_hours INTEGER DEFAULT 40
    `).catch(() => {});

    // Add missing columns to resource_allocations
    await pool.query(`
      ALTER TABLE resource_allocations
      ADD COLUMN IF NOT EXISTS planned_allocation_percentage INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS planned_hours_per_week DECIMAL(5,2) DEFAULT 0
    `).catch(() => {});

    // Create pipeline_projects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pipeline_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        stage VARCHAR(50) NOT NULL,
        probability INTEGER DEFAULT 50,
        expected_revenue DECIMAL(12,2) DEFAULT 0,
        expected_start_date DATE,
        expected_duration_months INTEGER DEFAULT 3,
        required_resources INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create capacity_bottlenecks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS capacity_bottlenecks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type VARCHAR(100),
        bottleneck_date DATE,
        severity VARCHAR(20),
        affected_projects TEXT[],
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create capacity_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS capacity_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id),
        week_start_date DATE,
        available_hours DECIMAL(5,2),
        allocated_hours DECIMAL(5,2),
        utilization_percentage DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created/updated successfully');
  } catch (error) {
    console.error('❌ Database setup error:', error.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();
