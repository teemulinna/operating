-- Migration: 019_bulk_operations_team_management.sql
-- Description: Create tables for bulk operations and team management features
-- Author: System Architect Agent  
-- Date: 2025-09-07

BEGIN;

-- Team Templates
CREATE TABLE team_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  estimated_duration_days INTEGER,
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT team_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT team_templates_duration_positive CHECK (estimated_duration_days IS NULL OR estimated_duration_days > 0)
);

-- Team Template Roles
CREATE TABLE team_template_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES team_templates(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  required_skills JSONB DEFAULT '[]'::jsonb,
  preferred_skills JSONB DEFAULT '[]'::jsonb,
  minimum_experience_level VARCHAR(20) NOT NULL DEFAULT 'junior',
  allocation_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  estimated_hours DECIMAL(8,2),
  is_required BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT team_template_roles_name_not_empty CHECK (LENGTH(TRIM(role_name)) > 0),
  CONSTRAINT team_template_roles_experience_valid CHECK (
    minimum_experience_level IN ('junior', 'intermediate', 'senior', 'expert')
  ),
  CONSTRAINT team_template_roles_allocation_valid CHECK (
    allocation_percentage >= 0 AND allocation_percentage <= 100
  ),
  CONSTRAINT team_template_roles_priority_valid CHECK (
    priority >= 1 AND priority <= 10
  ),
  CONSTRAINT team_template_roles_hours_positive CHECK (
    estimated_hours IS NULL OR estimated_hours > 0
  )
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  leader_id UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  
  -- Constraints
  CONSTRAINT teams_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(100),
  joined_date DATE DEFAULT CURRENT_DATE,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(team_id, employee_id),
  CONSTRAINT team_members_dates_valid CHECK (left_date IS NULL OR joined_date <= left_date),
  CONSTRAINT team_members_active_logic CHECK (
    (is_active = true AND left_date IS NULL) OR
    (is_active = false AND left_date IS NOT NULL)
  )
);

-- Bulk Operations Log
CREATE TABLE bulk_operations_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_id VARCHAR(50) NOT NULL UNIQUE,
  operation_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing',
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  warnings_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  duration_ms BIGINT,
  
  -- Additional data
  error_details JSONB,
  operation_params JSONB,
  result_summary JSONB,
  
  -- User tracking
  user_id UUID,
  user_name VARCHAR(100),
  
  -- Constraints
  CONSTRAINT bulk_operations_status_valid CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT bulk_operations_type_valid CHECK (
    operation_type IN ('create', 'update', 'delete', 'copy', 'import', 'export', 'rebalance')
  ),
  CONSTRAINT bulk_operations_entity_valid CHECK (
    entity_type IN ('allocations', 'teams', 'employees', 'projects', 'templates')
  ),
  CONSTRAINT bulk_operations_records_positive CHECK (
    total_records >= 0 AND successful_records >= 0 AND 
    failed_records >= 0 AND warnings_count >= 0
  ),
  CONSTRAINT bulk_operations_completion_logic CHECK (
    (status IN ('pending', 'processing') AND completed_at IS NULL) OR
    (status IN ('completed', 'failed', 'cancelled') AND completed_at IS NOT NULL)
  )
);

-- Team Assignments (linking teams to projects)
CREATE TABLE team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES team_templates(id),
  assignment_type VARCHAR(20) NOT NULL DEFAULT 'full_team',
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  -- Assignment metadata
  assignment_data JSONB DEFAULT '{}'::jsonb,
  role_assignments JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  -- Constraints
  UNIQUE(team_id, project_id, start_date),
  CONSTRAINT team_assignments_dates_valid CHECK (end_date IS NULL OR start_date <= end_date),
  CONSTRAINT team_assignments_type_valid CHECK (
    assignment_type IN ('full_team', 'partial_team', 'individual_roles')
  ),
  CONSTRAINT team_assignments_status_valid CHECK (
    status IN ('active', 'completed', 'cancelled', 'on_hold')
  )
);

-- Import/Export Templates
CREATE TABLE import_export_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template_type VARCHAR(20) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  field_mappings JSONB NOT NULL,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  default_values JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  
  -- Constraints
  CONSTRAINT import_export_templates_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT import_export_templates_type_valid CHECK (
    template_type IN ('import', 'export', 'both')
  ),
  CONSTRAINT import_export_templates_entity_valid CHECK (
    entity_type IN ('allocations', 'employees', 'projects', 'teams')
  )
);

