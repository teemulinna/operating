import { Pool } from 'pg';

export async function up(pool: Pool): Promise<void> {
  // Create CRM systems table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_systems (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL CHECK (type IN ('jira', 'asana', 'trello', 'salesforce', 'hubspot', 'pipedrive', 'dynamics', 'custom')),
      api_url VARCHAR(500) NOT NULL,
      api_version VARCHAR(50),
      auth_type VARCHAR(50) NOT NULL CHECK (auth_type IN ('oauth', 'api-key', 'basic', 'bearer', 'token')),
      credentials JSONB NOT NULL DEFAULT '{}',
      sync_settings JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_sync_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create CRM sync operations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_sync_operations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crm_system_id UUID NOT NULL REFERENCES crm_systems(id) ON DELETE CASCADE,
      operation VARCHAR(50) NOT NULL CHECK (operation IN ('sync', 'import', 'export', 'validate', 'sync_projects')),
      direction VARCHAR(50) NOT NULL CHECK (direction IN ('bidirectional', 'to_crm', 'from_crm', 'to-crm', 'from-crm')),
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      progress JSONB NOT NULL DEFAULT '{"total": 0, "processed": 0, "successful": 0, "failed": 0, "skipped": 0}',
      results JSONB NOT NULL DEFAULT '{"created": 0, "updated": 0, "deleted": 0, "conflicts": 0, "errors": []}',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      duration INTEGER, -- milliseconds
      triggered_by VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create CRM sync conflicts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_sync_conflicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crm_system_id UUID NOT NULL REFERENCES crm_systems(id) ON DELETE CASCADE,
      record_id VARCHAR(255) NOT NULL,
      record_type VARCHAR(100) NOT NULL,
      field VARCHAR(255) NOT NULL,
      system_value JSONB,
      crm_value JSONB,
      last_modified_system TIMESTAMPTZ,
      last_modified_crm TIMESTAMPTZ,
      resolution VARCHAR(50) CHECK (resolution IN ('use-system', 'use-crm', 'merge', 'manual')),
      resolved_by VARCHAR(255),
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create webhook logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crm_system_id UUID NOT NULL REFERENCES crm_systems(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      processed BOOLEAN NOT NULL DEFAULT false,
      processed_at TIMESTAMPTZ,
      error_message TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add CRM-related columns to projects table if they don't exist
  await pool.query(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS crm_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS crm_system_id UUID REFERENCES crm_systems(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
    ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
  `);

  // Create indexes for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_crm_systems_type ON crm_systems(type);
    CREATE INDEX IF NOT EXISTS idx_crm_systems_active ON crm_systems(is_active);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_system_id ON crm_sync_operations(crm_system_id);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_status ON crm_sync_operations(status);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_created_at ON crm_sync_operations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_system_id ON crm_sync_conflicts(crm_system_id);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_resolution ON crm_sync_conflicts(resolution);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_system_id ON webhook_logs(crm_system_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
    CREATE INDEX IF NOT EXISTS idx_projects_crm_id ON projects(crm_id);
    CREATE INDEX IF NOT EXISTS idx_projects_crm_system_id ON projects(crm_system_id);
    CREATE INDEX IF NOT EXISTS idx_projects_sync_status ON projects(sync_status);
  `);

  console.log('✅ CRM tables and indexes created successfully');
}

export async function down(pool: Pool): Promise<void> {
  // Drop indexes
  await pool.query(`
    DROP INDEX IF EXISTS idx_projects_sync_status;
    DROP INDEX IF EXISTS idx_projects_crm_system_id;
    DROP INDEX IF EXISTS idx_projects_crm_id;
    DROP INDEX IF EXISTS idx_webhook_logs_processed;
    DROP INDEX IF EXISTS idx_webhook_logs_system_id;
    DROP INDEX IF EXISTS idx_crm_sync_conflicts_resolution;
    DROP INDEX IF EXISTS idx_crm_sync_conflicts_system_id;
    DROP INDEX IF EXISTS idx_crm_sync_operations_created_at;
    DROP INDEX IF EXISTS idx_crm_sync_operations_status;
    DROP INDEX IF EXISTS idx_crm_sync_operations_system_id;
    DROP INDEX IF EXISTS idx_crm_systems_active;
    DROP INDEX IF EXISTS idx_crm_systems_type;
  `);

  // Remove CRM columns from projects table
  await pool.query(`
    ALTER TABLE projects
    DROP COLUMN IF EXISTS last_sync_at,
    DROP COLUMN IF EXISTS sync_status,
    DROP COLUMN IF EXISTS crm_system_id,
    DROP COLUMN IF EXISTS crm_id;
  `);

  // Drop tables in reverse order of dependencies
  await pool.query('DROP TABLE IF EXISTS webhook_logs;');
  await pool.query('DROP TABLE IF EXISTS crm_sync_conflicts;');
  await pool.query('DROP TABLE IF EXISTS crm_sync_operations;');
  await pool.query('DROP TABLE IF EXISTS crm_systems;');

  console.log('✅ CRM tables dropped successfully');
}