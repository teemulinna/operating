-- Pipeline Integration Database Schema
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
    required_skills JSONB NOT NULL DEFAULT '[]', -- array of skill names
    risk_factors JSONB NOT NULL DEFAULT '[]', -- array of risk factor objects
    notes TEXT,
    tags JSONB NOT NULL DEFAULT '[]', -- array of tag strings
    sync_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (sync_status IN ('synced', 'pending', 'failed', 'conflict')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX(crm_id, crm_source),
    INDEX(stage),
    INDEX(priority),
    INDEX(estimated_start_date),
    INDEX(sync_status),
    INDEX(client_name)
);

-- Resource Demands for Pipeline Projects
CREATE TABLE IF NOT EXISTS pipeline_resource_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_project_id UUID NOT NULL REFERENCES pipeline_projects(id) ON DELETE CASCADE,
    skill_category VARCHAR(100) NOT NULL,
    experience_level VARCHAR(20) NOT NULL 
        CHECK (experience_level IN ('junior', 'intermediate', 'senior', 'expert')),
    required_count INTEGER NOT NULL DEFAULT 1,
    allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00 
        CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hourly_rate DECIMAL(8,2),
    is_critical BOOLEAN NOT NULL DEFAULT false,
    alternatives JSONB DEFAULT '[]', -- alternative skill categories
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date),
    INDEX(pipeline_project_id),
    INDEX(skill_category, experience_level),
    INDEX(start_date, end_date)
);

-- Competitor Information for Pipeline Projects
CREATE TABLE IF NOT EXISTS pipeline_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_project_id UUID NOT NULL REFERENCES pipeline_projects(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    estimated_price DECIMAL(15,2),
    likelihood VARCHAR(20) CHECK (likelihood IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX(pipeline_project_id)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX(crm_system_id),
    INDEX(status),
    INDEX(started_at),
    INDEX(operation)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX(crm_system_id),
    INDEX(record_id, record_type),
    INDEX(resolution),
    INDEX(created_at)
);

-- Pipeline Stage History (for analytics)
CREATE TABLE IF NOT EXISTS pipeline_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_project_id UUID NOT NULL REFERENCES pipeline_projects(id) ON DELETE CASCADE,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    probability_change INTEGER, -- difference in probability
    value_change DECIMAL(15,2), -- difference in estimated value
    notes TEXT,
    INDEX(pipeline_project_id),
    INDEX(to_stage),
    INDEX(changed_at)
);

-- Resource Availability Cache (for performance)
CREATE TABLE IF NOT EXISTS resource_availability_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_category VARCHAR(100) NOT NULL,
    experience_level VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_capacity_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    allocated_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    available_hours DECIMAL(10,2) NOT NULL DEFAULT 0,
    utilization_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_category, experience_level, period_start, period_end),
    INDEX(skill_category, experience_level),
    INDEX(period_start, period_end),
    INDEX(last_calculated)
);