-- Create indexes for performance
CREATE INDEX idx_team_templates_department ON team_templates(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_templates_active ON team_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_templates_name ON team_templates(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_templates_tags ON team_templates USING gin(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_templates_usage ON team_templates(usage_count DESC, last_used_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_team_template_roles_template ON team_template_roles(template_id);
CREATE INDEX idx_team_template_roles_skills ON team_template_roles USING gin(required_skills);
CREATE INDEX idx_team_template_roles_experience ON team_template_roles(minimum_experience_level);
CREATE INDEX idx_team_template_roles_priority ON team_template_roles(priority DESC);

CREATE INDEX idx_teams_department ON teams(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_leader ON teams(leader_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_active ON teams(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_name ON teams(name) WHERE deleted_at IS NULL;

CREATE INDEX idx_team_members_team ON team_members(team_id) WHERE is_active = true;
CREATE INDEX idx_team_members_employee ON team_members(employee_id) WHERE is_active = true;
CREATE INDEX idx_team_members_active ON team_members(is_active);

CREATE INDEX idx_bulk_operations_status ON bulk_operations_log(status);
CREATE INDEX idx_bulk_operations_type ON bulk_operations_log(operation_type);
CREATE INDEX idx_bulk_operations_started ON bulk_operations_log(started_at DESC);
CREATE INDEX idx_bulk_operations_user ON bulk_operations_log(user_id);
CREATE INDEX idx_bulk_operations_operation_id ON bulk_operations_log(operation_id);

CREATE INDEX idx_team_assignments_team ON team_assignments(team_id);
CREATE INDEX idx_team_assignments_project ON team_assignments(project_id);
CREATE INDEX idx_team_assignments_template ON team_assignments(template_id);
CREATE INDEX idx_team_assignments_dates ON team_assignments(start_date, end_date);
CREATE INDEX idx_team_assignments_status ON team_assignments(status);

CREATE INDEX idx_import_export_templates_type ON import_export_templates(template_type, entity_type) WHERE is_active = true;
CREATE INDEX idx_import_export_templates_usage ON import_export_templates(usage_count DESC, last_used_at DESC) WHERE is_active = true;

-- Create triggers for updated_at
CREATE TRIGGER trigger_team_templates_updated_at
  BEFORE UPDATE ON team_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_template_roles_updated_at
  BEFORE UPDATE ON team_template_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_team_assignments_updated_at
  BEFORE UPDATE ON team_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_import_export_templates_updated_at
  BEFORE UPDATE ON import_export_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update template usage
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE team_templates 
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template usage when used in team assignments
CREATE TRIGGER trigger_team_assignment_template_usage
  AFTER INSERT ON team_assignments
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION update_template_usage();

-- Create function to automatically update bulk operation completion
CREATE OR REPLACE FUNCTION update_bulk_operation_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
    NEW.completed_at = NOW();
    NEW.duration_ms = EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update completion data
CREATE TRIGGER trigger_bulk_operation_completion
  BEFORE UPDATE ON bulk_operations_log
  FOR EACH ROW
  EXECUTE FUNCTION update_bulk_operation_completion();

-- Create view for team capacity summary
CREATE VIEW team_capacity_summary AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.department_id,
  d.name as department_name,
  COUNT(tm.id) as member_count,
  COUNT(tm.id) FILTER (WHERE tm.is_active = true) as active_members,
  COALESCE(SUM(e.weekly_capacity_hours), 0) as total_capacity,
  COALESCE(SUM(
    SELECT COALESCE(SUM(a.allocated_hours), 0) 
    FROM allocations a 
    WHERE a.employee_id = e.id 
    AND a.is_active = true 
    AND a.status = 'active'
  ), 0) as total_allocated,
  CASE 
    WHEN SUM(e.weekly_capacity_hours) > 0 THEN
      ROUND((COALESCE(SUM(
        SELECT COALESCE(SUM(a.allocated_hours), 0) 
        FROM allocations a 
        WHERE a.employee_id = e.id 
        AND a.is_active = true 
        AND a.status = 'active'
      ), 0) / SUM(e.weekly_capacity_hours)) * 100, 2)
    ELSE 0 
  END as utilization_rate
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
LEFT JOIN employees e ON tm.employee_id = e.id AND e.is_active = true
WHERE t.is_active = true AND t.deleted_at IS NULL
GROUP BY t.id, t.name, t.department_id, d.name;

-- Create view for team skill matrix
CREATE VIEW team_skill_matrix AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  s.id as skill_id,
  s.name as skill_name,
  s.category as skill_category,
  COUNT(es.id) as members_with_skill,
  COUNT(tm.id) as total_members,
  ROUND((COUNT(es.id)::decimal / NULLIF(COUNT(tm.id), 0)) * 100, 2) as coverage_percentage,
  CASE 
    WHEN COUNT(es.id) > 0 THEN
      ROUND(AVG(
        CASE es.proficiency_level
          WHEN 'Expert' THEN 5
          WHEN 'Advanced' THEN 4
          WHEN 'Intermediate' THEN 3
          WHEN 'Beginner' THEN 2
          ELSE 1
        END
      ), 2)
    ELSE 0 
  END as average_proficiency
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
LEFT JOIN employees e ON tm.employee_id = e.id AND e.is_active = true
CROSS JOIN skills s
LEFT JOIN employee_skills es ON e.id = es.employee_id AND s.id = es.skill_id AND es.deleted_at IS NULL
WHERE t.is_active = true AND t.deleted_at IS NULL AND s.is_active = true AND s.deleted_at IS NULL
GROUP BY t.id, t.name, s.id, s.name, s.category;

COMMIT;