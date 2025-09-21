import { Pool } from 'pg';

export class CreateResourceAllocationsTableMigration {
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS resource_allocations (
        id SERIAL PRIMARY KEY,
        employee_id UUID NOT NULL,
        project_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        allocated_hours DECIMAL(6,2) DEFAULT 40,
        allocation_percentage INTEGER DEFAULT 100,
        actual_hours DECIMAL(6,2) DEFAULT NULL,
        role VARCHAR(255) NOT NULL DEFAULT 'Team Member',
        billable_rate DECIMAL(8,2),
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        utilization_target INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,

        -- Foreign key constraints
        CONSTRAINT fk_resource_allocations_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_resource_allocations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,

        -- Business logic constraints
        CONSTRAINT chk_resource_allocation_dates CHECK (end_date >= start_date),
        CONSTRAINT chk_resource_allocated_hours CHECK (allocated_hours >= 0),
        CONSTRAINT chk_resource_actual_hours CHECK (actual_hours IS NULL OR actual_hours >= 0),
        CONSTRAINT chk_resource_allocation_percentage CHECK (allocation_percentage > 0 AND allocation_percentage <= 200),
        CONSTRAINT chk_resource_status CHECK (status IN ('active', 'planned', 'completed', 'cancelled')),
        CONSTRAINT chk_resource_billable_rate CHECK (billable_rate IS NULL OR billable_rate >= 0)
      )
    `);

    // Create indexes for performance optimization
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee_id ON resource_allocations(employee_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resource_allocations_project_id ON resource_allocations(project_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resource_allocations_dates ON resource_allocations(start_date, end_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resource_allocations_status ON resource_allocations(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_resource_allocations_created_at ON resource_allocations(created_at)');

    // Composite index for overlap detection queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resource_allocations_employee_dates
      ON resource_allocations(employee_id, start_date, end_date)
      WHERE status IN ('active', 'planned')
    `);

    // Create trigger to automatically update updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_resource_allocations_updated_at ON resource_allocations;
      CREATE TRIGGER update_resource_allocations_updated_at
        BEFORE UPDATE ON resource_allocations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Resource allocations table created successfully with indexes and constraints');
  }

  async down(pool: Pool): Promise<void> {
    await pool.query('DROP TRIGGER IF EXISTS update_resource_allocations_updated_at ON resource_allocations');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_employee_dates');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_created_at');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_status');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_dates');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_project_id');
    await pool.query('DROP INDEX IF EXISTS idx_resource_allocations_employee_id');
    await pool.query('DROP TABLE IF EXISTS resource_allocations CASCADE');

    console.log('✅ Resource allocations table dropped successfully');
  }
}

export const migration = new CreateResourceAllocationsTableMigration();
export const name = 'CreateResourceAllocationsTable';
export const timestamp = '20250906002310';