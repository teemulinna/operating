import { Pool } from 'pg';

export class CreateAllocationsTableMigration {
  async up(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS allocations (
        id SERIAL PRIMARY KEY,
        employee_id UUID NOT NULL,
        project_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        allocated_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
        actual_hours DECIMAL(6,2) DEFAULT NULL,
        role VARCHAR(255) NOT NULL DEFAULT 'Team Member',
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'tentative',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID,
        
        -- Foreign key constraints
        CONSTRAINT fk_allocations_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        CONSTRAINT fk_allocations_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        
        -- Business logic constraints
        CONSTRAINT chk_allocation_dates CHECK (end_date >= start_date),
        CONSTRAINT chk_allocated_hours CHECK (allocated_hours >= 0),
        CONSTRAINT chk_actual_hours CHECK (actual_hours IS NULL OR actual_hours >= 0),
        CONSTRAINT chk_status CHECK (status IN ('tentative', 'confirmed', 'completed', 'cancelled'))
      )
    `);

    // Create indexes for performance optimization
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allocations_employee_id ON allocations(employee_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allocations_project_id ON allocations(project_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allocations_dates ON allocations(start_date, end_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_allocations_created_at ON allocations(created_at)');
    
    // Composite index for overlap detection queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_allocations_employee_dates 
      ON allocations(employee_id, start_date, end_date) 
      WHERE status IN ('tentative', 'confirmed')
    `);

    // Create trigger to automatically update updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_allocations_updated_at ON allocations;
      CREATE TRIGGER update_allocations_updated_at
        BEFORE UPDATE ON allocations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create function to check for allocation overlaps
    await pool.query(`
      CREATE OR REPLACE FUNCTION check_allocation_overlap(
        p_employee_id UUID,
        p_start_date DATE,
        p_end_date DATE,
        p_allocation_id UUID DEFAULT NULL
      )
      RETURNS TABLE(
        overlapping_allocation_id UUID,
        overlapping_project_name VARCHAR(255),
        overlapping_start_date DATE,
        overlapping_end_date DATE,
        overlapping_allocated_hours DECIMAL(6,2)
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          a.id,
          p.name,
          a.start_date,
          a.end_date,
          a.allocated_hours
        FROM allocations a
        JOIN projects p ON a.project_id = p.id
        WHERE a.employee_id = p_employee_id
          AND a.status IN ('tentative', 'confirmed')
          AND (p_allocation_id IS NULL OR a.id != p_allocation_id)
          AND (
            (a.start_date <= p_start_date AND a.end_date >= p_start_date) OR
            (a.start_date <= p_end_date AND a.end_date >= p_end_date) OR
            (a.start_date >= p_start_date AND a.end_date <= p_end_date)
          );
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Allocations table created successfully with indexes, constraints, and overlap detection function');
  }

  async down(pool: Pool): Promise<void> {
    await pool.query('DROP FUNCTION IF EXISTS check_allocation_overlap');
    await pool.query('DROP TRIGGER IF EXISTS update_allocations_updated_at ON allocations');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_employee_dates');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_created_at');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_status');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_dates');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_project_id');
    await pool.query('DROP INDEX IF EXISTS idx_allocations_employee_id');
    await pool.query('DROP TABLE IF EXISTS allocations CASCADE');
    
    console.log('✅ Allocations table dropped successfully');
  }
}

export const migration = new CreateAllocationsTableMigration();
export const name = 'CreateAllocationsTable';
export const timestamp = '20250906002309';