-- Pipeline Integration with Scenario Planning
-- Links pipeline projects to scenario planning allocations
CREATE TABLE IF NOT EXISTS pipeline_scenario_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_project_id UUID NOT NULL REFERENCES pipeline_projects(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL, -- References scenarios table
    conversion_probability DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    resource_allocation_factor DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pipeline_project_id, scenario_id),
    INDEX(pipeline_project_id),
    INDEX(scenario_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipeline_projects_composite 
    ON pipeline_projects(stage, priority, estimated_start_date);

CREATE INDEX IF NOT EXISTS idx_pipeline_projects_value_probability 
    ON pipeline_projects(estimated_value, probability);

CREATE INDEX IF NOT EXISTS idx_resource_demands_date_range 
    ON pipeline_resource_demands(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_crm_operations_status_date 
    ON crm_sync_operations(status, started_at);

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

CREATE TRIGGER update_pipeline_scenario_links_updated_at 
    BEFORE UPDATE ON pipeline_scenario_links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for pipeline stage tracking
CREATE OR REPLACE FUNCTION track_pipeline_stage_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if stage actually changed
    IF OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO pipeline_stage_history (
            pipeline_project_id,
            from_stage,
            to_stage,
            probability_change,
            value_change,
            changed_by,
            notes
        ) VALUES (
            NEW.id,
            OLD.stage,
            NEW.stage,
            NEW.probability - OLD.probability,
            NEW.estimated_value - OLD.estimated_value,
            current_setting('app.current_user_id', true), -- Will be set by application
            CASE 
                WHEN NEW.stage = 'won' THEN 'Opportunity won'
                WHEN NEW.stage = 'lost' THEN 'Opportunity lost'
                ELSE 'Stage progression'
            END
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_pipeline_stage_changes_trigger
    AFTER UPDATE ON pipeline_projects
    FOR EACH ROW EXECUTE FUNCTION track_pipeline_stage_changes();

-- Create materialized view for pipeline analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS pipeline_analytics_summary AS
SELECT 
    DATE_TRUNC('month', pp.created_at) as period,
    pp.stage,
    pp.priority,
    COUNT(*) as project_count,
    SUM(pp.estimated_value) as total_value,
    SUM(pp.estimated_value * pp.probability / 100) as weighted_value,
    AVG(pp.probability) as avg_probability,
    AVG(pp.estimated_duration) as avg_duration,
    COUNT(DISTINCT pp.client_name) as unique_clients,
    SUM(CASE WHEN pp.sync_status = 'synced' THEN 1 ELSE 0 END) as synced_projects,
    SUM(CASE WHEN pp.sync_status = 'conflict' THEN 1 ELSE 0 END) as conflict_projects
FROM pipeline_projects pp
GROUP BY period, pp.stage, pp.priority;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_analytics_summary_unique
    ON pipeline_analytics_summary(period, stage, priority);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_pipeline_analytics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your role structure)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON FUNCTION refresh_pipeline_analytics() TO app_user;

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
                },
                {
                    "systemField": "probability",
                    "crmField": "Probability",
                    "dataType": "number",
                    "isRequired": false,
                    "direction": "bidirectional"
                },
                {
                    "systemField": "estimatedStartDate",
                    "crmField": "CloseDate",
                    "dataType": "date",
                    "isRequired": true,
                    "direction": "bidirectional"
                }
            ],
            "filters": {
                "stages": ["Prospecting", "Qualification", "Needs Analysis", "Value Proposition", "Decision Making", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost"]
            },
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
                },
                {
                    "systemField": "stage",
                    "crmField": "dealstage",
                    "dataType": "string",
                    "isRequired": true,
                    "direction": "bidirectional"
                },
                {
                    "systemField": "estimatedValue",
                    "crmField": "amount",
                    "dataType": "number",
                    "isRequired": false,
                    "direction": "bidirectional"
                }
            ],
            "filters": {},
            "conflictResolution": "manual"
        }',
        false
    )
ON CONFLICT (name) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE crm_systems IS 'Configuration for external CRM systems integration';
COMMENT ON TABLE pipeline_projects IS 'Sales pipeline projects/opportunities synced from CRM systems';
COMMENT ON TABLE pipeline_resource_demands IS 'Resource requirements for pipeline projects';
COMMENT ON TABLE crm_sync_operations IS 'History of synchronization operations with CRM systems';
COMMENT ON TABLE crm_sync_conflicts IS 'Data conflicts that occur during CRM synchronization';
COMMENT ON TABLE pipeline_stage_history IS 'Historical tracking of pipeline stage changes for analytics';
COMMENT ON TABLE pipeline_scenario_links IS 'Links pipeline projects to scenario planning for resource forecasting';
COMMENT ON MATERIALIZED VIEW pipeline_analytics_summary IS 'Pre-calculated analytics for pipeline reporting and dashboards';