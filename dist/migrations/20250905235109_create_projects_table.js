"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timestamp = exports.name = exports.migration = exports.CreateProjectsTableMigration = void 0;
class CreateProjectsTableMigration {
    async up(pool) {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        client_name VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'planning',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        budget DECIMAL(12,2),
        hourly_rate DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        
        -- Constraints
        CONSTRAINT chk_status CHECK (status IN ('planning', 'active', 'completed', 'on-hold')),
        CONSTRAINT chk_dates CHECK (end_date >= start_date),
        CONSTRAINT chk_budget CHECK (budget >= 0),
        CONSTRAINT chk_hourly_rate CHECK (hourly_rate >= 0)
      )
    `);
        await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)');
        await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        await pool.query(`
      DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
      CREATE TRIGGER update_projects_updated_at
        BEFORE UPDATE ON projects
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('✅ Projects table created successfully with indexes and triggers');
    }
    async down(pool) {
        await pool.query('DROP TRIGGER IF EXISTS update_projects_updated_at ON projects');
        await pool.query('DROP INDEX IF EXISTS idx_projects_created_at');
        await pool.query('DROP INDEX IF EXISTS idx_projects_dates');
        await pool.query('DROP INDEX IF EXISTS idx_projects_client');
        await pool.query('DROP INDEX IF EXISTS idx_projects_status');
        await pool.query('DROP TABLE IF EXISTS projects CASCADE');
        console.log('✅ Projects table dropped successfully');
    }
}
exports.CreateProjectsTableMigration = CreateProjectsTableMigration;
exports.migration = new CreateProjectsTableMigration();
exports.name = 'CreateProjectsTable';
exports.timestamp = '20250905235109';
//# sourceMappingURL=20250905235109_create_projects_table.js.map