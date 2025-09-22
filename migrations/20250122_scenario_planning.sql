-- ============================================
-- SCENARIO PLANNING TABLES
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('project', 'resource', 'capacity', 'mixed')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived', 'applied')),
  baseline_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{
    "projectChanges": [],
    "resourceChanges": [],
    "capacityAdjustments": [],
    "constraints": {}
  }'::jsonb,
  assumptions JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES employees(id),
  approved_by UUID REFERENCES employees(id),
  applied_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT scenario_date_range CHECK (end_date >= start_date)
);

-- Scenario impact analysis table
CREATE TABLE IF NOT EXISTS scenario_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  impact_analysis JSONB NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_scenario_impact UNIQUE (scenario_id)
);

-- Scenario audit log table
CREATE TABLE IF NOT EXISTS scenario_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario comparisons table (stores comparison results)
CREATE TABLE IF NOT EXISTS scenario_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  scenario_ids UUID[] NOT NULL,
  comparison_result JSONB NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario templates table
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scenario snapshots table (for versioning)
CREATE TABLE IF NOT EXISTS scenario_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_scenario_version UNIQUE (scenario_id, version)
);

-- What-if analysis results table
CREATE TABLE IF NOT EXISTS whatif_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_scenario_id UUID REFERENCES scenarios(id),
  analysis_parameters JSONB NOT NULL,
  results JSONB NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
CREATE INDEX IF NOT EXISTS idx_scenarios_type ON scenarios(type);
CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_scenarios_dates ON scenarios(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_scenarios_applied ON scenarios(applied_at) WHERE applied_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scenario_impacts_scenario_id ON scenario_impacts(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_impacts_analyzed_at ON scenario_impacts(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_scenario_audit_log_scenario_id ON scenario_audit_log(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_audit_log_action ON scenario_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_scenario_comparisons_scenario_ids ON scenario_comparisons USING GIN(scenario_ids);
CREATE INDEX IF NOT EXISTS idx_scenario_templates_category ON scenario_templates(category);
CREATE INDEX IF NOT EXISTS idx_scenario_templates_public ON scenario_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_scenario_snapshots_scenario_id ON scenario_snapshots(scenario_id);
CREATE INDEX IF NOT EXISTS idx_whatif_analysis_expires ON whatif_analysis_results(expires_at);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_templates_updated_at
  BEFORE UPDATE ON scenario_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create snapshots on scenario update
CREATE OR REPLACE FUNCTION create_scenario_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Only create snapshot if significant fields changed
  IF OLD.parameters IS DISTINCT FROM NEW.parameters OR
     OLD.assumptions IS DISTINCT FROM NEW.assumptions OR
     OLD.start_date IS DISTINCT FROM NEW.start_date OR
     OLD.end_date IS DISTINCT FROM NEW.end_date THEN

    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM scenario_snapshots
    WHERE scenario_id = NEW.id;

    -- Create snapshot of old data
    INSERT INTO scenario_snapshots (scenario_id, version, snapshot_data, created_by)
    VALUES (
      NEW.id,
      next_version,
      jsonb_build_object(
        'name', OLD.name,
        'description', OLD.description,
        'type', OLD.type,
        'status', OLD.status,
        'baseline_date', OLD.baseline_date,
        'start_date', OLD.start_date,
        'end_date', OLD.end_date,
        'parameters', OLD.parameters,
        'assumptions', OLD.assumptions,
        'metadata', OLD.metadata,
        'updated_at', OLD.updated_at
      ),
      NEW.created_by
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_scenario_snapshot_trigger
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION create_scenario_snapshot();

-- Function to clean up expired what-if analyses
CREATE OR REPLACE FUNCTION cleanup_expired_whatif_analyses()
RETURNS void AS $$
BEGIN
  DELETE FROM whatif_analysis_results
  WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Sample scenario templates
INSERT INTO scenario_templates (name, description, category, template_data, is_public) VALUES
(
  'Quarterly Capacity Increase',
  'Template for planning quarterly capacity increases',
  'capacity',
  '{
    "type": "capacity",
    "parameters": {
      "capacityAdjustments": [{
        "adjustment": 160,
        "description": "Add 4 FTEs (160 hours/week)"
      }],
      "constraints": {
        "maxBudget": 200000,
        "minResourceUtilization": 70,
        "maxResourceUtilization": 90
      }
    },
    "assumptions": [{
      "description": "New hires will be productive within 2 weeks",
      "confidence": 80,
      "impact": "medium"
    }]
  }'::jsonb,
  true
),
(
  'Project Prioritization',
  'Template for re-prioritizing projects based on resource constraints',
  'project',
  '{
    "type": "project",
    "parameters": {
      "projectChanges": [],
      "constraints": {
        "maxResourceUtilization": 85,
        "requiredSkills": ["project_management", "development", "qa"]
      }
    },
    "assumptions": [{
      "description": "Projects can be delayed without major impact",
      "confidence": 70,
      "impact": "medium"
    }]
  }'::jsonb,
  true
),
(
  'Team Expansion',
  'Template for planning team expansion with new resources',
  'resource',
  '{
    "type": "resource",
    "parameters": {
      "resourceChanges": [{
        "action": "add",
        "details": {
          "role": "Developer",
          "weeklyCapacity": 40,
          "estimatedCost": 120000
        }
      }],
      "constraints": {
        "maxBudget": 500000,
        "requiredSkills": ["technical_skills"]
      }
    },
    "assumptions": [{
      "description": "Qualified candidates are available",
      "confidence": 75,
      "impact": "high"
    }]
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;