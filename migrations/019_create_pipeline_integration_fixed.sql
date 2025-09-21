-- Pipeline Integration Database Schema (Fixed)
-- This migration creates tables for CRM integration and pipeline management

-- CRM Systems Configuration
CREATE TABLE IF NOT EXISTS crm_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('salesforce', 'hubspot', 'pipedrive', 'dynamics', 'custom')),
    api_url TEXT NOT NULL,
    api_version VARCHAR(20),
    auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('oauth', 'api-key', 'basic', 'bearer')),
    credentials JSONB NOT NULL DEFAULT '{}',
    sync_settings JSONB NOT NULL DEFAULT '{
        "autoSync": false,
        "syncInterval": 60,
        "syncDirection": "bidirectional",
        "fieldMappings": [],
        "filters": {},
        "conflictResolution": "manual"
    }',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
);

-- Pipeline Projects (opportunities from CRM)
CREATE TABLE IF NOT EXISTS pipeline_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_id VARCHAR(100), -- External CRM record ID
    crm_source VARCHAR(50), -- Which CRM system this came from
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_name VARCHAR(200) NOT NULL,
    client_contact JSONB, -- { name, email, phone, title }
    stage VARCHAR(50) NOT NULL DEFAULT 'lead' 
        CHECK (stage IN ('lead', 'prospect', 'opportunity', 'proposal', 'negotiation', 'won', 'lost', 'on-hold')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    probability INTEGER NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    estimated_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    estimated_start_date DATE NOT NULL,
    estimated_duration INTEGER NOT NULL DEFAULT 30, -- days
    estimated_end_date DATE GENERATED ALWAYS AS (estimated_start_date + INTERVAL '1 day' * estimated_duration) STORED,
    weighted_value DECIMAL(15,2) GENERATED ALWAYS AS (estimated_value * probability / 100) STORED,
    required_skills JSONB NOT NULL DEFAULT '[]', -- array of skill names
    resource_demand JSONB NOT NULL DEFAULT '[]', -- array of resource demand objects
    competitor_info JSONB NOT NULL DEFAULT '[]', -- array of competitor objects
    risk_factors JSONB NOT NULL DEFAULT '[]', -- array of risk factor objects
    notes TEXT,
    tags JSONB NOT NULL DEFAULT '[]', -- array of tag strings
    resource_cost DECIMAL(15,2),
    availability_score DECIMAL(5,2),
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CRM Synchronization Operations
CREATE TABLE IF NOT EXISTS crm_sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_system_id UUID NOT NULL REFERENCES crm_systems(id) ON DELETE CASCADE,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('sync', 'import', 'export', 'validate')),
    direction VARCHAR(20) NOT NULL DEFAULT 'bidirectional' 
        CHECK (direction IN ('bidirectional', 'to-crm', 'from-crm')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress JSONB NOT NULL DEFAULT '{
        "total": 0,
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0
    }',
    results JSONB NOT NULL DEFAULT '{
        "created": 0,
        "updated": 0,
        "deleted": 0,
        "conflicts": 0,
        "errors": []
    }',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- milliseconds
    triggered_by VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CRM Synchronization Conflicts
CREATE TABLE IF NOT EXISTS crm_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_system_id UUID NOT NULL REFERENCES crm_systems(id) ON DELETE CASCADE,
    record_id VARCHAR(100) NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    field VARCHAR(100) NOT NULL,
    system_value JSONB,
    crm_value JSONB,
    last_modified_system TIMESTAMP WITH TIME ZONE,
    last_modified_crm TIMESTAMP WITH TIME ZONE,
    resolution VARCHAR(20) CHECK (resolution IN ('use-system', 'use-crm', 'merge', 'manual')),
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_crm 
    ON pipeline_projects(crm_id, crm_source);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_stage 
    ON pipeline_projects(stage);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_priority 
    ON pipeline_projects(priority);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_start_date 
    ON pipeline_projects(estimated_start_date);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_sync_status 
    ON pipeline_projects(sync_status);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_client_name 
    ON pipeline_projects(client_name);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_composite 
    ON pipeline_projects(stage, priority, estimated_start_date);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_value_probability 
    ON pipeline_projects(estimated_value, probability);

CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_system 
    ON crm_sync_operations(crm_system_id);

CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_status 
    ON crm_sync_operations(status);

CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_started 
    ON crm_sync_operations(started_at);

CREATE INDEX IF NOT EXISTS idx_crm_sync_operations_operation 
    ON crm_sync_operations(operation);

CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_system 
    ON crm_sync_conflicts(crm_system_id);

CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_record 
    ON crm_sync_conflicts(record_id, record_type);

CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_resolution 
    ON crm_sync_conflicts(resolution);

CREATE INDEX IF NOT EXISTS idx_crm_sync_conflicts_created 
    ON crm_sync_conflicts(created_at);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_crm_systems_updated_at 
    BEFORE UPDATE ON crm_systems 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_projects_updated_at 
    BEFORE UPDATE ON pipeline_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default CRM system templates for common systems
INSERT INTO crm_systems (name, type, api_url, auth_type, sync_settings, is_active) 
VALUES 
    (
        'Salesforce Template', 
        'salesforce', 
        'https://api.salesforce.com/services/data/v52.0', 
        'oauth',
        '{
            "autoSync": false,
            "syncInterval": 30,
            "syncDirection": "bidirectional",
            "fieldMappings": [
                {
                    "systemField": "name",
                    "crmField": "Name",
                    "dataType": "string",
                    "isRequired": true,
                    "direction": "bidirectional"
                },
                {
                    "systemField": "stage",
                    "crmField": "StageName",
                    "dataType": "string",
                    "isRequired": true,
                    "direction": "bidirectional"
                },
                {
                    "systemField": "estimatedValue",
                    "crmField": "Amount",
                    "dataType": "number",
                    "isRequired": false,
                    "direction": "bidirectional"
                }
            ],
            "filters": {},
            "conflictResolution": "timestamp"
        }',
        false
    ),
    (
        'HubSpot Template', 
        'hubspot', 
        'https://api.hubapi.com/crm/v3/objects/deals', 
        'api-key',
        '{
            "autoSync": false,
            "syncInterval": 60,
            "syncDirection": "bidirectional",
            "fieldMappings": [
                {
                    "systemField": "name",
                    "crmField": "dealname",
                    "dataType": "string",
                    "isRequired": true,
                    "direction": "bidirectional"
                }
            ],
            "filters": {},
            "conflictResolution": "manual"
        }',
        false
    )
ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE crm_systems IS 'Configuration for external CRM systems integration';
COMMENT ON TABLE pipeline_projects IS 'Sales pipeline projects/opportunities synced from CRM systems';
COMMENT ON TABLE crm_sync_operations IS 'History of synchronization operations with CRM systems';
COMMENT ON TABLE crm_sync_conflicts IS 'Data conflicts that occur during CRM synchronization';